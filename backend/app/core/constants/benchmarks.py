"""
HYROX Race Constants and Benchmark Data
Source: Compiled from 200,000+ race results, World Championships, and PMC research
Last Updated: February 2026
"""

from enum import Enum
from typing import Dict, Any

# =============================================================================
# DIVISIONS
# =============================================================================

class Division(str, Enum):
    MENS_PRO = "mens_pro"
    MENS_OPEN = "mens_open"
    WOMENS_PRO = "womens_pro"
    WOMENS_OPEN = "womens_open"
    DOUBLES_MEN = "doubles_men"
    DOUBLES_WOMEN = "doubles_women"
    DOUBLES_MIXED = "doubles_mixed"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class PerformanceTier(str, Enum):
    ELITE = "elite"           # Top 5%
    ADVANCED = "advanced"     # Top 25%
    INTERMEDIATE = "intermediate"  # 25-75%
    BEGINNER = "beginner"     # Bottom 25%
    RECREATIONAL = "recreational"  # First-timers


# =============================================================================
# EQUIPMENT WEIGHTS BY DIVISION (kg)
# =============================================================================

EQUIPMENT_WEIGHTS: Dict[Division, Dict[str, float]] = {
    Division.MENS_PRO: {
        "sled_push": 202,
        "sled_pull": 153,
        "farmers_carry_per_hand": 32,
        "sandbag_lunges": 30,
        "wall_ball": 13.6,  # 30lb (2026 rulebook)
        "wall_ball_target_m": 3.0,
        "ski_erg_damper": 7,
        "row_damper": 7,
    },
    Division.MENS_OPEN: {
        "sled_push": 152,
        "sled_pull": 103,
        "farmers_carry_per_hand": 24,
        "sandbag_lunges": 20,
        "wall_ball": 6.35,  # 14lb (2026 rulebook)
        "wall_ball_target_m": 3.0,
        "ski_erg_damper": 6,
        "row_damper": 6,
    },
    Division.WOMENS_PRO: {
        "sled_push": 152,
        "sled_pull": 103,
        "farmers_carry_per_hand": 24,
        "sandbag_lunges": 20,
        "wall_ball": 6,
        "wall_ball_target_m": 2.7,
        "ski_erg_damper": 6,
        "row_damper": 6,
    },
    Division.WOMENS_OPEN: {
        "sled_push": 102,
        "sled_pull": 78,
        "farmers_carry_per_hand": 16,
        "sandbag_lunges": 10,
        "wall_ball": 4,
        "wall_ball_target_m": 2.7,
        "ski_erg_damper": 5,
        "row_damper": 5,
    },
    Division.DOUBLES_MEN: {
        "sled_push": 152,
        "sled_pull": 103,
        "farmers_carry_per_hand": 24,
        "sandbag_lunges": 20,
        "wall_ball": 6.35,  # 14lb (2026 rulebook)
        "wall_ball_target_m": 3.0,
        "ski_erg_damper": 6,
        "row_damper": 6,
    },
    Division.DOUBLES_WOMEN: {
        "sled_push": 102,
        "sled_pull": 78,
        "farmers_carry_per_hand": 16,
        "sandbag_lunges": 10,
        "wall_ball": 4,
        "wall_ball_target_m": 2.7,
        "ski_erg_damper": 5,
        "row_damper": 5,
    },
    Division.DOUBLES_MIXED: {
        # Mixed uses Men's Open weights for both athletes
        "sled_push": 152,
        "sled_pull": 103,
        "farmers_carry_per_hand": 24,
        "sandbag_lunges": 20,
        "wall_ball": 6.35,  # 14lb (2026 rulebook)
        "wall_ball_target_m": 3.0,  # Men: 3.0m, Women: 2.7m
        "ski_erg_damper": 6,
        "row_damper": 6,
    },
}


# =============================================================================
# RACE STRUCTURE (Same for all divisions)
# =============================================================================

