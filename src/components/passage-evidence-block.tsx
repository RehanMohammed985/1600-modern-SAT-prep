"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

type Props = {
  passageText: string;
  evidenceText: string;
};

export function PassageEvidenceBlock({ passageText, evidenceText }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!passageText || !evidenceText) return null;

  const parts = passageText.split(new RegExp(`(${escapeRegex(evidenceText)})`, "gi"));

  return (
    <div className="rounded-xl border border-[#FF7A3D]/20 bg-[#FFF8F3] p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/55">
        <Search className="h-3.5 w-3.5 text-[#FF7A3D]" />
        Evidence in the passage
      </p>
      <div
        className="mt-2 rounded-lg bg-white p-3 text-sm leading-7 text-black/75"
      >
        {parts.map((part, i) => {
          const isMatch = part.toLowerCase() === evidenceText.toLowerCase();
          return isMatch ? (
            <span
              key={i}
              className={`transition-all duration-700 ${
                visible
                  ? "rounded-sm bg-amber-200/60 font-medium text-black underline decoration-amber-500 decoration-2 underline-offset-4"
                  : "rounded-sm bg-amber-100/40"
              }`}
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </div>
      <p className="mt-2 text-xs italic text-black/45">
        The correct answer is supported by this part of the passage.
      </p>
    </div>
  );
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
