from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from model_utils import extract_features, derive_risk_hint
from train_model import ARTIFACT_PATH, META_PATH, train_model


ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT.parent / "Backend" / ".env")
load_dotenv(ROOT / ".env", override=False)

app = FastAPI(title="Project Intelligence ML Service", version="1.0.0")
MODEL_CACHE: Dict[str, Any] | None = None


class ProjectPayload(BaseModel):
    project: Dict[str, Any] = Field(default_factory=dict)


def load_artifact() -> Dict[str, Any] | None:
    global MODEL_CACHE

    if MODEL_CACHE is not None:
    return MODEL_CACHE

    if ARTIFACT_PATH.exists():
        MODEL_CACHE = joblib.load(ARTIFACT_PATH)
        return MODEL_CACHE

    return None


def refresh_artifact() -> Dict[str, Any]:
    global MODEL_CACHE
    meta = train_model()
    MODEL_CACHE = joblib.load(ARTIFACT_PATH)
    MODEL_CACHE["meta"] = meta
    return MODEL_CACHE


def to_risk_score(artifact: Dict[str, Any], project: Dict[str, Any]) -> Dict[str, Any]:
    pipeline = artifact["pipeline"]
    features = np.asarray([extract_features(project)], dtype=float)
    anomaly = float(-pipeline.decision_function(features)[0])

    low = float(artifact.get("scoreLow", 0.0))
    high = float(artifact.get("scoreHigh", 1.0))
    spread = max(0.0001, high - low)
    risk_score = int(np.clip(((anomaly - low) / spread) * 100.0, 0, 100))

    heuristic_hint = derive_risk_hint(project)
    combined_risk = int(np.clip((risk_score * 0.75) + (heuristic_hint * 0.25), 0, 100))

    if combined_risk >= 75:
        level = "critical"
    elif combined_risk >= 55:
        level = "high"
    elif combined_risk >= 30:
        level = "medium"
    else:
        level = "low"

    sample_count = int(artifact.get("sampleCount", 0))
    confidence = int(np.clip(48 + min(sample_count, 80) * 0.45 + (combined_risk / 8), 40, 96))
    predicted_delay_days = int(max(0, round((combined_risk / 12) + (heuristic_hint / 18))))

    return {
        "source": "ml",
        "model": "IsolationForest",
        "riskScore": combined_risk,
        "riskLevel": level,
        "confidence": confidence,
        "predictedDelayDays": predicted_delay_days,
        "featureNames": artifact.get("featureNames", []),
    }


@app.get("/health")
def health() -> Dict[str, Any]:
    artifact = load_artifact()
    return {
        "status": "ok",
        "trained": artifact is not None,
        "sampleCount": artifact.get("sampleCount") if artifact else 0,
    }


@app.post("/train")
def train() -> Dict[str, Any]:
    artifact = refresh_artifact()
    return {
        "status": "trained",
        "sampleCount": artifact.get("sampleCount", 0),
        "meta": artifact.get("meta") or (json.loads(META_PATH.read_text(encoding="utf-8")) if META_PATH.exists() else {}),
    }


@app.post("/predict")
def predict(payload: ProjectPayload) -> Dict[str, Any]:
    artifact = load_artifact()
    if artifact is None:
        auto_train = os.getenv("AUTO_TRAIN_ON_START", "1") == "1"
        if auto_train:
            try:
                artifact = refresh_artifact()
            except Exception as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
        else:
            raise HTTPException(status_code=503, detail="Model is not trained yet")

    return to_risk_score(artifact, payload.project)
