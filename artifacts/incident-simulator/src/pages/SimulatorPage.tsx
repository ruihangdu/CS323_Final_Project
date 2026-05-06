import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Terminal, CheckCircle2, RotateCcw, Send, Activity, ShieldAlert, Zap, Clock, Shield } from "lucide-react";
import {
  useGetSimulatorState,
  useRunCommand,
  useTakeAction,
  useQueryAgent,
  useResetSimulator,
  getGetSimulatorStateQueryKey,
  ActionRequestAction,
  AgentRequestAgent,
  type FeedEvent,
  type SimulatorState,
  type ScoreBreakdown,
} from "@workspace/api-client-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function SimulatorPage() {
  const queryClient = useQueryClient();
  const [sessionKey, setSessionKey] = useState(0);
  const [debriefDismissed, setDebriefDismissed] = useState(false);
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

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card">
        <div className="flex items-center gap-4">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="font-bold tracking-tight text-lg">TaskForge Incident Response Simulator</h1>
          <Badge variant="outline" className="font-mono text-sm border-primary text-primary bg-primary/10">
            {state.time}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {state.incidentClosed ? (
            <Badge variant="default" className="bg-green-600 text-white font-bold px-3 py-1">
              RESOLVED
            </Badge>
          ) : (
            <Badge variant="destructive" className="animate-pulse font-bold px-3 py-1">
              INCIDENT ACTIVE
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="btn-reset" className="font-mono text-xs">
            <RotateCcw className="w-3 h-3 mr-2" /> RESET
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">
        
        {/* Left Column: Feed & Terminal */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <IncidentFeed feed={state.feed} />
          <TerminalConsole key={sessionKey} commands={state.commandsRun} />
        </div>

        {/* Center Column: AI Agent */}
        <div className="col-span-4 flex flex-col min-h-0">
          <AIAgentPanel key={sessionKey} />
        </div>

        {/* Right Column: Actions & Score */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <ActionPanel state={state} />
          <ScorePanel score={state.score} totalScore={state.totalScore} />
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

function IncidentFeed({ feed }: { feed: FeedEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feed]);

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-3 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Clock className="w-4 h-4 mr-2" /> INCIDENT FEED
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto" ref={scrollRef}>
        <div className="flex flex-col p-4 gap-3">
          {feed.map((event) => {
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

type TerminalEntry = { command: string; output: string };

function TerminalConsole({ commands }: { commands: string[] }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runCommand = useRunCommand();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, runCommand.isPending]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || runCommand.isPending) return;
    setInput("");
    runCommand.mutate({ data: { command: cmd } }, {
      onSuccess: (data) => {
        setHistory((prev) => [...prev, { command: cmd, output: data.output }]);
        queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
      }
    });
  };

  return (
    <Card className="h-1/3 flex flex-col min-h-[250px] border-border bg-black">
      <CardHeader className="py-2 px-4 border-b border-border shrink-0 bg-card">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <Terminal className="w-4 h-4 mr-2" /> TERMINAL
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 flex flex-col font-mono text-xs overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-2" ref={scrollRef}>
          {history.map((entry, i) => (
            <div key={i} className="mb-2">
              <div className="text-primary">taskforge-ops $ {entry.command}</div>
              {entry.output && (
                <div className="text-foreground whitespace-pre-wrap mt-0.5 pl-2 border-l border-border">
                  {entry.output}
                </div>
              )}
            </div>
          ))}
          {runCommand.isPending && (
            <div className="text-muted-foreground animate-pulse">Running...</div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center shrink-0">
          <span className="text-primary mr-2">taskforge-ops $</span>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Type a command..."
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

function AIAgentPanel() {
  const [activeTab, setActiveTab] = useState<string>("DevOps Agent");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Array<{role: string, content: string, tools?: string[]}>>([]);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
              <TabsTrigger 
                key={agent} 
                value={agent} 
                className="text-[10px] sm:text-xs py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono rounded-sm"
                data-testid={`tab-agent-${agent.replace(" ", "-")}`}
              >
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
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary/20 text-primary-foreground border border-primary/30' : 'bg-secondary text-secondary-foreground'}`}>
                {msg.content}
              </div>
              {msg.role === 'agent' && msg.tools && msg.tools.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {msg.tools.map((t, idx) => (
                    <Badge key={idx} variant="outline" className="text-[9px] font-mono border-muted-foreground/30 text-muted-foreground">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
          {queryAgent.isPending && (
            <div className="flex items-start">
              <div className="bg-secondary rounded-md px-3 py-2 text-sm text-muted-foreground animate-pulse font-mono">
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
              className="bg-card font-mono text-sm"
              disabled={queryAgent.isPending}
              data-testid="input-agent-chat"
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

function ActionPanel({ state }: { state: SimulatorState }) {
  const takeAction = useTakeAction();
  const queryClient = useQueryClient();

  const handleAction = (action: ActionRequestAction) => {
    takeAction.mutate({ data: { action } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSimulatorStateQueryKey() });
      }
    });
  };

  const ActionBtn = ({ id, label, isTaken, variant = "default", disabled = false }: { id: ActionRequestAction, label: string, isTaken: boolean, variant?: VariantProps<typeof buttonVariants>["variant"], disabled?: boolean }) => (
    <Button 
      variant={isTaken ? "secondary" : variant} 
      className={`w-full justify-start font-mono text-xs ${isTaken ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => handleAction(id)}
      disabled={isTaken || disabled || takeAction.isPending || state.incidentClosed}
      data-testid={`btn-action-${id}`}
    >
      {isTaken ? <CheckCircle2 className="w-3 h-3 mr-2" /> : <div className="w-3 h-3 mr-2 opacity-50 border border-current rounded-full" />}
      {label}
    </Button>
  );

  return (
    <Card className="flex-1 flex flex-col min-h-0 border-border bg-card">
      <CardHeader className="py-3 px-4 border-b border-border shrink-0">
        <CardTitle className="text-sm font-mono flex items-center text-primary">
          <ShieldAlert className="w-4 h-4 mr-2" /> DECISIONS & ACTIONS
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-y-auto space-y-5">
        
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Containment</h3>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn id={ActionRequestAction.DECLARE_SEV1} label="Declare SEV1" isTaken={state.sevDeclared} variant="destructive" />
            <ActionBtn id={ActionRequestAction.FREEZE_DEPLOYS} label="Freeze Deploys" isTaken={state.deploysFrozen} variant="outline" />
            <ActionBtn id={ActionRequestAction.STOP_WORKERS} label="Stop Workers" isTaken={state.workersStopped} variant="outline" />
            <ActionBtn id={ActionRequestAction.MAINTENANCE_MODE} label="Maintenance Mode" isTaken={state.maintenanceMode} variant="outline" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Investigation</h3>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn id={ActionRequestAction.SNAPSHOT_DB} label="Snapshot Damaged DB" isTaken={state.damagedDbSnapshotted} variant="outline" />
            <ActionBtn id={ActionRequestAction.DISABLE_MAINT_BOT} label="Disable Maint Bot" isTaken={state.maintBotDisabled} variant="outline" />
            <ActionBtn id={ActionRequestAction.INSPECT_REPLICA_2} label="Inspect Replica-2" isTaken={state.replica2Inspected} variant="outline" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Recovery</h3>
          <div className="flex flex-col gap-2">
            <ActionBtn id={ActionRequestAction.RESTORE_LATEST_BACKUP} label="Restore Latest Backup (Risky)" isTaken={state.latestBackupRestored} variant="destructive" />
            <ActionBtn id={ActionRequestAction.RESTORE_VERIFIED_BACKUP} label="Restore Verified Backup + WAL" isTaken={state.verifiedBackupRestored} variant="default" />
            <ActionBtn id={ActionRequestAction.PROMOTE_REPLICA_1} label="Promote Replica-1" isTaken={state.replica1Promoted} variant="outline" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Communication</h3>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn id={ActionRequestAction.PUBLISH_STATUS_UPDATE} label="Publish Status" isTaken={state.statusPublished} variant="outline" />
            <ActionBtn id={ActionRequestAction.CLOSE_INCIDENT} label="Close Incident" isTaken={state.incidentClosed} variant="default" />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

function ScorePanel({ score, totalScore }: { score: ScoreBreakdown, totalScore: number }) {
  const ScoreRow = ({ label, value, max }: { label: string, value: number, max: number }) => (
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

function DebriefModal({ isOpen, debrief, score, onClose }: { isOpen: boolean, debrief: string | null, score: number, onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="font-mono text-xl text-primary border-b border-border pb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" /> INCIDENT RESOLVED
          </DialogTitle>
          <DialogDescription className="sr-only">Incident Debrief</DialogDescription>
        </DialogHeader>
        <div className="py-4 font-mono space-y-6">
          <div className="text-center p-6 bg-background rounded-md border border-border">
            <div className="text-sm text-muted-foreground mb-2">FINAL EVALUATION SCORE</div>
            <div className="text-5xl font-bold text-primary">{score}<span className="text-xl text-muted-foreground">/100</span></div>
          </div>
          
          <div>
            <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">After Action Report</h3>
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
