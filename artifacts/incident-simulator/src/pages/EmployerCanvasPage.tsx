import { useEffect, useState } from "react";
import { Link, Loader2, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  type ChallengePayload,
  buildChallengeUrl,
} from "@/lib/challenge";

// ── Design tokens ────────────────────────────────────────────────────────
const SKY = "#0a0c11";
const CREAM = "hsl(45 30% 88%)";
const CREAM_HEX = "#F0E6D3";
const CREAM_MUTED = "rgba(240,230,211,0.5)";
const ACCENT = "hsl(24 85% 63%)";
const ACCENT_HEX = "#E08763";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "1px solid rgba(255,255,255,0.08)";

const STORAGE_KEY = "employer.profile";

// ── Hardcoded fallback payload ───────────────────────────────────────────
const FALLBACK_PAYLOAD: ChallengePayload = {
  v: 1,
  roleTitle: "Site Reliability Engineer",
  company: "Acme Corp",
  skills: [
    "Debugging under pressure",
    "Root-cause analysis",
    "Production safety",
    "Incident communication",
    "On-call judgment",
  ],
  scenarioId: "wrong-address",
  generatedAt: new Date().toISOString(),
};

// ── Font preload ─────────────────────────────────────────────────────────
function usePreloadFonts() {
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap";
    const id = "canvas-font-preload";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);
}

// ── Helpers ───────────────────────────────────────────────────────────────
type StoredProfile = {
  roleTitle: string;
  company: string;
  roleContext: string;
  skills: string[];
  aiExpectations: string;
};

function getProfile(): StoredProfile | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return null;
  }
}

function buildPayloadFromProfile(profile: StoredProfile): ChallengePayload {
  return {
    v: 1,
    roleTitle: profile.roleTitle,
    company: profile.company,
    skills: profile.skills,
    scenarioId: "wrong-address",
    generatedAt: new Date().toISOString(),
  };
}

// ── Scenario constants ────────────────────────────────────────────────────
const SCENARIO_TITLE = "Wrong Address";
const SCENARIO_DIFFICULTY = "MEDIUM";
const SCENARIO_TIME = "~20 min";
const SCENARIO_PREMISE = `09:15 UTC — EU customers can't complete checkout. North America is unaffected. No application code was deployed in the last 48 hours. A Terraform run touched infrastructure config this morning, but CI passed clean. The answer is in your infrastructure configuration — but it's subtler than it looks.`;
const SCENARIO_DECISIONS = [
  "Triage: Determine why the failure is region-specific when no code was deployed",
  "Diagnose: Trace the root cause through infrastructure config, not application logs",
  "Isolate: Confirm the blast radius — is this one service or the entire EU stack?",
  "Recover: Roll back or patch forward, and validate without taking EU fully offline",
  "Communicate: Draft a customer-facing status update with accurate scope and ETA",
];
const SCENARIO_SKILLS = [
  "Root-cause analysis",
  "Infrastructure intuition",
  "Blast radius assessment",
  "On-call judgment",
  "Incident communication",
];

// ── Top bar ───────────────────────────────────────────────────────────────
function TopBar({
  isPublished,
  onPublish,
  onGetLink,
}: {
  isPublished: boolean;
  onPublish: () => void;
  onGetLink: () => void;
}) {
  return (
    <div
      style={{
        height: "52px",
        borderBottom: BORDER,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "17px",
            color: CREAM_HEX,
          }}
        >
          Arena
        </span>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            color: CREAM_MUTED,
            letterSpacing: "0.1em",
          }}
        >
          · Challenge Builder
        </span>
        {/* Draft indicator */}
        {!isPublished && (
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: CREAM_MUTED,
              padding: "2px 8px",
              border: "1px solid rgba(240,230,211,0.18)",
              borderRadius: "999px",
              marginLeft: "4px",
            }}
          >
            Draft
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Publish button */}
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublished}
          title={isPublished ? "Already published" : "Publish to make the challenge live"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            background: isPublished ? "rgba(34,197,94,0.12)" : "transparent",
            color: isPublished ? "#4ade80" : CREAM_MUTED,
            border: `1px solid ${isPublished ? "rgba(74,222,128,0.35)" : "rgba(240,230,211,0.18)"}`,
            borderRadius: "999px",
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: isPublished ? "default" : "pointer",
            transition: "all 200ms",
          }}
        >
          {isPublished ? (
            <>
              <Check size={12} />
              Published
            </>
          ) : (
            "Publish"
          )}
        </button>

        {/* Get Challenge Link button */}
        <button
          type="button"
          onClick={onGetLink}
          title={!isPublished ? "Publish first to share a live link" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: isPublished ? ACCENT : "rgba(224,135,99,0.25)",
            color: isPublished ? "#fff" : ACCENT_HEX,
            border: "none",
            borderRadius: "999px",
            fontFamily: "'Space Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: isPublished ? `0 8px 24px -8px ${ACCENT_HEX}80` : "none",
            transition: "all 200ms",
          }}
        >
          <Link size={13} />
          Get Challenge Link
        </button>
      </div>
    </div>
  );
}

