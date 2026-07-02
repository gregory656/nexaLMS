import type { TimetableSettings, TimeSlot, LessonAssignment, GenerationResult } from './types';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function buildTimeSlots(settings: TimetableSettings): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const startMins = timeToMinutes(settings.school_start_time);
    const duration = settings.lesson_duration_minutes;
    let cursor = startMins;
    const breaks = [...(settings.breaks || [])].sort(
        (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    const periods: { period: number; start: string; end: string }[] = [];
    let periodNum = 1;

    while (periodNum <= settings.periods_per_day && cursor < timeToMinutes(settings.school_end_time)) {
        const periodStart = minutesToTime(cursor);
        const periodEnd = minutesToTime(cursor + duration);

        const overlappingBreak = breaks.find(b => {
            const bs = timeToMinutes(b.start_time);
            const be = timeToMinutes(b.end_time);
            const ps = cursor;
            const pe = cursor + duration;
            return ps < be && pe > bs;
        });

        if (overlappingBreak) {
            cursor = timeToMinutes(overlappingBreak.end_time);
            continue;
        }

        if (timeToMinutes(periodEnd) > timeToMinutes(settings.school_end_time)) break;

        periods.push({ period: periodNum, start: periodStart, end: periodEnd });
        cursor += duration;
        periodNum++;
    }

    for (const day of settings.working_days) {
        for (const p of periods) {
            slots.push({
                day,
                dayName: DAY_NAMES[day] || `Day ${day}`,
                period: p.period,
                start_time: p.start,
                end_time: p.end,
                key: `${day}-${p.period}`,
            });
        }
    }

    return slots;
}

// Get break slots that can be inserted into the timetable
export function getBreakSlots(settings: TimetableSettings): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const breaks = [...(settings.breaks || [])].sort(
        (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    for (const day of settings.working_days) {
        for (let i = 0; i < breaks.length; i++) {
            const brk = breaks[i];
            slots.push({
                day,
                dayName: DAY_NAMES[day] || `Day ${day}`,
                period: 100 + i, // Use high numbers to identify breaks
                start_time: brk.start_time,
                end_time: brk.end_time,
                key: `${day}-break-${i}`,
            });
        }
    }

    return slots;
}

export interface GeneratorInput {
    settings: TimetableSettings;
    assignments: LessonAssignment[];
    slots: TimeSlot[];
    onProgress?: (pct: number) => void;
}

export function generateTimetable(input: GeneratorInput): GenerationResult {
    const { settings, assignments, slots, onProgress } = input;
    const entries: GenerationResult['entries'] = [];
    const errors: string[] = [];

    const teacherSchedule = new Map<string, Set<string>>();
    const classSchedule = new Map<string, Set<string>>();
    const teacherDailyCount = new Map<string, Map<number, number>>();
    const classDailyCount = new Map<string, Map<number, number>>();

    const sorted = [...assignments].sort((a, b) => b.lessons_per_week - a.lessons_per_week);
    const totalLessons = sorted.reduce((s, a) => s + a.lessons_per_week, 0);
    let placed = 0;

    const canPlace = (
        assignment: LessonAssignment,
        slot: TimeSlot,
        teacherKey: string,
        classKey: string
    ): boolean => {
        if (teacherSchedule.get(teacherKey)?.has(slot.key)) return false;
        if (classSchedule.get(classKey)?.has(slot.key)) return false;

        const tDaily = teacherDailyCount.get(assignment.teacher_id)?.get(slot.day) || 0;
        if (tDaily >= settings.max_teacher_lessons_per_day) return false;

        const cDaily = classDailyCount.get(assignment.class_id)?.get(slot.day) || 0;
        if (cDaily >= settings.max_class_lessons_per_day) return false;

        return true;
    };

    const place = (assignment: LessonAssignment, slot: TimeSlot) => {
        const teacherKey = assignment.teacher_id;
        const classKey = assignment.class_id;

        if (!teacherSchedule.has(teacherKey)) teacherSchedule.set(teacherKey, new Set());
        if (!classSchedule.has(classKey)) classSchedule.set(classKey, new Set());
        if (!teacherDailyCount.has(teacherKey)) teacherDailyCount.set(teacherKey, new Map());
        if (!classDailyCount.has(classKey)) classDailyCount.set(classKey, new Map());

        teacherSchedule.get(teacherKey)!.add(slot.key);
        classSchedule.get(classKey)!.add(slot.key);

        const tMap = teacherDailyCount.get(teacherKey)!;
        tMap.set(slot.day, (tMap.get(slot.day) || 0) + 1);
        const cMap = classDailyCount.get(classKey)!;
        cMap.set(slot.day, (cMap.get(slot.day) || 0) + 1);

        entries.push({
            class_id: assignment.class_id,
            subject_id: assignment.subject_id,
            teacher_id: assignment.teacher_id,
            day_of_week: slot.day,
            period_number: slot.period,
            start_time: slot.start_time,
            end_time: slot.end_time,
            class_name: assignment.class_name,
            subject_name: assignment.subject_name,
            teacher_name: assignment.teacher_name,
        });
        placed++;
        onProgress?.(Math.round((placed / totalLessons) * 100));
    };

    const unplace = (_entryIdx: number, assignment: LessonAssignment, slot: TimeSlot) => {
        const teacherKey = assignment.teacher_id;
        const classKey = assignment.class_id;
        teacherSchedule.get(teacherKey)?.delete(slot.key);
        classSchedule.get(classKey)?.delete(slot.key);
        const tMap = teacherDailyCount.get(teacherKey);
        if (tMap) tMap.set(slot.day, Math.max(0, (tMap.get(slot.day) || 1) - 1));
        const cMap = classDailyCount.get(classKey);
        if (cMap) cMap.set(slot.day, Math.max(0, (cMap.get(slot.day) || 1) - 1));
        entries.pop();
        placed--;
    };

    const backtrack = (assignmentIdx: number, lessonIdx: number): boolean => {
        if (assignmentIdx >= sorted.length) return true;

        const assignment = sorted[assignmentIdx];
        if (lessonIdx >= assignment.lessons_per_week) {
            return backtrack(assignmentIdx + 1, 0);
        }

        const shuffledSlots = [...slots].sort(() => Math.random() - 0.5);

        for (const slot of shuffledSlots) {
            if (canPlace(assignment, slot, assignment.teacher_id, assignment.class_id)) {
                place(assignment, slot);
                if (backtrack(assignmentIdx, lessonIdx + 1)) return true;
                unplace(entries.length, assignment, slot);
            }
        }

        return false;
    };

    const success = backtrack(0, 0);

    if (!success) {
        const placedCounts = new Map<string, number>();
        for (const e of entries) {
            const key = `${e.class_id}-${e.subject_id}-${e.teacher_id}`;
            placedCounts.set(key, (placedCounts.get(key) || 0) + 1);
        }
        for (const a of sorted) {
            const key = `${a.class_id}-${a.subject_id}-${a.teacher_id}`;
            const got = placedCounts.get(key) || 0;
            if (got < a.lessons_per_week) {
                errors.push(
                    `Could not place all ${a.lessons_per_week} lessons for ${a.subject_name} (${a.class_name}) with ${a.teacher_name}. Placed ${got}.`
                );
            }
        }
        if (errors.length === 0) {
            errors.push('Timetable generation failed. Try adjusting periods, working days, or teacher assignments.');
        }
    }

    return { success: success && errors.length === 0, entries, errors };
}

export { DAY_NAMES };
