import { v4 as uuidv4 } from "uuid";

export type FeedEventType = "info" | "good" | "warning" | "bad" | "critical";

export interface FeedEvent {
  id: string;
  time: string;
  source: string;
  message: string;
  type: FeedEventType;
}

export interface CustomAction {
  id: string;
  label: string;
  category: string;
  scoreCategory: string;
  scoreValue: number;
  isRisky: boolean;
  feedMessage: string;
}

export interface CustomAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
}

export interface CustomScoreCategory {
  key: string;
  label: string;
  max: number;
}

export interface GeneratedScenario {
  title: string;
  subtitle: string;
  situation: string;
  startTime: string;
  role: string;
  terminalContext: string;
  feedEvents: FeedEvent[];
  actions: CustomAction[];
  agents: CustomAgent[];
  scoreCategories: CustomScoreCategory[];
}

export interface CustomSimulatorState {
  generating: boolean;
  generationError: string | null;
  scenario: GeneratedScenario | null;
  takenActions: string[];
  feed: FeedEvent[];
  score: Record<string, number>;
  totalScore: number;
  incidentClosed: boolean;
  time: string;
  debrief: string | null;
}

export function makeEvent(
  time: string,
  source: string,
  message: string,
  type: FeedEventType = "info"
): FeedEvent {
  return { id: uuidv4(), time, source, message, type };
}

function createInitialState(): CustomSimulatorState {
  return {
    generating: false,
    generationError: null,
    scenario: null,
    takenActions: [],
    feed: [],
    score: {},
    totalScore: 0,
    incidentClosed: false,
    time: "00:00",
    debrief: null,
  };
}

let state: CustomSimulatorState = createInitialState();

export function getState(): CustomSimulatorState {
  return state;
}

export function resetState(): CustomSimulatorState {
  state = createInitialState();
  return state;
}

export function startGenerating(): void {
  state = {
    ...createInitialState(),
    generating: true,
  };
}

export function setGenerationError(msg: string): void {
  state.generating = false;
  state.generationError = msg;
}

export function setScenario(scenario: GeneratedScenario): void {
  state.generating = false;
  state.generationError = null;
  state.scenario = scenario;
  state.time = scenario.startTime;
  // Seed feed with scenario's initial events
  state.feed = scenario.feedEvents.map((e) => ({ ...e, id: uuidv4() }));
  // Initialize score categories to 0
  state.score = {};
  for (const cat of scenario.scoreCategories) {
    state.score[cat.key] = 0;
  }
  state.totalScore = 0;
}

export function takeAction(
  actionId: string
): { feedback: string; ok: boolean } {
  if (!state.scenario) return { feedback: "No scenario loaded.", ok: false };
  if (state.takenActions.includes(actionId)) {
    return { feedback: "Action already taken.", ok: false };
  }

  const action = state.scenario.actions.find((a) => a.id === actionId);
  if (!action) return { feedback: "Unknown action.", ok: false };

  state.takenActions.push(actionId);

  // Award score
  const current = state.score[action.scoreCategory] ?? 0;
  const catDef = state.scenario.scoreCategories.find(
    (c) => c.key === action.scoreCategory
  );
  const max = catDef?.max ?? 20;
  const newVal = Math.min(current + action.scoreValue, max);
  if (action.isRisky && action.scoreValue < 0) {
    state.score[action.scoreCategory] = Math.max(0, current + action.scoreValue);
  } else {
    state.score[action.scoreCategory] = newVal;
  }

  state.totalScore = Object.values(state.score).reduce((a, b) => a + b, 0);

  // Add feed event
  if (action.feedMessage) {
    state.feed.push(
      makeEvent(state.time, "SYSTEM", action.feedMessage, action.isRisky ? "warning" : "good")
    );
  }

  return { feedback: action.feedMessage, ok: true };
}

export function closeIncident(debrief: string): void {
  state.incidentClosed = true;
  state.debrief = debrief;
}

export function addCommandToHistory(command: string): void {
  // no-op for now — commands are ephemeral in custom sim
}
