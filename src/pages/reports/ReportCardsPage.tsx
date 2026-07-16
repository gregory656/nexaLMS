import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { generateReportCardPdf, downloadPdf, mergePdfPages } from '../../lib/pdf';
import {
    FileText, ClipboardList, Download, Eye, ToggleLeft, ToggleRight,
    GraduationCap, Activity, Target, MessageSquare
} from 'lucide-react';
import HelpIcon from '../../components/ui/HelpIcon';

const TABS = [
    { key: 'generate', label: 'Generate', icon: FileText },
    { key: 'published', label: 'Published Reports', icon: ClipboardList },
    { key: 'download', label: 'Bulk Download', icon: Download },
    { key: 'demo', label: 'Demo Report', icon: Download },
];

export default function ReportCardsPage() {
    const { school } = useAuth();
    const [activeTab, setActiveTab] = useState('generate');
    const [loading, setLoading] = useState(true);

    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [gradeScales, setGradeScales] = useState<any[]>([]);
    const [reportCards, setReportCards] = useState<any[]>([]);
    const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);

    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedTheme, setSelectedTheme] = useState('Classic White');
    const [includeFeeBalance, setIncludeFeeBalance] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const fetchExamResults = async () => {
        if (!school?.id) return [];
        const rows: any[] = [];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
            const { data, error } = await supabase
                .from('exam_results')
                .select('*, subjects(name)')
                .eq('school_id', school.id)
                .range(from, from + pageSize - 1);
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < pageSize) break;
        }
        return rows;
    };

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [exRes, clRes, stuRes, resRes, subRes, gsRes, rcRes, taRes] = await Promise.all([
            supabase.from('exams').select('*, terms(name), academic_years(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            fetchExamResults(),
            supabase.from('subjects').select('*').eq('school_id', school.id).order('name'),
            supabase.from('grade_scales').select('*').eq('school_id', school.id).order('min_marks', { ascending: false }),
            supabase.from('report_cards').select('*, students(first_name, last_name, admission_number), classes(name), terms(name), academic_years(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('teacher_subject_assignments').select('*, teachers(first_name, last_name)').eq('school_id', school.id),
        ]);
        setExams(exRes.data || []);
        setClasses(clRes.data || []);
        setStudents(stuRes.data || []);
        setResults(resRes || []);
        setSubjects(subRes.data || []);
        setGradeScales(gsRes.data || []);
        setReportCards(rcRes.data || []);
        setTeacherAssignments(taRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    useEffect(() => {
        if (!school?.id) return;
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') fetchAll();
        };
        window.addEventListener('focus', fetchAll);
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            window.removeEventListener('focus', fetchAll);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, [school?.id]);

    const classStudents = students.filter(s => s.class_id === selectedClass);
    const examResults = results.filter(r => r.exam_id === selectedExam);

    const getGrade = (marks: number | null | undefined) => {
        if (marks === null || marks === undefined || Number.isNaN(Number(marks))) {
            return { grade: '-', remarks: 'No mark recorded' };
        }
        const numericMarks = Number(marks);
        for (const gs of gradeScales) {
            if (numericMarks >= gs.min_marks && numericMarks <= gs.max_marks) return gs;
        }
        // Demo grade scale fallback
        if (numericMarks >= 80) return { grade: 'A', remarks: 'Excellent' };
        if (numericMarks >= 70) return { grade: 'B', remarks: 'Very Good' };
        if (numericMarks >= 60) return { grade: 'C', remarks: 'Good' };
        if (numericMarks >= 50) return { grade: 'D', remarks: 'Fair' };
        return { grade: 'E', remarks: 'Needs Improvement' };
    };

    const getTeacherName = (subjectId: string, classId: string) => {
        const assignment = teacherAssignments.find(item => item.subject_id === subjectId && item.class_id === classId)
            || teacherAssignments.find(item => item.subject_id === subjectId && !item.class_id);
        const teacher = assignment?.teachers;
        return teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : '-';
    };

    const getStudentReport = (studentId: string) => {
        const studentRes = examResults.filter(r => r.student_id === studentId);
        const subjectRows = subjects.map(subject => {
            const result = studentRes.find(r => r.subject_id === subject.id);
            return result || {
                id: `${studentId}-${subject.id}`,
                student_id: studentId,
                subject_id: subject.id,
                class_id: selectedClass,
                exam_id: selectedExam,
                marks: null,
                grade: null,
                remarks: 'No mark recorded',
                subjects: { name: subject.name },
                teacher_name: getTeacherName(subject.id, selectedClass),
            };
        });
        const enrichedRows = subjectRows.map(row => ({
            ...row,
            teacher_name: row.teacher_name || getTeacherName(row.subject_id, row.class_id || selectedClass),
        }));
        const total = enrichedRows.reduce((s, r) => s + (r.marks == null || r.marks === '' ? 0 : Number(r.marks || 0)), 0);
        const mean = subjectRows.length ? total / subjectRows.length : 0;
        const gs = getGrade(mean);
        return { subjects: enrichedRows, total, mean, grade: gs?.grade || '-', remarks: gs?.remarks || '' };
    };

    const addSubjectRanks = (subjectRows: any[]) => subjectRows.map(row => {
        const mark = row.marks === null || row.marks === undefined || row.marks === '' ? 0 : Number(row.marks);
        if (Number.isNaN(mark)) return { ...row, subjectRank: null, subjectTotal: classStudents.length };
        const subjectMarks = classStudents
            .map(s => examResults.find(r => r.student_id === s.id && r.subject_id === row.subject_id))
            .filter(Boolean)
            .map((r: any) => Number(r.marks))
            .filter(m => !Number.isNaN(m))
            .sort((a, b) => b - a);
        const rankIndex = subjectMarks.findIndex(m => m === mark);
        const classMean = subjectMarks.length ? subjectMarks.reduce((sum, current) => sum + current, 0) / subjectMarks.length : null;
        return { ...row, subjectRank: rankIndex >= 0 ? rankIndex + 1 : null, subjectTotal: subjectMarks.length, classMean };
    });

    const getStudentAnalytics = (studentId: string) => {
        const studentRes = examResults.filter(r => r.student_id === studentId);
        const currentMean = studentRes.length ? studentRes.reduce((s, r) => s + Number(r.marks || 0), 0) / studentRes.length : 0;

        // History: Get exam movement from all available exams
        const history: { examName: string; mean: number; grade?: string }[] = [];
        const allExamsForStudent = results.filter(r => r.student_id === studentId);
        const examGroups = allExamsForStudent.reduce((acc, r) => {
            if (!acc[r.exam_id]) acc[r.exam_id] = [];
            acc[r.exam_id].push(r);
            return acc;
        }, {} as Record<string, any[]>);

        Object.entries(examGroups).forEach(([examId, examRes]) => {
            const exam = exams.find(e => e.id === examId);
            if (exam && Array.isArray(examRes) && examRes.length > 0) {
                const examMean = examRes.reduce((s, r) => s + Number(r.marks || 0), 0) / examRes.length;
                const examGrade = getGrade(examMean);
                history.push({ examName: exam.name, mean: examMean, grade: examGrade?.grade });
            }
        });

        // Subject performance
        const subjectPerformance = studentRes.map(r => {
            const classSubjectResults = examResults.filter(er => er.subject_id === r.subject_id);
            const classMean = classSubjectResults.length ? classSubjectResults.reduce((s, er) => s + Number(er.marks || 0), 0) / classSubjectResults.length : 0;
            const grade = getGrade(Number(r.marks));
            return {
                subject: r.subjects?.name || 'Unknown',
                marks: Number(r.marks),
                grade: grade?.grade,
                classMean
            };
        }).sort((a, b) => b.marks - a.marks);

        // Grade mix across all subjects
        const gradeMix: { grade: string; count: number }[] = [];
        const gradeCounts = studentRes.reduce((acc, r) => {
            const g = getGrade(Number(r.marks));
            if (g?.grade) {
                acc[g.grade] = (acc[g.grade] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        Object.entries(gradeCounts).forEach(([grade, count]) => {
            gradeMix.push({ grade, count: Number(count) });
        });

        // Strengths: Top performing subjects (above class mean)
        const strengths = subjectPerformance
            .filter(s => s.marks >= (s.classMean || 0))
            .slice(0, 3)
            .map(s => s.subject);

        // Focus: Subjects below class mean
        const focus = subjectPerformance
            .filter(s => s.marks < (s.classMean || 0))
            .slice(0, 3)
            .map(s => s.subject);

        // Simple advice based on performance
        let advice = 'Keep up the good work!';
        if (currentMean < 50) {
            advice = 'Focus on improving weak areas through extra practice and revision.';
        } else if (currentMean < 70) {
            advice = 'Good progress. Identify weak subjects and dedicate more study time.';
        } else if (currentMean < 85) {
            advice = 'Strong performance. Aim for consistency across all subjects.';
        } else {
            advice = 'Excellent work! Maintain high standards and help peers where possible.';
        }

        // Class mean for comparison
        const classResults = examResults.filter(r => classStudents.some(s => s.id === r.student_id));
        const classMean = classResults.length ? classResults.reduce((s, r) => s + Number(r.marks || 0), 0) / classResults.length : 0;

        // Improvement from previous exam
        let improvement: number | null = null;
        if (history.length >= 2) {
            const prevMean = history[history.length - 2].mean;
            improvement = currentMean - prevMean;
        }

        return {
            history,
            subjectPerformance,
            gradeMix,
            strengths,
            focus,
            advice,
            classMean,
            improvement
        };
    };

    // Rank students by total marks (descending)
    const rankedStudents = classStudents
        .map(s => ({ ...s, report: getStudentReport(s.id) }))
        .sort((a, b) => b.report.total - a.report.total)
        .map((s, i) => ({ ...s, position: i + 1 }));

    const previewStudent = selectedStudent ? rankedStudents.find(s => s.id === selectedStudent) : null;

    // ─── DOWNLOAD INDIVIDUAL REPORT CARD ───
    const handleDownloadSingle = async (student: any) => {
        setDownloading(true);
        try {
            const report = getStudentReport(student.id);
            const analytics = getStudentAnalytics(student.id);
            const position = rankedStudents.findIndex(s => s.id === student.id) + 1;
            const doc = await generateReportCardPdf({
                school,
                student,
                exam: exams.find(e => e.id === selectedExam),
                className: classes.find(c => c.id === selectedClass)?.name || '',
                subjects: addSubjectRanks(report.subjects),
                total: report.total,
                mean: report.mean,
                grade: report.grade,
                remarks: report.remarks,
                feeBalance: student.fee_balance,
                feeTimestamp: student.fee_balance_updated_at,
                includeFeeBalance,
                theme: selectedTheme,
                getGrade,
                position,
                totalStudents: classStudents.length,
                analytics,
            });
            downloadPdf(doc, `report_${student.first_name}_${student.last_name}`);
            toast.success('Report card downloaded');
        } catch (err: any) {
            toast.error('Download failed: ' + (err.message || ''));
        }
        setDownloading(false);
    };

    // ─── BULK DOWNLOAD (class sorted by performance) ───
    // Individual downloads (one per student, zipped approach - download one by one)
    const handleBulkIndividual = async () => {
        if (!selectedExam || !selectedClass) {
            toast.error('Select an exam and class first');
            return;
        }
        setDownloading(true);
        const docs = [];
        for (const student of rankedStudents) {
            try {
                const report = getStudentReport(student.id);
                const analytics = getStudentAnalytics(student.id);
                const position = rankedStudents.findIndex(s => s.id === student.id) + 1;
                const doc = await generateReportCardPdf({
                    school,
                    student,
                    exam: exams.find(e => e.id === selectedExam),
                    className: classes.find(c => c.id === selectedClass)?.name || '',
                    subjects: addSubjectRanks(report.subjects),
                    total: report.total,
                    mean: report.mean,
                    grade: report.grade,
                    remarks: report.remarks,
                    feeBalance: student.fee_balance,
                    feeTimestamp: student.fee_balance_updated_at,
                    includeFeeBalance,
                    theme: selectedTheme,
                    getGrade,
                    position,
                    totalStudents: rankedStudents.length,
                    analytics,
                });
                docs.push(doc);
            } catch { /* skip failed */ }
        }
        const merged = mergePdfPages(docs);
        if (merged) {
            const className = classes.find(c => c.id === selectedClass)?.name || 'class';
            downloadPdf(merged, `report_cards_${className.replace(/\s+/g, '_')}_${docs.length}_pages`);
            toast.success(`Downloaded one PDF with ${docs.length} report cards`);
        } else {
            toast.error('No report cards generated');
        }
        setDownloading(false);
    };

    // ─── DEMO REPORT CARD ───
    const handleDemoReport = async () => {
        setDownloading(true);
        try {
            const demoSchool = {
                name: 'NexaGen Academy',
                motto: 'Excellence Through Innovation',
                logo_url: school?.logo_url,
                watermark_url: school?.watermark_url,
            };

            const demoStudent = {
                first_name: 'James',
                last_name: 'Omondi',
                admission_number: '2024001',
                profile_picture_url: null,
                fee_balance: 15000,
                fee_balance_updated_at: new Date().toISOString(),
            };

            const demoExam = {
                name: 'End of Term 2 Examination 2024',
            };

            const demoClassName = 'Form 2 East';

            const demoSubjects = [
                { subjects: { name: 'Mathematics' }, marks: 85, remarks: 'Excellent' },
                { subjects: { name: 'English' }, marks: 78, remarks: 'Very Good' },
                { subjects: { name: 'Kiswahili' }, marks: 72, remarks: 'Very Good' },
                { subjects: { name: 'Chemistry' }, marks: 68, remarks: 'Good' },
                { subjects: { name: 'Physics' }, marks: 75, remarks: 'Very Good' },
                { subjects: { name: 'Biology' }, marks: 82, remarks: 'Excellent' },
                { subjects: { name: 'History' }, marks: 70, remarks: 'Very Good' },
                { subjects: { name: 'Geography' }, marks: 65, remarks: 'Good' },
            ];

            const total = demoSubjects.reduce((s, r) => s + r.marks, 0);
            const mean = total / demoSubjects.length;
            const grade = getGrade(mean);

            const demoAnalytics = {
                history: [
                    { examName: 'Term 1 Exam 2024', mean: 68.5, grade: 'C' },
                    { examName: 'Mid Term 2 2024', mean: 74.2, grade: 'B' },
                    { examName: 'End of Term 2 2024', mean: 76.9, grade: 'B' },
                ],
                subjectPerformance: demoSubjects.map(s => ({
                    subject: s.subjects.name,
                    marks: s.marks,
                    grade: getGrade(s.marks)?.grade,
                    classMean: s.marks - 5 + Math.random() * 10,
                })),
                gradeMix: [
                    { grade: 'A', count: 2 },
                    { grade: 'B', count: 4 },
                    { grade: 'C', count: 2 },
                ],
                strengths: ['Mathematics', 'Biology', 'English'],
                focus: ['Geography', 'History'],
                advice: 'Strong performance in sciences and languages. Focus on improving humanities subjects for balanced excellence.',
                classMean: 72.5,
                improvement: 2.7,
            };

            const doc = await generateReportCardPdf({
                school: demoSchool,
                student: demoStudent,
                exam: demoExam,
                className: demoClassName,
                subjects: demoSubjects,
                total,
                mean,
                grade: grade?.grade || 'B',
                remarks: grade?.remarks || 'Very Good',
                feeBalance: demoStudent.fee_balance,
                feeTimestamp: demoStudent.fee_balance_updated_at,
                includeFeeBalance: true,
                theme: selectedTheme,
                getGrade,
                position: 3,
                totalStudents: 45,
                analytics: demoAnalytics,
            });
            downloadPdf(doc, 'demo_report_card_james_omondi');
            toast.success('Demo report card downloaded');
        } catch (err: any) {
            toast.error('Demo download failed: ' + (err.message || ''));
        }
        setDownloading(false);
    };

    const renderGenerate = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <div><h3 className="text-lg font-bold">Generate Report Cards</h3><p className="text-sm text-muted">Select exam and class, then preview or publish report cards.</p></div>
                <div className="flex gap-2 items-center">
                    <button className={`btn btn-sm ${includeFeeBalance ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIncludeFeeBalance(!includeFeeBalance)}>
                        {includeFeeBalance ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} Fee Balance
                    </button>
                </div>
            </div>
            <div className="card mb-4">
                <div className="grid-3">
                    <div className="form-group">
                        <label className="form-label">Exam</label>
                        <select className="form-select" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                            <option value="">Choose Exam</option>
                            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Class</label>
                        <select className="form-select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); }}>
                            <option value="">Choose Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Student (individual preview)</label>
                        <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                            <option value="">All Students</option>
                            {classStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid-2 mt-3">
                    <div className="form-group">
                        <label className="form-label">Theme</label>
                        <select className="form-select" value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)}>
                            {['Classic White', 'Cream', 'Light Blue', 'Soft Green', 'Light Pink', 'Light Grey'].map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Preview Card */}
            {previewStudent && (
                <div className="card" style={{ border: '2px solid var(--green-200)', maxWidth: 700, margin: '0 auto' }}>
                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        {/* Profile Picture - top left */}
                        {previewStudent.profile_picture_url && (
                            <div style={{ flexShrink: 0 }}>
                                <img
                                    src={previewStudent.profile_picture_url}
                                    alt=""
                                    style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--gray-200)' }}
                                />
                            </div>
                        )}
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            {school?.logo_url && <img src={school.logo_url} alt="" style={{ width: 60, height: 60, borderRadius: 8, margin: '0 auto 0.5rem' }} />}
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{school?.name || 'School Name'}</h2>
                            <p className="text-sm text-muted">{school?.motto || ''}</p>
                            <h3 style={{ marginTop: 8, color: 'var(--green-700)' }}>STUDENT REPORT CARD</h3>
                        </div>
                    </div>

                    <div className="grid-2 mb-4" style={{ fontSize: '0.88rem' }}>
                        <div><strong>Name:</strong> {previewStudent.first_name} {previewStudent.last_name}</div>
                        <div><strong>Adm No:</strong> {previewStudent.admission_number || '—'}</div>
                        <div><strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name || '—'}</div>
                        <div><strong>Exam:</strong> {exams.find(e => e.id === selectedExam)?.name || '—'}</div>
                        <div><strong>Position:</strong> {previewStudent.position} out of {rankedStudents.length}</div>
                    </div>

                    <div className="table-wrapper mb-4">
                        <table className="data-table">
                            <thead><tr><th>Subject</th><th>Marks</th><th>Grade</th><th>Remarks</th></tr></thead>
                            <tbody>
                                {previewStudent.report.subjects.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No results found for this student.</td></tr>
                                ) : previewStudent.report.subjects.map((r: any, i: number) => {
                                    const gs = getGrade(Number(r.marks));
                                    return <tr key={i}><td>{r.subjects?.name || '-'}</td><td><strong>{r.marks ?? 0}</strong></td><td>{gs ? <span className="badge badge-green">{gs.grade}</span> : '-'}</td><td className="text-sm text-muted">{r.remarks || '-'}</td></tr>;
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid-2 mb-4" style={{ fontSize: '0.9rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: 8 }}>
                        <div><strong>Total Marks:</strong> {previewStudent.report.total.toFixed(0)}</div>
                        <div><strong>Mean:</strong> {previewStudent.report.mean.toFixed(1)}</div>
                        <div><strong>Overall Grade:</strong> <span className="badge badge-green">{previewStudent.report.grade}</span></div>
                        <div><strong>Subjects:</strong> {previewStudent.report.subjects.length}</div>
                    </div>

                    {includeFeeBalance && (
                        <div style={{ background: 'var(--warning-light)', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                            <strong>Fee Balance:</strong> {previewStudent.fee_balance != null
                                ? `KES ${Number(previewStudent.fee_balance).toLocaleString()} (as at ${previewStudent.fee_balance_updated_at ? new Date(previewStudent.fee_balance_updated_at).toLocaleDateString('en-GB') : 'N/A'})`
                                : 'N/A'}
                        </div>
                    )}

                    {/* Advanced Visual Analytics Dashboard */}
                    {renderAnalyticsUI(
                        getStudentAnalytics(previewStudent.id),
                        previewStudent.report.grade,
                        previewStudent.report.mean,
                        previewStudent.position,
                        rankedStudents.length
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', marginTop: '1.5rem' }}>
                        <div style={{ fontSize: '0.82rem' }}>
                            <p><strong>Class Teacher:</strong> _______________</p>
                            <p style={{ marginTop: 4 }}><strong>Principal:</strong> _______________</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-primary btn-sm" onClick={() => handleDownloadSingle(previewStudent)} disabled={downloading}>
                                {downloading ? <span className="spinner" /> : <><Download size={14} /> Download PDF</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!previewStudent && selectedExam && selectedClass && (
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title">Class Report Summary (Ranked by Performance)</h3>
                        <button className="btn btn-primary btn-sm" onClick={handleBulkIndividual} disabled={downloading || rankedStudents.length === 0}>
                            {downloading ? <span className="spinner" /> : <><Download size={14} /> Download All</>}
                        </button>
                    </div>
                    {rankedStudents.length === 0 ? (
                        <div className="empty-state"><h3>No students in this class</h3></div>
                    ) : (
                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Pos</th><th>Student</th><th>Total</th><th>Mean</th><th>Grade</th><th>Preview</th><th>Download</th></tr></thead><tbody>
                            {rankedStudents.map(s => (
                                <tr key={s.id}>
                                    <td><strong>{s.position}</strong></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {s.profile_picture_url && <img src={s.profile_picture_url} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />}
                                            <strong>{s.first_name} {s.last_name}</strong>
                                        </div>
                                    </td>
                                    <td>{s.report.total.toFixed(0)}</td>
                                    <td>{s.report.mean.toFixed(1)}</td>
                                    <td>{s.report.grade !== '—' ? <span className="badge badge-green">{s.report.grade}</span> : '—'}</td>
                                    <td><button className="btn btn-ghost btn-sm" onClick={() => setSelectedStudent(s.id)}><Eye size={14} /> View</button></td>
                                    <td><button className="btn btn-ghost btn-sm" onClick={() => handleDownloadSingle(s)} disabled={downloading}><Download size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody></table></div>
                    )}
                </div>
            )}
        </>
    );

    const renderPublished = () => (
        <div className="card">
            <div className="card-header"><h3 className="card-title">Published Report Cards</h3></div>
            {reportCards.length === 0 ? (
                <div className="empty-state"><h3>No published reports</h3><p>Generate and publish reports from the Generate tab.</p></div>
            ) : (
                <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Student</th><th>Class</th><th>Term</th><th>Average</th><th>Grade</th><th>Published</th></tr></thead><tbody>
                    {reportCards.map((rc, i) => (
                        <tr key={rc.id}><td>{i + 1}</td><td><strong>{rc.students?.first_name} {rc.students?.last_name}</strong></td><td>{rc.classes?.name || '—'}</td><td>{rc.terms?.name || '—'}</td><td>{rc.average || '—'}</td><td>{rc.grade ? <span className="badge badge-green">{rc.grade}</span> : '—'}</td><td>{rc.is_published ? <span className="badge badge-green">Yes</span> : <span className="badge badge-orange">Draft</span>}</td></tr>
                    ))}
                </tbody></table></div>
            )}
        </div>
    );

    const renderDownload = () => (
        <div className="card">
            <div className="card-header"><h3 className="card-title">Bulk Download Report Cards</h3></div>
            <div style={{ padding: '1rem' }}>
                <p className="text-sm text-muted mb-4">Select an exam and class, then download all report cards sorted by performance (top student first).</p>
                <div className="grid-2 mb-4">
                    <div className="form-group">
                        <label className="form-label">Exam</label>
                        <select className="form-select" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                            <option value="">Choose Exam</option>
                            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Class</label>
                        <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">Choose Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid-2 mb-4">
                    <div className="form-group">
                        <label className="form-label">Theme</label>
                        <select className="form-select" value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)}>
                            {['Classic White', 'Cream', 'Light Blue', 'Soft Green', 'Light Pink', 'Light Grey'].map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2 items-center mb-4">
                    <button className={`btn btn-sm ${includeFeeBalance ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIncludeFeeBalance(!includeFeeBalance)}>
                        {includeFeeBalance ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} Include Fee Balance
                    </button>
                </div>
                {selectedExam && selectedClass && (
                    <div style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: 8 }}>
                        <p className="text-sm mb-2"><strong>{rankedStudents.length}</strong> students in this class will be downloaded</p>
                        <div className="flex gap-2">
                            <button
                                className="btn btn-primary"
                                onClick={handleBulkIndividual}
                                disabled={downloading || rankedStudents.length === 0}
                            >
                                {downloading ? <span className="spinner" /> : <><Download size={16} /> Download One PDF ({rankedStudents.length} pages)</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderAnalyticsUI = (
        analytics: any,
        overallGrade: string,
        overallMean: number,
        position: number,
        totalStudents: number
    ) => {
        if (!analytics) return null;

        const chartColors = [
            'rgb(16, 185, 129)', 'rgb(59, 130, 246)', 'rgb(245, 158, 11)', 'rgb(239, 68, 68)',
            'rgb(139, 92, 246)', 'rgb(6, 182, 212)', 'rgb(236, 72, 153)', 'rgb(34, 197, 94)'
        ];

        // Line Chart history
        const hist = analytics.history || [];
        let pathPoints = '';
        let fillPathPoints = '';
        let dotElements: React.JSX.Element[] = [];

        if (hist.length > 1) {
            const width = 100;
            const height = 40;
            const paddingX = 8;
            const paddingY = 8;
            const plotW = width - (paddingX * 2);
            const plotH = height - (paddingY * 2);

            const points = hist.map((item: any, i: number) => {
                const x = paddingX + (i / (hist.length - 1)) * plotW;
                const valuePercent = Math.max(0, Math.min(item.mean, 100)) / 100;
                const y = height - paddingY - (valuePercent * plotH);
                return { x, y, mean: item.mean, examName: item.examName, grade: item.grade };
            });

            pathPoints = points.map((p: any) => `${p.x},${p.y}`).join(' ');
            fillPathPoints = `${points[0].x},${height - paddingY} ` + pathPoints + ` ${points[points.length - 1].x},${height - paddingY}`;

            dotElements = points.map((p: any, i: number) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="2" fill="white" stroke="rgb(16, 185, 129)" strokeWidth="1" />
                    <circle cx={p.x} cy={p.y} r="0.8" fill="rgb(16, 185, 129)" />
                    <text x={p.x} y={p.y - 3} fontSize="1.8" fontWeight="bold" textAnchor="middle" fill="#1e293b">
                        {p.mean.toFixed(0)}% ({p.grade || '—'})
                    </text>
                </g>
            ));
        }

        // Donut items
        const gradeMix = analytics.gradeMix || [];
        const totalGradesCount = gradeMix.reduce((a: number, c: any) => a + Number(c.count), 0);
        let accumulatedPercent = 0;
        const donutSegments = gradeMix.map((g: any, idx: number) => {
            const percent = totalGradesCount ? (g.count / totalGradesCount) * 100 : 0;
            const strokeDash = `${percent} ${100 - percent}`;
            const strokeOffset = 100 - accumulatedPercent + 25;
            accumulatedPercent += percent;
            return {
                grade: g.grade,
                count: g.count,
                color: chartColors[idx % chartColors.length],
                strokeDash,
                strokeOffset
            };
        });

        const marksVal = (analytics.subjectPerformance || []).map((s: any) => s.marks);
        let consistency = 100;
        if (marksVal.length > 0) {
            const avg = marksVal.reduce((a: number, b: number) => a + b, 0) / marksVal.length;
            const variance = marksVal.reduce((sum: number, mark: number) => sum + Math.pow(mark - avg, 2), 0) / marksVal.length;
            consistency = Math.max(0, Math.min(100, 100 - Math.sqrt(variance)));
        }
        const potential = Math.min(100, (100 - overallMean) + (analytics.improvement || 0) * 2);

        return (
            <div style={{ marginTop: '2rem', borderTop: '2px dashed var(--gray-200)', paddingTop: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.4rem', borderRadius: 8, background: 'rgb(240, 253, 244)', color: 'rgb(34, 197, 94)', display: 'flex' }}>
                        <GraduationCap size={20} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--gray-800)' }}>
                            Student Performance Analytics
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Visual metrics, target alignments and tutor remarks</span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* Line Chart card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Academic Progress</span>
                            <span style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#10b981', padding: '0.1rem 0.4rem', borderRadius: 9999, fontWeight: 'bold' }}>
                                {analytics.improvement != null ? `${analytics.improvement >= 0 ? '+' : ''}${analytics.improvement.toFixed(1)}% Change` : 'Stable'}
                            </span>
                        </div>
                        <div style={{ flex: 1, minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {hist.length > 1 ? (
                                <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                    <line x1="5" y1="8" x2="95" y2="8" stroke="#f1f5f9" strokeWidth="0.5" />
                                    <line x1="5" y1="20" x2="95" y2="20" stroke="#f1f5f9" strokeWidth="0.5" />
                                    <line x1="5" y1="32" x2="95" y2="32" stroke="#f1f5f9" strokeWidth="0.5" />
                                    <polygon points={fillPathPoints} fill="rgba(16, 185, 129, 0.08)" />
                                    <polyline fill="none" stroke="rgb(16, 185, 129)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points={pathPoints} />
                                    {dotElements}
                                </svg>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>Insufficient historical data for trend line</div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '0.5rem' }}>
                            {hist.map((item: any, i: number) => (
                                <span key={i} style={{ maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.examName}>
                                    {item.examName.split(' ')[0]}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Bar Chart card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '0.75rem' }}>
                            Subject Comparison
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(analytics.subjectPerformance || []).slice(0, 4).map((sub: any, i: number) => {
                                const studentW = Math.min(100, Math.max(0, sub.marks));
                                const classW = Math.min(100, Math.max(0, sub.classMean || sub.marks));
                                return (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                                            <span style={{ fontWeight: '600', color: '#334155' }}>{sub.subject}</span>
                                            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{sub.marks}% <span style={{ fontWeight: 'normal', color: '#64748b' }}>vs {Math.round(sub.classMean || 0)}%</span></span>
                                        </div>
                                        <div style={{ position: 'relative', height: 7, borderRadius: 9999, background: '#e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${classW}%`, background: '#cbd5e1', borderRadius: 9999 }} />
                                            <div style={{ position: 'absolute', left: 0, top: 1.5, height: 4, width: `${studentW}%`, background: chartColors[i % chartColors.length], borderRadius: 9999 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', justifyContent: 'flex-end', fontSize: '0.6rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748b' }} /> Class Avg
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(59, 130, 246)' }} /> Student
                            </div>
                        </div>
                    </div>

                    {/* Donut Chart card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: 75, height: 75, flexShrink: 0 }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="2.8" />
                                {totalGradesCount > 0 ? (
                                    donutSegments.map((seg: any, i: number) => (
                                        <circle
                                            key={i}
                                            cx="18"
                                            cy="18"
                                            r="15.915"
                                            fill="transparent"
                                            stroke={seg.color}
                                            strokeWidth="3.2"
                                            strokeDasharray={seg.strokeDash}
                                            strokeDashoffset={seg.strokeOffset}
                                            strokeLinecap="round"
                                        />
                                    ))
                                ) : (
                                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#94a3b8" strokeWidth="2" strokeDasharray="100 0" />
                                )}
                            </svg>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--green-700)', lineHeight: '1' }}>{overallGrade}</span>
                                <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 'bold' }}>Grade</span>
                            </div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Grade Mix</span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.5rem', fontSize: '0.65rem' }}>
                                {donutSegments.slice(0, 6).map((seg: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#334155' }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                                        <strong>{seg.grade}</strong>: {seg.count}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Gauges list */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                    {[
                        { label: 'Overall Average', val: `${overallMean.toFixed(1)}%`, desc: `Grade of ${overallGrade}`, color: '#10b981' },
                        { label: 'Class Rank position', val: `#${position}`, desc: `Out of ${totalStudents} students`, color: '#3b82f6' },
                        { label: 'Consistency Index', val: `${consistency.toFixed(0)}%`, desc: marksVal.length > 0 ? 'Variance dispersion' : 'No marks logged', color: '#f59e0b' },
                        { label: 'Success Potential', val: `${potential.toFixed(0)}%`, desc: 'Predicted curve margin', color: '#8b5cf6' },
                    ].map((gauge: any, i: number) => (
                        <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500', marginBottom: '0.25rem' }}>{gauge.label}</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: gauge.color, margin: '2px 0' }}>{gauge.val}</span>
                            <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{gauge.desc}</span>
                        </div>
                    ))}
                </div>

                {/* Insights Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.88rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                            <Activity size={14} /> Subject Strengths
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {(analytics.strengths || []).length > 0 ? (
                                (analytics.strengths || []).map((sub: string, i: number) => (
                                    <span key={i} style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 'bold' }}>
                                        {sub}
                                    </span>
                                ))
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: '#15803d' }}>Aim to exceed term subject benchmarks.</span>
                            )}
                        </div>
                    </div>

                    <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 8, padding: '0.88rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ca8a04', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                            <Target size={14} /> Revision Focus Areas
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {(analytics.focus || []).length > 0 ? (
                                (analytics.focus || []).map((sub: string, i: number) => (
                                    <span key={i} style={{ background: '#fef9c3', color: '#854d0e', fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 'bold' }}>
                                        {sub}
                                    </span>
                                ))
                            ) : (
                                <span style={{ fontSize: '0.7rem', color: '#854d0e' }}>Optimal performance across subjects!</span>
                            )}
                        </div>
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.88rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                            <MessageSquare size={14} /> Tutor Advisory Action
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#1e40af', margin: 0, lineHeight: '1.4', fontStyle: 'italic' }}>
                            "{analytics.advice || 'Perform consistent reviews prior to the subsequent tests.'}"
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const renderDemo = () => (
        <div className="card">
            <div className="card-header"><h3 className="card-title">Demo Report Card Preview</h3></div>
            <div style={{ padding: '1rem' }}>
                <p className="text-sm text-muted mb-4">
                    Explore our visual student analytics dashboard mockup below, which shows a complete performance analysis
                    and diagnostic insights. Scroll below to review graphs before downloading.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'var(--blue-50)', padding: '1rem', borderRadius: 8, fontSize: '0.85rem' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--blue-700)', fontWeight: 'bold' }}> James Omondi (Form 2 East)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.5rem', fontSize: '0.82rem' }}>
                            <div><strong>Adm No:</strong> 2024001</div>
                            <div><strong>Rank:</strong> 3 out of 45</div>
                            <div><strong>Exam:</strong> End of Term 2</div>
                            <div><strong>Mean score:</strong> 74.4% (Grade B)</div>
                        </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleDemoReport}
                            disabled={downloading}
                        >
                            {downloading ? <span className="spinner" /> : <><Download size={16} /> Download Demo PDF</>}
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', borderTop: '2px solid var(--gray-200)', paddingTop: '2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <span style={{ background: 'var(--green-100)', color: 'var(--green-800)', padding: '0.25rem 0.75rem', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 'bold' }}>
                            LIVE REPORT CARD PREVIEW
                        </span>
                        <h4 style={{ marginTop: '0.5rem', color: 'var(--gray-700)', margin: '4px 0 0 0' }}>Interactive Principal Dashboard</h4>
                    </div>

                    <div className="card" style={{ border: '2px solid var(--green-200)', maxWidth: 750, margin: '0 auto', background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                {school?.logo_url && <img src={school.logo_url} alt="" style={{ width: 60, height: 60, borderRadius: 8, margin: '0 auto 0.5rem' }} />}
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>NexaGen Academy</h2>
                                <p className="text-sm text-muted" style={{ margin: '4px 0 0 0' }}>Excellence Through Innovation</p>
                                <h3 style={{ marginTop: 12, color: 'var(--green-700)', fontSize: '1.05rem', fontWeight: 'bold' }}>STUDENT REPORT CARD</h3>
                            </div>
                        </div>

                        <div className="grid-2 mb-4" style={{ fontSize: '0.88rem', gap: '1rem' }}>
                            <div><strong>Name:</strong> James Omondi</div>
                            <div><strong>Adm No:</strong> 2024001</div>
                            <div><strong>Class:</strong> Form 2 East</div>
                            <div><strong>Exam:</strong> End of Term 2 Examination 2024</div>
                            <div><strong>Position:</strong> 3 out of 45</div>
                        </div>

                        <div className="table-wrapper mb-4">
                            <table className="data-table">
                                <thead><tr><th>Subject</th><th>Marks</th><th>Grade</th><th>Remarks</th></tr></thead>
                                <tbody>
                                    {[
                                        { name: 'Mathematics', marks: 85, grade: 'A', remarks: 'Excellent' },
                                        { name: 'English', marks: 78, grade: 'B', remarks: 'Very Good' },
                                        { name: 'Kiswahili', marks: 72, grade: 'B', remarks: 'Very Good' },
                                        { name: 'Chemistry', marks: 68, grade: 'C', remarks: 'Good' },
                                        { name: 'Physics', marks: 75, grade: 'B', remarks: 'Very Good' },
                                        { name: 'Biology', marks: 82, grade: 'A', remarks: 'Excellent' },
                                        { name: 'History', marks: 70, grade: 'B', remarks: 'Very Good' },
                                        { name: 'Geography', marks: 65, grade: 'C', remarks: 'Good' }
                                    ].map((r: any, i: number) => (
                                        <tr key={i}>
                                            <td>{r.name}</td>
                                            <td><strong>{r.marks}</strong></td>
                                            <td><span className="badge badge-green">{r.grade}</span></td>
                                            <td className="text-sm text-muted">{r.remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid-2 mb-4" style={{ fontSize: '0.95rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: 8, gap: '1rem' }}>
                            <div><strong>Total Marks:</strong> 595</div>
                            <div><strong>Mean:</strong> 74.4%</div>
                            <div><strong>Overall Grade:</strong> <span className="badge badge-green">B</span></div>
                            <div><strong>Subjects:</strong> 8</div>
                        </div>

                        <div style={{ background: 'var(--warning-light)', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                            <strong>Fee Balance:</strong> KES 15,000 (updated as of today)
                        </div>

                        {renderAnalyticsUI(
                            {
                                history: [
                                    { examName: 'Term 1 Exam 2024', mean: 68.5, grade: 'C' },
                                    { examName: 'Mid Term 2 2024', mean: 74.2, grade: 'B' },
                                    { examName: 'End of Term 2 2024', mean: 76.9, grade: 'B' },
                                ],
                                subjectPerformance: [
                                    { subject: 'Mathematics', marks: 85, classMean: 78, grade: 'A' },
                                    { subject: 'Biology', marks: 82, classMean: 76, grade: 'A' },
                                    { subject: 'English', marks: 78, classMean: 70, grade: 'B' },
                                    { subject: 'Physics', marks: 75, classMean: 72, grade: 'B' },
                                    { subject: 'Kiswahili', marks: 72, classMean: 68, grade: 'B' },
                                    { subject: 'History', marks: 70, classMean: 73, grade: 'B' },
                                    { subject: 'Chemistry', marks: 68, classMean: 64, grade: 'C' },
                                    { subject: 'Geography', marks: 65, classMean: 68, grade: 'C' }
                                ],
                                gradeMix: [
                                    { grade: 'A', count: 2 },
                                    { grade: 'B', count: 4 },
                                    { grade: 'C', count: 2 },
                                ],
                                strengths: ['Mathematics', 'Biology', 'English'],
                                focus: ['Geography', 'History'],
                                advice: 'Strong performance in sciences and languages. Focus on improving humanities subjects for balanced excellence.',
                                classMean: 71.9,
                                improvement: 2.7,
                            },
                            'B',
                            74.4,
                            3,
                            45
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', marginTop: '1.5rem' }}>
                            <div style={{ fontSize: '0.82rem' }}>
                                <p style={{ margin: 0 }}><strong>Class Teacher:</strong> _______________</p>
                                <p style={{ marginTop: 4, margin: '4px 0 0 0' }}><strong>Principal:</strong> _______________</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="btn btn-primary btn-sm" onClick={handleDemoReport} disabled={downloading}>
                                    {downloading ? <span className="spinner" /> : <><Download size={14} /> Download PDF</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Report Cards</h1>
                    <p className="page-subtitle">Generate, preview, and download student report cards</p>
                </div>
                <HelpIcon section="report-cards" />
            </div>

            <div className="card mb-4" style={{ padding: '0.5rem 1rem' }}>
                <div className="flex gap-1" style={{ overflowX: 'auto' }}>
                    {TABS.map(tab => (
                        <button key={tab.key} className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(tab.key)} style={{ whiteSpace: 'nowrap' }}>
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center" style={{ padding: '3rem' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>
            ) : (
                <>
                    {activeTab === 'generate' && renderGenerate()}
                    {activeTab === 'published' && renderPublished()}
                    {activeTab === 'download' && renderDownload()}
                    {activeTab === 'demo' && renderDemo()}
                </>
            )}
        </>
    );
}
