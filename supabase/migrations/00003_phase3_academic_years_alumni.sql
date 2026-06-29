-- Phase 3: academic year promotion and alumni archive support.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  admission_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  other_names TEXT,
  gender TEXT,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  house_id UUID REFERENCES public.houses(id) ON DELETE SET NULL,
  final_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  final_class_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_alumni_school ON public.alumni(school_id);
CREATE INDEX IF NOT EXISTS idx_alumni_year ON public.alumni(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_alumni_student ON public.alumni(student_id);

ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users can manage alumni" ON public.alumni;
CREATE POLICY "authenticated users can manage alumni"
  ON public.alumni
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS set_updated_at ON public.departments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
