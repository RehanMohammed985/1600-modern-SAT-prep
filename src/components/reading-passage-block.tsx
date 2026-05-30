"use client";

import type { ReadingPassageMeta } from "@/lib/types";
import { formatSkillTag } from "@/lib/utils";

type Props = {
  passage: ReadingPassageMeta;
};

export function ReadingPassageBlock({ passage }: Props) {
  const readMin = Math.max(1, Math.round(passage.estimatedReadSeconds / 60));

  return (
    <div className="mb-8 rounded-xl border border-black/10 bg-[#FCFBF8] p-5 md:p-6">
      <div className="mb-4 flex flex-wrap gap-2 text-xs text-black/50">
        {passage.topic ? (
          <span className="rounded-full bg-white px-3 py-1">Topic: {passage.topic}</span>
        ) : null}
        {passage.tone ? (
          <span className="rounded-full bg-white px-3 py-1">Tone: {passage.tone}</span>
        ) : null}
        <span className="rounded-full bg-white px-3 py-1">
          Difficulty: {passage.difficulty}/5
        </span>
        {passage.readingSkill ? (
          <span className="rounded-full bg-white px-3 py-1">
            Skill: {formatSkillTag(passage.readingSkill)}
          </span>
        ) : null}
        <span className="rounded-full bg-[#111111] px-3 py-1 text-white">
          ~{readMin} min read
        </span>
      </div>
      <p className="text-sm leading-8 text-black/80 whitespace-pre-wrap">{passage.passageText}</p>
    </div>
  );
}
