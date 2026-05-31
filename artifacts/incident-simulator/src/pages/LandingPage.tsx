import { useEffect, useState } from "react";
import { useLocation } from "wouter";

// ── Constants ──────────────────────────────────────────────────────────────

const SKY = "#0a0c11";
const CREAM = "hsl(45 30% 88%)";
const CREAM_DIM = "rgba(237,230,210,0.55)";
const ACCENT = "hsl(24 85% 63%)";

// ── Font preload ───────────────────────────────────────────────────────────

function usePreloadFonts() {
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&display=swap";
    const id = "landing-font-preload";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);
}

// ── Ambient BackgroundConstellation (inlined, low-opacity ambient) ─────────

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

function AmbientConstellation() {
  // litCount=2 — just enough to light the first two nodes faintly
  const litCount = 2;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      style={{ opacity: 0.4 }}
    >
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
          <radialGradient id="bgGlowLitLanding" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.55" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bgGlowCoreLanding" cx="50%" cy="50%" r="50%">
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
          const isFirst = i === 0;
          return (
            <g key={i}>
              {isLit && (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={isFirst ? 60 : 38}
                  fill={isFirst ? "url(#bgGlowLitLanding)" : "url(#bgGlowCoreLanding)"}
                />
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
                opacity={isLit ? 1 : 0.4}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-1 flex flex-col rounded-2xl p-8"
      style={{
        background: "rgba(20, 22, 28, 0.72)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 1px 0 rgba(237,230,210,0.05) inset, 0 24px 48px -20px rgba(0,0,0,0.6)",
      }}
    >
      {children}
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────────────────────────

export default function LandingPage() {
  usePreloadFonts();
  const [, navigate] = useLocation();

  // Candidate card state
  const [challengeInput, setChallengeInput] = useState("");
  const [linkError, setLinkError] = useState("");

  function handleStartChallenge() {
    setLinkError("");
    const raw = challengeInput.trim();
    if (!raw) {
      setLinkError("Please paste a challenge link first.");
      return;
    }
    try {
      // Accept both full URLs and just the raw query param value
      let dParam: string | null = null;

      // Try parsing as URL first
      if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) {
        const url = new URL(raw, window.location.origin);
        dParam = url.searchParams.get("d");
      } else {
        // Maybe they pasted the bare param value or a query string
        const qs = raw.startsWith("?") ? raw : `?${raw}`;
        try {
          const params = new URLSearchParams(qs);
          dParam = params.get("d");
        } catch {
          dParam = null;
        }
      }

      if (dParam) {
        navigate(`/challenge?d=${encodeURIComponent(dParam)}`);
      } else {
        setLinkError("That doesn't look like a valid challenge link.");
      }
    } catch {
      setLinkError("That doesn't look like a valid challenge link.");
    }
  }

  return (
    <div
      className="min-h-screen w-full relative flex flex-col"
      style={{ background: SKY, color: CREAM }}
    >
      <AmbientConstellation />

      {/* Main content — centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Wordmark */}
        <h1
          className="mb-3 tracking-tight"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "48px",
            fontWeight: 400,
            color: CREAM,
            letterSpacing: "-0.01em",
          }}
        >
          Arena
        </h1>

        {/* Tagline */}
        <p
          className="mb-12 text-center max-w-md"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: "italic",
            fontSize: "18px",
            color: CREAM_DIM,
            lineHeight: 1.5,
          }}
        >
          The interview that tests judgment, not credentials.
        </p>

        {/* Two-card row */}
        <div
          className="flex flex-col sm:flex-row gap-5 w-full"
          style={{ maxWidth: "800px" }}
        >
          {/* Left card — hiring */}
          <Card>
            <h2
              className="mb-3"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: "24px",
                fontWeight: 400,
                color: CREAM,
              }}
            >
              I'm hiring
            </h2>
            <p
              className="mb-6 flex-1"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "14px",
                color: CREAM_DIM,
                lineHeight: 1.6,
              }}
            >
              Define what good judgment looks like for your role. Generate a
              scenario-based challenge. Share a link with candidates.
            </p>
            <button
              type="button"
              onClick={() => navigate("/employer")}
              className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                background: ACCENT,
                color: SKY,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
                letterSpacing: "0.01em",
              }}
            >
              Create a challenge →
            </button>
          </Card>

          {/* Right card — candidate */}
          <Card>
            <h2
              className="mb-3"
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: "24px",
                fontWeight: 400,
                color: CREAM,
              }}
            >
              I'm looking for opportunities
            </h2>
            <p
              className="mb-5 flex-1"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "14px",
                color: CREAM_DIM,
                lineHeight: 1.6,
              }}
            >
              Received a challenge link from an employer? Paste it below to
              begin.
            </p>
            <input
              type="text"
              value={challengeInput}
              onChange={(e) => {
                setChallengeInput(e.target.value);
                setLinkError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStartChallenge();
              }}
              placeholder="Paste your challenge link here..."
              className="w-full mb-3 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(10,12,17,0.7)",
                border: "1px solid rgba(237,230,210,0.15)",
                color: CREAM,
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            />
            {linkError && (
              <p
                className="mb-2 text-xs"
                style={{
                  color: "hsl(0 65% 65%)",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                {linkError}
              </p>
            )}
            <button
              type="button"
              onClick={handleStartChallenge}
              className="w-full py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                background: "rgba(237,230,210,0.08)",
                border: "1px solid rgba(237,230,210,0.18)",
                color: CREAM,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 500,
              }}
            >
              Start challenge →
            </button>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 pb-6 flex justify-center">
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "rgba(237,230,210,0.28)",
          }}
        >
          Arena · Built for judgment
        </span>
      </div>
    </div>
  );
}
