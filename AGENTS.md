# AGENTS.md

Guidance for AI coding agents working in this repository. Read this first before making changes.

---

## What this project is

**Arena** — a two-sided job-skills simulation platform built on the flight-simulator metaphor for knowledge work. Employers define what good judgment looks like for a role and generate scenario-based challenges. Candidates follow a shareable challenge link, run the simulation, and get a scored debrief.

Originally a Stanford CS323 final project (two browser-based training simulators sharing one API server). The `ray-edit` branch turned the codebase into the **Arena demo**: a believable end-to-end employer-to-candidate flow built for a 10-minute live demo.

**Two simulators live in this monorepo**, but the active product surface is the **Incident Simulator** (`artifacts/incident-simulator/`). The Creator HQ simulator (`artifacts/cos-simulator/`) is dormant — keep it working but don't extend it without explicit instruction.

---

## Stack & tooling

- **Monorepo**: pnpm workspaces (pnpm 9.15.9, enforced via `corepack`)
- **Node**: v22+ (Render uses 22; local Homebrew v20+ works)
- **TypeScript**: 5.9
- **Frontend**: React + Vite, Wouter (routing — **not** react-router), shadcn/ui, Tailwind, framer-motion, lucide-react
- **Backend**: Express 5
- **API codegen**: Orval reads `lib/api-spec/openapi.yaml` → generates React Query hooks in `lib/api-client-react/src/generated/` and Zod schemas in `lib/api-zod/src/generated/`. **Never hand-edit generated files.**
- **State**: All API state is in-memory (no DB). `sessionStorage` is the maximum persistence used on the client.
- **Deployment**: Render (config in `render.yaml`)

---

## Repository layout

```
Asset-Manager/
├── artifacts/
│   ├── api-server/                 # Express 5 backend — shared by both simulators
│   │   └── src/routes/
│   │       ├── simulator/          # Incident simulator routes + state
│   │       └── cos-simulator/      # Creator HQ routes + state (dormant)
│   ├── incident-simulator/         # ← Active product surface (React + Vite)
│   │   └── src/
│   │       ├── pages/              # Route components
│   │       ├── lib/
│   │       │   ├── challenge.ts    # Base64 encode/decode of ChallengePayload
│   │       │   └── scenarios.ts    # SCENARIO_META + PENDING_SCENARIO_KEY
│   │       └── App.tsx             # Wouter route table
│   └── cos-simulator/              # Creator HQ frontend (dormant)
├── lib/
│   ├── api-spec/                   # OpenAPI spec — single source of truth
│   ├── api-client-react/           # Generated React Query hooks (do not edit)
│   ├── api-zod/                    # Generated Zod schemas (do not edit)
│   └── db/                         # Drizzle schema (unused by simulators)
├── render.yaml                     # Render deployment config
├── replit.md                       # Pre-Arena dev reference (still useful for backend internals)
├── ROADMAP.md                      # Product roadmap (demo / MVP / post-MVP phases)
├── DEMO_SCRIPT.md                  # Canned content for the 10-min demo
└── AGENTS.md                       # This file
```

---

## Routes (incident-simulator)

| Route | Component | Purpose |
|---|---|---|
| `/` | `LandingPage` | Employer / candidate fork (two cards) |
| `/landing` | `LandingPage` | Alias of `/` |
| `/employer` | `EmployerOnboardingPage` | 3-step wizard (role → context → skills) |
| `/employer/constellation` | `ConstellationPage` | Skill constellation + scenario picker |
| `/employer/canvas` | `EmployerCanvasPage` | Canvas: sidebar + Overview/Live Preview tabs + Publish/Get Link |
| `/challenge?d=...` | `ChallengePage` | Candidate orientation (decodes base64 payload) |
| `/sim` | `SimulatorPage` | The actual incident simulator |
| `/setup` | `SetupPage` | Legacy launcher (kept working, not part of demo flow) |
| `/custom` | `CustomSimulatorPage` | AI-generated scenario launcher (legacy) |

