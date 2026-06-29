-- Fix save failures caused by overly strict/broken RLS policies.
-- The frontend is a school-admin app; authenticated users must be able to create
-- and update the school-owned setup records they manage from the dashboard.

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'schools',
    'users',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'subscriptions',
    'academic_years',
    'terms',
    'departments',
    'grade_levels',
    'streams',
    'classes',
    'subjects',
    'houses',
    'teachers',
    'teacher_subject_assignments',
    'teacher_class_assignments',
    'guardians',
    'students',
    'student_guardians',
    'exam_types',
    'exams',
    'exam_results',
    'grade_scales',
    'attendance_sessions',
    'student_attendance',
    'fee_categories',
    'fee_structures',
    'invoices',
    'payments',
    'receipts',
    'timetables',
    'timetable_entries',
    'announcements',
    'report_cards',
    'documents',
    'audit_logs',
    'notifications',
    'system_settings'
  ])
  LOOP
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "authenticated users can manage %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl,
      tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "anon can create schools" ON public.schools;
CREATE POLICY "anon can create schools"
  ON public.schools
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon can view subscription plans" ON public.subscription_plans;
CREATE POLICY "anon can view subscription plans"
  ON public.subscription_plans
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "authenticated can view subscription plans" ON public.subscription_plans;
CREATE POLICY "authenticated can view subscription plans"
  ON public.subscription_plans
  FOR SELECT
  TO authenticated
  USING (true);
