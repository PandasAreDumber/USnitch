import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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


@app.post("/reports")
def create_report(report: Report):
    # Placeholder: echo back the report until DB storage is wired up.
    return report


@app.get("/predictions")
def get_predictions():
    # Placeholder: no predictions yet.
    return []