RACE_SEGMENTS = [
    {"order": 1, "type": "RUN", "distance_m": 1000},
    {"order": 2, "type": "SKI_ERG", "distance_m": 1000},
    {"order": 3, "type": "RUN", "distance_m": 1000},
    {"order": 4, "type": "SLED_PUSH", "distance_m": 50},
    {"order": 5, "type": "RUN", "distance_m": 1000},
    {"order": 6, "type": "SLED_PULL", "distance_m": 50},
    {"order": 7, "type": "RUN", "distance_m": 1000},
    {"order": 8, "type": "BURPEE_BROAD_JUMP", "distance_m": 80},
    {"order": 9, "type": "RUN", "distance_m": 1000},
    {"order": 10, "type": "ROW", "distance_m": 1000},
    {"order": 11, "type": "RUN", "distance_m": 1000},
    {"order": 12, "type": "FARMERS_CARRY", "distance_m": 200},
    {"order": 13, "type": "RUN", "distance_m": 1000},
    {"order": 14, "type": "SANDBAG_LUNGES", "distance_m": 100},
    {"order": 15, "type": "RUN", "distance_m": 1000},
    {"order": 16, "type": "WALL_BALLS", "reps": 100},
]


# =============================================================================
# FINISH TIME BENCHMARKS (in seconds)
# =============================================================================

FINISH_TIME_BENCHMARKS: Dict[Division, Dict[PerformanceTier, Dict[str, int]]] = {
    Division.MENS_PRO: {
        PerformanceTier.ELITE: {"min": 53 * 60 + 15, "max": 60 * 60},  # 53:15 - 1:00:00
        PerformanceTier.ADVANCED: {"min": 60 * 60, "max": 75 * 60},
        PerformanceTier.INTERMEDIATE: {"min": 75 * 60, "max": 90 * 60},
        PerformanceTier.BEGINNER: {"min": 90 * 60, "max": 120 * 60},
        PerformanceTier.RECREATIONAL: {"min": 120 * 60, "max": 150 * 60},
    },
    Division.MENS_OPEN: {
        PerformanceTier.ELITE: {"min": 60 * 60, "max": 75 * 60},
        PerformanceTier.ADVANCED: {"min": 75 * 60, "max": 85 * 60},
        PerformanceTier.INTERMEDIATE: {"min": 85 * 60, "max": 100 * 60},
        PerformanceTier.BEGINNER: {"min": 100 * 60, "max": 114 * 60},
        PerformanceTier.RECREATIONAL: {"min": 114 * 60, "max": 150 * 60},
    },
    Division.WOMENS_PRO: {
        PerformanceTier.ELITE: {"min": 56 * 60 + 23, "max": 65 * 60},
        PerformanceTier.ADVANCED: {"min": 65 * 60, "max": 80 * 60},
        PerformanceTier.INTERMEDIATE: {"min": 80 * 60, "max": 95 * 60},
        PerformanceTier.BEGINNER: {"min": 95 * 60, "max": 125 * 60},
        PerformanceTier.RECREATIONAL: {"min": 125 * 60, "max": 165 * 60},
    },
    Division.WOMENS_OPEN: {
        PerformanceTier.ELITE: {"min": 65 * 60, "max": 86 * 60},
        PerformanceTier.ADVANCED: {"min": 86 * 60, "max": 98 * 60},
        PerformanceTier.INTERMEDIATE: {"min": 98 * 60, "max": 114 * 60},
        PerformanceTier.BEGINNER: {"min": 114 * 60, "max": 130 * 60},
        PerformanceTier.RECREATIONAL: {"min": 130 * 60, "max": 165 * 60},
    },
}


# =============================================================================
# STATION TIME BENCHMARKS (in seconds) - MEN
# =============================================================================

