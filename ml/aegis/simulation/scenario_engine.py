"""
Scenario Comparison Engine

Simulates all candidate plans + a "do nothing" baseline, then produces
side-by-side comparisons with pairwise outperformance probabilities.

Output is structured for the frontend Simulation Panel charts.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from ml.aegis.data.schemas import ComparisonResult, InterventionPlan, SimulationResult
from ml.aegis.simulation.monte_carlo import (
    SimulationConfig,
    simulate_do_nothing,
    simulate_plan,
    trajectory_summary,
)


# ---------------------------------------------------------------------------
# Pairwise comparison
# ---------------------------------------------------------------------------

def compute_pairwise_outperformance(
    sim_a: SimulationResult,
    sim_b: SimulationResult,
) -> float:
    """
    Compute probability that Plan A outperforms Plan B.

    Uses the day-30 risk as the comparison metric.
    If Plan A's 30-day risk is lower than Plan B's in X% of the
    trajectory samples, then P(A > B) = X%.

    Since we only store percentiles (not raw samples), we approximate
    using a normal distribution fitted to (mean, p5, p95).

    Returns:
        Float 0-1: probability Plan A is better (lower risk) than Plan B.
    """
    if not sim_a.daily_risk_mean or not sim_b.daily_risk_mean:
        return 0.5

    # Use day-30 values
    mean_a = sim_a.daily_risk_mean[-1]
    mean_b = sim_b.daily_risk_mean[-1]

    # Estimate std from percentile bands
    # p95 - p5 ≈ 3.29 * std for normal distribution
    p95_a = sim_a.daily_risk_p95[-1] if sim_a.daily_risk_p95 else mean_a
    p5_a = sim_a.daily_risk_p5[-1] if sim_a.daily_risk_p5 else mean_a
    std_a = max((p95_a - p5_a) / 3.29, 1e-6)

    p95_b = sim_b.daily_risk_p95[-1] if sim_b.daily_risk_p95 else mean_b
    p5_b = sim_b.daily_risk_p5[-1] if sim_b.daily_risk_p5 else mean_b
    std_b = max((p95_b - p5_b) / 3.29, 1e-6)

    # P(A < B) where A and B are normal: use difference distribution
    # Diff = B - A ~ Normal(mean_b - mean_a, sqrt(std_a^2 + std_b^2))
    diff_mean = mean_b - mean_a
    diff_std = np.sqrt(std_a ** 2 + std_b ** 2)

    from scipy.stats import norm
    prob_a_better = float(norm.cdf(0, loc=-diff_mean, scale=diff_std))

    return round(prob_a_better, 4)


# ---------------------------------------------------------------------------
# Compare Plans
# ---------------------------------------------------------------------------

def compare_plans(
    plans: list[InterventionPlan],
    current_risk: float,
    degradation_rate: float = 0.05,
    asset_id: str = "ASSET",
    include_do_nothing: bool = True,
    config: SimulationConfig | None = None,
) -> ComparisonResult:
    """
    Simulate all plans (+ optional do-nothing baseline) and return
    comparative results.

    Args:
        plans: List of feasible intervention plans.
        current_risk: Current failure probability for the asset.
        degradation_rate: Daily degradation rate.
        asset_id: Asset identifier.
        include_do_nothing: Whether to include baseline scenario.
        config: Simulation config.

    Returns:
        ComparisonResult with baseline, plan trajectories, and impact summary.
    """
    if config is None:
        config = SimulationConfig()

    # 1. Simulate baseline
    if include_do_nothing:
        baseline = simulate_do_nothing(asset_id, current_risk, degradation_rate, config)
    else:
        baseline = SimulationResult(
            plan_id=f"{asset_id}-NO_BASELINE",
            daily_risk_mean=[current_risk] * config.horizon_days,
            daily_risk_p5=[current_risk] * config.horizon_days,
            daily_risk_p95=[current_risk] * config.horizon_days,
            total_expected_cost=0.0,
            expected_downtime_minutes=0.0,
            probability_of_failure=0.0,
        )

    # 2. Simulate each plan
    plan_sims: list[SimulationResult] = []
    for plan in plans:
        sim = simulate_plan(plan, current_risk, degradation_rate, config)
        plan_sims.append(sim)

    # 3. Find the best plan (lowest day-30 risk)
    best_plan_id = baseline.plan_id
    best_day30_risk = baseline.daily_risk_mean[-1] if baseline.daily_risk_mean else 1.0

    for sim in plan_sims:
        day30 = sim.daily_risk_mean[-1] if sim.daily_risk_mean else 1.0
        if day30 < best_day30_risk:
            best_day30_risk = day30
            best_plan_id = sim.plan_id

    # 4. Compute impact summary (best plan vs do-nothing)
    best_sim = next((s for s in plan_sims if s.plan_id == best_plan_id), baseline)

    baseline_failure_prob = baseline.probability_of_failure
    best_failure_prob = best_sim.probability_of_failure

    baseline_day30 = baseline.daily_risk_mean[-1] if baseline.daily_risk_mean else 0.0
    best_day30 = best_sim.daily_risk_mean[-1] if best_sim.daily_risk_mean else 0.0

    impact_summary = {
        "risk_reduction_day30": round(baseline_day30 - best_day30, 4),
        "failure_prob_reduction": round(baseline_failure_prob - best_failure_prob, 4),
        "intervention_cost": best_sim.total_expected_cost,
        "intervention_downtime_minutes": best_sim.expected_downtime_minutes,
        "cost_saved": 0.0,  # Populated by impact_estimator
        "downtime_avoided_hours": 0.0,  # Populated by impact_estimator
    }

    return ComparisonResult(
        asset_id=asset_id,
        baseline_trajectory=baseline,
        plan_trajectories=plan_sims,
        best_plan_id=best_plan_id,
        impact_summary=impact_summary,
    )


def compute_all_pairwise(
    comparison: ComparisonResult,
) -> list[dict[str, Any]]:
    """
    Compute pairwise outperformance probabilities for all plan combinations.

    Returns:
        List of dicts:
        [
            {"plan_a": "...", "plan_b": "...", "prob_a_better": 0.82},
            ...
        ]
    """
    all_sims = [comparison.baseline_trajectory] + comparison.plan_trajectories
    results: list[dict[str, Any]] = []

    for i, sim_a in enumerate(all_sims):
        for j, sim_b in enumerate(all_sims):
            if i >= j:
                continue
            prob = compute_pairwise_outperformance(sim_a, sim_b)
            results.append({
                "plan_a": sim_a.plan_id,
                "plan_b": sim_b.plan_id,
                "prob_a_better": prob,
                "prob_b_better": round(1.0 - prob, 4),
            })

    return results


def format_for_frontend(comparison: ComparisonResult) -> dict[str, Any]:
    """
    Format comparison results into a structure the frontend Simulation
    Panel can directly chart.

    Returns:
        {
            "asset_id": str,
            "horizon_days": int,
            "scenarios": [
                {
                    "plan_id": str,
                    "label": str,
                    "is_baseline": bool,
                    "risk_mean": [...],
                    "risk_p5": [...],
                    "risk_p95": [...],
                    "summary": {...}
                }
            ],
            "best_plan_id": str,
            "impact": {...},
            "pairwise": [...]
        }
    """
    scenarios = []

    # Baseline
    bl = comparison.baseline_trajectory
    scenarios.append({
        "plan_id": bl.plan_id,
        "label": "Do Nothing",
        "is_baseline": True,
        "risk_mean": bl.daily_risk_mean,
        "risk_p5": bl.daily_risk_p5,
        "risk_p95": bl.daily_risk_p95,
        "summary": trajectory_summary(bl),
    })

    # Plans
    for sim in comparison.plan_trajectories:
        label = sim.plan_id.split("-")[-1] if "-" in sim.plan_id else sim.plan_id
        scenarios.append({
            "plan_id": sim.plan_id,
            "label": label,
            "is_baseline": False,
            "risk_mean": sim.daily_risk_mean,
            "risk_p5": sim.daily_risk_p5,
            "risk_p95": sim.daily_risk_p95,
            "summary": trajectory_summary(sim),
        })

    pairwise = compute_all_pairwise(comparison)

    return {
        "asset_id": comparison.asset_id,
        "horizon_days": len(bl.daily_risk_mean) if bl.daily_risk_mean else 30,
        "scenarios": scenarios,
        "best_plan_id": comparison.best_plan_id,
        "impact": comparison.impact_summary,
        "pairwise": pairwise,
    }
