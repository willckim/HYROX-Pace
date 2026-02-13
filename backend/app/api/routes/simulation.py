"""
Simulation API Routes
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.api.dependencies import get_optional_user
from app.models.user import User
from app.schemas.simulation import (
    AthleteProfileCreate,
    SimulationRequest,
    SimulationResponse,
    RaceSimulation,
    ErrorResponse,
)
from app.core.engine.simulator import run_simulation

router = APIRouter()


@router.post(
    "/simulate",
    response_model=SimulationResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Run race simulation",
    description="Generate a complete race prediction and pacing plan based on athlete profile.",
)
async def create_simulation(
    request: SimulationRequest,
    current_user: User | None = Depends(get_optional_user),
) -> SimulationResponse:
    """
    Run the HYROX race simulation engine.
    
    Takes an athlete profile with:
    - Engine metrics (5K time, swim background)
    - Strength metrics (sled comfort, wall ball max, lunge tolerance)
    - Body context (weight, gender, age group)
    - Race context (division, strategy)
    
    Returns:
    - Three-tier finish time prediction (conservative, likely, aggressive)
    - Segment-by-segment pacing plan with execution cues
    - Risk analysis and danger zones
    - Performance tier classification
    """
    try:
        simulation = run_simulation(request.profile)
        
        return SimulationResponse(
            simulation=simulation,
            shareable_link=f"/share/{simulation.id}",  # Would be full URL in prod
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@router.post(
    "/simulate/quick",
    response_model=RaceSimulation,
    summary="Quick simulation (no wrapper)",
    description="Same as /simulate but returns raw simulation without wrapper.",
)
async def quick_simulation(
    profile: AthleteProfileCreate,
    current_user: User | None = Depends(get_optional_user),
) -> RaceSimulation:
    """Quick endpoint that accepts profile directly."""
    try:
        return run_simulation(profile)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@router.post(
    "/simulate/goal",
    response_model=RaceSimulation,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Goal-mode simulation",
    description="Run a goal-mode simulation that works backward from a target finish time.",
)
async def goal_simulation(
    profile: AthleteProfileCreate,
    current_user: User | None = Depends(get_optional_user),
) -> RaceSimulation:
    """
    Goal-mode endpoint: requires goal_time_seconds in the profile.
    Returns a simulation with segment times scaled to hit the goal.
    """
    if profile.goal_time_seconds is None:
        raise HTTPException(
            status_code=400,
            detail="goal_time_seconds is required for goal-mode simulation",
        )
    try:
        return run_simulation(profile)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@router.get(
    "/divisions",
    summary="Get available divisions",
    description="List all HYROX competition divisions.",
)
async def get_divisions():
    """Return available competition divisions."""
    return {
        "divisions": [
            {"value": "mens_pro", "label": "Men's Pro", "description": "Heaviest weights, fastest competition"},
            {"value": "mens_open", "label": "Men's Open", "description": "Standard men's division"},
            {"value": "womens_pro", "label": "Women's Pro", "description": "Heaviest women's weights"},
            {"value": "womens_open", "label": "Women's Open", "description": "Standard women's division"},
            {"value": "doubles_men", "label": "Doubles Men", "description": "Two male athletes"},
            {"value": "doubles_women", "label": "Doubles Women", "description": "Two female athletes"},
            {"value": "doubles_mixed", "label": "Doubles Mixed", "description": "One male, one female (uses men's open weights)"},
        ]
    }


@router.get(
    "/benchmarks/{division}",
    summary="Get division benchmarks",
    description="Get finish time and station benchmarks for a specific division.",
)
async def get_benchmarks(division: str):
    """Return benchmarks for a specific division."""
    from app.core.constants.benchmarks import (
        Division, FINISH_TIME_BENCHMARKS, EQUIPMENT_WEIGHTS
    )
    
    try:
        div = Division(division)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid division: {division}")
    
    benchmarks = FINISH_TIME_BENCHMARKS.get(div)
    weights = EQUIPMENT_WEIGHTS.get(div)
    
    if not benchmarks:
        return {
            "division": division,
            "weights": weights,
            "benchmarks": "Benchmarks not available for this division",
        }
    
    # Format times for display
    formatted_benchmarks = {}
    for tier, times in benchmarks.items():
        min_time = times["min"]
        max_time = times["max"]
        formatted_benchmarks[tier.value] = {
            "min_seconds": min_time,
            "max_seconds": max_time,
            "min_display": f"{min_time // 3600}:{(min_time % 3600) // 60:02d}:{min_time % 60:02d}" if min_time >= 3600 else f"{min_time // 60}:{min_time % 60:02d}",
            "max_display": f"{max_time // 3600}:{(max_time % 3600) // 60:02d}:{max_time % 60:02d}" if max_time >= 3600 else f"{max_time // 60}:{max_time % 60:02d}",
        }
    
    return {
        "division": division,
        "weights": weights,
        "finish_time_benchmarks": formatted_benchmarks,
    }