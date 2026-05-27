import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Plus, X, Sparkles, Mic, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "employer.profile";

const SKY = "#0a0c11";
const CREAM = "#EDE6D2";
const CREAM_DIM = "rgba(237,230,210,0.58)";
const CREAM_VDIM = "rgba(237,230,210,0.32)";
const ACCENT = "#E08763";

const STEPS = [
  { id: "role", label: "the role" },
  { id: "context", label: "the work" },
  { id: "skills", label: "the skills" },
  { id: "ai", label: "ai fluency" },
] as const;

type RolePreset = {
  id: string;
  label: string;
  contextPlaceholder: string;
  suggestedSkills: string[];
};

const ROLE_PRESETS: RolePreset[] = [
  {
    id: "software_engineer",
    label: "Software Engineer",
    contextPlaceholder:
      "They'll work across our backend, picking up tickets in a system with years of accumulated decisions. They need to read unfamiliar code, debug under pressure, decide when to fix the root cause vs. ship a patch, and use AI tools to accelerate — not replace — their judgment.",
    suggestedSkills: [
      "Debugging under pressure",
      "Codebase fluency",
      "Architecture intuition",
      "Tradeoff reasoning",
      "Production safety",
      "AI tool judgment",
      "Reading unfamiliar code",
      "Root-cause analysis",
    ],
  },
  {
    id: "product_designer",
    label: "Senior Product Designer",
    contextPlaceholder:
      "They'll own the design system across a 4-team product org. They need to decide when to bend the system for a one-off vs. hold the line, push back on PM scope creep, and use AI tools without losing taste.",
    suggestedSkills: [
      "Design system architecture",
      "Prioritization under ambiguity",
      "Stakeholder pushback",
      "Taste & visual judgment",
      "Cross-functional alignment",
      "AI-assisted craft",
      "Design critique",
      "Systems thinking",
    ],
  },
  {
    id: "product_manager",
    label: "Product Manager",
    contextPlaceholder:
      "They'll own outcomes for a product line, write specs that align cross-functional teams, decide what NOT to build, and balance customer requests against strategic direction. They make tradeoff calls with incomplete information.",
    suggestedSkills: [
      "Prioritization under ambiguity",
      "Strategic tradeoffs",
      "Cross-functional alignment",
      "User research synthesis",
      "Communication & influence",
      "AI-assisted roadmapping",
      "Saying no",
      "Hypothesis design",
    ],
  },
  {
    id: "chief_of_staff",
    label: "Chief of Staff",
    contextPlaceholder:
      "They'll triage incoming priorities for the CEO, manage cross-team initiatives, draft communications that thread the needle on sensitive topics, and operate with high context across product, ops, and people.",
    suggestedSkills: [
      "Triage under ambiguity",
      "Executive communication",
      "Cross-functional orchestration",
      "Crisis judgment",
      "Stakeholder management",
      "Strategic synthesis",
      "Discreet handling",
      "Operating cadence",
    ],
  },
  {
    id: "founding_marketer",
    label: "Founding Marketer",
    contextPlaceholder:
      "They'll be the only marketer for the first year. They'll figure out positioning, run growth experiments, write copy for the website and outbound, and pick between five channels with limited budget. They need to act on hypotheses faster than they can prove them.",
    suggestedSkills: [
      "Positioning judgment",
      "Channel experimentation",
      "Copywriting under constraint",
      "Quantitative reasoning",
      "Speed vs. quality tradeoffs",
      "AI-assisted content",
      "Brand voice",
      "Iterating on hypotheses",
    ],
  },
  {
    id: "operations_lead",
    label: "Operations Lead",
    contextPlaceholder:
      "They'll own internal systems — finance, HR, vendors, compliance. They'll spot process problems before they become urgent, prioritize across competing requests from leadership, and decide which manual processes to automate vs. live with.",
    suggestedSkills: [
      "Process design",
      "Prioritization across functions",
      "Vendor negotiation",
      "Compliance judgment",
      "Systems thinking",
      "Automation tradeoffs",
      "Internal communication",
      "Risk assessment",
    ],
  },
];

