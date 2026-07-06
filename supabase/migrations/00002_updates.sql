-- Fee Structure Modifications
ALTER TABLE fee_structures ALTER COLUMN grade_level_id DROP NOT NULL;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE CASCADE;

-- Teacher Attendance
CREATE TABLE IF NOT EXISTS teacher_attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_type TEXT DEFAULT 'full_day' CHECK (session_type IN ('morning','afternoon','full_day')),
  taken_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, date, session_type)
);

CREATE TABLE IF NOT EXISTS teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES teacher_attendance_sessions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  reason TEXT,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, teacher_id)
);

-- Student Leaders
CREATE TABLE IF NOT EXISTS student_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id, academic_year_id)
);

-- Duty Rosters
CREATE TABLE IF NOT EXISTS duty_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duty_roster_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id UUID NOT NULL REFERENCES duty_rosters(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  prefect_id UUID REFERENCES student_leaders(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE teacher_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_roster_weeks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'teacher_attendance_sessions','teacher_attendance','student_leaders','duty_rosters','duty_roster_weeks'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "School members can view %I" ON %I FOR SELECT USING (school_id = get_my_school_id())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "School admin can insert %I" ON %I FOR INSERT WITH CHECK (school_id = get_my_school_id())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "School admin can update %I" ON %I FOR UPDATE USING (school_id = get_my_school_id())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "School admin can delete %I" ON %I FOR DELETE USING (school_id = get_my_school_id())',
      tbl, tbl
    );
  END LOOP;
END $$;
