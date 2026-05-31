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
): { score: number; matchedSkills: string[] } {
  if (!profile) return { score: 0, matchedSkills: [] };
  const keywords = SCENARIO_KEYWORDS[scenarioId] ?? [];
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
): string {
  const ids = Object.keys(SCENARIO_META);
  let best = ids[0] ?? "maint_bot";
  let bestScore = -1;
  for (const id of ids) {
    const { score } = scoreScenario(id, profile);
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}
