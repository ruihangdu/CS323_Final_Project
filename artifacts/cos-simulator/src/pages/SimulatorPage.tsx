import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Search,
  Brain,
  BarChart2,
  CheckCircle2,
  RotateCcw,
  Send,
  Clock,
  TrendingUp,
  Users,
  Heart,
  Activity,
  Settings,
} from "lucide-react";

import {
  useGetCosSimulatorState,
  useRunCosCommand,
  useTakeCosAction,
  useQueryCosAgent,
  useResetCosSimulator,
  useDraftCosStatement,
  useNegotiateCosDeal,
  getGetCosSimulatorStateQueryKey,
  CosActionRequestAction,
  CosAgentRequestAgent,
  DraftStatementBodyTone,
  DraftStatementBodyMessagesItem,
  DraftStatementBodyChannelsItem,
  DraftStatementBodyTiming,
  NegotiateDealBodyStance,
  type CosSimulatorState,
  type CosScoreBreakdown,
  type FeedEvent,
} from "@workspace/api-client-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const FONT_URLS: Record<string, string> = {
  dev: "https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap",
  editorial: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap",
};

function useBranding() {
  const params = new URLSearchParams(window.location.search);
  const companyName = params.get("company") || "Creator HQ";
  const accentColor = params.get("color");
  const accentFg = params.get("fg");
  const brand = params.get("brand") || "editorial";

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
  const devopsParams = new URLSearchParams(window.location.search).toString();
  const devopsUrl = `/sim${devopsParams ? `?${devopsParams}` : ""}`;

  return { companyName, companySlug, devopsUrl, brand };
}

export default function SimulatorPage() {
  const queryClient = useQueryClient();
  const [sessionKey, setSessionKey] = useState(0);
  const [debriefDismissed, setDebriefDismissed] = useState(false);
  const { companyName, companySlug, devopsUrl, brand } = useBranding();
  const { data: state, isLoading } = useGetCosSimulatorState({
    query: {
      refetchInterval: 3000,
      queryKey: getGetCosSimulatorStateQueryKey(),
    },
  });

  const resetSimulator = useResetCosSimulator();

  const handleReset = () => {
    resetSimulator.mutate(undefined, {
      onSuccess: () => {
        setSessionKey((k) => k + 1);
        setDebriefDismissed(false);
        queryClient.invalidateQueries({
          queryKey: getGetCosSimulatorStateQueryKey(),
        });
      },
    });
  };

  if (isLoading || !state) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-primary font-sans">
        INITIALIZING CREATOR HQ...
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="font-bold tracking-tight text-lg">
            {companyName} — Crisis Simulator
          </h1>
          <Badge
            variant="outline"
            className="font-mono text-sm border-primary text-primary bg-primary/10"
          >
            {state.time}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground">
            The Viral Spiral
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {state.incidentClosed ? (
            <Badge
              variant="default"
              className="bg-green-600 text-white font-bold px-3 py-1"
            >
              RESOLVED
            </Badge>
          ) : (
            <Badge
              variant="destructive"
              className="animate-pulse font-bold px-3 py-1"
            >
              CRISIS ACTIVE
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.location.href = "/"; }}
            className="font-mono text-xs border-border text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-3 h-3 mr-2" /> Configure
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.location.href = devopsUrl; }}
            className="font-mono text-xs border-primary/50 text-primary hover:bg-primary/10"
          >
            <Activity className="w-3 h-3 mr-2" /> SWE On-Call Role
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            data-testid="btn-reset"
            className="font-mono text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-2" /> RESET
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        {/* Left Column: Feed & Research */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <SituationFeed feed={state.feed} brand={brand} />
          <ResearchConsole key={sessionKey} companySlug={companySlug} />
        </div>

        {/* Center Column: AI Advisors */}
        <div className="col-span-4 flex flex-col min-h-0">
          <AIAdvisorPanel key={sessionKey} />
        </div>

        {/* Right Column: Actions & Score */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <ActionPanel state={state} />
          <ScorePanel score={state.score} totalScore={state.totalScore} />
        </div>
      </div>

      <DebriefModal
        isOpen={
          state.incidentClosed &&
          state.debrief !== null &&
          !debriefDismissed
        }
        debrief={state.debrief}
        score={state.totalScore}
        onClose={() => setDebriefDismissed(true)}
      />
    </div>
  );
}

