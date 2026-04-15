from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from pymongo import MongoClient
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

MODEL_BUNDLE_PATH = Path(os.getenv("ML_MODEL_PATH", BASE_DIR / "model_bundle.joblib"))
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/freelancer_app")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "freelancer_app")
AUTO_TRAIN_ON_START = os.getenv("AUTO_TRAIN_ON_START", "1") == "1"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        text = value.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(text)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def days_between(start: datetime | None, end: datetime | None = None) -> int:
    if not start:
        return 0
    end_dt = end or utc_now()
    delta = end_dt - start
    return max(0, int(round(delta.total_seconds() / 86400)))


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def safe_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def requirement_counts(project: Dict[str, Any]) -> Dict[str, int]:
    requirements = project.get("requirements") or []
    pending = sum(1 for r in requirements if r.get("status") == "pending")
    in_progress = sum(1 for r in requirements if r.get("status") == "in-progress")
    completed = sum(1 for r in requirements if r.get("status") == "completed")
    verified = sum(1 for r in requirements if r.get("verified") is True)
    high_priority = sum(1 for r in requirements if r.get("priority") == "high")
    return {
        "total": len(requirements),
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "verified": verified,
        "high_priority": high_priority,
    }


def milestone_counts(project: Dict[str, Any]) -> Dict[str, int]:
    milestones = project.get("milestones") or []
    pending = sum(1 for m in milestones if m.get("status") == "pending")
    in_progress = sum(1 for m in milestones if m.get("status") == "in-progress")
    submitted = sum(1 for m in milestones if m.get("status") == "submitted")
    completed = sum(1 for m in milestones if m.get("status") in ("completed", "paid"))
    return {
        "total": len(milestones),
        "pending": pending,
        "in_progress": in_progress,
        "submitted": submitted,
        "completed": completed,
    }


FEATURE_NAMES = [
    "budget_log",
    "project_age_days",
    "requirements_total",
    "requirements_pending",
    "requirements_in_progress",
    "requirements_completed",
    "requirements_verified",
    "requirements_high_priority",
    "milestones_total",
    "milestones_pending",
    "milestones_in_progress",
    "milestones_submitted",
    "milestones_completed",
    "progress_score",
    "overall_score",
    "status_active",
    "status_submitted",
    "status_completed",
    "payment_released",
]


def build_feature_row(project: Dict[str, Any]) -> Tuple[np.ndarray, Dict[str, Any]]:
    req = requirement_counts(project)
    ms = milestone_counts(project)

    created_at = parse_dt(project.get("createdAt"))
    project_age_days = days_between(created_at)
    budget = safe_float(project.get("budget"), 0.0)
    budget_log = math.log10(max(1.0, budget + 1.0))

    status = project.get("status") or "active"
    progress_score = safe_float(project.get("progress"), 0.0)
    overall_score = safe_float(project.get("overallScore"), 0.0)
    payment_released = 1 if project.get("paymentReleased") else 0

    row = np.array(
        [
            budget_log,
            float(project_age_days),
            float(req["total"]),
            float(req["pending"]),
            float(req["in_progress"]),
            float(req["completed"]),
            float(req["verified"]),
            float(req["high_priority"]),
            float(ms["total"]),
            float(ms["pending"]),
            float(ms["in_progress"]),
            float(ms["submitted"]),
            float(ms["completed"]),
            float(progress_score),
            float(overall_score),
            1.0 if status == "active" else 0.0,
            1.0 if status == "submitted" else 0.0,
            1.0 if status == "completed" else 0.0,
            float(payment_released),
        ],
        dtype=np.float64,
    )

    metadata = {
        "requirements": req,
        "milestones": ms,
        "project_age_days": project_age_days,
        "status": status,
    }
    return row, metadata


def baseline_risk(metadata: Dict[str, Any], project: Dict[str, Any]) -> float:
    req = metadata["requirements"]
    ms = metadata["milestones"]

    total_req = max(1, req["total"])
    pending_rate = req["pending"] / total_req
    completion_rate = req["completed"] / total_req
    verification_rate = req["verified"] / total_req
    high_priority_rate = req["high_priority"] / total_req

    milestone_pressure = 0.0
    if ms["total"] > 0:
        milestone_pressure = (
            ms["pending"] * 0.9 + ms["in_progress"] * 0.6 + ms["submitted"] * 0.4
        ) / ms["total"]

    status = metadata["status"]
    submitted_penalty = 0.0
    if status == "submitted":
        submitted_penalty = clamp(40.0 - safe_float(project.get("overallScore"), 45.0), 0.0, 25.0)

    risk = (
        15.0
        + pending_rate * 35.0
        + high_priority_rate * 16.0
        + milestone_pressure * 22.0
        + metadata["project_age_days"] * 0.7
        + submitted_penalty
        - completion_rate * 28.0
        - verification_rate * 12.0
    )

    return clamp(risk, 0.0, 100.0)


