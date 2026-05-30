"use client";

import { cn } from "@/lib/utils";

type Props = {
  progress: number;
  label: string;
  sublabel?: string;
  variant?: "focus" | "break" | "default";
  size?: number;
};

export function SessionTimerRing({
  progress,
  label,
  sublabel,
  variant = "default",
  size = 120,
}: Props) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));

  const strokeColor =
    variant === "break"
      ? "#6B9B7A"
      : variant === "focus"
        ? "#111111"
        : "#111111";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-black/8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">{label}</span>
          {sublabel ? <span className="text-xs text-black/45">{sublabel}</span> : null}
        </div>
      </div>
    </div>
  );
}
