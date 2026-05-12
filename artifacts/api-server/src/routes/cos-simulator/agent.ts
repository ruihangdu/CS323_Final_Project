import { getState, mutateState } from "./state";
import { handleCommand } from "./commands";

interface AgentToolResult {
  toolName: string;
  result: string;
}

interface AgentResponse {
  agent: string;
  response: string;
  confidence: string | null;
  toolsUsed: string[];
}

function readSocialMetrics(): string {
  return handleCommand("check social.metrics");
}

function readCreatorStatus(): string {
  return handleCommand("check creator.sentiment");
}

function readContracts(sponsor: string): string {
  if (sponsor.toLowerCase().includes("mega")) {
    return handleCommand("cat /contracts/megacorp-deal.pdf");
  }
  if (sponsor.toLowerCase().includes("fresh")) {
    return handleCommand("cat /contracts/freshbrand-deal.pdf");
  }
  return handleCommand("cat /contracts/megacorp-deal.pdf");
}

function readClipArchive(): string {
  return handleCommand("cat /archive/stream-clip-context.txt");
}

function readRunbook(): string {
  return handleCommand("cat /runbooks/crisis-comms.md");
}

function readCalendar(): string {
  return handleCommand("cat /calendar/today.json");
}

function callTool(toolName: string, args: Record<string, string>): AgentToolResult {
  let result = "";
  switch (toolName) {
    case "readSocialMetrics":
      result = readSocialMetrics();
      break;
    case "readCreatorStatus":
      result = readCreatorStatus();
      break;
    case "readContracts":
      result = readContracts(args.sponsor || "megacorp");
      break;
    case "readClipArchive":
      result = readClipArchive();
      break;
    case "readRunbook":
      result = readRunbook();
      break;
    case "readCalendar":
      result = readCalendar();
      break;
    default:
      result = `Unknown tool: ${toolName}`;
  }
  return { toolName, result };
}

function heuristicResponse(agent: string, message: string): AgentResponse {
  const state = getState();
  const msg = message.toLowerCase();
  const toolsUsed: string[] = [];
  let confidence = "Medium";

  mutateState((s) => {
    s.score.stakeholderManagement = Math.min(20, s.score.stakeholderManagement + 1);
  });

  const toolResults: AgentToolResult[] = [];

  if (msg.includes("clip") || msg.includes("context") || msg.includes("archive") || msg.includes("what") || msg.includes("sarcas")) {
    toolResults.push(callTool("readClipArchive", {}));
    toolsUsed.push("readClipArchive");
  }

  if (msg.includes("contract") || msg.includes("megacorp") || msg.includes("sponsor") || msg.includes("deal") || msg.includes("clause")) {
    toolResults.push(callTool("readContracts", { sponsor: "megacorp" }));
    toolsUsed.push("readContracts");
  }

  if (msg.includes("calendar") || msg.includes("post") || msg.includes("schedule") || msg.includes("brand post") || msg.includes("pause")) {
    toolResults.push(callTool("readCalendar", {}));
    toolsUsed.push("readCalendar");
  }

  if (msg.includes("creator") || msg.includes("how is") || msg.includes("feeling") || msg.includes("welfare")) {
    toolResults.push(callTool("readCreatorStatus", {}));
    toolsUsed.push("readCreatorStatus");
  }

  if (msg.includes("statement") || msg.includes("response") || msg.includes("public") || msg.includes("messaging") || msg.includes("comms")) {
    toolResults.push(callTool("readRunbook", {}));
    toolsUsed.push("readRunbook");
  }

  if (msg.includes("viral") || msg.includes("views") || msg.includes("trending") || msg.includes("social") || msg.includes("twitter")) {
    toolResults.push(callTool("readSocialMetrics", {}));
    toolsUsed.push("readSocialMetrics");
  }

  if (toolResults.length === 0) {
    toolResults.push(callTool("readSocialMetrics", {}));
    toolResults.push(callTool("readCreatorStatus", {}));
    toolsUsed.push("readSocialMetrics", "readCreatorStatus");
  }

  let response = "";

  switch (agent) {
    case "PR Strategist":
      response = generatePRResponse(msg, toolResults, state);
      confidence = state.clipContextChecked ? "High" : "Medium";
      break;
    case "Brand Manager":
      response = generateBrandManagerResponse(msg, toolResults, state);
      confidence = state.contractsReviewed ? "High" : "Medium";
      break;
    case "Legal Counsel":
      response = generateLegalResponse(msg, toolResults, state);
      confidence = "High";
      break;
    case "Devil's Advocate":
      response = generateDevilsAdvocateResponse(msg, toolResults, state);
      confidence = "High";
      break;
    default:
      response = generatePRResponse(msg, toolResults, state);
  }

  return { agent, response, confidence, toolsUsed: [...new Set(toolsUsed)] };
}

