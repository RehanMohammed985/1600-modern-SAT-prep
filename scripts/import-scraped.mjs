#!/usr/bin/env node

/**
 * Import scraped SAT questions into the database.
 *
 * Reads JSON files from a directory (default: sat-scraped/) and imports
 * them into the Supabase questions table via the question-importer.
 *
 * Usage:
 *   node scripts/import-scraped.mjs [--dir sat-scraped] [--upsert]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * to be set in .env.local (loaded via next env).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const ARGS = process.argv.slice(2);
const DIR = ARGS.find((a) => a.startsWith("--dir="))?.split("=")[1]
  ?? ARGS[ARGS.indexOf("--dir") + 1]
  ?? "sat-scraped";
const UPSERT = ARGS.includes("--upsert");

async function loadDotEnv() {
  try {
    const env = await fs.readFile(".env.local", "utf-8");
    for (const line of env.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  } catch {
    console.log("  No .env.local found, checking process.env...");
  }
}

async function main() {
  await loadDotEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set");
    process.exit(1);
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Using service_role key (bypasses RLS)");
  } else {
    console.log("Using anon key (may need INSERT grant on questions table)");
  }

  const dir = path.resolve(DIR);
  let files;
  try {
    files = await fs.readdir(dir);
  } catch {
    console.error(`Directory not found: ${dir}`);
    console.log(`Run the scraper first: node scripts/sat-scraper.mjs`);
    process.exit(1);
  }

  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();
  if (!jsonFiles.length) {
    console.log(`No JSON files found in ${dir}`);
    return;
  }

  console.log(`Importing from ${jsonFiles.length} file(s) in ${dir}...\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors = [];

  const BASE_COLUMNS = [
    "prompt", "choices", "correct_answer", "explanation",
    "skill_tag", "difficulty", "estimated_seconds", "section",
  ];

  const EXTRA_COLUMNS = [
    "question_text", "subskill", "test_type", "concept_explanation",
    "formula_or_rule", "underlying_concept", "common_mistakes", "mistake_types",
    "status", "variation_type", "generated_by", "validation_status", "content_hash",
    "passage_text", "passage_topic", "reading_skill", "passage_difficulty",
    "passage_tone", "passage_read_time_seconds", "formula_latex", "question_style",
    "common_mistake_explanation", "blueprint_hash", "parent_question_id",
  ];

  function buildRow(q, contentHash, available) {
    const row = {
      prompt: q.questionText ?? q.prompt ?? "",
      choices: q.choices ?? [],
      correct_answer: q.correctAnswer ?? q.correct_answer ?? "",
      explanation: q.explanation ?? "",
      skill_tag: q.skill ?? q.skill_tag ?? "algebra-linear",
      difficulty: q.difficulty ?? 2,
      estimated_seconds: q.estimatedTime ?? q.estimated_time ?? 90,
      section: q.section ?? "math",
    };
    if (available.has("question_text")) row.question_text = q.questionText ?? q.prompt ?? "";
    if (available.has("subskill")) row.subskill = q.subskill ?? null;
    if (available.has("test_type")) row.test_type = "sat";
    if (available.has("concept_explanation")) row.concept_explanation = q.conceptExplanation ?? null;
    if (available.has("formula_or_rule")) row.formula_or_rule = q.formulaOrRule ?? null;
    if (available.has("underlying_concept")) row.underlying_concept = q.underlyingConcept ?? null;
    if (available.has("common_mistakes")) row.common_mistakes = q.commonMistakes ?? [];
    if (available.has("mistake_types")) row.mistake_types = q.mistakeTypes ?? ["careless"];
    if (available.has("status")) row.status = "active";
    if (available.has("variation_type")) row.variation_type = "base";
    if (available.has("generated_by")) row.generated_by = "manual";
    if (available.has("validation_status")) row.validation_status = "pending";
    if (available.has("content_hash")) row.content_hash = contentHash;
    if (available.has("passage_text")) row.passage_text = q.passageText ?? q.passage_text ?? null;
    if (available.has("passage_topic")) row.passage_topic = q.passageTopic ?? q.passage_topic ?? null;
    if (available.has("reading_skill")) row.reading_skill = q.readingSkill ?? q.reading_skill ?? null;
    return row;
  }

  async function tryImport(row) {
    const url = `${supabaseUrl}/rest/v1/questions`;
    const params = UPSERT ? "?on_conflict=content_hash" : "";

    const res = await fetch(`${url}${params}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": params ? "resolution=merge-duplicates" : "return=minimal",
      },
      body: JSON.stringify(row),
    });

    const success = res.ok || res.status === 409;
    const text = success ? "" : await res.text().catch(() => "");
    return { success, error: success ? null : `HTTP ${res.status}: ${(text || "").slice(0, 120)}` };
  }

  for (const file of jsonFiles) {
    const filePath = path.join(dir, file);
    let content;
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch (err) {
      console.error(`  Cannot read ${file}: ${err.message}`);
      continue;
    }

    let data;
    try {
      data = JSON.parse(content);
    } catch {
      console.error(`  Invalid JSON in ${file}`);
      continue;
    }

    const questions = data.questions ?? data.data ?? data.items ?? (Array.isArray(data) ? data : [data]);
    if (!questions.length) {
      console.log(`  ${file}: 0 questions`);
      continue;
    }

    // Probe which extra columns exist (try each individually)
    const available = new Set(BASE_COLUMNS);
    for (const col of EXTRA_COLUMNS) {
      const probe = { prompt: `__probe__${col}`, choices: ["a"], correct_answer: "a", explanation: "x", skill_tag: "test", difficulty: 1, estimated_seconds: 10, section: "math" };
      probe[col] = null;
      const { success } = await tryImport(probe);
      if (success) {
        available.add(col);
        // Clean up probe
        await fetch(`${supabaseUrl}/rest/v1/questions?prompt=eq.__probe__${encodeURIComponent(col)}`, {
          method: "DELETE",
          headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
        }).catch(() => {});
      }
    }
    console.log(`  Detected ${available.size} columns`);

    for (const q of questions) {
      const contentHash = simpleHash(q.questionText ?? q.prompt ?? "");
      const row = buildRow(q, contentHash, available);

      const { success, error } = await tryImport(row);
      if (success) {
        totalImported++;
      } else {
        allErrors.push(error);
        totalSkipped++;
      }
    }

    console.log(`  ${file}: ${questions.length} processed`);
  }

  console.log(`\n✓ ${totalImported} imported, ${totalSkipped} skipped`);

  if (allErrors.length) {
    console.log(`\nErrors (${allErrors.length}):`);
    for (const err of allErrors.slice(0, 10)) {
      console.log(`  - ${err}`);
    }
    if (allErrors.length > 10) {
      console.log(`  ... and ${allErrors.length - 10} more`);
    }
  }
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `scraped-${Math.abs(hash).toString(36)}`;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
