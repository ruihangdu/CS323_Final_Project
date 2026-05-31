import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Sparkles, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SCENARIO_META,
  SCENARIO_KEYWORDS,
  COS_SCENARIO_META,
  COS_SCENARIO_KEYWORDS,
  PENDING_SCENARIO_KEY,
  pickRecommendedScenario,
  scoreScenario,
  type EmployerProfile,
} from "@/lib/scenarios";

const STORAGE_KEY = "employer.profile";

const SKY = "#0a0c11";
const CREAM = "#EDE6D2";
const CREAM_DIM = "rgba(237,230,210,0.58)";
const CREAM_VDIM = "rgba(237,230,210,0.32)";
const ACCENT = "#E08763";

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

type Profile = {
  roleTitle: string;
  company: string;
  roleContext: string;
  skills: string[];
  aiExpectations: string;
};

type NodeStatus = "focus" | "core" | "partial";

type ConstellationNode = {
  id: string;
  cx: number;
  cy: number;
  label: string;
  status: NodeStatus;
};

const BASELINES = [
  "Judgment under ambiguity",
  "Stakeholder communication",
  "AI tool fluency",
  "Tradeoff reasoning",
];

const POSITIONS: { cx: number; cy: number }[] = [
  { cx: 130, cy: 130 },
  { cx: 400, cy: 110 },
  { cx: 280, cy: 250 },
  { cx: 140, cy: 360 },
  { cx: 460, cy: 340 },
];

const EDGES: [number, number][] = [
  [0, 2],
  [1, 2],
  [2, 3],
  [2, 4],
  [0, 3],
  [1, 4],
];

const TINY_STARS = [
  { cx: 550, cy: 70, r: 1.8 },
  { cx: 60, cy: 240, r: 2.2 },
  { cx: 520, cy: 450, r: 1.6 },
  { cx: 330, cy: 470, r: 2.0 },
  { cx: 50, cy: 480, r: 1.4 },
  { cx: 600, cy: 200, r: 1.8 },
  { cx: 220, cy: 60, r: 1.6 },
];

function buildNodes(profile: Profile): ConstellationNode[] {
  const filled: string[] = [...profile.skills];
  for (const b of BASELINES) {
    if (filled.length >= 5) break;
    if (!filled.includes(b)) filled.push(b);
  }
  while (filled.length < 5) filled.push("—");
  filled.length = 5;

  const focusLabel = filled[0];
  const remaining = filled.slice(1);

  const partialIdx = remaining.findIndex((s) =>
    /ambiguit|judgment|tradeoff/i.test(s),
  );
  let partialLabel: string;
  if (partialIdx !== -1) {
    partialLabel = remaining.splice(partialIdx, 1)[0];
  } else {
    partialLabel = remaining.pop() as string;
  }

  return [
    { id: "n0", ...POSITIONS[0], label: remaining[0] ?? "—", status: "core" },
    { id: "n1", ...POSITIONS[1], label: remaining[1] ?? "—", status: "core" },
    { id: "n2", ...POSITIONS[2], label: focusLabel, status: "focus" },
    { id: "n3", ...POSITIONS[3], label: partialLabel, status: "partial" },
    { id: "n4", ...POSITIONS[4], label: remaining[2] ?? "—", status: "core" },
  ];
}

type Phase = "idle" | "loading" | "picking";

