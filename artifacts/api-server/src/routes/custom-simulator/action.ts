import { takeAction as doTakeAction, getState, closeIncident } from "./state";

interface ActionResponse {
  feedback: string;
  state: ReturnType<typeof getState>;
}

export async function handleAction(actionId: string): Promise<ActionResponse> {
  const { feedback, ok } = doTakeAction(actionId);
  const state = getState();

  // Check if all good actions taken → auto-close
  if (ok && !state.incidentClosed && state.scenario) {
    const goodActions = state.scenario.actions.filter((a) => !a.isRisky && a.scoreValue > 0);
    const allGoodTaken = goodActions.every((a) => state.takenActions.includes(a.id));
    if (allGoodTaken) {
      const debrief = generateDebrief(state);
      closeIncident(debrief);
    }
  }

  return { feedback, state: getState() };
}

function generateDebrief(state: ReturnType<typeof getState>): string {
  if (!state.scenario) return "Incident closed.";

  const score = state.totalScore;
  const maxPossible = state.scenario.scoreCategories.reduce((a, c) => a + c.max, 0);
  const pct = Math.round((score / maxPossible) * 100);

  const rating =
    pct >= 85 ? "Exceptional" :
    pct >= 70 ? "Proficient" :
    pct >= 50 ? "Developing" :
    "Needs Improvement";

  const risky = state.takenActions.filter((id) => {
    const a = state.scenario!.actions.find((a) => a.id === id);
    return a?.isRisky;
  });

  const missed = state.scenario.actions
    .filter((a) => !a.isRisky && a.scoreValue > 0 && !state.takenActions.includes(a.id))
    .map((a) => a.label);

  const lines = [
    `${state.scenario.title} — After Action Report`,
    "═".repeat(50),
    "",
    `FINAL SCORE: ${score}/${maxPossible} — ${rating} (${pct}%)`,
    "",
  ];

  for (const cat of state.scenario.scoreCategories) {
    const val = state.score[cat.key] ?? 0;
    lines.push(`${cat.label}: ${val}/${cat.max}`);
  }

  if (risky.length > 0) {
    lines.push("", "⚠ RISKY ACTIONS TAKEN:");
    for (const id of risky) {
      const a = state.scenario.actions.find((a) => a.id === id);
      if (a) lines.push(`  - ${a.label}`);
    }
  }

  if (missed.length > 0) {
    lines.push("", "MISSED OPPORTUNITIES:");
    for (const label of missed) {
      lines.push(`  - ${label}`);
    }
  }

  lines.push(
    "",
    "KEY TAKEAWAY:",
    `You scored ${pct}% in this ${state.scenario.role} simulation. ` +
    (pct >= 70
      ? "Your decisions demonstrated sound judgment under pressure."
      : "Focus on systematic investigation before taking major actions.")
  );

  return lines.join("\n");
}
