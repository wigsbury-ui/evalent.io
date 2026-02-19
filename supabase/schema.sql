-- ============================================
-- EVALENT — Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'school_admin', 'assessor');
CREATE TYPE curriculum_type AS ENUM ('UK', 'US', 'IB');
CREATE TYPE processing_status AS ENUM (
  'pending', 'scoring', 'ai_evaluation',
  'generating_report', 'sending', 'complete', 'error'
);
CREATE TYPE decision_value AS ENUM (
  'admit', 'admit_with_support', 'waitlist', 'reject', 'request_info'
);
CREATE TYPE writing_band AS ENUM (
  'Excellent', 'Good', 'Developing', 'Emerging', 'Insufficient'
);
CREATE TYPE question_type AS ENUM ('MCQ', 'Writing', 'Mindset');
CREATE TYPE domain_type AS ENUM (
  'english', 'mathematics', 'reasoning', 'mindset', 'values', 'creativity'
);

-- ============================================
-- SCHOOLS
-- ============================================

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  curriculum curriculum_type NOT NULL DEFAULT 'IB',
  locale TEXT NOT NULL DEFAULT 'en-GB' CHECK (locale IN ('en-GB', 'en-US')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  contact_email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscription_plan TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schools_slug ON schools(slug);
CREATE INDEX idx_schools_active ON schools(is_active);

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT, -- null for assessors (email-only workflow)
  role user_role NOT NULL DEFAULT 'school_admin',
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- GRADE CONFIGS (per school, per grade)
-- ============================================

CREATE TABLE grade_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 3 AND 10),
  jotform_form_id TEXT NOT NULL,
  assessor_email TEXT,
  english_threshold DECIMAL NOT NULL DEFAULT 55.0,
  maths_threshold DECIMAL NOT NULL DEFAULT 55.0,
  reasoning_threshold DECIMAL NOT NULL DEFAULT 55.0,
  english_weight DECIMAL NOT NULL DEFAULT 0.35,
  maths_weight DECIMAL NOT NULL DEFAULT 0.35,
  reasoning_weight DECIMAL NOT NULL DEFAULT 0.30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, grade)
);

CREATE INDEX idx_grade_configs_school ON grade_configs(school_id);

-- ============================================
-- ANSWER KEYS (from master spreadsheet)
-- ============================================

CREATE TABLE answer_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 3 AND 10),
  question_number INTEGER NOT NULL,
  domain domain_type NOT NULL,
  question_type question_type NOT NULL,
  construct TEXT,
  label TEXT,
  stimulus_id TEXT,
  stimulus_text TEXT,
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT, -- 'A', 'B', 'C', 'D' for MCQ; null for writing
  notes TEXT,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(grade, question_number)
);

CREATE INDEX idx_answer_keys_grade ON answer_keys(grade);
CREATE INDEX idx_answer_keys_domain ON answer_keys(domain);

-- ============================================
-- STUDENTS
-- ============================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_ref TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  grade_applied INTEGER NOT NULL CHECK (grade_applied BETWEEN 3 AND 10),
  date_of_birth DATE,
  gender TEXT,
  nationality TEXT,
  first_language TEXT,
  jotform_link TEXT,
  registered_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_ref ON students(student_ref);
CREATE INDEX idx_students_grade ON students(grade_applied);

-- ============================================
-- SUBMISSIONS (the big one — all scores + narratives)
-- ============================================

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  grade INTEGER NOT NULL,
  jotform_submission_id TEXT NOT NULL UNIQUE,
  jotform_form_id TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_answers JSONB,

  -- English
  english_mcq_score INTEGER,
  english_mcq_total INTEGER,
  english_mcq_pct DECIMAL,
  english_writing_response TEXT,
  english_writing_band writing_band,
  english_writing_score DECIMAL,
  english_writing_narrative TEXT,
  english_combined DECIMAL,

  -- Mathematics
  maths_mcq_score INTEGER,
  maths_mcq_total INTEGER,
  maths_mcq_pct DECIMAL,
  maths_writing_response TEXT,
  maths_writing_band writing_band,
  maths_writing_score DECIMAL,
  maths_writing_narrative TEXT,
  maths_combined DECIMAL,

  -- Reasoning (MCQ only)
  reasoning_score INTEGER,
  reasoning_total INTEGER,
  reasoning_pct DECIMAL,
  reasoning_narrative TEXT,

  -- Data interpretation sub-score
  data_score DECIMAL,

  -- Mindset
  mindset_score DECIMAL,
  mindset_narrative TEXT,

  -- Values writing
  values_writing_response TEXT,
  values_writing_band writing_band,
  values_writing_score DECIMAL,
  values_narrative TEXT,

  -- Creativity writing
  creativity_writing_response TEXT,
  creativity_writing_band writing_band,
  creativity_writing_score DECIMAL,
  creativity_narrative TEXT,

  -- Overall
  overall_academic_pct DECIMAL,
  recommendation_band TEXT,
  recommendation_narrative TEXT,

  -- Report
  report_pdf_url TEXT,
  report_generated_at TIMESTAMPTZ,
  report_sent_at TIMESTAMPTZ,

  -- Pipeline status
  processing_status processing_status NOT NULL DEFAULT 'pending',
  error_log TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_school ON submissions(school_id);
CREATE INDEX idx_submissions_status ON submissions(processing_status);
CREATE INDEX idx_submissions_jotform ON submissions(jotform_submission_id);

-- ============================================
-- DECISIONS
-- ============================================

CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assessor_email TEXT NOT NULL,
  decision decision_value NOT NULL,
  notes TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_decisions_submission ON decisions(submission_id);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grade_configs_updated_at
  BEFORE UPDATE ON grade_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_answer_keys_updated_at
  BEFORE UPDATE ON answer_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so these policies are for anon/authenticated
-- We'll add granular policies as we build out the auth layer

-- Allow service role full access (used by our API routes)
CREATE POLICY "Service role full access" ON schools FOR ALL USING (true);
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON grade_configs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON answer_keys FOR ALL USING (true);
CREATE POLICY "Service role full access" ON students FOR ALL USING (true);
CREATE POLICY "Service role full access" ON submissions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON decisions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON audit_log FOR ALL USING (true);

-- ============================================
-- SEED: Default Jotform form IDs
-- ============================================

-- These will be associated with schools via grade_configs
-- Reference only:
-- G3: 260320999939472
-- G4: 260471223169050
-- G5: 260473002939456
-- G6: 260471812050447
-- G7: 260471812050447
-- G8: 260483151046047
-- G9: 260483906227461
-- G10: 260484588498478

COMMENT ON TABLE schools IS 'Schools using the Evalent platform';
COMMENT ON TABLE submissions IS 'Student assessment submissions with all scores and AI narratives';
COMMENT ON TABLE answer_keys IS 'Master answer keys seeded from Evalent_4_COMPLETE_Revised.xlsx';
