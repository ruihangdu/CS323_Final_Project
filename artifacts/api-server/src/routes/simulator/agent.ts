import { getState, mutateState } from "./state";
import { handleCommand } from "./commands";

interface AgentToolResult {
  toolName: string;
  result: string;
}

interface AgentResponse {
  agent: string;
  response: string;
  confidence: string | null;
  toolsUsed: string[];
}

// Tool implementations — agents can only see data through tools
function searchLogs(query: string): string {
  const q = query.toLowerCase();
  const results: string[] = [];

  if (
    q.includes("drop") ||
    q.includes("schema") ||
    q.includes("maint_bot") ||
    q.includes("postgres")
  ) {
    results.push(handleCommand("cat /logs/postgres.log"));
  }
  if (
    q.includes("admin") ||
    q.includes("runner") ||
    q.includes("job") ||
    q.includes("maint_bot")
  ) {
    results.push(handleCommand("cat /logs/admin-runner.log"));
  }
  if (results.length === 0) {
    results.push(
      `No logs matching "${query}" found. Try searching for: drop, schema, maint_bot, admin, runner`
    );
  }
  return results.join("\n\n---\n\n");
}

function readFile(path: string): string {
  return handleCommand(`cat ${path}`);
}

function queryMetric(metricName: string): string {
  return handleCommand(`metric ${metricName}`);
}

function inspectBackup(_timestamp: string): string {
  return handleCommand("cat /backups/manifest.json");
}

function checkReplica(replicaId: string): string {
  if (replicaId.includes("1") || replicaId.toLowerCase().includes("replica-1")) {
    return `replica-db-1 status:
  Replication mode: streaming (real-time)
  Current lag: 0.3s
  Last WAL replay: 2026-04-17T02:11:16Z
  RISK: Replay timestamp is AFTER the incident (02:10:59).
  This replica likely executed DROP SCHEMA.
  Do NOT promote without verifying schema integrity.`;
  }
  if (replicaId.includes("2") || replicaId.toLowerCase().includes("replica-2")) {
    return `replica-db-2 status:
  Replication mode: delayed (60-minute lag)
  Current lag: 3612s
  Last WAL replay: 2026-04-17T01:14:22Z
  SAFE: Replay timestamp is BEFORE the incident (02:10:59).
  Schema 'public' has 47 tables. Row counts nominal.`;
  }
  return queryMetric("replica.lag");
}

function listRecentChanges(): string {
  return handleCommand('git log --since="6 hours ago"');
}

// Tool dispatcher
function callTool(toolName: string, args: Record<string, string>): AgentToolResult {
  let result = "";
  switch (toolName) {
    case "searchLogs":
      result = searchLogs(args.query || "");
      break;
    case "readFile":
      result = readFile(args.path || "");
      break;
    case "queryMetric":
      result = queryMetric(args.metricName || "");
      break;
    case "inspectBackup":
      result = inspectBackup(args.timestamp || "latest");
      break;
    case "checkReplica":
      result = checkReplica(args.replicaId || "");
      break;
    case "listRecentChanges":
      result = listRecentChanges();
      break;
    default:
      result = `Unknown tool: ${toolName}`;
  }
  return { toolName, result };
}

// Heuristic fallback agent responses
function heuristicResponse(
  agent: string,
  message: string
): AgentResponse {
  const state = getState();
  const msg = message.toLowerCase();
  const toolsUsed: string[] = [];
  let response = "";
  let confidence = "Medium";

  // Update AI delegation score for asking agents
  mutateState((s) => {
    s.score.aiDelegation = Math.min(20, s.score.aiDelegation + 2);
  });

  // Decide which tools to invoke based on message content
  const toolResults: AgentToolResult[] = [];

  if (
    msg.includes("what happened") ||
    msg.includes("root cause") ||
    msg.includes("caused") ||
    msg.includes("why")
  ) {
    toolResults.push(callTool("searchLogs", { query: "drop schema maint_bot" }));
    toolResults.push(callTool("listRecentChanges", {}));
    toolsUsed.push("searchLogs", "listRecentChanges");
  }

  if (
    msg.includes("backup") ||
    msg.includes("restore") ||
    msg.includes("recover")
  ) {
    toolResults.push(callTool("inspectBackup", { timestamp: "latest" }));
    toolResults.push(callTool("queryMetric", { metricName: "db.disk_usage" }));
    toolsUsed.push("inspectBackup", "queryMetric");
  }

  if (
    msg.includes("replica") ||
    msg.includes("promote") ||
    msg.includes("standby")
  ) {
    toolResults.push(callTool("checkReplica", { replicaId: "replica-db-1" }));
    toolResults.push(callTool("checkReplica", { replicaId: "replica-db-2" }));
    toolsUsed.push("checkReplica");
  }

  if (
    msg.includes("disk") ||
    msg.includes("metric") ||
    msg.includes("usage") ||
    msg.includes("500") ||
    msg.includes("error rate")
  ) {
    toolResults.push(callTool("queryMetric", { metricName: "db.disk_usage" }));
    toolResults.push(callTool("queryMetric", { metricName: "api.500_rate" }));
    toolsUsed.push("queryMetric");
  }

  if (toolResults.length === 0) {
    toolResults.push(callTool("queryMetric", { metricName: "api.500_rate" }));
    toolResults.push(callTool("queryMetric", { metricName: "db.disk_usage" }));
    toolsUsed.push("queryMetric");
  }

  // Generate agent-specific response based on findings
  switch (agent) {
    case "DevOps Agent":
      response = generateDevOpsResponse(msg, toolResults, state);
      confidence = state.rootCauseDiscovered ? "High" : "Medium";
      break;
    case "Database Agent":
      response = generateDatabaseResponse(msg, toolResults, state);
      confidence = state.backupInspected ? "High" : "Medium";
      break;
    case "Communications Agent":
      response = generateCommsResponse(msg, toolResults, state);
      confidence = "Medium";
      break;
    case "Skeptic Agent":
      response = generateSkepticResponse(msg, toolResults, state);
      confidence = "High";
      break;
    default:
      response = generateDevOpsResponse(msg, toolResults, state);
  }

  return { agent, response, confidence, toolsUsed: [...new Set(toolsUsed)] };
}

