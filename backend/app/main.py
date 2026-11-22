from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, PROJECT_NAME
from app.routers import (
    anomalies, batches, business, heatwave, impact, llm, messages, meta, needs, optimiser,
    passport, plants, requests, risk, rules, savings, soil, supply, territory,
)
from app.schemas import HealthResponse
from app.store import get_store, init_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_store()  # load every dataset once
    yield


app = FastAPI(title=PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health():
    s = get_store()
    return {"status": "ok", "datasets": s.row_counts(), "errors": s.errors}


# Feature routers: one line each, one owner each
app.include_router(plants.router)
app.include_router(batches.router)
app.include_router(rules.router)
app.include_router(needs.router)
app.include_router(supply.router)
app.include_router(optimiser.router)
app.include_router(risk.router)
app.include_router(passport.router)
app.include_router(anomalies.router)
app.include_router(soil.router)
app.include_router(heatwave.router)
app.include_router(llm.router)
app.include_router(messages.router)
app.include_router(impact.router)
app.include_router(savings.router)
app.include_router(business.router)
app.include_router(requests.router)
app.include_router(territory.router)
app.include_router(meta.router)
