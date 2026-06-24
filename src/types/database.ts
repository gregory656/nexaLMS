// ============================================
// NexaLMS Database Types — Full Domain Model
// ============================================

// ====== CORE SYSTEM ======

export interface School {
    id: string;
    name: string;
    motto?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    county?: string;
    country?: string;
    postal_code?: string;
    website?: string;
    logo_url?: string;
    watermark_url?: string;          // School badge used as watermark on all documents
    watermark_public_id?: string;    // Cloudinary public_id for watermark
    school_type?: 'primary' | 'secondary' | 'mixed' | 'tertiary';
    curriculum?: 'cbc' | '844' | 'igcse' | 'ib' | 'other';
    established_year?: number;
    registration_number?: string;
    is_setup_complete: boolean;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    phone?: string;
    school_id: string;
    is_admin: boolean;
    is_active: boolean;
    last_login?: string;
    created_at: string;
    updated_at: string;
}

export type RoleName = 'admin' | 'headteacher' | 'deputy' | 'dos' | 'tod' | 'subject_teacher' | 'class_teacher' | 'bursar' | 'librarian' | 'counselor';

export interface Role {
    id: string;
    name: RoleName;
    display_name: string;
    description?: string;
    school_id: string;
    is_system: boolean;
    created_at: string;
}

export interface Permission {
    id: string;
    name: string;
    description?: string;
    module: string;
    created_at: string;
}

export interface RolePermission {
    id: string;
    role_id: string;
    permission_id: string;
}

export interface UserRole {
    id: string;
    user_id: string;
    role_id: string;
    assigned_by?: string;
    assigned_at: string;
}

export interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    school_id: string;
    created_at: string;
}

export interface SystemSetting {
    id: string;
    school_id: string;
    key: string;
    value: string;
    category: string;
    created_at: string;
    updated_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    is_read: boolean;
    link?: string;
    school_id: string;
    created_at: string;
}

// ====== SUBSCRIPTION ======

export type PlanType = 'basic' | 'pro';

export interface SubscriptionPlan {
    id: string;
    name: string;
    plan_type: PlanType;
    description?: string;
    max_students?: number;
    max_staff?: number;
    features: string[];
    is_active: boolean;
    created_at: string;
}

export interface Subscription {
    id: string;
    school_id: string;
    plan_id: string;
    price_per_student: number;         // Dynamic pricing
    total_students: number;
    total_amount: number;
    status: 'active' | 'trial' | 'expired' | 'cancelled';
    start_date: string;
    end_date?: string;
    trial_ends_at?: string;
    created_at: string;
    updated_at: string;
}

// ====== ACADEMIC STRUCTURE ======

export interface AcademicYear {
    id: string;
    school_id: string;
    name: string;              // e.g. "2026"
    start_date: string;
    end_date: string;
    is_current: boolean;
    created_at: string;
}

export interface Term {
    id: string;
    academic_year_id: string;
    school_id: string;
    name: string;              // e.g. "Term 1"
    term_number: number;
    start_date: string;
    end_date: string;
    is_current: boolean;
    created_at: string;
}

export interface Department {
    id: string;
    school_id: string;
    name: string;
    head_teacher_id?: string;
    description?: string;
    created_at: string;
}

export interface GradeLevel {
    id: string;
    school_id: string;
    name: string;              // e.g. "Form 1", "Form 2"
    level_order: number;       // For sorting
    created_at: string;
}

export interface Stream {
    id: string;
    school_id: string;
    name: string;              // e.g. "East", "West", "Green"
    capacity?: number;
    created_at: string;
}

export interface ClassGroup {
    id: string;
    school_id: string;
    grade_level_id: string;
    stream_id: string;
    academic_year_id: string;
    name: string;              // Auto: "Form 1G" (grade + stream initial)
    class_teacher_id?: string;
    capacity?: number;
    created_at: string;
}

export interface Subject {
    id: string;
    school_id: string;
    name: string;
    code?: string;             // e.g. "MAT", "ENG"
    category?: string;         // e.g. "Sciences", "Languages"
    department_id?: string;
    is_compulsory: boolean;
    created_at: string;
}

export interface House {
    id: string;
    school_id: string;
    name: string;              // e.g. "Muthaiga B"
    color?: string;
    motto?: string;
    patron_teacher_id?: string;
    created_at: string;
}

// ====== STUDENT MANAGEMENT ======

export interface Student {
    id: string;
    school_id: string;
    admission_number?: string;
    first_name: string;
    last_name: string;
    other_names?: string;
    gender?: 'male' | 'female' | 'other';
    date_of_birth?: string;
    class_id?: string;
    house_id?: string;
    guardian_id?: string;
    profile_photo_url?: string;
    status: 'active' | 'suspended' | 'expelled' | 'transferred' | 'graduated';
    admission_date?: string;
    previous_school?: string;
    medical_info?: string;
    special_needs?: string;
    nationality?: string;
    religion?: string;
    created_at: string;
    updated_at: string;
}

// ====== PARENT / GUARDIAN ======

export interface Guardian {
    id: string;
    school_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    alternate_phone?: string;
    relationship?: 'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'grandparent' | 'other';
    occupation?: string;
    address?: string;
    national_id?: string;
    created_at: string;
    updated_at: string;
}

