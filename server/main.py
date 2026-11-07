import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model import MODEL_PATH, train, predict, load_lots

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

# Hackathon: allow all origins for now; tighten before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Report(BaseModel):
    node_id: int
    timestamp: datetime
    photo_verified: bool


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/predictions")
def get_predictions(time: datetime | None = None):
    """Likelihood of an enforcement vehicle at each lot, highest first.

    time: ISO 8601 with a time zone, e.g. 2026-11-10T17:30Z or 2026-11-10T10:30-07:00.
    Leave it out for right now.
    """
    time = time or datetime.now(timezone.utc)
    if not os.path.exists(MODEL_PATH):
        raise HTTPException(status_code=503, detail="The model hasn't been trained yet.")

    scores = predict(time)
    lots = load_lots().set_index("node_id")
    return {
        "time": time.isoformat(),
        "lots": [
            {
                "lot_id": lot_id,
                "name": str(lots.at[lot_id, "name"]),
                "likelihood": score,
            }
            for lot_id, score in scores.items()
        ],
    }

@app.get("/train")
def start_training():
    train()