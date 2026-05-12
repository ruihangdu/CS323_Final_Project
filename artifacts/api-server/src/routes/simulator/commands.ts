import { mutateState, getState, makeEvent } from "./state";
import { SCENARIOS } from "./scenarios";

const SHARED_COMMANDS: Record<string, () => string> = {
  help: () => {
    const s = getState();
    const scenario = SCENARIOS[s.scenarioId];
    const cmds = scenario ? Object.keys(scenario.commands) : [];
    return `Available commands:
  help                    Show this help message
${cmds.map(c => `  ${c}`).join("\n")}

Type any command exactly as shown to run it.`;
  },
};

function scoreCommandRun(command: string, scenarioId: string): void {
  mutateState((state) => {
    const cmd = command.trim().toLowerCase();

    if (scenarioId === "maint_bot") {
      if (cmd.includes("postgres.log") && !state.rootCauseDiscovered) {
        state.rootCauseDiscovered = true;
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 10);
      }
      if (cmd.includes("admin-runner.log")) {
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 5);
      }
      if ((cmd.includes("manifest.json") || cmd.includes("s3 ls")) && !state.backupInspected) {
        state.backupInspected = true;
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 3);
      }
      if (cmd.includes("replica.lag")) {
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 2);
      }
      if (cmd.includes("fix_replication.sh")) {
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 5);
      }
    }

    if (scenarioId === "bad_deploy") {
      if (cmd.includes("deploy.log") && !state.deployLogChecked) {
        state.deployLogChecked = true;
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 6);
      }
      if ((cmd.includes("git diff") || cmd.includes("git show")) && !state.breakingChangeFound) {
        state.breakingChangeFound = true;
        state.rootCauseDiscovered = true;
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 7);
      }
      if (cmd.includes("kubectl logs")) {
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 3);
      }
    }

    if (scenarioId === "memory_siege") {
      if (cmd.includes("kubectl top") && !state.memoryLeakIdentified) {
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 4);
      }
      if ((cmd.includes("git show") || cmd.includes("git log")) && !state.memoryLeakIdentified) {
        state.memoryLeakIdentified = true;
        state.rootCauseDiscovered = true;
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 8);
      }
      if (cmd.includes("kubectl logs")) {
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 3);
      }
    }

    if (scenarioId === "config_catastrophe") {
      if (cmd.includes("configmap") && !state.configMapChecked) {
        state.configMapChecked = true;
        state.rootCauseDiscovered = true;
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 8);
      }
      if (cmd.includes("terraform") || cmd.includes("git log")) {
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 4);
      }
      if (cmd.includes("payment-service-eu.log")) {
        state.score.diagnosis = Math.min(20, state.score.diagnosis + 3);
      }
    }

    if (!state.commandsRun.includes(command)) {
      state.commandsRun.push(command);
    }
  });
}

export function handleCommand(command: string): string {
  const trimmed = command.trim();
  const s = getState();
  const scenarioId = s.scenarioId;

  scoreCommandRun(trimmed, scenarioId);

  // Help is always available
  if (trimmed.toLowerCase() === "help") {
    return SHARED_COMMANDS.help();
  }

  // Try scenario-specific commands
  const scenario = SCENARIOS[scenarioId];
  if (scenario) {
    const exactMatch = scenario.commands[trimmed];
    if (exactMatch) return exactMatch();

    // Try prefix match
    const prefixMatch = Object.keys(scenario.commands).find(k =>
      trimmed.toLowerCase().startsWith(k.toLowerCase())
    );
    if (prefixMatch) return scenario.commands[prefixMatch]();
  }

  return `bash: ${trimmed}: command not found\nType 'help' to see available commands.`;
}