---

## The Arena demo flow

This is the canonical user journey. Preserve it.

**Employer half (~6 min):**
1. `/` → click **"Create a challenge"**
2. `/employer` step 1: Role pre-selected as **Site Reliability Engineer** (only option). Company = "Acme Corp"
3. Step 2: Paste context blurb (see `DEMO_SCRIPT.md`)
4. Step 3: Skills are **AI-extracted** (1.5s skeleton animation, then pre-filled chips). Free-text input for "Add a skill we missed". Demo doesn't add any.
5. `/employer/constellation` → click **"Generate Arena"** → loading overlay → scenario picker with **Wrong Address** (`config_catastrophe`) as recommended → click **"Review Arena"**
6. `/employer/canvas`: 3s loading → Overview tab shows the Wrong Address scenario. Flip to **Live Preview** (iframe of `/sim`, proportionally scaled). Click **Publish** (draft → published). Click **Get Challenge Link** → copies base64 URL to clipboard.

**Candidate half (~4 min):**
7. Paste challenge link into browser → `/challenge?d=...`
8. Orientation screen (company, role, ~20 min, assessed skills)
9. **Start challenge** → `/sim` → `ScenarioPickerModal` auto-selects `config_catastrophe` from `sessionStorage[PENDING_SCENARIO_KEY]` and never shows the picker UI
10. Run the simulation → debrief modal

---

## Key files & their contracts

### `artifacts/incident-simulator/src/App.tsx`
Wouter route table. `"/"` → `LandingPage` (not `EmployerOnboardingPage`).

### `artifacts/incident-simulator/src/lib/challenge.ts`
`ChallengePayload` type, `encodeChallenge`, `decodeChallenge`, `buildChallengeUrl`. The challenge link is self-contained — no backend lookup.

```ts
type ChallengePayload = {
  v: 1;
  roleTitle: string;
  company: string;
  skills: string[];
  scenarioId: string;
  generatedAt: string;
};
```

### `artifacts/incident-simulator/src/lib/scenarios.ts`
Exports `SCENARIO_META` (shared between `ConstellationPage` picker and `SimulatorPage` header) and `PENDING_SCENARIO_KEY` — the sessionStorage key used to hand off a pre-selected scenario from canvas/challenge into the simulator.

### `EmployerOnboardingPage.tsx`
- `ROLE_PRESETS` is **SRE-only** for the demo (`site_reliability_engineer`). Don't add other roles back without instruction.
- Initial state defaults to SRE.
- Skills step uses a 1.5s extraction animation, pre-fills 5 suggested skills, and offers a free-form "Add a skill we missed" input.
- On step 1 → 2 transition, `goNext` pre-populates `skills` with the preset's first 5 suggestions.

### `ConstellationPage.tsx`
- Phase state machine: `"idle" | "loading" | "picking"`.
- Generate button transitions `idle → loading` (1.5s) → `picking`.
- Recommended scenario is **hardcoded** to `config_catastrophe` (Wrong Address).
- Footer button reads **"Review Arena"** (not "Launch Arena") and navigates to `/employer/canvas`. The `PENDING_SCENARIO_KEY` is written to `sessionStorage` before navigation.

### `EmployerCanvasPage.tsx`
- 3s fake loading overlay on mount.
- Top bar: **Draft** pill (when not published) → **Publish** button → **Get Challenge Link** (gated behind publish — nudges with toast if clicked early).
- Left sidebar (`LeftSidebar`): read-only "Refine" panel showing role/context/skills. Disabled chips/textarea/button use `cursor: default` (not `not-allowed` — that renders as the ⊘ cancel icon on macOS).
- Right panel: tabbed **Overview** / **Live Preview**.
- `LivePreviewTab` scales an iframe of `/sim?company=Acme+Corp&brand=dev` proportionally to its container using `ResizeObserver` + `transform: scale()` (design width = 1280px). The iframe is inflated by `1/scale` so internal layout renders at full resolution, then visually shrunk.
- Live preview uses the natural amber theme — do **not** pass `color`/`fg` URL params that override `--primary`.

