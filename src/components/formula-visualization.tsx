"use client";

type Props = {
  formula: string;
  latex?: string | null;
  label?: string;
};

export function FormulaVisualization({ formula, latex, label = "Formula" }: Props) {
  const display = latex?.trim() || formula;

  return (
    <div className="overflow-hidden rounded-xl border border-[#111111]/10 bg-gradient-to-br from-white to-[#F7F4EE]">
      <p className="border-b border-black/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-black/45">
        {label}
      </p>
      <div className="px-4 py-4">
        <p className="text-center font-mono text-lg leading-relaxed tracking-tight text-[#111111]">
          {display}
        </p>
        {latex && latex !== formula ? (
          <p className="mt-3 border-t border-black/5 pt-3 text-center text-sm leading-6 text-black/55">
            {formula}
          </p>
        ) : null}
      </div>
    </div>
  );
}