STATION_BENCHMARKS_MEN: Dict[str, Dict[PerformanceTier, Dict[str, int]]] = {
    "SKI_ERG": {
        PerformanceTier.ELITE: {"min": 227, "max": 260},      # 3:47 - 4:20
        PerformanceTier.ADVANCED: {"min": 260, "max": 267},   # 4:20 - 4:27
        PerformanceTier.INTERMEDIATE: {"min": 267, "max": 285},
        PerformanceTier.BEGINNER: {"min": 285, "max": 330},
    },
    "SLED_PUSH": {
        PerformanceTier.ELITE: {"min": 165, "max": 206},      # 2:45 - 3:26
        PerformanceTier.ADVANCED: {"min": 206, "max": 221},
        PerformanceTier.INTERMEDIATE: {"min": 221, "max": 240},
        PerformanceTier.BEGINNER: {"min": 240, "max": 330},
    },
    "SLED_PULL": {
        PerformanceTier.ELITE: {"min": 194, "max": 277},      # 3:14 - 4:37
        PerformanceTier.ADVANCED: {"min": 277, "max": 306},
        PerformanceTier.INTERMEDIATE: {"min": 306, "max": 391},
        PerformanceTier.BEGINNER: {"min": 391, "max": 480},
    },
    "BURPEE_BROAD_JUMP": {
        PerformanceTier.ELITE: {"min": 141, "max": 277},      # 2:21 - 4:37
        PerformanceTier.ADVANCED: {"min": 277, "max": 319},
        PerformanceTier.INTERMEDIATE: {"min": 319, "max": 360},
        PerformanceTier.BEGINNER: {"min": 360, "max": 480},
    },
    "ROW": {
        PerformanceTier.ELITE: {"min": 238, "max": 273},      # 3:58 - 4:33
        PerformanceTier.ADVANCED: {"min": 273, "max": 284},
        PerformanceTier.INTERMEDIATE: {"min": 284, "max": 300},
        PerformanceTier.BEGINNER: {"min": 300, "max": 345},
    },
    "FARMERS_CARRY": {
        PerformanceTier.ELITE: {"min": 97, "max": 119},       # 1:37 - 1:59
        PerformanceTier.ADVANCED: {"min": 119, "max": 130},
        PerformanceTier.INTERMEDIATE: {"min": 130, "max": 165},
        PerformanceTier.BEGINNER: {"min": 165, "max": 210},
    },
    "SANDBAG_LUNGES": {
        PerformanceTier.ELITE: {"min": 183, "max": 264},      # 3:03 - 4:24
        PerformanceTier.ADVANCED: {"min": 264, "max": 296},
        PerformanceTier.INTERMEDIATE: {"min": 296, "max": 330},
        PerformanceTier.BEGINNER: {"min": 330, "max": 420},
    },
    "WALL_BALLS": {
        PerformanceTier.ELITE: {"min": 265, "max": 364},      # 4:25 - 6:04
        PerformanceTier.ADVANCED: {"min": 364, "max": 421},
        PerformanceTier.INTERMEDIATE: {"min": 421, "max": 458},
        PerformanceTier.BEGINNER: {"min": 482, "max": 600},
    },
}


# =============================================================================
# STATION TIME BENCHMARKS (in seconds) - WOMEN
# =============================================================================

