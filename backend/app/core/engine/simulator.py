"""
HYROXPace Simulation Engine
The deterministic brain - no LLM calls here, pure math and sports science.
"""

import uuid
from datetime import datetime
from typing import List, Tuple, Dict, Any

from app.core.constants.benchmarks import (
    Division, Gender, PerformanceTier, SwimBackground, SledComfort, LungeTolerance,
    RACE_SEGMENTS, EQUIPMENT_WEIGHTS,
    STATION_BENCHMARKS_MEN, STATION_BENCHMARKS_WOMEN,
    RUN_DEGRADATION, POST_STATION_FATIGUE, ROXZONE_TIMES,
    AGE_ADJUSTMENTS_MEN, AGE_ADJUSTMENTS_WOMEN,
    SWIM_RECOVERY_BONUS, SLED_COMFORT_MULTIPLIER, LUNGE_TOLERANCE_MODIFIER,
    get_hyrox_pace_multiplier, get_wall_ball_fatigue_modifier,
    HIGH_RISK_SEGMENTS, PENALTY_RULES_2026,
)
from app.schemas.simulation import (
    AthleteProfileCreate, RaceSimulation, SegmentPlan,
    FinishTimePrediction, RiskAnalysis, RiskLevel,
    PenaltyWarning, GoalImpossibilityFlag,
)


