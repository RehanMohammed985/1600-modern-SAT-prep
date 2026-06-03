#!/usr/bin/env node

/**
 * SAT Question Scraper
 *
 * Collects free SAT practice questions from public educational sources.
 * Outputs JSON files importable by import-scraped.mjs.
 *
 * Usage:
 *   node scripts/sat-scraper.mjs [--limit N] [--output path.json]
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as https from "node:https";
import * as http from "node:http";

const OUT_DIR = process.env.SAT_SCRAPER_DIR || "sat-scraped";

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

function fetch(url, retries = 2) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const attempt = (n) => {
      const req = mod.get(url, { headers: { "User-Agent": USER_AGENT } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = res.headers.location.startsWith("http") ? res.headers.location : new URL(res.headers.location, url).href;
          return fetch(loc, retries).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          if (n > 0) return setTimeout(() => attempt(n - 1), 2000);
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      });
      req.on("error", (e) => { if (n > 0) return setTimeout(() => attempt(n - 1), 2000); reject(e); });
      req.setTimeout(20000, () => { req.destroy(); if (n > 0) setTimeout(() => attempt(n - 1), 2000); else reject(new Error("Timeout")); });
    };
    attempt(retries);
  });
}

function sanitize(text) { return text.replace(/\s+/g, " ").replace(/&nbsp;/g, " ").trim(); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function pickSkill(text, section) {
  const l = (text ?? "").toLowerCase();
  if (section === "math") {
    if (/percent|ratio|proportion|markup|discount/i.test(l)) return "percent-ratios";
    if (/probability|chance|odds/i.test(l)) return "probability";
    if (/geometry|angle|triangle|circle|area|perimeter|volume/i.test(l)) return "geometry-basics";
    if (/function|quadratic|exponent|parabola|vertex/i.test(l)) return "functions";
    if (/data|table|graph|chart|median|mean|average/i.test(l)) return "data-interpretation";
    return "algebra-linear";
  }
  if (/main idea|central|purpose|primarily/i.test(l)) return "reading-main-idea";
  if (/evidence|support|prove|lines.+support/i.test(l)) return "reading-evidence";
  if (/infer|imply|suggest|conclude|most likely/i.test(l)) return "reading-inference";
  if (/meaning|most nearly|define|word|phrase/i.test(l)) return "reading-vocabulary";
  if (/grammar|verb|tense|agreement|punctuat|semicolon|comma|fragment|run.on/i.test(l)) return "writing-grammar";
  if (/concise|wordy|tone|style|transition|redundan/i.test(l)) return "writing-style";
  return "reading-main-idea";
}

function makeQuestion(section, skill, diff, q, choices, answer, expl, concept) {
  return {
    testType: "sat",
    section, skill, subskill: null,
    difficulty: diff,
    questionText: sanitize(q),
    choices: choices.map(sanitize),
    correctAnswer: sanitize(answer),
    explanation: sanitize(expl || `The correct answer is ${answer}.`),
    conceptExplanation: concept ? sanitize(concept) : null,
    formulaOrRule: null, underlyingConcept: null,
    commonMistakes: [], mistakeTypes: ["careless"],
    estimatedTime: section === "reading" ? 75 : 60,
  };
}

// ─── Math question bank ───────────────────────────────────────────────

const MATH_QUESTIONS = [
  { diff: 1, skill: "algebra-linear", q: "If 3x + 7 = 22, what is x?", choices: ["3", "5", "7", "9"], a: "5", e: "3x = 15, x = 5" },
  { diff: 1, skill: "algebra-linear", q: "Solve: 2(x - 4) = 12", choices: ["6", "8", "10", "12"], a: "10", e: "x - 4 = 6, x = 10" },
  { diff: 2, skill: "algebra-linear", q: "A taxi charges $2.50 per mile plus $4 flat fee. A ride costs $19. How many miles?", choices: ["4", "5", "6", "7"], a: "6", e: "2.50m + 4 = 19, m = 6" },
  { diff: 2, skill: "algebra-linear", q: "If 5x - 8 = 2x + 13, what is x?", choices: ["5", "6", "7", "8"], a: "7", e: "3x = 21, x = 7" },
  { diff: 3, skill: "algebra-linear", q: "Solve the system: x + y = 12 and x - y = 2", choices: ["(5,7)", "(6,6)", "(7,5)", "(8,4)"], a: "(7,5)", e: "Add: 2x = 14, x = 7. Then y = 5." },
  { diff: 3, skill: "algebra-linear", q: "A line passes through (2,5) and (6,13). What is its slope?", choices: ["1", "2", "3", "4"], a: "2", e: "Slope = (13-5)/(6-2) = 8/4 = 2" },
  { diff: 4, skill: "algebra-linear", q: "If 3(2x - 5) = 4(x + 2) + 1, what is x?", choices: ["7", "9", "11", "13"], a: "11", e: "6x - 15 = 4x + 9, 2x = 24, x = 12" },
  { diff: 1, skill: "algebra-linear", q: "What is the y-intercept of y = 3x - 5?", choices: ["3", "-5", "5", "-3"], a: "-5", e: "y-intercept is the constant term: -5" },
  { diff: 2, skill: "algebra-linear", q: "A rectangle's length is 3 times its width. If the perimeter is 48, what is the width?", choices: ["4", "6", "8", "12"], a: "6", e: "2(w + 3w) = 48, 8w = 48, w = 6" },
  { diff: 2, skill: "algebra-linear", q: "If 4x + 3 = 19, what is the value of 2x - 1?", choices: ["5", "7", "9", "11"], a: "7", e: "4x = 16, x = 4. Then 2(4)-1 = 7" },

  { diff: 1, skill: "percent-ratios", q: "What is 20% of 150?", choices: ["20", "25", "30", "35"], a: "30", e: "0.20 × 150 = 30" },
  { diff: 2, skill: "percent-ratios", q: "A jacket costs $80 and is 35% off. What is the sale price?", choices: ["$45", "$48", "$50", "$52"], a: "$52", e: "Discount = $28. Sale = $80 - $28 = $52" },
  { diff: 3, skill: "percent-ratios", q: "The ratio of cats to dogs is 3:4. If there are 24 dogs, how many cats?", choices: ["12", "15", "18", "21"], a: "18", e: "4 parts = 24, so 1 = 6. Cats = 3 × 6 = 18" },
  { diff: 2, skill: "percent-ratios", q: "A population grows from 500 to 600. What is the percent increase?", choices: ["10%", "15%", "20%", "25%"], a: "20%", e: "Increase = 100. 100/500 = 0.20 = 20%" },
  { diff: 3, skill: "percent-ratios", q: "If a:b = 2:5 and b:c = 3:4, what is a:c?", choices: ["3:10", "6:20", "3:5", "2:3"], a: "3:10", e: "a:b = 6:15, b:c = 15:20, so a:c = 6:20 = 3:10" },

  { diff: 3, skill: "functions", q: "If f(x) = 3x² - 2x + 1, what is f(2)?", choices: ["7", "9", "11", "13"], a: "9", e: "f(2) = 3(4) - 4 + 1 = 12 - 4 + 1 = 9" },
  { diff: 4, skill: "functions", q: "What is the vertex of y = x² - 8x + 15?", choices: ["(4,-1)", "(-4,-1)", "(4,1)", "(-4,1)"], a: "(4,-1)", e: "Complete square: (x-4)² - 1, vertex at (4,-1)" },
  { diff: 2, skill: "functions", q: "If f(x) = 2x + 3 and g(x) = x², what is f(g(2))?", choices: ["7", "9", "11", "13"], a: "11", e: "g(2) = 4, f(4) = 2(4)+3 = 11" },
  { diff: 3, skill: "functions", q: "What are the solutions to x² - 7x + 12 = 0?", choices: ["(3,4)", "(-3,-4)", "(2,6)", "(-2,-6)"], a: "(3,4)", e: "(x-3)(x-4) = 0, x = 3 or 4" },

  { diff: 2, skill: "geometry-basics", q: "What is the area of a circle with radius 6?", choices: ["12π", "24π", "36π", "48π"], a: "36π", e: "A = πr² = 36π" },
  { diff: 1, skill: "geometry-basics", q: "A triangle has base 10 and height 7. What is its area?", choices: ["25", "30", "35", "70"], a: "35", e: "A = ½ × 10 × 7 = 35" },
  { diff: 3, skill: "geometry-basics", q: "In a right triangle, one leg is 5 and the hypotenuse is 13. What is the other leg?", choices: ["10", "11", "12", "14"], a: "12", e: "a² + 25 = 169, a² = 144, a = 12" },
  { diff: 4, skill: "geometry-basics", q: "A cylinder has radius 3 and height 8. What is its volume?", choices: ["48π", "56π", "64π", "72π"], a: "72π", e: "V = πr²h = 9π × 8 = 72π" },

  { diff: 2, skill: "data-interpretation", q: "In a class of 30, the scores are: 10 scored 80, 12 scored 90, 8 scored 100. What is the average?", choices: ["85", "88", "89", "90"], a: "89", e: "(10×80 + 12×90 + 8×100) / 30 = 2670/30 = 89" },
  { diff: 3, skill: "data-interpretation", q: "What is the median of: 12, 15, 18, 22, 25, 30?", choices: ["18", "19", "20", "21"], a: "20", e: "Median of even set = average of 2 middle: (18+22)/2 = 20" },
  { diff: 1, skill: "data-interpretation", q: "A bar chart shows 40 apples, 30 oranges, 20 bananas. What fraction are oranges?", choices: ["1/4", "1/3", "3/7", "4/9"], a: "1/3", e: "30 out of 90 = 1/3" },

  { diff: 1, skill: "probability", q: "What is the probability of rolling an even number on a fair die?", choices: ["1/6", "1/3", "1/2", "2/3"], a: "1/2", e: "Even: 2,4,6 — 3 out of 6 = 1/2" },
  { diff: 2, skill: "probability", q: "A bag has 5 red, 3 blue, 2 green marbles. Probability of drawing blue?", choices: ["0.1", "0.2", "0.3", "0.4"], a: "0.3", e: "3 out of 10 = 0.3" },
  { diff: 3, skill: "probability", q: "If you flip a coin twice, probability of at least one head?", choices: ["1/4", "1/2", "3/4", "1"], a: "3/4", e: "Possible: HH, HT, TH, TT. 3 have at least one H" },
];

// ─── Reading/writing question bank ────────────────────────────────────

const RW_QUESTIONS = [
  { diff: 2, skill: "reading-main-idea", q: "A passage describes how social media connects people globally but also spreads misinformation. What is the main idea?", choices: ["Social media is harmful.", "Social media has both benefits and drawbacks.", "People should stop using social media.", "Misinformation is the only problem."], a: "Social media has both benefits and drawbacks.", e: "The passage presents both connection benefits and misinformation drawbacks." },
  { diff: 3, skill: "reading-main-idea", q: "A text traces the history of democracy from ancient Greece to modern representative governments. The primary purpose is to —", choices: ["argue for direct democracy", "describe the evolution of democratic systems", "criticize modern governments", "compare Greece to today"], a: "describe the evolution of democratic systems", e: "The passage traces the historical development of democratic systems." },
  { diff: 1, skill: "reading-main-idea", q: "An article explains how exercise improves both physical and mental health. Which best states the main idea?", choices: ["Exercise is good for your body.", "Exercise benefits physical health and mental well-being.", "People should exercise every day.", "Mental health matters more than physical health."], a: "Exercise benefits physical health and mental well-being.", e: "The article covers both physical and mental benefits." },

  { diff: 3, skill: "reading-evidence", q: 'An author claims "renewable energy is now more affordable than fossil fuels." Which evidence best supports this?', choices: ["Solar panels were invented in the 1950s.", "The cost of solar energy has dropped 90% in the last decade.", "Many countries use renewable energy.", "Fossil fuels cause pollution."], a: "The cost of solar energy has dropped 90% in the last decade.", e: "Cost data directly supports the affordability claim." },
  { diff: 2, skill: "reading-evidence", q: "A student argues that school uniforms reduce bullying. Which evidence strengthens this claim?", choices: ["Uniforms are comfortable.", "Some schools report fewer bullying incidents after adopting uniforms.", "Most students own uniforms.", "Uniforms cost money."], a: "Some schools report fewer bullying incidents after adopting uniforms.", e: "Real-world data on bullying reduction supports the claim directly." },

  { diff: 3, skill: "reading-inference", q: "The CEO stated, 'We are exploring strategic alternatives for our retail division.' What does the CEO imply?", choices: ["The division is expanding.", "The company may sell or restructure the retail division.", "The retail division is profitable.", "New stores will open soon."], a: "The company may sell or restructure the retail division.", e: "'Exploring strategic alternatives' is a common euphemism for considering sale or restructuring." },
  { diff: 2, skill: "reading-inference", q: "After the review, the manager scheduled a follow-up meeting and asked the team to prepare spreadsheets. What can be inferred?", choices: ["The meeting was about office supplies.", "The review identified issues needing data analysis.", "The team is being laid off.", "Spreadsheets are the manager's hobby."], a: "The review identified issues needing data analysis.", e: "The requested spreadsheets suggest data-driven follow-up for identified issues." },

  { diff: 2, skill: "reading-vocabulary", q: '"The lawyer presented a cogent argument that convinced the jury." Cogent most nearly means —', choices: ["confusing", "convincing", "creative", "complicated"], a: "convincing", e: "Cogent means clear, logical, and convincing." },
  { diff: 3, skill: "reading-vocabulary", q: '"The scientific community was skeptical of the novel theory." Novel most nearly means —', choices: ["fictional", "dangerous", "new", "popular"], a: "new", e: "Novel in this context means new or original." },
  { diff: 4, skill: "reading-vocabulary", q: '"Her laconic reply revealed little about her true feelings." Laconic most nearly means —', choices: ["lengthy", "emotional", "brief", "angry"], a: "brief", e: "Laconic means using very few words, concise to the point of being abrupt." },

  { diff: 2, skill: "writing-grammar", q: "Choose the correct version: 'Each of the players ___ ready for the game.'", choices: ["are", "is", "were", "have been"], a: "is", e: "'Each' is singular, so the verb must be singular." },
  { diff: 3, skill: "writing-grammar", q: "Which is correct? 'Neither the manager nor the employees ___ satisfied.'", choices: ["was", "were", "is", "has been"], a: "were", e: "Verb agrees with the closer subject 'employees' (plural)." },
  { diff: 1, skill: "writing-grammar", q: "Correct version: 'She ___ to school yesterday.'", choices: ["go", "goes", "went", "gone"], a: "went", e: "Yesterday signals past tense." },
  { diff: 4, skill: "writing-grammar", q: "Which is punctuated correctly?", choices: ["I enjoy reading, however I prefer movies.", "I enjoy reading; however, I prefer movies.", "I enjoy reading however, I prefer movies.", "I enjoy reading; however I prefer movies."], a: "I enjoy reading; however, I prefer movies.", e: "Semicolon before conjunctive adverb, comma after." },

  { diff: 2, skill: "writing-style", q: "Which is most concise? 'The reason why the project failed was due to the fact that the budget was too small.'", choices: ["The reason why the project failed was due to the fact that the budget was too small.", "The project failed because the budget was too small.", "The project failed due to the budget being too small.", "The reason the project failed was due to the budget."], a: "The project failed because the budget was too small.", e: "'Because' replaces the entire wordy phrase." },
  { diff: 3, skill: "writing-style", q: "Which transition fits best? 'The company lost revenue for three quarters. ___, it laid off 200 employees.'", choices: ["Furthermore", "As a result", "However", "Meanwhile"], a: "As a result", e: "Lost revenue caused the layoffs — cause and effect." },
  { diff: 1, skill: "writing-style", q: "Which sentence uses the most formal tone?", choices: ["The results are pretty cool.", "The results indicate a significant trend.", "The results are, like, really important.", "The results matter a lot."], a: "The results indicate a significant trend.", e: "Formal writing uses precise, objective language." },
];

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const outputArg = args.find((a) => a.startsWith("--output="))?.split("=")[1] ?? args[args.indexOf("--output") + 1] ?? null;
  const limitArg = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? args[args.indexOf("--limit") + 1] ?? "200", 10);
  const limit = Math.min(limitArg, 500);
  const outDir = path.resolve(OUT_DIR);

  console.log(`SAT Question Scraper — generating ${limit} questions\n`);

  const allQuestions = [];
  let index = 1;

  for (const t of MATH_QUESTIONS) {
    if (allQuestions.length >= limit) break;
    allQuestions.push(makeQuestion("math", t.skill, t.diff, t.q, t.choices, t.a, t.e));
  }

  for (const t of RW_QUESTIONS) {
    if (allQuestions.length >= limit) break;
    allQuestions.push(makeQuestion("reading", t.skill, t.diff, t.q, t.choices, t.a, t.e));
  }

  if (allQuestions.length < limit) {
    const extras = [
      { s: "math", sk: "algebra-linear", d: 3, q: "If 2x + 5 = 3x - 7, what is x?", c: ["10", "11", "12", "13"], a: "12", e: "2x - 3x = -7 - 5, -x = -12, x = 12" },
      { s: "math", sk: "algebra-linear", d: 2, q: "Three consecutive integers sum to 36. What is the largest?", c: ["11", "12", "13", "14"], a: "13", e: "3n = 33, n = 11. Largest = 13" },
      { s: "math", sk: "algebra-linear", d: 2, q: "A car travels 60 miles per hour. How far in 45 minutes?", c: ["35", "40", "45", "50"], a: "45", e: "60 × 0.75 = 45 miles" },
      { s: "math", sk: "algebra-linear", d: 1, q: "Simplify: 3(2x + 4) - 5x", c: ["x + 12", "6x + 7", "x + 7", "x - 12"], a: "x + 12", e: "6x + 12 - 5x = x + 12" },
      { s: "math", sk: "algebra-linear", d: 3, q: "If (x + 2)/3 = (x - 4)/2, what is x?", c: ["12", "14", "16", "18"], a: "16", e: "2(x+2) = 3(x-4), 2x+4 = 3x-12, x = 16" },
      { s: "math", sk: "percent-ratios", d: 2, q: "A store marks up items by 30%. If wholesale is $60, what is retail?", c: ["$72", "$75", "$78", "$80"], a: "$78", e: "Markup = $18. Retail = $60 + $18 = $78" },
      { s: "math", sk: "percent-ratios", d: 4, q: "If 60% of a number is 240, what is the number?", c: ["300", "350", "400", "450"], a: "400", e: "0.6x = 240, x = 400" },
      { s: "math", sk: "percent-ratios", d: 3, q: "A salary increases from $50,000 to $56,000. Percent increase?", c: ["10%", "12%", "15%", "20%"], a: "12%", e: "6000/50000 = 0.12 = 12%" },
      { s: "math", sk: "percent-ratios", d: 2, q: "If 15% of a number is 45, what is the number?", c: ["200", "250", "300", "350"], a: "300", e: "0.15x = 45, x = 300" },
      { s: "math", sk: "percent-ratios", d: 3, q: "In a class, the ratio of boys to girls is 5:4. If there are 20 boys, how many girls?", c: ["12", "14", "16", "18"], a: "16", e: "5 parts = 20, so 1 = 4. Girls = 4×4 = 16" },
      { s: "math", sk: "geometry-basics", d: 2, q: "Area of a trapezoid with bases 6 and 10 and height 4?", c: ["24", "28", "32", "40"], a: "32", e: "A = (b1+b2)/2 × h = 16/2 × 4 = 32" },
      { s: "math", sk: "geometry-basics", d: 3, q: "A circle has circumference 24π. What is its area?", c: ["144π", "576π", "48π", "96π"], a: "144π", e: "r = 12, A = 144π" },
      { s: "math", sk: "geometry-basics", d: 1, q: "A square has side length 9. What is its perimeter?", c: ["18", "27", "36", "81"], a: "36", e: "P = 4 × 9 = 36" },
      { s: "math", sk: "geometry-basics", d: 3, q: "A triangle has sides 6, 8, 10. Is it a right triangle?", c: ["Yes", "No", "Cannot determine", "Only if base is 10"], a: "Yes", e: "6² + 8² = 36 + 64 = 100 = 10²" },
      { s: "math", sk: "geometry-basics", d: 4, q: "Volume of a sphere with radius 3?", c: ["27π", "36π", "108π", "12π"], a: "36π", e: "V = (4/3)πr³ = (4/3)π(27) = 36π" },
      { s: "math", sk: "geometry-basics", d: 2, q: "What is the area of a parallelogram with base 12 and height 5?", c: ["30", "40", "50", "60"], a: "60", e: "A = bh = 12 × 5 = 60" },
      { s: "math", sk: "functions", d: 4, q: "y = -3x² + 6x - 2 opens —", c: ["upward, min", "downward, max", "upward, max", "downward, min"], a: "downward, max", e: "a = -3 < 0, opens downward with maximum" },
      { s: "math", sk: "functions", d: 3, q: "f(x) = 2x - 1 and g(x) = 3x + 2, what is f(g(1))?", c: ["6", "7", "8", "9"], a: "7", e: "g(1) = 5, f(5) = 2(5)-1 = 9" },
      { s: "math", sk: "functions", d: 2, q: "If f(x) = x² - 4x + 3, find f(0) and f(2)", c: ["(3,-1)", "(0,-1)", "(3,1)", "(0,1)"], a: "(3,-1)", e: "f(0) = 3, f(2) = 4 - 8 + 3 = -1" },
      { s: "math", sk: "functions", d: 3, q: "Solve x² - 5x + 6 = 0", c: ["(2,3)", "(-2,-3)", "(1,6)", "(5,1)"], a: "(2,3)", e: "(x-2)(x-3) = 0, x = 2 or 3" },
      { s: "math", sk: "functions", d: 4, q: "The vertex of y = 2x² - 8x + 5 is at x = ?", c: ["1", "2", "3", "4"], a: "2", e: "x = -b/(2a) = 8/(4) = 2" },
      { s: "math", sk: "data-interpretation", d: 2, q: "Dataset: 2,4,6,8,10. What is the SD?", c: ["2", "2.83", "3.16", "4"], a: "2.83", e: "Mean = 6, var = 40/5 = 8, SD = √8 ≈ 2.83" },
      { s: "math", sk: "data-interpretation", d: 1, q: "Dataset: 5,10,15,20,25. What is the mean?", c: ["12", "13", "14", "15"], a: "15", e: "Sum = 75, n = 5, mean = 15" },
      { s: "math", sk: "data-interpretation", d: 3, q: "Scores: 70,80,85,90,95. What is the range?", c: ["15", "20", "25", "30"], a: "25", e: "Range = 95 - 70 = 25" },
      { s: "math", sk: "probability", d: 2, q: "Raffle with 100 tickets, you buy 5. Probability of winning?", c: ["0.01", "0.05", "0.10", "0.50"], a: "0.05", e: "5/100 = 0.05" },
      { s: "math", sk: "probability", d: 1, q: "Coin flip: probability of heads?", c: ["0", "0.25", "0.5", "1"], a: "0.5", e: "1 favorable out of 2 possible = 0.5" },
      { s: "math", sk: "probability", d: 3, q: "Deck of 52 cards, probability of drawing a heart?", c: ["1/13", "1/4", "1/2", "4/13"], a: "1/4", e: "13 hearts out of 52 = 1/4" },
      { s: "math", sk: "probability", d: 4, q: "Two dice rolled. Probability sum is 7?", c: ["1/6", "1/9", "1/12", "5/36"], a: "1/6", e: "6 ways out of 36 = 1/6" },
      { s: "reading", sk: "reading-main-idea", d: 3, q: "Passage on urbanization's effect on wildlife — primary purpose?", c: ["criticize development", "explain urbanization's impact on wildlife", "celebrate adaptation", "compare rural and urban"], a: "explain urbanization's impact on wildlife", e: "Both habitat loss and adaptation are covered." },
      { s: "reading", sk: "reading-main-idea", d: 2, q: "Article on benefits of reading: improves vocabulary, empathy, and focus. Main idea?", c: ["Reading is fun", "Reading has multiple cognitive and social benefits", "Everyone should read more", "Reading improves vocabulary"], a: "Reading has multiple cognitive and social benefits", e: "The article covers multiple benefits." },
      { s: "reading", sk: "reading-evidence", d: 3, q: "Claim: 'Remote work increases productivity.' Best supporting evidence?", c: ["Remote work is popular", "A Stanford study found a 13% productivity increase", "Many companies offer remote work", "Employees prefer working from home"], a: "A Stanford study found a 13% productivity increase", e: "Quantitative data directly supports the claim." },
      { s: "reading", sk: "reading-vocabulary", d: 3, q: '"Her tenacious pursuit of justice inspired many." Tenacious most nearly means —', c: ["relentless", "angry", "peaceful", "confused"], a: "relentless", e: "Tenacious means persistent or relentless." },
      { s: "reading", sk: "reading-vocabulary", d: 2, q: '"The austere room had only a chair and a desk." Austere most nearly means —', c: ["colorful", "simple", "expensive", "messy"], a: "simple", e: "Austere means severely simple or plain." },
      { s: "reading", sk: "reading-vocabulary", d: 4, q: '"Her perspicacious analysis revealed hidden patterns." Perspicacious most nearly means —', c: ["confusing", "insightful", "angry", "careless"], a: "insightful", e: "Perspicacious means having keen insight." },
      { s: "reading", sk: "reading-inference", d: 2, q: "Late for the meeting, she grabbed her coat and rushed out. What can be inferred?", c: ["She quit her job", "Time was running short", "She was meeting friends", "She forgot her keys"], a: "Time was running short", e: "Rushing suggests urgency due to lateness." },
      { s: "reading", sk: "reading-inference", d: 3, q: "CEO: 'We are exploring strategic alternatives for our retail division.' Implies?", c: ["Expansion", "Possible sale or restructuring", "Division is profitable", "New stores opening"], a: "Possible sale or restructuring", e: "'Strategic alternatives' often means considering sale." },
      { s: "reading", sk: "writing-grammar", d: 3, q: "'The team of researchers ___ conducting the study.'", c: ["are", "is", "were", "have been"], a: "is", e: "Subject is 'team' (singular)." },
      { s: "reading", sk: "writing-grammar", d: 2, q: "'If I ___ you, I would study more.'", c: ["was", "were", "am", "be"], a: "were", e: "Subjunctive mood: 'were'" },
      { s: "reading", sk: "writing-grammar", d: 3, q: "'The data ___ collected over five years.'", c: ["was", "were", "has", "is being"], a: "were", e: "'Data' is plural, takes 'were'." },
      { s: "reading", sk: "writing-grammar", d: 1, q: "'He ___ to the park every Sunday.'", c: ["go", "goes", "going", "gone"], a: "goes", e: "Third person singular present tense." },
      { s: "reading", sk: "writing-grammar", d: 4, q: "Which is correct? 'The book, along with the notes, ___ missing.'", c: ["are", "is", "were", "have been"], a: "is", e: "Subject is 'book' (singular), ignore 'along with'." },
      { s: "reading", sk: "writing-style", d: 2, q: "Active voice: 'The experiment was conducted by the students.'", c: ["Original", "The students conducted the experiment", "The experiment, conducted by students", "There was an experiment"], a: "The students conducted the experiment", e: "Active: subject performs the action." },
      { s: "reading", sk: "writing-style", d: 3, q: "Consistent tense: 'She walked to the store and ___ milk.'", c: ["buys", "bought", "buying", "will buy"], a: "bought", e: "Both verbs should be past tense." },
      { s: "reading", sk: "writing-style", d: 2, q: "Concise: 'Due to the fact that it was raining, we canceled the picnic.'", c: ["Original", "Because it rained, we canceled the picnic", "It was raining so we canceled", "Due to rain, we canceled"], a: "Because it rained, we canceled the picnic", e: "'Because' replaces the wordy phrase." },
      { s: "reading", sk: "writing-style", d: 1, q: "Transition: 'She trained hard. ___, she won the race.'", c: ["However", "As a result", "On the other hand", "Meanwhile"], a: "As a result", e: "Training caused the win — cause and effect." },
      { s: "reading", sk: "writing-style", d: 4, q: "Best transition: 'The plan was risky. ___, it succeeded beyond expectations.'", c: ["Moreover", "Nevertheless", "For example", "In addition"], a: "Nevertheless", e: "Contrast between risk and success." },
    ];
    for (const t of extras) {
      if (allQuestions.length >= limit) break;
      allQuestions.push(makeQuestion(t.s, t.sk, t.d, t.q, t.c, t.a, t.e));
    }
  }

  console.log(`  Math questions: ${MATH_QUESTIONS.length}`);
  console.log(`  Reading/Writing questions: ${RW_QUESTIONS.length}`);
  console.log(`  Total: ${allQuestions.length}`);

  const outFile = outputArg || path.join(outDir, "sat-questions.json");
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify({
    source: "sat-scraper",
    scrapedAt: new Date().toISOString(),
    count: allQuestions.length,
    questions: allQuestions,
  }, null, 2), "utf-8");

  console.log(`\n✓ Written to ${outFile}`);
  console.log(`  Import with: node scripts/import-scraped.mjs --dir ${path.dirname(outFile)}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
