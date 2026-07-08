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

const MAX_GENERATION_ATTEMPTS = 24;
const MAX_PLACEMENT_CHECKS = 250_000;

type LessonTask = LessonAssignment & {
    lessonNumber: number;
    totalForAssignment: number;
};

function incrementNestedCount(map: Map<string, Map<number, number>>, id: string, day: number) {
    if (!map.has(id)) map.set(id, new Map());
    const dayMap = map.get(id)!;
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
}

function getNestedCount(map: Map<string, Map<number, number>>, id: string, day: number): number {
    return map.get(id)?.get(day) || 0;
}

function buildCapacityErrors(
    settings: TimetableSettings,
    assignments: LessonAssignment[],
    slots: TimeSlot[]
): string[] {
    const errors: string[] = [];
    const days = Math.max(settings.working_days.length, 0);
    const slotsByClass = slots.length;
    const maxClassLessons = days * Math.max(settings.max_class_lessons_per_day || 0, 0);
    const maxTeacherLessons = days * Math.max(settings.max_teacher_lessons_per_day || 0, 0);
    const classDemand = new Map<string, { name: string; lessons: number }>();
    const teacherDemand = new Map<string, { name: string; lessons: number }>();

    for (const assignment of assignments) {
        const lessons = Math.max(0, Math.floor(assignment.lessons_per_week || 0));
        const classItem = classDemand.get(assignment.class_id) || { name: assignment.class_name, lessons: 0 };
        classItem.lessons += lessons;
        classDemand.set(assignment.class_id, classItem);

        const teacherItem = teacherDemand.get(assignment.teacher_id) || { name: assignment.teacher_name, lessons: 0 };
        teacherItem.lessons += lessons;
        teacherDemand.set(assignment.teacher_id, teacherItem);
    }

    for (const item of classDemand.values()) {
        const capacity = Math.min(slotsByClass, maxClassLessons || slotsByClass);
        if (item.lessons > capacity) {
            errors.push(`${item.name} needs ${item.lessons} lessons, but the current setup allows only ${capacity}.`);
        }
    }

    for (const item of teacherDemand.values()) {
        const capacity = Math.min(slots.length, maxTeacherLessons || slots.length);
        if (item.lessons > capacity) {
            errors.push(`${item.name} is assigned ${item.lessons} lessons, but the current setup allows only ${capacity}.`);
        }
    }

    return errors;
}

