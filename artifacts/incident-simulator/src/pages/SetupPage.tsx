import React, { useState } from "react";
import { useLocation } from "wouter";
import { Activity, TrendingUp, ChevronRight, Building2, Palette, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGenerateCustomScenario } from "@workspace/api-client-react";

const PRESET_SCENARIOS = [
  {
    id: "devops",
    icon: Activity,
    title: "SWE / On-Call Engineer",
    subtitle: "DevOps Incident Response",
    description:
      "A critical database incident has taken down your SaaS platform. Diagnose the root cause, contain the blast radius, and restore service before customers churn.",
    tags: ["Database Outage", "Root Cause Analysis", "Incident Command"],
    defaultCompany: "TaskForge",
    defaultColor: "142 71% 45%",
    defaultFg: "0 0% 0%",
    path: "/sim",
  },
  {
    id: "cos",
    icon: TrendingUp,
    title: "Chief of Staff",
    subtitle: "Creator HQ Crisis Management",
    description:
      "A creator's old clip is going viral with the wrong context. Manage the PR fallout, brief stakeholders, and decide whether to issue a statement — fast.",
    tags: ["Viral Crisis", "Stakeholder Comms", "Brand Protection"],
    defaultCompany: "Creator HQ",
    defaultColor: "38 92% 50%",
    defaultFg: "0 0% 0%",
    path: "/cos-simulator/",
  },
];

const COLOR_PRESETS = [
  { label: "Matrix Green", hsl: "142 71% 45%", fg: "0 0% 0%" },
  { label: "Amber", hsl: "38 92% 50%", fg: "0 0% 0%" },
  { label: "Electric Blue", hsl: "217 91% 60%", fg: "0 0% 100%" },
  { label: "Violet", hsl: "270 76% 60%", fg: "0 0% 100%" },
  { label: "Crimson", hsl: "0 72% 51%", fg: "0 0% 100%" },
  { label: "Cyan", hsl: "189 94% 43%", fg: "0 0% 0%" },
  { label: "Rose", hsl: "330 81% 60%", fg: "0 0% 100%" },
  { label: "Indigo", hsl: "243 75% 59%", fg: "0 0% 100%" },
];

const CUSTOM_DEFAULT_COLOR = { label: "Electric Blue", hsl: "217 91% 60%", fg: "0 0% 100%" };

