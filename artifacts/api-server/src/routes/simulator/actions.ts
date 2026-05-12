import { mutateState, makeEvent, addFeedEvent, getState } from "./state";
import type { SimulatorState } from "./state";
import { SCENARIOS } from "./scenarios";

type ActionSeverity = "good" | "warning" | "bad" | "info";

interface ActionResult {
  message: string;
  severity: ActionSeverity;
  state: SimulatorState;
}

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const ACTION_HANDLERS: Record<string, () => ActionResult> = {
  DECLARE_SEV1: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.sevDeclared) { message = "SEV1 already declared."; severity = "info"; return; }
      s.sevDeclared = true;
      s.score.operationalSafety = Math.min(20, s.score.operationalSafety + 5);
      s.score.communication = Math.min(10, s.score.communication + 3);
      addFeedEvent(makeEvent(now(), "Incident Command", "SEV1 declared. On-call team assembled, war room opened.", "good"));
      message = "SEV1 declared. Incident channel created, on-call team paged.";
    });
    return { message, severity, state };
  },

  FREEZE_DEPLOYS: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.deploysFrozen) { message = "Deploys already frozen."; severity = "info"; return; }
      s.deploysFrozen = true;
      s.score.operationalSafety = Math.min(20, s.score.operationalSafety + 4);
      addFeedEvent(makeEvent(now(), "Deploy System", "Deploy freeze activated. All CI/CD pipelines paused.", "good"));
      message = "Deploys frozen. No new code can reach production while you investigate.";
    });
    return { message, severity, state };
  },

  STOP_WORKERS: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.workersStopped) { message = "Background workers already stopped."; severity = "info"; return; }
      s.workersStopped = true;
      s.score.operationalSafety = Math.min(20, s.score.operationalSafety + 3);
      addFeedEvent(makeEvent(now(), "Worker Fleet", "Background worker pods terminated. Job queue paused.", "good"));
      message = "Background workers stopped. No further job failures while incident is active.";
    });
    return { message, severity, state };
  },

  MAINTENANCE_MODE: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.maintenanceMode) { message = "Already in maintenance mode."; severity = "info"; return; }
      s.maintenanceMode = true;
      s.score.operationalSafety = Math.min(20, s.score.operationalSafety + 2);
      addFeedEvent(makeEvent(now(), "Load Balancer", "Maintenance page enabled. Users see 503 with status link.", "info"));
      message = "App in maintenance mode. Users see maintenance page while you work.";
    });
    return { message, severity, state };
  },

  // maint_bot scenario investigation
  SNAPSHOT_DB: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.damagedDbSnapshotted) { message = "Damaged DB already snapshotted."; severity = "info"; return; }
      s.damagedDbSnapshotted = true;
      s.score.operationalSafety = Math.min(20, s.score.operationalSafety + 4);
      s.score.recovery = Math.min(20, s.score.recovery + 2);
      addFeedEvent(makeEvent(now(), "RDS", "Snapshot created: damaged-prod-snapshot. Forensic evidence preserved.", "good"));
      message = "Snapshot taken. Forensic evidence preserved before any restore attempt. Good discipline.";
    });
    return { message, severity, state };
  },

  DISABLE_MAINT_BOT: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.maintBotDisabled) { message = "maint_bot already disabled."; severity = "info"; return; }
      s.maintBotDisabled = true;
      s.rootCauseDiscovered = true;
      s.score.diagnosis = Math.min(20, s.score.diagnosis + 5);
      s.score.prevention = Math.min(10, s.score.prevention + 5);
      addFeedEvent(makeEvent(now(), "IAM", "maint_bot credentials revoked. Destructive automation blocked.", "good"));
      message = "maint_bot credentials revoked. Root cause confirmed: automation script ran against production DB.";
    });
    return { message, severity, state };
  },

  INSPECT_REPLICA_2: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.replica2Inspected) { message = "Replica-db-2 already inspected."; severity = "info"; return; }
      s.replica2Inspected = true;
      s.score.diagnosis = Math.min(20, s.score.diagnosis + 3);
      s.score.recovery = Math.min(20, s.score.recovery + 3);
      addFeedEvent(makeEvent(now(), "DB Replica", "replica-db-2: 60-min delayed replica. Last replay: 01:14 UTC — BEFORE incident. Schema intact. 2.41M tasks found.", "good"));
      message = "replica-db-2 is safe. 60-min delayed, last replayed at 01:14 — before the DROP SCHEMA. Can be used as recovery baseline.";
    });
    return { message, severity, state };
  },

  RESTORE_LATEST_BACKUP: () => {
    let message = "";
    let severity: ActionSeverity = "bad";
    const state = mutateState((s) => {
      if (s.latestBackupRestored) { message = "Already attempted latest backup restore."; severity = "info"; return; }
      s.latestBackupRestored = true;
      s.score.recovery = Math.max(0, s.score.recovery - 5);
      if (!s.backupInspected) s.score.diagnosis = Math.max(0, s.score.diagnosis - 3);
      addFeedEvent(makeEvent(now(), "Restore Job", "Restore FAILED: backup incomplete (112GB vs expected 1.8TB). Restore aborted after 20 min.", "bad"));
      message = "FAILED: The 2026-04-17 backup is unverified and only 112GB. Always inspect the backup manifest before restoring.";
    });
    return { message, severity, state };
  },

  RESTORE_VERIFIED_BACKUP: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.verifiedBackupRestored) { message = "Verified backup restore already initiated."; severity = "info"; return; }
      s.verifiedBackupRestored = true;
      s.score.recovery = Math.min(20, s.score.recovery + 15);
      if (!s.damagedDbSnapshotted) {
        s.score.operationalSafety = Math.max(0, s.score.operationalSafety - 2);
        addFeedEvent(makeEvent(now(), "Recovery", "WARNING: Restore started without snapshotting damaged DB first.", "warning"));
      }
      addFeedEvent(makeEvent(now(), "Recovery", "Restore from 2026-04-16 backup + WAL replay complete. Core data validated. Data loss window: 01:44–02:10.", "good"));
      message = "Recovery in progress. Restoring from verified backup + WAL replay. Data loss window: 01:44–02:10 UTC.";
    });
    return { message, severity, state };
  },

  PROMOTE_REPLICA_1: () => {
    let message = "";
    let severity: ActionSeverity = "bad";
    const state = mutateState((s) => {
      if (s.replica1Promoted) { message = "Replica-db-1 already promoted."; severity = "info"; return; }
      s.replica1Promoted = true;
      s.score.recovery = Math.max(0, s.score.recovery - 8);
      s.score.operationalSafety = Math.max(0, s.score.operationalSafety - 5);
      addFeedEvent(makeEvent(now(), "DB Failover", "CRITICAL: Replica-db-1 promoted. API errors continue — replica had replayed DROP SCHEMA at 02:11:16Z.", "bad"));
      message = "DANGEROUS: Replica-db-1 had already replayed the DROP SCHEMA. Promoting it did not help — the data is still gone.";
    });
    return { message, severity, state };
  },

  // bad_deploy scenario investigation
  CHECK_DEPLOY_LOG: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.deployLogChecked) { message = "Deploy log already checked."; severity = "info"; return; }
      s.deployLogChecked = true;
      s.score.diagnosis = Math.min(20, s.score.diagnosis + 6);
      addFeedEvent(makeEvent(now(), "Deploy System", "Deploy log reviewed: v2.48.0 ran 0 migrations at 14:31. Health check only tests /health (not schema validity).", "warning"));
      message = "Deploy log shows v2.48.0 ran 0 migrations — but kubectl logs show missing columns. A migration exists in the repo but was never run.";
    });
    return { message, severity, state };
  },

  IDENTIFY_BREAKING_CHANGE: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.breakingChangeFound) { message = "Breaking change already identified."; severity = "info"; return; }
      s.breakingChangeFound = true;
      s.rootCauseDiscovered = true;
      s.score.diagnosis = Math.min(20, s.score.diagnosis + 7);
      s.score.prevention = Math.min(10, s.score.prevention + 3);
      addFeedEvent(makeEvent(now(), "Git", "PR #2104 analysis: migration 20260512_add_assigned_to_subtasks.sql was committed separately and never applied before deploy.", "warning"));
      message = "Root cause confirmed: v2.48.0 expects columns (assigned_to_id, parent_task_id) that the migration never created. ORM refusing to start.";
    });
    return { message, severity, state };
  },

  // memory_siege scenario investigation
  IDENTIFY_MEMORY_LEAK: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.memoryLeakIdentified) { message = "Memory leak already identified."; severity = "info"; return; }
      s.memoryLeakIdentified = true;
      s.rootCauseDiscovered = true;
      s.score.diagnosis = Math.min(20, s.score.diagnosis + 8);
      s.score.prevention = Math.min(10, s.score.prevention + 3);
      addFeedEvent(makeEvent(now(), "Code Analysis", "PR #1847 identified: module-level Map with no eviction policy. Cache grows until OOM. Deployed task-processor-v1.14.0 at 02:40.", "bad"));
      message = "Root cause confirmed: PR #1847 introduced an unbounded in-memory permission cache. Every unique user_id adds a permanent entry. Grows without bound.";
    });
    return { message, severity, state };
  },

  SCALE_DOWN_PROCESSORS: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.processorsScaledDown) { message = "Processors already scaled down."; severity = "info"; return; }
      s.processorsScaledDown = true;
      s.score.operationalSafety = Math.min(20, s.score.operationalSafety + 3);
      addFeedEvent(makeEvent(now(), "Kubernetes", "task-processor replica count: 4 → 1. Reduced blast radius. Remaining pod memory: 3.8GB and climbing.", "warning"));
      message = "Scaled down to 1 processor pod. Reduces OOMKill frequency. Job queue will back up further — trade-off accepted during diagnosis.";
    });
    return { message, severity, state };
  },

  // config_catastrophe scenario investigation
  CHECK_CONFIGMAP: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.configMapChecked) { message = "ConfigMap already reviewed."; severity = "info"; return; }
      s.configMapChecked = true;
      s.rootCauseDiscovered = true;
      s.score.diagnosis = Math.min(20, s.score.diagnosis + 8);
      addFeedEvent(makeEvent(now(), "Kubernetes", "payment-eu ConfigMap: PAYMENT_GATEWAY_URL = na-gateway.stripe-taskforge.io — WRONG. Last updated by Terraform at 09:14:02Z.", "bad"));
      message = "Root cause confirmed: EU payment-service is pointing at the NA gateway. EU accounts cannot route via NA gateway — hence 402 on every charge.";
    });
    return { message, severity, state };
  },

  ISOLATE_EU_REGION: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.regionIsolated) { message = "EU region already isolated."; severity = "info"; return; }
      s.regionIsolated = true;
      s.score.operationalSafety = Math.min(20, s.score.operationalSafety + 3);
      addFeedEvent(makeEvent(now(), "Load Balancer", "EU payment traffic isolated. Checkout showing 'Payment temporarily unavailable' in EU region. NA unaffected.", "warning"));
      message = "EU region isolated. Prevents EU customers from seeing misleading payment errors while you fix the root cause.";
    });
    return { message, severity, state };
  },

  PUBLISH_STATUS_UPDATE: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      const alreadyPublished = s.statusPublished;
      s.statusPublished = true;
      const hasRootCause = s.rootCauseDiscovered || s.maintBotDisabled || s.breakingChangeFound || s.memoryLeakIdentified || s.configMapChecked;
      if (!hasRootCause) {
        s.score.communication = Math.max(0, s.score.communication - 3);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "Status Page", "Posted: 'We are investigating reports of issues.' (root cause unknown at time of posting)", "warning"));
        message = "Status update published, but root cause was not yet confirmed. Posting before understanding the incident can mislead customers.";
      } else {
        if (!alreadyPublished) s.score.communication = Math.min(10, s.score.communication + 4);
        severity = "good";
        addFeedEvent(makeEvent(now(), "Status Page", "Posted: Identified root cause. Recovery underway. ETA for resolution posted.", "good"));
        message = "Status update published with accurate root cause summary. Customers informed.";
      }
    });
    return { message, severity: severity!, state };
  },

  CLOSE_INCIDENT: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      s.incidentClosed = true;
      const hasRecovery = s.recoveryCompleted || s.verifiedBackupRestored;
      const hasRootCause = s.rootCauseDiscovered || s.maintBotDisabled;
      const closedEarly = !hasRecovery || !hasRootCause;
      if (closedEarly) {
        s.score.communication = Math.max(0, s.score.communication - 3);
        s.score.prevention = Math.max(0, s.score.prevention - 2);
        severity = "warning";
        addFeedEvent(makeEvent(now(), "Incident Command", "Incident closed prematurely. Root cause or recovery not fully established.", "warning"));
        message = "Incident closed, but recovery was not fully confirmed. Closing early risks unresolved customer issues.";
      } else {
        s.score.prevention = Math.min(10, s.score.prevention + 5);
        s.score.communication = Math.min(10, s.score.communication + 3);
        severity = "good";
        addFeedEvent(makeEvent(now(), "Incident Command", "Incident closed. Recovery validated. PIR scheduled for next business day.", "good"));
        message = "Incident resolved. Recovery confirmed, customers notified, PIR scheduled.";
      }
      s.debrief = generateDebrief(s);
    });
    return { message, severity: severity!, state };
  },
};

