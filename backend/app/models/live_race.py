"""
SQLAlchemy ORM models for live race tracking.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TrackedRace(Base):
    __tablename__ = "tracked_races"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    event_url_slug: Mapped[str] = mapped_column(String(255))
    event_code: Mapped[str] = mapped_column(String(100))
    event_label: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    poll_interval_seconds: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    last_polled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    consecutive_errors: Mapped[int] = mapped_column(Integer, default=0)

    competitors: Mapped[list["TrackedCompetitor"]] = relationship(
        back_populates="race", cascade="all, delete-orphan"
    )


class TrackedCompetitor(Base):
    __tablename__ = "tracked_competitors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    race_id: Mapped[str] = mapped_column(String(36), ForeignKey("tracked_races.id", ondelete="CASCADE"))
    athlete_name: Mapped[str] = mapped_column(String(255))
    bib_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mikatiming_idp: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(1), nullable=True)
    division: Mapped[str | None] = mapped_column(String(100), nullable=True)
    age_group: Mapped[str | None] = mapped_column(String(20), nullable=True)

    race: Mapped["TrackedRace"] = relationship(back_populates="competitors")
    snapshots: Mapped[list["CompetitorSnapshot"]] = relationship(
        back_populates="competitor", cascade="all, delete-orphan", order_by="CompetitorSnapshot.captured_at.desc()"
    )


class CompetitorSnapshot(Base):
    __tablename__ = "competitor_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    competitor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tracked_competitors.id", ondelete="CASCADE")
    )
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    overall_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overall_time_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overall_time_display: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    last_completed_station: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_completed_station_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    split_times_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    roxzone_time_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    competitor: Mapped["TrackedCompetitor"] = relationship(back_populates="snapshots")
