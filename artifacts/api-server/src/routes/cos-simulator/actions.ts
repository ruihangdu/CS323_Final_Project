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

function maybeFireCreatorSolo(s: CosSimulatorState): void {
  if (!s.creatorBriefed && !s.creatorPostedSolo) {
    s.creatorPostedSolo = true;
    s.score.creatorSupport = Math.max(0, s.score.creatorSupport - 6);
    addFeedEvent(makeEvent(
      now(),
      "Creator Twitter",
      "CREATOR POSTED SOLO: 'ppl asking about the clip — it was a joke lol but i get it 😬'. Uncoordinated. Mixing messages with your response.",
      "bad"
    ));
  }
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
      addFeedEvent(makeEvent(now(), "Content Scheduler", "MegaCorp brand post paused — auto-publish at 11:00 AM cancelled. Catastrophe averted.", "good"));
      message = "MegaCorp brand post paused. A sponsored post auto-publishing during this crisis would have been catastrophic — associating MegaCorp branding with the controversy. This was the single most time-sensitive operational action. Well done for catching it.";
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
      if (s.creatorPostedSolo) {
        s.creatorBriefed = true;
        s.score.creatorSupport = Math.min(20, s.score.creatorSupport + 4);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "Creator Channel", "Creator briefed — but they already posted solo. Damage control underway. Asking them to pin a follow-up.", "warning"));
        message = "Creator briefed — but too late. They already posted an uncoordinated response ('it was a joke lol but i get it 😬') which muddied your messaging. You've now asked them to pin a clarifying follow-up, but the mixed messaging is out there. Brief the creator before issuing any statement.";
        return;
      }
      s.creatorBriefed = true;
      s.score.creatorSupport = Math.min(20, s.score.creatorSupport + 12);
      s.score.crisisContainment = Math.min(20, s.score.crisisContainment + 3);
      addFeedEvent(makeEvent(now(), "Creator Channel", "Creator briefed. Talking points delivered. They've agreed to hold off any public response and trust your lead.", "good"));
      message = "Creator briefed. You've given them: (1) the situation overview, (2) specific talking points, (3) a clear directive — no solo social media responses. They're anxious but cooperative. This prevents the most common crisis escalation: a panicked creator going rogue on social media.";
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
      s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 6);
      addFeedEvent(makeEvent(now(), "Agency PR", "Agency looped in. PR team flagging: 'Do NOT apologize — looks sarcastic. We're drafting context-setting language now.'", "good"));
      message = "Agency contacted and looped in. Critical intel from the PR team: they've already reviewed the clip and believe the creator was being sarcastic. They're drafting context-setting language. Their instinct matches what the archive will confirm — coordinate your public statement with them.";
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
      addFeedEvent(makeEvent(now(), "Legal Team", "Contracts reviewed. CRITICAL: Clause 7.5 — 6-hour first-response window from 09:51. Deadline 15:51. Morality clause in play.", "critical"));
      message = "Contracts reviewed. CRITICAL FINDING: Clause 7.5 — MegaCorp has the right to terminate immediately IF you fail to initiate a substantive response within 6 hours of their notification (09:51). Your deadline is 15:51 today. Additionally, the morality clause could allow them to withhold the $240K final payment. You need to contact them proactively with full context before that window closes.";
    });
    return { message, severity, state };
  },

  PULL_CLIP_ARCHIVE: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.clipContextChecked) {
        message = "Archive already reviewed. Creator was clearly being sarcastic — the clip cuts off right before they correct themselves at timestamp 02:15:10.";
        severity = "info";
        return;
      }
      s.clipContextChecked = true;
      s.score.investigation = Math.min(20, s.score.investigation + 10);
      addFeedEvent(makeEvent(now(), "Archive System", "Stream archive pulled. Timestamp 02:15:10: creator immediately clarifies with punchline — clip is a deliberate decontextualized cut. NOT a real controversy.", "good"));
      message = "CRITICAL FINDING: This is a manufactured controversy. The full archive shows:\n\n• The creator was being sarcastic (this was a well-known bit)\n• At timestamp 02:15:10 — 8 seconds after the clipped moment — they immediately correct themselves with the punchline\n• The viral clip was deliberately cut to end at exactly the wrong moment\n\nDo NOT apologize. An apology validates a false narrative. Issue a context-setting statement citing timestamp 02:15:10 specifically. The 31% of commenters asking for context are your audience — give them the facts.";
    });
    return { message, severity, state };
  },

  ISSUE_APOLOGY_IMMEDIATELY: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      if (s.statementIssued) {
        message = "A statement has already been issued.";
        severity = "info";
        return;
      }
      const clipChecked = s.clipContextChecked;
      s.statementIssued = true;
      s.apologyIssued = true;

      maybeFireCreatorSolo(s);

      if (!clipChecked) {
        s.statementIssuedBeforeContextChecked = true;
        s.score.communication = Math.max(0, s.score.communication - 5);
        s.score.crisisContainment = Math.max(0, s.score.crisisContainment - 3);
        severity = "bad";
        addFeedEvent(makeEvent(now(), "Public Statement", "PANICKED APOLOGY ISSUED before reviewing archive. Critics treating it as admission of guilt. @DigitalBeat: 'Creator apologizes — confirms clip is real.' Situation worsening fast.", "critical"));
        message = "Critical mistake. You apologized without reviewing the clip archive. The creator was being sarcastic — your apology tells the world they weren't. @DigitalBeat has already published 'Creator apologizes — confirms clip is authentic.' The 31% waiting for context just got the opposite of what they needed. This will be very hard to walk back.";
      } else {
        s.score.communication = Math.max(0, s.score.communication - 2);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "Public Statement", "Apology issued — creator was being sarcastic. Audience confused: 'What are they apologizing for?' Mixed messaging.", "warning"));
        message = "Wrong response even with the context. The clip was sarcasm — apologizing implies the creator genuinely meant what they said. Your own audience is now confused. A context-setting statement citing timestamp 02:15:10 would have been far more effective. You've validated a false narrative even knowing the truth.";
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
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 8);
        severity = "good";
        addFeedEvent(makeEvent(now(), "MegaCorp", "Proactive outreach: full clip context shared. MegaCorp Brand Team: 'We appreciate the context. Clause 7.5 clock preserved. Deal: monitoring, not terminating.'", "good"));
        message = "Strong move. You contacted MegaCorp with the full clip context (timestamp 02:15:10, sarcasm, deliberate cut) and showed them you've reviewed the contracts. Clause 7.5 first-response window is now preserved. MegaCorp's brand team is satisfied you're handling this professionally. Next step: negotiate the deal terms to formally protect the $240K.";
      } else if (hasContracts && !hasContext) {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 4);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "MegaCorp", "Outreach initiated. Clause 7.5 clock preserved. But MegaCorp wants substantive context — 'What actually happened in the clip?'", "warning"));
        message = "You preserved the Clause 7.5 window — good. But you haven't pulled the clip archive, so you couldn't give MegaCorp the specific context they're asking for. They want to know what actually happened in the full stream. Pull the archive next — you need timestamp 02:15:10 to make the case.";
      } else if (hasContext && !hasContracts) {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 5);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "MegaCorp", "Context shared. MegaCorp cautiously receptive. Note: haven't reviewed contract terms yet — unknown if Clause 7.5 window is still open.", "warning"));
        message = "Good context shared, but you haven't reviewed the contracts. You don't know if Clause 7.5's 6-hour first-response window is still open (it runs from 09:51). Review the contracts to understand your legal standing — and use it in the conversation with MegaCorp.";
      } else {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 2);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "MegaCorp", "Check-in call initiated. MegaCorp: 'We need specifics — what happened and what's your response plan?' No answers yet.", "warning"));
        message = "Better than silence, but this outreach was weak. You have no clip context and no contract knowledge — MegaCorp asked for specifics and you couldn't provide them. Pull the archive (timestamp 02:15:10 is key) and review the contracts before your next communication with them.";
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
      severity = "info";
      message = "Use the 'Draft Statement' button to craft a proper statement — choosing tone, key messages, and channels matters. This shortcut path scores lower.";
      addFeedEvent(makeEvent(now(), "Creator Social", "Basic statement issued via shortcut — no channel strategy or message crafting.", "info"));
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
      s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 4);
      s.score.prevention = Math.min(10, s.score.prevention + 3);
      addFeedEvent(makeEvent(now(), "Legal Counsel", "Entertainment lawyer activated. Reviewing Clause 7.5, morality clause language, and advising on statement liability. Response in 30 min.", "good"));
      message = "Legal activated. Entertainment lawyer is reviewing: (1) whether your outreach to MegaCorp has satisfied Clause 7.5, (2) whether the morality clause is triggered under current circumstances, (3) appropriate statement language that doesn't create inadvertent liability. Any public statement should be cleared by legal before publishing.";
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
      const hasDraftedStatement = s.statementDrafted;
      const hasDeal = s.dealNegotiated;

      const closedStrong = hasContext && hasDraftedStatement && hasMegaCorp && creatorOk && hasDeal;
      const closedEarly = !hasContext || !hasStatement;

      if (closedStrong && !s.statementIssuedBeforeContextChecked && !s.creatorPostedSolo) {
        s.score.prevention = Math.min(10, s.score.prevention + 4);
        severity = "good";
        addFeedEvent(makeEvent(now(), "Incident Command", "Incident resolved. Full playbook executed: archive reviewed, statement drafted & published, creator supported, deal negotiated, MegaCorp engaged. Outcome: crisis contained.", "good"));
        message = "Excellent full-playbook crisis management. Incident closed with all critical actions completed.";
      } else if (closedEarly) {
        s.score.communication = Math.max(0, s.score.communication - 2);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "Incident Command", "Incident closed prematurely. Key actions incomplete. Residual risk remains — this may resurface.", "warning"));
        message = "Incident closed, but critical gaps remain. The archive was never reviewed, or no public statement was issued. The narrative is unsettled and the controversy may resurface within 24-48 hours.";
      } else {
        severity = "good";
        addFeedEvent(makeEvent(now(), "Incident Command", "Incident closed. Core crisis managed. Some gaps in deal negotiation or creator coordination remain.", "good"));
        message = "Incident closed. Core crisis managed — clip context established and statement issued. Some gaps remain (deal negotiation, creator coordination) that could create residual risk.";
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
    lines.push("YES — and you handled it correctly. Pulling the clip archive first revealed the creator was being sarcastic (timestamp 02:15:10 shows the immediate correction). You avoided validating a false narrative.");
  } else if (s.statementIssuedBeforeContextChecked) {
    lines.push("NO — and it cost you significantly. You issued an apology before reviewing the archive. The clip showed the creator was being sarcastic — your apology confirmed a false narrative to the world. Always review before responding publicly.");
  } else {
    lines.push("NOT CHECKED — the clip archive was never reviewed. The key clue was in /archive/stream-clip-context.txt: at timestamp 02:15:10, the creator immediately corrects themselves with the punchline. The viral clip was deliberately cut to omit this. You could have had the facts — you just didn't look.");
  }

  lines.push("");
  lines.push("Statement Crafting:");
  if (s.statementDrafted) {
    const toneLabel: Record<string, string> = { context: "context-setting (correct)", apology: "apologetic (wrong)", no_comment: "no comment (evasive)" };
    lines.push(`Tone chosen: ${toneLabel[s.statementTone || ""] || s.statementTone}`);
    lines.push(`Channels used: ${s.statementChannels.length > 0 ? s.statementChannels.join(", ") : "none"}`);
    const correctMsgs = s.statementMessages.filter(m => ["clip_context", "timestamp_clarification", "transparency_commitment"].includes(m));
    const wrongMsgs = s.statementMessages.filter(m => ["apologize_if_offended", "hit_piece_accusation"].includes(m));
    if (correctMsgs.length > 0) lines.push(`Good message choices: ${correctMsgs.join(", ")}`);
    if (wrongMsgs.length > 0) lines.push(`Problematic message choices: ${wrongMsgs.join(", ")} — these undermine the context-setting narrative.`);
    if (!s.statementChannels.includes("twitter") && !s.statementChannels.includes("youtube")) {
      lines.push("Critical gap: Neither Twitter/X nor YouTube Community was used. That's where the crisis was happening.");
    }
    if (s.statementChannels.includes("press_release")) {
      lines.push("Mistake: Press release amplified the story to media who weren't covering it. Never issue a press release for a social media crisis at this stage.");
    }
  } else if (s.statementIssued && !s.apologyIssued) {
    lines.push("Statement issued via shortcut — tone, message, and channel strategy were not deliberated. This leaves significant communication score on the table.");
  } else if (s.apologyIssued) {
    lines.push("Apology issued. This was the wrong call — the creator was being sarcastic. An apology validates a false narrative and is very difficult to walk back.");
  } else {
    lines.push("No statement issued. The public narrative remained uncontested — letting critics define the story without any response is the worst communication outcome.");
  }

  lines.push("");
  lines.push("Deal Negotiation:");
  if (s.dealNegotiated) {
    const stanceLabel: Record<string, string> = {
      transparency: "Full transparency (correct)",
      guarantees: "Performance guarantees (shows weakness)",
      firm: "Firm/hold position (risky without evidence)",
      legal: "Legal threats (nuclear — deal likely burned)"
    };
    lines.push(`Negotiation stance: ${stanceLabel[s.dealStance || ""] || s.dealStance}`);
    if (s.dealStance === "transparency") {
      lines.push("Correct approach. Sharing the clip context with evidence is the professional move. MegaCorp's brand team responded positively to factual clarity.");
    } else if (s.dealStance === "legal") {
      lines.push("The $240K deal is likely terminated. Never threaten legal action in a sponsorship dispute during the crisis phase — it signals panic and destroys trust.");
    }
  } else {
    lines.push("Deal negotiation skipped. The $240K MegaCorp deal remained in limbo — you contacted them but never formally resolved the deal terms. This leaves ongoing contractual risk even after the narrative is corrected.");
  }

  lines.push("");
  lines.push("Creator Support:");
  if (s.creatorPostedSolo) {
    lines.push("The creator posted solo before being briefed. Uncoordinated messaging ('it was a joke lol but i get it 😬') muddied your narrative and confused the audience. Brief the creator first — always.");
  } else if (s.creatorBriefed) {
    lines.push("Creator briefed before any public response. They held off and trusted your lead — this prevented the most common escalation path in creator PR crises.");
  } else {
    lines.push("Creator was not briefed at all. A creator going rogue on social media during a live PR fire is the most common escalation path. This was a significant gap.");
  }

  lines.push("");
  lines.push("Crisis Containment:");
  const containment = [
    s.brandPostPaused && "Paused the MegaCorp brand post (critical — scheduled for 11:00 AM)",
    s.creatorBriefed && !s.creatorPostedSolo && "Briefed creator before they acted independently",
  ].filter(Boolean);
  if (containment.length > 0) {
    lines.push(`Containment actions taken: ${containment.join("; ")}.`);
  } else {
    lines.push("No containment actions taken. The MegaCorp brand post may have auto-published during the crisis, and the creator may have responded solo — both accelerate the PR fire significantly.");
  }

  lines.push("");
  lines.push("Missed Clues:");
  const missed: string[] = [];
  if (!s.commandsRun.some((c) => c.includes("archive/stream-clip-context"))) {
    missed.push("cat /archive/stream-clip-context.txt — The full clip showed sarcasm. Timestamp 02:15:10 has the clarification the viral clip cut off. This was the most important clue in the scenario.");
  }
  if (!s.commandsRun.some((c) => c.includes("megacorp-deal"))) {
    missed.push("cat /contracts/megacorp-deal.pdf — Clause 7.5 gives a 6-hour first-response window (deadline 15:51). Missing this means you may not know your legal exposure.");
  }
  if (!s.commandsRun.some((c) => c.includes("calendar/today"))) {
    missed.push("cat /calendar/today.json — The MegaCorp sponsored post was scheduled to auto-publish at 11:00 AM. Pausing it was the most time-sensitive operational action.");
  }
  if (!s.commandsRun.some((c) => c.includes("creator.sentiment"))) {
    missed.push("check creator.sentiment — The creator was reading comments without guidance and on the verge of posting independently. This would have surfaced the urgency.");
  }
  if (!s.commandsRun.some((c) => c.includes("social/trending"))) {
    missed.push("monitor social/trending — Tracking the hashtag spread would have revealed that @DigitalBeat was preparing a story, giving you a press response window.");
  }
  if (missed.length > 0) {
    lines.push(...missed);
  } else {
    lines.push("You reviewed all key evidence — excellent investigative methodology.");
  }

  lines.push("");
  lines.push("Recommended next challenge:");
  lines.push("The Brand Deal Collapse — a major sponsor terminates mid-campaign over a genuine (not manufactured) controversy. Navigate the fallout, negotiate an exit, protect the creator's reputation, and rebuild from scratch.");

  return lines.join("\n");
}