const CUSTOM_PRESET: RolePreset = {
  id: "custom",
  label: "Custom",
  contextPlaceholder:
    "Describe the day-to-day. The ambiguity they'll face. The tradeoffs that are theirs to make.",
  suggestedSkills: [
    "Prioritization under ambiguity",
    "Stakeholder communication",
    "Tradeoff reasoning",
    "Judgment under pressure",
    "Cross-functional collaboration",
    "AI tool fluency",
    "Strategic synthesis",
    "Crisis response",
  ],
};

function usePreloadFonts() {
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap";
    const id = "employer-font-preload";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);
}

export default function EmployerOnboardingPage() {
  usePreloadFonts();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const directionRef = useRef(1);

  const [selectedRoleId, setSelectedRoleId] = useState<string>("software_engineer");
  const [roleTitle, setRoleTitle] = useState(
    ROLE_PRESETS.find((r) => r.id === "software_engineer")?.label ?? "",
  );
  const [company, setCompany] = useState("");
  const [roleContext, setRoleContext] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [aiExpectations, setAiExpectations] = useState("");

  const activePreset: RolePreset | null = useMemo(() => {
    if (!selectedRoleId) return null;
    if (selectedRoleId === "custom") return CUSTOM_PRESET;
    return ROLE_PRESETS.find((r) => r.id === selectedRoleId) ?? null;
  }, [selectedRoleId]);

  function pickRole(id: string) {
    setSelectedRoleId(id);
    if (id === "custom") {
      setRoleTitle("");
    } else {
      const preset = ROLE_PRESETS.find((r) => r.id === id);
      if (preset) setRoleTitle(preset.label);
    }
    setSkills([]);
  }

  const stepValid = useMemo(() => {
    if (step === 0) return roleTitle.trim().length > 2;
    if (step === 1) return roleContext.trim().length >= 20;
    if (step === 2) return skills.length >= 2;
    return true;
  }, [step, roleTitle, roleContext, skills.length]);

  function goNext() {
    if (!stepValid) return;
    directionRef.current = 1;
    if (step === STEPS.length - 1) {
      finalize();
    } else {
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    if (step === 0) return;
    directionRef.current = -1;
    setStep((s) => s - 1);
  }

  function toggleSkill(s: string) {
    if (skills.includes(s)) {
      setSkills(skills.filter((x) => x !== s));
    } else if (skills.length < 6) {
      setSkills([...skills, s]);
    }
  }

  function addCustomSkill(s: string) {
    const trimmed = s.trim();
    if (!trimmed || skills.includes(trimmed) || skills.length >= 6) return;
    setSkills([...skills, trimmed]);
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s));
  }

  function finalize() {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        roleTitle: roleTitle.trim(),
        company: company.trim() || "Your company",
        roleContext: roleContext.trim(),
        skills,
        aiExpectations: aiExpectations.trim(),
      }),
    );
    navigate("/employer/constellation");
  }

  const litCount =
    (roleTitle.trim().length > 2 ? 1 : 0) +
    (roleContext.trim().length >= 20 ? 1 : 0) +
    Math.min(skills.length, 3);

  return (
    <div
      className="min-h-screen w-full relative"
      style={{
        background: SKY,
        color: CREAM,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <BackgroundConstellation
        litCount={litCount}
        skills={skills}
        roleTitle={roleTitle}
      />

      <TopStrip step={step} totalSteps={STEPS.length} />

      <div className="relative z-10 min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[600px]">
          <ProgressDots step={step} total={STEPS.length} />

          <div
            className="mt-5 rounded-2xl overflow-hidden relative"
            style={{
              background: "rgba(20, 22, 28, 0.66)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(237,230,210,0.10)",
              boxShadow:
                "0 1px 0 rgba(237,230,210,0.05) inset, 0 30px 60px -24px rgba(0,0,0,0.7), 0 12px 32px -16px rgba(0,0,0,0.5)",
            }}
          >
            <AnimatePresence mode="wait" custom={directionRef.current}>
              <motion.div
                key={step}
                custom={directionRef.current}
                variants={cardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                className="p-10"
              >
                {step === 0 && (
                  <RoleStep
                    selectedRoleId={selectedRoleId}
                    onPickRole={pickRole}
                    roleTitle={roleTitle}
                    setRoleTitle={setRoleTitle}
                    company={company}
                    setCompany={setCompany}
                    onSubmit={goNext}
                  />
                )}
                {step === 1 && (
                  <ContextStep
                    value={roleContext}
                    onChange={setRoleContext}
                    onSubmit={goNext}
                    placeholder={
                      activePreset?.contextPlaceholder ??
                      CUSTOM_PRESET.contextPlaceholder
                    }
                  />
                )}
                {step === 2 && (
                  <SkillsStep
                    skills={skills}
                    toggleSkill={toggleSkill}
                    addCustomSkill={addCustomSkill}
                    removeSkill={removeSkill}
                    suggestions={
                      (activePreset ?? CUSTOM_PRESET).suggestedSkills
                    }
                  />
                )}
                {step === 3 && (
                  <AIStep
                    value={aiExpectations}
                    onChange={setAiExpectations}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <Nav
            step={step}
            totalSteps={STEPS.length}
            canNext={stepValid}
            onBack={goBack}
            onNext={goNext}
          />
        </div>
      </div>

      <BottomStrip />
    </div>
  );
}

const cardVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: -dir * 28, scale: 0.985 }),
};

// ── Step components ─────────────────────────────────────────────────────

function StepHeader({
  index,
  question,
  intent,
}: {
  index: number;
  question: React.ReactNode;
  intent: string;
}) {
  return (
    <div>
      <div
        className="text-[10.5px] tracking-[0.22em] uppercase mb-5"
        style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
      >
        {String(index + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
        <span className="ml-3 opacity-70">— {STEPS[index].label}</span>
      </div>
      <h2
        className="leading-[1.04]"
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: "44px",
          fontWeight: 400,
          color: CREAM,
          letterSpacing: "-0.012em",
        }}
      >
        {question}
      </h2>
      <p
        className="mt-4 max-w-[480px]"
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontStyle: "italic",
          fontSize: "17px",
          color: CREAM_DIM,
          lineHeight: 1.5,
        }}
      >
        {intent}
      </p>
    </div>
  );
}

