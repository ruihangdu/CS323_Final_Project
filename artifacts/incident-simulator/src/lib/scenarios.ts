import { SelectScenarioBodyScenarioId } from "@workspace/api-client-react";

// ── Scenario metadata (mirrors backend definitions) ────────────────────

export type ScenarioMeta = {
  id: SelectScenarioBodyScenarioId;
  name: string;
  subtitle: string;
  difficulty: "MEDIUM" | "HARD" | "EXPERT";
  synopsis: string;
  color: string;
};

export const SCENARIO_META: Record<string, ScenarioMeta> = {
  maint_bot: {
    id: SelectScenarioBodyScenarioId.maint_bot,
    name: "The Maint Bot Disaster",
    subtitle: "Production DB wiped by a rogue automation script",
    difficulty: "HARD",
    synopsis:
      "02:14 UTC — API 500 rate at 35% and climbing. Primary DB disk shed 79% of its data in 14 seconds. Find out what ran. Stop it. Recover.",
    color: "border-red-500/50",
  },
  bad_deploy: {
    id: SelectScenarioBodyScenarioId.bad_deploy,
    name: "Zero to 500",
    subtitle: "A deploy with a missing migration is destroying your API",
    difficulty: "MEDIUM",
    synopsis:
      "14:32 UTC — v2.48.0 deployed. 3 minutes later, 67% of requests return 500. CI passed. Rollback or fix forward?",
    color: "border-amber-500/50",
  },
  memory_siege: {
    id: SelectScenarioBodyScenarioId.memory_siege,
    name: "Death by a Thousand Leaks",
    subtitle: "OOM kills across your task-processor fleet",
    difficulty: "HARD",
    synopsis:
      "03:14 UTC — task-processor pods dying one by one. Memory climbing without end. Something in a recent PR introduced an unbounded cache. Find it.",
    color: "border-orange-500/50",
  },
  config_catastrophe: {
    id: SelectScenarioBodyScenarioId.config_catastrophe,
    name: "Wrong Address",
    subtitle:
      "EU payments down — a Terraform heredoc left malformed whitespace in a ConfigMap value",
    difficulty: "MEDIUM",
    synopsis:
      "09:15 UTC — EU customers can't complete checkout. NA is unaffected. No application code was deployed. The answer is in your infrastructure config — but it's subtler than it looks.",
    color: "border-blue-500/50",
  },
};

// ── Recommendation engine ──────────────────────────────────────────────

export type EmployerProfile = {
  roleTitle: string;
  company: string;
  roleContext: string;
  skills: string[];
  aiExpectations: string;
};

export const SCENARIO_KEYWORDS: Record<string, string[]> = {
  maint_bot: [
    "data",
    "database",
    "automation",
    "script",
    "production safety",
    "debug",
    "debugging",
    "root cause",
    "root-cause",
    "crisis",
    "crisis response",
    "recovery",
    "rollback",
    "backup",
    "ddl",
    "ai tool",
    "ai tools",
  ],
  bad_deploy: [
    "deploy",
    "ship",
    "rollout",
    "migration",
    "rollback",
    "tradeoff",
    "trade-off",
    "feature flag",
    "decision",
    "decisions",
    "production safety",
    "ci",
    "saying no",
    "communication",
    "stakeholder",
  ],
  memory_siege: [
    "memory",
    "performance",
    "leak",
    "oom",
    "cache",
    "scale",
    "scaling",
    "pod",
    "optimization",
    "architecture intuition",
    "root cause",
    "root-cause",
    "systems thinking",
  ],
  config_catastrophe: [
    "config",
    "configuration",
    "infrastructure",
    "terraform",
    "yaml",
    "subtle",
    "architecture intuition",
    "codebase fluency",
    "unfamiliar code",
    "reading unfamiliar code",
    "region",
    "stakeholder communication",
  ],
};

// ── Chief of Staff scenario set ─────────────────────────────────────────
// These render in the picker when the employer picked Chief of Staff.
// The CoS simulator has its own built-in scenario, so the selected id
// here is informational only — Launch routes to /cos-simulator/.

export type CosScenarioMeta = {
  id: string;
  name: string;
  subtitle: string;
  difficulty: "MEDIUM" | "HARD" | "EXPERT";
  synopsis: string;
  color: string;
};

