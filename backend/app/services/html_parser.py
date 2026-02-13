"""
Mika Timing HTML parser for results.hyrox.com.

HYROX uses Mika Timing's server-rendered HTML tables. This module extracts
ranking list entries (for competitor discovery) and individual detail pages
(for split times, rank, and status).
"""

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

# Station order matching RACE_SEGMENTS in benchmarks.py
STATION_ORDER: dict[str, int] = {
    "Running 1": 1,
    "1000m SkiErg": 2,
    "Running 2": 3,
    "50m Sled Push": 4,
    "Running 3": 5,
    "50m Sled Pull": 6,
    "Running 4": 7,
    "80m Burpee Broad Jump": 8,
    "Running 5": 9,
    "1000m Row": 10,
    "Running 6": 11,
    "200m Farmers Carry": 12,
    "Running 7": 13,
    "100m Sandbag Lunges": 14,
    "Running 8": 15,
    "Wall Balls": 16,
}

TOTAL_STATIONS = 16


@dataclass
class RankingEntry:
    """A single row from the ranking list page."""
    name: str               # "LastName, FirstName"
    idp: str                # mikatiming_idp for detail lookup
    rank: Optional[int] = None
    bib: Optional[str] = None
    time_display: Optional[str] = None


@dataclass
class SplitTime:
    """A single split from the detail page."""
    station_name: str
    station_order: int
    time_display: Optional[str] = None  # "HH:MM:SS" or "--"
    time_seconds: Optional[int] = None


@dataclass
class AthleteDetailResult:
    """Parsed result from an athlete's detail page."""
    name: Optional[str] = None
    bib: Optional[str] = None
    overall_rank: Optional[int] = None
    overall_time_display: Optional[str] = None
    overall_time_seconds: Optional[int] = None
    status: str = "not_started"  # not_started / in_progress / finished / dnf / dsq
    splits: list[SplitTime] = field(default_factory=list)
    last_completed_station: Optional[str] = None
    last_completed_station_order: Optional[int] = None
    roxzone_time_seconds: Optional[int] = None