STATION_BENCHMARKS_WOMEN: Dict[str, Dict[PerformanceTier, Dict[str, int]]] = {
    "SKI_ERG": {
        PerformanceTier.ELITE: {"min": 252, "max": 300},      # 4:12 - 5:00
        PerformanceTier.ADVANCED: {"min": 300, "max": 311},
        PerformanceTier.INTERMEDIATE: {"min": 311, "max": 330},
        PerformanceTier.BEGINNER: {"min": 330, "max": 390},
    },
    "SLED_PUSH": {
        PerformanceTier.ELITE: {"min": 170, "max": 205},      # 2:50 - 3:25
        PerformanceTier.ADVANCED: {"min": 205, "max": 222},
        PerformanceTier.INTERMEDIATE: {"min": 222, "max": 270},
        PerformanceTier.BEGINNER: {"min": 270, "max": 360},
    },
    "SLED_PULL": {
        PerformanceTier.ELITE: {"min": 234, "max": 299},      # 3:54 - 4:59
        PerformanceTier.ADVANCED: {"min": 299, "max": 334},
        PerformanceTier.INTERMEDIATE: {"min": 334, "max": 396},
        PerformanceTier.BEGINNER: {"min": 396, "max": 540},
    },
    "BURPEE_BROAD_JUMP": {
        PerformanceTier.ELITE: {"min": 191, "max": 357},      # 3:11 - 5:57
        PerformanceTier.ADVANCED: {"min": 357, "max": 410},
        PerformanceTier.INTERMEDIATE: {"min": 410, "max": 450},
        PerformanceTier.BEGINNER: {"min": 450, "max": 600},
    },
    "ROW": {
        PerformanceTier.ELITE: {"min": 269, "max": 311},      # 4:29 - 5:11
        PerformanceTier.ADVANCED: {"min": 311, "max": 324},
        PerformanceTier.INTERMEDIATE: {"min": 324, "max": 330},
        PerformanceTier.BEGINNER: {"min": 330, "max": 390},
    },
    "FARMERS_CARRY": {
        PerformanceTier.ELITE: {"min": 117, "max": 135},      # 1:57 - 2:15
        PerformanceTier.ADVANCED: {"min": 135, "max": 145},
        PerformanceTier.INTERMEDIATE: {"min": 145, "max": 180},
        PerformanceTier.BEGINNER: {"min": 180, "max": 240},
    },
    "SANDBAG_LUNGES": {
        PerformanceTier.ELITE: {"min": 215, "max": 270},      # 3:35 - 4:30
        PerformanceTier.ADVANCED: {"min": 270, "max": 301},
        PerformanceTier.INTERMEDIATE: {"min": 301, "max": 345},
        PerformanceTier.BEGINNER: {"min": 345, "max": 480},
    },
    "WALL_BALLS": {
        PerformanceTier.ELITE: {"min": 230, "max": 353},      # 3:50 - 5:53
        PerformanceTier.ADVANCED: {"min": 353, "max": 411},
        PerformanceTier.INTERMEDIATE: {"min": 411, "max": 450},
        PerformanceTier.BEGINNER: {"min": 450, "max": 540},
    },
}


# =============================================================================
# RUN DEGRADATION COEFFICIENTS
# Multipliers to apply to base 1km pace for each run segment
# =============================================================================

RUN_DEGRADATION: Dict[PerformanceTier, Dict[int, float]] = {
    PerformanceTier.ELITE: {
        1: 1.00,   # Baseline
        2: 1.05,   # Post SkiErg
        3: 1.09,   # Post Sled Push
        4: 1.08,   # Post Sled Pull
        5: 1.09,   # Post Burpee BJ (mid-race wall)
        6: 1.08,   # Post Row
        7: 1.10,   # Post Farmers
        8: 1.15,   # Post Lunges (final push)
    },
    PerformanceTier.ADVANCED: {
        1: 0.95,   # Start conservative
        2: 1.08,
        3: 1.15,
        4: 1.14,
        5: 1.16,   # Mid-race wall
        6: 1.12,
        7: 1.15,
        8: 1.22,
    },
    PerformanceTier.INTERMEDIATE: {
        1: 0.90,   # Too fast start
        2: 1.15,
        3: 1.35,   # Sled push devastation
        4: 1.35,
        5: 1.32,   # Slowest run for most
        6: 1.28,
        7: 1.32,
        8: 1.51,   # Post-lunge survival mode
    },
    PerformanceTier.BEGINNER: {
        1: 0.85,   # Way too fast
        2: 1.22,
        3: 1.45,
        4: 1.44,
        5: 1.42,
        6: 1.38,
        7: 1.42,
        8: 1.62,   # Complete fade
    },
}