function generatePRResponse(
  msg: string,
  toolResults: AgentToolResult[],
  state: ReturnType<typeof getState>
): string {
  if (msg.includes("statement") || msg.includes("response") || msg.includes("say") || msg.includes("public")) {
    if (!state.clipContextChecked) {
      return `Before we draft any statement, I need to be clear: we cannot issue any public response until we know what we're actually responding to.

Pull the clip archive. Watch it yourself. Know exactly what the creator said, in what tone, and what was cut.

My concern: if the creator was being misrepresented, issuing an apology validates the misrepresentation. That's a PR disaster within a PR disaster.

**Hold on any statement until we have the full clip context.** A measured 2-hour "we are reviewing all the facts" holding statement is better than a premature apology.

Recommended holding language:
---
"We're aware of the clip circulating on social media. We take all concerns seriously and are reviewing the full context of the situation. We'll share a complete response shortly."
---

That's it. Nothing more until we know what we're dealing with.`;
    }

    if (state.clipContextChecked && !state.statementIssuedBeforeContextChecked) {
      return `Now that we've reviewed the archive, I can give you a proper recommendation.

**This is not an apology situation.** The creator was being sarcastic and corrected themselves at 02:15:10 — the clip cuts off right before that clarification. This is a bad-faith edit.

Recommended statement:
---
"The clip circulating is missing critical context. On [stream date], this moment was part of a comedic bit — the creator was being sarcastic and immediately clarified that at timestamp [02:15:10]. We encourage anyone concerned to watch the full stream segment.

We understand why the clip looks alarming without context, and we appreciate the community's vigilance. The creator's actual values are [X, Y, Z]."
---

**Tone:** Clear, calm, not defensive. We're providing information, not apologizing.
**Share:** Full stream timestamp link. Let the evidence speak.
**Avoid:** Over-explaining, being defensive, attacking the people who shared the clip.

${state.agencyContacted ? "Good — the agency is aligned. Issue the statement now." : "Also: loop in the agency before publishing. They may have media contacts who can help the context go wider."}`;
    }

    return `The situation is evolving. Current viral velocity suggests we have 60-90 minutes before this reaches mainstream media pick-up.

Priority: Pull the clip archive now. We cannot have a PR strategy without knowing what we're dealing with.

Once we know the context, I can advise on statement timing, tone, and channel strategy. Until then: no public statements, brief the creator to stay off social, and pause any brand posts.`;
  }

  return `PR Assessment — Current situation:

The viral velocity (doubling every ~25 minutes) is concerning but not yet at mainstream media level. We likely have 60-90 minutes of breathing room before news outlets pick it up.

Critical path right now:
1. Pull the clip archive — know what you're dealing with before saying anything
2. Pause the brand post — a MegaCorp sponsored post during this would be catastrophic
3. Brief the creator — they need to stay off social until we have a strategy
4. Contact MegaCorp — don't let them hear silence from us

${state.clipContextChecked ? "IMPORTANT: The clip is decontextualized. Do NOT apologize. Provide context." : ""}
${state.statementIssuedBeforeContextChecked ? "⚠️ A statement was issued before the clip was reviewed. We may need damage control on the damage control." : ""}`;
}