const FEED_TYPE_CFG: Record<string, { border: string; avatar: string; avatarText: string }> = {
  critical: { border: "#dc2626", avatar: "#fee2e2", avatarText: "#991b1b" },
  bad:      { border: "#ea580c", avatar: "#ffedd5", avatarText: "#9a3412" },
  warning:  { border: "#d97706", avatar: "#fef3c7", avatarText: "#92400e" },
  good:     { border: "#16a34a", avatar: "#dcfce7", avatarText: "#14532d" },
  info:     { border: "#94a3b8", avatar: "#f8fafc", avatarText: "#475569" },
};

function SituationFeed({ feed, brand }: { feed: FeedEvent[]; brand: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feed]);

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-3 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm flex items-center text-primary">
          <Clock className="w-4 h-4 mr-2" /> {brand === "editorial" ? "Messages" : "SITUATION FEED"}
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
                <div key={event.id}
                  className="flex gap-3 p-3 rounded-lg bg-white animate-in slide-in-from-bottom-2 fade-in"
                  style={{ borderLeft: `3px solid ${cfg.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
                    style={{ background: cfg.avatar, color: cfg.avatarText }}>
                    {initials}
                  </div>
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

type ResearchEntry = { query: string; result: string };

function ResearchConsole({ companySlug: _companySlug }: { companySlug: string }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ResearchEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runCommand = useRunCosCommand();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, runCommand.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || runCommand.isPending) return;
    setInput("");
    runCommand.mutate(
      { data: { command: query } },
      {
        onSuccess: (data) => {
          setHistory((prev) => [
            ...prev,
            { query, result: data.output },
          ]);
          queryClient.invalidateQueries({
            queryKey: getGetCosSimulatorStateQueryKey(),
          });
        },
      }
    );
  };

  return (
    <Card className="h-1/3 flex flex-col min-h-[250px] border-border bg-card">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm flex items-center text-primary">
          <Search className="w-4 h-4 mr-2" /> RESEARCH
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 flex flex-col text-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-2 space-y-3" ref={scrollRef}>
          {history.length === 0 && (
            <div className="text-muted-foreground text-sm py-2">
              Search clip archives, media metrics, contracts, and more.
            </div>
          )}
          {history.map((entry, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 shrink-0 mt-0.5">Query</span>
                <span className="text-sm text-foreground">{entry.query}</span>
              </div>
              {entry.result && (
                <div className="flex items-start gap-2 pl-1 border-l-2 border-primary/20 ml-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">Result</span>
                  <span className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{entry.result}</span>
                </div>
              )}
            </div>
          ))}
          {runCommand.isPending && (
            <div className="text-muted-foreground text-sm animate-pulse">
              Searching…
            </div>
          )}
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 shrink-0 border-t border-border pt-2"
        >
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
            placeholder="Search archives, media metrics, contracts…"
            autoComplete="off"
            spellCheck="false"
            data-testid="input-terminal"
            disabled={runCommand.isPending}
          />
        </form>
      </CardContent>
    </Card>
  );
}

function AIAdvisorPanel() {
  const [activeTab, setActiveTab] = useState<string>("PR Strategist");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<
    Array<{ role: string; content: string; tools?: string[] }>
  >([]);
  const queryAgent = useQueryCosAgent();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || queryAgent.isPending) return;

    const userMsg = input;
    setHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");

    queryAgent.mutate(
      {
        data: {
          agent: activeTab as CosAgentRequestAgent,
          message: userMsg,
        },
      },
      {
        onSuccess: (data) => {
          setHistory((prev) => [
            ...prev,
            {
              role: "agent",
              content: data.response,
              tools: data.toolsUsed,
            },
          ]);
          queryClient.invalidateQueries({
            queryKey: getGetCosSimulatorStateQueryKey(),
          });
        },
      }
    );
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, queryAgent.isPending]);

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm flex items-center text-primary">
          <Brain className="w-4 h-4 mr-2" /> AI ADVISORS
        </CardTitle>
      </CardHeader>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-4 pt-2 shrink-0">
          <TabsList className="w-full bg-background grid grid-cols-2 lg:grid-cols-4 h-auto p-1">
            {Object.values(CosAgentRequestAgent).map((agent) => (
              <TabsTrigger
                key={agent}
                value={agent}
                className="text-[10px] sm:text-xs py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-sm"
                data-testid={`tab-agent-${agent.replace(/\s+/g, "-")}`}
              >
                {agent.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          ref={scrollRef}
        >
          {history.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Select an advisor and ask for crisis guidance.
            </div>
          )}
          {history.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary/20 text-primary-foreground border border-primary/30" : "bg-secondary text-secondary-foreground"}`}
              >
                {msg.content}
              </div>
              {msg.role === "agent" &&
                msg.tools &&
                msg.tools.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {msg.tools.map((t, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[9px] font-mono border-muted-foreground/30 text-muted-foreground"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
            </div>
          ))}
          {queryAgent.isPending && (
            <div className="flex items-start">
              <div className="bg-secondary rounded-md px-3 py-2 text-sm text-muted-foreground animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border shrink-0 bg-background/50">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${activeTab}...`}
              className="bg-card text-sm"
              disabled={queryAgent.isPending}
              data-testid="input-agent-chat"
            />
            <Button
              type="submit"
              size="icon"
              disabled={queryAgent.isPending || !input.trim()}
              data-testid="btn-agent-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Tabs>
    </Card>
  );
}

function StatementDraftModal({
  isOpen,
  onClose,
  state,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  state: CosSimulatorState;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [tone, setTone] = useState<DraftStatementBodyTone | null>(null);
  const [messages, setMessages] = useState<DraftStatementBodyMessagesItem[]>([]);
  const [channels, setChannels] = useState<DraftStatementBodyChannelsItem[]>([]);
  const [timing, setTiming] = useState<DraftStatementBodyTiming>(DraftStatementBodyTiming.now);
  const [feedback, setFeedback] = useState<string | null>(null);
  const draftStatement = useDraftCosStatement();

  const toggleMsg = (m: DraftStatementBodyMessagesItem) =>
    setMessages(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  const toggleChan = (c: DraftStatementBodyChannelsItem) =>
    setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleSubmit = () => {
    if (!tone) return;
    draftStatement.mutate(
      { data: { tone, messages, channels, timing } },
      {
        onSuccess: (data) => {
          setFeedback(data.message);
          onSuccess();
        },
      }
    );
  };

  const reset = () => {
    setStep(1); setTone(null); setMessages([]); setChannels([]);
    setTiming(DraftStatementBodyTiming.now); setFeedback(null);
  };

  const TONES = [
    { id: DraftStatementBodyTone.context, label: "Provide context & correct the record", desc: "Set the facts straight — cite the full clip and timestamp", recommended: state.clipContextChecked },
    { id: DraftStatementBodyTone.apology, label: "Issue an apology", desc: "Apologize for any confusion or offense", warn: "⚠ Risky if clip wasn't genuinely offensive" },
    { id: DraftStatementBodyTone.no_comment, label: "No comment at this time", desc: "Stay silent publicly while managing internally", warn: "⚠ Evasive during a trending crisis" },
  ];

  const MESSAGES = [
    { id: DraftStatementBodyMessagesItem.clip_context, label: "Cite the full clip context with a direct link", safe: true },
    { id: DraftStatementBodyMessagesItem.timestamp_clarification, label: "Reference the creator's correction at timestamp 02:15:10", safe: true },
    { id: DraftStatementBodyMessagesItem.transparency_commitment, label: "Commit to transparency and further updates", safe: true },
    { id: DraftStatementBodyMessagesItem.apologize_if_offended, label: "Apologize to anyone who was offended", safe: false, warn: "Implies genuine wrongdoing" },
    { id: DraftStatementBodyMessagesItem.hit_piece_accusation, label: "Call out the clip as a deliberate hit piece", safe: false, warn: "Sounds conspiratorial without full evidence" },
  ];

  const CHANNELS = [
    { id: DraftStatementBodyChannelsItem.twitter, label: "Twitter / X", desc: "Where the crisis is trending right now", recommended: true },
    { id: DraftStatementBodyChannelsItem.youtube, label: "YouTube Community", desc: "Loyal audience, good for longer context posts", recommended: true },
    { id: DraftStatementBodyChannelsItem.instagram, label: "Instagram Story", desc: "Visual, ephemeral — disappears in 24h", warn: true },
    { id: DraftStatementBodyChannelsItem.press_release, label: "Press Release", desc: "Distributes to media outlets not yet covering this", warn: true },
    { id: DraftStatementBodyChannelsItem.newsletter, label: "Creator Newsletter", desc: "Existing audience only — too slow for trending", warn: false },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-base text-primary flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Draft Public Statement — Step {feedback ? "✓" : step}/3
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            {!feedback && step === 1 && "Choose your statement tone carefully — this sets the narrative frame."}
            {!feedback && step === 2 && "Select the key points to include. Choose wisely — wrong messages penalize."}
            {!feedback && step === 3 && "Choose where and when to publish. Platform matters as much as the message."}
          </DialogDescription>
        </DialogHeader>

        {feedback ? (
          <div className="space-y-3">
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-md border border-border font-mono text-foreground max-h-64 overflow-y-auto">
              {feedback}
            </div>
            <Button className="w-full font-mono text-xs" onClick={() => { onClose(); reset(); }}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {step === 1 && (
              <div className="space-y-2">
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className={`w-full text-left p-3 rounded-md border text-sm transition-all ${tone === t.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-foreground">{t.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                        {t.warn && <div className="text-xs text-amber-500 mt-0.5">{t.warn}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {t.recommended && <span className="text-[9px] font-mono bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded">RECOMMENDED</span>}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${tone === t.id ? "border-primary bg-primary" : "border-border"}`}>
                          {tone === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                <Button className="w-full font-mono text-xs mt-2" disabled={!tone} onClick={() => setStep(2)}>
                  Next: Key Messages →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-mono">Select any combination — good choices add points, bad ones subtract.</p>
                {MESSAGES.map(m => (
                  <button key={m.id} onClick={() => toggleMsg(m.id)}
                    className={`w-full text-left p-3 rounded-md border text-sm transition-all ${messages.includes(m.id) ? (m.safe ? "border-primary bg-primary/10" : "border-amber-500 bg-amber-500/10") : "border-border bg-background hover:border-primary/50"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${messages.includes(m.id) ? (m.safe ? "border-primary bg-primary" : "border-amber-500 bg-amber-500") : "border-border"}`}>
                        {messages.includes(m.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className={`font-medium ${m.safe ? "text-foreground" : "text-amber-600"}`}>{m.label}</div>
                        {m.warn && <div className="text-xs text-amber-500 mt-0.5">⚠ {m.warn}</div>}
                      </div>
                    </div>
                  </button>
                ))}
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" className="flex-1 font-mono text-xs" onClick={() => setStep(1)}>← Back</Button>
                  <Button className="flex-1 font-mono text-xs" onClick={() => setStep(3)}>Next: Channels →</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Publish on</div>
                  {CHANNELS.map(c => (
                    <button key={c.id} onClick={() => toggleChan(c.id)}
                      className={`w-full text-left p-2.5 rounded-md border text-sm transition-all ${channels.includes(c.id) ? (c.warn ? "border-amber-500 bg-amber-500/10" : "border-primary bg-primary/10") : "border-border bg-background hover:border-primary/50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${channels.includes(c.id) ? (c.warn ? "border-amber-500 bg-amber-500" : "border-primary bg-primary") : "border-border"}`}>
                          {channels.includes(c.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{c.label}</span>
                          {c.recommended && <span className="ml-2 text-[9px] font-mono bg-green-500/20 text-green-600 px-1 py-0.5 rounded">RECOMMENDED</span>}
                          {c.warn && <span className="ml-2 text-[9px] font-mono bg-amber-500/20 text-amber-600 px-1 py-0.5 rounded">⚠ RISKY</span>}
                          <div className="text-xs text-muted-foreground">{c.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Timing</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: DraftStatementBodyTiming.now, label: "Post Now", desc: "While trending — maximum reach" },
                      { id: DraftStatementBodyTiming.wait_agency, label: "Wait for Agency", desc: "Safer — coordinated messaging" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setTiming(t.id)}
                        className={`text-left p-2.5 rounded-md border text-sm transition-all ${timing === t.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                        <div className="font-medium text-foreground text-xs">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 font-mono text-xs" onClick={() => setStep(2)}>← Back</Button>
                  <Button className="flex-1 font-mono text-xs" disabled={channels.length === 0 || draftStatement.isPending} onClick={handleSubmit}>
                    {draftStatement.isPending ? "Publishing..." : "Publish Statement"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NegotiateModal({
  isOpen,
  onClose,
  state,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  state: CosSimulatorState;
  onSuccess: () => void;
}) {
  const [stance, setStance] = useState<NegotiateDealBodyStance | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const negotiateDeal = useNegotiateCosDeal();
  const queryClient = useQueryClient();

  const handleSubmit = () => {
    if (!stance) return;
    negotiateDeal.mutate(
      { data: { stance } },
      {
        onSuccess: (data) => {
          setFeedback(data.message);
          queryClient.invalidateQueries({ queryKey: getGetCosSimulatorStateQueryKey() });
          onSuccess();
        },
      }
    );
  };

  const reset = () => { setStance(null); setFeedback(null); };

  const STANCES = [
    {
      id: NegotiateDealBodyStance.transparency,
      label: "Full transparency",
      desc: "Share the archive evidence and crisis response plan directly with their brand team",
      badge: "RECOMMENDED",
      badgeColor: "bg-green-500/20 text-green-600",
    },
    {
      id: NegotiateDealBodyStance.guarantees,
      label: "Offer performance guarantees",
      desc: "Propose makeup content, bonus deliverables, or a rate reduction as goodwill",
      badge: "SHOWS WEAKNESS",
      badgeColor: "bg-amber-500/20 text-amber-600",
    },
    {
      id: NegotiateDealBodyStance.firm,
      label: "Hold firm",
      desc: "Remind them of mutual contractual obligations and request a 48-hour review period",
      badge: state.clipContextChecked && state.contractsReviewed && state.legalConsulted ? "HIGH RISK / HIGH REWARD" : "DANGEROUS WITHOUT EVIDENCE",
      badgeColor: state.clipContextChecked && state.contractsReviewed && state.legalConsulted ? "bg-amber-500/20 text-amber-600" : "bg-red-500/20 text-red-600",
    },
    {
      id: NegotiateDealBodyStance.legal,
      label: "Escalate to legal threats",
      desc: "Have our entertainment lawyer contact their legal team directly",
      badge: "⚠ NUCLEAR OPTION",
      badgeColor: "bg-red-500/20 text-red-600",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-base text-primary flex items-center gap-2">
            <Users className="w-4 h-4" /> Negotiate MegaCorp Deal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            The $240K deal is on hold. Choose your negotiation approach — this determines whether the deal survives.
            {!state.clipContextChecked && <span className="block text-amber-500 mt-1">⚠ You haven't reviewed the clip archive yet — your negotiating position is weak without evidence.</span>}
            {!state.contractsReviewed && <span className="block text-amber-500 mt-0.5">⚠ Contracts not reviewed — you may not know your Clause 7.5 standing.</span>}
          </DialogDescription>
        </DialogHeader>

        {feedback ? (
          <div className="space-y-3">
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-md border border-border font-mono text-foreground max-h-64 overflow-y-auto">
              {feedback}
            </div>
            <Button className="w-full font-mono text-xs" onClick={() => { onClose(); reset(); }}>Close</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {STANCES.map(s => (
              <button key={s.id} onClick={() => setStance(s.id)}
                className={`w-full text-left p-3 rounded-md border text-sm transition-all ${stance === s.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-foreground">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${s.badgeColor}`}>{s.badge}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${stance === s.id ? "border-primary bg-primary" : "border-border"}`}>
                      {stance === s.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            <Button className="w-full font-mono text-xs mt-2" disabled={!stance || negotiateDeal.isPending} onClick={handleSubmit}>
              {negotiateDeal.isPending ? "Negotiating..." : "Submit Negotiation Stance"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActionPanel({ state }: { state: CosSimulatorState }) {
  const takeAction = useTakeCosAction();
  const queryClient = useQueryClient();
  const [draftOpen, setDraftOpen] = useState(false);
  const [negotiateOpen, setNegotiateOpen] = useState(false);

  const handleAction = (action: CosActionRequestAction) => {
    takeAction.mutate(
      { data: { action } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetCosSimulatorStateQueryKey(),
          });
        },
      }
    );
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCosSimulatorStateQueryKey() });

  const ActionBtn = ({
    id,
    label,
    isTaken,
    variant = "default",
    urgent = false,
  }: {
    id: CosActionRequestAction;
    label: string;
    isTaken: boolean;
    variant?: VariantProps<typeof buttonVariants>["variant"];
    urgent?: boolean;
  }) => (
    <Button
      variant={isTaken ? "secondary" : variant}
      className={`w-full justify-start text-xs ${isTaken ? "opacity-50 cursor-not-allowed" : ""} ${urgent && !isTaken ? "ring-1 ring-amber-500" : ""}`}
      onClick={() => handleAction(id)}
      disabled={isTaken || takeAction.isPending || state.incidentClosed}
      data-testid={`btn-action-${id}`}
    >
      {isTaken ? (
        <CheckCircle2 className="w-3 h-3 mr-2" />
      ) : (
        <div className="w-3 h-3 mr-2 opacity-50 border border-current rounded-full" />
      )}
      {label}
    </Button>
  );

  return (
    <>
      <StatementDraftModal
        isOpen={draftOpen}
        onClose={() => setDraftOpen(false)}
        state={state}
        onSuccess={invalidate}
      />
      <NegotiateModal
        isOpen={negotiateOpen}
        onClose={() => setNegotiateOpen(false)}
        state={state}
        onSuccess={invalidate}
      />

      <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border shrink-0">
          <CardTitle className="text-sm flex items-center text-primary">
            <AlertCircle className="w-4 h-4 mr-2" /> DECISIONS & ACTIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">
              Containment
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn
                id={CosActionRequestAction.PAUSE_BRAND_POST}
                label="Pause Brand Post"
                isTaken={state.brandPostPaused}
                variant="destructive"
                urgent={true}
              />
              <ActionBtn
                id={CosActionRequestAction.BRIEF_CREATOR}
                label="Brief Creator"
                isTaken={state.creatorBriefed}
                variant="outline"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">
              Fact-Finding
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn
                id={CosActionRequestAction.REVIEW_CONTRACTS}
                label="Review Contracts"
                isTaken={state.contractsReviewed}
                variant="outline"
              />
              <ActionBtn
                id={CosActionRequestAction.PULL_CLIP_ARCHIVE}
                label="Pull Clip Archive"
                isTaken={state.clipContextChecked}
                variant="outline"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">
              Response
            </h3>
            <div className="flex flex-col gap-2">
              <ActionBtn
                id={CosActionRequestAction.ISSUE_APOLOGY_IMMEDIATELY}
                label="Issue Immediate Apology"
                isTaken={state.apologyIssued}
                variant="destructive"
              />
              <Button
                variant={state.statementDrafted ? "secondary" : "default"}
                className={`w-full justify-start text-xs ${state.statementDrafted ? "opacity-50 cursor-not-allowed" : "ring-1 ring-primary/40"}`}
                disabled={state.statementIssued || state.incidentClosed}
                onClick={() => setDraftOpen(true)}
                data-testid="btn-action-DRAFT_STATEMENT"
              >
                {state.statementDrafted ? (
                  <CheckCircle2 className="w-3 h-3 mr-2" />
                ) : (
                  <div className="w-3 h-3 mr-2 opacity-50 border border-current rounded-full" />
                )}
                {state.statementDrafted ? "Statement Published" : "Draft Statement…"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">
              Recovery
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn
                id={CosActionRequestAction.CONTACT_AGENCY}
                label="Contact Agency"
                isTaken={state.agencyContacted}
                variant="outline"
              />
              <ActionBtn
                id={CosActionRequestAction.CONTACT_MEGACORP_PROACTIVELY}
                label="Contact MegaCorp"
                isTaken={state.megaCorpReachedOut}
                variant="outline"
                urgent={!state.megaCorpReachedOut}
              />
              <ActionBtn
                id={CosActionRequestAction.ACTIVATE_LEGAL}
                label="Activate Legal"
                isTaken={state.legalConsulted}
                variant="outline"
              />
              <Button
                variant={state.dealNegotiated ? "secondary" : "outline"}
                className={`w-full justify-start text-xs ${state.dealNegotiated ? "opacity-50 cursor-not-allowed" : ""} ${state.megaCorpReachedOut && !state.dealNegotiated ? "ring-1 ring-amber-500" : ""}`}
                disabled={!state.megaCorpReachedOut || state.dealNegotiated || state.incidentClosed}
                onClick={() => setNegotiateOpen(true)}
                data-testid="btn-action-NEGOTIATE_DEAL"
              >
                {state.dealNegotiated ? (
                  <CheckCircle2 className="w-3 h-3 mr-2" />
                ) : (
                  <div className="w-3 h-3 mr-2 opacity-50 border border-current rounded-full" />
                )}
                {state.dealNegotiated ? "Deal Negotiated" : "Negotiate Deal…"}
              </Button>
              <ActionBtn
                id={CosActionRequestAction.CLOSE_INCIDENT}
                label="Close Crisis"
                isTaken={state.incidentClosed}
                variant="default"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ScorePanel({
  score,
  totalScore,
}: {
  score: CosScoreBreakdown;
  totalScore: number;
}) {
  const ScoreRow = ({
    label,
    value,
    max,
    icon: Icon,
  }: {
    label: string;
    value: number;
    max: number;
    icon?: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          {Icon && <Icon className="w-3 h-3" />}
          {label}
        </span>
        <span className="text-foreground">
          {value} / {max}
        </span>
      </div>
      <Progress value={(value / max) * 100} className="h-1" />
    </div>
  );

  return (
    <Card className="h-1/3 min-h-[220px] flex flex-col border-border bg-card">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center text-primary">
          <BarChart2 className="w-4 h-4 mr-2" /> PERFORMANCE
        </CardTitle>
        <div className="text-xl font-bold text-primary">
          {totalScore}
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 grid grid-cols-2 gap-x-6 gap-y-3 overflow-y-auto">
        <ScoreRow label="Investigation" value={score.investigation} max={20} />
        <ScoreRow label="Containment" value={score.crisisContainment} max={20} />
        <ScoreRow label="Stakeholders" value={score.stakeholderManagement} max={20} />
        <ScoreRow label="Creator Support" value={score.creatorSupport} max={20} icon={Heart} />
        <ScoreRow label="Communication" value={score.communication} max={10} />
        <ScoreRow label="Prevention" value={score.prevention} max={10} />
      </CardContent>
    </Card>
  );
}

function DebriefModal({
  isOpen,
  debrief,
  score,
  onClose,
}: {
  isOpen: boolean;
  debrief: string | null;
  score: number;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl text-primary border-b border-border pb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" /> CRISIS RESOLVED
          </DialogTitle>
          <DialogDescription className="sr-only">
            Crisis Debrief
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 font-mono space-y-6">
          <div className="text-center p-6 bg-background rounded-md border border-border">
            <div className="text-sm text-muted-foreground mb-2">
              FINAL EVALUATION SCORE
            </div>
            <div className="text-5xl font-bold text-primary">
              {score}
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">
              After Action Report — The Viral Spiral
            </h3>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-md border border-border">
              {debrief}
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={onClose} className="font-mono text-xs">
            CLOSE DEBRIEF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
