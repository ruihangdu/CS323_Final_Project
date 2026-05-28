# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Two full-stack training simulators share one API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 26 (installed via Homebrew)
- **Package manager**: pnpm 11.3.0
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
- `POST /api/simulator/command` — run a terminal command (also triggers recovery detection)
- `POST /api/simulator/action` — take an incident action (12 actions)
- `POST /api/simulator/agent` — query the DevOps AI agent (frontend always sends `AgentRequestAgent.DevOps_Agent`)
- `POST /api/simulator/diagnose` — score the submitted hypothesis
- `POST /api/simulator/reset` — reset simulation to initial state
- `POST /api/simulator/scenario` — load a specific scenario
- `POST /api/simulator/recover` — legacy recovery endpoint; frontend no longer calls it (recovery is terminal-driven)

**SimulatorState key fields** (see `state.ts`):
- `scenarioStartedAt: number` — `Date.now()` when scenario was loaded; `0` before selection
- `recoveryCompleted: boolean` — set `true` by `checkRecoveryTrigger()` in `commands.ts`
- `score.recovery` — now named "Speed" in the UI; 2–20 pts based on time-to-recovery

**Scenarios** (`scenarios.ts`): each has `commands`, `diagnosis`, `recoveryOptions` (legacy, unused by frontend), and `recoveryTriggers`:
- `maint_bot` — rogue automation script dropped production DB schema; terminal commands `pg_restore`/`wal replay`/`recovery_target_time` trigger recovery
- `bad_deploy` — v2.48.0 deployed without its required DB migration; commands `v2.47.1`/`rollout undo` trigger recovery
- `memory_siege` — unbounded in-memory cache OOMKilling task-processors; commands `v1.13.2`/`rollout undo deployment/task-processor` trigger recovery
- `config_catastrophe` — **Terraform heredoc** in `payment.tfvars` left leading whitespace in `PAYMENT_GATEWAY_URL`; go-http rejects the malformed URI at transport layer before reaching Stripe. Three recovery paths with different Prevention score impact:
  - `kubectl patch configmap payment-eu` → warning, −1 Prevention (Terraform state drifts)
  - `git revert f2a9d1c` → warning, −2 Prevention (loses 52-line README runbook in same commit)
  - `terraform apply -var 'eu_payment_gateway_url=...'` → good, +2 Prevention (optimal: preserves README)

**Recovery scoring** (`commands.ts → checkRecoveryTrigger`): time-based, measured from `scenarioStartedAt`:
- ≤5 min → 20 pts | ≤10 min → 15 | ≤15 min → 10 | ≤20 min → 5 | >20 min → 2

**UI layout** (`SimulatorPage.tsx`):
- Left col (4/12): `IncidentFeed` — real-time event feed
- Center col (4/12): `CombinedPanel` — tabbed card with "Terminal" and "AI Assistance" tabs
  - **Terminal tab**: `TerminalContent` — bare div, ↑↓ command history, types commands to the `/command` endpoint
  - **AI Assistance tab**: `AIContent` — single pre-seeded chat thread with 8 realistic Q&A exchanges (generic questions → general answers; questions with specific URLs → detailed incident-aware answers). New user questions sent to `DevOps Agent`.
- Right col (4/12): `ActionPanel` + `ScorePanel`
  - `ActionPanel` sections: Containment, Investigation (scenario-specific), **Postmortem** (hypothesis filing), Communication
  - **Recovery section removed** — recovery is terminal-driven; users must type the fix command
  - All action buttons have `title` tooltip explaining what each action does
  - Score category "Recovery" renamed to **"Speed"** in `ScorePanel`
- Header: live `HH:MM:SS` clock ticking from scenario start (via `elapsedSeconds` state + `addSecondsToTime()` helper)

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
- OpenAPI spec is the single source of truth; never edit generated files in `lib/api-client-react/` or `lib/api-zod/` directly — **exception**: `lib/api-zod/src/generated/types/simulatorState.ts` was manually edited to add `scenarioStartedAt: number` because codegen was not run
- Both simulators share the single `api-server` artifact; routes are separated into `routes/simulator/` and `routes/cos-simulator/`
- Agent responses use heuristic tool-calling logic by default; if `OPENAI_API_KEY` is set, real GPT-4o-mini is used
- Warm amber/orange theme for Creator HQ vs cold blue for DevOps simulator — intentional brand differentiation
- Recovery in the incident simulator is **terminal-driven** (no modal picker): `commands.ts → checkRecoveryTrigger()` runs after every command, pattern-matches against `scenario.recoveryTriggers`, and fires a feed event + scores on first match
- The `config_catastrophe` scenario intentionally hides the bug in Terraform heredoc whitespace (not a wrong string value) to test whether learners use `kubectl get configmap -o yaml`, `terraform show -json`, and `git show` together
- Commit `f2a9d1c` in `config_catastrophe` is designed to contain **both** the broken `.tfvars` change AND a 52-line README runbook, making `git revert` suboptimal — the optimal fix is `terraform apply -var` fix-forward

## User Preferences

- Keep both simulators visually distinct (different color schemes)
- Preserve existing DevOps simulator unchanged when adding Creator HQ features
- AI Assistance panel should give generic answers to generic questions, but detailed incident-aware answers when the user includes a specific URL in their question

## Gotchas

- After editing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before touching frontend or backend
- Generated enum names follow schema object names, not body property paths: `CosActionRequestAction` (not `TakeCosActionBodyAction`), `CosAgentRequestAgent` (not `QueryCosAgentBodyAgent`)
- The API server must be rebuilt (`pnpm run build`) after backend route changes before the new routes are live
- `esbuild` darwin-arm64 native binary may need a symlink if the lockfile was generated on linux: `node_modules/@esbuild/darwin-arm64 → ../.pnpm/@esbuild+darwin-arm64@<ver>/node_modules/@esbuild/darwin-arm64`
- `checkRecoveryTrigger` in `commands.ts` fires before `scoreCommandRun` — recovery patterns must not accidentally match investigation commands; all patterns are checked with `.every()` (ALL patterns in a trigger must match)
- The `SEED_MESSAGES` array in `SimulatorPage.tsx` is `config_catastrophe`-specific content — if new scenarios are added, consider either making seed messages scenario-aware or keeping them generic enough to apply to any incident