export default function SetupPage() {
  const [, navigate] = useLocation();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [selectedColor, setSelectedColor] = useState<(typeof COLOR_PRESETS)[0] | null>(null);
  const [customDescription, setCustomDescription] = useState("");

  const generateMutation = useGenerateCustomScenario();

  const isCustom = selectedScenario === "custom";
  const presetScenario = PRESET_SCENARIOS.find((s) => s.id === selectedScenario) ?? null;

  const effectiveCompany = company.trim() || presetScenario?.defaultCompany || "";
  const defaultColor = isCustom ? CUSTOM_DEFAULT_COLOR : (presetScenario ? { hsl: presetScenario.defaultColor, fg: presetScenario.defaultFg, label: "" } : COLOR_PRESETS[0]);
  const effectiveColor = selectedColor ?? defaultColor;

  const canLaunch = !!selectedScenario && (!isCustom || customDescription.trim().length >= 20);

  function handleLaunch() {
    if (!selectedScenario) return;

    const params = new URLSearchParams({
      company: effectiveCompany,
      color: effectiveColor.hsl,
      fg: effectiveColor.fg,
    });

    if (isCustom) {
      // Call generate endpoint then navigate
      generateMutation.mutate(
        { data: { description: customDescription.trim(), company: effectiveCompany || "My Company" } },
        {
          onSuccess: () => {
            navigate(`/custom?${params.toString()}`);
          },
        }
      );
      return;
    }

    if (presetScenario?.path.startsWith("/cos-simulator")) {
      window.location.href = `${presetScenario.path}?${params.toString()}`;
    } else if (presetScenario) {
      navigate(`${presetScenario.path}?${params.toString()}`);
    }
  }

  const isGenerating = generateMutation.isPending;

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-8 py-4 flex items-center gap-3 bg-card shrink-0">
        <Activity className="w-5 h-5 text-primary" />
        <span className="font-mono font-bold tracking-widest text-sm text-primary uppercase">
          AI-Era Incident Simulator
        </span>
        <span className="text-border font-mono">|</span>
        <span className="text-muted-foreground text-sm font-mono">Configure your training session</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl flex flex-col gap-10">

          {/* Step 1: Scenario */}
          <section>
            <StepLabel step={1} label="Choose a scenario" />
            <div className="grid grid-cols-3 gap-4 mt-4">
              {/* Preset scenarios */}
              {PRESET_SCENARIOS.map((s) => {
                const Icon = s.icon;
                const active = selectedScenario === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedScenario(s.id); setCompany(""); setSelectedColor(null); }}
                    className={`text-left rounded-lg border p-5 transition-all focus:outline-none ${
                      active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex flex-col gap-1">
                        <span className={`font-bold text-sm ${active ? "text-primary" : "text-foreground"}`}>{s.title}</span>
                        <span className="text-xs text-muted-foreground font-mono">{s.subtitle}</span>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {s.tags.map((tag) => (
                            <span key={tag} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${active ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Custom scenario card */}
              {(() => {
                const active = selectedScenario === "custom";
                return (
                  <button
                    onClick={() => { setSelectedScenario("custom"); setCompany(""); setSelectedColor(null); }}
                    className={`text-left rounded-lg border p-5 transition-all focus:outline-none ${
                      active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className={`w-5 h-5 mt-0.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex flex-col gap-1">
                        <span className={`font-bold text-sm ${active ? "text-primary" : "text-foreground"}`}>Custom Scenario</span>
                        <span className="text-xs text-muted-foreground font-mono">AI-Generated</span>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                          Describe your role and what you want to practice. AI will generate a complete, realistic crisis scenario tailored to you.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {["Any Role", "AI-Crafted", "Unique Each Time"].map((tag) => (
                            <span key={tag} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${active ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>
          </section>

          {/* Custom description (only for custom) */}
          {isCustom && (
            <section>
              <StepLabel step={2} label="Describe your scenario" />
              <div className="mt-4 flex flex-col gap-3">
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={`Describe the role you want to practice and what kind of crisis you'd like to face.\n\nExamples:\n• "I'm a CISO and want to practice responding to a ransomware attack on our cloud infrastructure"\n• "I'm a product manager dealing with a major feature regression the day before a big launch"\n• "I'm a hospital administrator managing a data breach that affects patient records"`}
                  className="w-full h-40 rounded-lg border border-border bg-card text-foreground text-sm font-mono p-4 resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 leading-relaxed"
                  maxLength={600}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">
                    {customDescription.length < 20 ? `${20 - customDescription.length} more characters needed` : "✓ Ready to generate"}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{customDescription.length}/600</span>
                </div>
              </div>
            </section>
          )}

          {/* Step 2/3: Company name + color (shown after scenario selected) */}
          {selectedScenario && (
            <>
              <section>
                <StepLabel step={isCustom ? 3 : 2} label="Set your company name" />
                <div className="mt-4 flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder={presetScenario?.defaultCompany ?? "Your company name"}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="font-mono max-w-sm"
                    maxLength={40}
                  />
                  {company.trim() && (
                    <span className="text-xs text-muted-foreground font-mono">
                      Will appear as: <span className="text-primary">{company.trim()}</span>
                    </span>
                  )}
                </div>
              </section>

              <section>
                <StepLabel step={isCustom ? 4 : 3} label="Pick an accent color" />
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
                  {COLOR_PRESETS.map((c) => {
                    const active = effectiveColor.hsl === c.hsl;
                    return (
                      <button
                        key={c.hsl} title={c.label}
                        onClick={() => setSelectedColor(c)}
                        style={{ background: `hsl(${c.hsl})` }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform focus:outline-none ${active ? "border-white scale-125 ring-2 ring-white/30" : "border-transparent hover:scale-110"}`}
                      />
                    );
                  })}
                  <span className="text-xs text-muted-foreground font-mono ml-2">{effectiveColor.label}</span>
                </div>
              </section>

              {/* Preview strip */}
              <div className="rounded-lg border border-border bg-card px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: `hsl(${effectiveColor.hsl})` }} />
                  <span className="font-mono text-sm" style={{ color: `hsl(${effectiveColor.hsl})` }}>
                    {effectiveCompany || presetScenario?.defaultCompany || "My Company"}
                  </span>
                  <span className="text-muted-foreground text-xs font-mono">
                    — {isCustom ? "Custom Scenario" : presetScenario?.subtitle}
                  </span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded border"
                  style={{ borderColor: `hsl(${effectiveColor.hsl} / 0.5)`, color: `hsl(${effectiveColor.hsl})`, background: `hsl(${effectiveColor.hsl} / 0.1)` }}>
                  PREVIEW
                </span>
              </div>

              <Button
                size="lg"
                onClick={handleLaunch}
                disabled={!canLaunch || isGenerating}
                className="self-start font-mono font-bold tracking-wide gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating Scenario...</>
                ) : isCustom ? (
                  <><Sparkles className="w-4 h-4" /> Generate & Launch</>
                ) : (
                  <>Launch Simulation <ChevronRight className="w-4 h-4" /></>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepLabel({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold font-mono flex items-center justify-center">
        {step}
      </span>
      <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground font-mono">{label}</span>
    </div>
  );
}
