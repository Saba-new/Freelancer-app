from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np
from dotenv import load_dotenv
from pymongo import MongoClient
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from model_utils import FEATURE_NAMES, extract_features


ROOT = Path(__file__).resolve().parent
ARTIFACT_PATH = ROOT / "project_intelligence_model.joblib"
META_PATH = ROOT / "project_intelligence_meta.json"


def _load_environment() -> None:
    backend_env = ROOT.parent / "Backend" / ".env"
    local_env = ROOT / ".env"

    if backend_env.exists():
        load_dotenv(backend_env)
    if local_env.exists():
        load_dotenv(local_env, override=False)


def _get_projects_collection():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set")

    client = MongoClient(mongo_uri)
    db_name = os.getenv("MONGO_DB_NAME", "freelancer_app")
    return client[db_name]["projects"], client


def _load_training_rows() -> List[Dict[str, Any]]:
    collection, client = _get_projects_collection()
    try:
        rows = list(
            collection.find(
                {},
                {
                    "title": 1,
                    "budget": 1,
                    "status": 1,
                    "requirements": 1,
                    "milestones": 1,
                    "description": 1,
                    "submissionUrl": 1,
                    "paymentReleased": 1,
                    "overallScore": 1,
                    "createdAt": 1,
                    "submittedAt": 1,
                },
            )
        )
    finally:
        client.close()

    return rows


def train_model() -> Dict[str, Any]:
    _load_environment()

    rows = _load_training_rows()
    if len(rows) < 5:
        raise RuntimeError("Not enough project history to train the ML model")

    features = [extract_features(row) for row in rows]
    X = np.asarray(features, dtype=float)

    pipeline = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "model",
                IsolationForest(
                    n_estimators=250,
                    contamination=0.18,
                    random_state=42,
                ),
            ),
        ]
    )
    pipeline.fit(X)

    anomaly_scores = (-pipeline.decision_function(X)).astype(float)
    score_low = float(np.percentile(anomaly_scores, 10))
    score_high = float(np.percentile(anomaly_scores, 90))

    artifact = {
        "pipeline": pipeline,
        "featureNames": FEATURE_NAMES,
        "scoreLow": score_low,
        "scoreHigh": score_high,
        "sampleCount": len(rows),
        "trainedAt": np.datetime64("now").astype(str),
    }

    joblib.dump(artifact, ARTIFACT_PATH)

    meta = {
        "sampleCount": len(rows),
        "scoreLow": score_low,
        "scoreHigh": score_high,
        "trainedAt": artifact["trainedAt"],
        "featureNames": FEATURE_NAMES,
    }
    META_PATH.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    return meta


def main() -> None:
    meta = train_model()
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()