function generateBrandManagerResponse(
  msg: string,
  toolResults: AgentToolResult[],
  state: ReturnType<typeof getState>
): string {
  if (msg.includes("megacorp") || msg.includes("deal") || msg.includes("sponsor") || msg.includes("contract")) {
    const contractData = toolResults.find(t => t.toolName === "readContracts");
    if (contractData) {
      return `I've reviewed the MegaCorp contract. Here's what you need to know:

**Clause 7.4 — Morality Termination:** MegaCorp can terminate within 72 hours of the controversy. Window started at 09:47 today.

**Clause 7.5 — Right of First Response (CRITICAL):** They are REQUIRED to give us 24 hours to respond, but ONLY if we initiate outreach within 6 hours of their notification.
- MegaCorp notified us at 09:47
- **6-hour deadline to initiate contact: 15:47 TODAY**
- This is not negotiable — if we miss this window, they can terminate immediately

**Financial exposure:**
- Annual contract: $240,000
- Q4 integration bonuses: ~$60,000
- Total at risk: ~$300,000

**My recommendation:**
Contact MegaCorp within the next 30 minutes. Don't wait for the full statement. A call that says "We're aware, we're reviewing the full clip, we'll have a complete response by [time]" preserves Clause 7.5 rights and signals professionalism.

${state.clipContextChecked ? "When you reach them, lead with the clip context — the creator was sarcastic, clip was edited. This changes the conversation entirely." : "Get the clip context first if you can, but do NOT let the 15:47 deadline pass without contact."}`;
    }
    return `The MegaCorp contract has a morality clause with a 72-hour termination window. What most people miss is Clause 7.5 — we get a 24-hour right-of-first-response, but ONLY if we initiate contact within 6 hours of their notification.

They notified us at 09:47. Read the contract now: \`cat /contracts/megacorp-deal.pdf\`

This is a hard deadline. Do not miss it.`;
  }

  if (msg.includes("post") || msg.includes("calendar") || msg.includes("schedule")) {
    return `Immediate action required on the content calendar.

A MegaCorp sponsored post is scheduled to auto-publish at 11:00 AM. You have under 75 minutes to pause it. A brand integration post going live during an active controversy signals business as usual and will enrage both the audience and MegaCorp's brand team.

${state.brandPostPaused ? "✓ Good — the brand post is already paused. Well done." : "PAUSE THE BRAND POST NOW. This is the most time-critical operational action."}

Other deals:
- FreshBrand: lower risk, no aggressive morality clause, can wait
- NutrifyMe: standard terms, safe to proceed if situation resolves
- GamerGear: monitor only

After the brand post is paused, focus on MegaCorp relationship management.`;
  }

  return `Brand relationship status:

**MegaCorp (CRITICAL):** $240K deal on hold. 6-hour contact window in Clause 7.5 is ticking. Read the contract (\`cat /contracts/megacorp-deal.pdf\`) and contact them today.
**FreshBrand:** Low risk. Standard terms. No immediate action needed.
**NutrifyMe:** Low risk. Can monitor.

Immediate priority: Pause the 11:00 AM MegaCorp brand post before it auto-publishes.
Second priority: Contact MegaCorp before 15:47.

${state.contractsReviewed ? "Contracts reviewed — you know the terms. Act on them." : "Review the MegaCorp contract before your outreach call so you know exactly what you're protecting."}`;
}