function RoleStep({
  selectedRoleId,
  onPickRole,
  roleTitle,
  setRoleTitle,
  company,
  setCompany,
  onSubmit,
}: {
  selectedRoleId: string;
  onPickRole: (id: string) => void;
  roleTitle: string;
  setRoleTitle: (s: string) => void;
  company: string;
  setCompany: (s: string) => void;
  onSubmit: () => void;
}) {
  const isCustom = selectedRoleId === "custom";
  return (
    <>
      <StepHeader
        index={0}
        question={
          <>
            What's the <em style={{ color: ACCENT, fontStyle: "italic" }}>role?</em>
          </>
        }
        intent="Pick the closest seat — we'll tune the rest of the questions to it."
      />
      <div className="mt-9 space-y-7">
        <RoleSelect
          value={selectedRoleId}
          onChange={onPickRole}
          options={[
            ...ROLE_PRESETS.map((r) => ({ id: r.id, label: r.label })),
            { id: "custom", label: "Custom · I'll write it myself" },
          ]}
          placeholder="Choose a role"
        />
        {isCustom && (
          <CardInput
            label="Role title"
            value={roleTitle}
            onChange={setRoleTitle}
            placeholder="e.g. Founding Solutions Engineer"
            maxLength={60}
            autoFocus
            onEnter={onSubmit}
          />
        )}
        <CardInput
          label="Company"
          value={company}
          onChange={setCompany}
          placeholder="Optional"
          maxLength={40}
          onEnter={onSubmit}
        />
      </div>
    </>
  );
}