export default function ConstellationPage() {
  usePreloadFonts();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        navigate("/employer");
        return;
      }
      setProfile(JSON.parse(raw));
    } catch {
      navigate("/employer");
    }
  }, [navigate]);

  const nodes = useMemo(() => (profile ? buildNodes(profile) : []), [profile]);

  if (!profile) return null;

  const focusNode = nodes.find((n) => n.status === "focus");

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{
        background: SKY,
        color: CREAM,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <TopStrip
        roleTitle={profile.roleTitle}
        company={profile.company}
        onBack={() => navigate("/employer")}
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.45fr_1fr]">
        <div className="relative overflow-hidden">
          <div
            className="absolute top-6 left-7 z-10 text-[10.5px] tracking-[0.22em] uppercase"
            style={{
              color: CREAM_VDIM,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            Skill graph
          </div>
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 40% 50%, rgba(224,135,99,0.06) 0%, transparent 60%)",
            }}
          />

          <motion.svg
            viewBox="0 0 640 520"
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
          >
            <defs>
              <radialGradient id="glowFocus" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={ACCENT} stopOpacity="0.85" />
                <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="glowCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(200 85% 65%)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="hsl(200 85% 65%)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="glowPartial" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(200 40% 60%)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(200 40% 60%)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <motion.g
              stroke="rgba(237,230,210,0.20)"
              strokeWidth="1"
              strokeDasharray="2 4"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.5 }}
            >
              {EDGES.map(([a, b], i) => {
                const A = nodes[a];
                const B = nodes[b];
                if (!A || !B) return null;
                return (
                  <line key={i} x1={A.cx} y1={A.cy} x2={B.cx} y2={B.cy} />
                );
              })}
            </motion.g>

            <g fill="rgba(237,230,210,0.45)">
              {TINY_STARS.map((s, i) => (
                <motion.circle
                  key={i}
                  cx={s.cx}
                  cy={s.cy}
                  r={s.r}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                />
              ))}
            </g>

            {nodes.map((n, idx) => {
              const baseDelay = 0.2 + idx * 0.12;
              if (n.status === "focus") {
                return (
                  <motion.g
                    key={n.id}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.6,
                      delay: baseDelay,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
                  >
                    <circle cx={n.cx} cy={n.cy} r="48" fill="url(#glowFocus)">
                      <animate
                        attributeName="r"
                        values="42;56;42"
                        dur="2.6s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle cx={n.cx} cy={n.cy} r="7" fill={ACCENT} />
                  </motion.g>
                );
              }
              if (n.status === "core") {
                return (
                  <motion.g
                    key={n.id}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.5,
                      delay: baseDelay,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
                  >
                    <circle cx={n.cx} cy={n.cy} r="22" fill="url(#glowCore)" />
                    <circle
                      cx={n.cx}
                      cy={n.cy}
                      r="4.5"
                      fill="hsl(200 85% 78%)"
                    />
                  </motion.g>
                );
              }
              return (
                <motion.g
                  key={n.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: baseDelay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
                >
                  <circle
                    cx={n.cx}
                    cy={n.cy}
                    r="20"
                    fill="url(#glowPartial)"
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
                </motion.g>
              );
            })}

            <g fontFamily="'Space Mono', monospace" fontSize="11">
              {nodes.map((n, idx) => {
                const offsetY = n.status === "focus" ? 74 : 38;
                const color =
                  n.status === "focus"
                    ? ACCENT
                    : n.status === "core"
                    ? "rgba(237,230,210,0.88)"
                    : "rgba(237,230,210,0.6)";
                return (
                  <motion.text
                    key={n.id}
                    x={n.cx}
                    y={n.cy + offsetY}
                    textAnchor="middle"
                    fill={color}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 + idx * 0.12 }}
                  >
                    {n.label}
                  </motion.text>
                );
              })}
            </g>
          </motion.svg>

          <div className="absolute bottom-6 left-7 right-7 flex items-end justify-between z-10 gap-4">
            <motion.div
              className="min-w-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <div
                className="text-[10.5px] tracking-[0.22em] uppercase"
                style={{
                  color: CREAM_VDIM,
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                Candidate profile
              </div>
              <div
                className="mt-1 truncate"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: "30px",
                  color: CREAM,
                  lineHeight: 1.05,
                }}
              >
                {profile.roleTitle}
              </div>
            </motion.div>
            {focusNode && (
              <motion.div
                className="text-right shrink-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <div
                  className="text-[10.5px] tracking-[0.22em] uppercase"
                  style={{
                    color: CREAM_VDIM,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  Primary probe
                </div>
                <div
                  className="mt-1 text-[13px]"
                  style={{
                    color: ACCENT,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {focusNode.label}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <motion.div
          className="relative flex flex-col gap-4 p-6 lg:p-7 overflow-y-auto min-h-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,22,28,0.4) 0%, rgba(20,22,28,0.0) 100%)",
            borderLeft: "1px solid rgba(237,230,210,0.06)",
          }}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <div
              className="text-[10px] tracking-[0.22em] uppercase mb-1.5"
              style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
            >
              Role context
            </div>
            <p
              className="text-[13px] leading-snug line-clamp-3"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: "italic",
                color: CREAM_DIM,
              }}
            >
              "{profile.roleContext}"
            </p>
          </div>

          <div>
            <div className="flex flex-col">
              {nodes.map((n, i) => (
                <NodeRow key={n.id} index={i + 1} node={n} delay={0.5 + i * 0.08} />
              ))}
            </div>
          </div>

          {profile.aiExpectations && (
            <div>
              <div
                className="text-[10px] tracking-[0.22em] uppercase mb-1.5"
                style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
              >
                AI fluency
              </div>
              <p
                className="text-[13px] leading-snug line-clamp-2"
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  color: CREAM_DIM,
                }}
              >
                "{profile.aiExpectations}"
              </p>
            </div>
          )}

          <div
            className="mt-auto pt-4 flex items-end justify-between gap-4"
            style={{ borderTop: "1px solid rgba(237,230,210,0.10)" }}
          >
            <p
              className="text-[13px] leading-snug max-w-[230px]"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: "italic",
                color: CREAM_DIM,
              }}
            >
              Next, we craft your Arena from this map.
            </p>
            <button
              type="button"
              onClick={() => setPhase("loading")}
              className="group inline-flex items-center gap-2.5 pl-4 pr-2.5 py-2 transition-all shrink-0"
              style={{
                background: ACCENT,
                color: SKY,
                border: `1px solid ${ACCENT}`,
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                borderRadius: 999,
                boxShadow: `0 10px 28px -10px ${ACCENT}`,
              }}
            >
              <Sparkles className="w-3 h-3" />
              Generate Arena
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-transform group-hover:translate-x-0.5"
                style={{ background: SKY, color: ACCENT }}
              >
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {phase === "loading" && (
          <GeneratingOverlay
            key="loading"
            profile={profile}
            onDone={() => setPhase("picking")}
          />
        )}
        {phase === "picking" && (
          <PickerOverlay
            key="picking"
            profile={profile}
            onLaunch={(scenarioId) => {
              // Chief of Staff routes to the Creator HQ simulator instead.
              // The chosen incident still gets handed off so /sim flows can
              // pre-select; CoS just ignores it and uses its built-in scenario.
              if (profile?.roleTitle === "Chief of Staff") {
                window.location.href = "/cos-simulator/";
                return;
              }
              sessionStorage.setItem(PENDING_SCENARIO_KEY, scenarioId);
              navigate("/sim");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TopStrip({
  roleTitle,
  company,
  onBack,
}: {
  roleTitle: string;
  company: string;
  onBack: () => void;
}) {
  return (
    <div
      className="relative z-10"
      style={{ borderBottom: "1px solid rgba(237,230,210,0.06)" }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: ACCENT, boxShadow: `0 0 12px ${ACCENT}` }}
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
            {company || "Your company"}
          </span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[10.5px] tracking-[0.22em] uppercase opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: CREAM_DIM, fontFamily: "'Space Mono', monospace" }}
        >
          <ArrowLeft className="w-3 h-3" /> Edit profile
        </button>
      </div>
    </div>
  );
}

function NodeRow({
  index,
  node,
  delay,
}: {
  index: number;
  node: ConstellationNode;
  delay: number;
}) {
  const palette =
    node.status === "focus"
      ? { dot: ACCENT, label: "Focus" }
      : node.status === "core"
      ? { dot: "hsl(200 85% 65%)", label: "Core" }
      : { dot: "hsl(200 40% 65%)", label: "Partial" };

  return (
    <motion.div
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: "1px solid rgba(237,230,210,0.08)" }}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <span
        className="text-[10px] tracking-[0.22em] uppercase w-6 shrink-0"
        style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
      >
        {String(index).padStart(2, "0")}
      </span>
      <span
        className="w-2 h-2 shrink-0 rounded-full"
        style={{
          background: node.status === "partial" ? "transparent" : palette.dot,
          border:
            node.status === "partial"
              ? `1.5px dashed ${palette.dot}`
              : "none",
          boxShadow:
            node.status === "focus" ? `0 0 10px ${palette.dot}` : "none",
        }}
      />
      <span
        className="flex-1 truncate text-[14.5px]"
        style={{
          color: CREAM,
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontStyle: node.status === "focus" ? "italic" : "normal",
        }}
      >
        {node.label}
      </span>
      <span
        className="text-[9.5px] tracking-[0.22em] uppercase shrink-0"
        style={{
          color: node.status === "focus" ? ACCENT : CREAM_VDIM,
          fontFamily: "'Space Mono', monospace",
        }}
      >
        {palette.label}
      </span>
    </motion.div>
  );
}