function generateLegalResponse(
  msg: string,
  toolResults: AgentToolResult[],
  state: ReturnType<typeof getState>
): string {
  const hasLegal = state.legalConsulted;

  if (msg.includes("apolog") || msg.includes("statement") || msg.includes("admit")) {
    return `Legal caution on any public statement:

**Do NOT issue an apology until we've reviewed the clip.** An apology in the context of a sponsorship dispute is a legal admission. Even if the creator did nothing wrong, an apology can be used by MegaCorp to justify termination under Clause 7.3.

${state.clipContextChecked ? 
`Having reviewed the clip: the creator was being sarcastic and corrected themselves immediately. There is no legal basis for an apology here — it would be factually inaccurate.

A context-setting statement (not an apology) is the right legal posture:
- "The clip is missing context" 
- Provide timestamps, link to full VOD
- Do not admit to anything that didn't happen` : 
`We have not reviewed the clip yet. Until we know what the creator actually said and in what context, I advise no statement. The legal risk of saying the wrong thing is higher than the PR risk of a brief delay.`}

**On the MegaCorp contract:** Clause 7.5 gives us 24 hours to respond IF we initiate contact within 6 hours. I strongly advise initiating that contact with a "preserving rights" call — not a substantive statement yet.`;
  }

  if (msg.includes("megacorp") || msg.includes("contract") || msg.includes("clause") || msg.includes("terminate")) {
    return `Legal analysis of the MegaCorp situation:

**Clause 7.4:** MegaCorp has a 72-hour termination right. This is enforceable.

**Clause 7.5 (our protection):** Before terminating, MegaCorp must grant us 24 hours to respond in writing — but ONLY if we initiate outreach within 6 hours of their notification.
- Notification received: 09:47
- 6-hour deadline: 15:47 today
- **Do not miss this window**

**What counts as "initiating outreach":** A phone call, email, or text to their brand team acknowledging the situation and indicating we will provide a full response. It doesn't have to be the complete statement — just the initiation.

**If they terminate without honoring Clause 7.5:** We have a breach of contract claim. But that's an expensive litigation path. Better to preserve the right.

**On the clip:** ${state.clipContextChecked ? "The clip is decontextualized. If MegaCorp terminates based on a misrepresentation, we have a stronger argument that the controversy doesn't 'materially affect brand perception' as required by Clause 7.4." : "Pull the clip archive. If the creator was misrepresented, this changes our legal position significantly."}

${hasLegal ? "" : "Activate legal counsel (entertainment attorney) immediately if you haven't already."}`;
  }

  const concerns: string[] = [];
  if (state.statementIssuedBeforeContextChecked) {
    concerns.push("⚠️ A statement was issued before the clip was reviewed. This may have created an inadvertent admission. We should clarify and correct if possible.");
  }
  if (!state.legalConsulted) {
    concerns.push("⚠️ Legal has not been activated. Any public statement during a live sponsorship dispute should be cleared by entertainment counsel.");
  }

  return `Legal overview of current situation:

The MegaCorp morality clause (Clause 7.4) is the primary legal risk. The 72-hour termination window is enforceable.

Our protection is Clause 7.5 — the right-of-first-response — but only if we initiate contact within 6 hours of their notification (deadline: 15:47).

${concerns.length > 0 ? "Legal concerns:\n" + concerns.join("\n") : "No major legal missteps detected so far."}

Key legal priorities:
1. Initiate MegaCorp contact before 15:47 to preserve Clause 7.5 rights
2. Review clip before any public statement (avoid inadvertent admissions)
3. Have all public statements cleared by entertainment counsel
4. Document all sponsor communications in writing`;
}

function generateDevilsAdvocateResponse(
  msg: string,
  toolResults: AgentToolResult[],
  state: ReturnType<typeof getState>
): string {
  const concerns: string[] = [];

  if (state.statementIssuedBeforeContextChecked) {
    concerns.push(
      "⚠️ You issued an apology before reviewing the clip. Did you know the creator was actually being sarcastic? That apology just validated a false narrative. The 31% who were waiting for context are now confused. You may have made it worse."
    );
  }

  if (!state.clipContextChecked) {
    concerns.push(
      "⚠️ The clip archive has not been reviewed. How can you manage a PR crisis when you don't know what actually happened? What if the creator was being sarcastic? What if the clip was edited? You're operating blind."
    );
  }

  if (!state.brandPostPaused) {
    concerns.push(
      "⚠️ The MegaCorp brand post is still scheduled to auto-publish. A sponsored post going live during an active crisis is a career-defining mistake. This should have been the FIRST action."
    );
  }

  if (msg.includes("apolog") || msg.includes("sorry") || msg.includes("statement")) {
    return `I'm going to push back on issuing any statement right now.

Have you actually watched the clip? Not the clipped version — the full stream archive?

${state.clipContextChecked ? 
`You have — and you found the creator was being sarcastic. So why are we considering an apology? An apology here says "I accept I did something wrong." That's factually incorrect and legally damaging.

The correct move is context-setting, not apologizing. "Here is what actually happened" is a fundamentally different statement than "I'm sorry."` :
`You haven't watched the clip. You're about to issue a public statement — possibly an apology — for something you haven't personally verified. What if the creator was being sarcastic and the clip was deliberately cut to remove the punchline? You'd be validating a misrepresentation and making it worse.

Pull the archive. Watch the clip. Then we can talk about a statement.`}

The 31% of the audience who were "waiting for context" will be won or lost by what we do in the next hour. An apology without context loses them. A clear, factual context statement wins them.`;
  }

  if (msg.includes("megacorp") || msg.includes("contact")) {
    return `Devil's advocate on contacting MegaCorp:

You need to be prepared for this call. What are you going to say?

${state.clipContextChecked ? 
"Good — you have the clip context. Lead with that. The creator was being sarcastic. The clip was deliberately edited to misrepresent them. This is a much stronger position than a defensive apology." :
"You haven't reviewed the clip yet. If you call MegaCorp now without knowing what actually happened, you'll be defensive and vague. They'll read that as guilt. Review the archive first, then call them with confidence."}

Also: have you read the contract? ${state.contractsReviewed ? "You have — you know about the 6-hour window in Clause 7.5. Use that knowledge in the call." : "Read the MegaCorp contract before calling. There's a 6-hour window in Clause 7.5 that you need to know about."}`;
  }

  if (concerns.length > 0) {
    return `Skeptic review of decisions so far:\n\n${concerns.join("\n\n")}\n\nThe most common mistakes in creator PR fires: acting before understanding the situation, letting the creator respond solo, and issuing apologies for things that didn't happen. Take a breath and investigate before you react.`;
  }

  return `Before any action, let me ask the hard questions:

- Have you actually watched the clip? (Not just heard about it)
- Do you know if the creator was being sincere or sarcastic?
- Have you read the MegaCorp contract — specifically Clauses 7.4 and 7.5?
- Has the creator been briefed, or are they currently spiraling on social?
- Is the MegaCorp brand post still going to auto-publish at 11:00 AM?

The worst crisis management is reactive crisis management. Take two minutes to investigate before you take irreversible actions. The first 30 minutes of a PR fire are usually spent making recoverable mistakes into unrecoverable ones.`;
}