function ContextStep({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  return (
    <>
      <StepHeader
        index={1}
        question={
          <>
            Where does <em style={{ color: ACCENT, fontStyle: "italic" }}>judgment</em> get tested?
          </>
        }
        intent="Describe the day-to-day. The ambiguity they'll face. The tradeoffs that are theirs to make."
      />
      <div className="mt-9">
        <CardTextarea
          label="Context"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={1200}
          rows={5}
          autoFocus
          onMetaEnter={onSubmit}
          enableMic
        />
        <Meta
          left={
            value.length < 20
              ? `${20 - value.length} more characters`
              : "Captured."
          }
          right={`${value.length} / 1200`}
        />
      </div>
    </>
  );
}

function SkillsStep({
  skills,
  toggleSkill,
  addCustomSkill,
  removeSkill,
  suggestions,
}: {
  skills: string[];
  toggleSkill: (s: string) => void;
  addCustomSkill: (s: string) => void;
  removeSkill: (s: string) => void;
  suggestions: string[];
}) {
  return (
    <>
      <StepHeader
        index={2}
        question={
          <>
            Which <em style={{ color: ACCENT, fontStyle: "italic" }}>skills</em> should we probe?
          </>
        }
        intent="Pick from the dropdown. Two to six. Each one becomes a node in the graph."
      />
      <div className="mt-9">
        <SkillsPicker
          selected={skills}
          suggestions={suggestions}
          onToggle={toggleSkill}
          onAddCustom={addCustomSkill}
          onRemove={removeSkill}
          max={6}
        />
        <Meta
          left={
            skills.length < 2
              ? `${2 - skills.length} more to continue`
              : "Enough to map."
          }
          right={`${skills.length} / 6`}
        />
      </div>
    </>
  );
}

function RoleSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <div
        className="text-[10.5px] tracking-[0.22em] uppercase mb-2.5"
        style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
      >
        Role
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 pb-2 text-left text-[18px] transition-colors"
        style={{
          color: current ? CREAM : "rgba(237,230,210,0.45)",
          fontFamily: "Inter, system-ui, sans-serif",
          borderBottom: `1px solid ${
            open ? CREAM : "rgba(237,230,210,0.20)"
          }`,
        }}
      >
        <span>{current ? current.label : placeholder}</span>
        <ChevronDown
          className="w-4 h-4 transition-transform shrink-0"
          style={{
            color: CREAM_DIM,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-lg"
            style={{
              background: "rgba(20,22,28,0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(237,230,210,0.12)",
              boxShadow:
                "0 20px 40px -16px rgba(0,0,0,0.7), 0 8px 20px -8px rgba(0,0,0,0.5)",
            }}
          >
            {options.map((opt) => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-[15px] transition-colors hover:bg-white/[0.04]"
                  style={{
                    color: active ? ACCENT : CREAM,
                    fontFamily:
                      opt.id === "custom"
                        ? "'Space Mono', monospace"
                        : "Inter, system-ui, sans-serif",
                    fontSize: opt.id === "custom" ? "12.5px" : "15px",
                    letterSpacing: opt.id === "custom" ? "0.04em" : undefined,
                    fontStyle: opt.id === "custom" ? "normal" : undefined,
                    borderTop:
                      opt.id === "custom"
                        ? "1px solid rgba(237,230,210,0.10)"
                        : "none",
                  }}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkillsPicker({
  selected,
  suggestions,
  onToggle,
  onAddCustom,
  onRemove,
  max,
}: {
  selected: string[];
  suggestions: string[];
  onToggle: (s: string) => void;
  onAddCustom: (s: string) => void;
  onRemove: (s: string) => void;
  max: number;
}) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const remaining = suggestions.filter((s) => !selected.includes(s));
  const atMax = selected.length >= max;

  useEffect(() => {
    if (!open) {
      setCustomMode(false);
      setCustomText("");
      return;
    }
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (customMode) customInputRef.current?.focus();
  }, [customMode]);

  function commitCustom() {
    if (customText.trim()) {
      onAddCustom(customText);
      setCustomText("");
    }
    setCustomMode(false);
    setOpen(false);
  }

  return (
    <div ref={wrapRef}>
      <div
        className="text-[10.5px] tracking-[0.22em] uppercase mb-3"
        style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
      >
        Selected skills
      </div>

      <div className="flex flex-wrap items-center gap-2 min-h-[40px]">
        <AnimatePresence initial={false}>
          {selected.map((s) => (
            <motion.span
              key={s}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.18 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-[12.5px]"
              style={{
                border: "1px dashed rgba(237,230,210,0.28)",
                color: CREAM,
                fontFamily: "'Space Mono', monospace",
                borderRadius: 999,
              }}
            >
              {s}
              <button
                type="button"
                onClick={() => onRemove(s)}
                aria-label={`Remove ${s}`}
                className="opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: CREAM }}
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        <div className="relative">
          <button
            type="button"
            onClick={() => !atMax && setOpen((o) => !o)}
            disabled={atMax}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-[11.5px] tracking-[0.22em] uppercase transition-opacity disabled:opacity-30"
            style={{
              border: `1px solid ${
                open ? ACCENT : "rgba(237,230,210,0.20)"
              }`,
              color: open ? ACCENT : CREAM_DIM,
              fontFamily: "'Space Mono', monospace",
              borderRadius: 999,
              background: "transparent",
            }}
          >
            <Plus className="w-3 h-3" /> Add skill
            <ChevronDown
              className="w-3 h-3 transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="absolute left-0 top-full mt-2 z-30 overflow-hidden rounded-lg w-[300px]"
                style={{
                  background: "rgba(20,22,28,0.96)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: "1px solid rgba(237,230,210,0.12)",
                  boxShadow:
                    "0 20px 40px -16px rgba(0,0,0,0.7), 0 8px 20px -8px rgba(0,0,0,0.5)",
                }}
              >
                <div className="max-h-[280px] overflow-y-auto">
                  {remaining.length === 0 && !customMode && (
                    <div
                      className="px-4 py-3 text-[12px]"
                      style={{
                        color: CREAM_VDIM,
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      All suggestions added.
                    </div>
                  )}
                  {remaining.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        onToggle(s);
                        setOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-[14px] transition-colors hover:bg-white/[0.04]"
                      style={{
                        color: CREAM,
                        fontFamily: "Inter, system-ui, sans-serif",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    borderTop: "1px solid rgba(237,230,210,0.10)",
                  }}
                >
                  {customMode ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input
                        ref={customInputRef}
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitCustom();
                          }
                        }}
                        placeholder="Type a custom skill"
                        maxLength={60}
                        className="flex-1 bg-transparent border-0 outline-none py-1.5 text-[14px]"
                        style={{
                          color: CREAM,
                          fontFamily: "Inter, system-ui, sans-serif",
                        }}
                      />
                      <button
                        type="button"
                        onClick={commitCustom}
                        disabled={!customText.trim()}
                        className="text-[10.5px] tracking-[0.22em] uppercase disabled:opacity-30"
                        style={{
                          color: ACCENT,
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCustomMode(true)}
                      className="w-full text-left px-4 py-2.5 text-[12px] tracking-[0.12em] uppercase transition-colors hover:bg-white/[0.04]"
                      style={{
                        color: CREAM_DIM,
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      + Custom skill…
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {atMax && (
        <div
          className="mt-3 text-[10.5px] tracking-[0.22em] uppercase"
          style={{
            color: CREAM_VDIM,
            fontFamily: "'Space Mono', monospace",
          }}
        >
          Max reached — remove one to add another.
        </div>
      )}
    </div>
  );
}

function AIStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <>
      <StepHeader
        index={3}
        question={
          <>
            How should they work with <em style={{ color: ACCENT, fontStyle: "italic" }}>AI?</em>
          </>
        }
        intent="Optional. What does fluency look like in this role — when do they reach for it, and when do they override it?"
      />
      <div className="mt-9">
        <CardTextarea
          label="AI fluency"
          value={value}
          onChange={onChange}
          placeholder="Uses AI to accelerate first drafts but knows when to override it. Can evaluate AI output critically and explain why a suggestion is wrong."
          maxLength={400}
          rows={3}
          autoFocus
          enableMic
        />
        <Meta right={`${value.length} / 400`} />
      </div>
    </>
  );
}

// ── Inputs ──────────────────────────────────────────────────────────────

function CardInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  autoFocus,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div
        className="text-[10.5px] tracking-[0.22em] uppercase mb-2.5"
        style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
      >
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className="w-full bg-transparent border-0 outline-none pb-2 text-[18px]"
        style={{
          color: CREAM,
          fontFamily: "Inter, system-ui, sans-serif",
          borderBottom: `1px solid ${
            focused ? CREAM : "rgba(237,230,210,0.20)"
          }`,
          transition: "border-color 140ms",
        }}
      />
    </div>
  );
}

function CardTextarea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 4,
  autoFocus,
  onMetaEnter,
  enableMic,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  autoFocus?: boolean;
  onMetaEnter?: () => void;
  enableMic?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const { recording, supported, start, stop, elapsed } = useSpeechRecognition({
    onUpdate: onChange,
  });

  function toggleMic() {
    if (recording) stop();
    else start(valueRef.current);
  }

  const showMic = enableMic && supported;

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5 min-h-[18px]">
        <div
          className="text-[10.5px] tracking-[0.22em] uppercase"
          style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
        >
          {label}
        </div>
        {showMic && (
          <button
            type="button"
            onClick={toggleMic}
            className="inline-flex items-center gap-2 text-[10.5px] tracking-[0.22em] uppercase transition-colors"
            style={{
              fontFamily: "'Space Mono', monospace",
              color: recording ? ACCENT : CREAM_DIM,
            }}
          >
            {recording ? (
              <>
                <span className="relative inline-flex w-2 h-2 items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: ACCENT, opacity: 0.5 }}
                  />
                  <span
                    className="relative w-2 h-2 rounded-full"
                    style={{ background: ACCENT }}
                  />
                </span>
                Recording · {formatElapsed(elapsed)}
                <span className="opacity-70">· Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" /> Speak instead
              </>
            )}
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onMetaEnter) {
            e.preventDefault();
            onMetaEnter();
          }
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        autoFocus={autoFocus}
        className="w-full bg-transparent border-0 outline-none pb-2 text-[16px] leading-relaxed resize-none"
        style={{
          color: CREAM,
          fontFamily: "Inter, system-ui, sans-serif",
          borderBottom: `1px solid ${
            recording ? ACCENT : focused ? CREAM : "rgba(237,230,210,0.20)"
          }`,
          transition: "border-color 140ms",
        }}
      />
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function useSpeechRecognition({
  onUpdate,
}: {
  onUpdate: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baselineRef = useRef("");
  const finalRef = useRef("");
  const startTimeRef = useRef(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function start(currentValue: string) {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    baselineRef.current = currentValue;
    finalRef.current = "";

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = "";
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) newFinal += transcript;
        else interim += transcript;
      }
      if (newFinal) finalRef.current += newFinal;
      const baseline = baselineRef.current;
      const tail = finalRef.current + interim;
      const joiner = baseline && tail && !/\s$/.test(baseline) ? " " : "";
      onUpdateRef.current(baseline + joiner + tail);
    };

    const endHandler = () => {
      setRecording(false);
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      setElapsed(0);
    };
    rec.onend = endHandler;
    rec.onerror = endHandler;

    try {
      rec.start();
      recRef.current = rec;
      setRecording(true);
      startTimeRef.current = Date.now();
      elapsedTimerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);
    } catch {
      // ignore — already running
    }
  }

  function stop() {
    try {
      recRef.current?.stop();
    } catch {
      // noop
    }
  }

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // noop
      }
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  return { recording, supported, start, stop, elapsed };
}

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function Meta({ left, right }: { left?: string; right?: string }) {
  return (
    <div className="mt-3 flex justify-between">
      <span
        className="text-[10px] tracking-[0.20em] uppercase"
        style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
      >
        {left ?? ""}
      </span>
      <span
        className="text-[10px] tracking-[0.20em] uppercase"
        style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
      >
        {right ?? ""}
      </span>
    </div>
  );
}

// ── Chrome ──────────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <span
            key={i}
            className="block transition-all"
            style={{
              height: 2,
              width: active ? 28 : 14,
              background: done || active ? CREAM : "rgba(237,230,210,0.20)",
            }}
          />
        );
      })}
      <span
        className="ml-3 text-[10.5px] tracking-[0.22em] uppercase"
        style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
      >
        {String(step + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

function Nav({
  step,
  totalSteps,
  canNext,
  onBack,
  onNext,
}: {
  step: number;
  totalSteps: number;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const isLast = step === totalSteps - 1;
  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        disabled={step === 0}
        className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase disabled:opacity-20 transition-opacity"
        style={{ color: CREAM_DIM, fontFamily: "'Space Mono', monospace" }}
      >
        <ArrowLeft className="w-3 h-3" /> Back
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="group inline-flex items-center gap-3 pl-5 pr-3 py-2.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: isLast ? ACCENT : "rgba(237,230,210,0.08)",
          color: isLast ? SKY : CREAM,
          border: `1px solid ${
            isLast ? ACCENT : "rgba(237,230,210,0.20)"
          }`,
          fontFamily: "'Space Mono', monospace",
          fontSize: "11.5px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          borderRadius: 999,
          boxShadow: isLast
            ? "0 10px 28px -10px rgba(224,135,99,0.5)"
            : "none",
        }}
      >
        {isLast ? (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Generate
          </>
        ) : (
          "Continue"
        )}
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-transform group-hover:translate-x-0.5"
          style={{
            background: isLast ? SKY : CREAM,
            color: isLast ? ACCENT : SKY,
          }}
        >
          <ArrowRight className="w-3 h-3" />
        </span>
      </button>
    </div>
  );
}

function TopStrip({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div
      className="relative z-10"
      style={{ borderBottom: "1px solid rgba(237,230,210,0.06)" }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: ACCENT,
              boxShadow: `0 0 12px ${ACCENT}`,
            }}
          />
          <span
            className="text-[15px]"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              color: CREAM,
            }}
          >
            Arena
          </span>
          <span
            className="text-[10.5px] tracking-[0.22em] uppercase pl-3 ml-1 truncate"
            style={{
              color: CREAM_VDIM,
              fontFamily: "'Space Mono', monospace",
              borderLeft: "1px solid rgba(237,230,210,0.10)",
            }}
          >
            Employer Studio
          </span>
        </div>
        <div className="flex items-center gap-5">
          <span
            className="text-[10.5px] tracking-[0.22em] uppercase"
            style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
          >
            session · 01
          </span>
          <span
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1 text-[10.5px] tracking-[0.22em] uppercase rounded-full"
            style={{
              border: "1px solid rgba(237,230,210,0.15)",
              color: CREAM_DIM,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: ACCENT }}
            />
            Recording · {String(step + 1).padStart(2, "0")}/{String(totalSteps).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}

