type StudentLike = { first_name?: string; last_name?: string; admission_number?: string };
type SubjectLike = { subjects?: { name?: string }; subject_name?: string; marks?: number | string | null; classMean?: number | null };

const strengthWords = ['steady', 'focused', 'promising', 'disciplined', 'resilient', 'curious'];
const actionWords = ['revise', 'practise', 'review', 'attempt', 'discuss', 'summarise'];

function pick(items: string[], seed: string, offset = 0) {
    const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) + offset;
    return items[Math.abs(total) % items.length];
}

function learnerName(student: StudentLike) {
    return student.first_name || student.last_name || 'The learner';
}

export function movementSymbol(value: number | null | undefined) {
    if (value == null || Number.isNaN(Number(value))) return '0';
    if (Number(value) > 0.05) return '^';
    if (Number(value) < -0.05) return 'v';
    return '0';
}

export function subjectTeacherRemark(row: SubjectLike, student: StudentLike, index = 0) {
    const mark = row.marks == null || row.marks === '' ? null : Number(row.marks);
    const subject = row.subjects?.name || row.subject_name || 'this subject';
    const seed = `${student.admission_number || ''}${subject}${index}`;
    if (mark == null || Number.isNaN(mark)) return `Follow up required in ${subject}.`;
    if (mark >= 80) return `${pick(strengthWords, seed)} mastery; extend with higher-order tasks.`;
    if (mark >= 65) return `Good command; ${pick(actionWords, seed)} weak strands for a higher band.`;
    if (mark >= 50) return `Fair progress; more guided practice will lift ${subject}.`;
    return `Needs close support; complete daily practice in ${subject}.`;
}

export function classTeacherRemark(args: {
    student: StudentLike;
    mean: number;
    improvement?: number | null;
    strengths?: string[];
    focus?: string[];
}) {
    const name = learnerName(args.student);
    const seed = `${args.student.admission_number || name}${args.mean}`;
    const trend = args.improvement == null ? 'has a clear growth path' : args.improvement >= 0 ? 'is improving' : 'should regain momentum';
    const focus = args.focus?.[0] ? ` Priority attention should go to ${args.focus[0]}.` : '';
    if (args.mean >= 75) return `${name} is ${pick(strengthWords, seed)} and ${trend}. Maintain consistency across all learning areas.${focus}`;
    if (args.mean >= 55) return `${name} is making workable progress and ${trend}. Regular revision and timely assignments will improve the mean.${focus}`;
    return `${name} needs structured support and closer follow-up. Short daily targets, corrections, and parent-teacher monitoring are recommended.${focus}`;
}

export function principalRemark(args: {
    student: StudentLike;
    mean: number;
    position?: number;
    totalStudents?: number;
    improvement?: number | null;
}) {
    const name = learnerName(args.student);
    const rankText = args.position && args.totalStudents ? ` ranked ${args.position} of ${args.totalStudents}` : '';
    if (args.mean >= 80) return `${name}${rankText} has shown excellent academic discipline. Keep stretching this potential through wider reading and leadership.`;
    if (args.mean >= 60) return `${name}${rankText} has produced a solid result. With sharper targets, the next report can be stronger.`;
    return `${name}${rankText} can improve with consistent attendance, corrections, and close cooperation between home and school.`;
}

export function predictionForStudent(args: {
    student: StudentLike;
    mean: number;
    classMean?: number;
    improvement?: number | null;
    focus?: string[];
}) {
    const delta = args.improvement || 0;
    const projected = Math.max(0, Math.min(100, args.mean + delta * 0.6 + (args.mean >= (args.classMean || args.mean) ? 2 : 1)));
    const focus = args.focus?.[0] ? ` Biggest gain area: ${args.focus[0]}.` : '';
    return `Projected next mean: ${projected.toFixed(1)} if current habits continue.${focus}`;
}
