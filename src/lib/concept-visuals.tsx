import type { ComponentType } from "react";
import type { Question } from "./types";

type VisualProps = { className?: string };

function LinearGraph({ className }: VisualProps) {
  return (
    <svg viewBox="0 0 240 120" className={className} aria-hidden>
      <line x1="20" y1="100" x2="220" y2="100" stroke="#111" strokeWidth="2" />
      <line x1="20" y1="100" x2="20" y2="20" stroke="#111" strokeWidth="2" />
      <line x1="20" y1="80" x2="180" y2="30" stroke="#FF7A3D" strokeWidth="3" />
      <circle cx="20" cy="80" r="4" fill="#111" />
      <circle cx="180" cy="30" r="4" fill="#FF7A3D" />
      <text x="100" y="115" fontSize="11" fill="#666">
        x →
      </text>
      <text x="8" y="60" fontSize="11" fill="#666" transform="rotate(-90 8 60)">
        y
      </text>
    </svg>
  );
}

function RatioBars({ className }: VisualProps) {
  return (
    <svg viewBox="0 0 240 100" className={className} aria-hidden>
      <rect x="30" y="30" width="80" height="40" rx="6" fill="#111" opacity="0.85" />
      <rect x="130" y="45" width="40" height="25" rx="6" fill="#FF7A3D" />
      <text x="70" y="55" textAnchor="middle" fontSize="12" fill="white">
        part
      </text>
      <text x="150" y="62" textAnchor="middle" fontSize="11" fill="white">
        ?
      </text>
      <text x="120" y="90" textAnchor="middle" fontSize="11" fill="#666">
        compare parts to the whole
      </text>
    </svg>
  );
}

function Triangle({ className }: VisualProps) {
  return (
    <svg viewBox="0 0 240 120" className={className} aria-hidden>
      <polygon points="120,20 200,100 40,100" fill="none" stroke="#111" strokeWidth="2" />
      <text x="115" y="15" fontSize="11" fill="#666">
        height
      </text>
      <line x1="120" y1="20" x2="120" y2="100" stroke="#FF7A3D" strokeDasharray="4 3" />
      <text x="50" y="115" fontSize="11" fill="#666">
        base
      </text>
    </svg>
  );
}

function PassageLines({ className }: VisualProps) {
  return (
    <svg viewBox="0 0 240 80" className={className} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="20" y={12 + i * 16} width={160 - i * 20} height="8" rx="4" fill="#E8E4DC" />
          {i === 1 ? (
            <rect x="100" y={10 + i * 16} width="36" height="12" rx="3" fill="#FF7A3D" opacity="0.7" />
          ) : null}
        </g>
      ))}
      <text x="120" y="76" textAnchor="middle" fontSize="10" fill="#666">
        underline evidence in the passage
      </text>
    </svg>
  );
}

function GenericSteps({ className }: VisualProps) {
  return (
    <svg viewBox="0 0 240 80" className={className} aria-hidden>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={50 + i * 70} cy="35" r="18" fill={i === 1 ? "#FF7A3D" : "#111"} opacity={i === 1 ? 1 : 0.75} />
          <text x={50 + i * 70} y="40" textAnchor="middle" fontSize="13" fill="white">
            {i + 1}
          </text>
          {i < 2 ? (
            <line x1={68 + i * 70} y1="35" x2={82 + i * 70} y2="35" stroke="#999" strokeWidth="2" />
          ) : null}
        </g>
      ))}
      <text x="120" y="70" textAnchor="middle" fontSize="10" fill="#666">
        read → plan → check
      </text>
    </svg>
  );
}

const SKILL_VISUAL: Record<string, ComponentType<VisualProps>> = {
  "algebra-linear": LinearGraph,
  "percent-ratios": RatioBars,
  "geometry-basics": Triangle,
  "functions": LinearGraph,
  "reading-main-idea": PassageLines,
  "reading-evidence": PassageLines,
  "reading-vocabulary": PassageLines,
  "reading-inference": PassageLines,
};

export function ConceptVisual({
  skill,
  section,
  className = "mx-auto h-28 w-full max-w-xs",
}: {
  skill: string;
  section: "math" | "reading";
  className?: string;
}) {
  const Visual = SKILL_VISUAL[skill] ?? (section === "reading" ? PassageLines : GenericSteps);
  return (
    <div className="rounded-xl border border-black/8 bg-white p-3">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-black/45">
        Picture it
      </p>
      <Visual className={className} />
    </div>
  );
}

export function hasConceptVisual(skill: string, section: "math" | "reading"): boolean {
  return Boolean(SKILL_VISUAL[skill]) || section === "reading";
}
