import { v4 as uuidv4 } from "uuid";
import { SCENARIOS } from "./scenarios";

export type FeedEventType = "info" | "good" | "warning" | "bad" | "critical";

export interface FeedEvent {
  id: string;
  time: string;
  source: string;
  message: string;
  type: FeedEventType;
}

export interface ScoreBreakdown {
  diagnosis: number;
  aiDelegation: number;
  operationalSafety: number;
  recovery: number;
  communication: number;
  prevention: number;
}

export interface SimulatorState {
  time: string;
  scenarioId: string;
  scenarioSelected: boolean;
  diagnosisSubmitted: boolean;
  diagnosisScore: number;
  recoveryCompleted: boolean;
  recoveryChoice: string | null;
  sevDeclared: boolean;
  deploysFrozen: boolean;
  workersStopped: boolean;
  maintenanceMode: boolean;
  damagedDbSnapshotted: boolean;
  maintBotDisabled: boolean;
  rootCauseDiscovered: boolean;
  backupInspected: boolean;
  latestBackupRestored: boolean;
  verifiedBackupRestored: boolean;
  replica1Promoted: boolean;
  replica2Inspected: boolean;
  deployLogChecked: boolean;
  breakingChangeFound: boolean;
  memoryLeakIdentified: boolean;
  processorsScaledDown: boolean;
  configMapChecked: boolean;
  regionIsolated: boolean;
  statusPublished: boolean;
  incidentClosed: boolean;
  commandsRun: string[];
  score: ScoreBreakdown;
  feed: FeedEvent[];
  totalScore: number;
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

function blankState(scenarioId = "maint_bot", scenarioSelected = false): SimulatorState {
  const scenario = SCENARIOS[scenarioId];
  return {
    time: scenario?.initialTime ?? "02:14",
    scenarioId,
    scenarioSelected,
    diagnosisSubmitted: false,
    diagnosisScore: 0,
    recoveryCompleted: false,
    recoveryChoice: null,
    sevDeclared: false,
    deploysFrozen: false,
    workersStopped: false,
    maintenanceMode: false,
    damagedDbSnapshotted: false,
    maintBotDisabled: false,
    rootCauseDiscovered: false,
    backupInspected: false,
    latestBackupRestored: false,
    verifiedBackupRestored: false,
    replica1Promoted: false,
    replica2Inspected: false,
    deployLogChecked: false,
    breakingChangeFound: false,
    memoryLeakIdentified: false,
    processorsScaledDown: false,
    configMapChecked: false,
    regionIsolated: false,
    statusPublished: false,
    incidentClosed: false,
    commandsRun: [],
    score: {
      diagnosis: 0,
      aiDelegation: 0,
      operationalSafety: 0,
      recovery: 0,
      communication: 0,
      prevention: 0,
    },
    feed: scenario ? [...scenario.initialFeed] : [
      makeEvent("02:14", "PagerDuty", "API 500 rate > 35%", "critical"),
      makeEvent("02:15", "Support", "Customers report empty dashboards", "bad"),
    ],
    totalScore: 0,
    debrief: null,
  };
}

export function createInitialState(): SimulatorState {
  return blankState("maint_bot", false);
}

export function createScenarioState(scenarioId: string): SimulatorState {
  return blankState(scenarioId, true);
}

export function computeTotalScore(score: ScoreBreakdown): number {
  return (
    score.diagnosis +
    score.aiDelegation +
    score.operationalSafety +
    score.recovery +
    score.communication +
    score.prevention
  );
}

let simulatorState: SimulatorState = createInitialState();

export function getState(): SimulatorState {
  simulatorState.totalScore = computeTotalScore(simulatorState.score);
  return simulatorState;
}

export function resetState(): SimulatorState {
  simulatorState = createInitialState();
  return simulatorState;
}

export function loadScenario(scenarioId: string): SimulatorState {
  simulatorState = createScenarioState(scenarioId);
  return simulatorState;
}

export function addFeedEvent(event: FeedEvent): void {
  simulatorState.feed.push(event);
}

export function mutateState(fn: (s: SimulatorState) => void): SimulatorState {
  fn(simulatorState);
  simulatorState.totalScore = computeTotalScore(simulatorState.score);
  return simulatorState;
}
