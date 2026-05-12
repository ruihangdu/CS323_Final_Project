# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Two full-stack training simulators share one API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Where Things Live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (don't edit)
- `lib/api-zod/src/generated/` — generated Zod body schemas (don't edit)
- `artifacts/api-server/src/routes/` — Express route handlers (simulator/ + cos-simulator/)
- `artifacts/incident-simulator/src/` — DevOps simulator frontend (React+Vite)
- `artifacts/cos-simulator/src/` — Creator HQ simulator frontend (React+Vite)

## Incident Simulator (DevOps)

Training platform at `/` (artifact: `incident-simulator`).

**API contract**: All endpoints mounted under `/api/simulator/`:
- `GET  /api/simulator/state` — current simulation state
- `POST /api/simulator/command` — run a terminal command
- `POST /api/simulator/action` — take an incident action (12 actions)
- `POST /api/simulator/agent` — query an AI agent (DevOps/Database/Communications/Skeptic)
- `POST /api/simulator/reset` — reset simulation to initial state

## Creator HQ Simulator

Training platform at `/cos-simulator/` (artifact: `cos-simulator`).

**Scenario**: "The Viral Spiral" — a 6-month-old stream clip goes viral.
**Key gotcha**: Issuing an apology (`ISSUE_APOLOGY_IMMEDIATELY`) before reviewing the clip archive (`PULL_CLIP_ARCHIVE` action or `cat /archive/stream-clip-context.txt` terminal command) sets `statementIssuedBeforeContextChecked=true` and applies score penalties. The clip shows the creator was being sarcastic — apologizing validates a false narrative.

**API contract**: All endpoints mounted under `/api/cos-simulator/`:
- `GET  /api/cos-simulator/state` — current simulation state
- `POST /api/cos-simulator/command` — run a terminal command (11 commands)
- `POST /api/cos-simulator/action` — take an action (10 actions)
- `POST /api/cos-simulator/agent` — query an AI advisor (PR Strategist/Brand Manager/Legal Counsel/Devil's Advocate)
- `POST /api/cos-simulator/reset` — reset simulation

**Score categories**: investigation(20), crisisContainment(20), stakeholderManagement(20), creatorSupport(20), communication(10), prevention(10)

State is purely in-memory. Scoring logic: `artifacts/api-server/src/routes/cos-simulator/actions.ts`.

## Architecture Decisions

- All API state is in-memory (no DB) for both simulators — simplifies resets, acceptable for training scenarios
- OpenAPI spec is the single source of truth; never edit generated files in `lib/api-client-react/` or `lib/api-zod/` directly
- Both simulators share the single `api-server` artifact; routes are separated into `routes/simulator/` and `routes/cos-simulator/`
- Agent responses use heuristic tool-calling logic by default; if `OPENAI_API_KEY` is set, real GPT-4o-mini is used
- Warm amber/orange theme for Creator HQ vs cold blue for DevOps simulator — intentional brand differentiation

## User Preferences

- Keep both simulators visually distinct (different color schemes)
- Preserve existing DevOps simulator unchanged when adding Creator HQ features

## Gotchas

- After editing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before touching frontend or backend
- Generated enum names follow schema object names, not body property paths: `CosActionRequestAction` (not `TakeCosActionBodyAction`), `CosAgentRequestAgent` (not `QueryCosAgentBodyAgent`)
- The API server must be rebuilt (`pnpm run build`) after backend route changes before the new routes are live