export const COS_SCENARIO_META: Record<string, CosScenarioMeta> = {
  viral_spiral: {
    id: "viral_spiral",
    name: "The Viral Spiral",
    subtitle:
      "A 6-month-old clip is going viral with the wrong context",
    difficulty: "MEDIUM",
    synopsis:
      "11:42 PT — A clip from your creator's archive is at 2M views and climbing. Comments call it tone-deaf. The full context shows it was sarcastic. Apologize, clarify, or stay silent?",
    color: "border-amber-500/50",
  },
  board_surprise: {
    id: "board_surprise",
    name: "The Board Surprise",
    subtitle:
      "Board meeting in 48 hours. Your CEO just lost the largest account.",
    difficulty: "HARD",
    synopsis:
      "Tuesday 6 PM — A $4M ARR customer churned without warning. The board deck is due Thursday. The CEO wants to bury it on slide 14. You think it belongs in the opener — but how it lands depends on the framing.",
    color: "border-red-500/50",
  },
  cofounder_standoff: {
    id: "cofounder_standoff",
    name: "The Co-founder Standoff",
    subtitle:
      "Two leaders at war over a hiring call that already shipped offers",
    difficulty: "HARD",
    synopsis:
      "10:14 AM — The CTO sent offer letters to three senior engineers last night. The CPO didn't know and is refusing to onboard them. The candidates accept or walk in 24 hours. Both leaders want you in their corner.",
    color: "border-orange-500/50",
  },
  media_leak: {
    id: "media_leak",
    name: "The Media Leak",
    subtitle:
      "An internal Slack thread leaked to a reporter. The story drops tomorrow.",
    difficulty: "MEDIUM",
    synopsis:
      "9:48 PM — A reporter texts you screenshots from a private exec channel. They're quoting your VP of Product saying \"this launch is a disaster.\" Comment, pre-empt with a statement, or refuse to engage?",
    color: "border-blue-500/50",
  },
};

export const COS_SCENARIO_KEYWORDS: Record<string, string[]> = {
  viral_spiral: [
    "viral", "creator", "brand", "communications", "comms", "pr",
    "media", "narrative", "messaging", "executive communication",
    "discreet handling", "stakeholder",
  ],
  board_surprise: [
    "board", "executive", "strategic", "synthesis", "ceo", "narrative",
    "deck", "communication", "stakeholder management",
    "executive communication", "operating cadence", "framing",
  ],
  cofounder_standoff: [
    "cross-functional", "orchestrat", "leader", "conflict", "stakeholder",
    "triage", "ambig", "negotiat", "discreet", "crisis",
  ],
  media_leak: [
    "media", "press", "leak", "communications", "pr", "narrative",
    "crisis", "stakeholder", "discreet", "executive communication",
    "sensitive",
  ],
};

export const PENDING_SCENARIO_KEY = "employer.pendingScenario";

export function readEmployerProfile(): EmployerProfile | null {
  try {
    const raw = sessionStorage.getItem("employer.profile");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmployerProfile;
    if (!parsed.roleTitle) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function scoreScenario(
  scenarioId: string,
  profile: EmployerProfile | null,
  keywordMap: Record<string, string[]> = SCENARIO_KEYWORDS,
): { score: number; matchedSkills: string[] } {
  if (!profile) return { score: 0, matchedSkills: [] };
  const keywords = keywordMap[scenarioId] ?? [];
  const haystack = (
    profile.roleContext +
    " " +
    profile.skills.join(" ")
  ).toLowerCase();
  const score = keywords.filter((kw) => haystack.includes(kw)).length;
  const matchedSkills = profile.skills.filter((skill) => {
    const lower = skill.toLowerCase();
    return keywords.some((kw) => lower.includes(kw) || kw.includes(lower));
  });
  return { score, matchedSkills };
}

export function pickRecommendedScenario(
  profile: EmployerProfile | null,
  meta: Record<string, { id: string }> = SCENARIO_META,
  keywordMap: Record<string, string[]> = SCENARIO_KEYWORDS,
): string {
  const ids = Object.keys(meta);
  let best = ids[0] ?? "maint_bot";
  let bestScore = -1;
  for (const id of ids) {
    const { score } = scoreScenario(id, profile, keywordMap);
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}
