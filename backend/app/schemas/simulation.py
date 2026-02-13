"""
Pydantic Schemas for HYROXPace API
"""

from datetime import date
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

from app.core.constants.benchmarks import (
    Division, Gender, SwimBackground, SledComfort, 
    LungeTolerance, PerformanceTier
)


# =============================================================================
# INPUT SCHEMAS
# =============================================================================

class RaceStrategy(str, Enum):
    FINISH_STRONG = "finish_strong"   # Conservative, negative split
    SEND_IT = "send_it"               # Aggressive, risk higher fade


class AthleteProfileCreate(BaseModel):
    """Input schema for creating an athlete profile."""
    
    # Engine metrics
    five_k_time_seconds: int = Field(
        ..., 
        ge=900,   # 15:00 minimum (elite)
        le=3600,  # 60:00 maximum
        description="Recent 5K time in seconds"
    )
    mile_time_seconds: Optional[int] = Field(
        None,
        ge=240,   # 4:00 minimum
        le=720,   # 12:00 maximum
        description="Alternative: mile time in seconds"
    )
    swim_background: SwimBackground = Field(
        default=SwimBackground.NONE,
        description="Swimming background affects aerobic recovery"
    )
    weekly_aerobic_hours: Optional[float] = Field(
        None,
        ge=0,
        le=30,
        description="Weekly aerobic training volume in hours"
    )
    
    # Strength metrics
    sled_comfort: SledComfort = Field(
        ...,
        description="How comfortable are you with sled work?"
    )
    wall_ball_unbroken_max: int = Field(
        ...,
        ge=1,
        le=100,
        description="Maximum unbroken wall balls you can do fresh"
    )
    lunge_tolerance: LungeTolerance = Field(
        ...,
        description="How well do you tolerate loaded lunges?"
    )
    
    # Body context
    weight_kg: float = Field(
        ...,
        ge=40,
        le=200,
        description="Body weight in kilograms"
    )
    height_cm: Optional[float] = Field(
        None,
        ge=140,
        le=220,
        description="Height in centimeters"
    )
    gender: Gender = Field(
        ...,
        description="Biological sex for equipment weights"
    )
    age_group: str = Field(
        default="25-29",
        description="Age group for adjustments"
    )
    
    # Race context
    division: Division = Field(
        ...,
        description="Competition division"
    )
    race_strategy: RaceStrategy = Field(
        default=RaceStrategy.FINISH_STRONG,
        description="Pacing philosophy"
    )
    target_event_date: Optional[date] = Field(
        None,
        description="Date of target race"
    )
    goal_time_seconds: Optional[int] = Field(
        None,
        ge=2700,   # 45 minutes minimum
        le=10800,  # 3 hours maximum
        description="Optional goal finish time in seconds (goal mode)"
    )

    @field_validator('five_k_time_seconds')
    @classmethod
    def validate_five_k(cls, v: int) -> int:
        if v < 900:
            raise ValueError("5K time seems too fast. Please enter in seconds.")
        return v


class AthleteProfileResponse(AthleteProfileCreate):
    """Response schema with ID."""
    id: str
    created_at: str
    estimated_tier: PerformanceTier


# =============================================================================
# SIMULATION OUTPUT SCHEMAS
# =============================================================================

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class SegmentPlan(BaseModel):
    """Pacing plan for a single segment."""
    
    segment_order: int
    segment_type: str
    
    # Timing
    target_time_seconds: int
    target_time_display: str  # "4:30" format
    
    # For runs only
    target_pace_per_km: Optional[str] = None  # "5:30/km"
    
    # Effort and fatigue
    effort_percentage: int = Field(ge=0, le=100)
    fatigue_level_entering: float = Field(ge=0, le=1)
    fatigue_level_exiting: float = Field(ge=0, le=1)
    
    # Risk assessment
    risk_level: RiskLevel
    risk_reason: Optional[str] = None
    
    # Execution guidance
    execution_cue: str


class FinishTimePrediction(BaseModel):
    """Three-tier finish time prediction."""
    
    conservative_seconds: int
    conservative_display: str
    
    likely_seconds: int
    likely_display: str
    
    aggressive_seconds: int
    aggressive_display: str
    
    confidence_score: float = Field(ge=0, le=1)

    predicted_finish_seconds: Optional[int] = None
    predicted_finish_display: Optional[str] = None


class RiskAnalysis(BaseModel):
    """Overall race risk analysis."""
    
    high_risk_segments: List[int]  # Segment order numbers
    danger_runs: List[int]  # Run numbers (1-8)
    
    primary_limiter: str  # "aerobic", "strength", "pacing", "mental"
    limiter_explanation: str
    
    blow_up_probability: float = Field(ge=0, le=1)
    blow_up_zone: Optional[str] = None  # "Runs 3-4", "Run 8"


class PenaltyWarning(BaseModel):
    """Warning about potential 2026 penalty rules."""

    station: str
    rule: str
    time_penalty_seconds: int
    description: str


class GoalImpossibilityFlag(BaseModel):
    """Flag when a goal time is physically impossible."""

    is_impossible: bool
    reason: str
    required_avg_run_pace_seconds: float
    athlete_5k_pace_seconds: float
    pace_deficit_percentage: float


class RaceSimulation(BaseModel):
    """Complete simulation output."""

    id: str
    profile_id: str
    created_at: str

    # Mode indicator
    mode: str = "prediction"  # "prediction" or "goal"
    goal_time_seconds: Optional[int] = None
    goal_feasibility: Optional[str] = None  # too_fast, aggressive, realistic, easy

    # Predictions
    predictions: FinishTimePrediction

    # Segment-by-segment plan
    segment_plans: List[SegmentPlan]

    # Risk analysis
    risk_analysis: RiskAnalysis

    # 2026 penalty warnings
    penalty_warnings: List[PenaltyWarning] = []

    # Goal impossibility flag
    goal_impossibility: Optional[GoalImpossibilityFlag] = None

    # AI-generated insights (populated later)
    insights: List[str] = []

    # Summary stats
    total_run_time_seconds: int
    total_station_time_seconds: int
    total_roxzone_time_seconds: int

    # Performance tier classification
    estimated_tier: PerformanceTier


# =============================================================================
# API REQUEST/RESPONSE SCHEMAS
# =============================================================================

class SimulationRequest(BaseModel):
    """Request to run a simulation."""
    profile: AthleteProfileCreate


class SimulationResponse(BaseModel):
    """Full simulation response."""
    simulation: RaceSimulation
    shareable_link: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None