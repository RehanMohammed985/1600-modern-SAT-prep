-- Sample questions for MVP (run after schema.sql)

insert into public.questions (prompt, choices, correct_answer, explanation, skill_tag, difficulty, estimated_seconds, section) values
(
  'If 3x + 7 = 22, what is the value of x?',
  '["3", "5", "7", "15"]'::jsonb,
  '5',
  'Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.',
  'algebra-linear',
  1,
  60,
  'math'
),
(
  'A line passes through (0, 2) and (4, 10). What is its slope?',
  '["1", "2", "3", "4"]'::jsonb,
  '2',
  'Slope = (10 - 2) / (4 - 0) = 8/4 = 2.',
  'algebra-linear',
  2,
  75,
  'math'
),
(
  'What is 15% of 80?',
  '["8", "10", "12", "15"]'::jsonb,
  '12',
  '0.15 × 80 = 12.',
  'percent-ratios',
  1,
  45,
  'math'
),
(
  'A rectangle has length 12 and width 5. What is its area?',
  '["17", "34", "60", "120"]'::jsonb,
  '60',
  'Area = length × width = 12 × 5 = 60.',
  'geometry-basics',
  1,
  50,
  'math'
),
(
  'If f(x) = 2x² - 3, what is f(2)?',
  '["1", "5", "8", "11"]'::jsonb,
  '5',
  'f(2) = 2(4) - 3 = 8 - 3 = 5.',
  'functions',
  3,
  90,
  'math'
),
(
  'What is the main idea of the passage?',
  '["City gardens are too small to be useful.", "Community gardens can help neighbors build relationships.", "Maya prefers rural life to city life.", "Workshops are the only reason gardens succeed."]'::jsonb,
  'Community gardens can help neighbors build relationships.',
  'The passage shows Maya finding connection through the garden, ending with the idea that green spaces grow connection.',
  'reading-main-idea',
  2,
  90,
  'reading'
),
(
  'Which lines best support the idea that the garden helped people who did not know each other before?',
  '["Lines 1-2", "Lines 3-4", "Lines 4-5", "Lines 1-5"]'::jsonb,
  'Lines 3-4',
  'Lines 3-4 describe neighbors who rarely spoke now sharing tools and stories.',
  'reading-evidence',
  3,
  100,
  'reading'
),
(
  'As used in line 2, "traded" most nearly means —',
  '["sold for money", "exchanged", "gambled", "hid"]'::jsonb,
  'exchanged',
  'Neighbors share tomatoes and herbs—they exchange goods, not run a store.',
  'reading-vocabulary',
  2,
  75,
  'reading'
),
(
  'Based on the passage, what can be inferred about Dr. Chen?',
  '["She dislikes speaking with visitors.", "She values teaching people how to think scientifically.", "She only records data for other scientists.", "She believes memorizing star names is the main goal."]'::jsonb,
  'She values teaching people how to think scientifically.',
  'Chen focuses on patterns and questions, not memorization.',
  'reading-inference',
  3,
  100,
  'reading'
),
(
  'Two data points show study hours vs. score gain. A student studied 4 hours and gained 40 points. At 6 hours, gain was 55. Assuming linear trend, expected gain at 5 hours is closest to —',
  '["45", "47.5", "50", "52.5"]'::jsonb,
  '47.5',
  'Linear interpolation between (4,40) and (6,55): at 5 hours ≈ 47.5.',
  'data-interpretation',
  3,
  110,
  'math'
),
(
  'Which sentence best combines the two ideas without a comma splice?',
  '["She practiced daily, she improved quickly.", "She practiced daily; she improved quickly.", "She practiced daily she improved quickly.", "She practiced daily, and, she improved quickly."]'::jsonb,
  'She practiced daily; she improved quickly.',
  'Use a semicolon or conjunction to join two independent clauses correctly.',
  'writing-grammar',
  2,
  70,
  'reading'
),
(
  'A bag has 3 red and 5 blue marbles. P(red) = ?',
  '["3/5", "3/8", "5/8", "1/3"]'::jsonb,
  '3/8',
  'P(red) = favorable/total = 3/(3+5) = 3/8.',
  'probability',
  2,
  80,
  'math'
);