export function handleDraftStatement(
  tone: string,
  messages: string[],
  channels: string[],
  timing: string
): ActionResult {
  let message = "";
  let severity: ActionSeverity = "good";

  const state = mutateState((s) => {
    if (s.statementIssued) {
      message = "A statement has already been issued.";
      severity = "info";
      return;
    }

    s.statementIssued = true;
    s.statementDrafted = true;
    s.statementTone = tone;
    s.statementChannels = channels;
    s.statementMessages = messages;

    maybeFireCreatorSolo(s);

    const CORRECT_MESSAGES = ["clip_context", "timestamp_clarification", "transparency_commitment"];
    const WRONG_MESSAGES = ["apologize_if_offended", "hit_piece_accusation"];

    // Tone scoring
    let tonePoints = 0;
    const toneParts: string[] = [];
    if (tone === "context") {
      tonePoints = 6;
      toneParts.push("✓ Correct tone: context-setting signals confidence and gives the audience something factual.");
    } else if (tone === "apology") {
      tonePoints = -4;
      s.statementIssuedBeforeContextChecked = true;
      toneParts.push("✗ Wrong tone: apologizing for sarcasm validates the false narrative. Critics will use this as an admission.");
      severity = "bad";
    } else {
      tonePoints = -2;
      toneParts.push("✗ Evasive: 'no comment' during a trending crisis looks guilty and lets the false narrative solidify.");
      severity = "warning";
    }
    s.score.communication = Math.max(0, Math.min(10, s.score.communication + tonePoints));

    // Message scoring
    let msgPoints = 0;
    for (const msg of messages) {
      if (CORRECT_MESSAGES.includes(msg)) msgPoints += 1.5;
      else if (msg === "apologize_if_offended") {
        msgPoints -= 2;
        toneParts.push("✗ 'Apologize if offended' sounds like an admission of wrongdoing — even in a context-setting statement.");
        if (severity === "good") severity = "warning";
      } else if (msg === "hit_piece_accusation") {
        msgPoints -= 1.5;
        toneParts.push("✗ Calling it a 'deliberate hit piece' sounds conspiratorial without full evidence. It alienates neutral observers.");
        if (severity === "good") severity = "warning";
      }
    }
    const correctMsgs = messages.filter(m => CORRECT_MESSAGES.includes(m));
    if (correctMsgs.length > 0 && tone === "context") {
      toneParts.push(`✓ Good message choices: ${correctMsgs.length} of 3 factual points included.`);
    }
    if (correctMsgs.length === 0 && tone === "context") {
      toneParts.push("✗ No factual messages selected — your context-setting statement has no facts in it. What is it setting context for?");
      msgPoints -= 2;
    }
    s.score.communication = Math.max(0, Math.min(10, s.score.communication + Math.round(msgPoints)));

    // Channel scoring
    let chanPoints = 0;
    const chanParts: string[] = [];
    const CHANNEL_LABELS: Record<string, string> = { twitter: "Twitter/X", youtube: "YouTube Community", instagram: "Instagram Story", press_release: "Press Release", newsletter: "Newsletter" };
    if (channels.includes("twitter")) { chanPoints += 2; chanParts.push("✓ Twitter/X: correct — this is where the crisis is trending."); }
    if (channels.includes("youtube")) { chanPoints += 1.5; chanParts.push("✓ YouTube Community: correct — loyal audience, good format for longer context."); }
    if (channels.includes("press_release")) { chanPoints -= 2.5; chanParts.push("✗ Press Release: wrong — this amplifies the story to media outlets who weren't covering it. You just made it a 'real' story."); if (severity === "good") severity = "warning"; }
    if (channels.includes("instagram")) { chanPoints -= 1; chanParts.push("✗ Instagram Story: wrong format — ephemeral (24h), wrong audience, too short for context."); }
    if (channels.includes("newsletter")) { chanPoints += 0; chanParts.push("△ Newsletter: too slow for a trending crisis, but not harmful."); }
    if (!channels.includes("twitter") && !channels.includes("youtube")) {
      chanPoints -= 2;
      chanParts.push("✗ Critical gap: neither Twitter/X nor YouTube Community used — those are where the crisis is happening right now.");
      if (severity === "good") severity = "warning";
    }
    if (channels.length === 0) {
      chanParts.push("✗ No channels selected — statement was never published anywhere.");
      severity = "bad";
    }
    s.score.communication = Math.max(0, Math.min(10, s.score.communication + Math.round(chanPoints)));

    // Timing scoring
    if (timing === "now" && s.clipContextChecked && s.agencyContacted) {
      s.score.crisisContainment = Math.min(20, s.score.crisisContainment + 3);
    } else if (timing === "now" && !s.clipContextChecked) {
      s.score.crisisContainment = Math.max(0, s.score.crisisContainment - 2);
      toneParts.push("✗ Posted without confirming context. Speed without facts is dangerous in a crisis.");
    }

    // Feed event
    const channelsList = channels.map(c => CHANNEL_LABELS[c] || c).join(", ") || "no channels";
    const toneLabel: Record<string, string> = { context: "context-setting", apology: "apologetic", no_comment: "no-comment" };
    const feedType = tone === "context" && messages.some(m => CORRECT_MESSAGES.includes(m)) && channels.some(c => ["twitter", "youtube"].includes(c)) ? "good" : tone === "apology" ? "bad" : "warning";
    addFeedEvent(makeEvent(now(), "Creator Social", `Statement published (${toneLabel[tone] || tone} tone) via: ${channelsList}.${messages.includes("apologize_if_offended") || tone === "apology" ? " ⚠ Mixed signals in messaging." : ""}`, feedType));

    if (feedType === "good") {
      addFeedEvent(makeEvent(now(), "Social Monitor", "Narrative shifting. Comments: 'Oh I didn't see the full clip. That makes sense.' Trending hashtag losing steam. 67% of commenters now viewing favorably.", "good"));
    }

    message = [...toneParts, ...chanParts].join("\n\n");
  });

  return { message, severity, state };
}

