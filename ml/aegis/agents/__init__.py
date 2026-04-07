"""
Agent Orchestrator and 10 specialized agents.

Orchestration: Directed graph with conditional routing, retry policies,
circuit-breaker behavior, and human-in-the-loop fallback.

Agents:
    1. IntakeAgent        — Parse and standardize incoming data
    2. QualityAgent       — Data quality checks, drift detection
    3. SentinelAgent      — Anomaly detection, regime change
    4. PrognosticsAgent   — Failure probability, RUL estimation
    5. CausalAgent        — Root-cause hypothesis graph
    6. PlannerAgent       — Intervention plan generation
    7. OptimizerAgent     — Multi-objective plan ranking
    8. SimulationAgent    — What-if Monte Carlo outcomes
    9. ReporterAgent      — Stakeholder report composition
   10. GovernanceAgent    — Policy checks, confidence gating
"""