export interface StudentGuardian {
    id: string;
    student_id: string;
    guardian_id: string;
    is_primary: boolean;
    created_at: string;
}

// ====== STAFF / TEACHER ======

export interface Teacher {
    id: string;
    school_id: string;
    user_id?: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    gender?: 'male' | 'female' | 'other';
    tsc_number?: string;       // Teacher Service Commission number
    id_number?: string;
    date_of_birth?: string;
    qualification?: string;
    specialization?: string;
    employment_date?: string;
    employment_type?: 'permanent' | 'contract' | 'intern' | 'volunteer';
    status: 'active' | 'on_leave' | 'suspended' | 'terminated';
    profile_photo_url?: string;
    department_id?: string;
    created_at: string;
    updated_at: string;
}

export interface TeacherSubjectAssignment {
    id: string;
    teacher_id: string;
    subject_id: string;
    class_id?: string;
    academic_year_id: string;
    school_id: string;
    created_at: string;
}

export interface TeacherClassAssignment {
    id: string;
    teacher_id: string;
    class_id: string;
    academic_year_id: string;
    school_id: string;
    is_class_teacher: boolean;
    created_at: string;
}

// ====== EXAMINATION ======

export interface ExamType {
    id: string;
    school_id: string;
    name: string;              // e.g. "CAT 1", "Mid-Term", "End-Term"
    weight?: number;           // Percentage weight
    created_at: string;
}

export interface Exam {
    id: string;
    school_id: string;
    name: string;
    exam_type_id: string;
    term_id: string;
    academic_year_id: string;
    start_date?: string;
    end_date?: string;
    status: 'scheduled' | 'ongoing' | 'completed' | 'published';
    created_at: string;
}

export interface ExamResult {
    id: string;
    exam_id: string;
    student_id: string;
    subject_id: string;
    class_id: string;
    marks?: number;
    grade?: string;
    remarks?: string;
    teacher_id?: string;
    school_id: string;
    created_at: string;
    updated_at: string;
}

export interface GradeScale {
    id: string;
    school_id: string;
    grade: string;             // e.g. "A", "B+", "B"
    min_marks: number;
    max_marks: number;
    points?: number;
    remarks?: string;
    created_at: string;
}

// ====== ATTENDANCE ======

export interface AttendanceSession {
    id: string;
    school_id: string;
    class_id: string;
    date: string;
    session_type: 'morning' | 'afternoon' | 'full_day';
    taken_by?: string;
    created_at: string;
}

export interface StudentAttendance {
    id: string;
    session_id: string;
    student_id: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    reason?: string;
    school_id: string;
    created_at: string;
}

// ====== FINANCE ======

export interface FeeCategory {
    id: string;
    school_id: string;
    name: string;              // e.g. "Tuition", "Transport", "Lunch"
    description?: string;
    created_at: string;
}

export interface FeeStructure {
    id: string;
    school_id: string;
    grade_level_id: string;
    academic_year_id: string;
    term_id?: string;
    fee_category_id: string;
    amount: number;
    is_optional: boolean;
    created_at: string;
}

export interface Invoice {
    id: string;
    school_id: string;
    student_id: string;
    invoice_number: string;
    term_id: string;
    academic_year_id: string;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: 'pending' | 'partial' | 'paid' | 'overdue';
    due_date?: string;
    created_at: string;
    updated_at: string;
}

export interface Payment {
    id: string;
    school_id: string;
    invoice_id: string;
    student_id: string;
    amount: number;
    payment_method: 'mpesa' | 'bank' | 'cash' | 'cheque' | 'other';
    reference_number?: string;
    payment_date: string;
    received_by?: string;
    notes?: string;
    created_at: string;
}

export interface Receipt {
    id: string;
    school_id: string;
    payment_id: string;
    receipt_number: string;
    created_at: string;
}

// ====== TIMETABLE ======

export interface Timetable {
    id: string;
    school_id: string;
    academic_year_id: string;
    term_id: string;
    name: string;
    is_active: boolean;
    created_at: string;
}

export interface TimetableEntry {
    id: string;
    timetable_id: string;
    class_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: number;       // 0=Mon, 1=Tue ... 4=Fri
    start_time: string;
    end_time: string;
    room?: string;
    school_id: string;
    created_at: string;
}

// ====== COMMUNICATION ======

export interface Announcement {
    id: string;
    school_id: string;
    title: string;
    content: string;
    author_id: string;
    target_audience: 'all' | 'teachers' | 'students' | 'parents' | 'staff';
    is_published: boolean;
    published_at?: string;
    expires_at?: string;
    created_at: string;
}

// ====== REPORT CARD ======

export interface ReportCard {
    id: string;
    school_id: string;
    student_id: string;
    class_id: string;
    term_id: string;
    academic_year_id: string;
    total_marks?: number;
    average?: number;
    grade?: string;
    position?: number;
    class_size?: number;
    teacher_remarks?: string;
    principal_remarks?: string;
    is_published: boolean;
    created_at: string;
}

// ====== DOCUMENT ======

export interface Document {
    id: string;
    school_id: string;
    name: string;
    category: string;
    file_url: string;
    file_public_id?: string;
    uploaded_by: string;
    created_at: string;
}