// ── Generating overlay ──────────────────────────────────────────────────

type Step = {
  id: string;
  label: (p: Profile) => string;
  duration: number;
};

const GENERATING_STEPS: Step[] = [
  {
    id: "read",
    label: (p) => `Reading role profile · ${p.roleTitle}`,
    duration: 700,
  },
  {
    id: "map",
    label: (p) =>
      `Mapping ${p.skills.length} skill${p.skills.length === 1 ? "" : "s"} onto Arena vectors`,
    duration: 900,
  },
  {
    id: "focus",
    label: (p) =>
      `Setting primary probe · ${p.skills[0] ?? "judgment under ambiguity"}`,
    duration: 850,
  },
  {
    id: "compile",
    label: () => "Stitching the narrative",
    duration: 1100,
  },
];

function GeneratingOverlay({
  profile,
  onDone,
}: {
  profile: Profile | null;
  onDone: () => void;
}) {
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    if (completed >= GENERATING_STEPS.length) {
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setCompleted((c) => c + 1),
      GENERATING_STEPS[completed].duration,
    );
    return () => clearTimeout(t);
  }, [completed, onDone]);

  const allDone = completed >= GENERATING_STEPS.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{
        background: "rgba(10,12,17,0.92)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
      }}
    >
      <div className="w-full max-w-[560px]">
        <div
          className="text-[10.5px] tracking-[0.22em] uppercase mb-7 flex items-center gap-3"
          style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}
          />
          Arena · compiling test
        </div>

        <h2
          className="leading-[1.04]"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "42px",
            fontWeight: 400,
            color: CREAM,
            letterSpacing: "-0.012em",
          }}
        >
          Building an <em style={{ color: ACCENT, fontStyle: "italic" }}>Arena</em> for your candidate
        </h2>

        {profile && (
          <p
            className="mt-3 max-w-[440px]"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              fontSize: "17px",
              color: CREAM_DIM,
              lineHeight: 1.5,
            }}
          >
            Calibrated for a{" "}
            {profile.roleTitle.toLowerCase()} — {profile.skills.length} skill
            {profile.skills.length === 1 ? "" : "s"} mapped.
          </p>
        )}

        <div className="mt-10 flex flex-col gap-3.5">
          {GENERATING_STEPS.map((step, i) => {
            const isDone = i < completed;
            const isCurrent = i === completed && !allDone;
            if (!isDone && !isCurrent) return null;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 text-[13.5px]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {isDone ? (
                  <Check
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: ACCENT }}
                  />
                ) : (
                  <Loader2
                    className="w-3.5 h-3.5 animate-spin shrink-0"
                    style={{ color: CREAM_DIM }}
                  />
                )}
                <span
                  style={{
                    color: isDone ? CREAM : CREAM_DIM,
                    transition: "color 200ms",
                  }}
                >
                  {profile ? step.label(profile) : step.id}
                  {!isDone && <span className="opacity-60">…</span>}
                </span>
              </motion.div>
            );
          })}

          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="flex items-center gap-3 text-[13.5px] mt-3 pt-4"
              style={{
                fontFamily: "'Space Mono', monospace",
                borderTop: "1px dashed rgba(237,230,210,0.18)",
              }}
            >
              <ArrowRight className="w-3.5 h-3.5" style={{ color: ACCENT }} />
              <span style={{ color: ACCENT, letterSpacing: "0.02em" }}>
                Your Arena is ready
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Picker overlay (Arena-styled) ────────────────────────────────────────

