import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, Terminal, CheckCircle2, RotateCcw, Send, Activity,
  ShieldAlert, Zap, Clock, Shield, TrendingUp, Settings, ChevronRight,
  FlaskConical, Target, Siren,
} from "lucide-react";
import {
  useGetSimulatorState,
  useRunCommand,
  useTakeAction,
  useQueryAgent,
  useResetSimulator,
  useSelectScenario,
  useSubmitDiagnosis,
  useExecuteRecovery,
  getGetSimulatorStateQueryKey,
  ActionRequestAction,
  AgentRequestAgent,
  SelectScenarioBodyScenarioId,
  type FeedEvent,
  type SimulatorState,
  type ScoreBreakdown,
} from "@workspace/api-client-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const FONT_URLS: Record<string, string> = {
  dev: "https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap",
  editorial: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap",
};

function useBranding() {
  const params = new URLSearchParams(window.location.search);
  const companyName = params.get("company") || "TaskForge";
  const accentColor = params.get("color");
  const accentFg = params.get("fg");
  const brand = params.get("brand") || "dev";

  useEffect(() => {
    if (accentColor) document.documentElement.style.setProperty("--primary", accentColor);
    if (accentFg) document.documentElement.style.setProperty("--primary-foreground", accentFg);
    document.documentElement.setAttribute("data-brand", brand);
    const url = FONT_URLS[brand];
    if (url && !document.getElementById(`font-brand-${brand}`)) {
      const link = document.createElement("link");
      link.id = `font-brand-${brand}`;
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
  }, [accentColor, accentFg, brand]);

  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const cosParams = new URLSearchParams(window.location.search).toString();
  const cosUrl = `/cos-simulator/${cosParams ? `?${cosParams}` : ""}`;

  return { companyName, companySlug, cosUrl, brand };
}

// ── Scenario Definitions (mirrors backend) ─────────────────────────────────

const SCENARIO_META: Record<string, {
  id: SelectScenarioBodyScenarioId;
  name: string;
  subtitle: string;
  difficulty: "MEDIUM" | "HARD" | "EXPERT";
  synopsis: string;
  color: string;
}> = {
  maint_bot: {
    id: SelectScenarioBodyScenarioId.maint_bot,
    name: "The Maint Bot Disaster",
    subtitle: "Production DB wiped by a rogue automation script",
    difficulty: "HARD",
    synopsis: "02:14 UTC — API 500 rate at 35% and climbing. Primary DB disk shed 79% of its data in 14 seconds. Find out what ran. Stop it. Recover.",
    color: "border-red-500/50",
  },
  bad_deploy: {
    id: SelectScenarioBodyScenarioId.bad_deploy,
    name: "Zero to 500",
    subtitle: "A deploy with a missing migration is destroying your API",
    difficulty: "MEDIUM",
    synopsis: "14:32 UTC — v2.48.0 deployed. 3 minutes later, 67% of requests return 500. CI passed. Rollback or fix forward?",
    color: "border-amber-500/50",
  },
  memory_siege: {
    id: SelectScenarioBodyScenarioId.memory_siege,
    name: "Death by a Thousand Leaks",
    subtitle: "OOM kills across your task-processor fleet",
    difficulty: "HARD",
    synopsis: "03:14 UTC — task-processor pods dying one by one. Memory climbing without end. Something in a recent PR introduced an unbounded cache. Find it.",
    color: "border-orange-500/50",
  },
  config_catastrophe: {
    id: SelectScenarioBodyScenarioId.config_catastrophe,
    name: "Wrong Address",
    subtitle: "Terraform apply pointed EU payments at the wrong gateway",
    difficulty: "MEDIUM",
    synopsis: "09:15 UTC — EU checkout conversion: 0%. NA unaffected. No code deployed. The answer is in your infrastructure config.",
    color: "border-blue-500/50",
  },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  MEDIUM: "bg-amber-500/20 text-amber-500",
  HARD: "bg-orange-500/20 text-orange-500",
  EXPERT: "bg-red-500/20 text-red-500",
};

// ── Scenario Picker Modal ──────────────────────────────────────────────────

function ScenarioPickerModal({ isOpen, onSelect }: {
  isOpen: boolean;
  onSelect: (id: SelectScenarioBodyScenarioId) => void;
}) {
  const [selected, setSelected] = useState<SelectScenarioBodyScenarioId | null>(null);
  const selectScenario = useSelectScenario();
  const queryClient = useQueryClient();

  const handleConfirm = () => {
    if (!selected) return;
    selectScenario.mutate({ data: { scenarioId: selected } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
        onSelect(selected);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-card border-border" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-mono text-lg text-primary flex items-center gap-2">
            <Siren className="w-5 h-5" /> SELECT INCIDENT SCENARIO
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            Choose the incident you want to simulate. Each scenario requires different investigation techniques and recovery strategies.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {Object.values(SCENARIO_META).map(sc => (
            <button
              key={sc.id}
              onClick={() => setSelected(sc.id)}
              className={`text-left p-4 rounded-md border-2 transition-all ${selected === sc.id ? "border-primary bg-primary/10" : `${sc.color} bg-background hover:border-primary/50`}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-foreground leading-tight">{sc.name}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${DIFFICULTY_COLORS[sc.difficulty]}`}>{sc.difficulty}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{sc.subtitle}</p>
              <p className="text-xs text-foreground/70 leading-relaxed">{sc.synopsis}</p>
            </button>
          ))}
        </div>
        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            className="font-mono text-xs"
            disabled={!selected || selectScenario.isPending}
            onClick={handleConfirm}
          >
            {selectScenario.isPending ? "Loading scenario..." : "Launch Incident →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Diagnose Modal ─────────────────────────────────────────────────────────

interface DiagnosisQuestion {
  categories: { id: string; label: string }[];
  triggers: { id: string; label: string }[];
  blastRadiusOptions: { id: string; label: string }[];
}

const SCENARIO_QUESTIONS: Record<string, DiagnosisQuestion> = {
  maint_bot: {
    categories: [
      { id: "data_destruction", label: "Data destruction / DDL executed on production" },
      { id: "code_regression", label: "Application code regression causing data errors" },
      { id: "hardware_failure", label: "Hardware / storage failure on database host" },
      { id: "network_partition", label: "Network partition isolating database from app layer" },
      { id: "resource_exhaustion", label: "Resource exhaustion (disk full, memory OOM)" },
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
      { id: "api_layer", label: "All API endpoints (500 on every query)" },
      { id: "background_jobs", label: "Background job queue (all workers crashing)" },
      { id: "auth_sessions", label: "Authentication sessions invalidated" },
      { id: "read_replicas_only", label: "Read replicas only (writes unaffected)" },
      { id: "eu_region_only", label: "EU region only (NA still serving)" },
    ],
  },
  bad_deploy: {
    categories: [
      { id: "code_regression", label: "Application code regression / deploy introduced breaking change" },
      { id: "data_destruction", label: "Data destruction — tables or rows deleted by automation" },
      { id: "hardware_failure", label: "Hardware / storage failure on database host" },
      { id: "resource_exhaustion", label: "Resource exhaustion — DB CPU/memory/connections maxed" },
      { id: "config_mismatch", label: "Configuration mismatch — wrong environment variables" },
      { id: "schema_migration", label: "Database schema migration applied incorrectly" },
    ],
    triggers: [
      { id: "missing_migration_before_code_deploy", label: "Code deployed before its required DB migration ran — schema mismatch" },
      { id: "breaking_api_contract_change", label: "v2.48.0 changed the API contract, breaking downstream consumers" },
      { id: "orm_cache_stale", label: "ORM model cache became stale after deploy — needs pod restart" },
      { id: "new_feature_flag_activated", label: "A new feature flag was activated incompatible with current schema" },
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
  memory_siege: {
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
      { id: "task_processing", label: "Task processing — job queue backing up" },
      { id: "email_queue", label: "Email notifications — email-worker depends on task events" },
      { id: "report_generation", label: "Report generation — blocked on task data" },
      { id: "api_layer", label: "API layer — all user-facing endpoints returning 500" },
      { id: "database", label: "Database — primary DB unavailable or corrupted" },
      { id: "auth_sessions", label: "Authentication — users being logged out" },
    ],
  },
  config_catastrophe: {
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
};

const RECOVERY_OPTIONS: Record<string, {
  id: string; label: string; desc: string; badge: string; badgeColor: string;
}[]> = {
  maint_bot: [
    { id: "restore_verified_wal", label: "Restore 2026-04-16 verified backup + WAL replay to 02:09", desc: "Use the last verified 1.8TB backup and replay WAL archives to just before the incident. ~26 min data loss window.", badge: "RECOMMENDED", badgeColor: "bg-green-500/20 text-green-600" },
    { id: "promote_replica2", label: "Promote replica-db-2 to primary (60-min delayed)", desc: "replica-db-2 last replayed at 01:14 UTC, before the incident. Can be promoted — but ~56 min of data is lost.", badge: "VALID — MORE DATA LOSS", badgeColor: "bg-amber-500/20 text-amber-600" },
    { id: "restore_latest_backup", label: "Restore from latest backup (2026-04-17, 112 GB)", desc: "Most recent backup. Looks current but manifest shows it as unverified and incomplete.", badge: "⚠ RISKY — UNVERIFIED", badgeColor: "bg-red-500/20 text-red-600" },
    { id: "promote_replica1", label: "Promote replica-db-1 (streaming replica)", desc: "replica-db-1 is near-real-time. It replicated the DROP SCHEMA within 17 seconds.", badge: "⚠ FATAL — SCHEMA ALREADY DROPPED", badgeColor: "bg-red-500/20 text-red-600" },
  ],
  bad_deploy: [
    { id: "rollback_v2_47_1", label: "Roll back to v2.47.1 immediately", desc: "Revert production pods to previous stable version. Migration never ran, so rollback is clean.", badge: "RECOMMENDED — FASTEST", badgeColor: "bg-green-500/20 text-green-600" },
    { id: "hotfix_v2_48_1", label: "Ship v2.48.1 hotfix (run migration + fix CI)", desc: "Run the missing migration on prod, then deploy v2.48.1 with migration precondition check in CI.", badge: "VALID — SLOWER", badgeColor: "bg-amber-500/20 text-amber-600" },
    { id: "run_migration_on_prod", label: "Run the missing migration directly on production DB now", desc: "SSH in and apply the migration manually without a code change.", badge: "⚠ RISKY — NO TEST COVERAGE", badgeColor: "bg-red-500/20 text-red-600" },
    { id: "rollback_v2_46_0", label: "Roll back to v2.46.0 (two versions back)", desc: "Skip v2.47.1 and go straight to v2.46.0 — a stable version from last week.", badge: "UNNECESSARY REGRESSION", badgeColor: "bg-amber-500/20 text-amber-600" },
  ],
  memory_siege: [
    { id: "rollback_task_processor", label: "Roll back task-processor to v1.13.2 (pre-PR-1847)", desc: "Revert the task-processor service to before the unbounded cache was introduced.", badge: "RECOMMENDED — COMPLETE FIX", badgeColor: "bg-green-500/20 text-green-600" },
    { id: "increase_memory_limits", label: "Increase Kubernetes memory limits to 12 GB per pod", desc: "Triple the memory ceiling. Buys time but the leak continues growing.", badge: "BUYS TIME — NOT A FIX", badgeColor: "bg-amber-500/20 text-amber-600" },
    { id: "restart_affected_pods", label: "Restart all OOMKilled task-processor pods", desc: "Force-restart unhealthy pods. Memory resets to zero briefly — cache refills from the first job.", badge: "TEMPORARY — 7 MIN RELIEF", badgeColor: "bg-amber-500/20 text-amber-600" },
    { id: "disable_caching_globally", label: "Disable caching across all services via feature flag", desc: "Toggle ENABLE_CACHING=false globally. Nuclear option — impacts unaffected services.", badge: "⚠ OVER-BROAD", badgeColor: "bg-red-500/20 text-red-600" },
  ],
  config_catastrophe: [
    { id: "revert_terraform_apply", label: "Revert Terraform state and re-apply correct EU config", desc: "Run terraform apply with the correct eu-gateway value. Clean, idempotent, permanent fix.", badge: "RECOMMENDED — PERMANENT FIX", badgeColor: "bg-green-500/20 text-green-600" },
    { id: "patch_configmap_manually", label: "Manually kubectl patch the payment-eu ConfigMap", desc: "Apply the fix directly with kubectl. Fast, but Terraform state will drift.", badge: "VALID — CAUSES DRIFT", badgeColor: "bg-amber-500/20 text-amber-600" },
    { id: "failover_eu_to_na", label: "Reroute all EU traffic through NA payment-service", desc: "Update load balancer to send EU requests to NA pods. Adds ~180ms latency.", badge: "WORKAROUND — HIGH LATENCY", badgeColor: "bg-amber-500/20 text-amber-600" },
    { id: "restart_eu_pods", label: "Restart EU payment-service pods", desc: "Force restart all EU pods hoping the config reloads correctly.", badge: "⚠ WON'T FIX — CONFIG IS WRONG", badgeColor: "bg-red-500/20 text-red-600" },
  ],
};

function DiagnoseModal({ isOpen, onClose, state, onSuccess }: {
  isOpen: boolean; onClose: () => void; state: SimulatorState; onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<string | null>(null);
  const [blastRadius, setBlastRadius] = useState<string[]>([]);
  const [result, setResult] = useState<{ feedback: string; totalScore: number } | null>(null);
  const submitDiagnosis = useSubmitDiagnosis();

  const questions = SCENARIO_QUESTIONS[state.scenarioId] ?? SCENARIO_QUESTIONS.maint_bot;
  const toggleBlast = (id: string) =>
    setBlastRadius(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = () => {
    if (!category || !trigger) return;
    submitDiagnosis.mutate(
      { data: { rootCauseCategory: category, specificTrigger: trigger, blastRadius } },
      {
        onSuccess: (data) => {
          setResult({ feedback: data.feedback, totalScore: data.totalScore });
          onSuccess();
        },
      }
    );
  };

  const reset = () => { setStep(1); setCategory(null); setTrigger(null); setBlastRadius([]); setResult(null); };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base text-primary flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            Submit Hypothesis {!result && `— Step ${step}/3`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            {!result && step === 1 && "What category of failure caused this incident?"}
            {!result && step === 2 && "What specific trigger caused the failure?"}
            {!result && step === 3 && "Which systems were impacted? (select all that apply)"}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="text-center p-4 bg-background rounded-md border border-border">
              <div className="text-3xl font-bold font-mono text-primary">{result.totalScore}<span className="text-sm text-muted-foreground">/18</span></div>
              <div className="text-xs text-muted-foreground font-mono mt-1">DIAGNOSIS SCORE</div>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-md border border-border font-mono text-foreground">
              {result.feedback}
            </div>
            <Button className="w-full font-mono text-xs" onClick={() => { onClose(); reset(); }}>
              {result.totalScore >= 13 ? "Good work — now execute recovery →" : "OK — check the terminal for more clues"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  {questions.categories.map(c => (
                    <button key={c.id} onClick={() => setCategory(c.id)}
                      className={`w-full text-left p-3 rounded-md border text-sm transition-all ${category === c.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${category === c.id ? "border-primary bg-primary" : "border-border"}`}>
                          {category === c.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-foreground">{c.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <Button className="w-full font-mono text-xs" disabled={!category} onClick={() => setStep(2)}>
                  Next: Specific Trigger →
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  {questions.triggers.map(t => (
                    <button key={t.id} onClick={() => setTrigger(t.id)}
                      className={`w-full text-left p-3 rounded-md border text-sm transition-all ${trigger === t.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${trigger === t.id ? "border-primary bg-primary" : "border-border"}`}>
                          {trigger === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-foreground">{t.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 font-mono text-xs" onClick={() => setStep(1)}>← Back</Button>
                  <Button className="flex-1 font-mono text-xs" disabled={!trigger} onClick={() => setStep(3)}>Next: Blast Radius →</Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-xs text-muted-foreground font-mono">Select all systems affected. Correct = +3 pts each. Wrong = -2 pts each.</p>
                <div className="space-y-2">
                  {questions.blastRadiusOptions.map(b => (
                    <button key={b.id} onClick={() => toggleBlast(b.id)}
                      className={`w-full text-left p-3 rounded-md border text-sm transition-all ${blastRadius.includes(b.id) ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${blastRadius.includes(b.id) ? "border-primary bg-primary" : "border-border"}`}>
                          {blastRadius.includes(b.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-foreground">{b.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 font-mono text-xs" onClick={() => setStep(2)}>← Back</Button>
                  <Button className="flex-1 font-mono text-xs"
                    disabled={blastRadius.length === 0 || submitDiagnosis.isPending}
                    onClick={handleSubmit}>
                    {submitDiagnosis.isPending ? "Scoring..." : "Submit Hypothesis"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecoverModal({ isOpen, onClose, state, onSuccess }: {
  isOpen: boolean; onClose: () => void; state: SimulatorState; onSuccess: () => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; points: number } | null>(null);
  const executeRecovery = useExecuteRecovery();
  const queryClient = useQueryClient();

  const options = RECOVERY_OPTIONS[state.scenarioId] ?? [];

  const handleSubmit = () => {
    if (!choice) return;
    executeRecovery.mutate({ data: { strategy: choice } }, {
      onSuccess: (data) => {
        setResult({ message: data.message, points: data.points });
        queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
        onSuccess();
      },
    });
  };

  const reset = () => { setChoice(null); setResult(null); };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base text-primary flex items-center gap-2">
            <Target className="w-4 h-4" /> Execute Recovery Strategy
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            Choose your recovery approach. Each option carries different risks and trade-offs. You only get one shot.
            {!state.diagnosisSubmitted && <span className="block text-amber-500 mt-1">⚠ You haven't submitted a hypothesis yet — recovering blind is risky.</span>}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className={`text-center p-4 rounded-md border ${result.points > 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <div className={`text-3xl font-bold font-mono ${result.points > 0 ? "text-green-500" : "text-red-500"}`}>
                {result.points > 0 ? "+" : ""}{result.points} pts
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-1">RECOVERY SCORE</div>
            </div>
            <div className="text-sm leading-relaxed bg-background p-4 rounded-md border border-border font-mono text-foreground">
              {result.message}
            </div>
            <Button className="w-full font-mono text-xs" onClick={() => { onClose(); reset(); }}>
              Close — continue to resolution
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {options.map(opt => (
              <button key={opt.id} onClick={() => setChoice(opt.id)}
                className={`w-full text-left p-3 rounded-md border text-sm transition-all ${choice === opt.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${opt.badgeColor}`}>{opt.badge}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${choice === opt.id ? "border-primary bg-primary" : "border-border"}`}>
                      {choice === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            <Button className="w-full font-mono text-xs" disabled={!choice || executeRecovery.isPending} onClick={handleSubmit}>
              {executeRecovery.isPending ? "Executing..." : "Execute Recovery →"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Feed ───────────────────────────────────────────────────────────────────

const FEED_TYPE_CFG: Record<string, { border: string; avatar: string; avatarText: string }> = {
  critical: { border: "#dc2626", avatar: "#fee2e2", avatarText: "#991b1b" },
  bad:      { border: "#ea580c", avatar: "#ffedd5", avatarText: "#9a3412" },
  warning:  { border: "#d97706", avatar: "#fef3c7", avatarText: "#92400e" },
  good:     { border: "#16a34a", avatar: "#dcfce7", avatarText: "#14532d" },
  info:     { border: "#94a3b8", avatar: "#f8fafc", avatarText: "#475569" },
};

function IncidentFeed({ feed, brand }: { feed: FeedEvent[]; brand: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [feed]);

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-3 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Clock className="w-4 h-4 mr-2" /> {brand === "editorial" ? "Inbox" : "INCIDENT FEED"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto" ref={scrollRef}>
        <div className={`flex flex-col p-4 ${brand === "editorial" ? "gap-2" : "gap-3"}`}>
          {feed.map((event) => {
            if (brand === "editorial") {
              const words = event.source.replace(/_/g, " ").split(/\s+/).filter(Boolean);
              const initials = words.map(w => w[0]).join("").slice(0, 2).toUpperCase();
              const displayName = words.map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
              const cfg = FEED_TYPE_CFG[event.type] ?? FEED_TYPE_CFG.info;
              return (
                <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-white animate-in slide-in-from-bottom-2 fade-in"
                  style={{ borderLeft: `3px solid ${cfg.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
                    style={{ background: cfg.avatar, color: cfg.avatarText }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: cfg.avatarText }}>{displayName}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{event.time}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{event.message}</p>
                  </div>
                </div>
              );
            }
            let color = "text-muted-foreground";
            let badgeClass = "border-border text-muted-foreground";
            if (event.type === "critical") { color = "text-destructive"; badgeClass = "border-destructive text-destructive bg-destructive/10"; }
            if (event.type === "bad") { color = "text-orange-500"; badgeClass = "border-orange-500 text-orange-500 bg-orange-500/10"; }
            if (event.type === "warning") { color = "text-amber-500"; }
            if (event.type === "good") { color = "text-green-500"; }
            return (
              <div key={event.id} className="flex flex-col gap-1 text-sm animate-in slide-in-from-bottom-2 fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{event.time}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 rounded-sm font-mono uppercase ${badgeClass}`}>
                    {event.source}
                  </Badge>
                </div>
                <p className={`font-mono text-sm ${color}`}>{event.message}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Terminal ───────────────────────────────────────────────────────────────

type TerminalEntry = { command: string; output: string };

function TerminalConsole({ companySlug }: { companySlug: string }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runCommand = useRunCommand();
  const queryClient = useQueryClient();
  const prompt = `${companySlug}-ops`;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, runCommand.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || runCommand.isPending) return;
    setInput("");
    setHistIdx(-1);
    setCmdHistory(prev => [cmd, ...prev]);
    runCommand.mutate({ data: { command: cmd } }, {
      onSuccess: (data) => {
        setHistory((prev) => [...prev, { command: cmd, output: data.output }]);
        queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(nextIdx);
      setInput(cmdHistory[nextIdx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.max(histIdx - 1, -1);
      setHistIdx(nextIdx);
      setInput(nextIdx === -1 ? "" : cmdHistory[nextIdx] ?? "");
    }
  };

  return (
    <Card className="h-1/3 flex flex-col min-h-[250px] border-border bg-black">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0 bg-card">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Terminal className="w-4 h-4 mr-2" /> TERMINAL <span className="ml-2 text-[10px] text-muted-foreground">↑↓ history</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 flex flex-col font-mono text-xs overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-2" ref={scrollRef}>
          <div className="text-muted-foreground mb-2">Type 'help' for available commands</div>
          {history.map((entry, i) => (
            <div key={i} className="mb-2">
              <div className="text-primary">{prompt} $ {entry.command}</div>
              {entry.output && (
                <div className="text-foreground whitespace-pre-wrap mt-0.5 pl-2 border-l border-border">
                  {entry.output}
                </div>
              )}
            </div>
          ))}
          {runCommand.isPending && <div className="text-muted-foreground animate-pulse">Running...</div>}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center shrink-0">
          <span className="text-primary mr-2">{prompt} $</span>
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Type a command..."
            autoComplete="off" spellCheck="false"
            data-testid="input-terminal"
            disabled={runCommand.isPending}
          />
        </form>
      </CardContent>
    </Card>
  );
}

// ── AI Agent Panel ─────────────────────────────────────────────────────────

function AIAgentPanel() {
  const [activeTab, setActiveTab] = useState<string>("DevOps Agent");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Array<{ role: string; content: string; tools?: string[] }>>([]);
  const queryAgent = useQueryAgent();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || queryAgent.isPending) return;
    const userMsg = input;
    setHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    queryAgent.mutate({ data: { agent: activeTab as AgentRequestAgent, message: userMsg } }, {
      onSuccess: (data) => {
        setHistory(prev => [...prev, { role: "agent", content: data.response, tools: data.toolsUsed }]);
        queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
      }
    });
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, queryAgent.isPending]);

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Zap className="w-4 h-4 mr-2" /> AI ASSISTANCE
        </CardTitle>
      </CardHeader>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2 shrink-0">
          <TabsList className="w-full bg-background grid grid-cols-2 lg:grid-cols-4 h-auto p-1">
            {Object.values(AgentRequestAgent).map(agent => (
              <TabsTrigger key={agent} value={agent}
                className="text-[10px] sm:text-xs py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono rounded-sm"
                data-testid={`tab-agent-${agent.replace(" ", "-")}`}>
                {agent.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {history.length === 0 && (
            <div className="text-center text-muted-foreground text-sm font-mono py-8">
              Select an agent and ask for analysis, logs, or advice.
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary/20 text-primary-foreground border border-primary/30" : "bg-secondary text-secondary-foreground"}`}>
                {msg.content}
              </div>
              {msg.role === "agent" && msg.tools && msg.tools.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {msg.tools.map((t, idx) => (
                    <Badge key={idx} variant="outline" className="text-[9px] font-mono border-muted-foreground/30 text-muted-foreground">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
          {queryAgent.isPending && (
            <div className="flex items-start">
              <div className="bg-secondary rounded-md px-3 py-2 text-sm text-muted-foreground animate-pulse font-mono">Thinking...</div>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-border shrink-0 bg-background/50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${activeTab}...`}
              className="bg-card font-mono text-sm" disabled={queryAgent.isPending}
              data-testid="input-agent-chat" />
            <Button type="submit" size="icon" disabled={queryAgent.isPending || !input.trim()} data-testid="btn-agent-send">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Tabs>
    </Card>
  );
}

// ── Action Panel ───────────────────────────────────────────────────────────

function ActionPanel({ state }: { state: SimulatorState }) {
  const takeAction = useTakeAction();
  const queryClient = useQueryClient();
  const [diagnoseOpen, setDiagnoseOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });

  const handleAction = (action: ActionRequestAction) => {
    takeAction.mutate({ data: { action } }, { onSuccess: invalidate });
  };

  const ActionBtn = ({
    id, label, isTaken, variant = "default", disabled = false, urgent = false,
  }: {
    id: ActionRequestAction; label: string; isTaken: boolean;
    variant?: VariantProps<typeof buttonVariants>["variant"]; disabled?: boolean; urgent?: boolean;
  }) => (
    <Button
      variant={isTaken ? "secondary" : variant}
      className={`w-full justify-start font-mono text-xs ${isTaken ? "opacity-50 cursor-not-allowed" : ""} ${urgent && !isTaken ? "ring-1 ring-amber-500" : ""}`}
      onClick={() => handleAction(id)}
      disabled={isTaken || disabled || takeAction.isPending || state.incidentClosed}
      data-testid={`btn-action-${id}`}
    >
      {isTaken ? <CheckCircle2 className="w-3 h-3 mr-2" /> : <div className="w-3 h-3 mr-2 opacity-50 border border-current rounded-full" />}
      {label}
    </Button>
  );

  const scenarioId = state.scenarioId;

  return (
    <>
      <DiagnoseModal isOpen={diagnoseOpen} onClose={() => setDiagnoseOpen(false)} state={state} onSuccess={invalidate} />
      <RecoverModal isOpen={recoverOpen} onClose={() => setRecoverOpen(false)} state={state} onSuccess={invalidate} />

      <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border shrink-0">
          <CardTitle className="text-sm font-mono flex items-center text-primary">
            <ShieldAlert className="w-4 h-4 mr-2" /> DECISIONS & ACTIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">

          {/* Containment — all scenarios */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Containment</h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn id={ActionRequestAction.DECLARE_SEV1} label="Declare SEV1" isTaken={state.sevDeclared} variant="destructive" urgent />
              <ActionBtn id={ActionRequestAction.FREEZE_DEPLOYS} label="Freeze Deploys" isTaken={state.deploysFrozen} variant="outline" />
              <ActionBtn id={ActionRequestAction.STOP_WORKERS} label="Stop Workers" isTaken={state.workersStopped} variant="outline" />
              <ActionBtn id={ActionRequestAction.MAINTENANCE_MODE} label="Maintenance Mode" isTaken={state.maintenanceMode} variant="outline" />
            </div>
          </div>

          {/* Investigation — scenario-specific */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Investigation</h3>
            <div className="grid grid-cols-2 gap-2">
              {scenarioId === "maint_bot" && (<>
                <ActionBtn id={ActionRequestAction.SNAPSHOT_DB} label="Snapshot Damaged DB" isTaken={state.damagedDbSnapshotted} variant="outline" />
                <ActionBtn id={ActionRequestAction.DISABLE_MAINT_BOT} label="Disable Maint Bot" isTaken={state.maintBotDisabled} variant="outline" />
                <ActionBtn id={ActionRequestAction.INSPECT_REPLICA_2} label="Inspect Replica-2" isTaken={state.replica2Inspected} variant="outline" />
              </>)}
              {scenarioId === "bad_deploy" && (<>
                <ActionBtn id={ActionRequestAction.CHECK_DEPLOY_LOG} label="Review Deploy Log" isTaken={state.deployLogChecked} variant="outline" urgent />
                <ActionBtn id={ActionRequestAction.IDENTIFY_BREAKING_CHANGE} label="Identify Breaking Change" isTaken={state.breakingChangeFound} variant="outline" />
              </>)}
              {scenarioId === "memory_siege" && (<>
                <ActionBtn id={ActionRequestAction.IDENTIFY_MEMORY_LEAK} label="Identify Memory Leak" isTaken={state.memoryLeakIdentified} variant="outline" urgent />
                <ActionBtn id={ActionRequestAction.SCALE_DOWN_PROCESSORS} label="Scale Down Processors" isTaken={state.processorsScaledDown} variant="outline" />
              </>)}
              {scenarioId === "config_catastrophe" && (<>
                <ActionBtn id={ActionRequestAction.CHECK_CONFIGMAP} label="Inspect ConfigMap" isTaken={state.configMapChecked} variant="outline" urgent />
                <ActionBtn id={ActionRequestAction.ISOLATE_EU_REGION} label="Isolate EU Region" isTaken={state.regionIsolated} variant="outline" />
              </>)}
            </div>
          </div>

          {/* Diagnose — all scenarios */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Hypothesis</h3>
            <Button
              variant={state.diagnosisSubmitted ? "secondary" : "outline"}
              className={`w-full justify-start font-mono text-xs ${state.diagnosisSubmitted ? "opacity-50" : "ring-1 ring-primary/40"}`}
              disabled={state.diagnosisSubmitted || state.incidentClosed}
              onClick={() => setDiagnoseOpen(true)}
              data-testid="btn-diagnose"
            >
              {state.diagnosisSubmitted ? (
                <><CheckCircle2 className="w-3 h-3 mr-2" /> Hypothesis Filed ({state.diagnosisScore}/18)</>
              ) : (
                <><FlaskConical className="w-3 h-3 mr-2" /> Submit Hypothesis…</>
              )}
            </Button>
          </div>

          {/* Recovery — modal-driven */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Recovery</h3>
            <Button
              variant={state.recoveryCompleted ? "secondary" : "default"}
              className={`w-full justify-start font-mono text-xs ${state.recoveryCompleted ? "opacity-50" : "ring-1 ring-primary/60"}`}
              disabled={state.recoveryCompleted || state.incidentClosed}
              onClick={() => setRecoverOpen(true)}
              data-testid="btn-recover"
            >
              {state.recoveryCompleted ? (
                <><CheckCircle2 className="w-3 h-3 mr-2" /> Recovery Executed</>
              ) : (
                <><ChevronRight className="w-3 h-3 mr-2" /> Choose Recovery Strategy…</>
              )}
            </Button>
            {/* Legacy maint_bot direct actions */}
            {scenarioId === "maint_bot" && !state.recoveryCompleted && (
              <div className="flex flex-col gap-1 mt-1">
                <ActionBtn id={ActionRequestAction.RESTORE_LATEST_BACKUP} label="⚠ Restore Latest Backup" isTaken={state.latestBackupRestored} variant="destructive" />
                <ActionBtn id={ActionRequestAction.PROMOTE_REPLICA_1} label="⚠ Promote Replica-1" isTaken={state.replica1Promoted} variant="outline" />
              </div>
            )}
          </div>

          {/* Communication — all scenarios */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Communication</h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn id={ActionRequestAction.PUBLISH_STATUS_UPDATE} label="Publish Status" isTaken={state.statusPublished} variant="outline" />
              <ActionBtn id={ActionRequestAction.CLOSE_INCIDENT} label="Close Incident" isTaken={state.incidentClosed} variant="default" />
            </div>
          </div>

        </CardContent>
      </Card>
    </>
  );
}

// ── Score Panel ────────────────────────────────────────────────────────────

function ScorePanel({ score, totalScore }: { score: ScoreBreakdown; totalScore: number }) {
  const ScoreRow = ({ label, value, max }: { label: string; value: number; max: number }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{value} / {max}</span>
      </div>
      <Progress value={(value / max) * 100} className="h-1" />
    </div>
  );

  return (
    <Card className="h-1/3 min-h-[220px] flex flex-col border-border bg-card">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Shield className="w-4 h-4 mr-2" /> PERFORMANCE
        </CardTitle>
        <div className="font-mono text-xl font-bold text-primary">{totalScore}<span className="text-sm text-muted-foreground">/100</span></div>
      </CardHeader>
      <CardContent className="flex-1 p-4 grid grid-cols-2 gap-x-6 gap-y-3 overflow-y-auto">
        <ScoreRow label="Diagnosis" value={score.diagnosis} max={20} />
        <ScoreRow label="AI Delegation" value={score.aiDelegation} max={20} />
        <ScoreRow label="Op Safety" value={score.operationalSafety} max={20} />
        <ScoreRow label="Recovery" value={score.recovery} max={20} />
        <ScoreRow label="Communication" value={score.communication} max={10} />
        <ScoreRow label="Prevention" value={score.prevention} max={10} />
      </CardContent>
    </Card>
  );
}

// ── Debrief Constellation ──────────────────────────────────────────────────

type DebriefNodeDef = {
  id: keyof ScoreBreakdown;
  label: string;
  max: number;
  cx: number;
  cy: number;
};

const DEBRIEF_NODES: DebriefNodeDef[] = [
  { id: "diagnosis", label: "Diagnosis", max: 20, cx: 130, cy: 90 },
  { id: "aiDelegation", label: "AI Delegation", max: 20, cx: 410, cy: 80 },
  { id: "operationalSafety", label: "Op Safety", max: 20, cx: 250, cy: 210 },
  { id: "recovery", label: "Recovery", max: 20, cx: 510, cy: 220 },
  { id: "communication", label: "Communication", max: 10, cx: 150, cy: 330 },
  { id: "prevention", label: "Prevention", max: 10, cx: 420, cy: 340 },
];

const DEBRIEF_EDGES: [number, number][] = [
  [0, 2],
  [1, 2],
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 5],
  [4, 5],
];

const DEBRIEF_TINY_STARS = [
  { cx: 60, cy: 200, r: 1.8 },
  { cx: 580, cy: 60, r: 1.6 },
  { cx: 600, cy: 380, r: 2.0 },
  { cx: 320, cy: 60, r: 1.4 },
  { cx: 60, cy: 400, r: 1.6 },
  { cx: 580, cy: 160, r: 1.4 },
];

type DebriefStatus = "focus" | "core" | "partial" | "weak";

function DebriefConstellation({ score, totalScore }: { score: ScoreBreakdown; totalScore: number }) {
  const enriched = DEBRIEF_NODES.map((n) => {
    const value = score[n.id];
    const pct = value / n.max;
    return { ...n, value, pct };
  });
  const minPct = Math.min(...enriched.map((n) => n.pct));
  const focusIdx = enriched.findIndex((n) => n.pct === minPct);

  function statusOf(idx: number, pct: number): DebriefStatus {
    if (idx === focusIdx) return "focus";
    if (pct >= 0.75) return "core";
    if (pct >= 0.4) return "partial";
    return "weak";
  }

  const strong = enriched.filter((n) => n.pct >= 0.75).length;
  const partial = enriched.filter((n) => n.pct >= 0.4 && n.pct < 0.75).length;
  const weak = enriched.filter((n) => n.pct < 0.4).length;

  return (
    <div
      className="relative overflow-hidden rounded-md border border-border"
      style={{ background: "#0a0c11", minHeight: 380 }}
    >
      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="absolute top-4 left-5 right-5 flex justify-between font-mono text-[11px] text-white/55 z-10">
        <span>after-action constellation</span>
        <span>
          {strong} strong · {partial} partial · {weak} weak
        </span>
      </div>

      <svg
        viewBox="0 0 640 420"
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ height: 380 }}
      >
        <defs>
          <radialGradient id="dbgGlowFocus" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(35 100% 60%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(35 100% 60%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dbgGlowCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(200 85% 65%)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(200 85% 65%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dbgGlowPartial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(200 40% 60%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(200 40% 60%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dbgGlowWeak" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(0 60% 55%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(0 60% 55%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="1"
          strokeDasharray="2 4"
          fill="none"
        >
          {DEBRIEF_EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={enriched[a].cx}
              y1={enriched[a].cy}
              x2={enriched[b].cx}
              y2={enriched[b].cy}
            />
          ))}
        </g>

        <g fill="rgba(255,255,255,0.4)">
          {DEBRIEF_TINY_STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
          ))}
        </g>

        {enriched.map((n, i) => {
          const status = statusOf(i, n.pct);
          if (status === "focus") {
            return (
              <g key={String(n.id)}>
                <circle cx={n.cx} cy={n.cy} r="44" fill="url(#dbgGlowFocus)">
                  <animate
                    attributeName="r"
                    values="38;52;38"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx={n.cx} cy={n.cy} r="6.5" fill="hsl(35 100% 70%)" />
              </g>
            );
          }
          if (status === "core") {
            return (
              <g key={String(n.id)}>
                <circle cx={n.cx} cy={n.cy} r="22" fill="url(#dbgGlowCore)" />
                <circle cx={n.cx} cy={n.cy} r="4.5" fill="hsl(200 85% 78%)" />
              </g>
            );
          }
          if (status === "partial") {
            return (
              <g key={String(n.id)}>
                <circle
                  cx={n.cx}
                  cy={n.cy}
                  r="20"
                  fill="url(#dbgGlowPartial)"
                  opacity="0.7"
                />
                <circle
                  cx={n.cx}
                  cy={n.cy}
                  r="13"
                  fill="none"
                  stroke="hsl(200 40% 75%)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={n.cx}
                  cy={n.cy}
                  r="3"
                  fill="hsl(200 40% 75%)"
                  opacity="0.8"
                />
              </g>
            );
          }
          return (
            <g key={String(n.id)}>
              <circle cx={n.cx} cy={n.cy} r="18" fill="url(#dbgGlowWeak)" />
              <circle cx={n.cx} cy={n.cy} r="3.5" fill="hsl(0 60% 70%)" />
            </g>
          );
        })}

        <g fontFamily="'Space Mono', monospace">
          {enriched.map((n, i) => {
            const status = statusOf(i, n.pct);
            const offsetY = status === "focus" ? 70 : 38;
            const nameColor =
              status === "focus"
                ? "hsl(35 100% 72%)"
                : status === "core"
                ? "rgba(255,255,255,0.92)"
                : status === "weak"
                ? "hsl(0 60% 80%)"
                : "rgba(255,255,255,0.7)";
            return (
              <g key={String(n.id)} textAnchor="middle">
                <text x={n.cx} y={n.cy + offsetY} fontSize="11" fill={nameColor}>
                  {n.label}
                </text>
                <text
                  x={n.cx}
                  y={n.cy + offsetY + 14}
                  fontSize="10"
                  fill="rgba(255,255,255,0.55)"
                >
                  {n.value}/{n.max}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between z-10 gap-4">
        <div className="min-w-0">
          <div className="text-white/55 font-mono text-[11px]">
            your performance
          </div>
          <div
            className="font-mono text-3xl font-bold tracking-tight mt-0.5"
            style={{ color: "hsl(35 100% 72%)" }}
          >
            {totalScore}
            <span className="text-white/55 text-base font-normal">/100</span>
          </div>
        </div>
        {enriched[focusIdx] && (
          <div className="text-right shrink-0">
            <div className="text-white/55 font-mono text-[11px]">
              weakest node
            </div>
            <div
              className="font-mono text-[13px] mt-0.5"
              style={{ color: "hsl(35 100% 72%)" }}
            >
              {enriched[focusIdx].label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Debrief Modal ──────────────────────────────────────────────────────────

function DebriefModal({ isOpen, debrief, score, breakdown, onClose }: {
  isOpen: boolean; debrief: string | null; score: number; breakdown: ScoreBreakdown; onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto bg-card border-border sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl text-primary border-b border-border pb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" /> INCIDENT RESOLVED
          </DialogTitle>
          <DialogDescription className="sr-only">Incident Debrief</DialogDescription>
        </DialogHeader>
        <div className="py-4 font-mono space-y-6">
          <DebriefConstellation score={breakdown} totalScore={score} />
          <div>
            <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">After Action Report</h3>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-md border border-border">
              {debrief}
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={onClose} className="font-mono text-xs">CLOSE DEBRIEF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const queryClient = useQueryClient();
  const [sessionKey, setSessionKey] = useState(0);
  const [debriefDismissed, setDebriefDismissed] = useState(false);
  const { companyName, companySlug, cosUrl, brand } = useBranding();

  const { data: state, isLoading } = useGetSimulatorState({
    query: { refetchInterval: 3000, queryKey: getGetSimulatorStateQueryKey() }
  });

  const resetSimulator = useResetSimulator();
  const handleReset = () => {
    resetSimulator.mutate(undefined, {
      onSuccess: () => {
        setSessionKey((k) => k + 1);
        setDebriefDismissed(false);
        queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
      }
    });
  };

  if (isLoading || !state) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-primary font-mono">INITIALIZING SYSTEM...</div>;
  }

  const scenarioMeta = SCENARIO_META[state.scenarioId];

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Scenario Picker — shown when scenarioSelected is false */}
      <ScenarioPickerModal
        isOpen={!state.scenarioSelected}
        onSelect={() => {
          setSessionKey(k => k + 1);
          queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
        }}
      />

      {/* Top Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="font-bold tracking-tight text-lg">{companyName} Incident Response Simulator</h1>
          <Badge variant="outline" className="font-mono text-sm border-primary text-primary bg-primary/10">
            {state.time}
          </Badge>
          {scenarioMeta && (
            <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground hidden lg:flex">
              {scenarioMeta.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          {state.incidentClosed ? (
            <Badge variant="default" className="bg-green-600 text-white font-bold px-3 py-1">RESOLVED</Badge>
          ) : (
            <Badge variant="destructive" className="animate-pulse font-bold px-3 py-1">INCIDENT ACTIVE</Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => { window.location.href = "/"; }}
            className="font-mono text-xs border-border text-muted-foreground hover:text-foreground">
            <Settings className="w-3 h-3 mr-2" /> Configure
          </Button>
          <Button variant="outline" size="sm" onClick={() => { window.location.href = cosUrl; }}
            className="font-mono text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
            <TrendingUp className="w-3 h-3 mr-2" /> Chief of Staff Role
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="btn-reset" className="font-mono text-xs">
            <RotateCcw className="w-3 h-3 mr-2" /> RESET
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <IncidentFeed feed={state.feed} brand={brand} />
          <TerminalConsole key={sessionKey} companySlug={companySlug} />
        </div>
        <div className="col-span-4 flex flex-col min-h-0">
          <AIAgentPanel key={sessionKey} />
        </div>
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <ActionPanel state={state} />
          <ScorePanel score={state.score} totalScore={state.totalScore} />
        </div>
      </div>

      <DebriefModal
        isOpen={state.incidentClosed && state.debrief !== null && !debriefDismissed}
        debrief={state.debrief}
        score={state.totalScore}
        breakdown={state.score}
        onClose={() => setDebriefDismissed(true)}
      />
    </div>
  );
}