# =============================================================================
# POST-STATION FATIGUE MULTIPLIERS
# Applied to the following run segment
# =============================================================================

POST_STATION_FATIGUE: Dict[str, Dict[PerformanceTier, float]] = {
    "SKI_ERG": {
        PerformanceTier.ELITE: 1.02,
        PerformanceTier.ADVANCED: 1.05,
        PerformanceTier.INTERMEDIATE: 1.08,
        PerformanceTier.BEGINNER: 1.12,
    },
    "SLED_PUSH": {  # Compromised Running Model (2026): +15% intermediate baseline
        PerformanceTier.ELITE: 1.08,
        PerformanceTier.ADVANCED: 1.12,
        PerformanceTier.INTERMEDIATE: 1.15,
        PerformanceTier.BEGINNER: 1.20,
    },
    "SLED_PULL": {  # Compromised Running Model (2026): +15% intermediate baseline
        PerformanceTier.ELITE: 1.08,
        PerformanceTier.ADVANCED: 1.12,
        PerformanceTier.INTERMEDIATE: 1.15,
        PerformanceTier.BEGINNER: 1.22,
    },
    "BURPEE_BROAD_JUMP": {  # Compromised Running Model (2026): +8% intermediate baseline
        PerformanceTier.ELITE: 1.04,
        PerformanceTier.ADVANCED: 1.06,
        PerformanceTier.INTERMEDIATE: 1.08,
        PerformanceTier.BEGINNER: 1.12,
    },
    "ROW": {
        PerformanceTier.ELITE: 1.05,
        PerformanceTier.ADVANCED: 1.08,
        PerformanceTier.INTERMEDIATE: 1.10,
        PerformanceTier.BEGINNER: 1.15,
    },
    "FARMERS_CARRY": {
        PerformanceTier.ELITE: 1.05,
        PerformanceTier.ADVANCED: 1.08,
        PerformanceTier.INTERMEDIATE: 1.12,
        PerformanceTier.BEGINNER: 1.15,
    },
    "SANDBAG_LUNGES": {  # Compromised Running Model (2026): +12% intermediate baseline
        PerformanceTier.ELITE: 1.06,
        PerformanceTier.ADVANCED: 1.09,
        PerformanceTier.INTERMEDIATE: 1.12,
        PerformanceTier.BEGINNER: 1.18,
    },
}


# =============================================================================
# ROXZONE TRANSITION TIME (seconds) - Total across all 8 transitions
# =============================================================================

ROXZONE_TIMES: Dict[PerformanceTier, Dict[str, int]] = {
    PerformanceTier.ELITE: {"min": 174, "max": 240},        # 2:54 - 4:00
    PerformanceTier.ADVANCED: {"min": 240, "max": 300},     # 4:00 - 5:00
    PerformanceTier.INTERMEDIATE: {"min": 420, "max": 510}, # 7:00 - 8:30
    PerformanceTier.BEGINNER: {"min": 540, "max": 720},     # 9:00 - 12:00
}


# =============================================================================
# AGE GROUP ADJUSTMENTS (seconds to add to baseline)
# =============================================================================

AGE_ADJUSTMENTS_MEN: Dict[str, int] = {
    "18-24": -60,
    "25-29": 0,       # Baseline
    "30-34": 120,
    "35-39": 60,
    "40-44": 540,
    "45-49": 360,
    "50-54": 480,
    "55-59": 660,
    "60+": 900,
}

AGE_ADJUSTMENTS_WOMEN: Dict[str, int] = {
    "18-24": 300,
    "25-29": 0,       # Baseline
    "30-34": 180,
    "35-39": 480,
    "40-44": 360,
    "45-49": 540,
    "50-54": 360,
    "55-59": 360,
    "60+": 1260,
}


# =============================================================================
# 5K TIME TO BASE HYROX RUN PACE CONVERSION
# =============================================================================

