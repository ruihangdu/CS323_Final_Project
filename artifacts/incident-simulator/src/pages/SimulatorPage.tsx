import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Terminal, CheckCircle2, RotateCcw, Send, Activity,
  ShieldAlert, Zap, Clock, Shield, TrendingUp, Settings,
  FlaskConical, Siren,
} from "lucide-react";
import {
  useGetSimulatorState,
  useRunCommand,
  useTakeAction,
  useQueryAgent,
  useResetSimulator,
  useSelectScenario,
  useSubmitDiagnosis,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

// ── Timer helper ───────────────────────────────────────────────────────────

function addSecondsToTime(base: string, secs: number): string {
  const [h, m] = base.split(":").map(Number);
  const total = h * 3600 + m * 60 + secs;
  const hh = Math.floor(total / 3600) % 24;
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
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
    subtitle: "EU payments down — a Terraform heredoc left malformed whitespace in a ConfigMap value",
    difficulty: "MEDIUM",
    synopsis: "09:15 UTC — EU customers can't complete checkout. NA is unaffected. No application code was deployed. The answer is in your infrastructure config — but it's subtler than it looks.",
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
      { id: "terraform_heredoc_malformed_url", label: "Terraform heredoc block scalar in payment.tfvars left leading whitespace in PAYMENT_GATEWAY_URL — go-http rejects as invalid URI" },
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

function TerminalContent({ companySlug }: { companySlug: string }) {
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
    <div className="h-full flex flex-col bg-black p-3 font-mono text-xs overflow-hidden">
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
    </div>
  );
}

// ── AI Agent Panel ─────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "agent"; content: string; tools?: string[] };

type SeedQA = { answer: string };

const SEED_QA: SeedQA[] = [
  /* 0 — servers hosted (generic) */
  { answer: "That depends on your infrastructure setup, so I'll give you the general framework and you can share more context for specifics.\n\nMost production-grade deployments today run on a major cloud provider — AWS, GCP, or Azure — with workloads orchestrated by Kubernetes (EKS, GKE, or AKS respectively). Infrastructure is typically defined as code using Terraform or Pulumi, which means your clusters, networking rules, load balancers, and application ConfigMaps are all version-controlled and applied through a CI/CD pipeline.\n\nFor payment-critical services specifically, it's standard to have separate regional deployments — for example, a US cluster in `us-east-1` and an EU cluster in `eu-west-1` — to meet data residency requirements and reduce cross-region latency. Service-level configuration like gateway URLs, API keys, and timeouts usually lives in Kubernetes ConfigMaps or Secrets, mounted as environment variables into pods.\n\nOne thing worth noting: changes to ConfigMaps through Terraform won't appear in application deploy logs. If you're investigating an incident where no code was deployed, infrastructure config is often the silent culprit. Paste a link to your infra repo, Terraform state, or a monitoring dashboard and I can give you a much more specific answer." },
  /* 1 — EU payment server (specific, needs URL) */
  { answer: "Based on the ConfigMap you've linked — `payment-eu` in the `production` namespace — here's the full picture of your EU payment path.\n\nEU card charges flow through `payment-service-eu` pods running in `eu-west-1`. Those pods read `PAYMENT_GATEWAY_URL` from the `payment-eu` ConfigMap at startup and use it for every outbound charge request to Stripe. The correct value for this field should be `https://eu-gateway.stripe-taskforge.io/v1` — that's the EU-specific Stripe endpoint that accepts your EU merchant account (`acct_eu_prod_1f4a9c`). If that value is wrong *or malformed* (e.g. leading whitespace, embedded newlines), the HTTP client will reject it before a network connection is even opened. You'd see transport-layer errors, not a Stripe-side response.\n\nThe ConfigMap metadata shows a last-applied timestamp of `09:14:02Z` — roughly one minute before your incident began. That's a strong signal. I'd run `kubectl get configmap payment-eu -o yaml` immediately and look very carefully at the `PAYMENT_GATEWAY_URL` value. Check for any whitespace, newlines, or indentation that shouldn't be there. Then cross-reference with `terraform show -json` to confirm what Terraform believes the value should be.\n\nThe pods are currently `1/1 Ready`, so the config error won't surface in pod status — you have to read the ConfigMap directly and check the application logs for the exact failure mode." },
  /* 2 — recent changes deployed (generic) */
  { answer: "Good instinct — recent changes are almost always where an incident starts. There are several places to look, and I'd recommend checking all of them before drawing conclusions, because the actual cause is often somewhere unexpected.\n\nFirst, **application deploy logs**: `kubectl rollout history deployment/<name>` or your CI/CD platform's deploy history. Filter to the last 1–2 hours. Second, **infrastructure-as-code history**: if you use Terraform, `git log -- terraform/` scoped to your region's config files will surface any recent `terraform apply` runs. This is the most commonly overlooked source — a Terraform apply that updated a ConfigMap won't show up in application deploy history at all. Third, **Kubernetes events**: `kubectl get events --sort-by=.metadata.creationTimestamp` will show ConfigMap updates, pod restarts, and scaling events with timestamps. Fourth, **metric step changes**: look in your monitoring stack for any sharp change in error rate, latency, or memory that correlates with a specific minute.\n\nThe key question to answer first: did a code deploy happen, or did something else change? If no application version changed but something broke, your IaC history is the first place to look. Share your git log output or a link to your recent Terraform runs and I can dig in." },
  /* 3 — inspect infra commit (generic) */
  { answer: "There are a few layers to this depending on what type of change you're inspecting.\n\nFor **application code commits**, `git show <hash>` gives you the full diff — files changed, lines added and removed, and the commit message. If the commit touched a migration file, you'll see the SQL or ORM change directly. `git show <hash> --stat` is a quicker summary if you just want to see which files were touched.\n\nFor **Terraform/infrastructure commits**, `git show <hash>` works the same way, but you'll also want to run `terraform show -json` on the current state to see what Terraform currently believes is deployed. If the commit introduced a variable change that was already applied, you can compare by running `terraform plan` — it'll flag any drift between state and config.\n\nA few patterns to watch for: look for `.tfvars` changes (variable overrides), `heredoc` blocks (multiline strings — these often introduce invisible whitespace), and changes to `variables.tf` default values. Terraform heredoc blocks are valid HCL, but if the content has leading indentation and the block doesn't use `trimspace()`, the resulting string value will include that whitespace verbatim — which breaks things like URLs or connection strings that HTTP clients validate strictly.\n\nIf you paste a commit hash or a link to the diff, I can read it more specifically." },
  /* 4 — f2a9d1c commit contents (specific, needs URL or hash) */
  { answer: "Looking at commit `f2a9d1c` — this is the one that caused your incident, but it contains two distinct changes you'll need to reason about separately.\n\n**The breaking change** (in `terraform/eu-west-1/payment.tfvars`): `eu_payment_gateway_url` was changed from a plain quoted string to a heredoc block scalar (`<<-EOT ... EOT`). Heredoc blocks in Terraform are valid, but this one uses `<<-EOT` without wrapping the value in `trimspace()`. The `<<-` form strips leading indentation from each line, but it does **not** remove the leading and trailing newlines from the block. The resulting string stored in Kubernetes is `\"\\n  https://eu-gateway.stripe-taskforge.io/v1\\n\"` — not a valid URI. Go's `net/http` transport layer validates the scheme before opening a socket, and it rejects any URL containing whitespace or newlines with `invalid URI` at the transport layer. The Stripe endpoint is never reached.\n\n**The collateral change** (in `README.md`): The same commit added a 52-line EU payment service runbook — architecture overview, failure modes, and recovery steps. This is valuable documentation that didn't exist before this commit.\n\nThis matters for recovery: if you `git revert f2a9d1c`, you fix the Terraform variable, but you also delete all 52 lines of README documentation. The cleanest fix is to use `terraform apply -var 'eu_payment_gateway_url=https://eu-gateway.stripe-taskforge.io/v1'` directly — that corrects the value at source without touching the README, and Terraform state stays in sync with the cluster." },
  /* 5 — Terraform variable fix options (generic) */
  { answer: "There are three standard recovery paths for a bad Terraform variable, each with different trade-offs. The right choice depends on whether other changes in the same commit are worth preserving.\n\n**Option 1 — Direct kubectl patch (fastest, causes state drift)**: Run `kubectl patch configmap <name> -p '{\"data\":{\"KEY\":\"value\"}}'` to overwrite the value in the cluster immediately. EU traffic recovers in under 30 seconds. The downside: Terraform's state file still records the wrong value, so the next `terraform apply` will re-introduce the bug. You must also manually update the `.tfvars` file to prevent regression. Use this if customer impact is ongoing and you need the fastest possible fix.\n\n**Option 2 — Git revert (clean IaC, but loses all changes in that commit)**: Run `git revert <hash>` to create a new commit that undoes everything in the original commit, then `terraform apply` to sync. This keeps your IaC state consistent with git history. The risk: if the original commit included other valuable changes (documentation, unrelated fixes), those are also reverted. Always check `git show <hash>` to see exactly what the revert would remove.\n\n**Option 3 — Fix-forward with terraform apply -var (optimal)**: Keep the commit, but override the variable with the correct value: `terraform apply -var 'eu_payment_gateway_url=https://eu-gateway.stripe-taskforge.io/v1'`. This fixes the root cause at the infrastructure layer, preserves all other changes in the original commit, and maintains consistency between Terraform state and the cluster. Then update the `.tfvars` file to add `trimspace()` around the heredoc so the bug doesn't recur.\n\nFor a production incident with customer impact, Option 1 is fastest recovery. For long-term correctness with no collateral damage, Option 3 is the right fix." },
  /* 6 — revert f2a9d1c impact (specific, needs URL or hash) */
  { answer: "I can see the `README.md` blob you've linked — and yes, reverting `f2a9d1c` will remove those changes entirely.\n\nThe commit in question added 52 lines to the README: an EU payment service architecture section, a runbook covering URI errors, TLS failures, and Stripe-side issues, and a step-by-step recovery procedure for ConfigMap problems. That documentation didn't exist before this commit. A `git revert f2a9d1c` will create a new commit that removes all of it.\n\nThis is a classic reason to prefer fix-forward over revert when a commit mixes functional changes with documentation. The Terraform bug is real and needs to be fixed — but so is the documentation, and the two changes are independent. Reverting conflates them.\n\nThe cleanest path here is: run `terraform apply -var 'eu_payment_gateway_url=https://eu-gateway.stripe-taskforge.io/v1'` to correct the value without touching the README. Then open a follow-up PR that wraps the heredoc in `trimspace()` so it's correct in source. That preserves the runbook, fixes the root cause, and prevents recurrence — all as separate, reviewable steps." },
  /* 7 — prevent heredoc bugs (generic) */
  { answer: "Heredoc formatting bugs are a well-known Terraform footgun, and a few practices reliably prevent them.\n\n**Use `trimspace()` around every heredoc**. Terraform's `<<-EOT` syntax strips leading indentation but preserves surrounding newlines. Wrapping in `trimspace()` removes them: `value = trimspace(<<-EOT\\n  https://example.com\\nEOT)`. This should be a project-wide convention enforced in code review.\n\n**Add `terraform validate` and `tflint` to your CI pipeline**. `terraform validate` catches syntax errors and obvious type mismatches before apply. `tflint` has rules for detecting heredoc usage patterns that introduce whitespace. Neither will catch a semantic bug in a URL value — but they reduce the class of errors that get through.\n\n**Add variable validation blocks in `variables.tf`**:\n```hcl\nvariable \"eu_payment_gateway_url\" {\n  type = string\n  validation {\n    condition     = can(regex(\"^https://\", var.eu_payment_gateway_url))\n    error_message = \"eu_payment_gateway_url must be a valid HTTPS URL.\"\n  }\n}\n```\nA regex check won't catch all malformed URLs, but it would catch a value starting with `\\n  https://` immediately on plan.\n\n**Review `.tfvars` changes in code review with whitespace-visible diffs**. Whitespace-only diffs are invisible without the right diff flags. Require explicit approval of any `tfvars` change touching URL-like values, and configure your diff tool to show whitespace changes.\n\nFor this specific incident class, the `trimspace()` fix is the most impactful single change." },
];

/** Match user input to a pre-written seed answer. Returns null for no match → falls through to real API. */
function findSeedResponse(input: string): string | null {
  const q = input.toLowerCase();
  const hasUrl = /https?:\/\//.test(input);

  // Most specific matches first (require both keywords + URL where applicable)
  if (q.includes("prevent") && (q.includes("heredoc") || q.includes("format") || q.includes("terraform")))
    return SEED_QA[7].answer;
  if (q.includes("revert") && (q.includes("f2a9d1c") || (hasUrl && q.includes("readme"))))
    return SEED_QA[6].answer;
  if ((q.includes("option") || q.includes("fix") || q.includes("recover")) && q.includes("terraform") && !hasUrl)
    return SEED_QA[5].answer;
  if (q.includes("f2a9d1c") || (q.includes("commit") && hasUrl && q.includes("contain")))
    return SEED_QA[4].answer;
  if ((q.includes("inspect") || q.includes("look at") || q.includes("what") && q.includes("commit") && q.includes("change")))
    return SEED_QA[3].answer;
  if (q.includes("recent") || (q.includes("change") && q.includes("deploy")))
    return SEED_QA[2].answer;
  if ((q.includes("eu") || q.includes("payment") || q.includes("traffic")) && hasUrl)
    return SEED_QA[1].answer;
  if (q.includes("host") || (q.includes("server") && !hasUrl))
    return SEED_QA[0].answer;
  return null;
}

function AIContent() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const queryAgent = useQueryAgent();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || queryAgent.isPending) return;
    const userMsg = input.trim();
    setInput("");

    const seedAnswer = findSeedResponse(userMsg);
    if (seedAnswer) {
      setHistory(prev => [
        ...prev,
        { role: "user", content: userMsg },
        { role: "agent", content: seedAnswer },
      ]);
      return;
    }

    setHistory(prev => [...prev, { role: "user", content: userMsg }]);
    queryAgent.mutate({ data: { agent: AgentRequestAgent.DevOps_Agent, message: userMsg } }, {
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {history.length === 0 && (
          <div className="text-center text-muted-foreground text-sm font-mono py-8 space-y-1">
            <div>Ask the DevOps agent anything.</div>
            <div className="text-xs opacity-60">Try: "How are our servers hosted?" or paste a link for a specific answer.</div>
          </div>
        )}
        {history.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary/20 text-primary-foreground border border-primary/30" : "bg-secondary text-secondary-foreground"}`}>
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
            placeholder="Ask the DevOps agent..."
            className="bg-card font-mono text-sm" disabled={queryAgent.isPending}
            data-testid="input-agent-chat" />
          <Button type="submit" size="icon" disabled={queryAgent.isPending || !input.trim()} data-testid="btn-agent-send">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Combined Terminal + AI Panel ───────────────────────────────────────────

function CombinedPanel({ companySlug, sessionKey }: { companySlug: string; sessionKey: number }) {
  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card overflow-hidden">
      <Tabs defaultValue="terminal" className="flex flex-col h-full min-h-0">
        <div className="py-2 px-4 border-b border-border shrink-0 bg-card">
          <TabsList className="w-full bg-background grid grid-cols-2 h-auto p-1">
            <TabsTrigger value="terminal" className="text-xs font-mono py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-sm">
              <Terminal className="w-3 h-3 mr-1.5" /> Terminal <span className="ml-1.5 text-[10px] opacity-60">↑↓ history</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs font-mono py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-sm">
              <Zap className="w-3 h-3 mr-1.5" /> AI Assistance
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="terminal" className="flex-1 m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
          <TerminalContent key={sessionKey} companySlug={companySlug} />
        </TabsContent>
        <TabsContent value="ai" className="flex-1 m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
          <AIContent key={sessionKey} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

// ── Action Panel ───────────────────────────────────────────────────────────

function ActionPanel({ state }: { state: SimulatorState }) {
  const takeAction = useTakeAction();
  const queryClient = useQueryClient();
  const [diagnoseOpen, setDiagnoseOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });

  const handleAction = (action: ActionRequestAction) => {
    takeAction.mutate({ data: { action } }, { onSuccess: invalidate });
  };

  const ActionBtn = ({
    id, label, isTaken, variant = "default", disabled = false, urgent = false, tooltip,
  }: {
    id: ActionRequestAction; label: string; isTaken: boolean;
    variant?: VariantProps<typeof buttonVariants>["variant"]; disabled?: boolean; urgent?: boolean;
    tooltip?: string;
  }) => (
    <Button
      title={tooltip}
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
              <ActionBtn id={ActionRequestAction.DECLARE_SEV1} label="Declare SEV1" isTaken={state.sevDeclared} variant="destructive" urgent
                tooltip="Activates incident response protocol — assembles on-call team, opens war room, starts incident clock" />
              <ActionBtn id={ActionRequestAction.FREEZE_DEPLOYS} label="Freeze Deploys" isTaken={state.deploysFrozen} variant="outline"
                tooltip="Pauses all CI/CD pipelines to prevent new code from reaching production while you investigate" />
              <ActionBtn id={ActionRequestAction.STOP_WORKERS} label="Stop Workers" isTaken={state.workersStopped} variant="outline"
                tooltip="Terminates background worker pods to halt job processing and reduce cascading failures" />
              <ActionBtn id={ActionRequestAction.MAINTENANCE_MODE} label="Maintenance Mode" isTaken={state.maintenanceMode} variant="outline"
                tooltip="Shows users a maintenance page while you work — limits confusion and inbound support load" />
            </div>
          </div>

          {/* Investigation — scenario-specific */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Investigation</h3>
            <div className="grid grid-cols-2 gap-2">
              {scenarioId === "maint_bot" && (<>
                <ActionBtn id={ActionRequestAction.SNAPSHOT_DB} label="Snapshot Damaged DB" isTaken={state.damagedDbSnapshotted} variant="outline"
                  tooltip="Creates a forensic snapshot of the current damaged DB state before any recovery attempt — preserves evidence" />
                <ActionBtn id={ActionRequestAction.DISABLE_MAINT_BOT} label="Disable Maint Bot" isTaken={state.maintBotDisabled} variant="outline"
                  tooltip="Revokes maint_bot credentials to stop further destructive automation from running" />
                <ActionBtn id={ActionRequestAction.INSPECT_REPLICA_2} label="Inspect Replica-2" isTaken={state.replica2Inspected} variant="outline"
                  tooltip="Checks the 60-minute delayed replica for data integrity — confirms whether it's safe to use as a recovery source" />
              </>)}
              {scenarioId === "bad_deploy" && (<>
                <ActionBtn id={ActionRequestAction.CHECK_DEPLOY_LOG} label="Review Deploy Log" isTaken={state.deployLogChecked} variant="outline" urgent
                  tooltip="Reviews recent deployment history for failed migrations or unexpected changes deployed alongside the broken version" />
                <ActionBtn id={ActionRequestAction.IDENTIFY_BREAKING_CHANGE} label="Identify Breaking Change" isTaken={state.breakingChangeFound} variant="outline"
                  tooltip="Analyzes the diff between v2.47.1 and v2.48.0 to pinpoint the schema-breaking change that caused the 500s" />
              </>)}
              {scenarioId === "memory_siege" && (<>
                <ActionBtn id={ActionRequestAction.IDENTIFY_MEMORY_LEAK} label="Identify Memory Leak" isTaken={state.memoryLeakIdentified} variant="outline" urgent
                  tooltip="Traces recent code changes to identify which PR introduced the unbounded in-memory cache causing OOMKills" />
                <ActionBtn id={ActionRequestAction.SCALE_DOWN_PROCESSORS} label="Scale Down Processors" isTaken={state.processorsScaledDown} variant="outline"
                  tooltip="Reduces task-processor replicas from 4 to 1 to limit OOMKill blast radius while you diagnose" />
              </>)}
              {scenarioId === "config_catastrophe" && (<>
                <ActionBtn id={ActionRequestAction.CHECK_CONFIGMAP} label="Inspect ConfigMap" isTaken={state.configMapChecked} variant="outline" urgent
                  tooltip="Reads the payment-eu ConfigMap to verify PAYMENT_GATEWAY_URL — check carefully for whitespace or newlines in the value" />
                <ActionBtn id={ActionRequestAction.ISOLATE_EU_REGION} label="Isolate EU Region" isTaken={state.regionIsolated} variant="outline"
                  tooltip="Routes EU payment traffic to a holding page — prevents misleading errors while you fix the config root cause" />
              </>)}
            </div>
          </div>

          {/* Postmortem — all scenarios */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Postmortem</h3>
            <Button
              variant={state.diagnosisSubmitted ? "secondary" : "outline"}
              className={`w-full justify-start font-mono text-xs ${state.diagnosisSubmitted ? "opacity-50" : "ring-1 ring-primary/40"}`}
              disabled={state.diagnosisSubmitted || state.incidentClosed}
              onClick={() => setDiagnoseOpen(true)}
              data-testid="btn-diagnose"
              title="Document your root cause hypothesis — identify the failure category, specific trigger, and blast radius"
            >
              {state.diagnosisSubmitted ? (
                <><CheckCircle2 className="w-3 h-3 mr-2" /> Hypothesis Filed ({state.diagnosisScore}/18)</>
              ) : (
                <><FlaskConical className="w-3 h-3 mr-2" /> Submit Hypothesis…</>
              )}
            </Button>
          </div>

          {/* Communication — all scenarios */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Communication</h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn id={ActionRequestAction.PUBLISH_STATUS_UPDATE} label="Publish Status" isTaken={state.statusPublished} variant="outline"
                tooltip="Publishes a customer-facing status update — post after root cause is known for the highest communication score" />
              <ActionBtn id={ActionRequestAction.CLOSE_INCIDENT} label="Close Incident" isTaken={state.incidentClosed} variant="default"
                tooltip="Marks the incident as resolved and generates an after-action report. Ensure recovery is complete before closing." />
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
        <ScoreRow label="Speed" value={score.recovery} max={20} />
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { companyName, companySlug, cosUrl, brand } = useBranding();

  const { data: state, isLoading } = useGetSimulatorState({
    query: { refetchInterval: 3000, queryKey: getGetSimulatorStateQueryKey() }
  });

  useEffect(() => {
    if (!state?.scenarioSelected) return;
    setElapsedSeconds(0);
    const id = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [state?.scenarioSelected, state?.scenarioId, sessionKey]);

  const resetSimulator = useResetSimulator();
  const handleReset = () => {
    resetSimulator.mutate(undefined, {
      onSuccess: () => {
        setSessionKey((k) => k + 1);
        setElapsedSeconds(0);
        setDebriefDismissed(false);
        queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
      }
    });
  };

  if (isLoading || !state) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-primary font-mono">INITIALIZING SYSTEM...</div>;
  }

  const scenarioMeta = SCENARIO_META[state.scenarioId];
  const displayTime = state.scenarioSelected
    ? addSecondsToTime(state.time, elapsedSeconds)
    : state.time;

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Scenario Picker — shown when scenarioSelected is false */}
      <ScenarioPickerModal
        isOpen={!state.scenarioSelected}
        onSelect={() => {
          setSessionKey(k => k + 1);
          setElapsedSeconds(0);
          queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
        }}
      />

      {/* Top Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="font-bold tracking-tight text-lg">{companyName} Incident Response Simulator</h1>
          <Badge variant="outline" className="font-mono text-sm border-primary text-primary bg-primary/10">
            {displayTime}
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
        <div className="col-span-4 flex flex-col min-h-0">
          <IncidentFeed feed={state.feed} brand={brand} />
        </div>
        <div className="col-span-4 flex flex-col min-h-0">
          <CombinedPanel companySlug={companySlug} sessionKey={sessionKey} />
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
