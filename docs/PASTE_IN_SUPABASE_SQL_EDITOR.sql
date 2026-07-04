-- ====================================================================
-- NexaLMS — PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR → RUN
-- Safely adds ALL new tables/columns. Safe to run multiple times.
-- ====================================================================


-- ────────────────────────────────────────────────────────────────────
-- SECTION 1: Fee Structure — support individual student fees
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.fee_structures
  ALTER COLUMN grade_level_id DROP NOT NULL;

ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;


-- ────────────────────────────────────────────────────────────────────
-- SECTION 2: Teacher Attendance
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_attendance_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID        NOT NULL REFERENCES public.schools(id)  ON DELETE CASCADE,
  date            DATE        NOT NULL,
  session_type    TEXT        NOT NULL DEFAULT 'full_day'
                              CHECK (session_type IN ('morning','afternoon','full_day')),
  taken_by        UUID        REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, date, session_type)
);

CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES public.teacher_attendance_sessions(id) ON DELETE CASCADE,
  teacher_id  UUID        NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL CHECK (status IN ('present','absent','late','excused')),
  reason      TEXT,
  school_id   UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, teacher_id)
);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 3: Student Leaders
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_leaders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id       UUID        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID        NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id, academic_year_id)
);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 4: Duty Rosters
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.duty_rosters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID        NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  term_id          UUID        NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.duty_roster_weeks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id    UUID        NOT NULL REFERENCES public.duty_rosters(id) ON DELETE CASCADE,
  week_number  INTEGER     NOT NULL,
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  teacher_id   UUID        REFERENCES public.teachers(id) ON DELETE SET NULL,
  prefect_id   UUID        REFERENCES public.student_leaders(id) ON DELETE SET NULL,
  school_id    UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 5: Alumni (Phase 3)
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alumni (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID        NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  student_id       UUID        REFERENCES public.students(id) ON DELETE SET NULL,
  admission_number TEXT,
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  other_names      TEXT,
  gender           TEXT,
  guardian_id      UUID        REFERENCES public.guardians(id) ON DELETE SET NULL,
  house_id         UUID        REFERENCES public.houses(id) ON DELETE SET NULL,
  final_class_id   UUID        REFERENCES public.classes(id) ON DELETE SET NULL,
  final_class_name TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_alumni_school ON public.alumni(school_id);
CREATE INDEX IF NOT EXISTS idx_alumni_year   ON public.alumni(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_alumni_student ON public.alumni(student_id);


-- ────────────────────────────────────────────────────────────────────
-- SECTION 6: Timetable Module Enhancements
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS lessons_per_week INTEGER NOT NULL DEFAULT 5
    CHECK (lessons_per_week BETWEEN 1 AND 20);

ALTER TABLE public.teacher_subject_assignments
  ADD COLUMN IF NOT EXISTS lessons_per_week INTEGER NOT NULL DEFAULT 5
    CHECK (lessons_per_week BETWEEN 1 AND 20);

CREATE TABLE IF NOT EXISTS public.timetable_settings (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                   UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id            UUID        NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  term_name                   TEXT        NOT NULL DEFAULT 'Term 1',
  name                        TEXT        NOT NULL,
  working_days                INTEGER[]   NOT NULL DEFAULT ARRAY[0,1,2,3,4],
  lesson_duration_minutes     INTEGER     NOT NULL DEFAULT 40 CHECK (lesson_duration_minutes BETWEEN 20 AND 120),
  periods_per_day             INTEGER     NOT NULL DEFAULT 7  CHECK (periods_per_day BETWEEN 1 AND 12),
  school_start_time           TIME        NOT NULL DEFAULT '08:00',
  school_end_time             TIME        NOT NULL DEFAULT '15:30',
  min_teacher_lessons_per_day INTEGER     NOT NULL DEFAULT 1  CHECK (min_teacher_lessons_per_day >= 0),
  max_teacher_lessons_per_day INTEGER     NOT NULL DEFAULT 6  CHECK (max_teacher_lessons_per_day >= 1),
  min_class_lessons_per_day   INTEGER     NOT NULL DEFAULT 4  CHECK (min_class_lessons_per_day >= 0),
  max_class_lessons_per_day   INTEGER     NOT NULL DEFAULT 8  CHECK (max_class_lessons_per_day >= 1),
  breaks                      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year_id, term_name)
);

ALTER TABLE public.timetables ALTER COLUMN term_id DROP NOT NULL;

ALTER TABLE public.timetables
  ADD COLUMN IF NOT EXISTS version          INTEGER     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS term_name        TEXT,
  ADD COLUMN IF NOT EXISTS status           TEXT        NOT NULL DEFAULT 'draft'
                                            CHECK (status IN ('draft','published','archived')),
  ADD COLUMN IF NOT EXISTS generated_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generated_by     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settings_snapshot JSONB;

ALTER TABLE public.timetable_entries
  DROP CONSTRAINT IF EXISTS timetable_entries_day_of_week_check;

ALTER TABLE public.timetable_entries
  ADD CONSTRAINT timetable_entries_day_of_week_check CHECK (day_of_week BETWEEN 0 AND 6);

ALTER TABLE public.timetable_entries
  ADD COLUMN IF NOT EXISTS period_number INTEGER;

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- ────────────────────────────────────────────────────────────────────
-- SECTION 7: Enable RLS on all new tables + open policies
-- (same permissive pattern used by 00002_relax_app_rls_for_saves)
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'teacher_attendance_sessions',
    'teacher_attendance',
    'student_leaders',
    'duty_rosters',
    'duty_roster_weeks',
    'alumni',
    'timetable_settings'
  ])
  LOOP
    -- Drop any existing policies so we don't get duplicates
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- Anon can insert into teacher_attendance_sessions for setup; all authenticated can manage
    EXECUTE format(
      'CREATE POLICY "authenticated users can manage %I" ON public.%I
       FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────────────
-- SECTION 8: get_my_school_id helper (used in RLS / queries)
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT school_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;


-- ────────────────────────────────────────────────────────────────────
-- DONE ✓
-- ────────────────────────────────────────────────────────────────────
