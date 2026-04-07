"""
Monte Carlo Simulation Engine

Runs N=1000 stochastic iterations to project risk, cost, and downtime
trajectories over a configurable horizon (default 30 days).

Key modeling decisions:
    - Degradation rate sampled from a distribution (not fixed)
    - Repair effectiveness sampled (e.g., 85-95%, not exactly 90%)
    - "Do nothing" uses baseline degradation rate unmodified
    - Uncertainty bands widen for longer time horizons
    - Fully vectorized with NumPy (no Python loops over iterations)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from ml.aegis.data.schemas import InterventionPlan, SimulationResult


# ---------------------------------------------------------------------------
# Simulation Configuration
# ---------------------------------------------------------------------------

@dataclass
class SimulationConfig:
    """Parameters controlling Monte Carlo simulation."""
    n_iterations: int = 1000
    horizon_days: int = 30
    degradation_noise_std: float = 0.02
    degradation_rate_std: float = 0.01
    repair_effectiveness_std: float = 0.05
    cost_variance_pct: float = 0.15
    downtime_variance_pct: float = 0.20
    random_seed: int | None = 42


# ---------------------------------------------------------------------------
# Core Simulation Function
# ---------------------------------------------------------------------------

def simulate_plan(
    plan: InterventionPlan,
    current_risk: float,
    degradation_rate: float = 0.05,
    config: SimulationConfig | None = None,
) -> SimulationResult:
    """
    Run Monte Carlo simulation for a single plan.

    Args:
        plan: The intervention plan (or a DO_NOTHING plan).
        current_risk: Current failure probability (0-1) for the asset.
        degradation_rate: Daily risk increment rate (mean).
        config: Simulation configuration.

    Returns:
        SimulationResult with daily trajectories and summary statistics.
    """
    if config is None:
        config = SimulationConfig()

    rng = np.random.default_rng(config.random_seed)
    n = config.n_iterations
    h = config.horizon_days

    # --- Sample degradation rates (one per iteration) ---
    deg_rates = rng.normal(degradation_rate, config.degradation_rate_std, size=(n, 1))
    deg_rates = np.clip(deg_rates, 0.005, 0.30)

    # --- Daily noise (uncertainty grows with horizon) ---
    daily_noise = rng.normal(0, config.degradation_noise_std, size=(n, h))

    # --- Build baseline risk trajectory (cumulative degradation) ---
    daily_increments = deg_rates * np.ones((n, h)) + daily_noise
    cumulative_increase = np.cumsum(daily_increments, axis=1)
    base_trajectory = current_risk + cumulative_increase

    # --- Apply intervention effect ---
    is_do_nothing = (
        plan.recommended_action == "DO_NOTHING"
        or plan.predicted_risk_reduction == 0.0
    )

    if is_do_nothing:
        impacted_trajectory = base_trajectory
        cost_samples = np.zeros(n)
        downtime_samples = np.zeros(n)
    else:
        # Determine intervention day based on maintenance window
        window_day_map = {
            "immediate": 1,
            "next_business_day": 2,
            "next_planned_shutdown": 7,
        }
        intervention_day = window_day_map.get(plan.maintenance_window, 3)

        # Sample repair effectiveness per iteration
        repair_eff = rng.normal(
            plan.predicted_risk_reduction,
            config.repair_effectiveness_std,
            size=n,
        )
        repair_eff = np.clip(repair_eff, 0.0, 1.0)

        # Apply risk reduction after intervention day
        impacted_trajectory = base_trajectory.copy()
        for day in range(h):
            if day >= intervention_day:
                # Each iteration gets its own sampled effectiveness
                impacted_trajectory[:, day] *= (1.0 - repair_eff)

        # Sample cost with variance
        cost_std = plan.estimated_cost * config.cost_variance_pct
        cost_samples = rng.normal(plan.estimated_cost, cost_std, size=n)
        cost_samples = np.clip(cost_samples, plan.estimated_cost * 0.5, None)

        # Sample downtime with variance
        dt_std = plan.expected_downtime_minutes * config.downtime_variance_pct
        downtime_samples = rng.normal(plan.expected_downtime_minutes, dt_std, size=n)
        downtime_samples = np.clip(downtime_samples, 0, None)

    # --- Clamp risk to [0, 1] ---
    impacted_trajectory = np.clip(impacted_trajectory, 0.0, 1.0)

    # --- Compute percentiles ---
    mean_risk = np.mean(impacted_trajectory, axis=0).tolist()
    p5_risk = np.percentile(impacted_trajectory, 5, axis=0).tolist()
    p95_risk = np.percentile(impacted_trajectory, 95, axis=0).tolist()

    # --- Probability of failure (risk > 0.90 at any point) ---
    failure_mask = impacted_trajectory > 0.90
    prob_failure = float(np.mean(np.any(failure_mask, axis=1)))

    # --- Cost and downtime statistics ---
    total_expected_cost = float(np.mean(cost_samples))
    expected_downtime = float(np.mean(downtime_samples))

    return SimulationResult(
        plan_id=plan.plan_id,
        daily_risk_mean=mean_risk,
        daily_risk_p5=p5_risk,
        daily_risk_p95=p95_risk,
        total_expected_cost=round(total_expected_cost, 2),
        expected_downtime_minutes=round(expected_downtime, 2),
        probability_of_failure=round(prob_failure, 4),
    )


def simulate_do_nothing(
    asset_id: str,
    current_risk: float,
    degradation_rate: float = 0.05,
    config: SimulationConfig | None = None,
) -> SimulationResult:
    """Convenience wrapper to simulate the do-nothing baseline."""
    do_nothing_plan = InterventionPlan(
        plan_id=f"{asset_id}-DO_NOTHING",
        recommended_action="DO_NOTHING",
        required_parts=[],
        required_skills=[],
        estimated_duration_minutes=0,
        maintenance_window="immediate",
        predicted_risk_reduction=0.0,
        estimated_cost=0.0,
        expected_downtime_minutes=0,
        confidence=1.0,
        assumptions=["Baseline scenario — no intervention"],
        rollback_plan="N/A",
        is_feasible=True,
    )
    return simulate_plan(do_nothing_plan, current_risk, degradation_rate, config)


# ---------------------------------------------------------------------------
# Trajectory Statistics
# ---------------------------------------------------------------------------

def trajectory_summary(sim: SimulationResult) -> dict[str, Any]:
    """Extract key statistics from a simulation result."""
    risk_mean = sim.daily_risk_mean
    risk_p95 = sim.daily_risk_p95

    return {
        "plan_id": sim.plan_id,
        "day_1_risk": round(risk_mean[0], 4) if risk_mean else 0.0,
        "day_7_risk": round(risk_mean[6], 4) if len(risk_mean) > 6 else 0.0,
        "day_14_risk": round(risk_mean[13], 4) if len(risk_mean) > 13 else 0.0,
        "day_30_risk": round(risk_mean[-1], 4) if risk_mean else 0.0,
        "max_risk_p95": round(max(risk_p95), 4) if risk_p95 else 0.0,
        "probability_of_failure": sim.probability_of_failure,
        "total_expected_cost": sim.total_expected_cost,
        "expected_downtime_minutes": sim.expected_downtime_minutes,
        "uncertainty_width_day30": round(
            risk_p95[-1] - sim.daily_risk_p5[-1], 4
        ) if risk_p95 and sim.daily_risk_p5 else 0.0,
    }