def build_top_drivers(metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
    req = metadata["requirements"]
    ms = metadata["milestones"]
    total_req = max(1, req["total"])
    pending_rate = int(round((req["pending"] / total_req) * 100))
    high_priority_rate = int(round((req["high_priority"] / total_req) * 100))
    milestone_pressure = 0
    if ms["total"] > 0:
        milestone_pressure = int(
            round(((ms["pending"] * 0.9 + ms["in_progress"] * 0.6 + ms["submitted"] * 0.4) / ms["total"]) * 100)
        )

    drivers = [
        {
            "label": "Pending work",
            "value": pending_rate,
            "note": f"{req['pending']} pending requirements",
        },
        {
            "label": "High-priority load",
            "value": high_priority_rate,
            "note": f"{req['high_priority']} high-priority requirements",
        },
        {
            "label": "Milestone pressure",
            "value": milestone_pressure,
            "note": f"{ms['pending']} pending milestones",
        },
        {
            "label": "Project age",
            "value": metadata["project_age_days"],
            "note": f"{metadata['project_age_days']} days since created",
        },
    ]
    return sorted(drivers, key=lambda item: item["value"], reverse=True)[:3]


def recommended_actions(metadata: Dict[str, Any], risk_score: int) -> List[str]:
    req = metadata["requirements"]
    ms = metadata["milestones"]
    actions: List[str] = []

    if req["pending"] > 0:
        actions.append(f"Close the {req['pending']} pending requirements before taking new scope.")
    if req["high_priority"] > 0:
        actions.append("Prioritize high-impact requirements in the next sprint cycle.")
    if ms["total"] > 0 and ms["pending"] > 0:
        actions.append("Split the next milestone into smaller reviewable checkpoints.")
    if risk_score >= 60:
        actions.append("Run a client-freelancer checkpoint this week to align timeline.")
    if not actions:
        actions.append("Current project trajectory is healthy. Keep progress updates consistent.")

    return actions[:4]


def milestone_replan(metadata: Dict[str, Any], risk_score: int) -> List[str]:
    ms = metadata["milestones"]
    if ms["total"] == 0:
        return ["Add milestones to improve timeline forecasting accuracy."]

    plan = [f"Milestone completion: {ms['completed']}/{ms['total']}."]
    if ms["pending"] > 0:
        plan.append(f"Start or clarify {ms['pending']} pending milestones.")
    if risk_score >= 60:
        plan.append("Re-scope next milestone to a smaller deliverable before submission.")
    else:
        plan.append("Current milestone structure is acceptable for projected delivery.")
    return plan


class ModelStore:
    def __init__(self) -> None:
        self.bundle: Dict[str, Any] | None = None

    def load(self) -> None:
        if MODEL_BUNDLE_PATH.exists():
            self.bundle = joblib.load(MODEL_BUNDLE_PATH)
        else:
            self.bundle = None

    def save(self, bundle: Dict[str, Any]) -> None:
        MODEL_BUNDLE_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(bundle, MODEL_BUNDLE_PATH)
        self.bundle = bundle


model_store = ModelStore()


def fetch_projects_for_training() -> List[Dict[str, Any]]:
    client = MongoClient(MONGO_URI)
    try:
        projects = list(client[MONGO_DB_NAME]["projects"].find({}))
        return projects
    finally:
        client.close()


def train_model() -> Dict[str, Any]:
    projects = fetch_projects_for_training()
    if len(projects) < 8:
        raise ValueError("Need at least 8 projects to train ML model")

    rows: List[np.ndarray] = []
    for project in projects:
        row, _ = build_feature_row(project)
        rows.append(row)

    matrix = np.vstack(rows)
    scaler = StandardScaler()
    scaled = scaler.fit_transform(matrix)

    model = IsolationForest(
        n_estimators=220,
        contamination=0.22,
        random_state=42,
    )
    model.fit(scaled)

    raw_scores = -model.decision_function(scaled)
    q10 = float(np.percentile(raw_scores, 10))
    q90 = float(np.percentile(raw_scores, 90))

    bundle = {
        "model": model,
        "scaler": scaler,
        "feature_names": FEATURE_NAMES,
        "trained_at": utc_now().isoformat(),
        "training_size": int(matrix.shape[0]),
        "score_q10": q10,
        "score_q90": q90,
    }
    model_store.save(bundle)
    return bundle


def normalize_model_score(raw_score: float, q10: float, q90: float) -> float:
    if q90 <= q10:
        return clamp(raw_score * 20.0 + 50.0, 0.0, 100.0)
    scaled = ((raw_score - q10) / (q90 - q10)) * 100.0
    return clamp(scaled, 0.0, 100.0)


def predict_intelligence(project: Dict[str, Any]) -> Dict[str, Any]:
    row, metadata = build_feature_row(project)
    base = baseline_risk(metadata, project)

    model_score = None
    if model_store.bundle:
        bundle = model_store.bundle
        scaler: StandardScaler = bundle["scaler"]
        model: IsolationForest = bundle["model"]
        q10 = safe_float(bundle.get("score_q10"), 0.0)
        q90 = safe_float(bundle.get("score_q90"), 1.0)

        scaled_row = scaler.transform(row.reshape(1, -1))
        raw = -float(model.decision_function(scaled_row)[0])
        model_score = normalize_model_score(raw, q10, q90)

    combined = base if model_score is None else (base * 0.4 + model_score * 0.6)
    risk_score = int(round(clamp(combined, 0.0, 100.0)))

    req = metadata["requirements"]
    ms = metadata["milestones"]
    total_req = max(1, req["total"])
    completion_rate = req["completed"] / total_req
    verification_rate = req["verified"] / total_req
    pending_rate = req["pending"] / total_req
    milestone_completion = (ms["completed"] / ms["total"]) if ms["total"] > 0 else 0.0

    predicted_delay_days = int(
        round(
            clamp(
                (risk_score / 14.0)
                + (req["pending"] * 0.5)
                + (req["high_priority"] * 0.35)
                + (ms["pending"] * 0.8)
                - (req["completed"] * 0.2),
                0,
                120,
            )
        )
    )

    confidence_base = 50 + min(req["total"], 12) * 2 + min(ms["total"], 6) * 3
    if model_store.bundle:
        confidence_base += min(safe_int(model_store.bundle.get("training_size")) // 10, 20)
    confidence = int(round(clamp(confidence_base, 35, 95)))

    if risk_score >= 75:
        stage = "critical"
    elif risk_score >= 55:
        stage = "at-risk"
    elif risk_score >= 30:
        stage = "steady"
    else:
        stage = "healthy"

    estimated_window_days = max(1, predicted_delay_days + max(2, req["total"] - req["completed"]))

    return {
        "version": 2,
        "stage": stage,
        "riskScore": risk_score,
        "confidence": confidence,
        "predictedDelayDays": predicted_delay_days,
        "predictedCompletionWindow": f"{estimated_window_days} days",
        "hasSubmission": bool(project.get("submissionUrl") or project.get("submittedAt")),
        "totals": {
            "requirements": req["total"],
            "completedRequirements": req["completed"],
            "inProgressRequirements": req["in_progress"],
            "pendingRequirements": req["pending"],
            "highPriorityRequirements": req["high_priority"],
            "verifiedRequirements": req["verified"],
            "milestones": ms["total"],
            "completedMilestones": ms["completed"],
            "submittedMilestones": ms["submitted"],
        },
        "rates": {
            "requirementCompletionRate": int(round(completion_rate * 100)),
            "pendingRate": int(round(pending_rate * 100)),
            "verificationRate": int(round(verification_rate * 100)),
            "milestoneCompletionRate": int(round(milestone_completion * 100)),
        },
        "topDrivers": build_top_drivers(metadata),
        "recommendedActions": recommended_actions(metadata, risk_score),
        "milestoneReplan": milestone_replan(metadata, risk_score),
        "model": {
            "enabled": model_store.bundle is not None,
            "trainedAt": model_store.bundle.get("trained_at") if model_store.bundle else None,
            "trainingSize": model_store.bundle.get("training_size") if model_store.bundle else 0,
        },
        "generatedAt": utc_now().isoformat(),
    }


class PredictPayload(BaseModel):
    project: Dict[str, Any]


app = FastAPI(title="Freelancer Project Intelligence ML", version="1.0.0")


@app.on_event("startup")
def startup_event() -> None:
    model_store.load()
    if model_store.bundle:
        return

    if AUTO_TRAIN_ON_START:
        try:
            train_model()
        except Exception as exc:
            print(f"ML startup training skipped: {exc}")


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "modelLoaded": model_store.bundle is not None,
        "trainedAt": model_store.bundle.get("trained_at") if model_store.bundle else None,
        "trainingSize": model_store.bundle.get("training_size") if model_store.bundle else 0,
    }


@app.post("/train")
def train_endpoint() -> Dict[str, Any]:
    bundle = train_model()
    return {
        "ok": True,
        "trainedAt": bundle["trained_at"],
        "trainingSize": bundle["training_size"],
    }


@app.post("/predict")
def predict(payload: PredictPayload) -> Dict[str, Any]:
    return predict_intelligence(payload.project)


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=False)
