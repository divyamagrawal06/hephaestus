"""
Pydantic v2 schemas for all core data entities and agent contracts.

Entities:
    - AssetMaster:        Physical asset in the fleet
    - TelemetryReading:   One sensor measurement at one point in time
    - EventLog:           Discrete event (alarm, warning, state change)
    - MaintenanceLog:     Past maintenance action performed on an asset
    - FailureGroundTruth: Known failure event (for training and evaluation)
    - AgentOutput:        Standardized communication contract every agent emits
    - InterventionPlan:   Candidate maintenance plan from the Planner Agent
    - PipelineResult:     Aggregated result from a full pipeline run
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AssetType(str, Enum):
    """Supported asset classes in the fleet."""
    PUMP = "pump"
    COMPRESSOR = "compressor"
    TURBINE = "turbine"


class CriticalityTier(int, Enum):
    """Asset criticality: 1 = mission-critical, 4 = low-priority."""
    TIER_1 = 1
    TIER_2 = 2
    TIER_3 = 3
    TIER_4 = 4


class MaintenancePolicy(str, Enum):
    """Current maintenance strategy applied to an asset."""
    REACTIVE = "reactive"
    SCHEDULED = "scheduled"
    CONDITION_BASED = "condition-based"


class QualityFlag(str, Enum):
    """Data quality verdict per sensor reading."""
    OK = "ok"
    SUSPECT = "suspect"
    MISSING = "missing"


class EventType(str, Enum):
    """Types of discrete events."""
    ALARM = "alarm"
    WARNING = "warning"
    SHUTDOWN = "shutdown"
    RESTART = "restart"
    INFO = "info"


class Severity(str, Enum):
    """Event severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ActionType(str, Enum):
    """Types of maintenance actions."""
    BEARING_REPLACEMENT = "bearing_replacement"
    LUBRICATION = "lubrication"
    INSPECTION = "inspection"
    SEAL_REPLACEMENT = "seal_replacement"
    ELECTRICAL_REPAIR = "electrical_repair"
    CALIBRATION = "calibration"
    FULL_OVERHAUL = "full_overhaul"


class MaintenanceOutcome(str, Enum):
    """Result of a maintenance action."""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class FailureMode(str, Enum):
    """Known failure modes for ground-truth labels."""
    BEARING_FAILURE = "bearing_failure"
    SEAL_LEAK = "seal_leak"
    OVERHEATING = "overheating"
    ELECTRICAL_FAULT = "electrical_fault"


class GovernanceVerdict(str, Enum):
    """Governance Agent's final decision."""
    APPROVED = "approved"
    NEEDS_HUMAN_REVIEW = "needs_human_review"
    REJECTED = "rejected"


# ---------------------------------------------------------------------------
# Core Data Entities
# ---------------------------------------------------------------------------

class AssetMaster(BaseModel):
    """Represents one physical asset in the fleet."""

    asset_id: str = Field(..., description="Unique identifier, e.g. PUMP-0042")
    asset_type: AssetType = Field(..., description="Asset classification")
    site_id: str = Field(..., description="Facility / site this asset belongs to")
    installation_date: datetime = Field(..., description="When the asset was installed")
    maintenance_policy: MaintenancePolicy = Field(
        default=MaintenancePolicy.SCHEDULED,
        description="Current maintenance strategy",
    )
    criticality_tier: CriticalityTier = Field(
        default=CriticalityTier.TIER_3,
        description="1 = critical, 4 = low. Tier 1 gets stricter confidence thresholds",
    )

    model_config = {"frozen": False, "str_strip_whitespace": True}


class TelemetryReading(BaseModel):
    """One sensor measurement at one point in time."""

    timestamp: datetime
    asset_id: str
    sensor_name: str = Field(..., description="e.g. vibration_x, temperature, pressure")
    sensor_value: float
    unit: str = Field(..., description="e.g. mm/s, °C, bar")
    quality_flag: QualityFlag = Field(
        default=QualityFlag.OK,
        description="Set by Quality Agent after validation",
    )


class EventLog(BaseModel):
    """A discrete event that happened to an asset (alarm, warning, state change)."""

    event_id: str
    timestamp: datetime
    asset_id: str
    event_type: EventType
    severity: Severity
    event_text: str = Field(default="", description="Free-text event description")


class MaintenanceLog(BaseModel):
    """A past maintenance action performed on an asset."""

    work_order_id: str
    asset_id: str
    timestamp: datetime = Field(..., description="When the maintenance was performed")
    action_type: ActionType
    parts_used: list[str] = Field(default_factory=list)
    duration_minutes: int = Field(..., ge=0)
    cost: float = Field(..., ge=0.0)
    outcome: MaintenanceOutcome


class FailureGroundTruth(BaseModel):
    """Known failure event — used for model training and evaluation."""

    asset_id: str
    failure_time: datetime
    failure_mode: FailureMode
    impact_cost: float = Field(..., ge=0.0, description="Dollar cost of the failure")
    downtime_minutes: int = Field(..., ge=0, description="Downtime caused by the failure")


# ---------------------------------------------------------------------------
# Agent Communication Contract
# ---------------------------------------------------------------------------

