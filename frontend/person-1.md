# Person 1 — Frontend Lead Plan

## Role

Own the frontend foundation and core user flow for Hephaestus dashboard using Next.js + React + TypeScript + Tailwind.

## Product Goal (Frontend)

Build a fast decision UI that helps users:

1. See fleet risk quickly
2. Investigate one incident deeply
3. Compare intervention outcomes
4. Export a clear report/audit trail

## Screens You Own (Priority Order)

### 1) Fleet Overview (P0)

- Asset risk heatmap (color by failure probability)
- Top at-risk assets list
- Anomaly trend chart by asset class
- Quick metrics cards:
  - assets at risk
  - open incidents
  - projected downtime avoided

### 2) Incident Workbench (P0)

- Incident header (asset, criticality, confidence)
- Root-cause hypothesis panel (confidence + evidence)
- Candidate plan cards (A/B/C):
  - risk reduction
  - estimated cost
  - expected downtime
  - constraints flags
- Constraint form (budget, crew, blackout window)

### 3) Simulation Panel (P1)

- Plan A/B/C risk trajectories over 30 days
- Cost projection comparison
- Downtime forecast comparison
- Uncertainty band toggle

### 4) Report & Audit View (P1)

- Decision timeline
- Agent-by-agent trace viewer
- Download actions (Markdown/PDF placeholder)

## API Integration Contract (initial)

Use backend routes from project context:

- `POST /ingest/batch`
- `POST /risk/analyze`
- `POST /incident/plan`
- `POST /incident/optimize`
- `POST /incident/simulate`
- `GET /incident/{id}/report`
- `GET /health`

Expected common response fields:

- `request_id`
- `status`
- `timestamp`
- `payload`
- `confidence`
- `warnings`

## Frontend Architecture Requirements

- Next.js App Router
- TypeScript strict mode
- Feature folders by screen/domain
- Shared typed API client + schema guards
- Reusable UI primitives (cards, chips, status badges, metric tiles)
- Global state only where needed (incident context + filters)
- Loading/empty/error states on every data surface

## Design Rules

- Confidence and uncertainty must be visible in every major card
- Red/yellow/green risk semantics must be consistent across screens
- Use concise operational language ("blocked by constraint", "human review required")
- Keep one-click drill-down from fleet item to incident workbench

## Definition of Done (Person 1)

- [ ] Base app shell with sidebar/top bar
- [ ] Fleet Overview implemented with mock + real API wiring
- [ ] Incident Workbench implemented with plan cards + constraint form
- [ ] Simulation Panel chart layout implemented
- [ ] Report & Audit View timeline and trace layout implemented
- [ ] Shared typed API client and error handling
- [ ] Responsive layout for 1366px+ and usable tablet view
- [ ] Basic test coverage for core UI states

## Suggested Build Sequence (5 steps)

1. Scaffold routes and shared layout
2. Build typed API layer + mock adapters
3. Implement Fleet Overview and navigation
4. Implement Incident Workbench and optimization action flow
5. Implement Simulation + Report/Audit pages and polish

## Notes

- This project is software-only for MVP (no hardware integration needed).
- Prioritize end-to-end usability over visual complexity.
- Keep all payload handling serializable and trace-friendly.