class MikaTimingParser:
    """Parser for Mika Timing HTML pages used by results.hyrox.com."""

    @staticmethod
    def time_str_to_seconds(time_str: str) -> Optional[int]:
        """Convert "H:MM:SS" or "MM:SS" to total seconds. Returns None for empty/placeholder."""
        if not time_str or time_str.strip() in ("--", "-", ""):
            return None
        time_str = time_str.strip()
        parts = time_str.split(":")
        try:
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            else:
                return int(parts[0])
        except (ValueError, IndexError):
            logger.warning("Could not parse time string: %s", time_str)
            return None

    @staticmethod
    def _extract_idp_from_href(href: str) -> Optional[str]:
        """Extract idp parameter from a detail link href."""
        try:
            parsed = urlparse(href)
            params = parse_qs(parsed.query)
            idp_values = params.get("idp") or params.get("idp[]")
            if idp_values:
                return idp_values[0]
        except Exception:
            pass
        # Fallback: regex
        match = re.search(r"idp=([^&]+)", href)
        return match.group(1) if match else None

    def parse_ranking_list(self, html: str) -> list[RankingEntry]:
        """
        Parse the ranking/list page to find athlete names and their idp values.

        The list page contains a table with rows for each athlete. Each row
        has a link to the detail page containing the idp parameter.
        """
        soup = BeautifulSoup(html, "html.parser")
        entries: list[RankingEntry] = []

        # Mika Timing uses list items with class "list-group-item" or table rows
        # Try list-group items first (common Mika Timing pattern)
        items = soup.select("li.list-group-item")
        if items:
            entries = self._parse_list_group_items(items)

        if not entries:
            # Fallback: try table rows
            rows = soup.select("table tbody tr")
            if rows:
                entries = self._parse_table_rows(rows)

        if not entries:
            # Last resort: find any links with idp parameter
            entries = self._parse_any_idp_links(soup)

        if not entries:
            logger.warning(
                "No ranking entries found. HTML length=%d, title=%s",
                len(html),
                soup.title.string if soup.title else "N/A",
            )

        return entries

    def _parse_list_group_items(self, items: list[Tag]) -> list[RankingEntry]:
        entries = []
        for item in items:
            link = item.find("a", href=True)
            if not link:
                continue
            href = link.get("href", "")
            idp = self._extract_idp_from_href(str(href))
            if not idp:
                continue

            # Extract name — usually in a heading or strong tag
            name_el = item.find(["h4", "h5", "strong", "span"])
            name = name_el.get_text(strip=True) if name_el else link.get_text(strip=True)
            if not name:
                continue

            # Try to find rank and time from other elements
            rank = None
            time_display = None
            bib = None

            rank_el = item.find(class_=re.compile(r"rank|place|position", re.I))
            if rank_el:
                rank_text = rank_el.get_text(strip=True).rstrip(".")
                try:
                    rank = int(rank_text)
                except ValueError:
                    pass

            time_el = item.find(class_=re.compile(r"time|result", re.I))
            if time_el:
                time_display = time_el.get_text(strip=True)

            bib_el = item.find(class_=re.compile(r"bib|number", re.I))
            if bib_el:
                bib = bib_el.get_text(strip=True)

            entries.append(RankingEntry(name=name, idp=idp, rank=rank, bib=bib, time_display=time_display))
        return entries

    def _parse_table_rows(self, rows: list[Tag]) -> list[RankingEntry]:
        entries = []
        for row in rows:
            link = row.find("a", href=True)
            if not link:
                continue
            href = link.get("href", "")
            idp = self._extract_idp_from_href(str(href))
            if not idp:
                continue

            cells = row.find_all("td")
            name = link.get_text(strip=True)
            rank = None
            bib = None
            time_display = None

            if len(cells) >= 1:
                rank_text = cells[0].get_text(strip=True).rstrip(".")
                try:
                    rank = int(rank_text)
                except ValueError:
                    pass
            if len(cells) >= 3:
                time_display = cells[-1].get_text(strip=True)

            if name:
                entries.append(RankingEntry(name=name, idp=idp, rank=rank, bib=bib, time_display=time_display))
        return entries

    def _parse_any_idp_links(self, soup: BeautifulSoup) -> list[RankingEntry]:
        entries = []
        for link in soup.find_all("a", href=True):
            href = str(link.get("href", ""))
            if "idp=" not in href and "content=detail" not in href:
                continue
            idp = self._extract_idp_from_href(href)
            if not idp:
                continue
            name = link.get_text(strip=True)
            if name and len(name) > 2:
                entries.append(RankingEntry(name=name, idp=idp))
        return entries

    def parse_athlete_detail(self, html: str) -> AthleteDetailResult:
        """
        Parse an individual athlete's detail page for splits, rank, time, and status.
        """
        soup = BeautifulSoup(html, "html.parser")
        result = AthleteDetailResult()

        # Extract athlete name from detail header
        name_el = soup.find(class_=re.compile(r"detail.*name|athlete.*name|f-__fullname", re.I))
        if not name_el:
            name_el = soup.find("h3") or soup.find("h4")
        if name_el:
            result.name = name_el.get_text(strip=True)

        # Extract overall rank
        rank_el = soup.find(class_=re.compile(r"detail.*rank|f-__rank_overall", re.I))
        if rank_el:
            rank_text = rank_el.get_text(strip=True).rstrip(".")
            try:
                result.overall_rank = int(rank_text)
            except ValueError:
                pass

        # Extract overall time
        time_el = soup.find(class_=re.compile(r"detail.*time|f-__finish_time_net|f-time_finish_netto", re.I))
        if time_el:
            result.overall_time_display = time_el.get_text(strip=True)
            result.overall_time_seconds = self.time_str_to_seconds(result.overall_time_display)

        # Extract split times from the detail table/list
        result.splits = self._extract_splits(soup)

        # Determine status and last completed station
        result.status, result.last_completed_station, result.last_completed_station_order = (
            self._determine_status_and_progress(soup, result)
        )

        # Extract Roxzone time if available
        roxzone_el = soup.find(string=re.compile(r"roxzone|transition", re.I))
        if roxzone_el:
            parent = roxzone_el.find_parent("tr") or roxzone_el.find_parent("div")
            if parent:
                time_cell = parent.find(class_=re.compile(r"time|result", re.I))
                if not time_cell:
                    cells = parent.find_all("td")
                    time_cell = cells[-1] if cells else None
                if time_cell:
                    result.roxzone_time_seconds = self.time_str_to_seconds(
                        time_cell.get_text(strip=True)
                    )

        return result

    def _extract_splits(self, soup: BeautifulSoup) -> list[SplitTime]:
        """Extract split times from detail page."""
        splits: list[SplitTime] = []

        # Look for split/detail tables — Mika Timing typically uses a table or dl
        split_tables = soup.find_all("table")
        for table in split_tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) < 2:
                    continue
                station_text = cells[0].get_text(strip=True)
                time_text = cells[-1].get_text(strip=True)

                # Match against known station names
                matched_name, order = self._match_station(station_text)
                if matched_name:
                    time_seconds = self.time_str_to_seconds(time_text)
                    splits.append(SplitTime(
                        station_name=matched_name,
                        station_order=order,
                        time_display=time_text if time_seconds is not None else None,
                        time_seconds=time_seconds,
                    ))

        # Also try definition lists
        if not splits:
            for dl in soup.find_all("dl"):
                dts = dl.find_all("dt")
                dds = dl.find_all("dd")
                for dt, dd in zip(dts, dds):
                    station_text = dt.get_text(strip=True)
                    time_text = dd.get_text(strip=True)
                    matched_name, order = self._match_station(station_text)
                    if matched_name:
                        time_seconds = self.time_str_to_seconds(time_text)
                        splits.append(SplitTime(
                            station_name=matched_name,
                            station_order=order,
                            time_display=time_text if time_seconds is not None else None,
                            time_seconds=time_seconds,
                        ))

        # Sort by station order
        splits.sort(key=lambda s: s.station_order)
        return splits

    @staticmethod
    def _match_station(text: str) -> tuple[Optional[str], int]:
        """Match raw text to a known station name. Returns (name, order) or (None, 0)."""
        text_lower = text.lower().strip()

        # Direct keyword matching
        patterns: list[tuple[str, list[str]]] = [
            ("Running 1", ["run 1", "running 1", "run1"]),
            ("1000m SkiErg", ["skierg", "ski erg", "ski-erg"]),
            ("Running 2", ["run 2", "running 2", "run2"]),
            ("50m Sled Push", ["sled push"]),
            ("Running 3", ["run 3", "running 3", "run3"]),
            ("50m Sled Pull", ["sled pull"]),
            ("Running 4", ["run 4", "running 4", "run4"]),
            ("80m Burpee Broad Jump", ["burpee", "broad jump", "bbj"]),
            ("Running 5", ["run 5", "running 5", "run5"]),
            ("1000m Row", ["row", "rowing"]),
            ("Running 6", ["run 6", "running 6", "run6"]),
            ("200m Farmers Carry", ["farmer", "carry"]),
            ("Running 7", ["run 7", "running 7", "run7"]),
            ("100m Sandbag Lunges", ["sandbag", "lunge"]),
            ("Running 8", ["run 8", "running 8", "run8"]),
            ("Wall Balls", ["wall ball"]),
        ]

        for station_name, keywords in patterns:
            for kw in keywords:
                if kw in text_lower:
                    return station_name, STATION_ORDER[station_name]

        return None, 0

    def _determine_status_and_progress(
        self, soup: BeautifulSoup, result: AthleteDetailResult
    ) -> tuple[str, Optional[str], Optional[int]]:
        """Determine athlete status and last completed station."""
        page_text = soup.get_text(separator=" ").lower()

        # Check for DNF/DSQ
        if "dnf" in page_text or "did not finish" in page_text:
            return "dnf", None, None
        if "dsq" in page_text or "disqualified" in page_text:
            return "dsq", None, None

        # If we have an overall finish time, they're done
        if result.overall_time_seconds:
            last_name = "Wall Balls"
            return "finished", last_name, STATION_ORDER[last_name]

        # Find last completed station from splits
        last_station, last_order = self._find_last_completed(result.splits)
        if last_station:
            return "in_progress", last_station, last_order

        return "not_started", None, None

    @staticmethod
    def _find_last_completed(splits: list[SplitTime]) -> tuple[Optional[str], Optional[int]]:
        """Find the last station that has a non-null time."""
        last_name = None
        last_order = None
        for split in splits:
            if split.time_seconds is not None:
                last_name = split.station_name
                last_order = split.station_order
        return last_name, last_order

    @staticmethod
    def splits_to_dict(splits: list[SplitTime]) -> dict:
        """Convert splits list to a JSON-serializable dict."""
        return {
            s.station_name: {
                "order": s.station_order,
                "time_display": s.time_display,
                "time_seconds": s.time_seconds,
            }
            for s in splits
        }

    @staticmethod
    def splits_to_json(splits: list[SplitTime]) -> str:
        """Convert splits list to a JSON string for storage."""
        return json.dumps(MikaTimingParser.splits_to_dict(splits))

    @staticmethod
    def build_list_url(slug: str, event_code: str, last_name: str) -> str:
        """Build the ranking list search URL."""
        return (
            f"https://results.hyrox.com/{slug}/"
            f"?pid=list_overall&pidp=ranking_nav"
            f"&event={event_code}"
            f"&search[name]={last_name}"
            f"&num_results=100"
        )

    @staticmethod
    def build_detail_url(slug: str, event_code: str, idp: str) -> str:
        """Build the athlete detail page URL."""
        return (
            f"https://results.hyrox.com/{slug}/"
            f"?content=detail&fpid=list_overall&pid=list_overall"
            f"&idp={idp}&lang=EN_CAP&event={event_code}"
        )
