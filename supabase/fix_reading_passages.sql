-- Fix broken reading questions (no passage, references "previous question")
-- Run in Supabase SQL Editor. Safe to re-run.

-- Passage 1: Community gardens
UPDATE public.questions SET
  passage_text = '(1) When Maya moved to the city, she missed the quiet mornings she had known in her hometown. (2) She discovered a small community garden two blocks from her apartment, where neighbors traded tomatoes, herbs, and advice. (3) At first, she visited only to escape the noise of traffic, but soon she began helping plan weekend workshops for students. (4) The garden became a place where people who rarely spoke on the sidewalk now shared tools and stories. (5) Maya realized that green spaces in dense neighborhoods do more than grow food—they grow connection.',
  passage_topic = 'Urban community gardens',
  passage_tone = 'Warm, reflective',
  passage_difficulty = 2,
  passage_read_time_seconds = 90,
  reading_skill = 'reading-main-idea',
  prompt = 'What is the main idea of the passage?',
  question_text = 'What is the main idea of the passage?',
  choices = '["City gardens are too small to be useful.", "Community gardens can help neighbors build relationships.", "Maya prefers rural life to city life.", "Workshops are the only reason gardens succeed."]'::jsonb,
  correct_answer = 'Community gardens can help neighbors build relationships.',
  explanation = 'The passage shows Maya finding connection through the garden, ending with the idea that green spaces grow connection.'
WHERE section = 'reading' AND (prompt ILIKE '%main purpose%' OR prompt ILIKE '%first paragraph%');

UPDATE public.questions SET
  passage_text = '(1) When Maya moved to the city, she missed the quiet mornings she had known in her hometown. (2) She discovered a small community garden two blocks from her apartment, where neighbors traded tomatoes, herbs, and advice. (3) At first, she visited only to escape the noise of traffic, but soon she began helping plan weekend workshops for students. (4) The garden became a place where people who rarely spoke on the sidewalk now shared tools and stories. (5) Maya realized that green spaces in dense neighborhoods do more than grow food—they grow connection.',
  passage_topic = 'Urban community gardens',
  passage_tone = 'Warm, reflective',
  passage_difficulty = 3,
  passage_read_time_seconds = 90,
  reading_skill = 'reading-evidence',
  prompt = 'Which lines best support the idea that the garden helped people who did not know each other before?',
  question_text = 'Which lines best support the idea that the garden helped people who did not know each other before?',
  choices = '["Lines 1-2", "Lines 3-4", "Lines 4-5", "Lines 1-5"]'::jsonb,
  correct_answer = 'Lines 3-4',
  explanation = 'Lines 3-4 describe neighbors who rarely spoke now sharing tools and stories.'
WHERE section = 'reading' AND prompt ILIKE '%evidence%';

UPDATE public.questions SET
  passage_text = '(1) When Maya moved to the city, she missed the quiet mornings she had known in her hometown. (2) She discovered a small community garden two blocks from her apartment, where neighbors traded tomatoes, herbs, and advice. (3) At first, she visited only to escape the noise of traffic, but soon she began helping plan weekend workshops for students. (4) The garden became a place where people who rarely spoke on the sidewalk now shared tools and stories. (5) Maya realized that green spaces in dense neighborhoods do more than grow food—they grow connection.',
  passage_topic = 'Urban community gardens',
  passage_tone = 'Warm, reflective',
  passage_difficulty = 2,
  passage_read_time_seconds = 90,
  reading_skill = 'reading-vocabulary',
  prompt = 'As used in line 2, "traded" most nearly means —',
  question_text = 'As used in line 2, "traded" most nearly means —',
  choices = '["sold for money", "exchanged", "gambled", "hid"]'::jsonb,
  correct_answer = 'exchanged',
  explanation = 'Neighbors share tomatoes and herbs—they exchange goods, not run a store.'
WHERE section = 'reading' AND (prompt ILIKE '%traded%' OR prompt ILIKE '%reserved%');

UPDATE public.questions SET
  passage_text = '(1) Dr. Chen kept a notebook beside the telescope, recording not only star positions but also the questions visitors asked during public nights. (2) Many children wanted to know whether the lights they saw were planets or distant suns. (3) Chen answered patiently, knowing that a single clear explanation could change how someone saw the night sky for years. (4) She believed astronomy was less about memorizing names and more about learning to notice patterns. (5) By the end of each evening, the notebook was filled with sketches, arrows, and reminders to follow up with school groups.',
  passage_topic = 'Public astronomy',
  passage_tone = 'Curious, thoughtful',
  passage_difficulty = 3,
  passage_read_time_seconds = 100,
  reading_skill = 'reading-inference',
  prompt = 'Based on the passage, what can be inferred about Dr. Chen?',
  question_text = 'Based on the passage, what can be inferred about Dr. Chen?',
  choices = '["She dislikes speaking with visitors.", "She values teaching people how to think scientifically.", "She only records data for other scientists.", "She believes memorizing star names is the main goal."]'::jsonb,
  correct_answer = 'She values teaching people how to think scientifically.',
  explanation = 'Chen focuses on patterns and questions, not memorization.'
WHERE section = 'reading' AND prompt ILIKE '%inference%';
