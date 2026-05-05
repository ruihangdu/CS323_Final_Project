# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

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

## Incident Simulator

A full-stack training platform at `/` (artifact: `incident-simulator`, API: `api-server`).

**API contract**: All simulator endpoints are mounted under `/api/simulator/`:
- `GET  /api/simulator/state` — current simulation state
- `POST /api/simulator/command` — run a terminal command
- `POST /api/simulator/action` — take an incident action (12 actions)
- `POST /api/simulator/agent` — query an AI agent (DevOps/Database/Communications/Skeptic)
- `POST /api/simulator/reset` — reset simulation to initial state

The `/simulator/` prefix is intentional and consistent across the OpenAPI spec
(`lib/api-spec/openapi.yaml`, server base `/api` + paths `/simulator/*`), the Express
router (`artifacts/api-server/src/routes/simulator/index.ts`), and the generated
React Query client (`lib/api-client-react/src/generated/api.ts`).

State is purely in-memory (no DB); resets on server restart. Scoring logic lives in
`artifacts/api-server/src/routes/simulator/actions.ts`.
