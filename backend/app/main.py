"""
HYROXPace API
Race prediction and pacing simulator for HYROX athletes.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, simulation, live_race, wearable
from app.core.database import engine, init_db
from app.services.live_race_worker import worker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    await init_db()
    logger.info("Starting live race worker...")
    await worker.start()

    yield

    # Shutdown
    logger.info("Stopping live race worker...")
    await worker.stop()
    await engine.dispose()
    logger.info("Shutdown complete")


app = FastAPI(
    title="HYROXPace API",
    description="Race prediction and pacing simulator for HYROX athletes. Know your race before you race it.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(simulation.router, prefix="/api/v1", tags=["simulation"])
app.include_router(live_race.router, prefix="/api/v1", tags=["live-tracking"])
app.include_router(wearable.router, prefix="/api/v1", tags=["wearable"])


@app.get("/")
async def root():
    return {
        "name": "HYROXPace API",
        "tagline": "Know your race before you race it.",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "worker_running": worker.is_running}
