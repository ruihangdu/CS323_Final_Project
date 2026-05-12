import { v4 as uuidv4 } from "uuid";
import type { FeedEvent } from "./state";

function evt(time: string, source: string, message: string, type: FeedEvent["type"] = "info"): FeedEvent {
  return { id: uuidv4(), time, source, message, type };
}

export interface RecoveryOption {
  id: string;
  label: string;
  desc: string;
  badge: string;
  badgeColor: string;
  points: number;
  feedMessage: string;
  feedType: FeedEvent["type"];
  terminates?: boolean;
}

export interface ScenarioDef {
  id: string;
  name: string;
  subtitle: string;
  difficulty: "MEDIUM" | "HARD" | "EXPERT";
  synopsis: string;
  initialTime: string;
  initialFeed: FeedEvent[];
  commands: Record<string, () => string>;
  diagnosis: {
    correctCategory: string;
    correctTrigger: string;
    correctBlastRadius: string[];
    categories: { id: string; label: string }[];
    triggers: { id: string; label: string }[];
    blastRadiusOptions: { id: string; label: string }[];
  };
  recoveryOptions: RecoveryOption[];
}

export const SCENARIOS: Record<string, ScenarioDef> = {
  maint_bot: {
    id: "maint_bot",
    name: "The Maint Bot Disaster",
    subtitle: "Production DB wiped by a rogue automation script",
    difficulty: "HARD",
    synopsis: "02:14 UTC — PagerDuty fires. API 500 rate at 35% and climbing. Customers report empty dashboards. Your primary DB disk just shed 79% of its data in 14 seconds.",
    initialTime: "02:14",
    initialFeed: [
      evt("02:14", "PagerDuty", "API 500 rate > 35%", "critical"),
      evt("02:15", "Support", "Customers report empty dashboards", "bad"),
      evt("02:16", "Monitoring", "Background jobs failing en masse", "warning"),
      evt("02:17", "Slack #support", 'Acme Corp: "all tasks disappeared"', "bad"),
      evt("02:19", "Monitoring", "Primary DB disk usage: 1.8TB → 370GB (-79.8%) at 02:10:59 UTC", "critical"),
    ],
    commands: {
      "kubectl get pods": () => `NAME                              READY   STATUS      RESTARTS   AGE
taskforge-api-6d9b4f7-8xvzp       0/1     CrashLoop   14         47m
taskforge-api-6d9b4f7-k2nmr       0/1     CrashLoop   13         47m
taskforge-worker-5b8c9f4-p9xjq    0/1     Error        8         47m
postgres-primary-0                1/1     Running      0         6d
postgres-replica-db-1-0           1/1     Running      0         6d
postgres-replica-db-2-0           1/1     Running      0         6d
admin-runner-prod-3               0/1     Completed    0         48m`,
      "kubectl logs taskforge-api": () => `2026-04-17T02:14:03Z ERROR: relation "public.tasks" does not exist
2026-04-17T02:14:03Z ERROR: relation "public.projects" does not exist
2026-04-17T02:14:04Z ERROR: relation "public.users" does not exist
2026-04-17T02:14:05Z FATAL: schema "public" has no tables
2026-04-17T02:14:09Z Retrying DB connection (attempt 14/20)...`,
      "cat /logs/postgres.log": () => `2026-04-17T02:09:50 LOG:  connection received: host=admin-runner-prod-3 user=maint_bot
2026-04-17T02:09:52 LOG:  connection authorized: user=maint_bot database=taskforge
2026-04-17T02:10:59 LOG:  statement: DROP SCHEMA public CASCADE;
2026-04-17T02:11:00 LOG:  drop cascades to 47 other objects
2026-04-17T02:11:00 DETAIL: drop cascades to table public.users
                            drop cascades to table public.projects
                            drop cascades to table public.tasks
                            drop cascades to table public.sessions
                            ... and 42 more objects
2026-04-17T02:11:03 LOG:  statement: CREATE SCHEMA public;
2026-04-17T02:11:15 LOG:  disconnection: session time: 0:01:23 user=maint_bot`,
      "cat /logs/admin-runner.log": () => `2026-04-17T02:09:58 [INFO]  job started: fix_replication.sh
2026-04-17T02:09:59 [INFO]  env TARGET_DB=prod
2026-04-17T02:09:59 [INFO]  env DB_HOST=prod-db.internal
2026-04-17T02:10:00 [WARN]  Running against prod-db.internal — production host detected
2026-04-17T02:10:01 [INFO]  Executing fix_replication.sh...
2026-04-17T02:11:14 [INFO]  psql exit code: 0
2026-04-17T02:11:15 [INFO]  job completed successfully`,
      "cat /scripts/fix_replication.sh": () => `#!/bin/bash
# fix_replication.sh — Resets schema on target DB
TARGET_DB=\${TARGET_DB:-staging}
DB_HOST=\${DB_HOST:-staging-db.internal}
echo "Running against: \$DB_HOST / \$TARGET_DB"
psql "postgresql://maint_bot@\$DB_HOST/\$TARGET_DB" <<SQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO taskforge_app;
SQL`,
      "cat /backups/manifest.json": () => JSON.stringify({
        full_backups: [
          { timestamp: "2026-04-16T00:00:00Z", location: "s3://taskforge-backups/full/2026-04-16/", size_gb: 1830, verified: true },
          { timestamp: "2026-04-17T00:00:00Z", location: "s3://taskforge-backups/full/2026-04-17/", size_gb: 112, verified: false },
        ],
        wal_archives: [
          { from: "2026-04-16T00:00:00Z", to: "2026-04-17T01:44:00Z", complete: true },
          { from: "2026-04-17T01:44:00Z", to: "2026-04-17T02:14:00Z", complete: false },
        ],
      }, null, 2),
      "metric db.disk_usage": () => `db.disk_usage (primary)
  Current:  370 GB  ← !!
  Previous: 1,834 GB (02:10)
  Trend:    ▼ -79.8% drop at 02:10:59 UTC`,
      "metric replica.lag": () => `replica.lag
  replica-db-1:  0.3s — Last replay: 2026-04-17T02:11:16Z  ← AFTER incident
  replica-db-2:  3612s (60-min delay) — Last replay: 2026-04-17T01:14:22Z  ← BEFORE incident`,
      "metric api.500_rate": () => `api.500_rate: 94.2% (baseline 0.1% before 02:13)`,
      'git log --since="6 hours ago"': () => `a4f7d2b deploy-bot: chore: update taskforge-api to v2.47.1 (00:42)
3f2a08d maint_bot: fix: update fix_replication.sh — add prod hostname env check (non-blocking) (22:07)`,
      "aws s3 ls s3://taskforge-backups/full/": () => `2026-04-16 00:04:12   1,972,084,736  2026-04-16/taskforge-full.dump.gz
2026-04-17 00:03:55     120,586,240  2026-04-17/taskforge-full.dump.gz

Note: 2026-04-17 backup is 112 GB vs expected ~1.8 TB — likely incomplete.`,
      "cat /runbooks/backup-restore.md": () => `# Backup Restore Runbook
CAUTION: Do NOT assume latest backup is valid. Check 'verified' flag and size.
1. cat /backups/manifest.json — verify backup integrity
2. aws rds create-db-snapshot (snapshot BEFORE restore)
3. Restore base backup + WAL replay to recovery_target_time = '2026-04-17 02:09:00'
4. Validate: SELECT count(*) FROM public.tasks; -- expect ~2.4M`,
    },
    diagnosis: {
      correctCategory: "data_destruction",
      correctTrigger: "ddl_executed_on_wrong_environment",
      correctBlastRadius: ["all_db_tables", "api_layer", "background_jobs"],
      categories: [
        { id: "data_destruction", label: "Data destruction / DDL executed on production" },
        { id: "code_regression", label: "Application code regression causing data errors" },
        { id: "hardware_failure", label: "Hardware / storage failure on database host" },
        { id: "network_partition", label: "Network partition isolating database from app layer" },
        { id: "resource_exhaustion", label: "Resource exhaustion (disk, memory, CPU)" },
        { id: "config_mismatch", label: "Configuration or environment variable mismatch" },
      ],
      triggers: [
        { id: "ddl_executed_on_wrong_environment", label: "Maintenance script ran against production instead of staging" },
        { id: "disk_ran_out_of_space", label: "Primary database disk reached 100% and tables auto-vacuumed" },
        { id: "failed_migration_dropped_tables", label: "A failed deployment migration accidentally dropped tables" },
        { id: "replica_split_brain", label: "Split-brain replication caused primary to diverge from replicas" },
      ],
      blastRadiusOptions: [
        { id: "all_db_tables", label: "All database tables (47 objects dropped)" },
        { id: "api_layer", label: "All API endpoints (returning 500 on every query)" },
        { id: "background_jobs", label: "Background job queue (all workers crashing)" },
        { id: "auth_sessions", label: "Authentication sessions invalidated" },
        { id: "read_replicas_only", label: "Read replicas only (writes unaffected)" },
        { id: "eu_region_only", label: "EU region only (NA still serving)" },
      ],
    },
    recoveryOptions: [
      {
        id: "restore_verified_wal",
        label: "Restore 2026-04-16 verified backup + WAL replay to 02:09",
        desc: "Use the last verified 1.8TB backup and replay WAL archives to just before the incident. ~26 min data loss window.",
        badge: "RECOMMENDED",
        badgeColor: "bg-green-500/20 text-green-600",
        points: 15,
        feedMessage: "Recovery DB restored from 2026-04-16 backup + WAL replay. Core data validated. Data loss window: 01:44–02:10.",
        feedType: "good",
      },
      {
        id: "promote_replica2",
        label: "Promote replica-db-2 to primary (60-min delayed replica)",
        desc: "replica-db-2 has a 60-min delay — its last replay was 01:14 UTC, before the incident. Can be promoted as a read/write primary with ~56 min data loss.",
        badge: "VALID — MORE DATA LOSS",
        badgeColor: "bg-amber-500/20 text-amber-600",
        points: 8,
        feedMessage: "replica-db-2 promoted to primary. Schema intact. But all data from 01:14–02:10 UTC is lost (~56 min window).",
        feedType: "warning",
      },
      {
        id: "restore_latest_backup",
        label: "Restore from latest backup (2026-04-17, 112 GB)",
        desc: "The most recent backup from this morning. Looks current but has not been verified — manifest shows it as incomplete.",
        badge: "⚠ RISKY — UNVERIFIED",
        badgeColor: "bg-red-500/20 text-red-600",
        points: -5,
        feedMessage: "Restore FAILED after 28 minutes: backup incomplete. Size was 112 GB vs expected 1.8 TB. Operation aborted. Time wasted.",
        feedType: "bad",
      },
      {
        id: "promote_replica1",
        label: "Promote replica-db-1 to primary (streaming replica)",
        desc: "replica-db-1 is a near-real-time streaming replica. It replicated the DROP SCHEMA within 17 seconds of the primary.",
        badge: "⚠ FATAL — SCHEMA ALREADY DROPPED",
        badgeColor: "bg-red-500/20 text-red-600",
        points: -8,
        feedMessage: "CRITICAL: replica-db-1 promoted, but DROP SCHEMA was replayed at 02:11:16Z. Schema still absent. API still 500ing. This made things worse.",
        feedType: "bad",
        terminates: true,
      },
    ],
  },

  bad_deploy: {
    id: "bad_deploy",
    name: "Zero to 500",
    subtitle: "A deploy with a missing migration is destroying your API",
    difficulty: "MEDIUM",
    synopsis: "14:32 UTC — Deploy pipeline pushed v2.48.0 to production. Within 3 minutes, 67% of API requests return 500. The deploy looked clean. CI passed. So what went wrong?",
    initialTime: "14:35",
    initialFeed: [
      evt("14:32", "Deploy Pipeline", "v2.48.0 deployed to production (all checks passed)", "info"),
      evt("14:33", "Monitoring", "API 500 rate rising: 12% → 41% → 67%", "critical"),
      evt("14:34", "PagerDuty", "P1: api.500_rate > 50% for 60s", "critical"),
      evt("14:35", "Support", "Users: 'Can't create tasks. Getting error screen.'", "bad"),
      evt("14:35", "Slack #deploy", "Rollback? Or fix forward? Need a decision.", "warning"),
    ],
    commands: {
      "kubectl get pods": () => `NAME                                    READY   STATUS      RESTARTS   AGE
taskforge-api-v2-48-0-7d9b4f-8xvzp     0/1     CrashLoop   6          4m
taskforge-api-v2-48-0-7d9b4f-k2nmr     0/1     CrashLoop   5          4m
taskforge-api-v2-47-1-6c8a3e-tz9pq     1/1     Running     0          2d   ← previous version (terminating)
taskforge-worker-5b8c9f4-p9xjq         1/1     Running     0          2d
postgres-primary-0                      1/1     Running     0          12d`,
      "kubectl logs taskforge-api": () => `2026-05-12T14:33:01Z ERROR: column "assigned_to_id" of relation "tasks" does not exist at character 85
2026-05-12T14:33:01Z ERROR: INSERT INTO tasks (title, project_id, assigned_to_id, ...) -- column does not exist
2026-05-12T14:33:02Z ERROR: column "parent_task_id" of relation "tasks" does not exist
2026-05-12T14:33:02Z ERROR: SELECT tasks.parent_task_id FROM tasks -- column does not exist
2026-05-12T14:33:10Z FATAL: ORM schema mismatch. Expected 24 columns, found 22. Refusing to start.
2026-05-12T14:33:11Z Retrying startup (attempt 6/10)...`,
      "cat /logs/deploy.log": () => `2026-05-12T14:30:11Z [Deploy] Starting deploy: v2.47.1 → v2.48.0
2026-05-12T14:30:12Z [Deploy] Running pre-deploy checks...
2026-05-12T14:30:45Z [Deploy] Pre-deploy checks: PASSED
2026-05-12T14:31:00Z [Deploy] Running migrations... 0 pending migrations found.
2026-05-12T14:31:01Z [Deploy] No migrations to run.
2026-05-12T14:32:00Z [Deploy] Rolling out v2.48.0 to production pods...
2026-05-12T14:32:47Z [Deploy] Deploy complete. Health checks: PASSED (checked /health endpoint only)
2026-05-12T14:33:02Z [Deploy] WARNING: 500 rate spike detected post-deploy

⚠ Note: /health only checks DB connectivity, not schema validity.`,
      'git log --since="6 hours ago"': () => `commit b7f3a91 (HEAD -> main, tag: v2.48.0)
Author: felix@taskforge.io <felix@taskforge.io>
Date:   Mon May 12 13:55:04 2026
    feat: bulk task assignment + subtask hierarchy (PR #2104)
    
    ⚠ NOTE: Migration 20260512_add_assigned_to_subtasks.sql was merged
    separately in PR #2099 — expected to be deployed via feature-flag deploy
    BEFORE this PR. Deploy ordering was miscommunicated in planning.

commit a4f7d2b (tag: v2.47.1)
Author: deploy-bot <deploy@taskforge.io>
Date:   Fri May 09 00:42:11 2026
    chore: update taskforge-api to v2.47.1`,
      "git diff v2.47.1..v2.48.0 -- migrations/": () => `diff --git a/migrations/20260512_add_assigned_to_subtasks.sql b/migrations/...
new file mode 100644
--- /dev/null
+++ b/migrations/20260512_add_assigned_to_subtasks.sql
@@ -0,0 +1,8 @@
+-- Migration: Add bulk assignment and subtask columns
+ALTER TABLE tasks ADD COLUMN assigned_to_id UUID REFERENCES users(id);
+ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id);
+CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_id);
+CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

⚠ This migration exists in the repo but was NOT run before deployment (0 migrations found in deploy.log)`,
      "metric api.500_rate": () => `api.500_rate
  Current:  67.3%
  14:34:    41.2%
  14:33:    12.1%
  14:32:    0.2% (baseline)
  Correlation: spike began 47s after v2.48.0 deploy`,
      "cat /runbooks/rollback.md": () => `# Rollback Runbook
## Decision framework
- If root cause is CODE (not data): ROLLBACK immediately
- If root cause is MIGRATION (schema): assess risk of rollback vs fix-forward

## Rollback command
  kubectl set image deployment/taskforge-api taskforge-api=taskforge/api:v2.47.1
  
## Fix-forward (migration + hotfix)
  1. Run the missing migration FIRST on production
  2. Deploy hotfix v2.48.1 that passes CI with migration check

## WARNING: Never rollback if a destructive migration already ran against production.
Check deploy.log — if migration ran, rolling back the code may break data integrity.`,
    },
    diagnosis: {
      correctCategory: "code_regression",
      correctTrigger: "missing_migration_before_code_deploy",
      correctBlastRadius: ["task_creation", "subtask_api", "bulk_assignment"],
      categories: [
        { id: "code_regression", label: "Application code regression / deploy introduced breaking change" },
        { id: "data_destruction", label: "Data destruction — tables or rows deleted by automation" },
        { id: "hardware_failure", label: "Hardware / storage failure on database host" },
        { id: "resource_exhaustion", label: "Resource exhaustion — database CPU/memory/connections maxed" },
        { id: "config_mismatch", label: "Configuration mismatch — wrong environment variables" },
        { id: "schema_migration", label: "Database schema migration applied incorrectly" },
      ],
      triggers: [
        { id: "missing_migration_before_code_deploy", label: "Code deployed before its required DB migration ran — schema mismatch" },
        { id: "breaking_api_contract_change", label: "v2.48.0 changed the API contract, breaking downstream consumers" },
        { id: "orm_cache_stale", label: "ORM model cache became stale after deploy — needs pod restart" },
        { id: "new_feature_flag_activated", label: "A new feature flag was activated that's incompatible with current schema" },
      ],
      blastRadiusOptions: [
        { id: "task_creation", label: "Task creation (INSERT failing on missing columns)" },
        { id: "subtask_api", label: "Subtask hierarchy API (new endpoints in v2.48.0)" },
        { id: "bulk_assignment", label: "Bulk task assignment feature (requires new columns)" },
        { id: "all_db_tables", label: "All database tables (entire schema corrupted)" },
        { id: "read_operations_only", label: "Read operations only (writes unaffected)" },
        { id: "auth_sessions", label: "Authentication sessions (users being logged out)" },
      ],
    },
    recoveryOptions: [
      {
        id: "rollback_v2_47_1",
        label: "Roll back to v2.47.1 immediately",
        desc: "Revert production pods to the previous stable version. No schema changes needed — migration never ran, so rollback is clean.",
        badge: "RECOMMENDED — FASTEST",
        badgeColor: "bg-green-500/20 text-green-600",
        points: 15,
        feedMessage: "Rollback complete. v2.47.1 is live. API 500 rate dropping: 67% → 12% → 0.3%. All pods healthy. ETA to full recovery: ~3 min.",
        feedType: "good",
      },
      {
        id: "hotfix_v2_48_1",
        label: "Ship v2.48.1 hotfix (run migration + fix CI)",
        desc: "Run the missing migration on production now, then deploy a v2.48.1 build that validates migration preconditions in CI. Fix-forward approach.",
        badge: "VALID — SLOWER",
        badgeColor: "bg-amber-500/20 text-amber-600",
        points: 8,
        feedMessage: "Migration 20260512_add_assigned_to_subtasks.sql applied. v2.48.1 deploying. Outage duration: ~18 min. All endpoints recovering.",
        feedType: "good",
      },
      {
        id: "run_migration_on_prod",
        label: "Run the missing migration directly on production DB now",
        desc: "SSH into the DB and apply the migration manually, then restart pods. No code change needed.",
        badge: "⚠ RISKY — NO TEST COVERAGE",
        badgeColor: "bg-red-500/20 text-red-600",
        points: -5,
        feedMessage: "Migration ran manually but introduced a constraint violation on existing NULL rows in assigned_to_id. 8,421 tasks in broken state. Rollback required anyway.",
        feedType: "bad",
      },
      {
        id: "rollback_v2_46_0",
        label: "Roll back to v2.46.0 (two versions back)",
        desc: "Skip v2.47.1 and go directly to v2.46.0 — a stable version from last week.",
        badge: "UNNECESSARY REGRESSION",
        badgeColor: "bg-amber-500/20 text-amber-600",
        points: -3,
        feedMessage: "Rolled back to v2.46.0. API recovered but 3 features from v2.47.1 regressed. Customer reports for missing features incoming. More change needed.",
        feedType: "warning",
      },
    ],
  },

  memory_siege: {
    id: "memory_siege",
    name: "Death by a Thousand Leaks",
    subtitle: "OOM kills across your task-processor fleet — and the fix isn't obvious",
    difficulty: "HARD",
    synopsis: "03:00 UTC — task-processor pods start dying. Slowly at first, then in waves. Memory climbing without end. Something introduced an unbounded cache. Find it. Kill it. Before the queue backs up past the point of no return.",
    initialTime: "03:14",
    initialFeed: [
      evt("03:00", "Monitoring", "task-processor memory usage: 2.8 GB / 4 GB limit (70%)", "warning"),
      evt("03:07", "Kubernetes", "task-processor-5b8c9f4-p9xjq OOMKilled (exit 137)", "bad"),
      evt("03:09", "Monitoring", "Job queue depth: 42,000 (growing)", "warning"),
      evt("03:12", "Kubernetes", "task-processor-5b8c9f4-t3nwk OOMKilled (exit 137)", "bad"),
      evt("03:14", "PagerDuty", "P1: >50% of task-processor pods unhealthy", "critical"),
    ],
    commands: {
      "kubectl get pods": () => `NAME                                  READY   STATUS      RESTARTS   AGE
taskforge-api-6d9b4f7-8xvzp           1/1     Running     0          6h
task-processor-5b8c9f4-p9xjq          0/1     OOMKilled   4          74m
task-processor-5b8c9f4-t3nwk          0/1     OOMKilled   3          74m
task-processor-5b8c9f4-r8mlz          1/1     Running     0          2m   ← just restarted
task-processor-5b8c9f4-wx9nq          1/1     Running     0          8m
email-worker-3f4d2c-jkl78             1/1     Running     0          6h
report-generator-7a1b9d-qrs34         1/1     Running     0          6h`,
      "kubectl top pods": () => `NAME                                  CPU     MEMORY
taskforge-api-6d9b4f7-8xvzp           142m    890Mi
task-processor-5b8c9f4-r8mlz          88m     3,841Mi / 4,096Mi  ← 93.8%! Climbing.
task-processor-5b8c9f4-wx9nq          91m     3,204Mi / 4,096Mi  ← 78.2%. Was 1.1GB 30min ago.
email-worker-3f4d2c-jkl78             12m     234Mi
report-generator-7a1b9d-qrs34         18m     412Mi`,
      "kubectl logs task-processor": () => `2026-04-17T02:45:10Z [INFO]  Processing job 9f4a2b: TaskBatchReassignment
2026-04-17T02:45:11Z [INFO]  Cache MISS for user:8c3d → fetching from DB (size: 1 entry)
2026-04-17T02:45:11Z [INFO]  Cache SET user:8c3d (cache now has 14,203 entries)
2026-04-17T02:55:42Z [INFO]  Cache SET user:9f1a3b (cache now has 41,882 entries)
2026-04-17T03:07:01Z [WARN]  Cache SET user:b2e4f8 (cache now has 98,441 entries)
2026-04-17T03:07:22Z FATAL:  JavaScript heap out of memory
2026-04-17T03:07:22Z FATAL:  Allocation failed — out of memory
Process exited with code 137 (OOM)

Note: Cache is keyed by user ID, never evicted, never bounded.`,
      "metric memory.usage": () => `memory.usage — task-processor pods (trailing 2h)
  02:45:  1.1 GB  (after PR #1847 deploy at 02:40)
  03:00:  2.8 GB  ← monitoring fired
  03:07:  4.0 GB  ← first OOMKill
  03:14:  3.8 GB  ← just restarted, climbing again
  
  Growth rate: ~175 MB/min under load
  Estimated time to next OOMKill: 1.5–2 min`,
      'git log --since="6 hours ago"': () => `commit c9e1f4a (HEAD -> main, tag: task-processor-v1.14.0)
Author: rajesh@taskforge.io
Date:   Thu Apr 17 02:38:11 2026
    perf: PR #1847 — Add in-memory user permission cache to task-processor
    
    Caches user permission objects to avoid repeated DB lookups per job.
    Cache is keyed by user_id, stored in module-level Map.
    ⚠ No eviction policy. No size limit. No TTL.

commit 8d3e9c2 (tag: task-processor-v1.13.2)
Author: deploy-bot <deploy@taskforge.io>
Date:   Wed Apr 16 18:00:00 2026
    chore: routine deploy task-processor-v1.13.2`,
      "git show 1847": () => `PR #1847 — Add in-memory user permission cache

diff --git a/src/cache/permissions.ts b/src/cache/permissions.ts
+const permissionCache = new Map<string, UserPermissions>();  // ← module-level, lives forever
+
+export async function getUserPermissions(userId: string): Promise<UserPermissions> {
+  if (permissionCache.has(userId)) {
+    return permissionCache.get(userId)!;  // Cache HIT
+  }
+  const perms = await db.query('SELECT * FROM permissions WHERE user_id = $1', [userId]);
+  permissionCache.set(userId, perms);  // ← SET but never evicted
+  return perms;
+}
 
Reviewer comment (dismissed): "Should we add LRU eviction here?"
Author reply: "Will add in follow-up PR"`,
      "kubectl get events": () => `LAST SEEN   TYPE      REASON       OBJECT                            MESSAGE
2m          Warning   OOMKilling   pod/task-processor-5b8c9f4-t3nwk  Container task-processor exceeded memory limit
9m          Warning   OOMKilling   pod/task-processor-5b8c9f4-p9xjq  Container task-processor exceeded memory limit
74m         Normal    Pulled       pod/task-processor-5b8c9f4-p9xjq  Pulled image task-processor:v1.14.0
74m         Normal    Scheduled    pod/task-processor-5b8c9f4-p9xjq  Deploy: task-processor-v1.14.0 (PR #1847)`,
      "metric api.500_rate": () => `api.500_rate: 0.8% (slightly elevated from job queue backlog, API itself healthy)
job.queue.depth: 42,000 jobs pending (normal: ~800)`,
    },
    diagnosis: {
      correctCategory: "resource_exhaustion",
      correctTrigger: "unbounded_in_memory_cache_pr_1847",
      correctBlastRadius: ["task_processing", "email_queue", "report_generation"],
      categories: [
        { id: "resource_exhaustion", label: "Resource exhaustion — memory leak or unbounded growth" },
        { id: "code_regression", label: "Code regression — new logic causing crashes" },
        { id: "data_destruction", label: "Data destruction — loss of tasks or job data" },
        { id: "hardware_failure", label: "Hardware failure — disk or memory hardware issue on nodes" },
        { id: "config_mismatch", label: "Configuration error — wrong memory limits set" },
        { id: "external_dependency", label: "External dependency failure — DB or cache service degraded" },
      ],
      triggers: [
        { id: "unbounded_in_memory_cache_pr_1847", label: "PR #1847 introduced an unbounded in-memory permission cache with no eviction" },
        { id: "memory_limits_too_low", label: "Kubernetes memory limits set too low for current workload volume" },
        { id: "db_connection_pool_leak", label: "Database connection pool leaking — connections not returned on job completion" },
        { id: "large_payload_jobs", label: "A batch of unusually large job payloads exhausted heap space" },
      ],
      blastRadiusOptions: [
        { id: "task_processing", label: "Task processing — job queue backing up, tasks not completing" },
        { id: "email_queue", label: "Email notifications — email-worker depends on task events" },
        { id: "report_generation", label: "Report generation — scheduled reports blocked on task data" },
        { id: "api_layer", label: "API layer — all user-facing endpoints returning 500" },
        { id: "database", label: "Database — primary DB unavailable or corrupted" },
        { id: "auth_sessions", label: "Authentication — users being logged out" },
      ],
    },
    recoveryOptions: [
      {
        id: "rollback_task_processor",
        label: "Roll back task-processor to v1.13.2 (pre-PR-1847)",
        desc: "Revert the task-processor service to the version before the unbounded cache was introduced. The cache will be gone entirely on restart.",
        badge: "RECOMMENDED — COMPLETE FIX",
        badgeColor: "bg-green-500/20 text-green-600",
        points: 15,
        feedMessage: "task-processor rolled back to v1.13.2. Pods restarting without cache. Memory stable at 890Mi. Job queue draining: 42,000 → 18,000 → 3,200. Full recovery ETA: 12 min.",
        feedType: "good",
      },
      {
        id: "increase_memory_limits",
        label: "Increase Kubernetes memory limits to 12 GB per pod",
        desc: "Triple the memory ceiling so pods survive longer before OOMKilling. Buys time but the leak continues growing.",
        badge: "BUYS TIME — NOT A FIX",
        badgeColor: "bg-amber-500/20 text-amber-600",
        points: 3,
        feedMessage: "Memory limits raised to 12 GB. Pods surviving longer. Cache still growing: 98K → 240K entries. Estimated time before next OOMKill: ~45 min. Root cause unresolved.",
        feedType: "warning",
      },
      {
        id: "restart_affected_pods",
        label: "Restart all OOMKilled task-processor pods",
        desc: "Force-restart all unhealthy pods. Memory will reset to zero — briefly. Cache refills from the first job processed.",
        badge: "TEMPORARY — 7 MIN RELIEF",
        badgeColor: "bg-amber-500/20 text-amber-600",
        points: 0,
        feedMessage: "Pods restarted. Memory reset to 890Mi. Job queue processing. Cache already at 14,000 entries (2 min after restart). Will OOMKill again in ~30 min.",
        feedType: "warning",
      },
      {
        id: "disable_caching_globally",
        label: "Disable caching across all services via feature flag",
        desc: "Toggle the global ENABLE_CACHING=false env var and restart all services. Nuclear option — impacts performance of unaffected services.",
        badge: "⚠ OVER-BROAD — KILLS PERFORMANCE",
        badgeColor: "bg-red-500/20 text-red-600",
        points: -3,
        feedMessage: "Caching disabled globally. task-processor stabilized. But API response time degraded 4x (all queries hitting DB). Report generation timeouts began. Collateral damage significant.",
        feedType: "bad",
      },
    ],
  },

  config_catastrophe: {
    id: "config_catastrophe",
    name: "Wrong Address",
    subtitle: "EU payments down — a Terraform apply pointed the wrong service at the wrong endpoint",
    difficulty: "MEDIUM",
    synopsis: "09:15 UTC — EU customers can't complete checkout. NA region is unaffected. No code was deployed. What changed? The answer is in your infrastructure config.",
    initialTime: "09:18",
    initialFeed: [
      evt("09:14", "Terraform Cloud", "terraform apply completed — 2 resources updated in eu-west-1", "info"),
      evt("09:15", "Monitoring", "EU payment-service: 402 error rate 98%", "critical"),
      evt("09:16", "PagerDuty", "P1: EU checkout conversion rate 0%", "critical"),
      evt("09:17", "Support", "EU customers: 'Payment declined on all cards'", "bad"),
      evt("09:18", "Monitoring", "NA region: payment-service healthy (0% error rate)", "info"),
    ],
    commands: {
      "kubectl get pods": () => `NAME                                     READY   STATUS    RESTARTS   AGE
payment-service-eu-7f9b4c-xjkq9          1/1     Running   0          14m
payment-service-eu-7f9b4c-vpl28          1/1     Running   0          14m
payment-service-na-6c8a3d-t5nmr          1/1     Running   0          3d
checkout-api-eu-4b2c7f-q1rst             1/1     Running   0          3d
checkout-api-na-4b2c7f-m9uvw             1/1     Running   0          3d`,
      "kubectl get configmap payment-eu -o yaml": () => `apiVersion: v1
kind: ConfigMap
metadata:
  name: payment-eu
  namespace: production
  annotations:
    last-applied: "2026-05-12T09:14:02Z"  ← 1 min before incident
data:
  PAYMENT_GATEWAY_URL: "https://na-gateway.stripe-taskforge.io/v1"  ← !! WRONG REGION
  PAYMENT_REGION: "eu-west-1"
  STRIPE_ACCOUNT: "acct_eu_prod_1f4a9c"
  GATEWAY_TIMEOUT_MS: "5000"

Expected value: "https://eu-gateway.stripe-taskforge.io/v1"
Actual value:   "https://na-gateway.stripe-taskforge.io/v1"  ← pointing at NA gateway from EU`,
      "cat /logs/payment-service-eu.log": () => `2026-05-12T09:15:03Z [ERROR] POST https://na-gateway.stripe-taskforge.io/v1/charges
2026-05-12T09:15:03Z [ERROR] Response: 402 Payment Required
2026-05-12T09:15:03Z [ERROR] Body: {"error":"cross_region_request_denied","message":"EU account acct_eu_prod_1f4a9c cannot route via NA gateway. Use eu-gateway.stripe-taskforge.io"}
2026-05-12T09:15:03Z [ERROR] Charge failed for customer cus_EU_8f2b1a — declining
2026-05-12T09:15:08Z [WARN]  Retry 1/3 — same error
2026-05-12T09:15:13Z [WARN]  Retry 2/3 — same error
2026-05-12T09:15:19Z [ERROR] All retries exhausted. Payment declined.`,
      "git log --since=\"2 hours ago\" terraform/": () => `commit f2a9d1c
Author: infra-bot <infra@taskforge.io>
Date:   Mon May 12 09:12:44 2026
    chore: Terraform fmt + variable consolidation for payment-service configs

    Consolidated NA and EU payment-service variables into shared module.
    ⚠ EU PAYMENT_GATEWAY_URL inadvertently set to NA value during variable merge.
    
    Files changed:
      terraform/modules/payment-service/variables.tf  (+14/-8)
      terraform/eu-west-1/payment.tfvars              (PAYMENT_GATEWAY_URL overwritten)`,
      "terraform show -json": () => `{
  "values": {
    "root_module": {
      "resources": [
        {
          "address": "kubernetes_config_map.payment_eu",
          "values": {
            "data": {
              "PAYMENT_GATEWAY_URL": "https://na-gateway.stripe-taskforge.io/v1",
              "PAYMENT_REGION": "eu-west-1"
            },
            "metadata": [{ "name": "payment-eu", "namespace": "production" }]
          }
        }
      ]
    }
  },
  "prior_state": {
    "PAYMENT_GATEWAY_URL": "https://eu-gateway.stripe-taskforge.io/v1"  ← correct value before apply
  }
}`,
      "kubectl get events": () => `LAST SEEN   TYPE      REASON             OBJECT                       MESSAGE
4m          Normal    ConfigMapUpdated   configmap/payment-eu         Updated by Terraform at 09:14:02Z
4m          Normal    Restarted          pod/payment-service-eu-*     ConfigMap change triggered pod restart`,
      "metric api.500_rate": () => `payment-service-eu: 402 rate: 98.3%
payment-service-na: 402 rate: 0.1% (baseline)
EU checkout completion rate: 0% (was 94.2% pre-incident)`,
    },
    diagnosis: {
      correctCategory: "config_mismatch",
      correctTrigger: "terraform_overwrote_eu_payment_gateway_url",
      correctBlastRadius: ["eu_payments", "eu_checkout", "eu_subscriptions"],
      categories: [
        { id: "config_mismatch", label: "Configuration mismatch — wrong environment variable or setting applied" },
        { id: "code_regression", label: "Code regression — new code introduced payment logic bug" },
        { id: "external_dependency", label: "External dependency failure — Stripe EU gateway is down" },
        { id: "network_partition", label: "Network partition — EU pods can't reach payment gateway" },
        { id: "data_destruction", label: "Data corruption — payment records in bad state" },
        { id: "certificate_expiry", label: "TLS certificate expiry — HTTPS connections failing" },
      ],
      triggers: [
        { id: "terraform_overwrote_eu_payment_gateway_url", label: "Terraform apply overwrote EU PAYMENT_GATEWAY_URL with the NA endpoint value" },
        { id: "stripe_eu_gateway_outage", label: "Stripe's EU payment gateway is experiencing an outage (external)" },
        { id: "dns_misconfiguration", label: "DNS record for eu-gateway.stripe-taskforge.io was changed to point at NA" },
        { id: "feature_flag_disabled_eu_payments", label: "A feature flag accidentally disabled EU payment processing" },
      ],
      blastRadiusOptions: [
        { id: "eu_payments", label: "EU payment processing (all card charges failing)" },
        { id: "eu_checkout", label: "EU checkout flow (100% cart abandonment at payment step)" },
        { id: "eu_subscriptions", label: "EU subscription renewals (auto-pay failing silently)" },
        { id: "na_payments", label: "NA payment processing (affected by same issue)" },
        { id: "all_api_endpoints", label: "All API endpoints across all regions" },
        { id: "auth_sessions", label: "Authentication and user sessions" },
      ],
    },
    recoveryOptions: [
      {
        id: "revert_terraform_apply",
        label: "Revert Terraform state and re-apply correct EU config",
        desc: "Run terraform apply with the correct eu-gateway.stripe-taskforge.io value. Clean, idempotent, and fixes the root cause permanently.",
        badge: "RECOMMENDED — PERMANENT FIX",
        badgeColor: "bg-green-500/20 text-green-600",
        points: 15,
        feedMessage: "Terraform reverted. ConfigMap payment-eu updated: PAYMENT_GATEWAY_URL → eu-gateway.stripe-taskforge.io. Pods restarted. EU payment 402 rate: 98% → 0.2%. Checkout recovering.",
        feedType: "good",
      },
      {
        id: "patch_configmap_manually",
        label: "Manually kubectl patch the payment-eu ConfigMap",
        desc: "Apply the fix directly with kubectl without going through Terraform. Fast, but Terraform state will drift — next apply will re-break it.",
        badge: "VALID — CAUSES DRIFT",
        badgeColor: "bg-amber-500/20 text-amber-600",
        points: 7,
        feedMessage: "ConfigMap patched manually. EU payments recovering. ⚠ Warning: Terraform state now drifts. Next 'terraform apply' will revert to wrong value. Fix the .tfvars file.",
        feedType: "warning",
      },
      {
        id: "failover_eu_to_na",
        label: "Reroute all EU traffic through NA payment-service temporarily",
        desc: "Update load balancer to send EU payment requests to NA pods while EU is broken. Cross-region routing adds ~180ms latency.",
        badge: "WORKAROUND — HIGH LATENCY",
        badgeColor: "bg-amber-500/20 text-amber-600",
        points: 3,
        feedMessage: "EU traffic rerouted to NA payment-service. Payments processing via NA gateway with cross-region auth. 402 rate: 0%. Latency +180ms for EU customers. Root cause still present.",
        feedType: "warning",
      },
      {
        id: "restart_eu_pods",
        label: "Restart EU payment-service pods",
        desc: "Force restart all EU payment-service pods hoping the config reloads correctly.",
        badge: "⚠ WON'T FIX — CONFIG IS WRONG",
        badgeColor: "bg-red-500/20 text-red-600",
        points: -3,
        feedMessage: "EU payment pods restarted. Pods re-read the ConfigMap with the WRONG PAYMENT_GATEWAY_URL. Error rate remains at 98%. No change. Root cause is in the config, not the pod state.",
        feedType: "bad",
      },
    ],
  },
};
