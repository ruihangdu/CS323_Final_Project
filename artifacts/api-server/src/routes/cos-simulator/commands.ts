import { v4 as uuidv4 } from "uuid";
import { mutateState, addFeedEvent } from "./state";
import type { FeedEventType } from "./state";

function makeEvent(time: string, source: string, message: string, type: FeedEventType = "info") {
  return { id: uuidv4(), time, source, message, type };
}

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const COMMANDS: Record<string, () => string> = {
  help: () => `Available commands:
  help                                    Show this help message
  check social.metrics                    Current viral clip stats and reach
  check brand.deals.at.risk               Active sponsor deals and financial exposure
  check social.sentiment                  Current audience sentiment analysis
  check creator.sentiment                 Creator's current emotional state
  cat /contracts/megacorp-deal.pdf        MegaCorp sponsorship contract (morality clause)
  cat /contracts/freshbrand-deal.pdf      FreshBrand sponsorship contract
  cat /calendar/today.json                Today's scheduled content calendar
  cat /archive/stream-clip-context.txt    Full unedited clip from the stream (KEY CLUE)
  cat /emails/agency-morning-brief.txt    This morning's agency brief
  cat /runbooks/crisis-comms.md           Crisis communications runbook`,

  "check social.metrics": () => {
    mutateState((s) => {
      s.score.investigation = Math.min(20, s.score.investigation + 2);
      if (!s.commandsRun.includes("check social.metrics")) {
        s.commandsRun.push("check social.metrics");
      }
    });
    return `SOCIAL METRICS — Live Dashboard
================================
Clip source: stream-archive-2025-11-14-segment-4
Platform:    Twitter / X
Status:      VIRAL — accelerating

  Views:      52,400  (↑ +28K in last 22 minutes)
  Reposts:    4,100
  Quote posts: 2,900  ← 71% negative commentary
  Replies:    6,200
  Reach est:  ~380K accounts

Top hashtags forming:
  #[CreatorName]Exposed  — 1.2K uses
  #cancelculture         — 890 uses
  #CancelCreator         — 620 uses

Cross-platform spread:
  Reddit r/LivestreamFail: 18K upvotes, top post
  TikTok duets: 34 videos posted
  YouTube commentary: 3 channels reacting live

Velocity: doubling every ~25 minutes at current rate.
Estimated peak reach if unaddressed: 2–4M impressions by end of day.`;
  },

  "check brand.deals.at.risk": () => {
    mutateState((s) => {
      s.score.investigation = Math.min(20, s.score.investigation + 3);
      if (!s.commandsRun.includes("check brand.deals.at.risk")) {
        s.commandsRun.push("check brand.deals.at.risk");
      }
    });
    return `ACTIVE BRAND DEALS — Risk Assessment
======================================
Deal            Value (annual)  Status         Risk
MegaCorp        $240,000        ON HOLD ⚠️     CRITICAL
FreshBrand      $48,000         Active         LOW
NutrifyMe       $22,000         Active         LOW
GamerGear Pro   $15,000/mo      Active         MEDIUM

MegaCorp details:
  Contract signed: 2025-09-01
  Renewal date:    2026-03-01
  Clause 7.4 (Morality): "Brand partner may terminate within 72 hours
  of any public controversy materially affecting brand perception."
  72-hour window: STARTED — expires ~09:47 tomorrow.
  Clause 7.5: Creator has 6 hours from notification to initiate outreach
  to preserve the right-of-first-response window.
  *** DEADLINE TO INITIATE CONTACT: 15:47 TODAY ***

Immediate exposure: $240,000 deal at risk.
Q4 content calendar includes 3 MegaCorp integration posts worth ~$60K in bonuses.

ACTION REQUIRED: MegaCorp has reached out and is awaiting response.`;
  },

  "check social.sentiment": () => {
    mutateState((s) => {
      s.score.investigation = Math.min(20, s.score.investigation + 2);
      if (!s.commandsRun.includes("check social.sentiment")) {
        s.commandsRun.push("check social.sentiment");
      }
    });
    return `SENTIMENT ANALYSIS — Real-Time
================================
Overall sentiment: NEGATIVE (trending)

Breakdown:
  Strongly negative: 52%
  Mildly negative:   24%
  Neutral:           18%
  Positive:           6%

Most common audience frames:
  "They were clearly being serious" — 38% of critics
  "Out of character but wait for context" — 31%
  "Old clip, unfair framing" — 22%
  "This is cancel culture at work" — 9%

Key observation: A significant minority (31%) is WAITING for the
creator to explain context. The audience is NOT uniformly hostile —
there is a window to provide context and turn the tide.

Note: 22% already suspect the clip is being misrepresented.
This segment will amplify any clarification if handled correctly.

Sentiment is NOT yet at a point of no return. Timing matters.`;
  },

  "check creator.sentiment": () => {
    mutateState((s) => {
      s.score.creatorSupport = Math.min(20, s.score.creatorSupport + 3);
      if (!s.commandsRun.includes("check creator.sentiment")) {
        s.commandsRun.push("check creator.sentiment");
      }
    });
    return `CREATOR STATUS — Pastoral Check
=================================
Last message from creator (09:54):
  "What is happening? I'm getting flooded with notifications. 
   I don't even remember saying that. This feels like it's 
   out of context but I don't know what clip they're using."

Status indicators:
  📱 Currently online — has seen 200+ notifications
  😰 Anxiety level: HIGH — needs active support
  📺 Stream scheduled for 18:00 tonight — 6 hours away
  🎯 Is NOT aware of MegaCorp deal being on hold yet

Creator's current state:
  - Confused and anxious
  - Has NOT reviewed the clip yet
  - Is reading comments — this is increasing distress
  - Has NOT issued any public statement yet (good — don't rush)

RECOMMENDATION: Brief the creator before they act independently.
If creator self-responds without CoS guidance, they may say something
that escalates the situation. You have a window — use it.`;
  },

  "cat /contracts/megacorp-deal.pdf": () => {
    mutateState((s) => {
      if (!s.contractsReviewed) {
        s.contractsReviewed = true;
        s.score.investigation = Math.min(20, s.score.investigation + 5);
      }
      if (!s.commandsRun.includes("cat /contracts/megacorp-deal.pdf")) {
        s.commandsRun.push("cat /contracts/megacorp-deal.pdf");
      }
    });
    return `MEGACORP SPONSORSHIP AGREEMENT
Contract ID: MC-2025-0901-CREATOR
Effective: September 1, 2025 | Renewal: March 1, 2026
Annual Value: $240,000 + performance bonuses

...

CLAUSE 7 — BRAND CONDUCT AND MORALITY
7.1 Creator agrees to maintain professional conduct consistent with 
    MegaCorp's family-friendly brand values throughout the term.
7.3 Creator shall not make statements that MegaCorp, at its sole 
    discretion, deems harmful to its brand reputation.
7.4 TERMINATION FOR CAUSE: MegaCorp may terminate this agreement 
    within 72 hours of a publicly disclosed controversy or statement 
    materially affecting MegaCorp's brand perception. Creator forfeits 
    any unpaid instalments upon termination for cause.
    *** 72-HOUR WINDOW IS CALCULATED FROM TIME OF MEGACORP NOTIFICATION ***
    *** MEGACORP NOTIFIED US AT 09:47. WINDOW EXPIRES TOMORROW 09:47. ***

7.5 RIGHT OF FIRST RESPONSE: Before exercising Clause 7.4, MegaCorp 
    agrees to grant Creator 24 hours to provide written context and 
    response to any controversy, PROVIDED Creator initiates outreach 
    WITHIN THE FIRST 6 HOURS of MegaCorp notification.
    *** THIS IS THE KEY: We have until 15:47 today to initiate contact ***
    *** and preserve the right to respond before termination decision. ***

...

CLAUSE 12 — DISPUTE RESOLUTION
12.1 All disputes shall be resolved through binding arbitration in
     the jurisdiction of Delaware, USA.`;
  },

  "cat /contracts/freshbrand-deal.pdf": () => {
    mutateState((s) => {
      if (!s.commandsRun.includes("cat /contracts/freshbrand-deal.pdf")) {
        s.commandsRun.push("cat /contracts/freshbrand-deal.pdf");
        s.score.investigation = Math.min(20, s.score.investigation + 1);
      }
    });
    return `FRESHBRAND PARTNERSHIP AGREEMENT
Contract ID: FB-2025-0701-CREATOR
Effective: July 1, 2025 | Auto-renewal: annual
Annual Value: $48,000

...

CLAUSE 6 — BRAND CONDUCT
6.1 Creator agrees to maintain a positive public presence consistent 
    with FreshBrand's wellness values.
6.2 FreshBrand may pause partnership activities during active 
    controversies pending resolution. Partnership is NOT automatically
    terminated — FreshBrand will evaluate on a case-by-case basis.
6.3 No morality clause for termination without prior 30-day notice 
    except in cases of criminal conduct or hate speech.

...

NOTES: FreshBrand contract is low risk. Standard conduct clause,
no aggressive morality termination provision. Monitor but not urgent.
Focus energy on MegaCorp first.`;
  },

  "cat /calendar/today.json": () => {
    mutateState((s) => {
      if (!s.commandsRun.includes("cat /calendar/today.json")) {
        s.commandsRun.push("cat /calendar/today.json");
        s.score.investigation = Math.min(20, s.score.investigation + 3);
      }
    });
    return JSON.stringify({
      date: "2026-05-06",
      entries: [
        {
          time: "11:00",
          type: "BRAND_POST",
          platform: "Instagram",
          sponsor: "MegaCorp",
          status: "SCHEDULED — AUTO-PUBLISH IN ~73 MINUTES ⚠️",
          caption: "So grateful to @MegaCorp for making my mornings better! Use code CREATOR for 20% off. #ad #MegaCorp",
          note: "CRITICAL: Do NOT let this auto-publish. A sponsored MegaCorp post during an active controversy signals business as usual and will enrage the audience."
        },
        {
          time: "14:00",
          type: "YOUTUBE_VIDEO",
          status: "DRAFT — not scheduled",
          title: "Q&A: You asked, I answered",
          note: "Safe to delay. No urgency."
        },
        {
          time: "18:00",
          type: "LIVE_STREAM",
          status: "SCHEDULED",
          note: "Decision needed: stream or delay? If clip context is clear, a live response stream could be powerful. Delay if not resolved."
        },
        {
          time: "20:00",
          type: "BRAND_POST",
          platform: "TikTok",
          sponsor: "NutrifyMe",
          status: "SCHEDULED",
          note: "Low risk — NutrifyMe deal has no aggressive morality clause. Can proceed if situation is controlled."
        }
      ]
    }, null, 2);
  },

  "cat /archive/stream-clip-context.txt": () => {
    mutateState((s) => {
      if (!s.clipContextChecked) {
        s.clipContextChecked = true;
        s.score.investigation = Math.min(20, s.score.investigation + 8);
        addFeedEvent(makeEvent(now(), "CoS Terminal", "Clip archive reviewed — creator was clearly being sarcastic. Full context recovered.", "good"));
      }
      if (!s.commandsRun.includes("cat /archive/stream-clip-context.txt")) {
        s.commandsRun.push("cat /archive/stream-clip-context.txt");
      }
    });
    return `STREAM ARCHIVE — November 14, 2025
Segment 4 of 6 | Timestamp: 02:14:33 – 02:17:45

FULL TRANSCRIPT (surrounding context):

[02:14:10] Creator: "Chat, okay, we are deep in the fan mail rabbit hole tonight."
[02:14:22] Creator: "Someone sent me this — okay, I have to read this..."
[02:14:35] Creator: "They're asking me if I think [controversial topic]..."
[02:14:55] Creator: "...Oh sure, yeah, OBVIOUSLY I think [controversial statement]. 
             [turns to camera with exaggerated face] 
             Absolutely. One hundred percent. That is definitely my real opinion."
             [audible laughter, chat reacting with LOL and KEK emotes]
[02:15:10] Creator: "No, okay, I'm being sarcastic. I don't think that at all. 
             That's a wild thing to even ask."
[02:15:35] Creator: "Chat you know me better than this."
[02:15:48] [Chat screenshot shows 90% laughing/positive emotes during the statement]

*** THE VIRAL CLIP CUTS FROM 02:14:55 TO 02:15:05 ***
*** The clip REMOVES: the laughing tone, the exaggerated face, and the ***
*** immediate sarcasm clarification at 02:15:10. ***

VERDICT: The clip is deliberately decontextualized. The creator was clearly
being sarcastic and immediately walked it back. The clip was edited to remove
the punchline and the correction.

This changes everything about how to respond:
- An immediate apology would validate the misrepresentation
- The correct response is calm context-setting, not an apology
- Share the full clip timestamp as evidence
- The 31% "waiting for context" audience will flip positive with this evidence

RECOMMENDED RESPONSE FRAME:
"The clip circulating is missing critical context. Here is what actually
happened at timestamp [02:14:10–02:15:35]..." + link to full VOD`;
  },

  "cat /emails/agency-morning-brief.txt": () => {
    mutateState((s) => {
      if (!s.commandsRun.includes("cat /emails/agency-morning-brief.txt")) {
        s.commandsRun.push("cat /emails/agency-morning-brief.txt");
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 2);
      }
    });
    return `FROM: talent@topagency.com
TO: creator-cos@management.co
SUBJECT: Morning Brief — May 6
DATE: 09:15 AM

Hi,

Morning rundown for today:

1. MegaCorp — Q2 integration deliverables on track. Reminder that 
   the morality clause window in the contract is 72h from notification.
   Their brand team is unusually thorough so keep the deal happy.

2. FreshBrand — renewal discussions starting next month. They're happy.

3. Stream schedule — good momentum. Keep it up.

4. Media inquiry — GamingWeekly wants a profile piece. Will follow up.

---
[Received at 09:52 AM — URGENT FOLLOW-UP]

We've seen the Twitter situation. We're monitoring closely.

Do NOT let your creator go rogue on this. We should talk strategy ASAP.
Call us — we've handled PR fires before. Do NOT issue any public statements
before we've aligned on messaging. Happy to draft language together.

Key concerns:
- MegaCorp's 6-hour first-response window in Clause 7.5
- Scheduled brand post at 11:00 must be paused immediately
- Creator needs to be advised NOT to respond solo on social

Call us.

— The Agency Team`;
  },

  "cat /runbooks/crisis-comms.md": () => {
    mutateState((s) => {
      if (!s.commandsRun.includes("cat /runbooks/crisis-comms.md")) {
        s.commandsRun.push("cat /runbooks/crisis-comms.md");
        s.score.prevention = Math.min(10, s.score.prevention + 3);
      }
    });
    return `# Creator HQ — Crisis Communications Runbook

## FIRST 30 MINUTES (Critical window)

### Step 1: STOP automatic content publishing
Any sponsored content auto-publishing during a crisis = career-limiting move.
Immediately pause all scheduled brand posts. Check the content calendar.

### Step 2: Get full context BEFORE acting
Never issue a statement about content you haven't personally reviewed.
Pull the archive. Watch the full clip. Know what you're actually dealing with.

### Step 3: Brief the creator — do NOT let them go solo
Creator should NOT respond independently in the first hour.
They need: facts, talking points, reassurance, and a decision framework.
Panic responses from creators are the #1 escalation cause.

### Step 4: Triage sponsors by exposure
- Review contracts for morality clauses and termination windows
- Contact high-exposure sponsors within their first-response windows
- Silence reads as guilt — controlled early outreach is always better

### Step 5: Activate legal for any sponsorship with a termination clause
Morality clause invocation is a legal event. Get legal eyes on it now.

## STATEMENT GUIDANCE

### If clip is out of context:
- Do NOT apologize for something the creator didn't mean
- Provide the full context calmly and factually
- Share timestamps, link to the full stream
- Tone: clear, not defensive, not apologetic
- "Here is what actually happened" > "I'm so sorry"

### If the clip is genuine:
- Apologize sincerely and specifically
- Do not over-explain or justify
- Commit to better behavior
- Give sponsors advance warning before public statement

### Timing:
- Issue a holding statement within 2 hours if full context not ready
- Full measured statement within 4-6 hours
- Do NOT issue a rushed statement

## COMMON MISTAKES
❌ Issuing an apology before reviewing the content
❌ Letting the creator respond unguided to social media
❌ Posting sponsored content during active controversy
❌ Ignoring or delaying sponsor outreach
❌ Treating all sponsors equally (triage by contract terms)`;
  },
};

export function handleCommand(command: string): string {
  const trimmed = command.trim();

  const key = Object.keys(COMMANDS).find(k =>
    trimmed.toLowerCase() === k.toLowerCase() ||
    trimmed.toLowerCase().startsWith(k.toLowerCase())
  );

  const fn = key ? COMMANDS[key] : undefined;
  if (fn) {
    return fn();
  }

  return `bash: ${trimmed}: command not found
Type 'help' to see available commands.`;
}
