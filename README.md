# CS323 Final Project — AI Training Simulators

Two browser-based training simulators that teach incident response and crisis communication skills:

- **Incident Response Simulator** — DevOps scenario: diagnose and recover from production incidents (bad deploys, database wipes, memory leaks, misconfigured infrastructure)
- **Creator HQ Simulator** — Crisis communications scenario: manage a viral social media controversy

---

## Prerequisites

Install these before anything else.

### 1. Node.js 26+

```bash
# macOS (Homebrew)
brew install node

# Verify
node --version   # should print v26.x.x or higher
```

### 2. pnpm

```bash
npm install -g pnpm

# Verify
pnpm --version   # should print 11.x.x
```

---

## Installation

Clone the repo and install all dependencies from the workspace root:

```bash
git clone <repo-url>
cd CS323_Final_Project
pnpm install
```

This installs dependencies for all packages in the monorepo at once.

> **macOS arm64 note**: If you see an esbuild error like `Cannot find module @esbuild/linux-x64`, run:
> ```bash
> ln -s ../.pnpm/@esbuild+darwin-arm64@$(node -e "console.log(require('./node_modules/.pnpm/lock.yaml') || '0.27.3')")/node_modules/@esbuild/darwin-arm64 \
>       node_modules/@esbuild/darwin-arm64
> ```
> Or just find the version in `pnpm-lock.yaml` and create the symlink manually:
> ```bash
> ls node_modules/.pnpm | grep esbuild+darwin   # find the version
> ln -s ../.pnpm/@esbuild+darwin-arm64@<version>/node_modules/@esbuild/darwin-arm64 \
>       node_modules/@esbuild/darwin-arm64
> ```

---

## Running the Servers

Three servers must run simultaneously. Open three terminal tabs.

### Terminal 1 — API Server (port 3000)

```bash
PORT=3000 pnpm --filter @workspace/api-server run dev
```

### Terminal 2 — Incident Response Simulator (port 5173)

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/incident-simulator run dev
```

### Terminal 3 — Creator HQ Simulator (port 5174)

```bash
PORT=5174 BASE_PATH=/cos-simulator/ pnpm --filter @workspace/cos-simulator run dev
```

---

## Access the Apps

Once all three servers are running:

| App | URL |
|-----|-----|
| Incident Response Simulator | http://localhost:5173 |
| Creator HQ Simulator | http://localhost:5174/cos-simulator/ |

The two frontends proxy `/api` requests to the API server at `localhost:3000` automatically — no extra configuration needed.

---

## Environment Variables Reference

| Variable | Required by | Example | Description |
|----------|-------------|---------|-------------|
| `PORT` | all three servers | `3000`, `5173`, `5174` | Port the server listens on |
| `BASE_PATH` | both frontends | `/` or `/cos-simulator/` | Vite base path for asset routing |
| `API_PORT` | frontends (optional) | `3000` | Override API server port (defaults to 3000) |
| `COS_PORT` | incident-simulator (optional) | `5174` | Override COS simulator port (defaults to 5174) |
| `OPENAI_API_KEY` | api-server (optional) | `sk-...` | If set, AI agent responses use real GPT-4o-mini; otherwise heuristic responses are used |

---

## Project Structure

```
CS323_Final_Project/
├── artifacts/
│   ├── api-server/          # Express 5 backend — shared by both simulators
│   │   └── src/routes/
│   │       ├── simulator/   # Incident simulator routes + state
│   │       └── cos-simulator/ # Creator HQ routes + state
│   ├── incident-simulator/  # React + Vite frontend (DevOps simulator)
│   └── cos-simulator/       # React + Vite frontend (Creator HQ simulator)
├── lib/
│   ├── api-spec/            # OpenAPI spec (source of truth for all API contracts)
│   ├── api-client-react/    # Generated React Query hooks (don't edit)
│   └── api-zod/             # Generated Zod schemas (don't edit)
├── replit.md                # Developer reference (architecture, gotchas, scenario docs)
└── pnpm-workspace.yaml      # Workspace definition
```

All simulator state is **in-memory** — restarting the API server resets everything.

---

## Useful Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Rebuild the API server after route changes
pnpm --filter @workspace/api-server run build

# Regenerate API hooks/schemas after editing lib/api-spec/openapi.yaml
pnpm --filter @workspace/api-spec run codegen
```

---

## Troubleshooting

**"PORT environment variable is required"**
→ You must set `PORT=<number>` before each server command (see above).

**"BASE_PATH environment variable is required"**
→ Both frontend servers need `BASE_PATH` set (`/` for incident-simulator, `/cos-simulator/` for cos-simulator).

**API calls returning 404 in the browser**
→ Make sure the API server is running on port 3000 before starting the frontends.

**esbuild platform mismatch (darwin vs linux)**
→ The lockfile may have been generated on a different OS. See the arm64 note in the Installation section above.

**Changes to backend routes not taking effect**
→ The API server's `dev` script runs `build` then `start` — it doesn't hot-reload. Kill it and re-run `PORT=3000 pnpm --filter @workspace/api-server run dev` after any backend changes.
