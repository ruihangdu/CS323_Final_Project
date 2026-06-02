// src/lib/challenge.ts

export type ChallengePayload = {
  v: 1;
  roleTitle: string;
  company: string;
  skills: string[];
  scenarioId: string;
  generatedAt: string;
};

export function encodeChallenge(payload: ChallengePayload): string {
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

export function decodeChallenge(encoded: string): ChallengePayload | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const obj = JSON.parse(json) as ChallengePayload;
    if (obj.v !== 1) return null;
    return obj;
  } catch {
    return null;
  }
}

export function buildChallengeUrl(payload: ChallengePayload): string {
  return `${window.location.origin}/challenge?d=${encodeChallenge(payload)}`;
}
