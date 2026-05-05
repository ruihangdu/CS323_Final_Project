import { mutateState, makeEvent, addFeedEvent } from "./state";
import type { SimulatorState } from "./state";

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
      if (s.sevDeclared) {
        message = "SEV1 already declared.";
        severity = "info";
        return;
      }
      s.sevDeclared = true;
      s.score.operationalSafety = Math.min(
        20,
        s.score.operationalSafety + 5
      );
      s.score.communication = Math.min(10, s.score.communication + 3);
      addFeedEvent(
        makeEvent(now(), "Incident Command", "SEV1 declared. On-call team assembled, incident channel opened.", "good")
      );
      message = "SEV1 declared. Incident channel created, on-call team paged.";
    });
    return { message, severity, state };
  },

  FREEZE_DEPLOYS: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.deploysFrozen) {
        message = "Deploys already frozen.";
        severity = "info";
        return;
      }
      s.deploysFrozen = true;
      s.score.operationalSafety = Math.min(
        20,
        s.score.operationalSafety + 4
      );
      addFeedEvent(
        makeEvent(now(), "Deploy System", "Deploy freeze activated. All pipelines paused.", "good")
      );
      message = "Deploys frozen. No new code can reach production.";
    });
    return { message, severity, state };
  },

  STOP_WORKERS: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.workersStopped) {
        message = "Background workers already stopped.";
        severity = "info";
        return;
      }
      s.workersStopped = true;
      s.score.operationalSafety = Math.min(
        20,
        s.score.operationalSafety + 3
      );
      addFeedEvent(
        makeEvent(now(), "Worker Fleet", "12 background worker pods terminated. Job queue paused.", "good")
      );
      message = "Background workers stopped. No further job failures.";
    });
    return { message, severity, state };
  },

  MAINTENANCE_MODE: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.maintenanceMode) {
        message = "App already in maintenance mode.";
        severity = "info";
        return;
      }
      s.maintenanceMode = true;
      s.score.operationalSafety = Math.min(
        20,
        s.score.operationalSafety + 2
      );
      addFeedEvent(
        makeEvent(now(), "Load Balancer", "Maintenance page enabled. Users see 503 with status link.", "info")
      );
      message = "App in maintenance mode. Users see maintenance page.";
    });
    return { message, severity, state };
  },

  SNAPSHOT_DB: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.damagedDbSnapshotted) {
        message = "Damaged DB already snapshotted.";
        severity = "info";
        return;
      }
      s.damagedDbSnapshotted = true;
      s.score.operationalSafety = Math.min(
        20,
        s.score.operationalSafety + 4
      );
      s.score.recovery = Math.min(20, s.score.recovery + 2);
      addFeedEvent(
        makeEvent(now(), "RDS", "Snapshot created: damaged-prod-20260417-0222. Forensic evidence preserved.", "good")
      );
      message = "Snapshot created. Forensic evidence preserved before any restore attempt.";
    });
    return { message, severity, state };
  },

  DISABLE_MAINT_BOT: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.maintBotDisabled) {
        message = "maint_bot already disabled.";
        severity = "info";
        return;
      }
      s.maintBotDisabled = true;
      s.score.diagnosis = Math.min(20, s.score.diagnosis + 5);
      s.score.prevention = Math.min(10, s.score.prevention + 5);
      addFeedEvent(
        makeEvent(now(), "IAM", "maint_bot credentials revoked. Further destructive automation blocked.", "good")
      );
      message = "maint_bot credentials revoked. Further destructive automation blocked.";
    });
    return { message, severity, state };
  },

  RESTORE_LATEST_BACKUP: () => {
    let message = "";
    let severity: ActionSeverity = "bad";
    const state = mutateState((s) => {
      if (s.latestBackupRestored) {
        message = "Already attempted latest backup restore.";
        severity = "info";
        return;
      }
      s.latestBackupRestored = true;
      // Penalty: unverified backup
      s.score.recovery = Math.max(0, s.score.recovery - 5);
      if (!s.backupInspected) {
        s.score.diagnosis = Math.max(0, s.score.diagnosis - 3);
      }
      addFeedEvent(
        makeEvent(now(), "Restore Job", "Restore failed after 20 minutes: backup incomplete / verification failed. Backup size 112GB vs expected 1.8TB. Restore aborted.", "bad")
      );
      message = "FAILED: Restore from latest backup failed. The 2026-04-17 backup is unverified and only 112GB — likely incomplete.";
    });
    return { message, severity, state };
  },

  RESTORE_VERIFIED_BACKUP: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.verifiedBackupRestored) {
        message = "Verified backup restore already initiated.";
        severity = "info";
        return;
      }
      s.verifiedBackupRestored = true;
      s.score.recovery = Math.min(20, s.score.recovery + 15);
      if (!s.damagedDbSnapshotted) {
        s.score.operationalSafety = Math.max(0, s.score.operationalSafety - 2);
        addFeedEvent(
          makeEvent(now(), "Recovery", "WARNING: Restore started without snapshotting damaged DB first.", "warning")
        );
      }
      addFeedEvent(
        makeEvent(now(), "Recovery", "Recovery DB restored to 01:44. Core data validated. Possible data loss window: 01:44–02:10.", "good")
      );
      message = "Recovery in progress. Restoring from 2026-04-16 verified backup + WAL replay to 01:44. Estimated data loss window: 01:44–02:10.";
    });
    return { message, severity, state };
  },

  PROMOTE_REPLICA_1: () => {
    let message = "";
    let severity: ActionSeverity = "bad";
    const state = mutateState((s) => {
      if (s.replica1Promoted) {
        message = "Replica-db-1 already promoted.";
        severity = "info";
        return;
      }
      s.replica1Promoted = true;
      s.score.recovery = Math.max(0, s.score.recovery - 8);
      s.score.operationalSafety = Math.max(0, s.score.operationalSafety - 5);
      addFeedEvent(
        makeEvent(now(), "DB Failover", "Replica-db-1 promoted to primary. API errors continue. Replica had replayed DROP SCHEMA — missing data persists.", "bad")
      );
      message = "RISKY: Replica-db-1 promoted but missing data persists. Replica had replayed the destructive DROP SCHEMA transaction at 02:11:16Z.";
    });
    return { message, severity, state };
  },

  INSPECT_REPLICA_2: () => {
    let message = "";
    let severity: ActionSeverity = "good";
    const state = mutateState((s) => {
      if (s.replica2Inspected) {
        message = "Replica-db-2 already inspected.";
        severity = "info";
        return;
      }
      s.replica2Inspected = true;
      s.score.diagnosis = Math.min(20, s.score.diagnosis + 3);
      s.score.recovery = Math.min(20, s.score.recovery + 3);
      addFeedEvent(
        makeEvent(now(), "DB Replica", "replica-db-2 inspection complete. 60-min delayed replica. Last replay: 01:14 UTC — BEFORE incident. Schema intact. 2.41M tasks, 381K projects found.", "good")
      );
      message = "replica-db-2 is safe. 60-minute delayed replica, last replayed at 01:14 — before the DROP SCHEMA. Can serve reads or be used as recovery baseline.";
    });
    return { message, severity, state };
  },

  PUBLISH_STATUS_UPDATE: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      const alreadyPublished = s.statusPublished;
      s.statusPublished = true;

      const hasRootCause = s.rootCauseDiscovered || s.maintBotDisabled;
      if (!hasRootCause) {
        // Publishing without knowing root cause = overconfident
        s.score.communication = Math.max(0, s.score.communication - 3);
        severity = "warning";
        addFeedEvent(
          makeEvent(now(), "Status Page", "Posted: 'We are investigating reports of missing data.' (Note: root cause unknown at time of posting)", "warning")
        );
        message = "Status update published, but root cause was not confirmed. Posting before understanding the incident risks misleading customers.";
      } else {
        if (!alreadyPublished) {
          s.score.communication = Math.min(10, s.score.communication + 4);
        }
        severity = "good";
        addFeedEvent(
          makeEvent(now(), "Status Page", "Posted: 'We identified a maintenance script that ran against production. Recovery is underway. ETA 30 min.'", "good")
        );
        message = "Status update published with accurate root cause summary.";
      }
    });
    return { message, severity: severity!, state };
  },

  CLOSE_INCIDENT: () => {
    let message = "";
    let severity: ActionSeverity;
    const state = mutateState((s) => {
      s.incidentClosed = true;

      const hasRecovery = s.verifiedBackupRestored;
      const hasRootCause = s.rootCauseDiscovered || s.maintBotDisabled;
      const closedEarly = !hasRecovery || !hasRootCause;

      if (closedEarly) {
        s.score.communication = Math.max(0, s.score.communication - 3);
        s.score.prevention = Math.max(0, s.score.prevention - 2);
        severity = "warning";
        addFeedEvent(
          makeEvent(now(), "Incident Command", "Incident closed prematurely. Root cause or recovery not fully established.", "warning")
        );
        message = "Incident closed, but recovery was not fully confirmed. Closing early risks unresolved customer data issues.";
      } else {
        s.score.prevention = Math.min(10, s.score.prevention + 5);
        s.score.communication = Math.min(10, s.score.communication + 3);
        severity = "good";
        addFeedEvent(
          makeEvent(now(), "Incident Command", "Incident closed. Recovery validated. PIR scheduled for next business day.", "good")
        );
        message = "Incident resolved. Recovery confirmed, customers notified, PIR scheduled.";
      }

      // Generate debrief
      s.debrief = generateDebrief(s);
    });
    return { message, severity: severity!, state };
  },
};

