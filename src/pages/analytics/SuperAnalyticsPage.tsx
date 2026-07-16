import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { generateSuperAnalyticsPdf } from '../../lib/superAnalyticsPdf';
import toast from 'react-hot-toast';
import {
    Download, BarChart3, TrendingUp, TrendingDown, Users,
    Award, Target, AlertTriangle, Zap, Star
} from 'lucide-react';

// ── CBC Grade Scale (matches pdf.ts exactly) ─────────────────────────────

const CBC_LEVELS = [
    { level: 'EE1', min: 90, max: 100, label: 'Exceeding Expectations', points: '8', color: '#065f46' },
    { level: 'EE2', min: 75, max: 89, label: 'Exceeding Expectations', points: '7', color: '#059669' },
    { level: 'ME1', min: 58, max: 74, label: 'Meeting Expectations', points: '6', color: '#0891b2' },
    { level: 'ME2', min: 42, max: 57, label: 'Meeting Expectations', points: '5', color: '#6366f1' },
    { level: 'AE2', min: 31, max: 41, label: 'Approaching Expectations', points: '4', color: '#d97706' },
    { level: 'AE1', min: 21, max: 30, label: 'Approaching Expectations', points: '3', color: '#f59e0b' },
    { level: 'BE2', min: 11, max: 20, label: 'Below Expectations', points: '2', color: '#ef4444' },
    { level: 'BE1', min: 0, max: 10, label: 'Below Expectations', points: '1', color: '#b91c1c' },
];

function cbcLevel(marks: number | null | undefined) {
    if (marks == null || isNaN(Number(marks))) return { level: '-', label: 'No Mark', points: '0', color: '#94a3b8', min: 0, max: 0 };
    const n = Number(marks);
    for (const lvl of CBC_LEVELS) {
        if (n >= lvl.min && n <= lvl.max) return lvl;
    }
    if (n > 100) return CBC_LEVELS[0];
    return CBC_LEVELS[CBC_LEVELS.length - 1];
}

// "Pass" in CBC context = ME2 or above (≥42)
const CBC_PASS_MARK = 42;
// "Excelling" / top = EE1+EE2 (≥75)
const CBC_EXCEL_MARK = 75;

// ── Helpers ───────────────────────────────────────────────────────────────

function pct(v: number, d = 1) { return isNaN(v) || !isFinite(v) ? '-' : v.toFixed(d) + '%'; }
function dash(v: any, fb = '-') { return v === null || v === undefined || v === '' ? fb : String(v); }
function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function passRate(marks: number[], pm = CBC_PASS_MARK) {
    return marks.length ? (marks.filter(m => m >= pm).length / marks.length) * 100 : 0;
}

// Level badge colour helper
function levelBadge(level: string) {
    const found = CBC_LEVELS.find(l => l.level === level);
    return found?.color || '#64748b';
}

// ── Metric Card ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color, icon: Icon }: any) {
    return (
        <div style={{
            background: 'white', border: `2px solid ${color}22`, borderRadius: 12,
            padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center', gap: '0.25rem',
            boxShadow: `0 2px 12px ${color}18`
        }}>
            {Icon && <Icon size={18} style={{ color }} />}
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
            {sub && <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{sub}</span>}
        </div>
    );
}

// ── Section Header ────────────────────────────────────────────────────────

function SectionHeader({ level, title, subtitle, color = '#125E52' }: any) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem', background: `${color}12`, borderRadius: 10,
            border: `1.5px solid ${color}30`, marginBottom: '0.75rem'
        }}>
            <div style={{
                background: color, color: 'white', borderRadius: 8,
                padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap'
            }}>
                {level}
            </div>
            <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{subtitle}</div>}
            </div>
        </div>
    );
}

// ── Slim Table ────────────────────────────────────────────────────────────

