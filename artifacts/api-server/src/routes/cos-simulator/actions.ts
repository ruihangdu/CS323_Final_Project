import { mutateState, makeEvent, addFeedEvent } from "./state";
import type { CosSimulatorState } from "./state";

type ActionSeverity = "good" | "warning" | "bad" | "info";

interface ActionResult {
  message: string;
  severity: ActionSeverity;
  state: CosSimulatorState;
}

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const ACTION_HANDLERS: Record<string, () => ActionResult> = {
  PAUSE_BRAND_POST: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.brandPostPaused) {
        message = "Brand post already paused.";
        severity = "info";
        return;
      }
      s.brandPostPaused = true;
      s.score.crisisContainment = Math.min(20, s.score.crisisContainment + 8);
      addFeedEvent(makeEvent(now(), "Content Scheduler", "MegaCorp brand post paused — auto-publish cancelled. Disaster averted.", "good"));
      message = "MegaCorp brand post paused. The sponsored post will not go live during the crisis. Well done — this was the most urgent action.";
    });
    return { message, severity, state };
  },

  BRIEF_CREATOR: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.creatorBriefed) {
        message = "Creator already briefed.";
        severity = "info";
        return;
      }
      s.creatorBriefed = true;
      s.score.creatorSupport = Math.min(20, s.score.creatorSupport + 10);
      s.score.crisisContainment = Math.min(20, s.score.crisisContainment + 4);
      addFeedEvent(makeEvent(now(), "Creator Channel", "Creator briefed. They understand the situation and agreed to hold off on any public response.", "good"));
      message = "Creator briefed. They've been given talking points, reassurance, and a clear directive: no solo social media responses until we have a strategy. They're anxious but cooperative.";
    });
    return { message, severity, state };
  },

  CONTACT_AGENCY: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.agencyContacted) {
        message = "Agency already contacted.";
        severity = "info";
        return;
      }
      s.agencyContacted = true;
      s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 8);
      addFeedEvent(makeEvent(now(), "Agency", "Agency looped in. PR team aligning on messaging strategy and reviewing statement draft.", "good"));
      message = "Agency contacted. PR team is reviewing the situation and aligning on messaging. They'll have a draft statement within the hour. Good coordination move.";
    });
    return { message, severity, state };
  },

  REVIEW_CONTRACTS: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.contractsReviewed) {
        message = "Contracts already reviewed.";
        severity = "info";
        return;
      }
      s.contractsReviewed = true;
      s.score.investigation = Math.min(20, s.score.investigation + 5);
      s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 3);
      addFeedEvent(makeEvent(now(), "Legal Team", "Contracts reviewed. MegaCorp morality clause identified — 6-hour first-response window active.", "warning"));
      message = "Contracts reviewed. Critical finding: MegaCorp's Clause 7.5 gives us 6 hours from notification (until 15:47) to initiate outreach and preserve the right-of-first-response. This is a hard deadline.";
    });
    return { message, severity, state };
  },

  PULL_CLIP_ARCHIVE: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.clipContextChecked) {
        message = "Clip archive already reviewed. The creator was clearly being sarcastic — the clip is deliberately decontextualized.";
        severity = "info";
        return;
      }
      s.clipContextChecked = true;
      s.score.investigation = Math.min(20, s.score.investigation + 8);
      addFeedEvent(makeEvent(now(), "Archive System", "Stream archive pulled. Full clip context reviewed — creator was clearly sarcastic. This is a decontextualized hit piece.", "good"));
      message = "CRITICAL FINDING: The viral clip is decontextualized. The full archive shows the creator was being sarcastic and immediately corrected themselves at timestamp 02:15:10. The clip cuts off right before the clarification. This is NOT a genuine controversy — it's a misrepresentation. Do NOT apologize. Provide context instead.";
    });
    return { message, severity, state };
  },

  ISSUE_APOLOGY_IMMEDIATELY: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      const clipChecked = s.clipContextChecked;
      s.statementIssued = true;
      s.apologyIssued = true;

      if (!clipChecked) {
        s.statementIssuedBeforeContextChecked = true;
        s.score.communication = Math.max(0, s.score.communication - 5);
        s.score.crisisContainment = Math.max(0, s.score.crisisContainment - 3);
        severity = "bad";
        addFeedEvent(makeEvent(now(), "Public Statement", "PANICKED APOLOGY ISSUED before reviewing clip. Critics treating it as admission of guilt. Situation worsening.", "bad"));
        message = "MISTAKE: Apology issued before reviewing the clip archive. The creator was actually being sarcastic — this apology validates a false narrative. Critics are now using it as an admission of guilt. The 31% who were waiting for context are now confused. You made it worse.";
      } else {
        s.score.communication = Math.max(0, s.score.communication - 2);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "Public Statement", "Apology issued — but creator was being sarcastic. Audience confused about what was apologized for.", "warning"));
        message = "Apology issued — but this is the wrong response. The clip was sarcasm, not genuine. An apology suggests the creator meant what they said. Even knowing the context, an apology here validates the misrepresentation. A context-setting statement would have been stronger.";
      }
    });
    return { message, severity: severity!, state };
  },

  CONTACT_MEGACORP_PROACTIVELY: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      if (s.megaCorpReachedOut) {
        message = "MegaCorp already contacted.";
        severity = "info";
        return;
      }
      s.megaCorpReachedOut = true;

      const hasContext = s.clipContextChecked;
      const hasContracts = s.contractsReviewed;

      if (hasContext && hasContracts) {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 10);
        severity = "good";
        addFeedEvent(makeEvent(now(), "MegaCorp", "Proactive outreach acknowledged. MegaCorp Brand Team: 'We appreciate the context. We're reviewing. Deal status: monitoring.'", "good"));
        message = "Excellent. MegaCorp contacted proactively with full clip context and a clear explanation. Clause 7.5 right-of-first-response preserved. MegaCorp's brand team is reviewing — this preserves the deal and demonstrates professional crisis management.";
      } else if (hasContracts && !hasContext) {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 5);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "MegaCorp", "Outreach initiated. MegaCorp awaiting full context from you. Clock preserved but messaging incomplete.", "warning"));
        message = "MegaCorp contacted — clock preserved on Clause 7.5. However, you haven't pulled the clip archive yet, so you couldn't provide the full context. MegaCorp is still awaiting a substantive response. Pull the archive next.";
      } else {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 3);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "MegaCorp", "Outreach initiated. MegaCorp acknowledged. Still awaiting context and contract understanding.", "warning"));
        message = "MegaCorp contacted — better than silence, but without reviewing the clip archive and contract first, your outreach lacks substance. MegaCorp wants context, not just a check-in call. Review the archive and contracts.";
      }
    });
    return { message, severity: severity!, state };
  },

  ISSUE_MEASURED_STATEMENT: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      if (s.statementIssued) {
        message = "A statement has already been issued.";
        severity = "info";
        return;
      }
      s.statementIssued = true;

      const clipChecked = s.clipContextChecked;
      const agencyLooped = s.agencyContacted;

      if (clipChecked && agencyLooped) {
        s.score.communication = Math.min(10, s.score.communication + 10);
        s.score.crisisContainment = Math.min(20, s.score.crisisContainment + 4);
        severity = "good";
        addFeedEvent(makeEvent(now(), "Creator Social", "Measured context statement published. Community response: 67% positive, narrative reversing.", "good"));
        message = "Perfect execution. A clear, factual context statement was published — citing the full timestamp, the sarcasm, and the immediate correction. Agency-coordinated messaging is landing well. The 31% 'waiting for context' audience is responding positively. Narrative is shifting.";
      } else if (clipChecked) {
        s.score.communication = Math.min(10, s.score.communication + 6);
        severity = "good";
        addFeedEvent(makeEvent(now(), "Creator Social", "Context statement published. Good, but agency wasn't looped in for coordination.", "good"));
        message = "Good: measured statement with full clip context published. Would have been stronger with agency coordination for messaging consistency, but the core content is right. The creator was being sarcastic — stating that clearly is the correct move.";
      } else {
        s.score.communication = Math.max(0, s.score.communication - 2);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "Creator Social", "Statement published but without reviewing the clip context first. Messaging is vague.", "warning"));
        message = "Statement issued without reviewing the clip archive first. The statement is vague because you don't know the full context. Audiences and media will notice the evasiveness. Pull the archive before communicating — you may need to issue a correction.";
      }
    });
    return { message, severity: severity!, state };
  },

  ACTIVATE_LEGAL: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.legalConsulted) {
        message = "Legal already activated.";
        severity = "info";
        return;
      }
      s.legalConsulted = true;
      s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 5);
      s.score.prevention = Math.min(10, s.score.prevention + 3);
      addFeedEvent(makeEvent(now(), "Legal Counsel", "Entertainment lawyer activated. Reviewing MegaCorp morality clause and advising on statement language.", "good"));
      message = "Legal activated. Entertainment lawyer is reviewing the MegaCorp morality clause and advising on statement language to avoid inadvertent admission of liability. Good protective move — any public statement should be cleared by legal during a live sponsorship dispute.";
    });
    return { message, severity, state };
  },

  CLOSE_INCIDENT: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      s.incidentClosed = true;

      const hasContext = s.clipContextChecked;
      const hasStatement = s.statementIssued;
      const hasMegaCorp = s.megaCorpReachedOut;
      const creatorOk = s.creatorBriefed;

      const closedStrong = hasContext && hasStatement && hasMegaCorp && creatorOk;
      const closedEarly = !hasContext || !hasStatement;

      if (closedStrong && !s.statementIssuedBeforeContextChecked) {
        s.score.prevention = Math.min(10, s.score.prevention + 4);
        s.score.communication = Math.min(10, s.score.communication + 0);
        severity = "good";
        addFeedEvent(makeEvent(now(), "Incident Command", "Incident resolved. Narrative corrected, MegaCorp engaged, creator supported. Deal preserved.", "good"));
        message = "Excellent crisis management. The situation is under control: clip context established, measured statement issued, MegaCorp engaged proactively, and creator supported. The deal is preserved and the narrative has shifted.";
      } else if (closedEarly) {
        s.score.communication = Math.max(0, s.score.communication - 2);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "Incident Command", "Incident closed prematurely. Key actions incomplete. Residual risk remains.", "warning"));
        message = "Incident closed, but several critical actions are incomplete. The clip archive was never reviewed, or a public statement was never issued. The underlying crisis may resurface without these resolved.";
      } else {
        severity = "good";
        addFeedEvent(makeEvent(now(), "Incident Command", "Incident closed. Most key actions taken. Minor gaps remain.", "good"));
        message = "Incident closed. Most critical actions were completed. Some gaps (e.g., MegaCorp contact, legal activation) may leave residual risk, but the core crisis has been managed.";
      }

      s.debrief = generateDebrief(s);
    });
    return { message, severity: severity!, state };
  },
};