// ── Left sidebar ──────────────────────────────────────────────────────────
function LeftSidebar({ profile }: { profile: StoredProfile | null }) {
  const roleTitle = profile?.roleTitle ?? FALLBACK_PAYLOAD.roleTitle;
  const company = profile?.company ?? FALLBACK_PAYLOAD.company;
  const roleContext = profile?.roleContext ?? "High-stakes infrastructure environment where judgment under pressure determines service reliability.";
  const skills = profile?.skills ?? FALLBACK_PAYLOAD.skills;

  const truncatedContext =
    roleContext.length > 200 ? roleContext.slice(0, 200) + "..." : roleContext;

  const chips = [
    "Make it harder",
    "Add red herrings",
    "Change tech stack",
    "Simplify premise",
    "Add a stakeholder",
  ];

  return (
    <div
      style={{
        borderRight: BORDER,
        padding: "24px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
      <h2
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: "20px",
          color: CREAM_HEX,
          margin: 0,
        }}
      >
        Refine
      </h2>

      {/* Original request bubble */}
      <div
        style={{
          background: SURFACE,
          border: BORDER,
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: CREAM_MUTED,
            marginBottom: "4px",
          }}
        >
          Original request
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: CREAM_HEX,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: CREAM_MUTED }}>Role: </span>
            {roleTitle}
            {company ? ` · ${company}` : ""}
          </div>
          <div
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "12px",
              color: CREAM_MUTED,
              lineHeight: 1.5,
              wordBreak: "break-word",
              overflowWrap: "break-word",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            } as React.CSSProperties}
          >
            <span style={{ color: CREAM_MUTED, fontFamily: "'Space Mono', monospace", fontSize: "11px" }}>Context: </span>
            {truncatedContext}
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              color: CREAM_MUTED,
              lineHeight: 1.6,
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            <span style={{ display: "block", marginBottom: "2px" }}>Generated scenario for:</span>
            {skills.join(", ")}
          </div>
        </div>
      </div>

      {/* Quick-action chips */}
      <div
        style={{
          overflowX: "auto",
          display: "flex",
          gap: "8px",
          paddingBottom: "4px",
        }}
      >
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: "999px",
              border: BORDER,
              background: "transparent",
              color: CREAM_MUTED,
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              opacity: 0.4,
              cursor: "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        disabled
        rows={4}
        placeholder="What would you like to change?"
        style={{
          width: "100%",
          background: SURFACE,
          border: BORDER,
          borderRadius: "8px",
          padding: "12px",
          color: CREAM_MUTED,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          resize: "none",
          cursor: "not-allowed",
          boxSizing: "border-box",
        }}
      />

      {/* Regenerate button */}
      <button
        type="button"
        disabled
        style={{
          width: "100%",
          padding: "10px",
          background: SURFACE,
          border: BORDER,
          borderRadius: "8px",
          color: CREAM_MUTED,
          fontFamily: "'Space Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "not-allowed",
          opacity: 0.5,
        }}
      >
        Regenerate
      </button>
    </div>
  );
}

