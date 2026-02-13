"""
REST API endpoints for live race tracking.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_user
from app.core.database import get_session
from app.models.live_race import CompetitorSnapshot, TrackedCompetitor, TrackedRace
from app.models.user import User
from app.schemas.live_race import (
    CompetitorStatus,
    StartTrackingRequest,
    TrackedRaceStatus,
    TrackingStartedResponse,
)
from app.services.html_parser import STATION_ORDER, TOTAL_STATIONS
from app.services.live_race_worker import worker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["live-tracking"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_competitor_status(competitor: TrackedCompetitor) -> CompetitorStatus:
    """Build a CompetitorStatus from ORM model with latest snapshot."""
    latest = competitor.snapshots[0] if competitor.snapshots else None

    if latest:
        split_times = None
        if latest.split_times_json:
            try:
                split_times = json.loads(latest.split_times_json)
            except json.JSONDecodeError:
                pass

        stations_completed = latest.last_completed_station_order or 0
        progress = (stations_completed / TOTAL_STATIONS) * 100 if stations_completed else 0.0

        return CompetitorStatus(
            competitor_id=competitor.id,
            athlete_name=competitor.athlete_name,
            bib_number=competitor.bib_number,
            overall_rank=latest.overall_rank,
            overall_time_display=latest.overall_time_display,
            overall_time_seconds=latest.overall_time_seconds,
            status=latest.status,
            last_completed_station=latest.last_completed_station,
            last_completed_station_order=latest.last_completed_station_order,
            stations_completed=stations_completed,
            progress_percentage=round(progress, 1),
            split_times=split_times,
            last_updated=latest.captured_at,
        )

    return CompetitorStatus(
        competitor_id=competitor.id,
        athlete_name=competitor.athlete_name,
        bib_number=competitor.bib_number,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/track", response_model=TrackingStartedResponse)
async def start_tracking(
    request: StartTrackingRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Start tracking competitors in a live HYROX race."""
    race = TrackedRace(
        event_url_slug=request.event_url_slug,
        event_code=request.event_code,
        event_label=request.event_label,
        poll_interval_seconds=request.poll_interval_seconds,
    )

    for comp_input in request.competitors:
        competitor = TrackedCompetitor(
            race_id=race.id,
            athlete_name=comp_input.athlete_name,
            bib_number=comp_input.bib_number,
            gender=comp_input.gender,
        )
        race.competitors.append(competitor)

    session.add(race)
    await session.commit()

    # Re-fetch with eager load to avoid lazy-loading in async context
    result = await session.execute(
        select(TrackedRace)
        .where(TrackedRace.id == race.id)
        .options(selectinload(TrackedRace.competitors))
    )
    race = result.scalar_one()

    logger.info(
        "Started tracking race %s with %d competitors",
        race.id, len(race.competitors),
    )

    return TrackingStartedResponse(
        race_id=race.id,
        event_label=race.event_label,
        competitors_count=len(race.competitors),
        poll_interval_seconds=race.poll_interval_seconds,
        message=f"Tracking started. Polling every {race.poll_interval_seconds}s.",
    )


@router.get("/track", response_model=list[TrackedRaceStatus])
async def list_tracked_races(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List all tracked races with latest competitor status."""
    result = await session.execute(
        select(TrackedRace)
        .options(
            selectinload(TrackedRace.competitors)
            .selectinload(TrackedCompetitor.snapshots)
        )
        .order_by(TrackedRace.created_at.desc())
    )
    races = result.scalars().all()

    return [
        TrackedRaceStatus(
            race_id=race.id,
            event_label=race.event_label,
            is_active=race.is_active,
            last_polled_at=race.last_polled_at,
            last_error=race.last_error,
            competitors=[_build_competitor_status(c) for c in race.competitors],
        )
        for race in races
    ]


@router.get("/track/{race_id}", response_model=TrackedRaceStatus)
async def get_race_status(
    race_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get current status of all competitors in a tracked race."""
    result = await session.execute(
        select(TrackedRace)
        .where(TrackedRace.id == race_id)
        .options(
            selectinload(TrackedRace.competitors)
            .selectinload(TrackedCompetitor.snapshots)
        )
    )
    race = result.scalar_one_or_none()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    return TrackedRaceStatus(
        race_id=race.id,
        event_label=race.event_label,
        is_active=race.is_active,
        last_polled_at=race.last_polled_at,
        last_error=race.last_error,
        competitors=[_build_competitor_status(c) for c in race.competitors],
    )


@router.get("/track/{race_id}/competitor/{competitor_id}/history")
async def get_competitor_history(
    race_id: str,
    competitor_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get historical snapshots for a competitor."""
    # Verify the competitor belongs to the race
    result = await session.execute(
        select(TrackedCompetitor)
        .where(TrackedCompetitor.id == competitor_id)
        .where(TrackedCompetitor.race_id == race_id)
    )
    competitor = result.scalar_one_or_none()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found in this race")

    result = await session.execute(
        select(CompetitorSnapshot)
        .where(CompetitorSnapshot.competitor_id == competitor_id)
        .order_by(CompetitorSnapshot.captured_at.desc())
        .limit(limit)
    )
    snapshots = result.scalars().all()

    return {
        "competitor_id": competitor_id,
        "athlete_name": competitor.athlete_name,
        "snapshot_count": len(snapshots),
        "snapshots": [
            {
                "id": s.id,
                "captured_at": s.captured_at,
                "overall_rank": s.overall_rank,
                "overall_time_display": s.overall_time_display,
                "overall_time_seconds": s.overall_time_seconds,
                "status": s.status,
                "last_completed_station": s.last_completed_station,
                "last_completed_station_order": s.last_completed_station_order,
                "split_times": json.loads(s.split_times_json) if s.split_times_json else None,
                "roxzone_time_seconds": s.roxzone_time_seconds,
            }
            for s in snapshots
        ],
    }


@router.delete("/track/{race_id}")
async def stop_tracking(
    race_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Stop tracking a race (preserves data, sets is_active=False)."""
    result = await session.execute(
        select(TrackedRace).where(TrackedRace.id == race_id)
    )
    race = result.scalar_one_or_none()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    race.is_active = False
    await session.commit()

    return {"race_id": race_id, "message": "Tracking stopped. Data preserved."}


@router.get("/health")
async def worker_health():
    """Check live race worker status."""
    return {
        "worker_running": worker.is_running,
        "status": "healthy" if worker.is_running else "stopped",
    }