function generateDebrief(s: SimulatorState): string {
  const total = s.totalScore;
  const scenario = SCENARIOS[s.scenarioId];
  const lines: string[] = [];

  lines.push(`Overall Score: ${total}/100`);
  lines.push(`Scenario: ${scenario?.name ?? s.scenarioId}`);
  lines.push("");

  if (s.diagnosisSubmitted) {
    lines.push(`Diagnosis Score: ${s.diagnosisScore}/18`);
    lines.push(s.diagnosisScore >= 13 ? "You correctly identified the root cause and blast radius." : "Your hypothesis was partially correct. Review the scenario terminal output for full context.");
    lines.push("");
  } else {
    lines.push("Diagnosis: You closed without submitting a hypothesis. Running a post-mortem requires a documented root cause.");
    lines.push("");
  }

  lines.push("Operational Safety:");
  const safetyActions = [
    s.sevDeclared && "Declared SEV1",
    s.deploysFrozen && "Froze deploys",
    s.workersStopped && "Stopped background workers",
    s.damagedDbSnapshotted && "Snapshotted damaged DB",
    s.processorsScaledDown && "Scaled down processors",
    s.regionIsolated && "Isolated EU region",
  ].filter(Boolean);
  if (safetyActions.length > 0) {
    lines.push(`Safety measures taken: ${safetyActions.join(", ")}.`);
  } else {
    lines.push("No operational safety measures taken before recovery attempts.");
  }

  lines.push("");
  lines.push("Recovery:");
  if (s.recoveryCompleted && s.recoveryChoice) {
    const opt = scenario?.recoveryOptions.find(r => r.id === s.recoveryChoice);
    lines.push(`Strategy chosen: "${opt?.label ?? s.recoveryChoice}". ${opt?.points && opt.points > 0 ? "Good call." : "This had negative consequences — review the reasoning."}`);
  } else if (s.verifiedBackupRestored) {
    lines.push("You restored from the last verified backup. Correct approach for this scenario.");
  } else {
    lines.push("No recovery action was completed.");
  }

  lines.push("");
  lines.push("Missed Clues:");
  const missed: string[] = [];
  if (!s.commandsRun.some(c => c.includes("postgres.log") || c.includes("logs"))) {
    missed.push("Application and database logs contained the definitive root cause signature.");
  }
  if (s.scenarioId === "maint_bot" && !s.commandsRun.some(c => c.includes("manifest") || c.includes("s3 ls"))) {
    missed.push("The backup manifest showed the latest backup was only 112GB and unverified — a critical red flag before any restore.");
  }
  if (s.scenarioId === "maint_bot" && !s.commandsRun.some(c => c.includes("replica.lag"))) {
    missed.push("Checking replica.lag would have revealed replica-db-1 replayed DROP SCHEMA at 02:11:16Z — unsafe for promotion.");
  }
  if (s.scenarioId === "bad_deploy" && !s.deployLogChecked) {
    missed.push("The deploy log showed 0 migrations ran for v2.48.0 — the key clue that schema and code were out of sync.");
  }
  if (s.scenarioId === "memory_siege" && !s.commandsRun.some(c => c.includes("top pods") || c.includes("kubectl top"))) {
    missed.push("kubectl top pods would have shown memory climbing toward the 4GB limit — confirming OOM as the failure mode.");
  }
  if (s.scenarioId === "config_catastrophe" && !s.configMapChecked) {
    missed.push("The ConfigMap showed PAYMENT_GATEWAY_URL pointing to the NA endpoint — the direct cause of every 402 error.");
  }
  if (missed.length > 0) {
    lines.push(...missed);
  } else {
    lines.push("You inspected all key evidence before acting — excellent methodology.");
  }

  return lines.join("\n");
}

