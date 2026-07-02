export interface TimetableBreak {
    name: string;
    start_time: string;
    end_time: string;
}

export interface TimetableSettings {
    id?: string;
    school_id: string;
    academic_year_id: string;
    term_name: string;
    name: string;
    working_days: number[];
    lesson_duration_minutes: number;
    periods_per_day: number;
    school_start_time: string;
    school_end_time: string;
    min_teacher_lessons_per_day: number;
    max_teacher_lessons_per_day: number;
    min_class_lessons_per_day: number;
    max_class_lessons_per_day: number;
    breaks: TimetableBreak[];
}

export interface TimeSlot {
    day: number;
    dayName: string;
    period: number;
    start_time: string;
    end_time: string;
    key: string;
}

export interface LessonAssignment {
    teacher_id: string;
    subject_id: string;
    class_id: string;
    lessons_per_week: number;
    teacher_name: string;
    subject_name: string;
    class_name: string;
}

export interface GeneratedEntry {
    class_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: number;
    period_number: number;
    start_time: string;
    end_time: string;
    class_name?: string;
    subject_name?: string;
    teacher_name?: string;
}

export interface GenerationResult {
    success: boolean;
    entries: GeneratedEntry[];
    errors: string[];
}

export interface TimetableRecord {
    id: string;
    school_id: string;
    academic_year_id: string;
    term_id?: string;
    term_name?: string;
    name: string;
    version: number;
    status: 'draft' | 'published' | 'archived';
    is_active: boolean;
    generated_at?: string;
    generated_by?: string;
    settings_snapshot?: TimetableSettings;
    created_at: string;
}

export const WORKING_DAY_PRESETS = [
    { label: 'Monday – Friday', days: [0, 1, 2, 3, 4] },
    { label: 'Monday – Saturday', days: [0, 1, 2, 3, 4, 5] },
    { label: 'Tuesday – Saturday', days: [1, 2, 3, 4, 5] },
    { label: 'Custom', days: [] as number[] },
];

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