### `ChallengePage.tsx`
- Decodes `?d=...` base64 → `ChallengePayload` → orientation screen.
- Navigation URL: `/sim?company=${company}&brand=dev` (no color override — keeps amber theme consistent with canvas live preview).

### `SimulatorPage.tsx`
- Header clock starts at `00:00:00` (does **not** inherit scenario's in-world time of 09:15). The display uses `addSecondsToTime("00:00", elapsedSeconds)`.
- **Configure** and **Chief of Staff Role** buttons are removed from the top-right header — candidates can't switch scenarios.
- `ActionBtn` label uses `<span className="truncate">` with shrink-0 icon so long labels don't overflow.
- `useBranding()` destructure: `{ companyName, companySlug, brand }` — `cosUrl` is intentionally not destructured (button is gone).
- **Reset behavior**: `handleReset` writes `PENDING_SCENARIO_KEY = "config_catastrophe"` to sessionStorage *before* calling the reset mutation, so the picker auto-selects without showing the multi-choice UI.
- **`ScenarioPickerModal` has `key={sessionKey}`** so it remounts on every reset — this resets the internal `autoSelecting` state flag, otherwise the second auto-select silently no-ops.
- **`hasPendingScenario` check** inside the modal reads sessionStorage synchronously during render and returns `null` immediately if a pending key exists — prevents a one-frame flash of the picker before `useEffect` fires.

---

## Critical conventions (read before editing)

### Routing
- Use `wouter` only — `useLocation()` returns `[pathname, navigate]`. No `<Link>` from react-router, no react-router-dom imports.

### Theming
- The simulator uses CSS custom property `--primary` for the brand accent (default: amber, `hsl(35 100% 50%)`).
- `useBranding()` in `SimulatorPage` overrides `--primary` via URL params (`?color=...`). For the Arena demo we always want amber, so **don't pass `color`/`fg`** when navigating to `/sim`.

### Scenario handoff between pages
- The pattern is: source page writes `sessionStorage.setItem(PENDING_SCENARIO_KEY, scenarioId)`, then navigates. `ScenarioPickerModal` in `SimulatorPage` reads the key on mount, auto-selects, removes the key.
- Always use the exported `PENDING_SCENARIO_KEY` from `@/lib/scenarios` — don't hardcode the string.

### React effects gotcha
- Effects run *after* paint. If you have a modal that should hide based on sessionStorage state on mount, you'll see a one-frame flash unless you also check synchronously during render. See `hasPendingScenario` in `ScenarioPickerModal` for the pattern.

### Disabled UI elements
- Use `cursor: "default"` (not `"not-allowed"`) on disabled decorative buttons. macOS renders `not-allowed` as a ⊘ circle-slash icon which reads as a "cancel" icon and looks broken.

### API codegen
- Single source of truth: `lib/api-spec/openapi.yaml`. After editing it, run `pnpm --filter @workspace/api-spec run codegen` before touching frontend or backend.
- Generated enum naming follows schema object names: `CosActionRequestAction` (not `TakeCosActionBodyAction`).
- Exception: `lib/api-zod/src/generated/types/simulatorState.ts` was manually edited to add `scenarioStartedAt: number` because codegen wasn't re-run. If you regenerate, re-apply.

### API server rebuilds
- The API server's `dev` script is `build && start` — no hot reload. Kill and restart after backend changes.

---

## Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Build everything
pnpm run build

# Regenerate API hooks/schemas after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Local dev — three terminals
PORT=3000 pnpm --filter @workspace/api-server run dev
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/incident-simulator run dev
PORT=5174 BASE_PATH=/cos-simulator/ pnpm --filter @workspace/cos-simulator run dev

# Or, all-in-one from the root
pnpm run dev
```

---

## Deployment (Render)

Config lives in `render.yaml`. Key facts:

- **Single web service** named `arena` runs the API server, which also serves the built frontend bundles.
- **`NODE_ENV=development` is set on the install step** (`NODE_ENV=development pnpm install --frozen-lockfile`) because pnpm skips devDependencies under `NODE_ENV=production`, and `vite` is a devDependency. Don't move `NODE_ENV=production` back to the global `envVars` — the build will fail with `command not found: vite`.
- `NODE_ENV=production` is set inline on the `startCommand` instead.
- Connect the repo via **"New → Blueprint"** in Render so `render.yaml` is auto-read; otherwise paste the build/start commands manually.

---

## Scenario internals (for reference when editing the simulator)

All scenarios live in `artifacts/api-server/src/routes/simulator/scenarios.ts`. The demo's recommended scenario is `config_catastrophe` ("Wrong Address"):

- Terraform heredoc in `payment.tfvars` left leading whitespace in `PAYMENT_GATEWAY_URL` → go-http rejects the malformed URI at the transport layer before reaching Stripe.
- Three recovery paths with different Prevention score impact:
  - `kubectl patch configmap payment-eu` → warning, −1 Prevention (Terraform state drifts)
  - `git revert f2a9d1c` → warning, −2 Prevention (loses 52-line README runbook in same commit)
  - `terraform apply -var 'eu_payment_gateway_url=...'` → good, +2 Prevention (optimal: preserves README)
- Recovery is **terminal-driven**: `checkRecoveryTrigger()` in `commands.ts` pattern-matches after every command. The frontend has no recovery action picker.
- Time-based recovery scoring: ≤5 min → 20 pts | ≤10 min → 15 | ≤15 min → 10 | ≤20 min → 5 | >20 min → 2.

Other scenarios (`maint_bot`, `bad_deploy`, `memory_siege`) still exist in the backend and have working diagnosis/recovery paths, but the Arena demo always launches `config_catastrophe`.

The AI Assistance tab in `SimulatorPage` has 8 pre-seeded Q&A pairs (`SEED_QA` array) — generic questions get generic answers, questions with URLs get incident-aware detailed answers. These are tuned for the Wrong Address scenario.

---

## What's intentionally hardcoded for the demo

Per `ROADMAP.md` § "Demo Scope: IN":

- Single role (Site Reliability Engineer), single company ("Acme Corp")
- Recommended scenario always `config_catastrophe`
- 1.5s fake "extraction" animation on skills step
- 1.5s fake "generation" loading on constellation
- 3s fake loading on canvas mount
- Challenge link is self-contained base64 — no backend
- Skill extraction shows 5 pre-filled chips regardless of the role context entered
- AI generation is not wired in the demo path (replaced by reveal of the pre-built scenario)

Don't "fix" these by adding real backend logic unless the user explicitly asks — they are demo-scope choices, not bugs.

---

## What's deferred (don't build without explicit instruction)

From `ROADMAP.md`:

- Real AI generation on the employer path
- Refinement loop in canvas sidebar (sidebar is display-only)
- Job seeker onboarding wizard
- Job seeker progression / Levels 1–4
- localStorage portfolio system
- Employer Hub (multi-role workspace)
- User accounts / auth
- Real challenge link backend

---

## Working style

- **Edit, don't rewrite.** This codebase has had careful surgical work to thread a demo through pre-existing pages. When asked to change behavior, find the minimal edit point.
- **Preserve the demo flow.** If a change risks breaking the 10-minute script, call it out before making it.
- **Don't add unrequested files** — no planning docs, no decision logs, no README updates unless the user asks.
- **Don't add comments unless the WHY is non-obvious.** This file documents the project; the code should be readable on its own. The places that *do* have comments (e.g., `hasPendingScenario`, `key={sessionKey}` on the modal) document subtle React timing behavior — preserve those.
- **`gh` CLI is not installed** in this environment. To create PRs, either prompt the user to install `gh` or provide a copy-pasteable PR body and the GitHub compare URL.
- **The user prefers terse responses.** State results and decisions directly. No trailing summaries unless asked.
