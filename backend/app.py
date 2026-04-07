"""
Hephaestus Backend — FastAPI app entry point.

Endpoints:
    GET  /health              — Health and dependency status
    POST /ingest/batch        — Upload telemetry/events/maintenance dataset
    POST /risk/analyze        — Run anomaly + failure risk computation
    POST /incident/plan       — Produce causal explanation + candidate plans
    POST /incident/optimize   — Return ranked intervention plan under constraints
    POST /incident/simulate   — Run what-if and return projected outcomes
    GET  /incident/{id}/report — Return final report in JSON and markdown
"""