function generateDevOpsResponse(
  msg: string,
  toolResults: AgentToolResult[],
  state: ReturnType<typeof getState>
): string {
  if (
    msg.includes("what happened") ||
    msg.includes("root cause") ||
    msg.includes("why")
  ) {
    const logResult = toolResults.find((t) => t.toolName === "searchLogs");
    if (logResult && logResult.result.includes("DROP SCHEMA")) {
      return `Based on logs I've retrieved:

**Root Cause Identified:**
- At 02:10:59, postgres.log shows: \`DROP SCHEMA public CASCADE\` executed by \`maint_bot\` from \`admin-runner-prod-3\`
- admin-runner.log confirms: fix_replication.sh ran with \`TARGET_DB=prod\` and \`DB_HOST=prod-db.internal\`
- This script was intended for staging but ran against production

**Immediate priorities:**
1. Disable maint_bot credentials to prevent recurrence
2. Snapshot the damaged DB for forensics
3. Freeze deploys
4. Assess backup and replica options before recovery

Confidence: High — logs are unambiguous.`;
    }
    return `I've checked metrics but need more information.

Observed:
- API 500 rate at 94.2% — all routes failing
- DB disk usage dropped ~80% at 02:10:59 — highly anomalous

Possible causes: failed migration, accidental deletion, or schema corruption. I recommend inspecting /logs/postgres.log and /logs/admin-runner.log before taking recovery action.

Confidence: Low — need log data to confirm.`;
  }

  if (msg.includes("freeze") || msg.includes("deploys") || msg.includes("workers")) {
    return `Recommended containment steps:
1. Freeze all deploy pipelines immediately to prevent new bad code reaching prod
2. Stop background workers — they are failing and creating noise in logs
3. Enable maintenance mode — show users a 503 instead of broken UI
4. Page the database team

${state.deploysFrozen ? "✓ Deploys are already frozen." : ""}
${state.workersStopped ? "✓ Workers are already stopped." : ""}`;
  }

  return `Based on current observability:
- API 500 rate: 94.2% (all routes failing)
- DB disk usage: 370GB (dropped from 1.8TB at 02:10)
- Worker pods: all in Error state

The disk drop is the most significant signal — this looks like a schema or data deletion event, not an application bug. I strongly recommend checking DB logs before attempting any recovery.`;
}