export function generateTimetable(input: GeneratorInput): GenerationResult {
    const { settings, assignments, slots, onProgress } = input;
    const errors: string[] = [];

    const usableAssignments = assignments
        .map(assignment => ({
            ...assignment,
            lessons_per_week: Math.max(0, Math.floor(assignment.lessons_per_week || 0)),
        }))
        .filter(assignment => assignment.lessons_per_week > 0);

    if (slots.length === 0) {
        return { success: false, entries: [], errors: ['No lesson periods are available. Check the school day times, breaks, and periods per day.'] };
    }

    if (usableAssignments.length === 0) {
        return { success: false, entries: [], errors: ['No weekly lessons were found for the selected academic year.'] };
    }

    const capacityErrors = buildCapacityErrors(settings, usableAssignments, slots);
    if (capacityErrors.length > 0) {
        return { success: false, entries: [], errors: capacityErrors };
    }

    const tasks: LessonTask[] = usableAssignments.flatMap(assignment =>
        Array.from({ length: assignment.lessons_per_week }, (_, lessonNumber) => ({
            ...assignment,
            lessonNumber,
            totalForAssignment: assignment.lessons_per_week,
        }))
    );
    const totalLessons = tasks.length;
    let bestEntries: GenerationResult['entries'] = [];
    let bestMissingTasks: LessonTask[] = tasks;
    let placementChecks = 0;
    let lastProgress = -1;

    const progress = (placed: number) => {
        const pct = Math.round((placed / totalLessons) * 100);
        if (pct !== lastProgress && (pct === 100 || pct - lastProgress >= 5)) {
            lastProgress = pct;
            onProgress?.(pct);
        }
    };

    const orderedSlotsForAttempt = (attempt: number) => {
        const byLeastBusyTime = [...slots].sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            return a.day - b.day;
        });
        const offset = attempt % byLeastBusyTime.length;
        return byLeastBusyTime.slice(offset).concat(byLeastBusyTime.slice(0, offset));
    };

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS && placementChecks < MAX_PLACEMENT_CHECKS; attempt++) {
        const entries: GenerationResult['entries'] = [];
        const teacherSchedule = new Map<string, Set<string>>();
        const classSchedule = new Map<string, Set<string>>();
        const teacherDailyCount = new Map<string, Map<number, number>>();
        const classDailyCount = new Map<string, Map<number, number>>();
        const classSubjectDayCount = new Map<string, Map<number, number>>();
        const attemptSlots = orderedSlotsForAttempt(attempt);
        const missingTasks: LessonTask[] = [];

        const orderedTasks = [...tasks].sort((a, b) => {
            if (b.totalForAssignment !== a.totalForAssignment) return b.totalForAssignment - a.totalForAssignment;
            if (a.lessonNumber !== b.lessonNumber) return a.lessonNumber - b.lessonNumber;
            return `${a.class_name}-${a.subject_name}`.localeCompare(`${b.class_name}-${b.subject_name}`);
        });

        for (const task of orderedTasks) {
            let bestSlot: TimeSlot | null = null;
            let bestScore = Number.POSITIVE_INFINITY;
            const preferredDay = (task.lessonNumber + attempt) % Math.max(settings.working_days.length, 1);

            for (const slot of attemptSlots) {
                placementChecks++;
                if (placementChecks > MAX_PLACEMENT_CHECKS) break;
                if (teacherSchedule.get(task.teacher_id)?.has(slot.key)) continue;
                if (classSchedule.get(task.class_id)?.has(slot.key)) continue;
                if (getNestedCount(teacherDailyCount, task.teacher_id, slot.day) >= settings.max_teacher_lessons_per_day) continue;
                if (getNestedCount(classDailyCount, task.class_id, slot.day) >= settings.max_class_lessons_per_day) continue;

                const subjectDayKey = `${task.class_id}-${task.subject_id}`;
                const sameSubjectSameDay = getNestedCount(classSubjectDayCount, subjectDayKey, slot.day);
                const teacherDayLoad = getNestedCount(teacherDailyCount, task.teacher_id, slot.day);
                const classDayLoad = getNestedCount(classDailyCount, task.class_id, slot.day);
                const dayDistance = Math.abs(settings.working_days.indexOf(slot.day) - preferredDay);
                const score = sameSubjectSameDay * 20 + teacherDayLoad * 3 + classDayLoad * 2 + dayDistance + slot.period / 100;

                if (score < bestScore) {
                    bestScore = score;
                    bestSlot = slot;
                }
            }

            if (!bestSlot) {
                missingTasks.push(task);
                if (placementChecks > MAX_PLACEMENT_CHECKS) break;
                continue;
            }

            if (!teacherSchedule.has(task.teacher_id)) teacherSchedule.set(task.teacher_id, new Set());
            if (!classSchedule.has(task.class_id)) classSchedule.set(task.class_id, new Set());
            teacherSchedule.get(task.teacher_id)!.add(bestSlot.key);
            classSchedule.get(task.class_id)!.add(bestSlot.key);
            incrementNestedCount(teacherDailyCount, task.teacher_id, bestSlot.day);
            incrementNestedCount(classDailyCount, task.class_id, bestSlot.day);
            incrementNestedCount(classSubjectDayCount, `${task.class_id}-${task.subject_id}`, bestSlot.day);

            entries.push({
                class_id: task.class_id,
                subject_id: task.subject_id,
                teacher_id: task.teacher_id,
                day_of_week: bestSlot.day,
                period_number: bestSlot.period,
                start_time: bestSlot.start_time,
                end_time: bestSlot.end_time,
                class_name: task.class_name,
                subject_name: task.subject_name,
                teacher_name: task.teacher_name,
            });
            progress(entries.length);
        }

        if (entries.length > bestEntries.length) {
            bestEntries = entries;
            bestMissingTasks = missingTasks;
        }

        if (missingTasks.length === 0) {
            progress(totalLessons);
            return { success: true, entries, errors: [] };
        }
    }

    const placedCounts = new Map<string, number>();
    for (const entry of bestEntries) {
        const key = `${entry.class_id}-${entry.subject_id}-${entry.teacher_id}`;
        placedCounts.set(key, (placedCounts.get(key) || 0) + 1);
    }

    const seen = new Set<string>();
    for (const task of bestMissingTasks) {
        const key = `${task.class_id}-${task.subject_id}-${task.teacher_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const got = placedCounts.get(key) || 0;
        errors.push(`Could not place all ${task.totalForAssignment} lessons for ${task.subject_name} (${task.class_name}) with ${task.teacher_name}. Placed ${got}.`);
    }

    if (errors.length === 0) {
        errors.push('Timetable generation could not satisfy every constraint. Try adding periods, reducing teacher/class daily limits, or reviewing teacher assignments.');
    }

    return { success: false, entries: bestEntries, errors };
}

export { DAY_NAMES };
