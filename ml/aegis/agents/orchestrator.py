"""
Agent Orchestrator

Manages the directed-graph pipeline of all 10 agents.
Handles:
    - Sequential and conditional agent routing
    - Retry policies with exponential backoff per agent
    - Circuit-breaker behavior for low-confidence inputs
    - Human-in-the-loop escalation on policy violations
    - Trace ID propagation for full audit trails

Agent Communication Contract (each agent emits):
    - input_context_id
    - output_payload
    - confidence_score
    - assumptions
    - evidence_refs
    - errors
    - next_recommended_agent
"""
