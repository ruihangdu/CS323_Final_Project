import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Terminal, CheckCircle2, RotateCcw, Send, Zap, Clock, Shield, Activity, Settings, AlertCircle, Loader2 } from "lucide-react";
import {
  useGetCustomSimulatorState,
  useTakeCustomAction,
  useQueryCustomAgent,
  useRunCustomCommand,
  useResetCustomSimulator,
  getGetCustomSimulatorStateQueryKey,
  type CustomSimulatorState,
  type FeedEvent,
  type CustomScoreCategory,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
  const companyName = params.get("company") || "";
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

  return { companyName, brand };
}

export default function CustomSimulatorPage() {
  const queryClient = useQueryClient();
  const [sessionKey, setSessionKey] = useState(0);
  const [debriefDismissed, setDebriefDismissed] = useState(false);
  const { companyName, brand } = useBranding();

  const { data: state, isLoading } = useGetCustomSimulatorState({
    query: {
      refetchInterval: (query) => {
        const data = query.state.data as CustomSimulatorState | undefined;
        if (data?.generating) return 1500;
        if (data?.incidentClosed) return false;
        return 3000;
      },
      queryKey: getGetCustomSimulatorStateQueryKey(),
    },
  });

  const resetSimulator = useResetCustomSimulator();

  const handleReset = () => {
    resetSimulator.mutate(undefined, {
      onSuccess: () => {
        setSessionKey((k) => k + 1);
        setDebriefDismissed(false);
        queryClient.invalidateQueries({ queryKey: getGetCustomSimulatorStateQueryKey() });
        window.location.href = "/";
      },
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-primary font-mono">
        <Loader2 className="w-5 h-5 animate-spin mr-3" /> LOADING...
      </div>
    );
  }

  if (!state) return null;

  if (state.generating) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-6 font-mono">
        <div className="flex items-center gap-3 text-primary text-lg font-bold">
          <Loader2 className="w-6 h-6 animate-spin" />
          Generating your scenario...
        </div>
        <p className="text-muted-foreground text-sm text-center max-w-sm">
          AI is crafting your custom crisis — building the incident feed, decision options, and AI advisors. This takes about 10-15 seconds.
        </p>
        <div className="w-48 h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-pulse rounded-full" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  if (state.generationError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-4 font-mono">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-destructive font-bold">Generation Failed</p>
        <p className="text-muted-foreground text-sm max-w-sm text-center">{state.generationError}</p>
        <Button onClick={() => { window.location.href = "/"; }} variant="outline" className="font-mono text-xs mt-2">
          ← Back to Setup
        </Button>
      </div>
    );
  }

  if (!state.scenario) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-muted-foreground font-mono text-sm">
        No scenario loaded. <button className="text-primary ml-2 underline" onClick={() => { window.location.href = "/"; }}>Go to setup</button>
      </div>
    );
  }

  const displayTitle = companyName
    ? `${companyName} — ${state.scenario.subtitle}`
    : state.scenario.title;

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="font-bold tracking-tight text-lg truncate max-w-sm">{displayTitle}</h1>
          <Badge variant="outline" className="font-mono text-sm border-primary text-primary bg-primary/10 shrink-0">
            {state.time}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs border-border text-muted-foreground shrink-0">
            {state.scenario.role}
          </Badge>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {state.incidentClosed ? (
            <Badge variant="default" className="bg-green-600 text-white font-bold px-3 py-1">RESOLVED</Badge>
          ) : (
            <Badge variant="destructive" className="animate-pulse font-bold px-3 py-1">ACTIVE</Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => { window.location.href = "/"; }} className="font-mono text-xs border-border text-muted-foreground hover:text-foreground">
            <Settings className="w-3 h-3 mr-2" /> Configure
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="btn-reset" className="font-mono text-xs">
            <RotateCcw className="w-3 h-3 mr-2" /> RESET
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        {/* Left Column: Feed & Terminal */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <SituationFeed feed={state.feed} brand={brand} />
          <TerminalConsole key={sessionKey} companySlug={(companyName || state.scenario.title).toLowerCase().replace(/[^a-z0-9]/g, "-")} />
        </div>

        {/* Center Column: AI Advisors */}
        <div className="col-span-4 flex flex-col min-h-0">
          <AIAdvisorPanel key={sessionKey} agents={state.scenario.agents} />
        </div>

        {/* Right Column: Actions & Score */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <ActionPanel state={state} />
          <ScorePanel scoreCategories={state.scenario.scoreCategories} score={state.score} totalScore={state.totalScore} />
        </div>
      </div>

      <DebriefModal
        isOpen={state.incidentClosed && state.debrief !== null && !debriefDismissed}
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
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [feed]);

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-3 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
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
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 rounded-sm font-mono uppercase ${badgeClass}`}>{event.source}</Badge>
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

type TerminalEntry = { command: string; output: string };

function TerminalConsole({ companySlug }: { companySlug: string }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runCommand = useRunCustomCommand();
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
    runCommand.mutate({ data: { command: cmd } }, {
      onSuccess: (data) => {
        setHistory((prev) => [...prev, { command: cmd, output: data.output }]);
        queryClient.invalidateQueries({ queryKey: getGetCustomSimulatorStateQueryKey() });
      },
    });
  };

  return (
    <Card className="h-1/3 flex flex-col min-h-[220px] border-border bg-black">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0 bg-card">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Terminal className="w-4 h-4 mr-2" /> TERMINAL
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 flex flex-col font-mono text-xs overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-2" ref={scrollRef}>
          {history.length === 0 && (
            <div className="text-muted-foreground text-xs py-1">Type 'help' for available commands</div>
          )}
          {history.map((entry, i) => (
            <div key={i} className="mb-2">
              <div className="text-primary">{prompt} $ {entry.command}</div>
              {entry.output && <div className="text-foreground whitespace-pre-wrap mt-0.5 pl-2 border-l border-border">{entry.output}</div>}
            </div>
          ))}
          {runCommand.isPending && <div className="text-muted-foreground animate-pulse">Running...</div>}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center shrink-0">
          <span className="text-primary mr-2">{prompt} $</span>
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Type a command..." autoComplete="off" spellCheck="false"
            data-testid="input-terminal" disabled={runCommand.isPending}
          />
        </form>
      </CardContent>
    </Card>
  );
}

function AIAdvisorPanel({ agents }: { agents: CustomSimulatorState["scenario"] extends null ? never : NonNullable<CustomSimulatorState["scenario"]>["agents"] }) {
  const [activeAgentId, setActiveAgentId] = useState<string>(agents[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Array<{ role: string; content: string; agentName: string }>>([]);
  const queryAgent = useQueryCustomAgent();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (agents.length > 0 && !activeAgentId) setActiveAgentId(agents[0].id);
  }, [agents]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, queryAgent.isPending]);

  const activeAgent = agents.find((a) => a.id === activeAgentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || queryAgent.isPending || !activeAgentId) return;
    const userMsg = input;
    setHistory((prev) => [...prev, { role: "user", content: userMsg, agentName: "" }]);
    setInput("");
    queryAgent.mutate({ data: { agentId: activeAgentId, message: userMsg } }, {
      onSuccess: (data) => {
        setHistory((prev) => [...prev, { role: "agent", content: data.response, agentName: data.agent }]);
      },
    });
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Zap className="w-4 h-4 mr-2" /> AI ADVISORS
        </CardTitle>
      </CardHeader>
      <Tabs value={activeAgentId} onValueChange={setActiveAgentId} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2 shrink-0">
          <TabsList className={`w-full bg-background grid h-auto p-1`} style={{ gridTemplateColumns: `repeat(${agents.length}, 1fr)` }}>
            {agents.map((agent) => (
              <TabsTrigger
                key={agent.id} value={agent.id}
                className="text-[10px] sm:text-xs py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono rounded-sm truncate"
              >
                {agent.name.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {activeAgent && (
          <div className="px-4 pt-1 shrink-0">
            <p className="text-[10px] text-muted-foreground font-mono">{activeAgent.role}</p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {history.length === 0 && (
            <div className="text-center text-muted-foreground text-sm font-mono py-8">
              Select an advisor and ask for guidance.
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary/20 text-primary-foreground border border-primary/30" : "bg-secondary text-secondary-foreground"}`}>
                {msg.content}
              </div>
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
              placeholder={`Ask ${activeAgent?.name ?? "advisor"}...`}
              className="bg-card font-mono text-sm" disabled={queryAgent.isPending} data-testid="input-agent-chat"
            />
            <Button type="submit" size="icon" disabled={queryAgent.isPending || !input.trim()} data-testid="btn-agent-send">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Tabs>
    </Card>
  );
}

