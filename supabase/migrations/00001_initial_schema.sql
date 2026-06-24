-- ============================================================
-- NexaLMS — Initial Schema Migration
-- Complete database for School ERP / Management System
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. SCHOOLS (Root entity — everything belongs to a school)
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  motto TEXT,
  email TEXT NOT NULL UNIQUE CHECK (email ILIKE '%@gmail.com'),
  phone TEXT,
  address TEXT,
  city TEXT,
  county TEXT,
  country TEXT DEFAULT 'Kenya',
  postal_code TEXT,
  website TEXT,
  logo_url TEXT,
  watermark_url TEXT,
  watermark_public_id TEXT,
  school_type TEXT CHECK (school_type IN ('primary','secondary','mixed','tertiary')),
  curriculum TEXT CHECK (curriculum IN ('cbc','844','igcse','ib','other')),
  established_year INTEGER,
  registration_number TEXT,
  is_setup_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. USERS (Admin account, linked to auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE CHECK (email ILIKE '%@gmail.com'),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. ROLES & PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- ============================================================
-- 4. SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic','pro')),
  description TEXT,
  max_students INTEGER,
  max_staff INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  price_per_student NUMERIC(10,2) DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active','trial','expired','cancelled')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ACADEMIC STRUCTURE
-- ============================================================
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  head_teacher_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_teacher_id UUID,
  capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grade_level_id, stream_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_compulsory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

CREATE TABLE IF NOT EXISTS houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  motto TEXT,
  patron_teacher_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

-- ============================================================
-- 6. TEACHERS
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT CHECK (gender IN ('male','female','other')),
  tsc_number TEXT,
  id_number TEXT,
  date_of_birth DATE,
  qualification TEXT,
  specialization TEXT,
  employment_date DATE,
  employment_type TEXT CHECK (employment_type IN ('permanent','contract','intern','volunteer')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','on_leave','suspended','terminated')),
  profile_photo_url TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK now that teachers table exists
ALTER TABLE departments ADD CONSTRAINT fk_department_head FOREIGN KEY (head_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
ALTER TABLE classes ADD CONSTRAINT fk_class_teacher FOREIGN KEY (class_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
ALTER TABLE houses ADD CONSTRAINT fk_house_patron FOREIGN KEY (patron_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_class_teacher BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, academic_year_id)
);

-- ============================================================
-- 7. GUARDIANS / PARENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  alternate_phone TEXT,
  relationship TEXT CHECK (relationship IN ('father','mother','guardian','uncle','aunt','grandparent','other')),
  occupation TEXT,
  address TEXT,
  national_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admission_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  other_names TEXT,
  gender TEXT CHECK (gender IN ('male','female','other')),
  date_of_birth DATE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
  profile_photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','expelled','transferred','graduated')),
  admission_date DATE,
  previous_school TEXT,
  medical_info TEXT,
  special_needs TEXT,
  nationality TEXT DEFAULT 'Kenyan',
  religion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, guardian_id)
);

-- ============================================================
-- 9. EXAMINATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_type_id UUID NOT NULL REFERENCES exam_types(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','ongoing','completed','published')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  marks NUMERIC(5,2),
  grade TEXT,
  remarks TEXT,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS grade_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  min_marks NUMERIC(5,2) NOT NULL,
  max_marks NUMERIC(5,2) NOT NULL,
  points INTEGER,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grade, school_id)
);

-- ============================================================
-- 10. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_type TEXT DEFAULT 'morning' CHECK (session_type IN ('morning','afternoon','full_day')),
  taken_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, date, session_type)
);

CREATE TABLE IF NOT EXISTS student_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  reason TEXT,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- ============================================================
-- 11. FINANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, school_id)
);

CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  fee_category_id UUID NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  is_optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','overdue')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invoice_number, school_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('mpesa','bank','cash','cheque','other')),
  reference_number TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(receipt_number, school_id)
);

-- ============================================================
-- 12. TIMETABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. COMMUNICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all','teachers','students','parents','staff')),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. REPORT CARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS report_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  total_marks NUMERIC(7,2),
  average NUMERIC(5,2),
  grade TEXT,
  position INTEGER,
  class_size INTEGER,
  teacher_remarks TEXT,
  principal_remarks TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term_id, academic_year_id)
);

