# hephaestus backend

The backend is the system-control layer for Hephaestus. It exposes APIs, orchestrates agent workflows, applies governance checks, and returns auditable decision packages to the frontend.

## Purpose

The backend does not just serve model predictions. It closes the operational decision loop:

1. Ingest data.
2. Run quality and risk analysis.
3. Generate and optimize intervention plans.
4. Simulate expected impact.
5. Return stakeholder-ready outputs (operator, manager, audit).

## What This Service Owns

- FastAPI request handling and endpoint contracts.
- Request/response normalization with traceable metadata.
- Orchestration entrypoint into the multi-agent pipeline.
- Persistence and retrieval of incidents, plans, simulations, and reports.
- Governance gates (confidence floor, policy validation, human-in-the-loop routing).
- Sync/async split for low-latency APIs versus heavy compute tasks.

## Current Backend Surface

Planned endpoint surface:

- GET /health
- POST /ingest/batch
- POST /risk/analyze
- POST /incident/plan
- POST /incident/optimize
- POST /incident/simulate
- GET /incident/{id}/report

Standard response envelope (for every endpoint):

```json
{
	"request_id": "req-9f30f8",
	"status": "success",
	"timestamp": "2026-04-07T11:25:00Z",
	"payload": {},
	"confidence": 0.87,
	"warnings": []
}
```

## Runtime Architecture

### API path (synchronous)

Use synchronous requests for interactive operations:

- health checks
- recent incident fetch
- light planning calls

### worker path (asynchronous)

Route heavy tasks to workers:

- large batch ingest
- model retraining/inference at fleet scale
- Monte Carlo scenario batches
- report export generation

Recommended queue model: Redis + Celery (or RQ) with idempotent job IDs.

## Scaling Strategy

### stage 1: MVP and demo scale

- Single API instance with one worker pool.
- PostgreSQL primary + Redis.
- Synthetic dataset replay support.

### stage 2: team usage scale

- Stateless API pods behind a load balancer.
- Dedicated queues by workload type:
	- ingest
	- inference
	- simulation
	- reporting
- Connection pooling for PostgreSQL.
- Request-level tracing across API -> agents -> storage.

### stage 3: production multi-site scale

- Horizontal API autoscaling by latency/error SLOs.
- Worker autoscaling by queue depth and job age.
- PostgreSQL partitioning for high-volume telemetry and incident history.
- Read replicas for analytics-heavy dashboards.
- Optional TimescaleDB extension for time-series performance.
- Caching layer for frequently requested incident summaries.

## Product Needs As Development Continues

- API versioning before external integrations (v1, v2 contracts).
- Durable event schema for agent handoffs and audit replay.
- Policy profile versioning for governance decisions.
- Role-aware authorization (operator, planner, manager, auditor).
- Reliability controls:
	- retries with exponential backoff
	- circuit-breaker on low-confidence branches
	- graceful degradation on partial agent failure
- Observability baseline:
	- structured logs with request_id and context_id
	- tracing spans per agent hop
	- metrics for latency, queue depth, confidence, policy violations
- Data connector abstraction for future SCADA/historian ingestion.

## Backend Folder Layout

```text
backend/
	app.py                # FastAPI application entrypoint
	config/               # Runtime settings and environment wiring
	routes/               # HTTP route modules
	storage/              # Persistence adapters and repositories
```

## Naming Convention Policy

- Repository docs/config files should use kebab-case when multi-word naming is needed.
- API route paths use kebab-case segment style only when segments are multi-word.
- Python modules remain snake_case by design to preserve valid imports and tooling compatibility.

## Local Development

```bash
pip install -r ../ml/requirements.txt
uvicorn backend.app:app --reload
```

## Definition Of Backend Done (MVP)

- Endpoints respond with the standard envelope.
- Pipeline request can traverse ingest -> risk -> plan -> optimize -> simulate -> report.
- Each step stores confidence, assumptions, and evidence references.
- Governance can halt low-confidence runs and return actionable warnings.
- Integration test covers one full synthetic incident lifecycle.
