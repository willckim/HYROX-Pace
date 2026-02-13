"""
SQLAlchemy ORM models for wearable data and redline alerts.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WearableSample(Base):
    __tablename__ = "wearable_samples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    competitor_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("tracked_competitors.id", ondelete="SET NULL"),
        nullable=True,
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active_calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class RedlineAlert(Base):
    __tablename__ = "redline_alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    competitor_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("tracked_competitors.id", ondelete="SET NULL"),
        nullable=True,
    )
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    hr_avg: Mapped[int] = mapped_column(Integer)
    hr_max_pct: Mapped[float] = mapped_column(Float)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    recovery_tip: Mapped[str] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
