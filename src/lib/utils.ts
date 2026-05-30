import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSkillTag(tag: string) {
  return tag
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDatabaseQuestionId(id: string): boolean {
  return UUID_RE.test(id);
}

export function isSessionQuestionId(id: string): boolean {
  return isDatabaseQuestionId(id) || id.startsWith("reading-set-");
}
