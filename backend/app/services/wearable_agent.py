"""
Deterministic wearable agent: detects HR redline conditions and generates recovery tips.
Pure rule-based logic — no LLM calls.
"""

from datetime import datetime, timezone
from typing import Optional

from app.models.wearable import RedlineAlert, WearableSample

# Thresholds
REDLINE_THRESHOLD_PCT = 0.95  # 95% of max HR
REDLINE_DURATION_SECONDS = 120  # 2 minutes sustained
RESOLUTION_PCT = 0.85  # HR must drop below 85% to resolve
RESOLUTION_DURATION_SECONDS = 60  # must stay below 85% for 60s

# Standard max HR fallback by age group midpoint
AGE_GROUP_MIDPOINTS = {
    "18-24": 21, "25-29": 27, "30-34": 32, "35-39": 37,
    "40-44": 42, "45-49": 47, "50-54": 52, "55-59": 57, "60+": 65,
}

# Context-aware recovery tips keyed by race segment context
RECOVERY_TIPS = {
    "early_station": "Slow run pace by 15-20s/km. Save energy for stations.",
    "mid_race_wall": "Walk for 20s, then resume controlled. Breathe through nose.",
    "post_sled": "Walk first 100m. Short steps, arms relaxed.",
    "post_lunges": "Short shuffling steps for 200m. Do NOT sprint final run.",
    "wall_balls": "Break NOW. Rest 10s, then sets of 5-8 reps.",
    "general": "Reduce intensity immediately. Walk if needed.",
}


def _default_max_hr(age_group: Optional[str] = None) -> int:
    """220 - age formula using age group midpoint, fallback 185."""
    if age_group and age_group in AGE_GROUP_MIDPOINTS:
        return 220 - AGE_GROUP_MIDPOINTS[age_group]
    return 185  # ~35 year old default


def _select_recovery_tip(competitor_id: Optional[str], last_station: Optional[str] = None) -> str:
    """Select a context-aware recovery tip based on race segment."""
    if not last_station:
        return RECOVERY_TIPS["general"]

    station_lower = last_station.lower()

    if "sled" in station_lower:
        return RECOVERY_TIPS["post_sled"]
    if "lunge" in station_lower:
        return RECOVERY_TIPS["post_lunges"]
    if "wall" in station_lower:
        return RECOVERY_TIPS["wall_balls"]

    # Station order heuristic: early vs mid-race
    early_stations = ["ski", "row", "burpee"]
    if any(s in station_lower for s in early_stations):
        return RECOVERY_TIPS["early_station"]

    if "farmer" in station_lower:
        return RECOVERY_TIPS["mid_race_wall"]

    return RECOVERY_TIPS["general"]


class WearableAgent:
    """Deterministic agent that analyzes HR samples for redline conditions."""

    def __init__(self, user_max_hr: Optional[int] = None, age_group: Optional[str] = None):
        self.max_hr = user_max_hr or _default_max_hr(age_group)
        self.redline_hr = int(self.max_hr * REDLINE_THRESHOLD_PCT)
        self.resolution_hr = int(self.max_hr * RESOLUTION_PCT)

    def analyze_samples(
        self,
        samples: list[WearableSample],
        competitor_id: Optional[str],
        existing_alerts: list[RedlineAlert],
        last_station: Optional[str] = None,
    ) -> list[dict]:
        """
        Analyze a batch of HR samples for redline conditions.
        Returns a list of dicts with alert data (not yet persisted).
        """
        # Only consider samples with heart rate data, sorted by timestamp
        hr_samples = sorted(
            [s for s in samples if s.heart_rate is not None],
            key=lambda s: s.timestamp,
        )

        if not hr_samples:
            return []

        # Check for unresolved alerts — skip if one already exists
        unresolved = [a for a in existing_alerts if a.resolved_at is None]
        if unresolved:
            return []

        # Sliding window: find spans where HR > redline for >= REDLINE_DURATION_SECONDS
        new_alerts = []
        window_start = None
        window_hrs = []

        for sample in hr_samples:
            if sample.heart_rate >= self.redline_hr:
                if window_start is None:
                    window_start = sample.timestamp
                    window_hrs = []
                window_hrs.append(sample.heart_rate)

                duration = (sample.timestamp - window_start).total_seconds()
                if duration >= REDLINE_DURATION_SECONDS:
                    avg_hr = sum(window_hrs) // len(window_hrs)
                    hr_max_pct = avg_hr / self.max_hr

                    new_alerts.append({
                        "competitor_id": competitor_id,
                        "triggered_at": datetime.now(timezone.utc),
                        "hr_avg": avg_hr,
                        "hr_max_pct": round(hr_max_pct, 3),
                        "duration_seconds": int(duration),
                        "recovery_tip": _select_recovery_tip(competitor_id, last_station),
                    })
                    # Reset window after generating an alert
                    window_start = None
                    window_hrs = []
            else:
                window_start = None
                window_hrs = []

        return new_alerts

    def check_alert_resolution(self, alert: RedlineAlert, recent_samples: list[WearableSample]) -> bool:
        """
        Check if an alert should be resolved.
        HR must stay below 85% max_hr for 60+ consecutive seconds.
        """
        hr_samples = sorted(
            [s for s in recent_samples if s.heart_rate is not None],
            key=lambda s: s.timestamp,
        )

        if not hr_samples:
            return False

        below_start = None

        for sample in hr_samples:
            if sample.heart_rate < self.resolution_hr:
                if below_start is None:
                    below_start = sample.timestamp
                duration = (sample.timestamp - below_start).total_seconds()
                if duration >= RESOLUTION_DURATION_SECONDS:
                    return True
            else:
                below_start = None

        return False