class SimulationEngine:
    """
    Core simulation engine for HYROX race prediction.
    100% deterministic - no external API calls.
    """
    
    def __init__(self, profile: AthleteProfileCreate):
        self.profile = profile
        self.gender = profile.gender
        self.division = profile.division
        
        # Determine performance tier based on 5K time
        self.tier = self._estimate_tier()
        
        # Calculate base running pace (seconds per km)
        self.base_pace_per_km = self._calculate_base_pace()
        
        # Get equipment weights for division
        self.weights = EQUIPMENT_WEIGHTS[self.division]
        
        # Goal mode
        self.goal_time_seconds = getattr(profile, 'goal_time_seconds', None)
        self.is_goal_mode = self.goal_time_seconds is not None

        # Track cumulative fatigue (0.0 to 1.0)
        self.fatigue_state = 0.0
        
    def _estimate_tier(self) -> PerformanceTier:
        """Estimate performance tier from 5K time."""
        five_k = self.profile.five_k_time_seconds
        
        if self.gender == Gender.MALE:
            if five_k < 18 * 60:
                return PerformanceTier.ELITE
            elif five_k < 22 * 60:
                return PerformanceTier.ADVANCED
            elif five_k < 26 * 60:
                return PerformanceTier.INTERMEDIATE
            else:
                return PerformanceTier.BEGINNER
        else:  # Female
            if five_k < 21 * 60:
                return PerformanceTier.ELITE
            elif five_k < 25 * 60:
                return PerformanceTier.ADVANCED
            elif five_k < 30 * 60:
                return PerformanceTier.INTERMEDIATE
            else:
                return PerformanceTier.BEGINNER
    
    def _calculate_base_pace(self) -> float:
        """
        Calculate base HYROX running pace from 5K time.
        Returns seconds per kilometer.
        """
        five_k_pace = self.profile.five_k_time_seconds / 5  # pace per km
        multiplier = get_hyrox_pace_multiplier(self.profile.five_k_time_seconds)
        
        # Adjust for swim background (better aerobic = faster recovery between efforts)
        swim_modifier = SWIM_RECOVERY_BONUS[self.profile.swim_background]
        
        return five_k_pace * multiplier * swim_modifier
    
    def _get_station_benchmarks(self) -> Dict:
        """Get appropriate station benchmarks based on gender."""
        if self.gender == Gender.MALE:
            return STATION_BENCHMARKS_MEN
        return STATION_BENCHMARKS_WOMEN
    
    def _estimate_station_time(self, station_type: str, run_number: int) -> int:
        """
        Estimate time for a workout station.
        Accounts for athlete profile and accumulated fatigue.
        """
        benchmarks = self._get_station_benchmarks()
        
        if station_type not in benchmarks:
            return 300  # Default 5 min fallback
        
        tier_benchmarks = benchmarks[station_type].get(self.tier)
        if not tier_benchmarks:
            tier_benchmarks = benchmarks[station_type][PerformanceTier.INTERMEDIATE]
        
        # Start with midpoint of tier range
        base_time = (tier_benchmarks["min"] + tier_benchmarks["max"]) / 2
        
        # Apply athlete-specific modifiers
        time = base_time
        
        # Sled comfort affects sled push/pull significantly
        if station_type in ["SLED_PUSH", "SLED_PULL"]:
            time *= SLED_COMFORT_MULTIPLIER[self.profile.sled_comfort]
            
            # Heavier athletes struggle more with sleds (but have more pushing power)
            weight_factor = (self.profile.weight_kg - 75) / 100  # Normalize around 75kg
            if self.profile.weight_kg > 90:
                time *= (1 + weight_factor * 0.1)  # Up to 10% penalty for heavy athletes
        
        # Wall ball capacity affects wall ball station
        if station_type == "WALL_BALLS":
            time *= get_wall_ball_fatigue_modifier(self.profile.wall_ball_unbroken_max)
        
        # Lunge tolerance affects lunges
        if station_type == "SANDBAG_LUNGES":
            time *= LUNGE_TOLERANCE_MODIFIER[self.profile.lunge_tolerance]
        
        # Apply cumulative fatigue (stations later in race take longer)
        fatigue_multiplier = 1 + (self.fatigue_state * 0.15)
        time *= fatigue_multiplier
        
        return int(time)
    
    def _estimate_run_time(self, run_number: int, previous_station: str = None) -> int:
        """
        Estimate time for a 1km run segment.
        Accounts for degradation pattern and post-station fatigue.

        Compromised Running Model (2026):
        Post-station fatigue coefficients represent acute running impairment
        from the preceding station. Intermediate baseline coefficients:
          SLED_PUSH/PULL: +15%, BURPEE_BJ: +8%, SANDBAG_LUNGES: +12%
          SKI_ERG: +8%, ROW: +10%, FARMERS_CARRY: +12%
        Combined with RUN_DEGRADATION for total run-time impact.
        """
        # Get degradation coefficient for this run number
        degradation = RUN_DEGRADATION.get(self.tier, RUN_DEGRADATION[PerformanceTier.INTERMEDIATE])
        run_multiplier = degradation.get(run_number, 1.0)
        
        # Apply post-station fatigue if applicable
        post_station_mult = 1.0
        if previous_station and previous_station in POST_STATION_FATIGUE:
            post_station_mult = POST_STATION_FATIGUE[previous_station].get(self.tier, 1.0)
        
        # Calculate run time
        run_time = self.base_pace_per_km * run_multiplier * post_station_mult
        
        return int(run_time)
    
    def _update_fatigue(self, segment_type: str, segment_time: int):
        """Update fatigue state after completing a segment."""
        if segment_type == "RUN":
            # Running provides some recovery but also adds fatigue
            recovery = 0.02 * SWIM_RECOVERY_BONUS[self.profile.swim_background]
            added_fatigue = 0.03
            self.fatigue_state = max(0, self.fatigue_state - recovery) + added_fatigue
        else:
            # Stations add significant fatigue
            fatigue_map = {
                "SKI_ERG": 0.05,
                "SLED_PUSH": 0.10,
                "SLED_PULL": 0.12,
                "BURPEE_BROAD_JUMP": 0.08,
                "ROW": 0.06,
                "FARMERS_CARRY": 0.05,
                "SANDBAG_LUNGES": 0.15,  # Highest
                "WALL_BALLS": 0.12,
            }
            self.fatigue_state += fatigue_map.get(segment_type, 0.05)
        
        # Cap fatigue at 1.0
        self.fatigue_state = min(1.0, self.fatigue_state)
    
    def _assess_segment_risk(self, segment_type: str, run_number: int = None) -> Tuple[RiskLevel, str]:
        """Assess risk level for a segment."""
        
        # Run-specific risks
        if segment_type == "RUN" and run_number:
            # Post-lunge run (Run 8)
            if run_number == 8 and self.profile.lunge_tolerance != LungeTolerance.STRONG:
                return RiskLevel.HIGH, "Quad fatigue from lunges will spike HR and slow stride"
            
            # Post-sled runs
            if run_number in [3, 4] and self.profile.sled_comfort == SledComfort.SOUL_CRUSHING:
                return RiskLevel.HIGH, "Sled work depletes legs significantly for you"
            
            # Mid-race wall (Run 5)
            if run_number == 5:
                if self.tier in [PerformanceTier.BEGINNER, PerformanceTier.INTERMEDIATE]:
                    return RiskLevel.MODERATE, "This is typically the slowest run - expect a grind"
        
        # Station-specific risks
        if segment_type == "WALL_BALLS":
            if self.profile.wall_ball_unbroken_max < 20:
                return RiskLevel.HIGH, "Low wall ball capacity will cause major breakdown here"
            elif self.profile.wall_ball_unbroken_max < 30:
                return RiskLevel.MODERATE, "Plan strategic breaks to maintain pace"
        
        if segment_type == "SANDBAG_LUNGES":
            if self.profile.lunge_tolerance == LungeTolerance.WEAK:
                return RiskLevel.HIGH, "Lunges will devastate quads before final run"
        
        if segment_type in ["SLED_PUSH", "SLED_PULL"]:
            if self.profile.sled_comfort == SledComfort.SOUL_CRUSHING:
                return RiskLevel.MODERATE, "Pace yourself here - don't redline"
        
        # High fatigue = elevated risk
        if self.fatigue_state > 0.7:
            return RiskLevel.MODERATE, "Accumulated fatigue is high - focus on execution"
        
        return RiskLevel.LOW, None
    
    def _generate_execution_cue(self, segment_type: str, run_number: int = None, 
                                 risk_level: RiskLevel = RiskLevel.LOW) -> str:
        """Generate execution cue for a segment."""
        
        # Run cues
        if segment_type == "RUN":
            if run_number == 1:
                return "Controlled start, find your rhythm, resist going out too fast"
            elif run_number == 8:
                if risk_level == RiskLevel.HIGH:
                    return "Survival mode - short steps, pump arms, one foot in front of the other"
                return "Final push - empty the tank but maintain form"
            elif run_number == 5:
                return "Mid-race grind - stay mentally engaged, small goals"
            elif run_number in [3, 4]:
                if risk_level == RiskLevel.HIGH:
                    return "Legs are heavy from sleds - short stride, high cadence"
                return "Recover from sled work - controlled breathing"
            else:
                return "Steady effort, controlled breathing"
        
        # Station cues
        cue_map = {
            "SKI_ERG": "Powerful pulls, pace the first 500m, finish strong",
            "SLED_PUSH": "Stay low, drive through legs, don't sprint the first length",
            "SLED_PULL": "Hand over hand rhythm, use legs to anchor, steady pace",
            "BURPEE_BROAD_JUMP": "Controlled jumps, land soft, breathe between reps",
            "ROW": "Strong drive, quick recovery, watch the damper",
            "FARMERS_CARRY": "Grip and go, short quick steps, no rest",
            "SANDBAG_LUNGES": "Step through, keep bag stable, breathe",
            "WALL_BALLS": "Catch and throw rhythm, break before failure",
        }
        
        base_cue = cue_map.get(segment_type, "Steady effort")
        
        # Modify based on risk
        if risk_level == RiskLevel.HIGH:
            if segment_type == "WALL_BALLS":
                max_reps = self.profile.wall_ball_unbroken_max
                if max_reps < 15:
                    return f"Break early: 8-8-8-8... pattern. Don't go to failure"
                elif max_reps < 25:
                    return f"Break at 15 reps. Pattern: 15-15-15-10-10 or similar"
                else:
                    return f"Start with {min(20, max_reps)}, then break every 15-20"
        
        return base_cue
    
    def _calculate_roxzone_time(self) -> int:
        """Estimate total Roxzone transition time."""
        tier_times = ROXZONE_TIMES.get(self.tier, ROXZONE_TIMES[PerformanceTier.INTERMEDIATE])
        return (tier_times["min"] + tier_times["max"]) // 2
    
    def _format_time(self, seconds: int) -> str:
        """Format seconds as H:MM:SS or M:SS."""
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        if hours > 0:
            return f"{hours}:{minutes:02d}:{secs:02d}"
        return f"{minutes}:{secs:02d}"
    
    def _format_pace(self, seconds_per_km: float) -> str:
        """Format pace as M:SS/km."""
        minutes = int(seconds_per_km) // 60
        secs = int(seconds_per_km) % 60
        return f"{minutes}:{secs:02d}/km"
    
    def _assess_penalties(self) -> List[PenaltyWarning]:
        """Assess potential 2026 penalty risks based on athlete profile."""
        warnings = []

        if self.profile.sled_comfort == SledComfort.SOUL_CRUSHING:
            rule = PENALTY_RULES_2026["SLED_PULL_FRONT_LINE"]
            warnings.append(PenaltyWarning(
                station=rule["station"],
                rule=rule["rule"],
                time_penalty_seconds=rule["first_offense_seconds"],
                description="Athletes who struggle with sled pull are more likely to step "
                            "past the front line under fatigue. 15s first offense, 30s subsequent.",
            ))

        if self.profile.wall_ball_unbroken_max < 20:
            rule = PENALTY_RULES_2026["WALL_BALL_DEPTH"]
            warnings.append(PenaltyWarning(
                station=rule["station"],
                rule=rule["rule"],
                time_penalty_seconds=rule["first_offense_seconds"],
                description="Lower wall ball capacity increases risk of cutting squat depth "
                            "under fatigue. 15s first offense, 30s subsequent.",
            ))

        return warnings

    def _check_goal_impossibility(
        self, total_station_time: int, roxzone_time: int
    ) -> GoalImpossibilityFlag:
        """Check if a goal time is physically impossible given athlete fitness."""
        goal = self.goal_time_seconds
        five_k_pace = self.profile.five_k_time_seconds / 5  # seconds per km

        available_run_time = goal - total_station_time - roxzone_time
        required_avg_run_pace = available_run_time / 8  # 8 x 1km runs

        is_impossible = required_avg_run_pace < five_k_pace
        deficit_pct = 0.0
        reason = ""
        if is_impossible:
            deficit_pct = round((five_k_pace - required_avg_run_pace) / five_k_pace * 100, 1)
            reason = (
                f"Goal requires {int(required_avg_run_pace)}s/km avg run pace, "
                f"but your 5K pace is {int(five_k_pace)}s/km. "
                f"That's {deficit_pct}% faster than your open-road 5K pace — "
                f"not achievable in a HYROX race with station fatigue."
            )

        return GoalImpossibilityFlag(
            is_impossible=is_impossible,
            reason=reason,
            required_avg_run_pace_seconds=round(required_avg_run_pace, 1),
            athlete_5k_pace_seconds=round(five_k_pace, 1),
            pace_deficit_percentage=deficit_pct,
        )

    def run_simulation(self) -> RaceSimulation:
        """
        Execute the full race simulation.
        Returns complete RaceSimulation object.
        """
        segment_plans: List[SegmentPlan] = []
        run_number = 0
        previous_station = None
        
        total_run_time = 0
        total_station_time = 0
        high_risk_segments = []
        danger_runs = []
        
        for segment in RACE_SEGMENTS:
            segment_order = segment["order"]
            segment_type = segment["type"]
            
            fatigue_entering = self.fatigue_state
            
            if segment_type == "RUN":
                run_number += 1
                time_seconds = self._estimate_run_time(run_number, previous_station)
                total_run_time += time_seconds
                target_pace = self._format_pace(time_seconds)
                previous_station = None
            else:
                time_seconds = self._estimate_station_time(segment_type, run_number)
                total_station_time += time_seconds
                target_pace = None
                previous_station = segment_type
            
            # Update fatigue after segment
            self._update_fatigue(segment_type, time_seconds)
            fatigue_exiting = self.fatigue_state
            
            # Assess risk
            risk_level, risk_reason = self._assess_segment_risk(
                segment_type, 
                run_number if segment_type == "RUN" else None
            )
            
            if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                high_risk_segments.append(segment_order)
                if segment_type == "RUN":
                    danger_runs.append(run_number)
            
            # Generate execution cue
            execution_cue = self._generate_execution_cue(segment_type, run_number, risk_level)
            
            # Calculate effort percentage (simplified)
            effort_pct = min(95, 70 + int(self.fatigue_state * 30))
            
            segment_plan = SegmentPlan(
                segment_order=segment_order,
                segment_type=segment_type,
                target_time_seconds=time_seconds,
                target_time_display=self._format_time(time_seconds),
                target_pace_per_km=target_pace,
                effort_percentage=effort_pct,
                fatigue_level_entering=round(fatigue_entering, 2),
                fatigue_level_exiting=round(fatigue_exiting, 2),
                risk_level=risk_level,
                risk_reason=risk_reason,
                execution_cue=execution_cue,
            )
            segment_plans.append(segment_plan)
        
        # Calculate Roxzone time
        roxzone_time = self._calculate_roxzone_time()
        
        # Calculate total times
        likely_total = total_run_time + total_station_time + roxzone_time
        
        # Apply age adjustment
        if self.gender == Gender.MALE:
            age_adj = AGE_ADJUSTMENTS_MEN.get(self.profile.age_group, 0)
        else:
            age_adj = AGE_ADJUSTMENTS_WOMEN.get(self.profile.age_group, 0)
        likely_total += age_adj

        # Store the fitness-based prediction before any goal scaling
        predicted_finish = likely_total

        # Assess 2026 penalty risks
        penalty_warnings = self._assess_penalties()

        # Goal mode processing
        goal_feasibility = None
        goal_impossibility = None

        if self.is_goal_mode:
            goal = self.goal_time_seconds
            goal_impossibility = self._check_goal_impossibility(
                total_station_time, roxzone_time
            )

            # Calculate scale factor to fit segments into goal time
            predicted_active = total_run_time + total_station_time
            if predicted_active > 0:
                scale_factor = (goal - roxzone_time) / predicted_active
            else:
                scale_factor = 1.0

            # Floor clamp: don't let scale_factor go below 0.7
            scale_factor = max(0.7, scale_factor)

            # Classify feasibility
            time_diff = goal - predicted_finish
            percent_diff = (time_diff / predicted_finish) * 100 if predicted_finish > 0 else 0

            if percent_diff < -20:
                goal_feasibility = "too_fast"
            elif percent_diff < -10:
                goal_feasibility = "aggressive"
            elif percent_diff < 10:
                goal_feasibility = "realistic"
            else:
                goal_feasibility = "easy"

            # Scale all segment times to fit the goal
            scaled_run_time = 0
            scaled_station_time = 0
            for plan in segment_plans:
                plan.target_time_seconds = int(plan.target_time_seconds * scale_factor)
                plan.target_time_display = self._format_time(plan.target_time_seconds)
                if plan.segment_type == "RUN":
                    plan.target_pace_per_km = self._format_pace(plan.target_time_seconds)
                    scaled_run_time += plan.target_time_seconds
                else:
                    scaled_station_time += plan.target_time_seconds

            total_run_time = scaled_run_time
            total_station_time = scaled_station_time
            likely_total = goal

        # Calculate prediction bands
        conservative_total = int(likely_total * 1.05)
        aggressive_total = int(likely_total * 0.95)

        predictions = FinishTimePrediction(
            conservative_seconds=conservative_total,
            conservative_display=self._format_time(conservative_total),
            likely_seconds=likely_total,
            likely_display=self._format_time(likely_total),
            aggressive_seconds=aggressive_total,
            aggressive_display=self._format_time(aggressive_total),
            confidence_score=0.75 if self.tier in [PerformanceTier.ADVANCED, PerformanceTier.ELITE] else 0.65,
            predicted_finish_seconds=predicted_finish,
            predicted_finish_display=self._format_time(predicted_finish),
        )

        # Determine primary limiter
        limiter, limiter_explanation = self._determine_primary_limiter()

        # Calculate blow-up probability
        blow_up_prob = self._calculate_blowup_probability()
        blow_up_zone = None
        if blow_up_prob > 0.3:
            if self.profile.sled_comfort == SledComfort.SOUL_CRUSHING:
                blow_up_zone = "Runs 3-4 (post-sled)"
            elif self.profile.lunge_tolerance == LungeTolerance.WEAK:
                blow_up_zone = "Run 8 (post-lunges)"
            else:
                blow_up_zone = "Run 5 (mid-race wall)"

        risk_analysis = RiskAnalysis(
            high_risk_segments=high_risk_segments,
            danger_runs=danger_runs,
            primary_limiter=limiter,
            limiter_explanation=limiter_explanation,
            blow_up_probability=blow_up_prob,
            blow_up_zone=blow_up_zone,
        )

        return RaceSimulation(
            id=str(uuid.uuid4()),
            profile_id=str(uuid.uuid4()),  # Would come from DB
            created_at=datetime.utcnow().isoformat(),
            mode="goal" if self.is_goal_mode else "prediction",
            goal_time_seconds=self.goal_time_seconds,
            goal_feasibility=goal_feasibility,
            predictions=predictions,
            segment_plans=segment_plans,
            risk_analysis=risk_analysis,
            penalty_warnings=penalty_warnings,
            goal_impossibility=goal_impossibility,
            insights=[],  # Populated by narrative engine
            total_run_time_seconds=total_run_time,
            total_station_time_seconds=total_station_time,
            total_roxzone_time_seconds=roxzone_time,
            estimated_tier=self.tier,
        )
    
    def _determine_primary_limiter(self) -> Tuple[str, str]:
        """Determine what will limit this athlete's performance."""
        
        # Check aerobic capacity
        five_k = self.profile.five_k_time_seconds
        
        if self.gender == Gender.MALE and five_k > 25 * 60:
            return "aerobic", "Your 5K time suggests running will be your main challenge. Running accounts for 52% of elite race time."
        elif self.gender == Gender.FEMALE and five_k > 28 * 60:
            return "aerobic", "Your 5K time suggests running will be your main challenge. Focus on maintaining consistent run paces."
        
        # Check strength limiters
        if self.profile.sled_comfort == SledComfort.SOUL_CRUSHING:
            return "strength", "Sled work is a significant weakness. The sled complex (push + pull) will create a fatigue debt that compounds through mid-race runs."
        
        if self.profile.wall_ball_unbroken_max < 15:
            return "strength", "Low wall ball capacity will cause a major breakdown at the final station when you're most fatigued."
        
        if self.profile.lunge_tolerance == LungeTolerance.WEAK:
            return "strength", "Lunge weakness will devastate your quads before the final run, making Run 8 extremely difficult."
        
        # Default to pacing
        return "pacing", "Your fitness is balanced. Success will come down to smart pacing - start conservative and finish strong."
    
    def _calculate_blowup_probability(self) -> float:
        """Calculate probability of race blowup based on profile."""
        prob = 0.15  # Baseline
        
        # Tier adjustments
        if self.tier == PerformanceTier.BEGINNER:
            prob += 0.20
        elif self.tier == PerformanceTier.INTERMEDIATE:
            prob += 0.10
        
        # Weakness multipliers
        if self.profile.sled_comfort == SledComfort.SOUL_CRUSHING:
            prob += 0.15
        
        if self.profile.wall_ball_unbroken_max < 15:
            prob += 0.15
        elif self.profile.wall_ball_unbroken_max < 25:
            prob += 0.05
        
        if self.profile.lunge_tolerance == LungeTolerance.WEAK:
            prob += 0.10
        
        # Strategy adjustment
        if self.profile.race_strategy.value == "send_it":
            prob += 0.15
        
        return min(0.85, prob)


def run_simulation(profile: AthleteProfileCreate) -> RaceSimulation:
    """
    Main entry point for running a simulation.
    """
    engine = SimulationEngine(profile)
    return engine.run_simulation()