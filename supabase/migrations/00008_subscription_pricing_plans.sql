-- NexaLMS subscription pricing model.
-- Active student count is multiplied by the selected per-student monthly rate.

ALTER TABLE subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_plan_type_check;

ALTER TABLE subscription_plans
  ADD CONSTRAINT subscription_plans_plan_type_check
  CHECK (plan_type IN ('starter', 'standard', 'premium', 'basic', 'pro'));

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS price_per_student NUMERIC(10,2) DEFAULT 0;

INSERT INTO subscription_plans (name, plan_type, description, price_per_student, features, is_active)
VALUES
  (
    'Starter',
    'starter',
    'Student management, teachers, and attendance for schools starting their digital rollout.',
    5,
    '["Student Management","Teachers","Attendance"]'::jsonb,
    true
  ),
  (
    'Standard',
    'standard',
    'Starter features plus exams, report cards, and timetable.',
    7,
    '["Everything in Starter","Exams","Report Cards","Timetable"]'::jsonb,
    true
  ),
  (
    'Premium',
    'premium',
    'Standard features plus finance, analytics, and priority support.',
    10,
    '["Everything in Standard","Finance","Analytics","Priority Support"]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;
