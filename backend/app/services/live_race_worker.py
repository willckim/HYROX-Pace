"""
Async background worker that polls results.hyrox.com for live race data.

Discovers competitors by name search, fetches detail pages, parses HTML,
and stores snapshots in SQLite. Rate-limited and fault-tolerant.
"""

import asyncio
import json
import logging
import random
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import async_session_factory
from app.models.live_race import CompetitorSnapshot, TrackedCompetitor, TrackedRace
from app.services.html_parser import MikaTimingParser

logger = logging.getLogger(__name__)

USER_AGENT = "HYROXPace/1.0 (Race Tracking App)"
MAX_RETRIES = 3
BASE_RETRY_DELAY = 1.0
MAX_CONSECUTIVE_ERRORS = 10
INTER_COMPETITOR_DELAY = 1.0
INTER_RACE_DELAY = 2.0
TICK_INTERVAL = 5.0  # seconds between poll-loop ticks


class LiveRaceWorker:
    """Background service that polls HYROX results for tracked races."""

    def __init__(self):
        self._task: asyncio.Task | None = None
        self._client: httpx.AsyncClient | None = None
        self._parser = MikaTimingParser()
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running and self._task is not None and not self._task.done()

    async def start(self):
        """Start the background polling loop."""
        if self._task and not self._task.done():
            logger.warning("Worker already running")
            return

        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        )
        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("LiveRaceWorker started")

    async def stop(self):
        """Stop the background polling loop and close HTTP client."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._client:
            await self._client.aclose()
            self._client = None
        logger.info("LiveRaceWorker stopped")

    # -----------------------------------------------------------------------
    # Poll loop
    # -----------------------------------------------------------------------

    async def _poll_loop(self):
        """Main loop: tick every TICK_INTERVAL, check which races need polling."""
        logger.info("Poll loop started, tick interval=%ss", TICK_INTERVAL)
        while self._running:
            try:
                await self._tick()
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Unhandled error in poll loop tick")
            await asyncio.sleep(TICK_INTERVAL)

    async def _tick(self):
        """One tick: find active races due for polling and process them."""
        async with async_session_factory() as session:
            result = await session.execute(
                select(TrackedRace)
                .where(TrackedRace.is_active == True)  # noqa: E712
                .options(selectinload(TrackedRace.competitors))
            )
            races = result.scalars().all()

        now = datetime.now(timezone.utc)
        for race in races:
            if not self._running:
                break

            # Check if enough time has elapsed since last poll
            if race.last_polled_at:
                elapsed = (now - race.last_polled_at).total_seconds()
                if elapsed < race.poll_interval_seconds:
                    continue

            logger.info("Polling race: %s (%s)", race.event_label, race.id)
            await self._poll_race(race)
            await asyncio.sleep(INTER_RACE_DELAY)

    # -----------------------------------------------------------------------
    # Race-level polling
    # -----------------------------------------------------------------------

    async def _poll_race(self, race: TrackedRace):
        """Poll all competitors in a single race."""
        race_errors = 0

        async with async_session_factory() as session:
            # Re-fetch race in this session to allow updates
            result = await session.execute(
                select(TrackedRace)
                .where(TrackedRace.id == race.id)
                .options(selectinload(TrackedRace.competitors).selectinload(TrackedCompetitor.snapshots))
            )
            race = result.scalar_one_or_none()
            if not race or not race.is_active:
                return

            for competitor in race.competitors:
                if not self._running:
                    break
                try:
                    await self._poll_competitor(session, race, competitor)
                except Exception:
                    logger.exception(
                        "Error polling competitor %s (%s)",
                        competitor.athlete_name,
                        competitor.id,
                    )
                    race_errors += 1
                await asyncio.sleep(INTER_COMPETITOR_DELAY)

            # Update race poll metadata
            race.last_polled_at = datetime.now(timezone.utc)
            if race_errors > 0:
                race.consecutive_errors += 1
                race.last_error = f"{race_errors} competitor(s) failed on this poll"
                if race.consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                    race.is_active = False
                    logger.warning(
                        "Race %s auto-deactivated after %d consecutive errors",
                        race.id, race.consecutive_errors,
                    )
            else:
                race.consecutive_errors = 0
                race.last_error = None

            await session.commit()

    # -----------------------------------------------------------------------
    # Competitor-level polling
    # -----------------------------------------------------------------------

    async def _poll_competitor(
        self,
        session,
        race: TrackedRace,
        competitor: TrackedCompetitor,
    ):
        """Discover idp if needed, fetch detail page, parse, and store snapshot."""
        # Step 1: Discover mikatiming_idp if not yet known
        if not competitor.mikatiming_idp:
            idp = await self._discover_competitor(race, competitor)
            if not idp:
                logger.warning(
                    "Could not discover idp for %s — skipping",
                    competitor.athlete_name,
                )
                return
            competitor.mikatiming_idp = idp

        # Step 2: Fetch detail page
        detail_url = MikaTimingParser.build_detail_url(
            race.event_url_slug, race.event_code, competitor.mikatiming_idp
        )
        html = await self._fetch_with_retry(detail_url)
        if not html:
            return

        # Step 3: Parse detail page
        detail = self._parser.parse_athlete_detail(html)

        # Step 4: Check for deduplication — skip if nothing changed
        if self._is_duplicate_snapshot(competitor, detail):
            logger.debug("No change for %s — skipping snapshot", competitor.athlete_name)
            return

        # Step 5: Store snapshot
        snapshot = CompetitorSnapshot(
            competitor_id=competitor.id,
            overall_rank=detail.overall_rank,
            overall_time_seconds=detail.overall_time_seconds,
            overall_time_display=detail.overall_time_display,
            status=detail.status,
            last_completed_station=detail.last_completed_station,
            last_completed_station_order=detail.last_completed_station_order,
            split_times_json=MikaTimingParser.splits_to_json(detail.splits) if detail.splits else None,
            roxzone_time_seconds=detail.roxzone_time_seconds,
        )
        session.add(snapshot)
        logger.info(
            "Snapshot stored for %s: status=%s, station=%s",
            competitor.athlete_name,
            detail.status,
            detail.last_completed_station,
        )

    # -----------------------------------------------------------------------
    # Competitor discovery
    # -----------------------------------------------------------------------

    async def _discover_competitor(
        self, race: TrackedRace, competitor: TrackedCompetitor
    ) -> str | None:
        """Search the ranking list by last name and match full name to find idp."""
        # Extract last name (format: "LastName, FirstName")
        name_parts = competitor.athlete_name.split(",")
        last_name = name_parts[0].strip()

        search_url = MikaTimingParser.build_list_url(
            race.event_url_slug, race.event_code, last_name
        )
        html = await self._fetch_with_retry(search_url)
        if not html:
            return None

        entries = self._parser.parse_ranking_list(html)
        if not entries:
            logger.warning("No ranking entries found for search: %s", last_name)
            return None

        # Case-insensitive full name match
        target = competitor.athlete_name.lower().strip()
        for entry in entries:
            if entry.name.lower().strip() == target:
                logger.info(
                    "Discovered idp=%s for %s", entry.idp, competitor.athlete_name
                )
                return entry.idp

        # Fallback: partial match on last name
        for entry in entries:
            if last_name.lower() in entry.name.lower():
                logger.info(
                    "Partial match: idp=%s for %s (matched '%s')",
                    entry.idp, competitor.athlete_name, entry.name,
                )
                return entry.idp

        logger.warning(
            "No name match for '%s' among %d entries", competitor.athlete_name, len(entries)
        )
        return None

    # -----------------------------------------------------------------------
    # Deduplication
    # -----------------------------------------------------------------------

    @staticmethod
    def _is_duplicate_snapshot(
        competitor: TrackedCompetitor, detail
    ) -> bool:
        """Compare parsed detail against the latest snapshot to avoid duplicates."""
        if not competitor.snapshots:
            return False
        latest = competitor.snapshots[0]  # ordered desc by captured_at
        return (
            latest.status == detail.status
            and latest.overall_rank == detail.overall_rank
            and latest.overall_time_seconds == detail.overall_time_seconds
            and latest.last_completed_station_order == detail.last_completed_station_order
        )

    # -----------------------------------------------------------------------
    # HTTP with retry
    # -----------------------------------------------------------------------

    async def _fetch_with_retry(self, url: str) -> str | None:
        """Fetch a URL with exponential backoff retry."""
        for attempt in range(MAX_RETRIES):
            try:
                resp = await self._client.get(url)

                # Handle rate limiting
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 10))
                    logger.warning("Rate limited (429), sleeping %ds", retry_after)
                    await asyncio.sleep(retry_after)
                    continue

                resp.raise_for_status()
                return resp.text

            except httpx.HTTPStatusError as e:
                logger.warning(
                    "HTTP %d for %s (attempt %d/%d)",
                    e.response.status_code, url, attempt + 1, MAX_RETRIES,
                )
            except httpx.RequestError as e:
                logger.warning(
                    "Request error for %s (attempt %d/%d): %s",
                    url, attempt + 1, MAX_RETRIES, e,
                )

            if attempt < MAX_RETRIES - 1:
                delay = BASE_RETRY_DELAY * (2 ** attempt) + random.uniform(0, 1)
                await asyncio.sleep(delay)

        logger.error("All %d retries exhausted for %s", MAX_RETRIES, url)
        return None


# Module-level singleton
worker = LiveRaceWorker()