function generateDebrief(s: SimulatorState): string {
  const total = s.totalScore;
  const lines: string[] = [];

  lines.push(`Overall Score: ${total}/100`);
  lines.push("");
  lines.push("Diagnosis:");
  if (s.rootCauseDiscovered && s.maintBotDisabled) {
    lines.push(
      "You correctly identified that the outage was caused by a destructive SQL command from maint_bot running fix_replication.sh against the production database."
    );
  } else if (s.rootCauseDiscovered) {
    lines.push(
      "You found the DROP SCHEMA command in postgres.log. You did not disable maint_bot to prevent recurrence."
    );
  } else {
    lines.push(
      "Root cause was not discovered. The key clue was in /logs/postgres.log: DROP SCHEMA public CASCADE executed by maint_bot at 02:10:59."
    );
  }

  lines.push("");
  lines.push("Operational Safety:");
  const safetyActions = [
    s.sevDeclared && "Declared SEV1",
    s.deploysFrozen && "Froze deploys",
    s.workersStopped && "Stopped background workers",
    s.damagedDbSnapshotted && "Snapshotted damaged DB",
  ].filter(Boolean);
  if (safetyActions.length > 0) {
    lines.push(`You took the following safety measures: ${safetyActions.join(", ")}.`);
  } else {
    lines.push("No operational safety measures taken before recovery attempts.");
  }

  lines.push("");
  lines.push("Recovery:");
  if (s.verifiedBackupRestored) {
    lines.push(
      "You restored from the last verified backup (2026-04-16) and replayed WAL to 01:44. Remaining data-loss window: 01:44–02:10."
    );
  } else if (s.latestBackupRestored) {
    lines.push(
      "You attempted to restore from the latest backup, which failed — it was unverified and only 112GB. Always inspect backup manifest before restoring."
    );
  } else {
    lines.push("No recovery action was taken.");
  }

  lines.push("");
  lines.push("Missed Clues:");
  const missed: string[] = [];
  if (!s.commandsRun.some((c) => c.includes("postgres.log"))) {
    missed.push(
      "At 02:10:59, postgres.log showed DROP SCHEMA public CASCADE executed by maint_bot. This was the definitive root cause."
    );
  }
  if (!s.commandsRun.some((c) => c.includes("manifest.json") || c.includes("s3 ls"))) {
    missed.push(
      "The backup manifest showed the latest backup was only 112GB and unverified — a critical red flag before any restore."
    );
  }
  if (!s.commandsRun.some((c) => c.includes("replica.lag"))) {
    missed.push(
      "Checking replica.lag would have revealed replica-db-1 replayed the DROP SCHEMA at 02:11:16Z and is unsafe for promotion."
    );
  }
  if (missed.length > 0) {
    lines.push(...missed);
  } else {
    lines.push("You inspected all key evidence before acting — excellent methodology.");
  }

  lines.push("");
  lines.push("Recommended next challenge:");
  lines.push(
    "Replica Roulette — determine which replica, if any, is safe to promote when the primary is compromised."
  );

  return lines.join("\n");
}

export function handleAction(action: string): ActionResult {
  const handler = ACTION_HANDLERS[action];
  if (!handler) {
    const state = mutateState(() => {});
    return {
      message: `Unknown action: ${action}`,
      severity: "info",
      state,
    };
  }
  return handler();
}
