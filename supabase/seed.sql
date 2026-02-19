-- ============================================
-- EVALENT — Seed Data
-- Run this AFTER schema.sql
-- ============================================

-- Create Super Admin user
-- Password: EvalentAdmin2026! (bcrypt hashed)
-- Change this immediately after first login
INSERT INTO users (email, name, password_hash, role, school_id, is_active)
VALUES (
  'admin@evalent.io',
  'Evalent Admin',
  '$2a$12$LJ3MFgNsQNeVv3J.TKsxquHHR9Zx8JGxDPVByBKQvVpJ4.F8jrGHO',
  'super_admin',
  NULL,
  true
);

-- Create test school (matching the G10 Neil Tomalin reference)
INSERT INTO schools (name, slug, curriculum, locale, timezone, contact_email, is_active, subscription_plan)
VALUES (
  'TEST_SCHOOL_IB',
  'test-school-ib',
  'IB',
  'en-GB',
  'Asia/Dubai',
  'admissions@testschool.edu',
  true,
  'standard'
)
RETURNING id;

-- Create grade configs for test school
-- (Use the returned school id from above — or replace with actual UUID)
DO $$
DECLARE
  test_school_id UUID;
BEGIN
  SELECT id INTO test_school_id FROM schools WHERE slug = 'test-school-ib';

  INSERT INTO grade_configs (school_id, grade, jotform_form_id, english_threshold, maths_threshold, reasoning_threshold)
  VALUES
    (test_school_id, 3,  '260320999939472', 55.0, 55.0, 55.0),
    (test_school_id, 4,  '260471223169050', 55.0, 55.0, 55.0),
    (test_school_id, 5,  '260473002939456', 55.0, 55.0, 55.0),
    (test_school_id, 6,  '260471812050447', 55.0, 55.0, 55.0),
    (test_school_id, 7,  '260471812050447', 55.0, 55.0, 55.0),
    (test_school_id, 8,  '260483151046047', 55.0, 55.0, 55.0),
    (test_school_id, 9,  '260483906227461', 55.0, 55.0, 55.0),
    (test_school_id, 10, '260484588498478', 55.0, 55.0, 55.0);
END $$;

-- Audit log entry
INSERT INTO audit_log (actor_email, action, entity_type, entity_id, details)
VALUES (
  'system',
  'platform_initialized',
  'system',
  'evalent',
  '{"version": "1.0", "note": "Initial seed data"}'::jsonb
);
