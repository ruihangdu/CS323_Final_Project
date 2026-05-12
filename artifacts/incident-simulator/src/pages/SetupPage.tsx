import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Activity, TrendingUp, ChevronRight, Building2, Palette, Sparkles, Loader2, Terminal, BookOpen } from "lucide-react";
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
    defaultBrand: "dev",
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
    defaultBrand: "editorial",
    path: "/cos-simulator/",
  },
];

const BRANDS = [
  {
    id: "dev",
    label: "Terminal / Dev",
    tagline: "Monospace. High-signal. Engineering-native.",
    headingFont: "'Space Mono', monospace",
    bodyFont: "'Space Grotesk', sans-serif",
    sampleHeading: "INCIDENT RESPONSE",
    sampleBody: "System degraded — 94% error rate on /api/v2",
    icon: Terminal,
  },
  {
    id: "editorial",
    label: "Editorial",
    tagline: "Serif headings. Clean body. Strategy-native.",
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    sampleHeading: "Crisis Briefing",
    sampleBody: "Stakeholder review required — media cycle active",
    icon: BookOpen,
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

const CUSTOM_DEFAULTS = { color: "217 91% 60%", fg: "0 0% 100%", brand: "dev" };

function usePreloadFonts() {
  useEffect(() => {
    const urls = [
      "https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap",
    ];
    urls.forEach((href, i) => {
      const id = `font-preload-${i}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    });
  }, []);
}

export default function SetupPage() {
  usePreloadFonts();
  const [, navigate] = useLocation();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [brand, setBrand] = useState<string>("dev");
  const [brandTouched, setBrandTouched] = useState(false);
  const [company, setCompany] = useState("");
  const [selectedColor, setSelectedColor] = useState<(typeof COLOR_PRESETS)[0] | null>(null);
  const [customDescription, setCustomDescription] = useState("");

  const generateMutation = useGenerateCustomScenario();

  const isCustom = selectedScenario === "custom";
  const presetScenario = PRESET_SCENARIOS.find((s) => s.id === selectedScenario) ?? null;

  const effectiveCompany = company.trim() || presetScenario?.defaultCompany || "";
  const defaultColorHsl = isCustom ? CUSTOM_DEFAULTS.color : (presetScenario?.defaultColor ?? COLOR_PRESETS[0].hsl);
  const defaultFg = isCustom ? CUSTOM_DEFAULTS.fg : (presetScenario?.defaultFg ?? "0 0% 100%");
  const effectiveColor = selectedColor ?? { hsl: defaultColorHsl, fg: defaultFg, label: "" };

  const selectedBrandDef = BRANDS.find((b) => b.id === brand) ?? BRANDS[0];

  const canLaunch = !!selectedScenario && (!isCustom || customDescription.trim().length >= 20);

  function handleSelectScenario(id: string) {
    setSelectedScenario(id);
    setCompany("");
    setSelectedColor(null);
    // Auto-suggest brand if user hasn't manually picked one
    if (!brandTouched) {
      if (id === "devops") setBrand("dev");
      else if (id === "cos") setBrand("editorial");
    }
  }

  function handleSelectBrand(id: string) {
    setBrand(id);
    setBrandTouched(true);
  }

  function buildParams() {
    return new URLSearchParams({
      company: effectiveCompany,
      color: effectiveColor.hsl,
      fg: effectiveColor.fg,
      brand,
    });
  }

  function handleLaunch() {
    if (!selectedScenario) return;
    const params = buildParams();

    if (isCustom) {
      generateMutation.mutate(
        { data: { description: customDescription.trim(), company: effectiveCompany || "My Company" } },
        { onSuccess: () => { navigate(`/custom?${params.toString()}`); } }
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

  // Step numbering shifts for custom scenario
  const stepOffset = isCustom ? 1 : 0;

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
              {PRESET_SCENARIOS.map((s) => {
                const Icon = s.icon;
                const active = selectedScenario === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectScenario(s.id)}
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
                    onClick={() => handleSelectScenario("custom")}
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

          {selectedScenario && (
            <>
              {/* Step 2: Brand Style */}
              <section>
                <StepLabel step={2} label="Choose a brand style" />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {BRANDS.map((b) => {
                    const active = brand === b.id;
                    const Icon = b.icon;
                    return (
                      <button
                        key={b.id}
                        onClick={() => handleSelectBrand(b.id)}
                        className={`text-left rounded-lg border p-5 transition-all focus:outline-none ${
                          active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <span className={`font-bold text-sm block ${active ? "text-primary" : "text-foreground"}`}>{b.label}</span>
                            <span className="text-xs text-muted-foreground">{b.tagline}</span>
                          </div>
                        </div>
                        {/* Font preview */}
                        <div className={`rounded-md border p-3 bg-background ${active ? "border-primary/30" : "border-border"}`}>
                          <div
                            className="text-base font-bold leading-tight mb-1"
                            style={{ fontFamily: b.headingFont, color: active ? `hsl(${effectiveColor.hsl})` : "hsl(var(--foreground))" }}
                          >
                            {b.sampleHeading}
                          </div>
                          <div
                            className="text-xs text-muted-foreground leading-snug"
                            style={{ fontFamily: b.bodyFont }}
                          >
                            {b.sampleBody}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!brandTouched && (
                  <p className="text-xs text-muted-foreground font-mono mt-2 ml-1">
                    Auto-suggested for this scenario — you can change it.
                  </p>
                )}
              </section>

              {/* Custom description — step 3 (custom only) */}
              {isCustom && (
                <section>
                  <StepLabel step={3} label="Describe your scenario" />
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

              {/* Company name */}
              <section>
                <StepLabel step={2 + stepOffset + 1} label="Set your company name" />
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

              {/* Accent color */}
              <section>
                <StepLabel step={2 + stepOffset + 2} label="Pick an accent color" />
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
                  <span className="text-xs text-muted-foreground font-mono ml-2">{selectedColor?.label ?? ""}</span>
                </div>
              </section>

              {/* Preview strip */}
              <div className="rounded-lg border border-border bg-card px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: `hsl(${effectiveColor.hsl})` }} />
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: `hsl(${effectiveColor.hsl})`,
                      fontFamily: selectedBrandDef.headingFont,
                    }}
                  >
                    {effectiveCompany || presetScenario?.defaultCompany || "My Company"}
                  </span>
                  <span className="text-muted-foreground text-xs font-mono">
                    — {isCustom ? "Custom Scenario" : presetScenario?.subtitle}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                    style={{ fontFamily: selectedBrandDef.bodyFont }}
                  >
                    {selectedBrandDef.label}
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
