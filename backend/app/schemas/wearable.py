"""
Pydantic schemas for wearable data ingestion and redline alerts.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WearableSampleInput(BaseModel):
    timestamp: datetime
    heart_rate: Optional[int] = Field(default=None, ge=30, le=250)
    active_calories: Optional[float] = Field(default=None, ge=0)


class WearableSyncRequest(BaseModel):
    competitor_id: Optional[str] = None
    samples: list[WearableSampleInput] = Field(min_length=1, max_length=200)


class RedlineAlertResponse(BaseModel):
    id: str
    triggered_at: datetime
    hr_avg: int
    hr_max_pct: float
    duration_seconds: int
    recovery_tip: str
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class WearableSyncResponse(BaseModel):
    samples_stored: int
    alerts_generated: int
    active_alerts: list[RedlineAlertResponse]
