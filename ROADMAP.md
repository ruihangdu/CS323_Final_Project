# 🚀 Arena — Product Roadmap

> **Last updated:** 2026-05-30  
> **Status:** Pre-MVP — active development on `ray-edit` branch  
> **Codebase:** `artifacts/incident-simulator/` (React / Vite / TypeScript / Wouter)

---

## 📋 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [Demo Scope — 2-Day Sprint](#-demo-scope--2-day-sprint)
3. [MVP Scope — Employer-First](#-mvp-scope--employer-first)
4. [Phase 0 — Critical Bug Fix](#-phase-0--critical-bug-fix-blocking)
5. [Phase 1 — Employer Canvas](#-phase-1--employer-canvas)
6. [Phase 2 — Employer Hub + Challenge Links](#-phase-2--employer-hub--challenge-links)
7. [Phase 3 — Core Job Seeker Loop](#-phase-3--core-job-seeker-loop-post-mvp)
8. [Phase 4 — Job Seeker Portfolio + Progression](#-phase-4--job-seeker-portfolio--progression-post-mvp)
9. [Unvalidated Hypotheses](#-unvalidated-hypotheses)
10. [Long-term Vision](#-long-term-vision)
11. [Technical Decisions Log](#-technical-decisions-log)
12. [Build Order](#-build-order)

---

## 🧠 Executive Summary

### What Arena Is

Arena is a two-sided **job-skills simulation platform** built on the flight simulator metaphor for knowledge work. Employers define what good judgment looks like for a role and generate scenario-based challenges. Job seekers train through progressively harder simulations, building a portfolio that demonstrates their judgment — not just their credentials.

### The Core Insight

Resumes and interviews measure proxies for judgment. Arena measures judgment directly. A 20-minute simulation puts a candidate inside a real decision environment — a production incident, a PR crisis, a strategic pivot — and scores how they navigate it. The result is a portfolio of demonstrated judgment that travels with every job application.

### Current State (as of this writing)

The codebase is a Stanford CS323 final project (`artifacts/incident-simulator/`) with:

| Route | Component | Status |
|---|---|---|
| `/` | `SetupPage` | Working — configure & launch scenarios |
| `/sim` | `SimulatorPage` | Working — hardcoded DevOps incident (TaskForge) |
| `/custom` | `CustomSimulatorPage` | Working — AI-generated scenario via OpenAI |
| `/employer` | `EmployerOnboardingPage` | Working — 3-step wizard collects role/context/skills |
| `/employer/constellation` | `ConstellationPage` | Working — visual skill graph renders from sessionStorage |

**Critical open bug:** `ConstellationPage` hardcodes `navigate("/sim")` on "Generate test" click, discarding all employer onboarding input. The custom scenario generator (`/custom`) exists and works — it just isn't wired to the employer flow.

A separate `artifacts/cos-simulator/` app handles the Chief of Staff / Creator HQ scenario and is currently launched via `window.location.href` redirect from `SetupPage`.

### The Vision

Arena becomes a marketplace where employers publish judgment challenges and job seekers build verifiable skills portfolios. The flywheel: more job seekers → richer data for employers → more employers publish challenges → more reason for job seekers to train.

---

## 🎬 Demo Scope — 2-Day Sprint

> **Deadline:** 2 days from 2026-05-30  
> **Principle:** Hard-code everything. The goal is a believable, end-to-end story — not a real system.  
> **Focus:** Employer flow front-to-back. Job seeker path is minimal — follow a challenge link, run the sim, get a debrief. No progression, no browse page.

### What the Demo Must Show

A stakeholder watching the demo should experience two complete flows:

1. **Employer:** "I'm hiring a DevOps engineer. Let me define what I'm looking for and generate a challenge for candidates." → lands on a canvas showing the generated challenge → publishes it.
2. **Job Seeker:** "I'm looking for a DevOps role. Let me browse available challenges and try one." → completes the simulation → sees their results.

That's the whole story. Everything else is future scope.

---

### Demo Scope: IN

| Feature | Implementation | Hard-code strategy |
|---|---|---|
| **Landing page** — employer vs. job seeker fork | New `LandingPage` at `/` | Static layout, two cards, no logic |
| **Employer onboarding** — pre-filled with canned content | Existing `EmployerOnboardingPage` | Pre-populate Step 2 context field and Step 3 skills with a realistic blurb for a "Senior DevOps Engineer" role; company = "Acme Corp" |
| **Constellation** — skill map review | Existing `ConstellationPage` | Already works; no changes needed |
| **"Generate challenge"** — fake streaming generation | Canvas page | On click: show 3-second animated loading state ("Generating your scenario…") then reveal a **pre-built, hardcoded scenario JSON** as if it was just generated |
| **Employer canvas** — Overview tab | New `/employer/canvas` page | Left sidebar (read-only conversation history for demo); right panel Overview tab showing the pre-built scenario's title, premise, key decisions, skills |
| **Employer canvas** — Live Preview tab | Same canvas page | Iframe embedding the existing `/sim` or `/custom` simulator; employer banner overlay |
| **"Get Challenge Link" button** | Canvas page | Encodes scenario into base64 URL, copies to clipboard, shows "Link copied!" toast; no real backend |
| **Challenge landing page** `/challenge?d=...` | New `ChallengePage` | Decodes URL payload → shows orientation (company, role, ~20 min) → "Start challenge" → existing simulator |
| **Debrief** — results screen | Existing debrief modal | No changes needed |

### Demo Scope: OUT (explicitly)

| Feature | Reason |
|---|---|
| Real AI generation on employer path | Replace with pre-built scenario + fake loading delay |
| Refinement loop in canvas sidebar | Sidebar is display-only for demo; "Request changes" button disabled or hidden |
| Job seeker onboarding wizard | Skip entirely — job seekers arrive via employer-sent challenge link |
| Job seeker progression / levels | Skip entirely — no Level 1–4 in demo |
| Portfolio system | Skip entirely |
| Employer Hub (multi-role workspace) | Skip — single role per demo session |
| Real challenge link backend | base64-encoded URL is self-contained; no server needed |
| Constellation coverage/gap analysis | Show the existing constellation as-is; don't add diagnostic overlay |

---

### Canned Content for Demo

**Pre-filled employer onboarding (Step 2 context field):**
> "They'll inherit a distributed system running on Kubernetes across three regions. On any given week they're triaging PagerDuty alerts at 2am, reviewing infra PRs, and deciding whether a latency spike is a blip or a cascading failure in progress. The judgment we care about most: they need to know when to escalate and when to just fix it."

**Pre-selected skills (Step 3):**
- Debugging under pressure
- Root-cause analysis
- Production safety
- Incident communication
- On-call judgment

**Pre-built scenario (revealed after "Generate" loading):**
Use the existing "Maint Bot Disaster" / "Wrong Address" scenario already in the codebase — it's the most polished and realistic. The canvas Overview tab surfaces its title, premise, and decision points in the structured doc format. The Live Preview tab embeds the full simulator.

---

### Demo Flow Script

```
1. Land on / → click "I'm hiring"
2. Step 1: Role = "Senior DevOps Engineer", Company = "Acme Corp"
3. Step 2: Pre-filled context blurb (can edit, doesn't matter for demo)
4. Step 3: Pre-selected skills → click "Next"
5. Constellation → review skill nodes → click "Generate challenge"
6. Canvas opens: 3-second loading animation → pre-built scenario appears in Overview tab
7. Flip to Live Preview → show full simulator as candidate would see it
8. Click "Get Challenge Link" → toast → "Link copied — paste it anywhere you hire"
9. Switch to job seeker: paste the link into browser → /challenge?d=...
10. Orientation screen → "Start challenge" → run the simulation
11. Complete → debrief modal → done
```

**Estimated build time:** 1.5–2 days  
**Risk:** Canvas page is new; pre-built scenario reveal is a new animation. Everything else already exists.

---

## 🎯 MVP Scope — Employer-First

> **Principle:** Money comes from employers. Build the most robust, complete employer experience first. Job seeker experience is simplified in MVP and polished post-MVP.  
> **Strategy:** Still hard-code where needed, but now wire real AI generation and build a real employer workspace.

### Strategic Priority Shift

The demo proves the concept. MVP makes the employer side real and production-quality. Job seeker experience in MVP is **just enough** to make employer-published challenges valuable — they need someone to actually take the challenges.

### IN for MVP

| Feature | Phase |
|---|---|
| Landing page (employer / job seeker fork) | Phase 0 |
| Real AI generation wired from employer onboarding | Phase 0 (bug fix) |
| Employer canvas — full refinement loop | Phase 1 |
| Employer canvas — real Overview + Live Preview tabs | Phase 1 |
| Constellation as coverage map (Core / Partial / Gap nodes) | Phase 1 |
| Employer Hub — multi-role workspace | Phase 2 |
| Employer Hub — Duplicate + Elevate (seniority variants) | Phase 2 |
| Employer Hub — multi-role workspace with link log | Phase 2 |
| Challenge link — `/challenge?d=...` candidate landing page | Phase 1 |
| Job seeker — follow challenge link → run sim → debrief | Phase 1 |

### OUT for MVP (explicitly deferred to post-MVP)

| Feature | Why deferred |
|---|---|
| Job seeker progression / Levels 1–4 | Employer experience must be solid first |
| localStorage portfolio | Deferred — job seekers just run challenges, no persistent record |
| Shareable portfolio URL | Follows from portfolio; deferred |
| Portfolio constellation | Deferred |
| Level unlock gate | Deferred |
| User accounts / auth | Still too early — hardcode single-employer |
| Cross-device sync | Follows from accounts |
| Real link shortening | base64 URLs are fine |
| Relative percentile scoring | Needs user population |
| Streak / habit mechanics | Post-PMF polish |
| Company-level meta-constellation | Requires multiple roles; Phase 3+ |

### MVP Hard-Coding Decisions (what stays hardcoded even in MVP)

- **Employer identity:** Single employer per session; no auth; profile in `sessionStorage`
- **Challenge links:** Self-contained base64 URL; no backend or seed content needed
- **Score breakdown categories:** Hardcoded per scenario type (not dynamically generated from employer skills selection)
- **Scenario generation:** Direct OpenAI call via existing hook; no queuing, caching, or fallback

### IN for MVP

| Feature | Rationale |
|---|---|
| Shared 3-step onboarding wizard (employer + job seeker fork) | Core UX differentiator — must exist |
| Employer flow → canvas editing experience → constellation | Existing pieces, need to be wired together properly |
| Job seeker training levels 1–4 (difficulty scaling) | The "flight school" metaphor needs all 4 levels to land |
| localStorage portfolio (CompletionRecord per simulation) | Enables the portfolio constellation without a backend |
| Portfolio page with growing constellation | Visible progress = retention driver |
| Shareable portfolio URL (base64-encoded, client-side) | Makes portfolio useful without accounts |
| Challenge link — `/challenge?d=...` candidate landing page | Employer pastes link anywhere; no new platform needed |
| Canvas editing experience (left sidebar + right panel) | Shows employer the refinement loop |

### OUT for MVP (with rationale)

| Feature | Why it's OUT |
|---|---|
| User accounts / auth | Hard dependency to avoid — localStorage is sufficient for demo |
| Cross-device portfolio sync | Follows from accounts; can be demoed with "export link" |
| Real employer publishing backend | Pre-seeded hardcoded challenges demonstrate the concept |
| Multi-employer marketplace | Single-employer demo is enough to show the model |
| Relative percentile scoring | Requires a population of users; show the UI slot as "Coming soon" |
| Streak / daily habit mechanics | Polish feature; add in Phase 4 if time allows |
| Certification / endorsement layer | Requires employer trust that hasn't been established yet |
| ATS integration | Enterprise sales cycle — post-PMF |
| Company-level meta-constellation | Requires multiple roles per employer; future feature |
| Real link shortening / redirect service | base64 URL encoding is functionally identical for demo |
| Server-side score persistence | In-memory per session is fine for demo |

### MVP Hard-Coding Decisions (explicit)

- **Employer Hub:** Single-employer demo — no multi-employer auth, no persistent role library
- **Challenge links:** Encode scenario config as base64 URL — self-contained, no backend, no seed content
- **Level Unlock:** Local state flag in localStorage (`arena.levelProgress`) — no server validation
- **Portfolio Export:** `btoa(JSON.stringify(portfolio))` → URL param → read-only view
- **Score Breakdown:** Categories (Diagnosis, Recovery, Communication, etc.) are hardcoded per scenario type — not dynamically generated from employer skills input (yet)
- **Scenario Generation:** OpenAI API called client-side via existing `useGenerateCustomScenario` hook — no server-side queuing or caching

---

## 🐛 Phase 0 — Critical Bug Fix (BLOCKING)

**Priority:** Must ship before anything else. The employer flow is currently broken end-to-end.

**Bug:** In `ConstellationPage.tsx` line 517, the "Generate test" button is hardcoded to `navigate("/sim")` instead of routing to the custom scenario generator with the employer's onboarding data as context.

### What Needs to Change

**File:** `artifacts/incident-simulator/src/pages/ConstellationPage.tsx`

**Current behavior:**
```tsx
onClick={() => navigate("/sim")}
```

**Required behavior:** Read the employer profile from `sessionStorage` (`employer.profile`), construct a scenario description from `roleTitle`, `roleContext`, and `skills`, call the custom scenario generation API (matching how `SetupPage.tsx` calls `useGenerateCustomScenario`), then navigate to `/custom` with the appropriate URL params.

### Implementation Steps

1. Import `useGenerateCustomScenario` from `@workspace/api-client-react` into `ConstellationPage.tsx`
2. Build a scenario description string from the stored profile:
   ```
   "Generate a realistic judgment scenario for a {roleTitle} at {company}. Context: {roleContext}. The scenario should specifically test: {skills.join(', ')}."
   ```
3. On button click: call the mutation → on success → `navigate("/custom?company=...&color=...&brand=...")`
4. Show loading state on the button during generation (replace "Generate test" with a spinner + "Generating…")
5. Handle error state (show inline error below the button)

### Acceptance Criteria

- [ ] Employer completes 3-step wizard → lands on Constellation → clicks "Generate test"
- [ ] A custom scenario is generated that references the role, context, and at least 2 of the selected skills
- [ ] Loading state is visible during generation
- [ ] On success, user lands on `/custom` in the simulator
- [ ] On error, an error message appears and the button is re-enabled

**Estimated effort:** 2–3 hours

## 🎨 Phase 1 — Employer Canvas

**Goal:** Replace the "Generate test" → direct-to-sim flow with a canvas editing experience that lets employers refine scenarios and generate a shareable challenge link.

### 2.1 — Canvas Route

**Route:** `/employer/canvas`

**Layout:** Split-pane (like Gemini Canvas / Claude Artifacts):

```
┌─────────────────────────────┬──────────────────────────────────┐
│  LEFT SIDEBAR               │  RIGHT PANEL                      │
│  (Conversation / Refinement)│  (Tab: Overview | Live Preview)   │
│                             │                                   │
│  [Conversation history]     │  [Tab bar: Overview | Preview]    │
│                             │                                   │
│  [Quick action chips]       │  Overview tab:                    │
│   "Make it harder"          │  - Title                          │
│   "Add red herrings"        │  - Premise                        │
│   "Change tech stack"       │  - Key decisions to make          │
│   "Simplify"                │  - Skills tested                  │
│   "Add a stakeholder"       │  - Difficulty level               │
│                             │                                   │
│  [Text input]               │  Live Preview tab:                │
│  [Regenerate button]        │  - Full rendered simulator (iframe)|
│                             │  - Full-screen toggle             │
│                             │                                   │
│                   [Publish] ─────────────────────────────────→ │
└─────────────────────────────┴──────────────────────────────────┘
```

### 2.2 — Canvas Data Model

```typescript
type ScenarioDoc = {
  id: string;
  title: string;
  premise: string;          // 2–3 sentence situation setup
  keyDecisions: string[];   // The 3–5 judgment calls the scenario probes
  skillsTested: string[];   // Derived from employer's onboarding selections
  difficultyLevel: 1 | 2 | 3 | 4;
  techStack?: string;       // Optional — for SWE scenarios
  stakeholders?: string[];  // Named characters in the scenario
  redHerrings?: string[];   // Distractors (optional, for higher difficulty)
  generatedAt: string;
  refinementHistory: {
    prompt: string;
    respondedAt: string;
  }[];
};
```

Stored in `sessionStorage` at key `employer.canvas`.

### 2.3 — Refinement Sidebar

- Conversation-style display: each refinement prompt + "Regenerated" confirmation shown as chat bubbles
- On submit: call `useGenerateCustomScenario` with the original employer profile + the refinement instruction appended
- **Auto-snap to Overview tab** after regeneration completes (so employer sees what changed)
- Show a "Diff" indicator on changed sections of the Overview (e.g., subtle highlight on the fields that changed)

**Quick action chips** (pre-filled refinement shortcuts):
- "Make it harder" → adds difficulty modifier to prompt
- "Add red herrings" → injects distractors instruction
- "Change tech stack" → prompts employer for new tech context
- "Simplify the premise" → reduces complexity
- "Add a key stakeholder" → names a new character
- "Focus more on [skill]" → re-weights scenario toward a specific skill node

### 2.4 — Overview Tab

Structured document display (not just raw text). Each field is displayed in a card with a label:

- **Scenario title** — editable inline
- **Premise** — the crisis setup, 2–3 sentences
- **Key decisions** — bulleted list of the judgment calls
- **Skills tested** — pill tags matching the employer's constellation nodes
- **Difficulty** — badge (Level 1–4)

### 2.5 — Live Preview Tab

- Embedded iframe (or React Router child route) showing the actual simulator at `/custom` with the current scenario
- Full-screen toggle button (expands the preview to full viewport)
- On regenerate, preview auto-refreshes (tab snaps to Overview first, preview reloads on next tab switch)

### 2.6 — Generate Challenge Link

Replaces "Publish to Explore." The employer clicks **"Get Challenge Link"** and receives a shareable URL they can paste anywhere — their ATS (Greenhouse, Lever), a LinkedIn post, an email to candidates, a Notion job spec.

**URL scheme (no backend required):**
```
/challenge?d=<base64(JSON.stringify(ChallengePayload))>
```

```typescript
type ChallengePayload = {
  v: 1;
  roleTitle: string;
  company: string;
  skills: string[];
  scenarioId: string;        // links to the pre-built or AI-generated scenario
  generatedAt: string;
};
```

**On click:**
1. Encode `ChallengePayload` → base64 → construct URL
2. Copy to clipboard automatically
3. Show toast: **"Challenge link copied — paste it anywhere you hire"**
4. Optionally show the link in a modal so the employer can also see/save it

**On candidate side (`/challenge?d=...`):**
1. Decode payload → read `roleTitle`, `company`, `scenarioId`
2. Show a brief orientation screen: "You've been invited to complete a challenge for [Company]. Role: [roleTitle]. Takes ~20 min."
3. "Start challenge" → routes to the simulator pre-seeded with this scenario

No Explore page. No browse. Candidates come via the link the employer sends.

**Estimated effort (Phase 1 total):** 4–5 days

---

## 🏢 Phase 2 — Employer Hub + Challenge Links

**Goal:** Employer has a persistent workspace for managing multiple roles and challenge links. No Explore page — candidates always arrive via a link the employer sends.

### 3.1 — Employer Hub

**Route:** `/employer/hub`

**Layout:**
- Header: "Welcome back, [Company Name]" (read from `localStorage`)
- **Roles section:** Cards for each defined role (initially empty, grows as employer creates roles)
  - Each role card shows: role title, date created, constellation thumbnail, number of candidates who attempted (hardcoded 0 for MVP)
  - "Create new role" button → back to onboarding wizard with company name pre-filled
  - "Duplicate + Elevate" button on each card → clones the role, bumps difficulty level by 1, skips back to Step 3 (skills) for any adjustments
- **Published challenges section:** List of published `ScenarioDoc`s, each with a "View results" stub (hardcoded "0 submissions" for MVP)

**Company context pre-fill:** On the wizard's Step 1, if `localStorage` has `employer.hubProfile.company`, pre-fill the company field and skip the company input (show it as editable but pre-populated).

**Employer data model (localStorage):**

```typescript
// Key: "employer.hub"
type EmployerHub = {
  company: string;
  createdAt: string;
  roles: RoleDefinition[];
  publishedChallenges: ScenarioDoc[];
};

type RoleDefinition = {
  id: string;
  roleTitle: string;
  roleContext: string;
  skills: string[];
  difficultyLevel: 1 | 2 | 3 | 4;
  createdAt: string;
  scenarioDocs: ScenarioDoc[];
};
```

### 3.2 — Employer Constellation as Coverage Map

**Upgrade the existing `ConstellationPage` with gap node support:**

Currently, nodes are classified as `focus | core | partial`. Add a fourth status: `gap`.

**Gap node:** A skill that the employer listed in their onboarding but that the generated scenario does not test. This is a diagnostic signal: "Your scenario won't reveal whether this candidate can do X."

Gap nodes display with:
- Dashed outline only (no fill, no glow)
- Slightly dimmer than partial
- Tooltip on hover: "Not tested in current scenario"

**How to derive gap nodes:**
1. Take the employer's `skills` array (from onboarding)
2. Take the `skillsTested` array from the generated `ScenarioDoc`
3. Skills in `skills` but not in `skillsTested` → `gap` nodes
4. Add them to the constellation as outlined nodes

### 3.3 — Challenge Link Management

**What the hub shows for each published role:**

```
┌──────────────────────────────────────────────────────────┐
│  Senior DevOps Engineer          Published · 3 links     │
│  [mini constellation]                                    │
│  [Edit canvas]  [Get new link]  [View results stub]      │
│                                                          │
│  Links generated:                                        │
│  • arena.app/challenge?d=abc123  (copied 2026-05-30)     │
│  • arena.app/challenge?d=def456  (copied 2026-05-29)     │
└──────────────────────────────────────────────────────────┘
```

Each employer can generate multiple links for the same role (e.g., one per job board). All links for a role share the same underlying scenario — the URL payload encodes the scenario config, not a server-side ID.

**"Get new link" flow:**
1. Regenerates a fresh `ChallengePayload` for this role
2. Copies to clipboard
3. Logs the link + timestamp under the role card
4. Log stored in `localStorage` at `employer.hub.roles[n].linkLog`

**"View results stub":** For MVP, shows a placeholder: "Results will appear here as candidates complete this challenge." In post-MVP, this connects to a real submission backend.

**Estimated effort (Phase 2 total):** 3–4 days

---

## 🎓 Phase 3 — Core Job Seeker Loop *(post-MVP)*

**Goal:** Build the full job seeker experience. Starts after the employer side is production-quality and real employer-generated challenge links exist for job seekers to follow.

### 3.1 — Shared Onboarding Wizard + Role Fork

**Target state:** A single landing page at `/` that routes both employers and job seekers through the same 3-step wizard. The fork happens after Step 3.

- Both paths use the same `EmployerOnboardingPage` wizard component with a `mode: 'employer' | 'seeker'` prop
- Employer path (after Step 3): constellation → canvas → challenge link (existing flow)
- Job seeker path (after Step 3): level selector → generate training scenario → simulate

#### New Routes

| Route | Component | Purpose |
|---|---|---|
| `/training/setup` | `TrainingSetupPage` | Level selector after job seeker onboarding |
| `/training/sim` | `SimulatorPage` (reused) | Job seeker training simulation |

### 3.2 — Difficulty Prompt Injection

When generating a job seeker training scenario, append a difficulty modifier:

- **Level 1 (Guided):** "Make this scenario guided with clear steps and hints."
- **Level 2 (Supported):** "Make this scenario moderately difficult with some ambiguity."
- **Level 3 (Unsupported):** "Make this scenario challenging with significant ambiguity and competing priorities."
- **Level 4 (Expert):** "Make this scenario expert-level with high stakes, red herrings, and no clear right answer."

### 3.3 — localStorage Portfolio System

**Data model:**

```typescript
// Stored at key: "arena.portfolio"
type CompletionRecord = {
  id: string;              // nanoid
  completedAt: string;     // ISO timestamp
  level: 1 | 2 | 3 | 4;
  scenarioTitle: string;
  roleTitle: string;
  company: string;
  skills: string[];
  scoreBreakdown: { category: string; score: number; maxScore: number; }[];
  totalScore: number;
  durationSeconds: number;
};

type Portfolio = {
  version: 1;
  records: CompletionRecord[];
  levelProgress: { unlockedLevels: (1 | 2 | 3 | 4)[]; };
};
```

**Helper module:** Create `src/lib/portfolio.ts` with `readPortfolio`, `addCompletion`, `unlockNextLevel`, `exportAsBase64`, `importFromBase64`.

**Write point:** When the debrief modal is dismissed in either simulator, append a `CompletionRecord` to the portfolio.

### 3.4 — Level Unlock Gate

- Completing Level 1 unlocks Level 2; Level 2 unlocks Level 3; Level 3 unlocks Level 4
- On `TrainingSetupPage`, locked levels show a padlock icon with tooltip: "Complete Level X first"

**Estimated effort (Phase 3 total):** 3–4 days

---

## 🎓 Phase 4 — Job Seeker Portfolio + Progression *(post-MVP)*

**Goal:** Build the full job seeker training experience. Only starts after the employer side is production-quality and there is real employer-generated content for job seekers to engage with.

---

## ✨ Phase 5 — Polish + Demo Prep

**Goal:** Make the product demo-ready with graduation moments, animations, and the employer report panel.

### 4.1 — Graduation Moment

When a job seeker completes a level and unlocks the next:
- Full-screen overlay with constellation animation (nodes light up sequentially)
- "Level X complete" message in Instrument Serif
- XP/badge earned (cosmetic — no real credential)
- "Continue to Level X+1" or "Browse Employer Challenges" (if Level 3 just completed)

### 4.2 — Constellation Growth Animation

On `PortfolioPage`, when a new `CompletionRecord` is added:
- Animate new skill nodes appearing: scale from 0 → 1 with glow pulse
- Animate new edges drawing in: SVG stroke-dashoffset animation
- A subtle particle burst on the focus node

### 4.3 — Quick-Action Chips

Finalize and ship the refinement chip set on the Canvas sidebar (see Phase 2.3). Ensure chips are:
- Context-aware (e.g., "Change tech stack" only shows for SWE roles)
- One-tap: clicking inserts the prompt and auto-submits, no extra step

### 4.4 — Sample Employer Report Panel

A static/mocked "Employer View" shown after a candidate completes a challenge link simulation:

- Shows what an employer would see after a candidate submits
- Left panel: candidate's portfolio constellation (from their base64 share URL)
- Right panel: this challenge's score breakdown, time taken, key decisions made
- Score compared to "Arena baseline" (hardcoded: "This result is in the top X% of attempts" — mocked number for demo)
- "Request interview" button (stub — no action)

### 4.5 — UX Consistency Pass

- Align color tokens and typography across `SetupPage` (uses dark shadcn theme) and `EmployerOnboardingPage` (custom cream/sky palette) — decide on one design system and apply it
- Ensure all pages share the Arena wordmark and nav pattern
- Add keyboard shortcuts: `Cmd+Enter` to advance wizard steps (already exists on context textarea), ensure consistency everywhere

**Estimated effort (Phase 4 total):** 2–3 days

---

## 🔬 Unvalidated Hypotheses

Every assumption listed below is a bet. None of them have been validated. Each one has a proposed validation method — ideally doable during or immediately after the demo.

---

### H1 — Progression Drives Engagement

**Hypothesis:** Job seekers who complete Level 1 will return to complete Level 2, 3, and 4 because visible progress (the growing constellation) creates a habit loop.

**Risk level:** High. Most educational products see >80% drop-off after the first session.

**How to validate:**
- Track session-to-session return rate (even manually via localStorage timestamps)
- Ask 5 job seeker users to complete Level 1 in front of you, then follow up 48 hours later
- If fewer than 2 of 5 return unprompted, the progression mechanic is not strong enough alone — add email reminders or social sharing

**What failure looks like:** "I did it once, it was cool, I don't need to go back."

---

### H2 — Portfolio as Hiring Signal

**Hypothesis:** Employers will treat a self-directed training portfolio as a meaningful pre-filter when reviewing candidates.

**Risk level:** Very high. Self-reported data is easy to fake, and employers know it.

**How to validate:**
- Show the employer report panel to 3–5 hiring managers and ask: "Would this change how you'd rank candidates?"
- Ask specifically: "Do you trust this, or do you assume candidates just kept retrying until they got a good score?"
- If trust is low, explore: employer-issued challenges (not self-directed), timed conditions, or proctoring signals

**What failure looks like:** "Anyone can just keep trying until they get 100." (This is true — we need to decide if that matters.)

---

### H3 — Employer Content Creation Appetite

**Hypothesis:** Small business owners and hiring managers will create custom challenges, not just use pre-built ones.

**Risk level:** High. Content creation is the hardest behavior to drive. Most marketplace tools fail because supply doesn't show up.

**How to validate:**
- In the demo, put 3 non-technical people through the employer onboarding wizard and watch where they struggle or drop off
- Ask: "Would you use this if I gave you access today?" vs. "Would you actually set it up?"
- If content creation is too hard, consider: concierge onboarding (interview → Arena team creates the scenario), pre-built templates with minimal customization

**What failure looks like:** "This is really cool but I don't have time to write all this."

---

### H4 — Score Validity

**Hypothesis:** Performance on Arena's scoring rubric (Diagnosis, Recovery, Communication, etc.) actually predicts on-the-job judgment quality.

**Risk level:** Very high. The rubric was designed as a game mechanic, not a psychometrically validated assessment.

**How to validate:**
- This cannot be validated quickly. Long-term: compare Arena scores of candidates who were hired vs. their 6-month performance reviews
- Short-term proxy: ask domain experts (experienced engineers, CoS practitioners) to take the simulation and evaluate whether the rubric categories feel meaningful

**What failure looks like:** High Arena scorers perform poorly on the job. (Can't detect this without real hiring data.)

**Interim mitigation:** Be explicit in the product that scores are "one signal among many" — don't over-claim predictive validity in the MVP.

---

### H5 — Constellation as Communication

**Hypothesis:** The skill constellation visually communicates role expectations to a non-technical employer without explanation.

**Risk level:** Medium. The visual is striking but may be opaque without a legend.

**How to validate:**
- Show the constellation page to 3 non-technical users (no explanation) and ask: "What does this tell you?"
- If they can correctly identify: (a) the most important skill, (b) which skills are covered vs. not covered, then it works
- If they can't, add more explicit labeling and a one-line explanation panel

**What failure looks like:** "This looks cool but I don't know what it means."

---

### H6 — Two-Sided Cold Start

**Hypothesis:** The challenge-link model (employer sends a link; candidate follows it) sidesteps the classic marketplace cold-start problem. Employers have existing distribution; Arena doesn't need to build its own discovery layer to provide value.

**Risk level:** Medium. The bet is that employers are willing to embed an external link in their hiring process without a large installed user base as proof.

**How to validate:**
- Show the demo to 3–5 hiring managers and ask: "Would you paste this link in your Greenhouse job posting?"
- If yes: the link model works; employer distribution is the growth engine
- If no (trust barrier): there may need to be a verification layer (e.g., "used by X companies") or an optional hosted landing page so the link looks credible

**Strategic note:** If the link model gains traction, an Explore/marketplace layer becomes a post-PMF addition — not a prerequisite. The signal to build it is employers asking "where can candidates find us without me sending them a link?"

---

### H7 — Level Calibration

**Hypothesis:** Level 4 (Expert) is genuinely harder than Level 1 (Guided), and the AI consistently produces scenarios that match the intended difficulty.

**Risk level:** Medium. LLMs are inconsistent. A "Level 4 prompt" might produce a trivially solvable scenario on some runs.

**How to validate:**
- Run 5 Level 1 and 5 Level 4 scenarios with the same role/context
- Ask a panel of 3 domain experts to blind-rank them by difficulty
- If ranking correlates with level, calibration is working
- If not, add more explicit difficulty scaffolding to the prompt (specific constraints, number of competing priorities, etc.)

**What failure looks like:** "Level 4 felt the same as Level 2."

---

### H8 — Portfolio Portability

**Hypothesis:** Job seekers will trust a localStorage-based portfolio enough to invest real time building it, knowing it could be lost if they clear their browser.

**Risk level:** High. localStorage is fragile. Users who lose their portfolio will churn permanently and feel deceived.

**How to validate:**
- Ask 5 job seeker testers at the end of a session: "Would you feel comfortable building this portfolio over time, knowing it lives in your browser?"
- Watch for hesitation around "What if I get a new computer?"
- Also measure: how many testers use the "Share portfolio" link (proxy for wanting to preserve their data)

**What failure looks like:** "I don't want to invest in this if it's going to disappear."

**Mitigation:** The base64 shareable URL serves as a low-friction backup mechanism. Make this very visible: "Your portfolio lives in this browser — save your link to back it up."

---

## 🔭 Long-term Vision

*Everything below is post-MVP scope. Document it to establish the north star, not to build it now.*

### Real User Accounts + Cross-Device Sync

- Email/OAuth sign-in (Google, GitHub for job seekers; Google/Slack for employers)
- Portfolio stored in a real database, accessible across devices and browsers
- Persistent employer workspace: role history, scenario library, candidate submissions

### Employer Publishing Workflow

- Full CRUD for employer challenges
- Approval/review flow before challenges go live on Explore
- Challenge versioning (v1, v2, etc.) — job seekers who attempt v1 can be notified of updates

### Meta-Constellation

- Company-level view: a skill coverage map across all defined roles
- Useful for talent strategy: "We have no roles that test negotiation — that's a gap in our org's skill coverage"
- HR/L&D integration: use the meta-constellation to identify internal training priorities

### Candidate Matching

- Employer searches job seeker pool by constellation match: "Show me candidates whose portfolios are at least 70% aligned to this role's constellation"
- Job seeker receives "You're a 78% match for this challenge" signals

### Relative Percentile Scoring

- "You scored in the top 30% of people who took this scenario"
- Requires a minimum viable population (n=50+ attempts per scenario)
- Changes the score from an absolute metric to a relative one — more motivating and more informative

### Streak + Habit Mechanics

- Duolingo-style daily practice nudges
- Streak counter: "7-day training streak"
- Weekly digest email: "You practiced 3 days this week. Level 3 is X simulations away."

### Certification + Endorsement Layer

- Self-directed completion (current model): low trust
- Employer-verified completion: employer issues a challenge, candidate completes it → employer can "endorse" the result
- Third-party proctoring: timed, locked-down session with basic integrity signals
- Stacked credential model: "Arena Certified: Level 3 SWE Judgment" issued by Arena, "TaskForge Challenge Passed" issued by employer

### ATS Integration

- Send candidate challenge results directly to Greenhouse, Lever, Ashby
- Arena result appears as a structured field on the candidate profile
- No more resume uploads — candidate's Arena portfolio IS their application package

### Multi-Employer Marketplace with Discovery

- Employer branding: custom colors, company logo, employer description on challenge cards
- Employer ratings by job seekers: "This challenge was realistic / unrealistic"
- Discovery: job seekers browse by company, not just role
- Premium employer tier: featured placement on Explore, candidate pool access

---

## ⚙️ Technical Decisions Log

### Decision 1: localStorage for Job Seeker Portfolio

**Decision:** Use `localStorage` instead of a database for MVP portfolio storage.

**Rationale:** No user accounts needed. No backend infrastructure to stand up. The base64 share URL provides a lightweight backup/export mechanism. Sufficient for demo and early validation.

**Trade-offs:**
- Pro: Zero infrastructure cost, zero auth complexity, instant implementation
- Con: Fragile (clear browser = lost portfolio), no cross-device sync, max ~5MB storage limit

**Revisit trigger:** When any tester expresses real concern about losing their portfolio data, or when we want to support mobile + desktop simultaneously.

---

### Decision 2: base64-Encoded Shareable Portfolio URLs

**Decision:** Encode the full portfolio JSON as `btoa()` → URL param rather than using a server-side link shortener.

**Rationale:** No server required. No database lookup. Works offline. The URL is long but functional.

**Trade-offs:**
- Pro: No infrastructure, works immediately
- Con: URLs are very long (300+ chars for a real portfolio), ugly, break in some SMS/email clients

**Revisit trigger:** When a real employer needs to share a candidate's portfolio URL in a message thread.

---

### Decision 3: Challenge Links Instead of an Explore Marketplace

**Decision:** Employers get a shareable `/challenge?d=<base64>` URL instead of publishing to a browseable marketplace. Candidates arrive via that link.

**Rationale:** Employers already have distribution — their ATS, job boards, email, LinkedIn. We don't need to build a discovery layer to provide value. The link model also removes the cold-start problem: there's no chicken-and-egg between employer content and job seeker traffic.

**Trade-offs:**
- Pro: Zero backend, no cold-start, integrates with any hiring workflow the employer already uses
- Con: Candidates can't discover Arena independently; all growth is employer-driven

**Revisit trigger:** When employers start asking "where can candidates find us without us sending them a link?" — that's the signal that an Explore/marketplace layer has demand. Not before.

---

### Decision 4: Shared Onboarding Wizard with Mode Fork

**Decision:** Reuse the same 3-step wizard component (`EmployerOnboardingPage`) for both employer and job seeker paths, with a `mode` prop controlling the post-step-3 behavior.

**Rationale:** Reduces code duplication. The core questions (what role? what does the work look like? what skills matter?) are identical for both user types — only the outcome (generate-to-test vs. generate-to-train) differs.

**Trade-offs:**
- Pro: One component to maintain, consistent visual language
- Con: If the two paths diverge significantly (e.g., employer gets company field, seeker gets level selector), prop explosion risk

**Revisit trigger:** If the wizard content diverges beyond 2–3 conditional fields.

---

### Decision 5: In-Memory Scenario State (No Persistent Sessions)

**Decision:** Scenario generation results and sim state live in memory (React Query cache + component state). No server-side session persistence.

**Rationale:** Simplifies the backend significantly. If the user refreshes during a sim, they lose progress — acceptable for a demo. The `sessionStorage` pattern (used by `EmployerOnboardingPage`) is the maximum persistence needed.

**Trade-offs:**
- Pro: No session management, no backend complexity
- Con: Refreshing mid-simulation loses all state

**Revisit trigger:** When users report losing simulation progress as a real frustration (vs. a minor inconvenience).

---

### Decision 6: OpenAI API Calls via Existing Server Proxy

**Decision:** Scenario generation calls go through the existing `artifacts/api-server/` Express proxy (which holds the API key server-side), not directly from the client.

**Rationale:** API key security. The existing architecture already handles this — `useGenerateCustomScenario` from `@workspace/api-client-react` POSTs to the local API server.

**No change needed here** — this decision is already correctly implemented. Just preserve it when wiring the employer flow to scenario generation.

---

### Decision 7: Wouter (not React Router) for Routing

**Decision:** The app uses `wouter` for client-side routing, not `react-router-dom`.

**Rationale:** Inherited from the project scaffold. Wouter is lightweight and functional.

**Impact on development:** `useLocation()` returns `[pathname, navigate]`. No `<Link>` imports from react-router. Keep this consistent — don't mix routing libraries.

---

## 📐 Build Order

Sequenced task list with effort estimates and dependency callouts. Organized into three horizons: **Demo** (2 days), **MVP** (employer-first), and **Post-MVP** (job seeker depth).

> **Legend:** Effort in engineer-hours (solo developer). (P) = parallelizable.

---

### 🎬 Demo Sprint — Days 1–2 (ship in 48 hours)

| # | Task | Effort | Depends On |
|---|---|---|---|
| D.1 | Build `LandingPage` at `/` — two cards: employer / job seeker | 2h | — |
| D.2 | Pre-fill employer onboarding with canned blurb + pre-selected skills | 1h | — |
| D.3 | Build `/employer/canvas` skeleton — split-pane layout, Overview tab only | 3h | — |
| D.4 | Implement fake "Generate" flow: 3s loading animation → reveal pre-built scenario | 2h | D.3 |
| D.5 | Populate Overview tab with pre-built scenario (title, premise, decisions, skills) | 2h | D.3, D.4 |
| D.6 | Add Live Preview tab — iframe embedding existing `/sim` with employer banner | 2h | D.3 |
| D.7 | Add "Get Challenge Link" button — encodes payload, copies to clipboard, shows toast | 1h | D.5 |
| D.8 | Build `ChallengePage` at `/challenge` — decodes URL, shows orientation screen, routes to `/sim` | 2h | D.7 |
| D.9 | Manual QA: full employer flow + challenge link → job seeker flow | 1h | All |

**Total demo effort: ~16 engineer-hours (~2 days)**  
**Exit criteria:** Demo script (below) runs without errors end-to-end.

#### Demo Script (10 min)

```
Employer half (~6 min):
1. / → "I'm hiring" → employer onboarding (pre-filled, just click through)
2. Constellation → review skill map → "Generate challenge"
3. Canvas: 3s loading → pre-built scenario appears in Overview tab
4. Flip to Live Preview → show full simulator as candidate would see it
5. "Get Challenge Link" → toast "Link copied — paste it anywhere you hire"

Job seeker half (~4 min):
6. Paste the link into the browser → /challenge?d=... → orientation screen
7. "Start challenge" → run the simulation → debrief
```

---

### 🐛 Phase 0 — Bug Fix (first thing in MVP sprint)

| # | Task | Effort | Depends On |
|---|---|---|---|
| 0.1 | Wire `ConstellationPage` → `useGenerateCustomScenario` → `/employer/canvas` | 3h | Demo done |
| 0.2 | Add loading + error state to "Generate challenge" button | 1h | 0.1 |
| 0.3 | QA: real generation end-to-end | 1h | 0.2 |

**Exit criteria:** Real AI generation fires from employer onboarding. No hardcoded scenario in production path.

---

### 🎨 Phase 1 — Full Employer Canvas (MVP)

| # | Task | Effort | Depends On |
|---|---|---|---|
| 1.1 | Refinement sidebar — conversation history + text input + regenerate | 1d | 0.3 |
| 1.2 | Quick-action chips (Make harder, Add red herrings, Change tech stack…) | 0.5d | 1.1 |
| 1.3 | Auto-snap to Overview tab on regenerate; diff highlight on changed fields | 0.5d | 1.1 |
| 1.4 | Full-screen flip animation between Overview and Live Preview tabs | 0.5d | D.6 |
| 1.5 | Constellation coverage mode — Core / Partial / Gap nodes | 1d | 0.3 |
| 1.6 | "Copy candidate link" CTA on ConstellationPage | 0.5d | 1.5 |

**Exit criteria:** Employer can refine scenario through multiple iterations, flip to live preview, see coverage gaps in constellation, publish.

---

### 🏢 Phase 2 — Employer Hub + Challenge Links (MVP)

| # | Task | Effort | Depends On |
|---|---|---|---|
| 2.1 | `EmployerHubPage` at `/employer/hub` — role card list with link log | 1d | 1.6 |
| 2.2 | "New role" → wizard with company pre-filled | 0.5d | 2.1 |
| 2.3 | "Duplicate + Elevate" on role cards (seniority variants) | 0.5d | 2.1 |
| 2.4 | "Get new link" per role — regenerates payload, logs timestamp | 0.5d | 2.1 |
| 2.5 | "View results stub" panel per role (placeholder for future submissions) | 0.5d | 2.1 |

**Exit criteria:** Employer manages multiple roles from hub. Each role shows a link log. "Get new link" copies a fresh challenge URL to clipboard.

---

### 🎓 Phase 3 — Job Seeker Loop *(post-MVP)*

| # | Task | Effort | Depends On |
|---|---|---|---|
| 3.1 | Shared onboarding wizard — `mode` prop fork (employer vs. seeker) | 1d | 2.6 |
| 3.2 | Level selector (1–4) with difficulty prompt injection | 1d | 3.1 |
| 3.3 | `src/lib/portfolio.ts` — read/write/export helpers | 0.5d | — (P) |
| 3.4 | Write `CompletionRecord` to localStorage on debrief dismiss | 0.5d | 3.3 |
| 3.5 | Level unlock logic | 0.25d | 3.4 |

---

### 🌟 Phase 4 — Portfolio *(post-MVP)*

| # | Task | Effort | Depends On |
|---|---|---|---|
| 4.1 | `PortfolioPage` at `/portfolio` — constellation + mission log | 1d | 3.4 |
| 4.2 | Portfolio constellation mode (nodes light up from completions) | 1d | 4.1 |
| 4.3 | "Share portfolio" → base64 URL → clipboard | 0.5d | 3.3 |
| 4.4 | Read-only portfolio view at `/portfolio/view?data=` | 0.5d | 4.3 |
| 4.5 | Portfolio shareable URL at `/portfolio/view?data=` | 0.5d | 4.3 |

---

### Total Estimated Effort

| Horizon | Sprint | Focus | Effort |
|---|---|---|---|
| **Demo** | Demo Sprint | Landing + canvas (hardcoded) + challenge link | ~2 days |
| **MVP** | Phase 0 | Real generation wired | 0.5d |
| **MVP** | Phase 1 | Full employer canvas + challenge link | 3.5d |
| **MVP** | Phase 2 | Employer hub + link management | 3d |
| **Post-MVP** | Phase 3 | Job seeker onboarding + levels | 2.75d |
| **Post-MVP** | Phase 4 | Portfolio system | 3d |
| | **Total post-demo** | | **~13 engineer-days** |

---

## 🗒️ Demo Notes

**Two demo paths to rehearse:**

1. **Employer (6 min):** Landing → onboarding (pre-filled, click through) → constellation → Generate (3s loading) → canvas Overview → flip to Live Preview → "Get Challenge Link" → link copied to clipboard

2. **Job seeker (4 min):** Paste link into browser → challenge orientation screen → run simulation → debrief

**Key talking points:**
- "We measure judgment, not just credentials — the interview that actually mirrors the job"
- "Employers paste this link anywhere they already hire — ATS, LinkedIn post, email. No new platform to learn."
- "The canvas is like co-authoring a challenge with an AI that already knows your role"
- "The employer doesn't define what a good response looks like — they define the situation, and Arena surfaces what the candidate actually does"

---

*This document is a living roadmap. Phases are sequenced but not time-boxed — adjust based on what you learn during each sprint. The hypotheses section should be updated with findings as you get user feedback.*
