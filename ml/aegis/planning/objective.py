"""
Objective Function Module

Multi-objective scoring function for ranking intervention plans.
Supports configurable policy profiles (cost-sensitive, risk-averse, etc.).

Score = w1*risk_reduction - w2*normalized_cost - w3*normalized_downtime + w4*sla_score

All dimensions normalized to 0-1 before weighting.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ml.aegis.data.schemas import InterventionPlan


# ---------------------------------------------------------------------------
# Policy Weights
# ---------------------------------------------------------------------------

@dataclass
class PolicyWeights:
    """Weights for the multi-objective scoring function."""
    w_risk_reduction: float = 0.40
    w_cost: float = 0.25
    w_downtime: float = 0.20
    w_sla_compliance: float = 0.15

    def validate(self) -> None:
        """Ensure weights sum to 1.0 (within tolerance)."""
        total = self.w_risk_reduction + self.w_cost + self.w_downtime + self.w_sla_compliance
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Policy weights must sum to 1.0, got {total:.4f}")


# Pre-defined policy profiles
POLICY_PROFILES: dict[str, PolicyWeights] = {
    "default": PolicyWeights(0.40, 0.25, 0.20, 0.15),
    "risk_averse": PolicyWeights(0.55, 0.15, 0.15, 0.15),
    "cost_sensitive": PolicyWeights(0.25, 0.45, 0.15, 0.15),
    "uptime_priority": PolicyWeights(0.30, 0.15, 0.40, 0.15),
    "sla_focused": PolicyWeights(0.25, 0.20, 0.20, 0.35),
}


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------

@dataclass
class NormalizationBounds:
    """Reference values for normalizing cost and downtime to 0-1."""
    max_cost: float = 10_000.0
    max_downtime_minutes: float = 480.0  # 8 hours


SLA_SCORE_MAP: dict[str, float] = {
    "immediate": 1.0,
    "next_business_day": 0.7,
    "next_planned_shutdown": 0.4,
}


# ---------------------------------------------------------------------------
# Scoring Functions
# ---------------------------------------------------------------------------

def normalize_cost(cost: float, bounds: NormalizationBounds) -> float:
    """Normalize cost to 0-1 (lower cost = higher score)."""
    return 1.0 - min(cost / bounds.max_cost, 1.0)


def normalize_downtime(downtime_minutes: float, bounds: NormalizationBounds) -> float:
    """Normalize downtime to 0-1 (lower downtime = higher score)."""
    return 1.0 - min(downtime_minutes / bounds.max_downtime_minutes, 1.0)


def normalize_sla(maintenance_window: str) -> float:
    """Map maintenance window urgency to a 0-1 score."""
    return SLA_SCORE_MAP.get(maintenance_window, 0.5)


def score_plan(
    plan: InterventionPlan,
    weights: PolicyWeights | None = None,
    bounds: NormalizationBounds | None = None,
) -> float:
    """
    Score a plan using a multi-objective weighted function.
    Higher score = better plan. Returns value in 0-1 range.

    Args:
        plan: The intervention plan to score.
        weights: Policy weights. Defaults to balanced profile.
        bounds: Normalization reference values.

    Returns:
        Scalar score between 0.0 and 1.0.
    """
    if weights is None:
        weights = POLICY_PROFILES["default"]
    if bounds is None:
        bounds = NormalizationBounds()

    risk_score = plan.predicted_risk_reduction  # Already 0-1
    cost_score = normalize_cost(plan.estimated_cost, bounds)
    downtime_score = normalize_downtime(plan.expected_downtime_minutes, bounds)
    sla_score = normalize_sla(plan.maintenance_window)

    total = (
        weights.w_risk_reduction * risk_score
        + weights.w_cost * cost_score
        + weights.w_downtime * downtime_score
        + weights.w_sla_compliance * sla_score
    )

    return round(max(0.0, min(1.0, total)), 4)


def score_plan_detailed(
    plan: InterventionPlan,
    weights: PolicyWeights | None = None,
    bounds: NormalizationBounds | None = None,
) -> dict[str, Any]:
    """
    Score a plan and return the full breakdown of each dimension.

    Returns:
        {
            "total_score": 0.72,
            "dimensions": {
                "risk_reduction": {"raw": 0.90, "normalized": 0.90, "weighted": 0.36},
                "cost": {"raw": 2200.0, "normalized": 0.78, "weighted": 0.195},
                ...
            },
            "weights_used": {...},
            "policy_profile": "default"
        }
    """
    if weights is None:
        weights = POLICY_PROFILES["default"]
    if bounds is None:
        bounds = NormalizationBounds()

    risk_norm = plan.predicted_risk_reduction
    cost_norm = normalize_cost(plan.estimated_cost, bounds)
    downtime_norm = normalize_downtime(plan.expected_downtime_minutes, bounds)
    sla_norm = normalize_sla(plan.maintenance_window)

    total = (
        weights.w_risk_reduction * risk_norm
        + weights.w_cost * cost_norm
        + weights.w_downtime * downtime_norm
        + weights.w_sla_compliance * sla_norm
    )
    total = round(max(0.0, min(1.0, total)), 4)

    # Identify which profile matches
    profile_name = "custom"
    for name, profile in POLICY_PROFILES.items():
        if (
            profile.w_risk_reduction == weights.w_risk_reduction
            and profile.w_cost == weights.w_cost
            and profile.w_downtime == weights.w_downtime
            and profile.w_sla_compliance == weights.w_sla_compliance
        ):
            profile_name = name
            break

    return {
        "total_score": total,
        "dimensions": {
            "risk_reduction": {
                "raw": plan.predicted_risk_reduction,
                "normalized": round(risk_norm, 4),
                "weight": weights.w_risk_reduction,
                "weighted": round(weights.w_risk_reduction * risk_norm, 4),
            },
            "cost": {
                "raw": plan.estimated_cost,
                "normalized": round(cost_norm, 4),
                "weight": weights.w_cost,
                "weighted": round(weights.w_cost * cost_norm, 4),
            },
            "downtime": {
                "raw": plan.expected_downtime_minutes,
                "normalized": round(downtime_norm, 4),
                "weight": weights.w_downtime,
                "weighted": round(weights.w_downtime * downtime_norm, 4),
            },
            "sla_compliance": {
                "raw": plan.maintenance_window,
                "normalized": round(sla_norm, 4),
                "weight": weights.w_sla_compliance,
                "weighted": round(weights.w_sla_compliance * sla_norm, 4),
            },
        },
        "weights_used": {
            "risk_reduction": weights.w_risk_reduction,
            "cost": weights.w_cost,
            "downtime": weights.w_downtime,
            "sla_compliance": weights.w_sla_compliance,
        },
        "policy_profile": profile_name,
    }


def rank_plans(
    plans: list[InterventionPlan],
    weights: PolicyWeights | None = None,
    bounds: NormalizationBounds | None = None,
) -> list[tuple[InterventionPlan, float]]:
    """
    Score and rank a list of plans. Returns plans sorted by score descending.

    Returns:
        List of (plan, score) tuples, highest first.
    """
    scored = [(plan, score_plan(plan, weights, bounds)) for plan in plans]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored
