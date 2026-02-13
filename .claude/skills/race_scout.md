# Race Scout

Tactical race intelligence from a completed HYROXPace simulation.

## Trigger

User asks for tactical advice, race analysis, "scout my race", "what should I focus on", or similar after a simulation has been run.

## Input

A completed `RaceSimulation` JSON object (from the backend or mock). The user will typically paste it or reference the most recent simulation.

## Analysis Framework

When invoked, analyze the simulation using this four-step framework. Use reasoning to derive insights — never recalculate the simulation math.

### Step 1: Find the Biggest Time Sink

- Compare each station's `target_time_seconds` to the tier benchmark midpoint for that station (from `benchmarks.py`)
- Calculate `% deviation above midpoint` for each station
- The station with the highest deviation is the #1 time sink
- Report: station name, time, and how much slower than the tier midpoint

### Step 2: Aerobic vs Station Balance

- Compare the athlete's 5K-derived run pace to their 1K Row time (if available in profile)
- If total run time is >55% of active time (run + station), the athlete is station-limited
- If total station time is >50% of active time, the athlete is aerobic-limited
- Report: which side is the limiter and what the ratio is

### Step 3: Worst Compromised Run

- Look at all 8 run segments in `segment_plans`
- Find the run with the highest `target_time_seconds` relative to Run 1
- Calculate the degradation ratio: `Run N time / Run 1 time`
- Report: which run, the degradation %, and which preceding station caused it

### Step 4: Tactical Summary

Generate a **Top 3 Priorities** list:

1. **Pre-race focus**: What to train in the weeks before (based on biggest weakness)
2. **Race-day pacing key**: The single most important pacing decision (e.g., "Don't go out faster than X:XX on Run 1")
3. **Critical moment**: The specific segment where the race will be won or lost, with an execution cue

## Output Format

```
RACE SCOUT REPORT
=================

Tier: {estimated_tier}
Predicted Finish: {likely_display}
Mode: {prediction | goal (goal_time)}

--- BIGGEST TIME SINK ---
{Station Name}: {time} ({+X% above tier midpoint})
Why: {explanation}

--- AEROBIC vs STATION BALANCE ---
Run/Station ratio: {X}%/{Y}%
You are {aerobic|station}-limited.
{Explanation}

--- WORST COMPROMISED RUN ---
Run {N} ({time}): {X}% slower than Run 1
Cause: {preceding station} fatigue
{What this means tactically}

--- TOP 3 PRIORITIES ---
1. PRE-RACE: {training focus}
2. RACE-DAY: {pacing key}
3. CRITICAL MOMENT: {segment + execution cue}
```

## Constraints

- Use Opus 4.6 reasoning for analysis and advice only
- Never recalculate simulation math — trust the engine output
- If penalty_warnings are present, mention them in the tactical summary
- Keep the report under 400 words
- Be direct and specific — no generic advice like "train harder"