export function handleAction(action: string): ActionResult {
  const handler = ACTION_HANDLERS[action];
  if (!handler) {
    const state = mutateState(() => {});
    return { message: `Unknown action: ${action}`, severity: "info", state };
  }
  return handler();
}

export interface DiagnoseResult {
  categoryCorrect: boolean;
  triggerCorrect: boolean;
  blastRadiusScore: number;
  totalScore: number;
  feedback: string;
  state: SimulatorState;
}

export function handleDiagnosis(
  rootCauseCategory: string,
  specificTrigger: string,
  blastRadius: string[]
): DiagnoseResult {
  const s = getState();
  const scenario = SCENARIOS[s.scenarioId];

  if (!scenario) {
    return { categoryCorrect: false, triggerCorrect: false, blastRadiusScore: 0, totalScore: 0, feedback: "No scenario loaded.", state: s };
  }

  const categoryCorrect = rootCauseCategory === scenario.diagnosis.correctCategory;
  const triggerCorrect = specificTrigger === scenario.diagnosis.correctTrigger;
  const correctBlast = new Set(scenario.diagnosis.correctBlastRadius);
  const blastCorrect = blastRadius.filter(b => correctBlast.has(b)).length;
  const blastWrong = blastRadius.filter(b => !correctBlast.has(b)).length;
  const blastRadiusScore = Math.max(0, blastCorrect * 3 - blastWrong * 2);

  let totalScore = 0;
  if (categoryCorrect) totalScore += 5;
  if (triggerCorrect) totalScore += 8;
  totalScore += blastRadiusScore;

  const feedLines: string[] = [];
  if (categoryCorrect) feedLines.push("✓ Correct root cause category.");
  else feedLines.push(`✗ Root cause category was "${scenario.diagnosis.correctCategory.replace(/_/g, " ")}".`);

  if (triggerCorrect) feedLines.push("✓ Correct specific trigger identified.");
  else feedLines.push(`✗ Specific trigger: ${scenario.diagnosis.triggers.find(t => t.id === scenario.diagnosis.correctTrigger)?.label ?? scenario.diagnosis.correctTrigger}`);

  if (blastCorrect > 0) feedLines.push(`✓ Blast radius: ${blastCorrect} of ${correctBlast.size} affected systems correctly identified.`);
  if (blastWrong > 0) feedLines.push(`✗ ${blastWrong} incorrectly identified system(s) in blast radius (-${blastWrong * 2} pts).`);

  const feedback = feedLines.join("\n\n") + `\n\nDiagnosis score: ${totalScore}/18`;

  mutateState((st) => {
    st.diagnosisSubmitted = true;
    st.diagnosisScore = totalScore;
    st.score.diagnosis = Math.min(20, st.score.diagnosis + totalScore);
    if (triggerCorrect) st.rootCauseDiscovered = true;
    addFeedEvent(makeEvent(now(), "Incident Command", `Hypothesis submitted. Root cause ${triggerCorrect ? "CORRECT" : "INCORRECT"}. Score: ${totalScore}/18.`, triggerCorrect ? "good" : "warning"));
  });

  return { categoryCorrect, triggerCorrect, blastRadiusScore, totalScore, feedback, state: getState() };
}