export function handleNegotiateDeal(stance: string): ActionResult {
  let message = "";
  let severity: ActionSeverity = "good";

  const state = mutateState((s) => {
    if (s.dealNegotiated) {
      message = "Deal negotiation already completed.";
      severity = "info";
      return;
    }
    if (!s.megaCorpReachedOut) {
      message = "Contact MegaCorp first before attempting to negotiate the deal.";
      severity = "warning";
      return;
    }

    s.dealNegotiated = true;
    s.dealStance = stance;

    const hasContext = s.clipContextChecked;
    const hasContracts = s.contractsReviewed;
    const hasLegal = s.legalConsulted;

    if (stance === "transparency") {
      if (hasContext && hasContracts) {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 8);
        s.score.prevention = Math.min(10, s.score.prevention + 2);
        severity = "good";
        addFeedEvent(makeEvent(now(), "MegaCorp", "MegaCorp Brand Team: 'We've reviewed the context and archive evidence. The clip appears decontextualized. Clause 7.5: satisfied. Deal status: ACTIVE. Follow-up call at 4PM.'", "good"));
        message = "Excellent negotiation. You presented: (1) the full clip archive with timestamp 02:15:10 evidence, (2) your crisis response plan, (3) awareness of Clause 7.5 and its satisfaction. MegaCorp's brand team is satisfied this was a manufactured controversy. The $240K deal is confirmed active. This is the best possible outcome.";
      } else if (hasContext) {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 5);
        severity = "good";
        addFeedEvent(makeEvent(now(), "MegaCorp", "MegaCorp acknowledges the context evidence. Contract terms still being reviewed internally. Deal: monitoring, no termination. Response in 24h.", "warning"));
        message = "Good transparency approach with solid clip evidence. However, you hadn't reviewed the contracts — you don't know if Clause 7.5's first-response window is still technically satisfied, or what the morality clause precisely covers. MegaCorp is receptive but needs their legal team to confirm. Review the contracts for your next touchpoint.";
      } else {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 2);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "MegaCorp", "Transparency offered but no evidence provided. MegaCorp: 'We need to see the actual archive, not just assurances.' Deal remains on hold.", "warning"));
        message = "Right approach (transparency) but wrong preparation. You can't negotiate with 'trust us' — MegaCorp wants to see the actual archive evidence (timestamp 02:15:10). Pull the clip archive first, then come back to the table with facts.";
      }
    } else if (stance === "guarantees") {
      s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 3);
      severity = "warning";
      addFeedEvent(makeEvent(now(), "MegaCorp", "MegaCorp: 'We appreciate the goodwill gesture. However, this doesn't address the core reputational concern. Deal on hold pending full review.'", "warning"));
      message = "Performance guarantees show goodwill but signal weakness. By offering makeup content and bonus deliverables, you're implicitly treating this as a real controversy the creator needs to compensate for — undermining the stronger position (it was a manufactured crisis). MegaCorp reads this as an implicit admission. Better: lead with the clip evidence, then offer relationship-strengthening as a secondary move.";
    } else if (stance === "firm") {
      if (hasContext && hasContracts && hasLegal) {
        s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 4);
        severity = "good";
        addFeedEvent(makeEvent(now(), "MegaCorp", "MegaCorp legal reviewing. Firm stance acknowledged — they're verifying the archive claim. Response in 48 hours. Deal status: hold.", "warning"));
        message = "Firm stance is defensible — you have the evidence (archive), the contract knowledge (Clause 7.5), and legal counsel. MegaCorp's team is verifying your claim. This is a calculated risk: if the archive evidence holds (it does), you'll win. If you were bluffing, this could backfire badly. In this case — you weren't bluffing.";
      } else {
        s.score.stakeholderManagement = Math.max(0, s.score.stakeholderManagement - 3);
        severity = "bad";
        addFeedEvent(makeEvent(now(), "MegaCorp", "MegaCorp: 'We don't respond well to unsubstantiated pushback. Escalating internally.' Deal at serious risk of termination.", "bad"));
        message = "Standing firm without evidence is dangerous. You needed: the clip archive (to prove sarcasm), the contracts (to know your Clause 7.5 standing), and legal counsel (to advise on the firmness of your position). Without at least 2 of these 3, MegaCorp read your firmness as bluster — and escalated internally. The deal is now at serious risk.";
      }
    } else if (stance === "legal") {
      s.score.stakeholderManagement = Math.max(0, s.score.stakeholderManagement - 6);
      s.score.prevention = Math.max(0, s.score.prevention - 3);
      severity = "bad";
      addFeedEvent(makeEvent(now(), "MegaCorp", "MegaCorp: 'We are shocked by the legal threats. This relationship is no longer viable. Notice of termination being issued under Clause 9.2.' $240K deal terminated.", "critical"));
      message = "Nuclear option — the deal is terminated. Threatening legal action in a sponsorship dispute during the crisis phase is a catastrophic miscalculation:\n\n• It signals panic and bad faith\n• MegaCorp escalated to their executive team immediately\n• They invoked Clause 9.2 (dispute termination) rather than the morality clause — meaning you lose the $240K AND potentially face counter-claims\n• The relationship is burned for the foreseeable future\n\nLegal threats are a last resort after all other options fail — never a first negotiating move.";
    }
  });

  return { message, severity, state };
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
