import { mutateState, getState, makeEvent } from "./state";

const COMMANDS: Record<string, () => string> = {
  help: () => `Available commands:
  help                          Show this help message
  kubectl get pods               List running pods
  kubectl logs taskforge-api     Show API pod logs
  cat /runbooks/backup-restore.md      Backup restore runbook
  cat /runbooks/db-replica-recovery.md Replica recovery runbook
  cat /scripts/fix_replication.sh      The maintenance script
  cat /logs/postgres.log               PostgreSQL logs
  cat /logs/admin-runner.log           Admin runner logs
  cat /backups/manifest.json           Backup manifest
  metric db.disk_usage                 DB disk usage metric
  metric api.500_rate                  API 500 error rate
  metric replica.lag                   Replica replication lag
  git log --since="6 hours ago"        Recent git commits
  aws s3 ls s3://taskforge-backups/full/  S3 backup list`,

  "kubectl get pods": () => `NAME                              READY   STATUS    RESTARTS   AGE
taskforge-api-6d9b4f7-8xvzp       0/1     CrashLoop   14         47m
taskforge-api-6d9b4f7-k2nmr       0/1     CrashLoop   13         47m
taskforge-worker-5b8c9f4-p9xjq    0/1     Error        8         47m
taskforge-worker-5b8c9f4-t3nwk    0/1     Error        7         47m
postgres-primary-0                1/1     Running      0         6d
postgres-replica-db-1-0           1/1     Running      0         6d
postgres-replica-db-2-0           1/1     Running      0         6d
admin-runner-prod-3               0/1     Completed    0         48m`,

  "kubectl logs taskforge-api": () => `2026-04-17T02:14:03Z ERROR: relation "public.tasks" does not exist
2026-04-17T02:14:03Z ERROR: relation "public.projects" does not exist
2026-04-17T02:14:04Z ERROR: relation "public.users" does not exist
2026-04-17T02:14:05Z FATAL: Could not connect to database schema: schema "public" has no tables
2026-04-17T02:14:06Z ERROR: SELECT * FROM public.tasks -- relation does not exist
2026-04-17T02:14:07Z Retrying DB connection (attempt 14/20)...
2026-04-17T02:14:09Z ERROR: relation "public.sessions" does not exist`,

  "cat /runbooks/backup-restore.md": () => `# Backup Restore Runbook — TaskForge Production

## Prerequisites
- Confirm backup integrity before restore
- Snapshot the damaged DB before any writes
- Put app in maintenance mode first

## Steps

### 1. Identify the target backup
\`\`\`
cat /backups/manifest.json
aws s3 ls s3://taskforge-backups/full/
\`\`\`
CAUTION: Do NOT assume the latest backup is valid. Check 'verified' flag and size.

### 2. Snapshot damaged database (mandatory before restore)
\`\`\`
aws rds create-db-snapshot \\
  --db-instance-identifier prod-db \\
  --db-snapshot-identifier damaged-$(date +%Y%m%d%H%M)
\`\`\`

### 3. Restore base backup
\`\`\`
aws s3 cp s3://taskforge-backups/full/2026-04-16/ /restore/base/ --recursive
pg_restore -Fd /restore/base/ -j 4 -d postgresql://taskforge_app@restore-db.internal/taskforge
\`\`\`

### 4. Apply WAL archives
\`\`\`
# Replay WAL up to just before the incident (02:10)
restore_command = 'aws s3 cp s3://taskforge-backups/wal/%f /restore/wal/%f'
recovery_target_time = '2026-04-17 02:09:00'
\`\`\`

### 5. Validate core data
\`\`\`sql
SELECT count(*) FROM public.tasks;    -- expect ~2.4M
SELECT count(*) FROM public.projects; -- expect ~380K
SELECT count(*) FROM public.users;    -- expect ~95K
\`\`\``,

  "cat /runbooks/db-replica-recovery.md": () => `# DB Replica Recovery Runbook — TaskForge

## Overview
This runbook covers how to assess replica safety before promotion.

## WARNING
Replicas stream WAL from primary in near-real-time.
If primary executes a destructive DDL (DROP SCHEMA, TRUNCATE), ALL
streaming replicas WILL replay that transaction unless:
- Replication is lagged > the commit time
- Replication was paused at the time of the event

## Assess replica safety
\`\`\`
metric replica.lag

-- Connect to replica and check:
SELECT pg_last_wal_receive_lsn();
SELECT pg_last_wal_replay_lsn();
SELECT pg_last_xact_replay_timestamp();
\`\`\`

## Safe promotion checklist
[ ] Replica lag > 5 minutes at time of incident
[ ] Replica WAL replay timestamp < incident timestamp (02:10:59)
[ ] Schema 'public' has tables (SELECT count(*) FROM pg_tables WHERE schemaname='public')
[ ] Row counts are reasonable (tasks ~2.4M, projects ~380K)

## Replicas
- replica-db-1: streaming replica (real-time, low-lag — HIGH RISK)
- replica-db-2: delayed replica (60-min lag — CHECK BEFORE USE)`,

  "cat /scripts/fix_replication.sh": () => `#!/bin/bash
# fix_replication.sh — Resets schema on target DB
# Created by: maint_bot
# Last modified: 2026-04-10

TARGET_DB=\${TARGET_DB:-staging}
DB_HOST=\${DB_HOST:-staging-db.internal}

echo "Running against: \$DB_HOST / \$TARGET_DB"

psql "postgresql://maint_bot@\$DB_HOST/\$TARGET_DB" <<SQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO taskforge_app;
SQL

echo "Done."`,

  "cat /logs/postgres.log": () => `2026-04-17T02:09:50 LOG:  connection received: host=admin-runner-prod-3 user=maint_bot
2026-04-17T02:09:52 LOG:  connection authorized: user=maint_bot database=taskforge
2026-04-17T02:10:59 LOG:  statement: DROP SCHEMA public CASCADE;
2026-04-17T02:11:00 LOG:  drop cascades to 47 other objects
2026-04-17T02:11:00 DETAIL: drop cascades to table public.users
                            drop cascades to table public.projects
                            drop cascades to table public.tasks
                            drop cascades to table public.sessions
                            drop cascades to table public.audit_log
                            ... and 42 more objects
2026-04-17T02:11:03 LOG:  statement: CREATE SCHEMA public;
2026-04-17T02:11:10 LOG:  statement: GRANT ALL ON SCHEMA public TO taskforge_app;
                            user=maint_bot origin=admin-runner-prod-3
2026-04-17T02:11:15 LOG:  disconnection: session time: 0:01:23 user=maint_bot database=taskforge
2026-04-17T02:14:03 ERROR: relation "public.tasks" does not exist at character 15`,

  "cat /logs/admin-runner.log": () => `2026-04-17T02:09:58 [INFO]  job started: fix_replication.sh
2026-04-17T02:09:59 [INFO]  env TARGET_DB=prod
2026-04-17T02:09:59 [INFO]  env DB_HOST=prod-db.internal
2026-04-17T02:10:00 [INFO]  user=maint_bot
2026-04-17T02:10:00 [WARN]  Running against prod-db.internal — production host detected
2026-04-17T02:10:01 [INFO]  Executing fix_replication.sh...
2026-04-17T02:11:14 [INFO]  psql exit code: 0
2026-04-17T02:11:15 [INFO]  job completed successfully
2026-04-17T02:11:15 [INFO]  --- previous runs ---
2026-04-17T01:55:22 [INFO]  job started: fix_replication.sh env TARGET_DB=staging
2026-04-17T01:55:31 [INFO]  job completed successfully (staging)`,

  "cat /backups/manifest.json": () => JSON.stringify(
    {
      full_backups: [
        {
          timestamp: "2026-04-16T00:00:00Z",
          location: "s3://taskforge-backups/full/2026-04-16/",
          size_gb: 1830,
          verified: true,
        },
        {
          timestamp: "2026-04-17T00:00:00Z",
          location: "s3://taskforge-backups/full/2026-04-17/",
          size_gb: 112,
          verified: false,
        },
      ],
      wal_archives: [
        {
          from: "2026-04-16T00:00:00Z",
          to: "2026-04-17T01:44:00Z",
          complete: true,
        },
        {
          from: "2026-04-17T01:44:00Z",
          to: "2026-04-17T02:14:00Z",
          complete: false,
        },
      ],
    },
    null,
    2
  ),

  "metric db.disk_usage": () => `db.disk_usage (primary)
  Current:  370 GB  ← !!
  Previous: 1,834 GB (02:10)
  1h ago:   1,831 GB
  24h ago:  1,793 GB
  Trend:    ▼ -79.8% drop at 02:10:59 UTC`,

  "metric api.500_rate": () => `api.500_rate
  Current:  94.2%
  02:20:    91.7%
  02:15:    37.2%
  02:10:    0.1% (baseline)
  Trend:    ▲ Spike began at 02:13 UTC`,

  "metric replica.lag": () => `replica.lag
  replica-db-1:
    Current lag:   0.3s  ← near real-time
    Replay LSN:    0/8A3F2210
    Last replay:   2026-04-17T02:11:16Z  ← AFTER the incident

  replica-db-2:
    Current lag:   3612s (60 min delayed replica)
    Replay LSN:    0/87BC1104
    Last replay:   2026-04-17T01:14:22Z  ← BEFORE the incident`,

  'git log --since="6 hours ago"': () => `commit a4f7d2b (HEAD -> main, origin/main)
Author: deploy-bot <deploy@taskforge.io>
Date:   Thu Apr 17 00:42:11 2026 +0000
    chore: update taskforge-api to v2.47.1

commit 8e3c91a
Author: priya@taskforge.io
Date:   Wed Apr 16 23:18:04 2026 +0000
    feat: add bulk task assignment API endpoint

commit 3f2a08d
Author: maint_bot <maint@taskforge.io>
Date:   Wed Apr 16 22:07:55 2026 +0000
    fix: update fix_replication.sh — add prod hostname env check (non-blocking)

commit c1d9b44
Author: alex@taskforge.io
Date:   Wed Apr 16 20:31:19 2026 +0000
    chore: rotate maint_bot credentials`,

  "aws s3 ls s3://taskforge-backups/full/": () => `2026-04-16 00:04:12      1972084736  2026-04-16/taskforge-full.dump.gz
2026-04-17 00:03:55       120586240  2026-04-17/taskforge-full.dump.gz

Note: 2026-04-17 backup is 112 GB vs expected ~1.8 TB.
Backup job started at 00:00 — possible incomplete snapshot.`,
};

