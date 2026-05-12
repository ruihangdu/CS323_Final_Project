import { v4 as uuidv4 } from "uuid";

export type FeedEventType = "info" | "good" | "warning" | "bad" | "critical";

export interface FeedEvent {
  id: string;
  time: string;
  source: string;
  message: string;
  type: FeedEventType;
}

export interface CosScoreBreakdown {
  investigation: number;
  crisisContainment: number;
  stakeholderManagement: number;
  creatorSupport: number;
  communication: number;
  prevention: number;
}

export interface CosSimulatorState {
  time: string;
  clipContextChecked: boolean;
  brandPostPaused: boolean;
  creatorBriefed: boolean;
  agencyContacted: boolean;
  megaCorpReachedOut: boolean;
  legalConsulted: boolean;
  statementIssued: boolean;
  statementIssuedBeforeContextChecked: boolean;
  apologyIssued: boolean;
  statementDrafted: boolean;
  statementTone: string | null;
  statementChannels: string[];
  statementMessages: string[];
  dealNegotiated: boolean;
  dealStance: string | null;
  creatorPostedSolo: boolean;
  contractsReviewed: boolean;
  incidentClosed: boolean;
  commandsRun: string[];
  score: CosScoreBreakdown;
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

export function createInitialState(): CosSimulatorState {
  return {
    time: "09:47",
    clipContextChecked: false,
    brandPostPaused: false,
    creatorBriefed: false,
    agencyContacted: false,
    megaCorpReachedOut: false,
    legalConsulted: false,
    statementIssued: false,
    statementIssuedBeforeContextChecked: false,
    apologyIssued: false,
    statementDrafted: false,
    statementTone: null,
    statementChannels: [],
    statementMessages: [],
    dealNegotiated: false,
    dealStance: null,
    creatorPostedSolo: false,
    contractsReviewed: false,
    incidentClosed: false,
    commandsRun: [],
    score: {
      investigation: 0,
      crisisContainment: 0,
      stakeholderManagement: 0,
      creatorSupport: 0,
      communication: 0,
      prevention: 0,
    },
    feed: [
      makeEvent("09:47", "Social Monitor", "Clip from 6-month-old stream is going viral — 12K views in 20 min. Comment section turning hostile.", "critical"),
      makeEvent("09:49", "Agency Slack", "Heads up: a clip is circulating. Context looks bad, tone feels off. Monitoring. Do NOT respond yet.", "warning"),
      makeEvent("09:51", "MegaCorp Sponsor", "Inbound from MegaCorp brand team — they've seen the clip. Deal on hold pending your response. 6-hour window.", "critical"),
      makeEvent("09:52", "Social Monitor", "Clip now at 28K views. Trending negative sentiment. Hashtag forming. 31% of commenters asking for context.", "bad"),
      makeEvent("09:54", "Creator DM", "Creator messaged you: 'What is happening? I'm getting flooded with notifications. Should I respond?'", "warning"),
      makeEvent("09:56", "Social Monitor", "Views at 67K. Media outlet @DigitalBeat just tweeted asking for comment. First press inquiry in.", "critical"),
      makeEvent("09:58", "Agency Slack", "PR team flagging: do NOT issue apology before context is confirmed. This reads as sarcasm. Needs archive review.", "warning"),
    ],
    totalScore: 0,
    debrief: null,
  };
}

export function computeTotalScore(score: CosScoreBreakdown): number {
  return (
    score.investigation +
    score.crisisContainment +
    score.stakeholderManagement +
    score.creatorSupport +
    score.communication +
    score.prevention
  );
}

let simulatorState: CosSimulatorState = createInitialState();

export function getState(): CosSimulatorState {
  simulatorState.totalScore = computeTotalScore(simulatorState.score);
  return simulatorState;
}

export function resetState(): CosSimulatorState {
  simulatorState = createInitialState();
  return simulatorState;
}

export function addFeedEvent(event: FeedEvent): void {
  simulatorState.feed.push(event);
}

export function mutateState(fn: (s: CosSimulatorState) => void): CosSimulatorState {
  fn(simulatorState);
  simulatorState.totalScore = computeTotalScore(simulatorState.score);
  return simulatorState;
}
