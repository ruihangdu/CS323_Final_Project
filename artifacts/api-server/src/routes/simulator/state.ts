import { v4 as uuidv4 } from "uuid";

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

export function createInitialState(): SimulatorState {
  return {
    time: "02:14",
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
    feed: [
      makeEvent("02:14", "PagerDuty", "API 500 rate > 35%", "critical"),
      makeEvent("02:15", "Support", "Customers report empty dashboards", "bad"),
      makeEvent("02:16", "Monitoring", "Background jobs failing", "warning"),
      makeEvent("02:17", "Slack #support", 'Acme Corp says "all tasks disappeared"', "bad"),
      makeEvent("02:19", "Monitoring", "Primary DB disk usage dropped from 1.8TB to 370GB", "critical"),
    ],
    totalScore: 0,
    debrief: null,
  };
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

export function addFeedEvent(event: FeedEvent): void {
  simulatorState.feed.push(event);
}

export function mutateState(fn: (s: SimulatorState) => void): SimulatorState {
  fn(simulatorState);
  simulatorState.totalScore = computeTotalScore(simulatorState.score);
  return simulatorState;
}
