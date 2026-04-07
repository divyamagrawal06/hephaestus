"""
Constraints Module

Defines constraint objects and feasibility checkers for intervention plans.
Used by the Optimizer Agent to eliminate infeasible plans before scoring.

Constraint types:
    - Budget ceiling
    - Crew skill availability
    - Spare parts inventory
    - Blackout window (no-work periods)
    - Max concurrent interventions
    - Auto-approval cost limits
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from ml.aegis.data.schemas import InterventionPlan


# ---------------------------------------------------------------------------
# Constraint Data Classes
# ---------------------------------------------------------------------------

@dataclass
class PlanningConstraints:
    """Operational constraints for plan feasibility checks."""

    budget_ceiling: float = 50_000.0
    available_crew: dict[str, int] = field(default_factory=lambda: {
        "mechanical_technician": 3,
        "electrician": 2,
        "vibration_analyst": 1,
        "thermal_engineer": 1,
        "pressure_specialist": 1,
        "process_engineer": 2,
        "motor_specialist": 1,
        "bearing_specialist": 1,
    })
    spare_parts_inventory: list[str] = field(default_factory=lambda: [
        "SKF_bearing_6205", "alignment_shims", "lubricant_kit",
        "high_grade_lubricant", "portable_vibration_sensor",
        "mechanical_seal_kit", "gasket_set", "pressure_test_kit",
        "industrial_sealant", "pressure_gauge",
        "coolant_fluid", "thermal_paste", "heat_exchanger_gasket", "flush_kit",
        "circuit_breaker", "fuse_kit", "motor_winding_kit",
        "general_repair_kit", "minor_repair_kit",
        "calibration_tool", "wiring_harness", "capacitor_bank",
    ])
    blackout_windows: list[tuple[datetime, datetime]] = field(default_factory=list)
    max_concurrent_interventions: int = 5
    auto_approval_cost_limit: float = 10_000.0


@dataclass
class ConstraintViolation:
    """A single constraint violation with human-readable detail."""
    constraint_type: str   # "budget", "crew", "parts", "blackout", "concurrency"
    description: str
    severity: str = "hard"  # "hard" = plan cannot proceed, "soft" = warning only


# ---------------------------------------------------------------------------
# Feasibility Checkers
# ---------------------------------------------------------------------------

def check_budget(
    plan: InterventionPlan,
    constraints: PlanningConstraints,
) -> list[ConstraintViolation]:
    """Check if plan cost is within budget ceiling."""
    violations = []
    if plan.estimated_cost > constraints.budget_ceiling:
        violations.append(ConstraintViolation(
            constraint_type="budget",
            description=(
                f"Estimated cost ${plan.estimated_cost:,.0f} exceeds "
                f"budget ceiling ${constraints.budget_ceiling:,.0f}"
            ),
            severity="hard",
        ))
    elif plan.estimated_cost > constraints.budget_ceiling * 0.8:
        violations.append(ConstraintViolation(
            constraint_type="budget",
            description=(
                f"Estimated cost ${plan.estimated_cost:,.0f} is within 20% "
                f"of budget ceiling ${constraints.budget_ceiling:,.0f}"
            ),
            severity="soft",
        ))
    return violations


def check_crew_availability(
    plan: InterventionPlan,
    constraints: PlanningConstraints,
) -> list[ConstraintViolation]:
    """Check if required crew skills are available."""
    violations = []
    for skill in plan.required_skills:
        available = constraints.available_crew.get(skill, 0)
        if available <= 0:
            violations.append(ConstraintViolation(
                constraint_type="crew",
                description=f"Required skill '{skill}' has 0 available personnel",
                severity="hard",
            ))
    return violations


def check_parts_inventory(
    plan: InterventionPlan,
    constraints: PlanningConstraints,
) -> list[ConstraintViolation]:
    """Check if required spare parts are in inventory."""
    violations = []
    for part in plan.required_parts:
        if part not in constraints.spare_parts_inventory:
            violations.append(ConstraintViolation(
                constraint_type="parts",
                description=f"Required part '{part}' not found in spare parts inventory",
                severity="hard",
            ))
    return violations


def check_blackout_windows(
    plan: InterventionPlan,
    constraints: PlanningConstraints,
    planned_start: datetime | None = None,
) -> list[ConstraintViolation]:
    """Check if the planned maintenance window conflicts with blackout periods."""
    violations = []
    if planned_start is None:
        return violations  # No specific start time, skip check

    planned_end = planned_start  # Simplified — duration check is optional

    for blackout_start, blackout_end in constraints.blackout_windows:
        if planned_start < blackout_end and planned_end > blackout_start:
            violations.append(ConstraintViolation(
                constraint_type="blackout",
                description=(
                    f"Planned start {planned_start} conflicts with "
                    f"blackout window {blackout_start} — {blackout_end}"
                ),
                severity="hard",
            ))
    return violations


def check_auto_approval(
    plan: InterventionPlan,
    constraints: PlanningConstraints,
) -> list[ConstraintViolation]:
    """Check if plan cost exceeds auto-approval limit (soft constraint)."""
    violations = []
    if plan.estimated_cost > constraints.auto_approval_cost_limit:
        violations.append(ConstraintViolation(
            constraint_type="approval",
            description=(
                f"Cost ${plan.estimated_cost:,.0f} exceeds auto-approval "
                f"limit ${constraints.auto_approval_cost_limit:,.0f} — "
                f"requires human sign-off"
            ),
            severity="soft",
        ))
    return violations


# ---------------------------------------------------------------------------
# Aggregate Feasibility Check
# ---------------------------------------------------------------------------

def check_plan_feasibility(
    plan: InterventionPlan,
    constraints: PlanningConstraints,
    planned_start: datetime | None = None,
) -> tuple[bool, list[ConstraintViolation]]:
    """
    Run all constraint checks on a plan.

    Args:
        plan: The intervention plan to evaluate.
        constraints: Current operational constraints.
        planned_start: Optional specific start datetime.

    Returns:
        (is_feasible, list_of_violations)
        is_feasible is False if ANY hard violation exists.
    """
    all_violations: list[ConstraintViolation] = []

    all_violations.extend(check_budget(plan, constraints))
    all_violations.extend(check_crew_availability(plan, constraints))
    all_violations.extend(check_parts_inventory(plan, constraints))
    all_violations.extend(check_blackout_windows(plan, constraints, planned_start))
    all_violations.extend(check_auto_approval(plan, constraints))

    has_hard_violation = any(v.severity == "hard" for v in all_violations)
    is_feasible = not has_hard_violation

    return is_feasible, all_violations


def summarize_violations(violations: list[ConstraintViolation]) -> dict[str, Any]:
    """Summarize violations into a structured dict for agent payloads."""
    hard = [v for v in violations if v.severity == "hard"]
    soft = [v for v in violations if v.severity == "soft"]

    return {
        "total_violations": len(violations),
        "hard_violations": len(hard),
        "soft_violations": len(soft),
        "is_feasible": len(hard) == 0,
        "hard_details": [{"type": v.constraint_type, "description": v.description} for v in hard],
        "soft_details": [{"type": v.constraint_type, "description": v.description} for v in soft],
    }
