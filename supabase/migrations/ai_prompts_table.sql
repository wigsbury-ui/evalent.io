
-- Run this in Supabase SQL editor
CREATE TABLE IF NOT EXISTS ai_prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  domain TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Seed with current hardcoded prompts
INSERT INTO ai_prompts (id, title, description, system_prompt, domain) VALUES
('english_writing', 'English Writing Evaluation', 'System prompt for evaluating English extended writing tasks', 'You are an experienced admissions assessor writing a professional evaluation of English extended writing.', 'english'),
('mathematics_writing', 'Mathematics Writing Evaluation', 'System prompt for evaluating mathematical reasoning explanations', 'You are an experienced admissions assessor writing a professional evaluation of Mathematics extended writing.', 'mathematics'),
('values_writing', 'Values Writing Evaluation', 'System prompt for evaluating values/community reflective writing', 'You are an experienced admissions assessor writing a professional evaluation of Values extended writing.', 'values'),
('creativity_writing', 'Creativity Writing Evaluation', 'System prompt for evaluating creative design responses', 'You are an experienced admissions assessor writing a professional evaluation of Creativity extended writing.', 'creativity'),
('motivation_writing', 'Motivation / School Fit', 'System prompt for evaluating motivation and school fit responses', 'You are an experienced admissions assessor writing a professional evaluation of a student motivation statement.', 'motivation'),
('reasoning_narrative', 'Reasoning Narrative', 'System prompt for generating reasoning domain interpretation', 'You are a senior admissions assessor writing a reasoning score interpretation.', 'reasoning'),
('mindset_narrative', 'Mindset Interpretation', 'System prompt for interpreting mindset/readiness scores', 'You are a senior admissions assessor interpreting a mindset and learning readiness score.', 'mindset')
ON CONFLICT (id) DO NOTHING;