-- ============================================================
-- 15. DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  file_url TEXT NOT NULL,
  file_public_id TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','warning','success','error')),
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, school_id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_guardian ON students(guardian_id);
CREATE INDEX idx_teachers_school ON teachers(school_id);
CREATE INDEX idx_guardians_school ON guardians(school_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_subjects_school ON subjects(school_id);
CREATE INDEX idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_attendance_session ON student_attendance(session_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_audit_logs_school ON audit_logs(school_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_announcements_school ON announcements(school_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — School-scoped access
-- Users can only see data from their school
-- ============================================================

-- Schools: Users can read their own school
CREATE POLICY "Users can view own school" ON schools
  FOR SELECT USING (id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admin can update own school" ON schools
  FOR UPDATE USING (id IN (SELECT school_id FROM users WHERE id = auth.uid() AND is_admin = TRUE));

CREATE POLICY "Anyone can create school on signup" ON schools
  FOR INSERT WITH CHECK (TRUE);

-- Helper function to avoid recursion in policies
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Users: Can see users from same school
CREATE POLICY "Users can view same school users" ON users
  FOR SELECT USING (school_id = get_my_school_id());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Can create own user profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Generic school-scoped SELECT policies (macro pattern)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'roles','role_permissions','user_roles','subscriptions',
    'academic_years','terms','departments','grade_levels','streams',
    'classes','subjects','houses','teachers','teacher_subject_assignments',
    'teacher_class_assignments','guardians','students','student_guardians',
    'exam_types','exams','exam_results','grade_scales',
    'attendance_sessions','student_attendance','fee_categories','fee_structures',
    'invoices','payments','receipts','timetables','timetable_entries',
    'announcements','report_cards','documents','audit_logs',
    'system_settings'
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

-- Notifications: user-scoped
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

-- Subscription plans: readable by all authenticated
CREATE POLICY "Anyone can view plans" ON subscription_plans
  FOR SELECT USING (TRUE);

CREATE POLICY "Only system can manage plans" ON subscription_plans
  FOR INSERT WITH CHECK (FALSE);

-- ============================================================
-- SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================================
INSERT INTO subscription_plans (name, plan_type, description, features) VALUES 
(
  'Basic Plan',
  'basic',
  'Essential school management features for smaller institutions',
  '["Student Management","Teacher Management","Class Management","Attendance","Basic Reports","Announcements"]'::jsonb
),
(
  'Pro Access',
  'pro',
  'Full-featured school ERP with advanced analytics and integrations',
  '["Everything in Basic","Exam Management","Report Cards","Fee Management","Timetable","Advanced Analytics","Document Management","SMS/Email Notifications","API Access","Priority Support"]'::jsonb
);

-- ============================================================
-- SEED DEFAULT PERMISSIONS
-- ============================================================
INSERT INTO permissions (name, description, module) VALUES
-- Dashboard
('dashboard.view', 'View dashboard', 'dashboard'),
-- Students  
('students.view', 'View students', 'students'),
('students.create', 'Add new students', 'students'),
('students.edit', 'Edit student info', 'students'),
('students.delete', 'Delete students', 'students'),
-- Teachers
('teachers.view', 'View teachers', 'teachers'),
('teachers.create', 'Add teachers', 'teachers'),
('teachers.edit', 'Edit teacher info', 'teachers'),
('teachers.delete', 'Delete teachers', 'teachers'),
-- Guardians
('guardians.view', 'View guardians', 'guardians'),
('guardians.create', 'Add guardians', 'guardians'),
('guardians.edit', 'Edit guardian info', 'guardians'),
-- Classes
('classes.view', 'View classes', 'academics'),
('classes.create', 'Create classes', 'academics'),
('classes.edit', 'Edit classes', 'academics'),
-- Subjects
('subjects.view', 'View subjects', 'academics'),
('subjects.create', 'Add subjects', 'academics'),
('subjects.edit', 'Edit subjects', 'academics'),
-- Exams
('exams.view', 'View exams', 'exams'),
('exams.create', 'Create exams', 'exams'),
('exams.manage', 'Manage exam results', 'exams'),
-- Attendance
('attendance.view', 'View attendance', 'attendance'),
('attendance.mark', 'Mark attendance', 'attendance'),
-- Finance
('finance.view', 'View finances', 'finance'),
('finance.manage', 'Manage fees and payments', 'finance'),
-- Reports
('reports.view', 'View reports', 'reports'),
('reports.generate', 'Generate report cards', 'reports'),
-- Settings
('settings.view', 'View settings', 'settings'),
('settings.manage', 'Manage settings', 'settings'),
-- Roles
('roles.view', 'View roles', 'roles'),
('roles.assign', 'Assign roles', 'roles'),
-- Timetable
('timetable.view', 'View timetable', 'timetable'),
('timetable.manage', 'Manage timetable', 'timetable'),
-- Announcements
('announcements.view', 'View announcements', 'announcements'),
('announcements.create', 'Create announcements', 'announcements');

-- ============================================================
-- FUNCTION: Auto-create user profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION: Update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON guardians FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON exam_results FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
