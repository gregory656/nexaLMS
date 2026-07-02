-- ============================================================
-- NexaLMS — Timetable Module Enhancement
-- Settings, versioning, weekly lessons, extended constraints
-- ============================================================

-- Weekly lesson requirement on subjects (default for new assignments)
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS lessons_per_week INTEGER NOT NULL DEFAULT 5
    CHECK (lessons_per_week BETWEEN 1 AND 20);

-- Per-assignment weekly lessons (teacher + subject + class)
ALTER TABLE teacher_subject_assignments
  ADD COLUMN IF NOT EXISTS lessons_per_week INTEGER NOT NULL DEFAULT 5
    CHECK (lessons_per_week BETWEEN 1 AND 20);

-- Timetable settings (admin configuration before generation)
CREATE TABLE IF NOT EXISTS timetable_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_name TEXT NOT NULL DEFAULT 'Term 1',
  name TEXT NOT NULL,
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4],
  lesson_duration_minutes INTEGER NOT NULL DEFAULT 40 CHECK (lesson_duration_minutes BETWEEN 20 AND 120),
  periods_per_day INTEGER NOT NULL DEFAULT 7 CHECK (periods_per_day BETWEEN 1 AND 12),
  school_start_time TIME NOT NULL DEFAULT '08:00',
  school_end_time TIME NOT NULL DEFAULT '15:30',
  min_teacher_lessons_per_day INTEGER NOT NULL DEFAULT 1 CHECK (min_teacher_lessons_per_day >= 0),
  max_teacher_lessons_per_day INTEGER NOT NULL DEFAULT 6 CHECK (max_teacher_lessons_per_day >= 1),
  min_class_lessons_per_day INTEGER NOT NULL DEFAULT 4 CHECK (min_class_lessons_per_day >= 0),
  max_class_lessons_per_day INTEGER NOT NULL DEFAULT 8 CHECK (max_class_lessons_per_day >= 1),
  breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year_id, term_name)
);

-- Allow timetables without formal term record (term_name used as label)
ALTER TABLE timetables ALTER COLUMN term_id DROP NOT NULL;

-- Extend timetables with versioning and status
ALTER TABLE timetables
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS term_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settings_snapshot JSONB;

-- Relax day_of_week to support Saturday (0=Mon .. 5=Sat)
ALTER TABLE timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_day_of_week_check;
ALTER TABLE timetable_entries
  ADD CONSTRAINT timetable_entries_day_of_week_check
    CHECK (day_of_week BETWEEN 0 AND 6);

ALTER TABLE timetable_entries
  ADD COLUMN IF NOT EXISTS period_number INTEGER;

-- RLS for timetable_settings
ALTER TABLE timetable_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['timetable_settings']
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      'school_isolation_' || tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (
        school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
      ) WITH CHECK (
        school_id IN (SELECT school_id FROM users WHERE id = auth.uid())
      )',
      'school_isolation_' || tbl, tbl
    );
  END LOOP;
END $$;
