import { startGenerating, setScenario, setGenerationError, type GeneratedScenario } from "./state";

const GENERATION_PROMPT = (description: string, company: string) => `
You are designing a realistic crisis/incident training simulation for a professional.
The trainee described their scenario as: "${description}"
Company name to use: "${company}"

Generate a complete training simulation in JSON. Think carefully about:
- The ROLE the trainee plays (their job title and responsibility)
- A REALISTIC crisis or incident plausible for that role
- ACTIONS they should take (some good, some risky, some bad)
- AI ADVISORS they can consult (experts relevant to this crisis)
- SCORING that rewards good judgment and penalises reckless choices

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "title": "Short descriptive incident title",
  "subtitle": "Role title / Department",
  "situation": "2-3 sentence briefing of what is happening right now",
  "startTime": "HH:MM (24h format, e.g. 09:15)",
  "role": "The trainee's job title",
  "terminalContext": "What the terminal represents in this scenario (e.g. 'Internal Slack-like CLI', 'AWS console CLI', 'Internal CRM system')",
  "feedEvents": [
    { "time": "HH:MM", "source": "Source Name", "message": "Event message", "type": "critical|bad|warning|info|good" }
  ],
  "actions": [
    {
      "id": "snake_case_action_id",
      "label": "Button label (short)",
      "category": "Category Name (e.g. Containment, Investigation, Communication, Recovery)",
      "scoreCategory": "snake_case_score_key",
      "scoreValue": 5,
      "isRisky": false,
      "feedMessage": "What happens when this action is taken (1-2 sentences)"
    }
  ],
  "agents": [
    {
      "id": "snake_case_agent_id",
      "name": "Agent Display Name",
      "role": "Short role description",
      "systemPrompt": "Full system prompt for this AI advisor (3-5 sentences describing their perspective, expertise, and communication style)"
    }
  ],
  "scoreCategories": [
    { "key": "snake_case_key", "label": "Display Label", "max": 20 }
  ]
}

Requirements:
- feedEvents: 5-8 events that tell a story, escalating in severity
- actions: 7-10 actions across 3-4 categories. Include: 3-5 clearly good actions (scoreValue 5-15), 2-3 risky/bad actions (scoreValue -5 to -10, isRisky: true), 1-2 neutral/informational actions (scoreValue 2-5)
- agents: exactly 3 advisors with distinct perspectives (one supportive, one analytical, one skeptical/devil's advocate)
- scoreCategories: 4-5 categories, each max 15-25 points, totaling ~100 points across all good actions
- Make it realistic, high-stakes, and educational
`;

export async function generateScenario(
  description: string,
  company: string
): Promise<void> {
  startGenerating();

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    // Generate a fallback scenario without AI
    setScenario(makeFallbackScenario(description, company));
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "user", content: GENERATION_PROMPT(description, company) },
        ],
        temperature: 0.8,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from OpenAI");

    const parsed = JSON.parse(content) as GeneratedScenario;
    validateScenario(parsed);
    setScenario(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setGenerationError(`Generation failed: ${msg}`);
  }
}

function validateScenario(s: unknown): asserts s is GeneratedScenario {
  const obj = s as Record<string, unknown>;
  const required = ["title", "subtitle", "situation", "startTime", "role", "feedEvents", "actions", "agents", "scoreCategories"];
  for (const key of required) {
    if (!obj[key]) throw new Error(`Generated scenario missing field: ${key}`);
  }
}

function makeFallbackScenario(description: string, company: string): GeneratedScenario {
  return {
    title: `${company} Crisis Simulation`,
    subtitle: "Custom Scenario",
    situation: `A critical situation has emerged at ${company}. Based on your description: "${description}". You must act quickly to assess the situation, contain the damage, and communicate clearly with stakeholders.`,
    startTime: "10:00",
    role: "Crisis Lead",
    terminalContext: "Internal operations CLI",
    feedEvents: [
      { id: "1", time: "10:00", source: "Alert", message: "Critical situation detected — immediate response required", type: "critical" },
      { id: "2", time: "10:02", source: "Team Lead", message: "Awaiting your direction on how to proceed", type: "warning" },
      { id: "3", time: "10:05", source: "Stakeholder", message: "External parties have been notified and are watching", type: "bad" },
    ],
    actions: [
      { id: "assess_situation", label: "Assess Situation", category: "Investigation", scoreCategory: "investigation", scoreValue: 10, isRisky: false, feedMessage: "Situation assessed — root cause under investigation." },
      { id: "notify_stakeholders", label: "Notify Stakeholders", category: "Communication", scoreCategory: "communication", scoreValue: 10, isRisky: false, feedMessage: "Key stakeholders have been notified." },
      { id: "contain_impact", label: "Contain Impact", category: "Containment", scoreCategory: "containment", scoreValue: 15, isRisky: false, feedMessage: "Impact contained — further damage prevented." },
      { id: "premature_statement", label: "Issue Statement (Immediate)", category: "Communication", scoreCategory: "communication", scoreValue: -10, isRisky: true, feedMessage: "Statement issued before full context — may cause confusion." },
      { id: "close_incident", label: "Close Incident", category: "Recovery", scoreCategory: "recovery", scoreValue: 15, isRisky: false, feedMessage: "Incident has been formally closed. Debrief to follow." },
    ],
    agents: [
      { id: "advisor", name: "Senior Advisor", role: "Strategic Guidance", systemPrompt: `You are a senior advisor helping the user navigate this crisis at ${company}. You provide clear, measured guidance based on best practices. You help them think through consequences before acting.` },
      { id: "analyst", name: "Risk Analyst", role: "Risk Assessment", systemPrompt: `You are a risk analyst reviewing the crisis situation at ${company}. You identify potential risks, quantify exposure, and recommend evidence-based actions. You are data-driven and methodical.` },
      { id: "skeptic", name: "Devil's Advocate", role: "Critical Review", systemPrompt: `You are a skeptical reviewer challenging assumptions during this crisis at ${company}. You ask hard questions, identify what could go wrong with proposed actions, and prevent hasty decisions.` },
    ],
    scoreCategories: [
      { key: "investigation", label: "Investigation", max: 25 },
      { key: "containment", label: "Containment", max: 25 },
      { key: "communication", label: "Communication", max: 25 },
      { key: "recovery", label: "Recovery", max: 25 },
    ],
  };
}