function BottomStrip() {
  return (
    <div
      className="relative z-10"
      style={{ borderTop: "1px solid rgba(237,230,210,0.06)" }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 h-11 flex items-center justify-between">
        <span
          className="text-[10px] tracking-[0.22em] uppercase"
          style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
        >
          arena · employer studio · v0.0.3
        </span>
        <span
          className="text-[10px] tracking-[0.22em] uppercase hidden sm:inline-flex"
          style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
        >
          evaluate before you train
        </span>
      </div>
    </div>
  );
}

// ── Background constellation ─────────────────────────────────────────────

const BG_POSITIONS = [
  { cx: 220, cy: 220 },
  { cx: 1380, cy: 200 },
  { cx: 200, cy: 720 },
  { cx: 1400, cy: 720 },
  { cx: 1500, cy: 460 },
];

const BG_EDGES: [number, number][] = [
  [0, 2],
  [1, 4],
  [3, 4],
  [0, 1],
  [2, 3],
];

const BG_STARS = [
  { cx: 60, cy: 140, r: 1.2 },
  { cx: 1560, cy: 80, r: 1.4 },
  { cx: 80, cy: 880, r: 1.0 },
  { cx: 1540, cy: 870, r: 1.2 },
  { cx: 1100, cy: 100, r: 0.9 },
  { cx: 480, cy: 110, r: 1.1 },
  { cx: 320, cy: 870, r: 1.0 },
  { cx: 1280, cy: 860, r: 1.2 },
  { cx: 60, cy: 450, r: 0.9 },
  { cx: 1560, cy: 260, r: 1.0 },
  { cx: 1560, cy: 640, r: 0.8 },
  { cx: 100, cy: 320, r: 0.8 },
];

function BackgroundConstellation({
  litCount,
  skills,
  roleTitle,
}: {
  litCount: number;
  skills: string[];
  roleTitle: string;
}) {
  const nodeLabels = useMemo(() => {
    const labels: (string | null)[] = [];
    if (roleTitle.trim().length > 2) labels.push(roleTitle.trim());
    else labels.push(null);

    labels.push(null);
    for (let i = 0; i < 3; i++) labels.push(skills[i] ?? null);
    return labels;
  }, [roleTitle, skills]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(10,12,17,0.0) 0%, rgba(10,12,17,0.65) 65%, rgba(10,12,17,0.95) 100%)",
        }}
      />

      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <radialGradient id="bgGlowLit" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.55" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bgGlowCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(200 85% 65%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(200 85% 65%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g
          stroke="rgba(237,230,210,0.10)"
          strokeWidth="1"
          strokeDasharray="2 6"
          fill="none"
        >
          {BG_EDGES.map(([a, b], i) => {
            const A = BG_POSITIONS[a];
            const B = BG_POSITIONS[b];
            const visible = litCount > Math.max(a, b);
            return (
              <line
                key={i}
                x1={A.cx}
                y1={A.cy}
                x2={B.cx}
                y2={B.cy}
                opacity={visible ? 1 : 0.25}
                style={{ transition: "opacity 600ms" }}
              />
            );
          })}
        </g>

        <g fill="rgba(237,230,210,0.45)">
          {BG_STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
          ))}
        </g>

        {BG_POSITIONS.map((p, i) => {
          const isLit = i < litCount;
          const isNext = i === litCount;
          const isFirst = i === 0;
          return (
            <g key={i} style={{ transition: "opacity 600ms" }}>
              {isLit && (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={isFirst ? 60 : 38}
                  fill={isFirst ? "url(#bgGlowLit)" : "url(#bgGlowCore)"}
                >
                  {isFirst && (
                    <animate
                      attributeName="r"
                      values="56;68;56"
                      dur="3.2s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              )}
              <circle
                cx={p.cx}
                cy={p.cy}
                r={isLit ? (isFirst ? 4.5 : 3.5) : 2}
                fill={
                  isLit
                    ? isFirst
                      ? ACCENT
                      : "hsl(200 85% 78%)"
                    : "rgba(237,230,210,0.35)"
                }
                opacity={isLit ? 1 : isNext ? 0.7 : 0.4}
                style={{ transition: "all 600ms" }}
              />
              {isNext && !isLit && (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={9}
                  fill="none"
                  stroke="rgba(237,230,210,0.35)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
              )}
            </g>
          );
        })}

        <g fontFamily="'Space Mono', monospace" fontSize="11">
          {BG_POSITIONS.map((p, i) => {
            const label = nodeLabels[i];
            const isLit = i < litCount;
            if (!label || !isLit) return null;
            const isLeftSide = p.cx < 800;
            return (
              <text
                key={i}
                x={p.cx}
                y={p.cy + 60}
                textAnchor={isLeftSide ? "start" : "end"}
                fill={i === 0 ? ACCENT : "rgba(237,230,210,0.7)"}
                style={{
                  opacity: 0,
                  animation: "bg-fade-in 700ms ease 200ms forwards",
                }}
              >
                {label}
              </text>
            );
          })}
        </g>
      </svg>

      <style>{`
        @keyframes bg-fade-in {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
