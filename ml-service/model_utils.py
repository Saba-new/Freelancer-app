from __future__ import annotations

from datetime import datetime
from math import log10
from typing import Any, Dict, List


FEATURE_NAMES = [
    "budget",
    "project_age_days",
    "requirement_total",
    "requirement_completed",
    "requirement_in_progress",
    "requirement_pending",
    "requirement_high_priority",
    "requirement_verified",
    "milestone_total",
    "milestone_completed",
    "milestone_in_progress",
    "milestone_pending",
    "validation_score",
    "has_submission",
    "has_payment_released",
    "submission_age_days",
    "description_length",
    "milestone_amount_ratio",
]


def _days_between(start: Any, end: datetime | None = None) -> int:
    if not start:
        return 0

    end = end or datetime.utcnow()
    if isinstance(start, str):
        try:
            start = datetime.fromisoformat(start.replace("Z", "+00:00"))
        except ValueError:
            return 0

    if not isinstance(start, datetime):
        return 0

    delta = end - start.replace(tzinfo=None)
    return max(0, int(delta.total_seconds() // 86400))


def extract_features(project: Dict[str, Any]) -> List[float]:
    requirements = project.get("requirements", []) or []
    milestones = project.get("milestones", []) or []

    requirement_total = len(requirements)
    requirement_completed = sum(1 for item in requirements if item.get("status") == "completed")
    requirement_in_progress = sum(1 for item in requirements if item.get("status") == "in-progress")
    requirement_pending = sum(1 for item in requirements if item.get("status") == "pending")
    requirement_high_priority = sum(1 for item in requirements if item.get("priority") == "high")
    requirement_verified = sum(1 for item in requirements if item.get("verified"))

    milestone_total = len(milestones)
    milestone_completed = sum(1 for item in milestones if item.get("status") in {"completed", "paid"})
    milestone_in_progress = sum(1 for item in milestones if item.get("status") == "in-progress")
    milestone_pending = sum(1 for item in milestones if item.get("status") == "pending")

    created_at = project.get("createdAt")
    submitted_at = project.get("submittedAt")

    milestone_amount_total = sum(float(item.get("amount", 0) or 0) for item in milestones)
    budget = float(project.get("budget", 0) or 0)
    milestone_amount_ratio = milestone_amount_total / budget if budget else 0.0

    return [
        float(project.get("budget", 0) or 0),
        float(_days_between(created_at)),
        float(requirement_total),
        float(requirement_completed),
        float(requirement_in_progress),
        float(requirement_pending),
        float(requirement_high_priority),
        float(requirement_verified),
        float(milestone_total),
        float(milestone_completed),
        float(milestone_in_progress),
        float(milestone_pending),
        float(project.get("overallScore", 0) or 0),
        1.0 if project.get("submissionUrl") or submitted_at else 0.0,
        1.0 if project.get("paymentReleased") else 0.0,
        float(_days_between(submitted_at)) if submitted_at else 0.0,
        float(len(project.get("description", "") or "")),
        float(milestone_amount_ratio),
    ]


def derive_risk_hint(project: Dict[str, Any]) -> int:
    requirements = project.get("requirements", []) or []
    milestones = project.get("milestones", []) or []

    total_requirements = len(requirements)
    pending_requirements = sum(1 for item in requirements if item.get("status") == "pending")
    high_priority = sum(1 for item in requirements if item.get("priority") == "high")
    milestone_pending = sum(1 for item in milestones if item.get("status") == "pending")
    age_days = _days_between(project.get("createdAt"))
    score = int(project.get("overallScore", 0) or 0)

    base = 12
    base += min(32, pending_requirements * 6)
    base += min(20, high_priority * 5)
    base += min(18, milestone_pending * 6)
    base += min(20, age_days * 2)
    base += 18 if project.get("status") == "submitted" and score < 70 else 0
    base += 10 if total_requirements >= 8 else 0

    return max(0, min(100, base))