function generateDatabaseResponse(
  msg: string,
  toolResults: AgentToolResult[],
  state: ReturnType<typeof getState>
): string {
  if (msg.includes("backup") || msg.includes("restore")) {
    const backupResult = toolResults.find((t) => t.toolName === "inspectBackup");
    if (backupResult) {
      return `I've inspected the backup manifest.

**Findings:**
- 2026-04-17 backup: 112GB, verified=false — UNSAFE TO USE
  - Expected size ~1.8TB based on prior backup; this backup likely started before the incident and captured an incomplete state
- 2026-04-16 backup: 1,830GB, verified=true — SAFE

**Recommendation:**
Restore from 2026-04-16 (verified, full size) + WAL replay to 01:44.
This gives us recovery to 01:44, with a potential data loss window of 01:44–02:10.

**Do NOT restore the latest (2026-04-17) backup.** It will fail and waste ~20 minutes.

Confidence: High`;
    }
    return `Do not assume the latest backup is valid. Inspect size, verification status, and restore logs first.
      
Run: \`cat /backups/manifest.json\` to see backup details before attempting any restore.`;
  }

  if (msg.includes("replica") || msg.includes("promote")) {
    return `Risk assessment on replicas:

**replica-db-1 (streaming, real-time):**
- Last replay: 02:11:16Z — AFTER the DROP SCHEMA at 02:10:59
- This replica executed the destructive transaction
- DO NOT promote — missing data will persist

**replica-db-2 (60-minute delayed replica):**
- Last replay: 01:14:22Z — BEFORE the incident
- Schema intact, row counts nominal
- Can serve as read source or recovery baseline

**Recommendation:** Use replica-db-2 as a reference, but restore from verified backup + WAL for full data recovery.`;
  }

  if (!state.backupInspected) {
    return `Before any recovery action, I need to inspect the backup manifest.

Key questions:
1. Is the latest backup verified and full-size?
2. What is the WAL archive coverage up to?
3. Have replicas replayed the destructive transaction?

Run \`cat /backups/manifest.json\` and \`metric replica.lag\` to answer these before acting.`;
  }

  return `Database status assessment:
- Primary: schema 'public' has 0 tables (destroyed)
- DB disk: 370GB (dropped 79.8% at 02:10:59 — consistent with DROP SCHEMA CASCADE on ~1.8TB database)
- Recovery options: verified backup (2026-04-16) + WAL, or replica-db-2 (delayed, pre-incident)

Estimated recovery time: 30-45 minutes from verified backup + WAL replay.`;
}

function generateCommsResponse(
  msg: string,
  _toolResults: AgentToolResult[],
  state: ReturnType<typeof getState>
): string {
  if (msg.includes("status") || msg.includes("customer") || msg.includes("update") || msg.includes("communicate")) {
    if (!state.rootCauseDiscovered) {
      return `I'd caution against publishing a detailed status update before root cause is confirmed.

Recommended update (honest but not overconfident):
---
"We are investigating reports of missing projects and tasks in TaskForge. Our team has identified a database issue and is working to restore service. We will provide an update in 20 minutes."
---

Do NOT mention specific causes until confirmed. Do NOT promise an ETA for data recovery until you've verified the backup plan. Overconfident updates require painful corrections.`;
    }
    return `With root cause confirmed, here is a recommended status update:
---
"We have identified the cause of the outage: a maintenance script inadvertently executed against our production database at 2:10 AM UTC, removing all application data. We are performing a full database restore from our verified backup. ETA for service restoration: 30 minutes. We will publish a full postmortem within 24 hours."
---

Tone notes: factual, no blame, sets clear expectation. Avoid "we apologize for the inconvenience" — be specific about impact.`;
  }

  return `Comms priorities during a data loss incident:
1. Post initial acknowledgment fast (even if you don't know root cause)
2. Update every 15-20 minutes while investigation is ongoing
3. Only state facts you've confirmed — avoid speculation
4. Assign a comms lead who is NOT the primary responder
5. Draft customer notification email with data loss scope once recovery plan is confirmed`;
}

function generateSkepticResponse(
  msg: string,
  toolResults: AgentToolResult[],
  state: ReturnType<typeof getState>
): string {
  const concerns: string[] = [];

  if (state.latestBackupRestored) {
    concerns.push(
      "⚠️ You restored from the unverified latest backup. That was a mistake — always inspect the manifest before restoring."
    );
  }
  if (state.replica1Promoted) {
    concerns.push(
      "⚠️ You promoted replica-db-1 without checking its WAL replay timestamp. That replica executed DROP SCHEMA and had no data."
    );
  }
  if (!state.damagedDbSnapshotted && (state.verifiedBackupRestored || state.latestBackupRestored)) {
    concerns.push(
      "⚠️ You attempted recovery before snapshotting the damaged database. Forensic evidence may be lost."
    );
  }
  if (state.statusPublished && !state.rootCauseDiscovered) {
    concerns.push(
      "⚠️ You published a status update before confirming root cause. That's an overconfident communication that may need to be walked back."
    );
  }

  if (msg.includes("replica") || msg.includes("promote")) {
    return `I'm skeptical about promoting any replica without checking first.

${toolResults.find((t) => t.toolName === "checkReplica")?.result || "Run: metric replica.lag to check replay positions."}

Risk: replicas stream changes in real-time. If primary executed DROP SCHEMA, a streaming replica almost certainly replayed it seconds later. Verify replica WAL replay timestamp < 02:10:59 before any promotion.`;
  }

  if (msg.includes("backup") || msg.includes("restore") || msg.includes("latest")) {
    return `I'm not convinced the latest backup is safe.

${toolResults.find((t) => t.toolName === "inspectBackup")?.result.slice(0, 500) || ""}

The 2026-04-17 backup is only 112GB. The previous verified backup was 1,830GB. This is a 93.9% size difference — almost certainly an incomplete snapshot. Restoring it will waste ~20 minutes and leave you in the same state.

Use the 2026-04-16 verified backup + WAL replay to 01:44.`;
  }

  if (concerns.length > 0) {
    return `Skeptic review of your decisions so far:\n\n${concerns.join("\n\n")}\n\nRemember: in a data-loss incident, speed matters less than correctness. One bad recovery decision can cause more damage than the original incident.`;
  }

  return `Before you act, consider these risks:
- Have you confirmed the root cause? (Check /logs/postgres.log)
- Is the backup you're planning to use actually valid? (Check /backups/manifest.json)
- Have replicas replayed the destructive transaction? (Check metric replica.lag)
- Have you snapshotted the damaged DB for forensics?

The most common mistakes in incidents: restoring from an invalid backup, promoting a compromised replica, and publishing updates before understanding the problem.`;
}