export async function handleAgent(agentName: string, message: string): Promise<AgentResponse> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      return await callOpenAI(agentName, message, openaiKey);
    } catch (_err) {
      // Fall through to heuristic
    }
  }

  return heuristicResponse(agentName, message);
}

async function callOpenAI(agentName: string, message: string, apiKey: string): Promise<AgentResponse> {
  const state = getState();

  const systemPrompts: Record<string, string> = {
    "PR Strategist": `You are a senior PR strategist advising a Chief of Staff during a creator PR crisis. A 6-month-old stream clip is going viral — it appears to show the creator saying something controversial. Your job: guide the CoS on statement timing, tone, and narrative management. Key principle: NEVER advise issuing an apology before the full clip context has been reviewed. Current state: clipContextChecked=${state.clipContextChecked}, statementIssued=${state.statementIssued}, apologyIssuedFirst=${state.statementIssuedBeforeContextChecked}.`,

    "Brand Manager": `You are a brand partnerships manager advising on sponsor relationship protection during a creator PR crisis. You are deeply familiar with the MegaCorp contract: Clause 7.4 (72-hour morality termination) and critically Clause 7.5 (24-hour right-of-first-response preserved ONLY if creator team initiates contact within 6 hours of MegaCorp notification — deadline 15:47 today). Current state: contractsReviewed=${state.contractsReviewed}, megaCorpReachedOut=${state.megaCorpReachedOut}.`,

    "Legal Counsel": `You are an entertainment attorney advising during a creator sponsorship crisis. Primary concern: any public statement during a live sponsorship dispute can be used as evidence. Apologies before context review are legal admissions. MegaCorp Clause 7.5 rights must be preserved by initiating contact before 15:47. Current state: clipContextChecked=${state.clipContextChecked}, legalConsulted=${state.legalConsulted}, statementIssuedBeforeContext=${state.statementIssuedBeforeContextChecked}.`,

    "Devil's Advocate": `You are a senior advisor playing devil's advocate. You challenge premature actions, push back on apologies issued without full context, ask hard questions, and identify risks in proposed responses. The most important question you ask: "Have you actually watched the full clip?" Current state: clipContextChecked=${state.clipContextChecked}, apologyFirst=${state.statementIssuedBeforeContextChecked}, brandPostPaused=${state.brandPostPaused}.`,
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompts[agentName] || systemPrompts["PR Strategist"] },
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    throw new Error(`OpenAI API error: ${resp.status}`);
  }

  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  return {
    agent: agentName,
    response: data.choices[0]?.message?.content || "No response.",
    confidence: null,
    toolsUsed: [],
  };
}