// ── Scenario overview tab ─────────────────────────────────────────────────
function OverviewTab() {
  return (
    <div
      style={{
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        overflowY: "auto",
        flex: 1,
      }}
    >
      {/* Title + meta row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: CREAM_MUTED,
              marginBottom: "6px",
            }}
          >
            Scenario title
          </div>
          <h2
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "28px",
              color: CREAM_HEX,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {SCENARIO_TITLE}
          </h2>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
          {/* Difficulty badge */}
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "999px",
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: "rgb(252,165,165)",
              fontFamily: "'Space Mono', monospace",
              fontSize: "9.5px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {SCENARIO_DIFFICULTY}
          </span>
          {/* Time badge */}
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "999px",
              background: SURFACE,
              border: BORDER,
              color: CREAM_MUTED,
              fontFamily: "'Space Mono', monospace",
              fontSize: "9.5px",
              letterSpacing: "0.12em",
            }}
          >
            {SCENARIO_TIME}
          </span>
        </div>
      </div>

      {/* Premise */}
      <div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: CREAM_MUTED,
            marginBottom: "10px",
          }}
        >
          Premise
        </div>
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            lineHeight: 1.7,
            color: CREAM_HEX,
            margin: 0,
          }}
        >
          {SCENARIO_PREMISE}
        </p>
      </div>

      {/* Key decisions */}
      <div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: CREAM_MUTED,
            marginBottom: "12px",
          }}
        >
          Key decisions
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: "0",
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {SCENARIO_DECISIONS.map((decision, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                  color: ACCENT,
                  flexShrink: 0,
                  paddingTop: "2px",
                  minWidth: "20px",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: "13.5px",
                  color: CREAM_HEX,
                  lineHeight: 1.55,
                }}
              >
                {decision}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Skills tested */}
      <div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: CREAM_MUTED,
            marginBottom: "12px",
          }}
        >
          Skills tested
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {SCENARIO_SKILLS.map((skill) => (
            <span
              key={skill}
              style={{
                padding: "5px 14px",
                borderRadius: "999px",
                border: `1px solid ${CREAM_HEX}40`,
                color: CREAM_HEX,
                fontFamily: "'Space Mono', monospace",
                fontSize: "10.5px",
                letterSpacing: "0.06em",
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Live preview tab ──────────────────────────────────────────────────────
function LivePreviewTab() {
  const iframeSrc = "/sim?company=Acme+Corp&brand=dev";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
      }}
    >
      {/* Preview banner */}
      <div
        style={{
          background: "rgba(224,135,99,0.15)",
          borderBottom: "1px solid rgba(224,135,99,0.3)",
          padding: "8px 16px",
          fontFamily: "'Space Mono', monospace",
          fontSize: "11px",
          color: ACCENT,
          flexShrink: 0,
        }}
      >
        👁 Employer Preview · Candidates won't see this bar
      </div>
      {/* iframe */}
      <iframe
        src={iframeSrc}
        title="Simulator preview"
        style={{
          width: "100%",
          height: "calc(100vh - 52px - 40px - 44px)",
          border: "none",
          flex: 1,
        }}
      />
    </div>
  );
}

// ── Loading overlay ───────────────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        background: SKY,
        zIndex: 10,
      }}
    >
      <Loader2
        size={28}
        style={{
          color: CREAM_MUTED,
          animation: "spin 1s linear infinite",
        }}
      />
      <p
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "12px",
          color: CREAM_MUTED,
          letterSpacing: "0.08em",
          margin: 0,
        }}
      >
        Generating your challenge scenario...
      </p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function EmployerCanvasPage() {
  usePreloadFonts();

  const [isLoading, setIsLoading] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "preview">("overview");
  const { toast } = useToast();

  // 3-second fake loading on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const profile = getProfile();

  function handlePublish() {
    setIsPublished(true);
    toast({ description: "Challenge published — the link is now live." });
  }

  function handleGetLink() {
    if (!isPublished) {
      toast({ description: "Publish the challenge first, then share the link." });
      return;
    }
    const payload: ChallengePayload = profile
      ? buildPayloadFromProfile(profile)
      : { ...FALLBACK_PAYLOAD, generatedAt: new Date().toISOString() };

    const url = buildChallengeUrl(payload);
    navigator.clipboard.writeText(url).catch(() => {
      // Clipboard API may fail in non-secure contexts; silent fail for demo
    });
    toast({
      description: "Challenge link copied — paste it anywhere you hire",
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: SKY,
        color: CREAM,
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <TopBar isPublished={isPublished} onPublish={handlePublish} onGetLink={handleGetLink} />

      {/* Body: sidebar + right panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left sidebar */}
        <LeftSidebar profile={profile} />

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
          {isLoading ? (
            <LoadingOverlay />
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "overview" | "preview")}
              style={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              {/* Tab bar */}
              <TabsList
                style={{
                  background: "transparent",
                  borderBottom: BORDER,
                  borderRadius: 0,
                  height: "44px",
                  padding: "0 24px",
                  justifyContent: "flex-start",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <TabsTrigger
                  value="overview"
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    borderRadius: "6px",
                    padding: "4px 12px",
                  }}
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    borderRadius: "6px",
                    padding: "4px 12px",
                  }}
                >
                  Live Preview
                </TabsTrigger>
              </TabsList>

              {/* Tab content */}
              <TabsContent
                value="overview"
                style={{ flex: 1, overflow: "hidden", margin: 0, display: "flex", flexDirection: "column" }}
              >
                <OverviewTab />
              </TabsContent>

              <TabsContent
                value="preview"
                style={{ flex: 1, overflow: "hidden", margin: 0, display: "flex", flexDirection: "column" }}
              >
                <LivePreviewTab />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
