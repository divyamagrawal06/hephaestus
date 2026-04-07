"""
Optimizer Agent (Agent 7)

Responsibilities:
    - Score and rank plans using multi-objective function:
      score = w1 * risk_reduction - w2 * cost - w3 * downtime + w4 * sla_compliance
    - Apply hard constraints: budget ceiling, crew availability,
      spare parts inventory, maintenance blackout windows
    - Weights configurable by policy profiles
    - Eliminate infeasible plans, re-rank remaining
"""