const DIFFICULTY_CHIP: Record<string, { bg: string; fg: string; border: string }> = {
  MEDIUM: {
    bg: "rgba(224,135,99,0.12)",
    fg: "#E0A887",
    border: "rgba(224,135,99,0.45)",
  },
  HARD: {
    bg: "rgba(224,98,76,0.16)",
    fg: "#E78568",
    border: "rgba(224,98,76,0.55)",
  },
  EXPERT: {
    bg: "rgba(220,72,72,0.18)",
    fg: "#E47A7A",
    border: "rgba(220,72,72,0.55)",
  },
};

function PickerOverlay({
  profile,
  onLaunch,
}: {
  profile: Profile | null;
  onLaunch: (scenarioId: string) => void;
}) {
  const isForCos = profile?.roleTitle === "Chief of Staff";
  const scenarioSet = isForCos ? COS_SCENARIO_META : SCENARIO_META;
  const keywordSet = isForCos ? COS_SCENARIO_KEYWORDS : SCENARIO_KEYWORDS;

  const recommendedId = useMemo(
    () =>
      pickRecommendedScenario(
        profile as EmployerProfile | null,
        scenarioSet,
        keywordSet,
      ),
    [profile, scenarioSet, keywordSet],
  );

  const [selectedId, setSelectedId] = useState<string>(recommendedId);
  const fallback = Object.values(scenarioSet)[0];
  const hero = scenarioSet[selectedId] ?? fallback;
  const alternates = useMemo(
    () => Object.values(scenarioSet).filter((s) => s.id !== hero.id),
    [hero.id, scenarioSet],
  );
  const heroMatch = useMemo(
    () =>
      scoreScenario(hero.id, profile as EmployerProfile | null, keywordSet),
    [hero.id, profile, keywordSet],
  );
  const isRecommendedHero = hero.id === recommendedId;

  // If the user's selection isn't in the current scenario set (e.g. role
  // changed back from CoS), snap to the recommended one.
  useEffect(() => {
    if (!scenarioSet[selectedId]) setSelectedId(recommendedId);
  }, [scenarioSet, selectedId, recommendedId]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] flex items-center justify-center px-6 py-6 overflow-y-auto"
      style={{
        background: "rgba(10,12,17,0.94)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
      }}
    >
      <div className="w-full max-w-[640px]">
        <div
          className="text-[10.5px] tracking-[0.22em] uppercase mb-3 flex items-center gap-3"
          style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}
          />
          Arena
        </div>

        <h2
          className="leading-[1.04]"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "32px",
            fontWeight: 400,
            color: CREAM,
            letterSpacing: "-0.012em",
          }}
        >
          Your <em style={{ color: ACCENT, fontStyle: "italic" }}>Arena</em> is ready
        </h2>
        {profile && (
          <p
            className="mt-2 max-w-[480px]"
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              fontSize: "14.5px",
              color: CREAM_DIM,
              lineHeight: 1.5,
            }}
          >
            We've crafted a custom Arena to help you find your perfect {profile.roleTitle}.
          </p>
        )}

        {/* Hero recommended card */}
        <motion.div
          key={hero.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="block w-full text-left mt-5 p-5 rounded-2xl"
          style={{
            background: "rgba(224,135,99,0.06)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: `1px solid ${ACCENT}`,
            boxShadow: `0 0 0 1px ${ACCENT}, 0 24px 60px -24px rgba(224,135,99,0.35), 0 12px 32px -16px rgba(0,0,0,0.4)`,
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <span
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase"
              style={{ color: ACCENT, fontFamily: "'Space Mono', monospace" }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isRecommendedHero ? "animate-pulse" : ""}`}
                style={{
                  background: ACCENT,
                  opacity: isRecommendedHero ? 1 : 0.6,
                }}
              />
              {isRecommendedHero
                ? profile
                  ? `Custom-built for your ${profile.roleTitle.toLowerCase()}`
                  : "Recommended"
                : "Selected Arena"}
            </span>
            <DifficultyChip difficulty={hero.difficulty} />
          </div>
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "23px",
              fontWeight: 400,
              color: CREAM,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
            }}
          >
            {hero.name}
          </div>
          <p
            className="text-[13px] mt-1.5"
            style={{
              color: CREAM_DIM,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {hero.subtitle}
          </p>
          <p
            className="text-[12.5px] mt-2.5 leading-snug line-clamp-2"
            style={{
              color: CREAM_DIM,
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {hero.synopsis}
          </p>
          {heroMatch.matchedSkills.length > 0 && (
            <div
              className="mt-3 pt-3"
              style={{
                borderTop: "1px dashed rgba(237,230,210,0.18)",
              }}
            >
              <div
                className="text-[9.5px] tracking-[0.22em] uppercase mb-1.5"
                style={{
                  color: CREAM_VDIM,
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                Probes your focus on
              </div>
              <div className="flex flex-wrap gap-1.5">
                {heroMatch.matchedSkills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-2 py-0.5 text-[10.5px]"
                    style={{
                      border: `1px dashed ${ACCENT}66`,
                      color: CREAM,
                      fontFamily: "'Space Mono', monospace",
                      borderRadius: 999,
                      background: "rgba(224,135,99,0.08)",
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Alternates */}
        <div className="mt-4">
          <div
            className="text-[10px] tracking-[0.22em] uppercase mb-2"
            style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
          >
            Or pick a different Arena
          </div>
          <div className="flex flex-col gap-1.5">
            {alternates.map((sc, i) => {
              const isRecommended = sc.id === recommendedId;
              return (
                <motion.button
                  key={sc.id}
                  type="button"
                  onClick={() => setSelectedId(sc.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.32,
                    delay: 0.08 + i * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="text-left px-4 py-2 rounded-xl transition-all flex items-center justify-between gap-4 hover:bg-white/[0.04]"
                  style={{
                    background: "rgba(20,22,28,0.55)",
                    border: "1px solid rgba(237,230,210,0.08)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="truncate"
                        style={{
                          fontFamily: "'Instrument Serif', Georgia, serif",
                          fontSize: "16px",
                          color: CREAM,
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {sc.name}
                      </div>
                      {isRecommended && (
                        <span
                          className="text-[8.5px] tracking-[0.22em] uppercase px-1.5 py-0.5 shrink-0"
                          style={{
                            color: ACCENT,
                            background: "rgba(224,135,99,0.08)",
                            border: `1px solid ${ACCENT}66`,
                            borderRadius: 999,
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          Recommended
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[11.5px] mt-0.5 truncate"
                      style={{
                        color: CREAM_DIM,
                        fontFamily: "Inter, system-ui, sans-serif",
                      }}
                    >
                      {sc.subtitle}
                    </div>
                  </div>
                  <DifficultyChip difficulty={sc.difficulty} />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="mt-5 pt-4 flex items-center justify-between gap-4"
          style={{ borderTop: "1px dashed rgba(237,230,210,0.18)" }}
        >
          <span
            className="text-[10.5px] tracking-[0.22em] uppercase"
            style={{ color: CREAM_VDIM, fontFamily: "'Space Mono', monospace" }}
          >
            {isRecommendedHero
              ? "Custom-built selection"
              : "Alternate selection"}
          </span>
          <button
            type="button"
            onClick={() => onLaunch(selectedId)}
            className="group inline-flex items-center gap-3 pl-5 pr-3 py-2.5 transition-all"
            style={{
              background: ACCENT,
              color: SKY,
              border: `1px solid ${ACCENT}`,
              fontFamily: "'Space Mono', monospace",
              fontSize: "11.5px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              borderRadius: 999,
              boxShadow: `0 12px 32px -12px ${ACCENT}`,
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch Arena
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-transform group-hover:translate-x-0.5"
              style={{ background: SKY, color: ACCENT }}
            >
              <ArrowRight className="w-3 h-3" />
            </span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

function DifficultyChip({ difficulty }: { difficulty: string }) {
  const c = DIFFICULTY_CHIP[difficulty] ?? DIFFICULTY_CHIP.MEDIUM;
  return (
    <span
      className="text-[9.5px] tracking-[0.22em] uppercase px-2 py-0.5 shrink-0"
      style={{
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        fontFamily: "'Space Mono', monospace",
        borderRadius: 4,
      }}
    >
      {difficulty}
    </span>
  );
}
