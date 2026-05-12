import { getState } from "./state";

interface AgentResponse {
  agent: string;
  response: string;
  confidence: string | null;
  toolsUsed: string[];
}

export async function handleAgent(
  agentId: string,
  message: string
): Promise<AgentResponse> {
  const state = getState();
  if (!state.scenario) {
    return { agent: agentId, response: "No scenario loaded yet.", confidence: null, toolsUsed: [] };
  }

  const agent = state.scenario.agents.find((a) => a.id === agentId);
  if (!agent) {
    return { agent: agentId, response: "Agent not found.", confidence: null, toolsUsed: [] };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return {
      agent: agent.name,
      response: `[${agent.name}] ${agent.role}: I'd recommend carefully assessing the situation before taking any irreversible actions. Consider the stakeholder impact and document your decisions.`,
      confidence: "Medium",
      toolsUsed: [],
    };
  }

  try {
    const situationContext = `
SCENARIO: ${state.scenario.title}
SITUATION: ${state.scenario.situation}
ACTIONS TAKEN SO FAR: ${state.takenActions.length > 0 ? state.takenActions.join(", ") : "None yet"}
CURRENT SCORE: ${state.totalScore}/100
`.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${agent.systemPrompt}\n\nCurrent situation context:\n${situationContext}\n\nRespond concisely (2-4 sentences). End with a specific recommendation if appropriate.`,
          },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content || "No response.";
    const confMatch = content.match(/confidence[:\s]+(\w+)/i);

    return {
      agent: agent.name,
      response: content,
      confidence: confMatch ? confMatch[1] : null,
      toolsUsed: [],
    };
  } catch (err) {
    return {
      agent: agent.name,
      response: `Unable to connect to AI advisor. As ${agent.role}: consider the downstream effects of any action before proceeding.`,
      confidence: null,
      toolsUsed: [],
    };
  }
}