export async function handleAgent(
  agentName: string,
  message: string
): Promise<AgentResponse> {
  // Check for OpenAI API key
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      return await callOpenAI(agentName, message, openaiKey);
    } catch (err) {
      // Fall through to heuristic
    }
  }

  return heuristicResponse(agentName, message);
}

async function callOpenAI(
  agentName: string,
  message: string,
  apiKey: string
): Promise<AgentResponse> {
  const systemPrompts: Record<string, string> = {
    "DevOps Agent":
      "You are a senior DevOps engineer responding to a production incident at TaskForge. You have access to tools that let you inspect logs, metrics, and infrastructure. You respond with observed facts, hypotheses, confidence levels, and recommended next steps. You do NOT have direct access to the internal simulator state — you can only see what tool outputs reveal.",
    "Database Agent":
      "You are a database reliability engineer responding to a production data loss incident. You focus on backup verification, replica safety assessment, and recovery planning. Always cite artifact evidence. Never assume backups are valid without inspection.",
    "Communications Agent":
      "You are a technical communications lead during a production incident. You help craft accurate, measured customer communications. You emphasize: don't publish before root cause is confirmed, set clear expectations, avoid blame.",
    "Skeptic Agent":
      "You are a senior engineer playing devil's advocate during incident response. You identify risks in proposed recovery actions, challenge assumptions, and ask hard questions. You prevent overconfident or premature actions.",
  };

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "searchLogs",
        description: "Search application and system logs",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "readFile",
        description: "Read a file from the system",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path" },
          },
          required: ["path"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "queryMetric",
        description: "Query a system metric",
        parameters: {
          type: "object",
          properties: {
            metricName: {
              type: "string",
              description: "Metric name (e.g. db.disk_usage, api.500_rate, replica.lag)",
            },
          },
          required: ["metricName"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "inspectBackup",
        description: "Inspect a backup",
        parameters: {
          type: "object",
          properties: {
            timestamp: { type: "string", description: "Backup timestamp or 'latest'" },
          },
          required: ["timestamp"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "checkReplica",
        description: "Check a database replica status",
        parameters: {
          type: "object",
          properties: {
            replicaId: { type: "string", description: "Replica ID (e.g. replica-db-1)" },
          },
          required: ["replicaId"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "listRecentChanges",
        description: "List recent git commits",
        parameters: { type: "object", properties: {} },
      },
    },
  ];

  type ChatMessage =
    | { role: "system" | "user" | "assistant"; content: string; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }
    | { role: "tool"; content: string; tool_call_id: string; name: string };

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompts[agentName] || systemPrompts["DevOps Agent"],
    },
    { role: "user", content: message },
  ];

  const toolsUsed: string[] = [];

  // Agentic loop with tool calls
  for (let i = 0; i < 5; i++) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          role: string;
          content: string | null;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason: string;
      }>;
    };

    const choice = data.choices[0];
    const msg = choice.message;

    if (choice.finish_reason === "tool_calls" && msg.tool_calls) {
      messages.push({
        role: "assistant",
        content: msg.content || "",
        tool_calls: msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: tc.function,
        })),
      });
      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}") as Record<string, string>;
        const toolResult = callTool(tc.function.name, args);
        toolsUsed.push(tc.function.name);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: toolResult.result,
        });
      }
    } else {
      messages.push({ role: "assistant", content: msg.content || "" });
      // Extract confidence if mentioned
      const content = msg.content || "";
      const confMatch = content.match(/confidence[:\s]+(\w+)/i);
      const confidence = confMatch ? confMatch[1] : "Medium";

      return {
        agent: agentName,
        response: content,
        confidence,
        toolsUsed: [...new Set(toolsUsed)],
      };
    }
  }

  throw new Error("Max tool call iterations reached");
}
