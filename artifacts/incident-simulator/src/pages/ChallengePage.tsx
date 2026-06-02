import { useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { AlertCircle, Clock, Zap, Shield } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ChallengePayload = {
  v: 1;
  roleTitle: string;
  company: string;
  skills: string[];
  scenarioId: string;
  generatedAt: string;
};

// ── Decode ─────────────────────────────────────────────────────────────────

function decodeChallenge(encoded: string): ChallengePayload | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const obj = JSON.parse(json) as ChallengePayload;
    if (obj.v !== 1) return null;
    return obj;
  } catch {
    return null;
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const SKY = "#0a0c11";
const CREAM = "hsl(45 30% 88%)";
const CREAM_DIM = "rgba(240,230,211,0.5)";
const ACCENT = "hsl(24 85% 63%)";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "1px solid rgba(255,255,255,0.08)";

// ── Font preload ───────────────────────────────────────────────────────────

function usePreloadFonts() {
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&display=swap";
    const id = "challenge-font-preload";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);
}

// ── Error State ────────────────────────────────────────────────────────────

function ErrorState() {
  usePreloadFonts();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: SKY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          maxWidth: "420px",
          textAlign: "center",
        }}
      >
        <AlertCircle
          size={40}
          style={{ color: "hsl(0 65% 60%)", flexShrink: 0 }}
        />
        <h1
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "28px",
            fontWeight: 400,
            color: CREAM,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Invalid challenge link
        </h1>
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            color: CREAM_DIM,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          This link appears to be invalid or expired. Ask the employer to send
          you a new one.
        </p>
      </div>
    </div>
  );
}

// ── Info Card ──────────────────────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: SURFACE,
        border: BORDER,
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        textAlign: "center",
      }}
    >
      <div style={{ color: ACCENT }}>{icon}</div>
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "13px",
          color: CREAM,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "10px",
          color: CREAM_DIM,
          lineHeight: 1.4,
        }}
      >
        {sublabel}
      </span>
    </div>
  );
}

// ── Skill Pill ─────────────────────────────────────────────────────────────

function SkillPill({ label }: { label: string }) {
  return (
    <span
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "11px",
        color: CREAM,
        border: "1px solid rgba(240,230,211,0.35)",
        borderRadius: "999px",
        padding: "4px 12px",
        display: "inline-block",
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
  );
}

// ── Section Label ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.16em",
        textTransform: "uppercase" as const,
        color: CREAM_DIM,
        margin: "0 0 10px 0",
      }}
    >
      {children}
    </p>
  );
}

// ── Orientation Screen ─────────────────────────────────────────────────────

function OrientationScreen({ payload }: { payload: ChallengePayload }) {
  usePreloadFonts();
  const [, navigate] = useLocation();

  function handleStart() {
    navigate(`/sim?company=${encodeURIComponent(payload.company)}&brand=dev`);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: SKY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Top section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Company badge */}
          <div>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                color: CREAM,
                border: "1px solid rgba(240,230,211,0.35)",
                borderRadius: "999px",
                padding: "4px 14px",
                display: "inline-block",
                letterSpacing: "0.04em",
              }}
            >
              {payload.company}
            </span>
          </div>

          {/* Invite line */}
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "12px",
              color: CREAM_DIM,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            You've been invited to complete a challenge
          </p>

          {/* Role title */}
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "40px",
              fontWeight: 400,
              color: CREAM,
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {payload.roleTitle}
          </h1>
        </div>

        {/* Info cards row */}
        <div style={{ display: "flex", gap: "12px" }}>
          <InfoCard
            icon={<Clock size={20} />}
            label="~20 min"
            sublabel="Estimated time"
          />
          <InfoCard
            icon={<Zap size={20} />}
            label="Live scenario"
            sublabel="Real decisions"
          />
          <InfoCard
            icon={<Shield size={20} />}
            label="No account needed"
            sublabel="Results are yours to share"
          />
        </div>

        {/* Skills section */}
        <div>
          <SectionLabel>Skills being assessed</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {payload.skills.map((skill) => (
              <SkillPill key={skill} label={skill} />
            ))}
          </div>
        </div>

        {/* What to expect section */}
        <div>
          <SectionLabel>What to expect</SectionLabel>
          <ul
            style={{
              margin: 0,
              padding: "0 0 0 18px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {[
              "You'll be dropped into a realistic incident or scenario",
              "Make decisions the same way you would on the job — no trick questions",
              "You'll receive a score breakdown at the end",
            ].map((text) => (
              <li
                key={text}
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: "14px",
                  color: CREAM,
                  lineHeight: 1.6,
                }}
              >
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={handleStart}
          style={{
            width: "100%",
            height: "52px",
            background: ACCENT,
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Start challenge&nbsp; →
        </button>

        {/* Bottom note */}
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "12px",
            color: CREAM_DIM,
            textAlign: "center",
            margin: "-12px 0 0 0",
            lineHeight: 1.5,
          }}
        >
          This challenge was created by {payload.company} using Arena · Your
          results won't be shared unless you choose to.
        </p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ChallengePage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const encoded = params.get("d");

  if (!encoded) return <ErrorState />;

  const payload = decodeChallenge(encoded);
  if (!payload) return <ErrorState />;

  return <OrientationScreen payload={payload} />;
}
