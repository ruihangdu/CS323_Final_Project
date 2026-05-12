import { getState } from "./state";

export async function handleCommand(command: string): Promise<string> {
  const state = getState();
  const cmd = command.trim().toLowerCase();

  if (cmd === "help") {
    return `Available commands:
  status          — Show current incident status
  actions         — List available actions
  score           — Show current score breakdown
  situation       — Re-read the scenario briefing
  whoami          — Show your role
  history         — Show actions taken so far`;
  }

  if (cmd === "status" || cmd === "incident status") {
    if (!state.scenario) return "No scenario loaded.";
    const taken = state.takenActions.length;
    const total = state.scenario.actions.length;
    return `INCIDENT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:          ${state.scenario.title}
Status:         ${state.incidentClosed ? "CLOSED" : "ACTIVE"}
Time:           ${state.time}
Actions taken:  ${taken} / ${total}
Total score:    ${state.totalScore} / 100`;
  }

  if (cmd === "whoami" || cmd === "role") {
    if (!state.scenario) return "No scenario loaded.";
    return `Role: ${state.scenario.role}
Company: (as configured)
Scenario: ${state.scenario.subtitle}`;
  }

  if (cmd === "situation" || cmd === "briefing") {
    if (!state.scenario) return "No scenario loaded.";
    return `SITUATION BRIEFING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${state.scenario.situation}`;
  }

  if (cmd === "score") {
    if (!state.scenario) return "No scenario loaded.";
    const lines = ["SCORE BREAKDOWN", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"];
    for (const cat of state.scenario.scoreCategories) {
      const val = state.score[cat.key] ?? 0;
      const bar = "█".repeat(Math.round((val / cat.max) * 10)) + "░".repeat(10 - Math.round((val / cat.max) * 10));
      lines.push(`${cat.label.padEnd(20)} ${bar} ${val}/${cat.max}`);
    }
    lines.push(`${"TOTAL".padEnd(20)} ${state.totalScore}/100`);
    return lines.join("\n");
  }

  if (cmd === "actions" || cmd === "ls actions") {
    if (!state.scenario) return "No scenario loaded.";
    const lines = ["AVAILABLE ACTIONS", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"];
    const byCategory: Record<string, typeof state.scenario.actions> = {};
    for (const a of state.scenario.actions) {
      if (!byCategory[a.category]) byCategory[a.category] = [];
      byCategory[a.category].push(a);
    }
    for (const [cat, acts] of Object.entries(byCategory)) {
      lines.push(`\n[${cat.toUpperCase()}]`);
      for (const a of acts) {
        const taken = state.takenActions.includes(a.id) ? "[✓]" : "[ ]";
        const risky = a.isRisky ? " ⚠" : "";
        lines.push(`  ${taken} ${a.label}${risky}`);
      }
    }
    return lines.join("\n");
  }

  if (cmd === "history") {
    if (state.takenActions.length === 0) return "No actions taken yet.";
    if (!state.scenario) return "No scenario loaded.";
    const lines = ["ACTION HISTORY", "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"];
    for (const id of state.takenActions) {
      const action = state.scenario.actions.find((a) => a.id === id);
      if (action) lines.push(`  ✓ ${action.label} (+${action.scoreValue} ${action.scoreCategory})`);
    }
    return lines.join("\n");
  }

  // Use GPT-4 for contextual terminal responses if key available
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && state.scenario) {
    try {
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
              content: `You are a terminal system in the context of: ${state.scenario.terminalContext}.
Scenario: ${state.scenario.title}. ${state.scenario.situation}
Respond to terminal commands as if you are the actual system. Keep responses realistic and brief (under 10 lines).
If a command doesn't make sense, return an appropriate error message.`,
            },
            { role: "user", content: command },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          choices: Array<{ message: { content: string } }>;
        };
        return data.choices[0]?.message?.content || `Command not found: ${command}`;
      }
    } catch {
      // fall through
    }
  }

  return `bash: ${command}: command not found\nType 'help' for available commands.`;
}