function ActionPanel({ state }: { state: CustomSimulatorState }) {
  const takeAction = useTakeCustomAction();
  const queryClient = useQueryClient();

  if (!state.scenario) return null;

  const handleAction = (actionId: string) => {
    if (state.incidentClosed) return;
    takeAction.mutate({ data: { actionId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCustomSimulatorStateQueryKey() });
      },
    });
  };

  // Group actions by category
  const byCategory: Record<string, typeof state.scenario.actions> = {};
  for (const a of state.scenario.actions) {
    if (!byCategory[a.category]) byCategory[a.category] = [];
    byCategory[a.category].push(a);
  }

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-3 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Shield className="w-4 h-4 mr-2" /> DECISIONS & ACTIONS
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-y-auto space-y-5">
        {Object.entries(byCategory).map(([category, actions]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">{category}</h3>
            <div className="flex flex-col gap-2">
              {actions.map((action) => {
                const taken = state.takenActions.includes(action.id);
                return (
                  <Button
                    key={action.id}
                    variant={taken ? "secondary" : action.isRisky ? "destructive" : "outline"}
                    className={`w-full justify-start font-mono text-xs ${taken ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => handleAction(action.id)}
                    disabled={taken || takeAction.isPending || state.incidentClosed}
                    data-testid={`btn-action-${action.id}`}
                  >
                    {taken
                      ? <CheckCircle2 className="w-3 h-3 mr-2 shrink-0" />
                      : <div className="w-3 h-3 mr-2 shrink-0 opacity-50 border border-current rounded-full" />}
                    <span className="truncate">{action.label}</span>
                    {action.isRisky && !taken && <AlertCircle className="w-3 h-3 ml-auto shrink-0 opacity-60" />}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ScorePanel({ scoreCategories, score, totalScore }: { scoreCategories: CustomScoreCategory[]; score: Record<string, number>; totalScore: number }) {
  return (
    <Card className="h-1/3 min-h-[200px] flex flex-col border-border bg-card">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Shield className="w-4 h-4 mr-2" /> PERFORMANCE
        </CardTitle>
        <div className="font-mono text-xl font-bold text-primary">{totalScore}<span className="text-sm text-muted-foreground">/100</span></div>
      </CardHeader>
      <CardContent className="flex-1 p-4 grid grid-cols-2 gap-x-6 gap-y-3 overflow-y-auto">
        {scoreCategories.map((cat) => {
          const val = score[cat.key] ?? 0;
          return (
            <div key={cat.key} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground truncate">{cat.label}</span>
                <span className="text-foreground shrink-0 ml-1">{val}/{cat.max}</span>
              </div>
              <Progress value={(val / cat.max) * 100} className="h-1" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DebriefModal({ isOpen, debrief, score, onClose }: { isOpen: boolean; debrief: string | null; score: number; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl text-primary border-b border-border pb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" /> SCENARIO COMPLETE
          </DialogTitle>
          <DialogDescription className="sr-only">Scenario Debrief</DialogDescription>
        </DialogHeader>
        <div className="py-4 font-mono space-y-6">
          <div className="text-center p-6 bg-background rounded-md border border-border">
            <div className="text-sm text-muted-foreground mb-2">FINAL EVALUATION SCORE</div>
            <div className="text-5xl font-bold text-primary">{score}<span className="text-xl text-muted-foreground">/100</span></div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">After Action Report</h3>
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-background p-4 rounded-md border border-border">{debrief}</div>
          </div>
        </div>
        <div className="flex justify-between pt-2 border-t border-border">
          <Button onClick={() => { window.location.href = "/"; }} variant="outline" className="font-mono text-xs">
            ← New Scenario
          </Button>
          <Button onClick={onClose} className="font-mono text-xs">CLOSE DEBRIEF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