function generateDebrief(s: CosSimulatorState): string {
  const total = s.totalScore;
  const lines: string[] = [];

  lines.push(`Overall Score: ${total}/100`);
  lines.push("");
  lines.push("The Viral Spiral — After Action Report");
  lines.push("=======================================");
  lines.push("");

  lines.push("Key Decision: Did you review the clip before acting?");
  if (s.clipContextChecked && !s.statementIssuedBeforeContextChecked) {
    lines.push(
      "YES — and you handled it correctly. Pulling the clip archive first revealed the creator was being sarcastic. You avoided issuing an apology that would have validated a false narrative. This is the most important judgment call in this scenario."
    );
  } else if (s.statementIssuedBeforeContextChecked) {
    lines.push(
      "NO — and it hurt you. You issued an apology before reviewing the archive. The clip showed the creator was being sarcastic — your panicked apology validated a misrepresentation and confused the audience who were waiting for context. Always review before responding."
    );
  } else {
    lines.push(
      "NOT CHECKED — the clip archive was never reviewed. The key clue was in /archive/stream-clip-context.txt: the creator was clearly being sarcastic and the clip was deliberately cut to remove the punchline and immediate correction."
    );
  }

  lines.push("");
  lines.push("Crisis Containment:");
  const containment = [
    s.brandPostPaused && "Paused the MegaCorp brand post (critical — would have been catastrophic)",
    s.creatorBriefed && "Briefed the creator and prevented solo social media responses",
  ].filter(Boolean);
  if (containment.length > 0) {
    lines.push(`You took the following containment actions: ${containment.join(". ")}.`);
  } else {
    lines.push(
      "No containment actions taken. The MegaCorp brand post may have auto-published during the crisis, and the creator may have responded solo without guidance — both of which escalate PR fires significantly."
    );
  }

  lines.push("");
  lines.push("Stakeholder Management:");
  if (s.megaCorpReachedOut && s.contractsReviewed) {
    lines.push(
      "Excellent. You reviewed the MegaCorp contract (discovering the Clause 7.5 6-hour first-response window) and contacted them proactively. This preserved the deal's right-of-first-response and demonstrated professional crisis management. The $240K deal is likely safe."
    );
  } else if (s.megaCorpReachedOut) {
    lines.push(
      "You contacted MegaCorp, which was right. However, you hadn't reviewed the contract first — missing the critical detail that Clause 7.5 gives a 24-hour response window IF you initiate within 6 hours. Knowing this would have shaped your outreach more effectively."
    );
  } else if (s.contractsReviewed) {
    lines.push(
      "You reviewed the contracts and identified the morality clause — but never contacted MegaCorp. The Clause 7.5 6-hour window to preserve the right-of-first-response may have lapsed. The $240K deal is at significant risk."
    );
  } else {
    lines.push(
      "Neither contracts reviewed nor MegaCorp contacted. The 6-hour Clause 7.5 window in the MegaCorp contract (discovered via /contracts/megacorp-deal.pdf) has likely lapsed. The $240K deal is at risk of termination without recourse."
    );
  }

  lines.push("");
  lines.push("Creator Support:");
  if (s.creatorBriefed) {
    lines.push(
      "You briefed the creator promptly. They had the information and guidance they needed to stay calm and not escalate. Creator welfare is a core CoS responsibility — well handled."
    );
  } else {
    lines.push(
      "The creator was not briefed. A panicked creator going solo on social media during a PR fire is the most common escalation path. Checking creator.sentiment and briefing them early is a core CoS function."
    );
  }

  lines.push("");
  lines.push("Missed Clues:");
  const missed: string[] = [];
  if (!s.commandsRun.some((c) => c.includes("archive/stream-clip-context"))) {
    missed.push(
      "cat /archive/stream-clip-context.txt — The full clip showed the creator was being sarcastic. Timestamp 02:15:10 contains the clarification that the viral clip deliberately omitted. This was the most important clue."
    );
  }
  if (!s.commandsRun.some((c) => c.includes("megacorp-deal"))) {
    missed.push(
      "cat /contracts/megacorp-deal.pdf — Clause 7.5 gives a 24-hour response window IF you initiate contact within 6 hours of notification. This deadline was ticking from 09:47."
    );
  }
  if (!s.commandsRun.some((c) => c.includes("calendar/today"))) {
    missed.push(
      "cat /calendar/today.json — A sponsored MegaCorp post was scheduled to auto-publish at 11:00 AM. This was the most time-sensitive operational risk and needed to be paused immediately."
    );
  }
  if (!s.commandsRun.some((c) => c.includes("creator.sentiment"))) {
    missed.push(
      "check creator.sentiment — The creator was anxious and reading comments without guidance. Checking this would have revealed the urgency of briefing them before they acted independently."
    );
  }
  if (missed.length > 0) {
    lines.push(...missed);
  } else {
    lines.push("You reviewed all key evidence before acting — excellent investigative methodology.");
  }

  lines.push("");
  lines.push("Recommended next challenge:");
  lines.push(
    "The Brand Deal Collapse — a major sponsor terminates mid-campaign over a genuine controversy. Navigate the fallout, negotiate an exit, and rebuild sponsor confidence from scratch."
  );

  return lines.join("\n");
}

export function handleAction(action: string): ActionResult {
  const handler = ACTION_HANDLERS[action];
  if (!handler) {
    const state = mutateState(() => {});
    return {
      message: `Unknown action: ${action}`,
      severity: "info",
      state,
    };
  }
  return handler();
}
