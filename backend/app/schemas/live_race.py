"""
Pydantic schemas for live race tracking requests and responses.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class CompetitorInput(BaseModel):
    athlete_name: str = Field(..., min_length=2, description="'LastName, FirstName' format")
    bib_number: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^[MW]$", description="M or W")


class StartTrackingRequest(BaseModel):
    event_url_slug: str = Field(..., min_length=1, description="e.g. 'season-8'")
    event_code: str = Field(..., min_length=1, description="Mika Timing event code")
    event_label: str = Field(..., min_length=1, description="Human-readable event name")
    competitors: list[CompetitorInput] = Field(..., min_length=1, max_length=20)
    poll_interval_seconds: int = Field(60, ge=30, le=300)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class CompetitorStatus(BaseModel):
    competitor_id: str
    athlete_name: str
    bib_number: Optional[str] = None
    overall_rank: Optional[int] = None
    overall_time_display: Optional[str] = None
    overall_time_seconds: Optional[int] = None
    status: str = "not_started"
    last_completed_station: Optional[str] = None
    last_completed_station_order: Optional[int] = None
    stations_completed: int = 0
    progress_percentage: float = 0.0
    split_times: Optional[dict] = None
    last_updated: Optional[datetime] = None


class TrackedRaceStatus(BaseModel):
    race_id: str
    event_label: str
    is_active: bool
    last_polled_at: Optional[datetime] = None
    last_error: Optional[str] = None
    competitors: list[CompetitorStatus] = []


class TrackingStartedResponse(BaseModel):
    race_id: str
    event_label: str
    competitors_count: int
    poll_interval_seconds: int
    message: str