function SlimTable({ headers, rows }: { headers: string[]; rows: any[][] }) {
    return (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                    <tr style={{ background: '#125E52' }}>
                        {headers.map(h => (
                            <th key={h} style={{ color: 'white', fontWeight: 700, padding: '0.5rem 0.75rem', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr><td colSpan={headers.length} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>No data available</td></tr>
                    )}
                    {rows.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fffe' : 'white', borderBottom: '1px solid #f1f5f9' }}>
                            {row.map((cell: any, j: number) => {
                                const isCBC = typeof cell === 'string' && CBC_LEVELS.some(l => l.level === cell);
                                return (
                                    <td key={j} style={{ padding: '0.45rem 0.75rem', color: isCBC ? levelBadge(cell) : '#1e293b', fontWeight: isCBC ? 700 : 400 }}>
                                        {typeof cell === 'number' ? cell.toFixed(cell % 1 === 0 ? 0 : 1) : cell ?? '-'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Bar Sparkline ─────────────────────────────────────────────────────────

function MiniBar({ value, max = 100, color = '#125E52', label }: any) {
    const w = Math.min(100, (value / max) * 100);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 80, fontSize: '0.65rem', color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{label}</span>
            <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 8 }}>
                <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 8 }} />
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color, width: 32, textAlign: 'right' }}>{value.toFixed(1)}</span>
        </div>
    );
}

// ── CBC Level Badge Chip ──────────────────────────────────────────────────

function LevelChip({ level }: { level: string }) {
    const found = CBC_LEVELS.find(l => l.level === level);
    if (!found || level === '-') return <span style={{ color: '#94a3b8' }}>-</span>;
    return (
        <span style={{
            background: found.color + '18', color: found.color, border: `1px solid ${found.color}40`,
            borderRadius: 5, padding: '0.1rem 0.45rem', fontSize: '0.72rem', fontWeight: 700
        }}>
            {level}
        </span>
    );
}

// ── Main Page Component ───────────────────────────────────────────────────

export default function SuperAnalyticsPage() {
    const { school } = useAuth();

    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [gradeScales, setGradeScales] = useState<any[]>([]);
    const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);

    const [selectedExam, setSelectedExam] = useState('');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    // ── Fetch all data ──
    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const pageSize = 1000;
        let allResults: any[] = [];
        for (let from = 0; ; from += pageSize) {
            const { data } = await supabase.from('exam_results').select('*').eq('school_id', school.id).range(from, from + pageSize - 1);
            allResults.push(...(data || []));
            if (!data || data.length < pageSize) break;
        }
        const [exRes, clRes, stuRes, subRes, deptRes, gsRes, taRes] = await Promise.all([
            supabase.from('exams').select('*, terms(name), academic_years(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            supabase.from('subjects').select('*').eq('school_id', school.id).order('name'),
            supabase.from('departments').select('*').eq('school_id', school.id).order('name'),
            supabase.from('grade_scales').select('*').eq('school_id', school.id).order('min_marks', { ascending: false }),
            supabase.from('teacher_subject_assignments').select('*, teachers(id, first_name, last_name)').eq('school_id', school.id),
        ]);
        setExams(exRes.data || []);
        setClasses(clRes.data || []);
        setStudents(stuRes.data || []);
        setResults(allResults);
        setSubjects(subRes.data || []);
        setDepartments(deptRes.data || []);
        setGradeScales(gsRes.data || []);
        setTeacherAssignments(taRes.data || []);
        if (exRes.data?.length) setSelectedExam(exRes.data[0].id);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    // ── CBC level resolver: db scale takes priority, fallback to built-in CBC ──
    const getCBCLevel = (marks: number | null | undefined) => {
        if (marks == null || isNaN(Number(marks))) return { level: '-', label: 'No Mark', points: '0', color: '#94a3b8' };
        const n = Number(marks);
        // Try DB-configured scale first (it uses 'grade' field which should store EE1/EE2 etc.)
        for (const gs of gradeScales) {
            if (n >= gs.min_marks && n <= gs.max_marks) {
                return { level: gs.grade, label: gs.remarks || gs.grade, points: gs.points || '', color: levelBadge(gs.grade) };
            }
        }
        // Fallback: built-in CBC scale
        return cbcLevel(n);
    };

    // ── Computed analytics ──
    const analytics = useMemo(() => {
        if (!selectedExam) return null;
        const examResults = results.filter(r => r.exam_id === selectedExam);
        const examStudentIds = [...new Set(examResults.map(r => r.student_id))];
        const examStudents = students.filter(s => examStudentIds.includes(s.id));

        function studentMean(sid: string) {
            const sr = examResults.filter(r => r.student_id === sid);
            return sr.length ? avg(sr.map(r => Number(r.marks || 0))) : 0;
        }
        function studentTotal(sid: string) {
            return examResults.filter(r => r.student_id === sid).reduce((s, r) => s + Number(r.marks || 0), 0);
        }
        function studentLevel(sid: string) { return getCBCLevel(studentMean(sid)).level; }

        const rankedStudents = [...examStudents]
            .map(s => ({ ...s, mean: studentMean(s.id), total: studentTotal(s.id), level: studentLevel(s.id) }))
            .sort((a, b) => b.total - a.total)
            .map((s, i) => ({ ...s, position: i + 1 }));

        const allMeans = rankedStudents.map(s => s.mean);
        const schoolMean = avg(allMeans);
        const schoolLevel = getCBCLevel(schoolMean).level;
        const schoolLevelLabel = getCBCLevel(schoolMean).label;

        const totalCandidates = rankedStudents.length;

        // CBC pass = ME2+ (≥42)
        const passCount = rankedStudents.filter(s => s.mean >= CBC_PASS_MARK).length;
        const passRateVal = totalCandidates ? (passCount / totalCandidates) * 100 : 0;

        // Excellence = EE1/EE2 (≥75)
        const excelCount = rankedStudents.filter(s => s.mean >= CBC_EXCEL_MARK).length;
        const excelRate = totalCandidates ? (excelCount / totalCandidates) * 100 : 0;

        // CBC level counts
        const levelCounts: Record<string, number> = {};
        rankedStudents.forEach(s => { levelCounts[s.level] = (levelCounts[s.level] || 0) + 1; });

        // Subject stats
        const subjectStats = subjects.map(sub => {
            const sr = examResults.filter(r => r.subject_id === sub.id);
            if (!sr.length) return null;
            const marks = sr.map(r => Number(r.marks || 0));
            const sm = avg(marks);
            const highest = Math.max(...marks);
            const lowest = Math.min(...marks);
            const sorted = [...marks].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
            const variance = avg(marks.map(m => (m - sm) ** 2));
            const stdDev = Math.sqrt(variance);
            return {
                id: sub.id, name: sub.name, mean: sm, highest, lowest, median, stdDev,
                range: highest - lowest, count: marks.length,
                passRate: passRate(marks),
                level: getCBCLevel(sm).level,
                levelLabel: getCBCLevel(sm).label,
                failCount: marks.filter(m => m < CBC_PASS_MARK).length,
            };
        }).filter(Boolean).sort((a: any, b: any) => b.mean - a.mean) as any[];

        // Class stats
        const classStats = classes.map(cls => {
            const cs = rankedStudents.filter(s => s.class_id === cls.id);
            if (!cs.length) return null;
            const cm = avg(cs.map(s => s.mean));
            const pr = passRate(cs.map(s => s.mean));
            const classSubjectMeans = subjects.map(sub => {
                const sr = examResults.filter(r => r.subject_id === sub.id && cs.map(c => c.id).includes(r.student_id));
                if (!sr.length) return null;
                return { name: sub.name, mean: avg(sr.map(r => Number(r.marks || 0))) };
            }).filter(Boolean) as any[];
            return {
                ...cls, mean: cm, passRate: pr, count: cs.length,
                topStudent: cs[0], bottomStudent: cs[cs.length - 1],
                level: getCBCLevel(cm).level,
                students: cs, subjectMeans: classSubjectMeans,
            };
        }).filter(Boolean).sort((a: any, b: any) => b.mean - a.mean) as any[];

        // Department stats
        const deptStats = departments.map(dept => {
            const deptSubjects = subjects.filter(s => s.department_id === dept.id);
            const deptMarks: number[] = [];
            deptSubjects.forEach(sub => {
                examResults.filter(r => r.subject_id === sub.id).forEach(r => deptMarks.push(Number(r.marks || 0)));
            });
            if (!deptMarks.length) return null;
            const dm = avg(deptMarks);
            return {
                id: dept.id, name: dept.name,
                subjectCount: deptSubjects.length, entries: deptMarks.length,
                mean: dm, passRate: passRate(deptMarks),
                level: getCBCLevel(dm).level,
            };
        }).filter(Boolean).sort((a: any, b: any) => b.mean - a.mean) as any[];

        // Teacher stats
        const teacherMap: Record<string, any> = {};
        teacherAssignments.forEach((ta: any) => {
            const teacher = ta.teachers;
            if (!teacher) return;
            const key = `${teacher.id}_${ta.subject_id}`;
            if (!teacherMap[key]) {
                const tMarks = examResults.filter(r => r.subject_id === ta.subject_id).map(r => Number(r.marks || 0));
                teacherMap[key] = {
                    name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
                    subject: subjects.find(s => s.id === ta.subject_id)?.name || '-',
                    marks: tMarks,
                    mean: tMarks.length ? avg(tMarks) : 0,
                    passRate: passRate(tMarks),
                    excelRate: tMarks.length ? (tMarks.filter(m => m >= CBC_EXCEL_MARK).length / tMarks.length) * 100 : 0,
                    count: tMarks.length,
                    highest: tMarks.length ? Math.max(...tMarks) : 0,
                    lowest: tMarks.length ? Math.min(...tMarks) : 0,
                };
            }
        });
        const teacherStats = Object.values(teacherMap).filter(t => t.count > 0)
            .map(t => ({ ...t, level: getCBCLevel(t.mean).level }))
            .sort((a, b) => b.mean - a.mean);

        // Previous exam comparison
        const prevExams = [...exams].filter(e => e.id !== selectedExam).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const prevExam = prevExams[0];
        const prevResults = prevExam ? results.filter(r => r.exam_id === prevExam.id) : [];
        const improvements = rankedStudents.map(s => {
            const pr = prevResults.filter(r => r.student_id === s.id);
            if (!pr.length) return null;
            const prevMean = avg(pr.map(r => Number(r.marks || 0)));
            return { student: s, prev: prevMean, curr: s.mean, change: s.mean - prevMean };
        }).filter(Boolean) as any[];

        // Special lists
        const atRisk = rankedStudents.filter(s => {
            const sr = examResults.filter(r => r.student_id === s.id);
            return sr.filter(r => Number(r.marks || 0) < CBC_PASS_MARK).length >= 3;
        });
        const allPass = rankedStudents.filter(s => {
            const sr = examResults.filter(r => r.student_id === s.id);
            return sr.length > 0 && sr.every(r => Number(r.marks || 0) >= CBC_PASS_MARK);
        });
        // Top CBC performers = EE1 or EE2
        const topPerformers = rankedStudents.filter(s => s.mean >= CBC_EXCEL_MARK);

        return {
            examResults, rankedStudents, totalCandidates, schoolMean, schoolLevel, schoolLevelLabel,
            passRateVal, excelRate, levelCounts, subjectStats, classStats,
            deptStats, teacherStats, improvements, prevExam, atRisk, allPass, topPerformers,
            excelCount, passCount,
        };
    }, [selectedExam, results, students, subjects, classes, departments, teacherAssignments, gradeScales, exams]);

    // ── PDF Download ──
    const handleDownload = async () => {
        if (!selectedExam || !analytics) { toast.error('Please select an exam first'); return; }
        setDownloading(true);
        try {
            await generateSuperAnalyticsPdf({
                school, exam: exams.find(e => e.id === selectedExam),
                exams, classes, students, results, subjects, departments,
                gradeScales, teacherAssignments, selectedExamId: selectedExam, getGrade: getCBCLevel
            });
            toast.success('Super Analytics PDF downloaded!');
        } catch (err: any) {
            toast.error('Download failed: ' + (err.message || ''));
        }
        setDownloading(false);
    };

    const exam = exams.find(e => e.id === selectedExam);
    const a = analytics;

    return (
        <div>
            {/* ── Header ── */}
            <div style={{
                background: 'linear-gradient(135deg, #125E52 0%, #0f4c40 60%, #1a3a5c 100%)',
                borderRadius: 16, padding: '1.5rem 2rem', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                        <Zap size={22} style={{ color: '#f59e0b' }} />
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>Super Analytics</h1>
                        <span style={{ background: 'rgba(245,158,11,0.25)', color: '#fcd34d', borderRadius: 6, padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, marginLeft: 4 }}>CBC</span>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
                        Competency-Based Curriculum analytics — EE1 → BE1 grading across all 13 intelligence levels
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        className="form-select"
                        value={selectedExam}
                        onChange={e => setSelectedExam(e.target.value)}
                        style={{ minWidth: 220, background: 'rgba(255,255,255,0.12)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 8 }}
                    >
                        <option value="">— Select Exam —</option>
                        {exams.map(ex => <option key={ex.id} value={ex.id} style={{ color: '#0f172a', background: 'white' }}>{ex.name}</option>)}
                    </select>
                    <button
                        onClick={handleDownload}
                        disabled={downloading || !selectedExam}
                        style={{
                            background: downloading ? '#d97706' : '#f59e0b',
                            color: 'white', border: 'none', borderRadius: 10,
                            padding: '0.65rem 1.25rem', fontWeight: 800, fontSize: '0.9rem',
                            cursor: downloading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                        }}
                    >
                        {downloading ? <span className="spinner" /> : <Download size={16} />}
                        {downloading ? 'Generating PDF...' : 'Download Super Analytics'}
                    </button>
                </div>
            </div>

            {/* CBC Scale Key */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {CBC_LEVELS.map(l => (
                    <div key={l.level} style={{
                        background: l.color + '15', border: `1px solid ${l.color}40`, borderRadius: 8,
                        padding: '0.3rem 0.65rem', fontSize: '0.65rem', fontWeight: 700, color: l.color,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem'
                    }}>
                        <span>{l.level}</span>
                        <span style={{ fontWeight: 400, fontSize: '0.55rem', color: '#64748b' }}>{l.min}–{l.max}%</span>
                    </div>
                ))}
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', alignSelf: 'center', marginLeft: '0.5rem' }}>
                    Pass threshold: ≥{CBC_PASS_MARK}% (ME2+)
                </div>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto' }} />
                    <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading CBC analytics engine…</p>
                </div>
            )}

            {!loading && !selectedExam && (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                    <BarChart3 size={48} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                    <h3>Select an Exam</h3>
                    <p>Choose an exam above to load the full CBC analytics dashboard.</p>
                </div>
            )}

            {!loading && selectedExam && !a && (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                    <p>No results found for this exam.</p>
                </div>
            )}

            {!loading && a && selectedExam && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ── LEVEL 2: SCHOOL OVERVIEW ── */}
                    <div className="card">
                        <SectionHeader level="Level 2" title="School Overview" subtitle={`${exam?.name} — ${a.totalCandidates} Candidates`} />

                        {/* KPI Strip */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <MetricCard label="Total Candidates" value={a.totalCandidates} color="#125E52" icon={Users} />
                            <MetricCard label="School Mean Score" value={a.schoolMean.toFixed(1)} sub="out of 100" color="#3b82f6" icon={BarChart3} />
                            <MetricCard label="School CBC Level" value={a.schoolLevel} sub={a.schoolLevelLabel} color={levelBadge(a.schoolLevel)} icon={Award} />
                            <MetricCard label="Meeting+ Rate (≥42)" value={pct(a.passRateVal)} sub={`${a.passCount} students`} color="#125E52" icon={TrendingUp} />
                            <MetricCard label="Exceeding Rate (≥75)" value={pct(a.excelRate)} sub={`${a.excelCount} students`} color="#059669" icon={Star} />
                        </div>

                        {/* CBC Level Distribution Strip */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>CBC LEVEL DISTRIBUTION</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.35rem' }}>
                                {CBC_LEVELS.map(lvl => {
                                    const cnt = a.levelCounts[lvl.level] || 0;
                                    const p = a.totalCandidates ? (cnt / a.totalCandidates * 100).toFixed(0) + '%' : '0%';
                                    return (
                                        <div key={lvl.level} style={{
                                            textAlign: 'center', background: lvl.color + '12',
                                            border: `1.5px solid ${lvl.color}35`, borderRadius: 8, padding: '0.5rem 0.25rem'
                                        }}>
                                            <div style={{ fontSize: '0.65rem', color: lvl.color, fontWeight: 800 }}>{lvl.level}</div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: lvl.color }}>{cnt}</div>
                                            <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>{p}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Class Mean Table */}
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#125E52', marginBottom: '0.5rem' }}>Mean Score by Class (CBC Levels)</div>
                        <SlimTable
                            headers={['Class', 'Students', 'Mean Score', 'CBC Level', 'Meeting+ Rate', 'Top Student']}
                            rows={a.classStats.map((cls: any) => [
                                cls.name, cls.count, cls.mean.toFixed(1), cls.level,
                                pct(cls.passRate),
                                cls.topStudent ? `${cls.topStudent.first_name} ${cls.topStudent.last_name}` : '-',
                            ])}
                        />

                        {/* Top 10 / Bottom 10 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#125E52', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><TrendingUp size={14} /> Top 10 Students</div>
                                <SlimTable
                                    headers={['Pos', 'Student', 'Class', 'Mean', 'CBC Level']}
                                    rows={a.rankedStudents.slice(0, 10).map((s: any) => [
                                        s.position, `${s.first_name} ${s.last_name}`,
                                        classes.find((c: any) => c.id === s.class_id)?.name || '-',
                                        s.mean.toFixed(1), s.level
                                    ])}
                                />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><TrendingDown size={14} /> Bottom 10 Students</div>
                                <SlimTable
                                    headers={['Pos', 'Student', 'Class', 'Mean', 'CBC Level']}
                                    rows={[...a.rankedStudents].reverse().slice(0, 10).map((s: any) => [
                                        s.position, `${s.first_name} ${s.last_name}`,
                                        classes.find((c: any) => c.id === s.class_id)?.name || '-',
                                        s.mean.toFixed(1), s.level
                                    ])}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── LEVEL 3: DEPARTMENT ANALYSIS ── */}
                    {a.deptStats.length > 0 && (
                        <div className="card">
                            <SectionHeader level="Level 3" title="Department Analysis" subtitle="Ranked by mean performance — CBC Levels" color="#8b5cf6" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'start' }}>
                                <div>
                                    {a.deptStats.map((d: any, i: number) => (
                                        <MiniBar key={d.id} label={d.name} value={d.mean} color={['#125E52', '#3b82f6', '#f59e0b', '#8b5cf6'][i % 4]} />
                                    ))}
                                </div>
                                <SlimTable
                                    headers={['Department', 'Subjects', 'Entries', 'Mean', 'CBC Level', 'Meeting+ Rate']}
                                    rows={a.deptStats.map((d: any) => [d.name, d.subjectCount, d.entries, d.mean.toFixed(1), d.level, pct(d.passRate)])}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── LEVEL 4: SUBJECT ANALYSIS ── */}
                    <div className="card">
                        <SectionHeader level="Level 4" title="Subject Analysis" subtitle="Statistical breakdown — all subjects (CBC levels)" color="#3b82f6" />
                        {a.subjectStats.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                <MetricCard label="Best Subject" value={a.subjectStats[0]?.name || '-'} sub={`Mean: ${a.subjectStats[0]?.mean.toFixed(1)} (${a.subjectStats[0]?.level})`} color="#125E52" />
                                <MetricCard label="Best Level" value={dash(a.subjectStats[0]?.level)} color={levelBadge(a.subjectStats[0]?.level)} />
                                <MetricCard label="Hardest Subject" value={a.subjectStats[a.subjectStats.length - 1]?.name || '-'} sub={`Mean: ${a.subjectStats[a.subjectStats.length - 1]?.mean.toFixed(1)}`} color="#ef4444" />
                                <MetricCard label="Hardest Level" value={dash(a.subjectStats[a.subjectStats.length - 1]?.level)} color={levelBadge(a.subjectStats[a.subjectStats.length - 1]?.level)} />
                            </div>
                        )}
                        <SlimTable
                            headers={['Subject', 'Count', 'Mean', 'CBC Level', 'Highest', 'Lowest', 'Median', 'StdDev', 'Range', 'Meeting+%', 'Below ME2']}
                            rows={a.subjectStats.map((s: any) => [
                                s.name, s.count, s.mean.toFixed(1), s.level,
                                s.highest, s.lowest, s.median.toFixed(1),
                                s.stdDev.toFixed(1), s.range,
                                pct(s.passRate), s.failCount
                            ])}
                        />
                    </div>

                    {/* ── LEVEL 5: TEACHER ANALYSIS ── */}
                    <div className="card">
                        <SectionHeader level="Level 5" title="Teacher Analysis" subtitle="Performance ranking by subject — CBC levels" color="#f59e0b" />
                        {a.teacherStats.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                <MetricCard label="Best Teacher" value={a.teacherStats[0].name} sub={a.teacherStats[0].subject} color="#f59e0b" icon={Award} />
                                <MetricCard label="Level Achieved" value={a.teacherStats[0].level} color={levelBadge(a.teacherStats[0].level)} />
                                <MetricCard label="Highest Meet+ Rate" value={pct(Math.max(...a.teacherStats.map((t: any) => t.passRate)))} color="#125E52" />
                                <MetricCard label="Exceeding Leaders" value={pct(Math.max(...a.teacherStats.map((t: any) => t.excelRate)))} color="#059669" />
                                <MetricCard label="Teacher Count" value={dash(a.teacherStats.length)} color="#3b82f6" icon={Users} />
                            </div>
                        )}
                        <SlimTable
                            headers={['Teacher', 'Subject', 'Count', 'Mean', 'CBC Level', 'Meet+%', 'Exceed%', 'Highest', 'Lowest']}
                            rows={a.teacherStats.map((t: any) => [
                                t.name, t.subject, t.count, t.mean.toFixed(1),
                                t.level, pct(t.passRate), pct(t.excelRate),
                                t.highest, t.lowest
                            ])}
                        />
                    </div>

                    {/* ── LEVEL 6: CLASS ANALYSIS ── */}
                    <div className="card">
                        <SectionHeader level="Level 6" title="Class Analysis" subtitle="Per-class breakdown with subject CBC levels" color="#06b6d4" />
                        {a.classStats.map((cls: any) => (
                            <div key={cls.id} style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                    <span style={{ color: '#0f172a' }}>{cls.name}</span>
                                    <span style={{ background: levelBadge(cls.level) + '18', color: levelBadge(cls.level), border: `1px solid ${levelBadge(cls.level)}40`, borderRadius: 6, padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                        {cls.level} — {cls.mean.toFixed(1)}
                                    </span>
                                    <span style={{ background: '#eff6ff', color: '#1e40af', borderRadius: 6, padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>Meet+: {pct(cls.passRate)}</span>
                                    <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>{cls.count} students</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>Subject Means</div>
                                        {cls.subjectMeans.slice(0, 6).map((s: any) => (
                                            <MiniBar key={s.name} label={s.name} value={s.mean} max={100} color="#3b82f6" />
                                        ))}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>Top 5 Students</div>
                                        <SlimTable
                                            headers={['Pos', 'Student', 'Mean', 'CBC Level']}
                                            rows={cls.students.slice(0, 5).map((s: any, i: number) => [
                                                i + 1, `${s.first_name} ${s.last_name}`, s.mean.toFixed(1), s.level
                                            ])}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── LEVEL 8: FULL STUDENT RANKINGS ── */}
                    <div className="card">
                        <SectionHeader level="Level 8" title="Full Student Rankings" subtitle="School-wide position — all candidates with CBC levels" color="#125E52" />
                        <SlimTable
                            headers={['Pos', 'Student', 'Adm No', 'Class', 'Total', 'Mean', 'CBC Level']}
                            rows={a.rankedStudents.map((s: any) => [
                                s.position, `${s.first_name} ${s.last_name}`,
                                s.admission_number || '-',
                                classes.find((c: any) => c.id === s.class_id)?.name || '-',
                                s.total.toFixed(0), s.mean.toFixed(1), s.level
                            ])}
                        />
                    </div>

                    {/* ── LEVEL 10: CBC LEVEL DISTRIBUTION ── */}
                    <div className="card">
                        <SectionHeader level="Level 10" title="CBC Level Distribution Analysis" subtitle="Count and % per competency level" color="#ec4899" />
                        <SlimTable
                            headers={['CBC Level', 'Description', 'Range', 'Count', '% of Total', 'Points', 'Status']}
                            rows={CBC_LEVELS.map(lvl => {
                                const cnt = a.levelCounts[lvl.level] || 0;
                                const p = a.totalCandidates ? (cnt / a.totalCandidates * 100).toFixed(1) + '%' : '-';
                                const status = lvl.min >= CBC_PASS_MARK ? '✅ Meeting+' : '⚠️ Below ME2';
                                return [lvl.level, lvl.label, `${lvl.min}–${lvl.max}`, cnt, p, lvl.points, status];
                            })}
                        />
                    </div>

                    {/* ── LEVEL 11: IMPROVEMENT ANALYSIS ── */}
                    <div className="card">
                        <SectionHeader level="Level 11" title="Improvement & Decline Analysis" subtitle={a.prevExam ? `vs ${a.prevExam.name} (CBC level changes)` : 'Requires 2+ exams'} color="#f59e0b" />
                        {!a.prevExam ? (
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No previous exam found. Improvement analysis requires at least 2 exams.</p>
                        ) : a.improvements.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No overlapping student data between selected exam and previous exam.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#125E52', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><TrendingUp size={14} /> Most Improved (Top 15)</div>
                                    <SlimTable
                                        headers={['Student', 'Class', 'Prev', 'Prev Level', 'Curr', 'Curr Level', 'Δ']}
                                        rows={[...a.improvements].sort((x: any, y: any) => y.change - x.change).slice(0, 15).map((i: any) => [
                                            `${i.student.first_name} ${i.student.last_name}`,
                                            classes.find((c: any) => c.id === i.student.class_id)?.name || '-',
                                            i.prev.toFixed(1), getCBCLevel(i.prev).level,
                                            i.curr.toFixed(1), getCBCLevel(i.curr).level,
                                            `+${i.change.toFixed(1)}`
                                        ])}
                                    />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><TrendingDown size={14} /> Biggest Decline (Top 15)</div>
                                    <SlimTable
                                        headers={['Student', 'Class', 'Prev', 'Prev Level', 'Curr', 'Curr Level', 'Δ']}
                                        rows={[...a.improvements].sort((x: any, y: any) => x.change - y.change).slice(0, 15).map((i: any) => [
                                            `${i.student.first_name} ${i.student.last_name}`,
                                            classes.find((c: any) => c.id === i.student.class_id)?.name || '-',
                                            i.prev.toFixed(1), getCBCLevel(i.prev).level,
                                            i.curr.toFixed(1), getCBCLevel(i.curr).level,
                                            i.change.toFixed(1)
                                        ])}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── LEVEL 12: TARGET ANALYSIS ── */}
                    <div className="card">
                        <SectionHeader level="Level 12" title="Target Analysis" subtitle="Target = ME1 (≥58%) — Meeting Expectations Level 1" color="#06b6d4" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                            <MetricCard label="At ME1+ (≥58%)" value={String(a.rankedStudents.filter((s: any) => s.mean >= 58).length)} color="#0891b2" icon={Target} />
                            <MetricCard label="Below ME1 (<58%)" value={String(a.rankedStudents.filter((s: any) => s.mean < 58).length)} color="#ef4444" icon={AlertTriangle} />
                            <MetricCard label="ME1+ Hit Rate" value={pct(a.totalCandidates ? a.rankedStudents.filter((s: any) => s.mean >= 58).length / a.totalCandidates * 100 : 0)} color="#f59e0b" />
                            <MetricCard label="Meet+ Rate (≥42)" value={pct(a.passRateVal)} color="#125E52" />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem' }}>Students Below ME1 (need support)</div>
                        <SlimTable
                            headers={['Student', 'Class', 'Mean', 'CBC Level', 'Gap to ME1']}
                            rows={a.rankedStudents.filter((s: any) => s.mean < 58).map((s: any) => [
                                `${s.first_name} ${s.last_name}`,
                                classes.find((c: any) => c.id === s.class_id)?.name || '-',
                                s.mean.toFixed(1), s.level,
                                (58 - s.mean).toFixed(1) + ' marks'
                            ])}
                        />
                    </div>

                    {/* ── LEVEL 13: SPECIAL LISTS ── */}
                    <div className="card">
                        <SectionHeader level="Level 13" title="Special Lists" subtitle="Auto-generated CBC recognition and alert lists" color="#8b5cf6" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                            <MetricCard label="Exceeding (EE1+EE2)" value={String(a.topPerformers.length)} sub="≥75%" color="#059669" icon={Star} />
                            <MetricCard label="All Subjects Meeting+" value={String(a.allPass.length)} color="#125E52" icon={Award} />
                            <MetricCard label="At-Risk (3+ Below ME2)" value={String(a.atRisk.length)} color="#ef4444" icon={AlertTriangle} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#059669', marginBottom: '0.5rem' }}>⭐ Exceeding Expectations — EE1/EE2 ({a.topPerformers.length})</div>
                                <SlimTable
                                    headers={['Student', 'Class', 'Mean', 'CBC Level']}
                                    rows={a.topPerformers.map((s: any) => [
                                        `${s.first_name} ${s.last_name}`,
                                        classes.find((c: any) => c.id === s.class_id)?.name || '-',
                                        s.mean.toFixed(1), s.level
                                    ])}
                                />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem' }}>🚨 At-Risk Students (3+ subjects below ME2)</div>
                                {a.atRisk.length ? (
                                    <SlimTable
                                        headers={['Student', 'Class', 'Mean', 'CBC Level']}
                                        rows={a.atRisk.map((s: any) => [
                                            `${s.first_name} ${s.last_name}`,
                                            classes.find((c: any) => c.id === s.class_id)?.name || '-',
                                            s.mean.toFixed(1), s.level
                                        ])}
                                    />
                                ) : <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>No at-risk students for this exam.</p>}
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', fontWeight: 700, fontSize: '0.8rem', color: '#8b5cf6', marginBottom: '0.5rem' }}>🏆 Top 50 Students — School Wide</div>
                        <SlimTable
                            headers={['Pos', 'Student', 'Class', 'Mean', 'CBC Level']}
                            rows={a.rankedStudents.slice(0, 50).map((s: any) => [
                                s.position, `${s.first_name} ${s.last_name}`,
                                classes.find((c: any) => c.id === s.class_id)?.name || '-',
                                s.mean.toFixed(1), s.level
                            ])}
                        />
                    </div>

                    {/* Download CTA */}
                    <div style={{
                        background: 'linear-gradient(135deg, #125E52, #0f4c40)',
                        borderRadius: 14, padding: '1.5rem 2rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                    }}>
                        <div>
                            <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1rem', marginBottom: '0.25rem' }}>⚡ Download Full Super Analytics PDF</div>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem' }}>
                                All 13 CBC analytics levels, every metric, EE1→BE1 rankings — one comprehensive portable PDF
                            </div>
                        </div>
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            style={{
                                background: downloading ? '#d97706' : '#f59e0b',
                                color: 'white', border: 'none', borderRadius: 10,
                                padding: '0.8rem 1.75rem', fontWeight: 800, fontSize: '1rem',
                                cursor: downloading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                boxShadow: '0 6px 20px rgba(245,158,11,0.5)',
                            }}
                        >
                            {downloading ? <span className="spinner" /> : <Download size={18} />}
                            {downloading ? 'Generating…' : 'Download Super Analytics PDF'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