export interface RecoverResult {
  message: string;
  severity: ActionSeverity;
  points: number;
  state: SimulatorState;
}

export function handleRecovery(strategy: string): RecoverResult {
  const s = getState();
  const scenario = SCENARIOS[s.scenarioId];

  if (!scenario) {
    return { message: "No scenario loaded.", severity: "info", points: 0, state: s };
  }

  const option = scenario.recoveryOptions.find(r => r.id === strategy);
  if (!option) {
    return { message: `Unknown recovery strategy: ${strategy}`, severity: "info", points: 0, state: s };
  }

  const severity: ActionSeverity = option.points > 5 ? "good" : option.points > 0 ? "warning" : "bad";

  mutateState((st) => {
    if (st.recoveryCompleted) return;
    st.recoveryCompleted = true;
    st.recoveryChoice = strategy;
    st.score.recovery = Math.max(0, Math.min(20, st.score.recovery + option.points));
    if (!st.damagedDbSnapshotted && st.scenarioId === "maint_bot" && option.points > 0) {
      st.score.operationalSafety = Math.max(0, st.score.operationalSafety - 2);
      addFeedEvent(makeEvent(now(), "Recovery", "WARNING: Recovery started without taking a forensic snapshot of the damaged state.", "warning"));
    }
    addFeedEvent(makeEvent(now(), "Recovery", option.feedMessage, option.feedType));
    if (option.terminates) {
      addFeedEvent(makeEvent(now(), "Recovery", "Recovery path exhausted. Revert this action and use a different strategy.", "bad"));
    }
  });

  return { message: option.feedMessage, severity, points: option.points, state: getState() };
}
