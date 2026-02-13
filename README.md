# HYROXPace

**Know your race before you race it.**

Race prediction, pacing, and live execution app for HYROX athletes. Not a training app — a race execution app.

---

## What It Does

HYROXPace takes an athlete profile and generates:

- **Three-tier finish time prediction** (conservative, likely, aggressive)
- **Segment-by-segment pacing plan** with target times and effort levels
- **Risk analysis** identifying where you're most likely to struggle
- **Execution cues** for each station and run
- **Live race tracking** with real-time heart rate monitoring
- **Redline alerts** via wearable integration (Apple Watch / Garmin)

## Tech Stack

### Backend (Python)
- **FastAPI** — async API framework
- **Pydantic v2** — validation and serialization
- **SQLAlchemy** — ORM with async SQLite/PostgreSQL support
- **PyJWT + bcrypt** — JWT authentication
- **100% deterministic simulation engine** — no LLM calls for core logic

### Mobile (React Native / Expo)
- **Expo SDK 54** — cross-platform iOS/Android
- **React Navigation** — native stack + bottom tabs
- **TypeScript** — type safety throughout
- **Zustand** — lightweight state management
- **Axios** — HTTP client with timeout and interceptors
- **expo-secure-store** — encrypted token persistence

---

## Project Structure

```
hyrox-pace/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── api/
│   │   │   ├── dependencies.py        # Auth dependencies
│   │   │   └── routes/
│   │   │       ├── auth.py            # Login / signup
│   │   │       ├── simulation.py      # Race simulation
│   │   │       ├── live_race.py       # Live race tracking
│   │   │       └── wearable.py        # Heart rate & redline
│   │   ├── core/
│   │   │   ├── security.py            # JWT & bcrypt
│   │   │   ├── database.py            # SQLAlchemy setup
│   │   │   ├── constants/
│   │   │   │   └── benchmarks.py      # 200K+ race result data
│   │   │   └── engine/
│   │   │       └── simulator.py       # Deterministic simulation engine
│   │   ├── models/                    # SQLAlchemy models
│   │   ├── schemas/                   # Pydantic request/response models
│   │   └── services/
│   │       ├── wearable_agent.py      # Redline detection agent
│   │       └── live_race_worker.py    # Background race worker
│   ├── requirements.txt
│   └── tests/
│
├── mobile/
│   ├── App.tsx                        # Entry point with auth routing
│   ├── app.json                       # Expo config
│   ├── package.json
│   └── src/
│       ├── screens/
│       │   ├── AuthScreen.tsx         # Login / signup
│       │   ├── HomeScreen.tsx         # Home tab
│       │   ├── IntakeScreen.tsx       # Athlete profile form
│       │   ├── ResultsScreen.tsx      # Prediction display
│       │   ├── PlanScreen.tsx         # Segment pacing table
│       │   ├── ProfileScreen.tsx      # User profile & settings
│       │   └── AgentDashboard.tsx     # Agentic coach insights
│       ├── components/
│       │   └── RedlineOverlay.tsx     # HR alert overlay
│       ├── lib/
│       │   ├── api.ts                 # Axios client (mock mode toggle)
│       │   ├── CoachEngine.ts         # Frontend coach logic
│       │   └── RedlineTracker.ts      # HR redline calculations
│       ├── store/                     # Zustand stores
│       │   ├── authStore.ts
│       │   ├── raceStore.ts
│       │   ├── dashboardStore.ts
│       │   └── wearableStore.ts
│       ├── services/
│       │   └── WearableService.ts     # HealthKit / Google Fit
│       └── types/
│           ├── index.ts
│           └── auth.ts
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Expo Go app on your phone (for mobile testing)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8000
```

API available at `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

### Mobile

```bash
cd mobile

# Install dependencies
npm install

# Create .env file with your config
cp .env.example .env

# Start Expo
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

> **Mock mode:** Set `USE_MOCK = true` in `mobile/src/lib/api.ts` to run the app without a backend.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login (returns JWT) |
| GET | `/api/v1/auth/me` | Get current user |

### Simulation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/simulate` | Run full simulation |
| POST | `/api/v1/simulate/quick` | Quick simulation (profile directly) |
| GET | `/api/v1/divisions` | List available divisions |
| GET | `/api/v1/benchmarks/{division}` | Get division benchmarks |

### Live Race
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/live-race/start` | Start live race session |
| POST | `/api/v1/live-race/checkpoint` | Log segment checkpoint |
| GET | `/api/v1/live-race/{id}` | Get race status |

### Wearable
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/wearable/heartrate` | Submit HR data |
| GET | `/api/v1/wearable/alerts` | Get redline alerts |

### Example Request

```bash
curl -X POST http://localhost:8000/api/v1/simulate/quick \
  -H "Content-Type: application/json" \
  -d '{
    "five_k_time_seconds": 1500,
    "swim_background": "recreational",
    "sled_comfort": "manageable",
    "wall_ball_unbroken_max": 25,
    "lunge_tolerance": "moderate",
    "weight_kg": 80,
    "gender": "male",
    "age_group": "30-34",
    "division": "mens_open",
    "race_strategy": "finish_strong"
  }'
```

---

## The Simulation Engine

The core engine is **100% deterministic** — no LLM calls. This is intentional:

1. **Reproducibility** — same inputs always produce same outputs
2. **Speed** — no API latency
3. **Cost** — no per-request charges
4. **Reliability** — no hallucinated numbers

### How It Works

1. **Base pace calculation** from 5K time with tier-based multiplier
2. **Station time estimation** using benchmark data + athlete modifiers
3. **Fatigue accumulation** modeling throughout the race
4. **Compromised running** — post-station fatigue + cumulative run degradation
5. **Risk assessment** for each segment
6. **Execution cue generation** based on profile and risk level

### Data Sources

All benchmark data compiled from:
- 200,000+ HYROX race results
- World Championship timing data
- PMC/NIH physiological research
- Official HYROX rulebook 2025/26

---

## Wearable Integration

HYROXPace connects to Apple Health (iOS) and Google Fit (Android) for real-time heart rate monitoring during live races.

- **30-second polling** in foreground mode
- **Redline detection** — alerts when HR exceeds 95% max for 2+ minutes
- **RedlineOverlay** component displays alerts on the results screen

---

## Environment Variables

### Mobile (`mobile/.env`)
```
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
```

---

## License

Copyright (c) 2026 William. All rights reserved.

This source code is proprietary and confidential. No part of this codebase may be reproduced, distributed, or transmitted in any form without prior written permission.

---

Built for HYROX athletes who want to **know their race before they race it**.
