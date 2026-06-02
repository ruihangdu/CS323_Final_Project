# Arena Demo — Canned Content

Copy-paste these into the onboarding wizard during the demo.

---

## Step 1 — Role & Company

| Field | Value |
|-------|-------|
| **Role** | Site Reliability Engineer *(only option in dropdown)* |
| **Company** | Acme Corp |

---

## Step 2 — Work Context

Paste this into the context textarea:

```
Our business runs millions of dollars of transactions through services deployed on Kubernetes. When something breaks — and it will — we need someone who can debug fast, trace the root cause under pressure, and make the right call about how to bring things back up without making it worse. The judgment we care about most is doing the right thing when the clock is ticking and the stakes are real.
```

---

## Step 3 — Skills

Click these skills one by one (or type them as custom skills if not shown):

1. Debugging under pressure
2. Root-cause analysis
3. Production safety
4. Incident communication
5. On-call judgment

*(The wizard allows up to 6 skills. Pick any 5 from the list above.)*

---

## Demo Flow (10 min)

**Employer half (~6 min):**
1. Go to `/` → click **"Create a challenge"**
2. Step 1: Role is pre-selected as SRE. Type company name: **"Acme Corp"** → Next
3. Step 2: Paste the context blurb above → Next
4. Step 3: Click the 5 skills above → Next
5. Constellation page → review skill map → click **"Generate challenge"**
6. Canvas opens → 3-second loading animation → **Wrong Address** scenario appears in Overview tab
7. Click **"Live Preview"** tab → show the full simulator as a candidate would see it
8. Click **"Get Challenge Link"** → toast: *"Challenge link copied — paste it anywhere you hire"*

**Job seeker half (~4 min):**
9. Paste the copied link into the browser address bar → `/challenge?d=...`
10. Orientation screen shows: Acme Corp · Site Reliability Engineer · ~20 min
11. Click **"Start challenge"** → existing Wrong Address simulator → complete → debrief

---

## Scenario Shown in Canvas

**Title:** Wrong Address  
**Difficulty:** MEDIUM  
**Premise:** EU customers can't complete checkout. North America unaffected. No app code deployed in 48h. A Terraform run touched infra config this morning — the answer is in the config, but it's subtle.

**Key decisions the candidate must make:**
1. Triage: Why is the failure region-specific when no code was deployed?
2. Diagnose: Trace the root cause through infrastructure config, not application logs
3. Isolate: Confirm blast radius — one service or the entire EU stack?
4. Recover: Roll back or patch forward, validate without taking EU fully offline
5. Communicate: Draft a customer-facing status update with accurate scope and ETA
