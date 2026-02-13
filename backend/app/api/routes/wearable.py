"""
Wearable data ingestion and redline alert endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_session
from app.models.user import User
from app.models.wearable import RedlineAlert, WearableSample
from app.schemas.wearable import (
    RedlineAlertResponse,
    WearableSyncRequest,
    WearableSyncResponse,
)
from app.services.wearable_agent import WearableAgent

router = APIRouter(prefix="/wearable", tags=["wearable"])


@router.post("/sync", response_model=WearableSyncResponse)
async def sync_wearable_data(
    request: WearableSyncRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Receive HR/calorie batch from wearable, run agent, return alerts."""
    # Store samples
    db_samples = []
    for sample_input in request.samples:
        db_sample = WearableSample(
            user_id=current_user.id,
            competitor_id=request.competitor_id,
            timestamp=sample_input.timestamp,
            heart_rate=sample_input.heart_rate,
            active_calories=sample_input.active_calories,
        )
        session.add(db_sample)
        db_samples.append(db_sample)

    await session.flush()

    # Fetch existing unresolved alerts for this user
    result = await session.execute(
        select(RedlineAlert)
        .where(RedlineAlert.user_id == current_user.id)
        .where(RedlineAlert.resolved_at.is_(None))
    )
    existing_alerts = list(result.scalars().all())

    # Run wearable agent
    agent = WearableAgent(user_max_hr=current_user.max_hr)

    # Check if existing alerts should be resolved
    for alert in existing_alerts:
        if agent.check_alert_resolution(alert, db_samples):
            alert.resolved_at = datetime.now(timezone.utc)

    # Analyze new samples for redline conditions
    new_alert_data = agent.analyze_samples(
        samples=db_samples,
        competitor_id=request.competitor_id,
        existing_alerts=existing_alerts,
    )

    # Persist new alerts
    new_alerts = []
    for alert_data in new_alert_data:
        alert = RedlineAlert(
            user_id=current_user.id,
            **alert_data,
        )
        session.add(alert)
        new_alerts.append(alert)

    await session.commit()

    # Re-fetch active alerts for response
    result = await session.execute(
        select(RedlineAlert)
        .where(RedlineAlert.user_id == current_user.id)
        .where(RedlineAlert.resolved_at.is_(None))
        .order_by(RedlineAlert.triggered_at.desc())
    )
    active_alerts = list(result.scalars().all())

    return WearableSyncResponse(
        samples_stored=len(db_samples),
        alerts_generated=len(new_alerts),
        active_alerts=[RedlineAlertResponse.model_validate(a) for a in active_alerts],
    )


@router.get("/alerts", response_model=list[RedlineAlertResponse])
async def get_alerts(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all active (unresolved) alerts for the current user."""
    result = await session.execute(
        select(RedlineAlert)
        .where(RedlineAlert.user_id == current_user.id)
        .where(RedlineAlert.resolved_at.is_(None))
        .order_by(RedlineAlert.triggered_at.desc())
    )
    alerts = result.scalars().all()
    return [RedlineAlertResponse.model_validate(a) for a in alerts]


@router.get("/alerts/{competitor_id}", response_model=list[RedlineAlertResponse])
async def get_competitor_alerts(
    competitor_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get active alerts for a specific competitor."""
    result = await session.execute(
        select(RedlineAlert)
        .where(RedlineAlert.user_id == current_user.id)
        .where(RedlineAlert.competitor_id == competitor_id)
        .where(RedlineAlert.resolved_at.is_(None))
        .order_by(RedlineAlert.triggered_at.desc())
    )
    alerts = result.scalars().all()
    return [RedlineAlertResponse.model_validate(a) for a in alerts]


@router.post("/alerts/{alert_id}/resolve", response_model=RedlineAlertResponse)
async def resolve_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Manually dismiss/resolve an alert."""
    result = await session.execute(
        select(RedlineAlert)
        .where(RedlineAlert.id == alert_id)
        .where(RedlineAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.resolved_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(alert)

    return RedlineAlertResponse.model_validate(alert)