const COMMAND_ALIASES: Record<string, string> = {
  "kubectl get pods": "kubectl get pods",
  "kubectl logs taskforge-api": "kubectl logs taskforge-api",
  "cat /runbooks/backup-restore.md": "cat /runbooks/backup-restore.md",
  "cat /runbooks/db-replica-recovery.md":
    "cat /runbooks/db-replica-recovery.md",
  "cat /scripts/fix_replication.sh": "cat /scripts/fix_replication.sh",
  "cat /logs/postgres.log": "cat /logs/postgres.log",
  "cat /logs/admin-runner.log": "cat /logs/admin-runner.log",
  "cat /backups/manifest.json": "cat /backups/manifest.json",
  "metric db.disk_usage": "metric db.disk_usage",
  "metric api.500_rate": "metric api.500_rate",
  "metric replica.lag": "metric replica.lag",
  'git log --since="6 hours ago"': 'git log --since="6 hours ago"',
  "aws s3 ls s3://taskforge-backups/full/":
    "aws s3 ls s3://taskforge-backups/full/",
  help: "help",
};

function scoreCommandRun(command: string): void {
  mutateState((state) => {
    const cmd = command.trim().toLowerCase();

    // Track postgres log inspection for root cause
    if (cmd.includes("postgres.log") && !state.rootCauseDiscovered) {
      state.rootCauseDiscovered = true;
      state.score.diagnosis = Math.min(20, state.score.diagnosis + 10);
    }

    // Track admin-runner log inspection
    if (cmd.includes("admin-runner.log")) {
      state.score.diagnosis = Math.min(20, state.score.diagnosis + 5);
    }

    // Track backup inspection
    if (
      (cmd.includes("manifest.json") || cmd.includes("s3 ls")) &&
      !state.backupInspected
    ) {
      state.backupInspected = true;
      state.score.diagnosis = Math.min(20, state.score.diagnosis + 3);
    }

    // Track replica lag check
    if (cmd.includes("replica.lag")) {
      state.score.diagnosis = Math.min(20, state.score.diagnosis + 2);
    }

    // Track script inspection (finding fix_replication.sh)
    if (cmd.includes("fix_replication.sh")) {
      state.score.diagnosis = Math.min(20, state.score.diagnosis + 5);
    }

    if (!state.commandsRun.includes(command)) {
      state.commandsRun.push(command);
    }
  });
}

export function handleCommand(command: string): string {
  const trimmed = command.trim();
  const key =
    COMMAND_ALIASES[trimmed] ||
    Object.keys(COMMAND_ALIASES).find((k) =>
      trimmed.toLowerCase().startsWith(k.toLowerCase())
    );

  scoreCommandRun(trimmed);

  const fn = key ? COMMANDS[key] : undefined;
  if (fn) {
    return fn();
  }

  return `bash: ${trimmed}: command not found
Type 'help' to see available commands.`;
}