class AgentOutput(BaseModel):
    """
    Standardized communication contract every agent must emit.

    This is the backbone of the agent-to-agent handoff protocol.
    The orchestrator collects these into a PipelineResult.
    """

    input_context_id: str = Field(
        ..., description="Trace ID linking to the triggering input / pipeline run",
    )
    agent_name: str = Field(..., description="Name of the agent that produced this output")
    output_payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Agent-specific results (varies per agent)",
    )
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="0.0 = no confidence, 1.0 = full confidence",
    )
    assumptions: list[str] = Field(
        default_factory=list,
        description="What the agent assumed to reach its conclusion",
    )
    evidence_refs: list[str] = Field(
        default_factory=list,
        description="Pointers to data that supports the conclusion",
    )
    errors: list[str] = Field(
        default_factory=list,
        description="Non-fatal issues encountered during execution",
    )
    next_recommended_agent: str | None = Field(
        default=None,
        description="Which agent should run next in the pipeline",
    )
    execution_time_ms: float = Field(
        default=0.0, ge=0.0,
        description="How long this agent took to execute, in milliseconds",
    )

    @field_validator("confidence_score")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        return round(v, 4)


# ---------------------------------------------------------------------------
# Intervention Plan
# ---------------------------------------------------------------------------

class InterventionPlan(BaseModel):
    """A candidate maintenance plan produced by the Planner Agent."""

    plan_id: str
    recommended_action: str = Field(..., description="Human-readable action description")
    required_parts: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    estimated_duration_minutes: int = Field(..., ge=0)
    maintenance_window: str = Field(
        default="any",
        description="When this work can be scheduled, e.g. 'next_business_day', 'immediate'",
    )
    predicted_risk_reduction: float = Field(
        ..., ge=0.0, le=1.0,
        description="Expected reduction in failure probability (0-1)",
    )
    estimated_cost: float = Field(..., ge=0.0)
    expected_downtime_minutes: int = Field(..., ge=0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    assumptions: list[str] = Field(default_factory=list)
    rollback_plan: str = Field(
        default="",
        description="What to do if the intervention fails or causes new issues",
    )
    is_feasible: bool = Field(
        default=True, description="Set to False by Optimizer when constraints are violated",
    )
    infeasibility_reasons: list[str] = Field(
        default_factory=list,
        description="Why this plan was marked infeasible",
    )
    optimizer_score: float | None = Field(
        default=None,
        description="Score assigned by the Optimizer Agent",
    )


# ---------------------------------------------------------------------------
# Pipeline Result
# ---------------------------------------------------------------------------

class PipelineResult(BaseModel):
    """Aggregated result from a full end-to-end pipeline run."""

    pipeline_run_id: str
    started_at: datetime
    completed_at: datetime | None = None
    status: str = Field(default="running", description="running | completed | failed")
    agent_outputs: list[AgentOutput] = Field(default_factory=list)
    final_plans: list[InterventionPlan] = Field(default_factory=list)
    recommended_plan_id: str | None = None
    overall_confidence: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Min confidence across all critical-path agents",
    )
    governance_verdict: GovernanceVerdict | None = None
    warnings: list[str] = Field(default_factory=list)
    total_duration_ms: float = Field(default=0.0, ge=0.0)


# ---------------------------------------------------------------------------
# Simulation Result (used by Simulation Agent)
# ---------------------------------------------------------------------------

class SimulationResult(BaseModel):
    """Output from a single Monte Carlo simulation run for one plan."""

    plan_id: str
    horizon_days: int
    n_iterations: int
    daily_risk_mean: list[float] = Field(
        default_factory=list, description="Mean risk per day",
    )
    daily_risk_p5: list[float] = Field(
        default_factory=list, description="5th percentile risk per day",
    )
    daily_risk_p95: list[float] = Field(
        default_factory=list, description="95th percentile risk per day",
    )
    total_expected_cost: float = Field(default=0.0, ge=0.0)
    total_expected_downtime_hours: float = Field(default=0.0, ge=0.0)
    probability_of_failure: float = Field(
        default=0.0, ge=0.0, le=1.0,
        description="Probability of at least one failure over the horizon",
    )


class ComparisonResult(BaseModel):
    """Side-by-side comparison of multiple simulation scenarios."""

    simulations: list[SimulationResult] = Field(default_factory=list)
    pairwise_win_probabilities: dict[str, dict[str, float]] = Field(
        default_factory=dict,
        description="P(plan_A outperforms plan_B) for each pair",
    )


# ---------------------------------------------------------------------------
# Explainability
# ---------------------------------------------------------------------------

class FeatureContribution(BaseModel):
    """One feature's SHAP contribution to a prediction."""

    feature: str
    shap_value: float
    direction: str = Field(..., description="increases_risk | decreases_risk")


class ExplainabilityResult(BaseModel):
    """SHAP explanation for a single asset's prediction."""

    asset_id: str
    prediction: float
    model_name: str = Field(..., description="anomaly | failure_risk")
    top_contributors: list[FeatureContribution] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Root Cause Hypothesis (produced by Causal Agent)
# ---------------------------------------------------------------------------

class CausalHypothesis(BaseModel):
    """One root-cause hypothesis with supporting evidence."""

    cause: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence_for: list[str] = Field(default_factory=list)
    evidence_against: list[str] = Field(default_factory=list)
    contradiction_notes: str = Field(default="")