def get_hyrox_pace_multiplier(five_k_seconds: int) -> float:
    """
    Convert 5K time to HYROX race pace multiplier.
    HYROX runs should be ~8-15% slower than 5K pace due to stations.
    
    Elite (sub-18): 1.08x
    Competitive (18-22): 1.10x
    Recreational (22-28): 1.12x
    Beginner (28+): 1.15x
    """
    if five_k_seconds < 18 * 60:
        return 1.08
    elif five_k_seconds < 22 * 60:
        return 1.10
    elif five_k_seconds < 28 * 60:
        return 1.12
    else:
        return 1.15


# =============================================================================
# SWIM BACKGROUND RECOVERY MODIFIERS
# =============================================================================

class SwimBackground(str, Enum):
    NONE = "none"
    RECREATIONAL = "recreational"
    COMPETITIVE = "competitive"


SWIM_RECOVERY_BONUS: Dict[SwimBackground, float] = {
    SwimBackground.NONE: 1.0,
    SwimBackground.RECREATIONAL: 0.95,      # 5% faster recovery
    SwimBackground.COMPETITIVE: 0.88,       # 12% faster recovery
}


# =============================================================================
# SLED COMFORT MODIFIERS
# =============================================================================

class SledComfort(str, Enum):
    COMFORTABLE = "comfortable"
    MANAGEABLE = "manageable"
    SOUL_CRUSHING = "soul_crushing"


SLED_COMFORT_MULTIPLIER: Dict[SledComfort, float] = {
    SledComfort.COMFORTABLE: 0.90,
    SledComfort.MANAGEABLE: 1.00,
    SledComfort.SOUL_CRUSHING: 1.25,
}


# =============================================================================
# WALL BALL FATIGUE BASED ON UNBROKEN MAX
# =============================================================================

def get_wall_ball_fatigue_modifier(unbroken_max: int) -> float:
    """
    Higher unbroken capacity = less late-race wall ball fatigue.
    """
    if unbroken_max >= 50:
        return 0.90
    elif unbroken_max >= 30:
        return 1.00
    elif unbroken_max >= 20:
        return 1.10
    elif unbroken_max >= 10:
        return 1.25
    else:
        return 1.40


# =============================================================================
# LUNGE TOLERANCE
# =============================================================================

class LungeTolerance(str, Enum):
    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"


LUNGE_TOLERANCE_MODIFIER: Dict[LungeTolerance, float] = {
    LungeTolerance.STRONG: 0.92,
    LungeTolerance.MODERATE: 1.00,
    LungeTolerance.WEAK: 1.20,
}


# =============================================================================
# HIGH RISK SEGMENT RULES
# =============================================================================

HIGH_RISK_SEGMENTS = {
    "POST_LUNGE_RUN": {
        "run_number": 8,
        "condition": "lunge_tolerance != STRONG",
        "risk_factor": 1.3,
    },
    "POST_SLED_RUNS": {
        "run_numbers": [3, 4],
        "condition": "sled_comfort == SOUL_CRUSHING",
        "risk_factor": 1.25,
    },
    "WALL_BALLS_LOW_CAPACITY": {
        "condition": "wall_ball_max < 20",
        "risk_factor": 1.35,
    },
    "MID_RACE_WALL": {
        "run_number": 5,
        "condition": "always",  # Everyone struggles here
        "risk_factor": 1.15,
    },
}


# =============================================================================
# 2026 PENALTY RULES
# =============================================================================

PENALTY_RULES_2026 = {
    "SLED_PULL_FRONT_LINE": {
        "station": "SLED_PULL",
        "rule": "Athlete must not step in front of the sled pull line",
        "first_offense_seconds": 15,
        "subsequent_offense_seconds": 30,
    },
    "WALL_BALL_DEPTH": {
        "station": "WALL_BALLS",
        "rule": "Full squat depth required on every rep",
        "first_offense_seconds": 15,
        "subsequent_offense_seconds": 30,
    },
}