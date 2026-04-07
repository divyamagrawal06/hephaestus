# Hephaestus — Backend

FastAPI + Pydantic v2 + PostgreSQL + Redis API layer.

## Responsibilities
- REST API endpoints (health, ingest, risk, planning, simulation, reports)
- Database connections and migrations (PostgreSQL)
- Redis cache and async job queue (Celery/RQ)
- Authentication (API key for MVP)
- Response standardization (request_id, status, confidence, warnings)

## Setup
```bash
pip install -r requirements.txt
uvicorn app:app --reload
```
