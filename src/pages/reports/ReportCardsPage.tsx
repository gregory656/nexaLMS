import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { generateReportCardPdf, downloadPdf } from '../../lib/pdf';
import {
    FileText, ClipboardList, Download, Eye, ToggleLeft, ToggleRight,
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
    const [gradeScales, setGradeScales] = useState<any[]>([]);
    const [reportCards, setReportCards] = useState<any[]>([]);

    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [includeFeeBalance, setIncludeFeeBalance] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [exRes, clRes, stuRes, resRes, gsRes, rcRes] = await Promise.all([
            supabase.from('exams').select('*, terms(name), academic_years(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            supabase.from('exam_results').select('*, subjects(name)').eq('school_id', school.id),
            supabase.from('grade_scales').select('*').eq('school_id', school.id).order('min_marks', { ascending: false }),
            supabase.from('report_cards').select('*, students(first_name, last_name, admission_number), classes(name), terms(name), academic_years(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
        ]);
        setExams(exRes.data || []);
        setClasses(clRes.data || []);
        setStudents(stuRes.data || []);
        setResults(resRes.data || []);
        setGradeScales(gsRes.data || []);
        setReportCards(rcRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const classStudents = students.filter(s => s.class_id === selectedClass);
    const examResults = results.filter(r => r.exam_id === selectedExam);

    const getGrade = (marks: number) => {
        for (const gs of gradeScales) {
            if (marks >= gs.min_marks && marks <= gs.max_marks) return gs;
        }
        // Demo grade scale fallback
        if (marks >= 80) return { grade: 'A', remarks: 'Excellent' };
        if (marks >= 70) return { grade: 'B', remarks: 'Very Good' };
        if (marks >= 60) return { grade: 'C', remarks: 'Good' };
        if (marks >= 50) return { grade: 'D', remarks: 'Fair' };
        return { grade: 'E', remarks: 'Needs Improvement' };
    };

    const getStudentReport = (studentId: string) => {
        const studentRes = examResults.filter(r => r.student_id === studentId);
        const total = studentRes.reduce((s, r) => s + Number(r.marks || 0), 0);
        const mean = studentRes.length ? total / studentRes.length : 0;
        const gs = getGrade(mean);
        return { subjects: studentRes, total, mean, grade: gs?.grade || '—', remarks: gs?.remarks || '' };
    };

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
                subjects: report.subjects,
                total: report.total,
                mean: report.mean,
                grade: report.grade,
                remarks: report.remarks,
                feeBalance: student.fee_balance,
                feeTimestamp: student.fee_balance_updated_at,
                includeFeeBalance,
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
        let count = 0;
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
                    subjects: report.subjects,
                    total: report.total,
                    mean: report.mean,
                    grade: report.grade,
                    remarks: report.remarks,
                    feeBalance: student.fee_balance,
                    feeTimestamp: student.fee_balance_updated_at,
                    includeFeeBalance,
                    getGrade,
                    position,
                    totalStudents: rankedStudents.length,
                    analytics,
                });
                downloadPdf(doc, `report_${student.first_name}_${student.last_name}_${count + 1}`);
                count++;
                // Small delay to prevent browser blocking multiple downloads
                await new Promise(r => setTimeout(r, 300));
            } catch { /* skip failed */ }
        }
        toast.success(`Downloaded ${count} individual report cards`);
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
                                    return <tr key={i}><td>{r.subjects?.name || '—'}</td><td><strong>{r.marks}</strong></td><td>{gs ? <span className="badge badge-green">{gs.grade}</span> : '—'}</td><td className="text-sm text-muted">{r.remarks || '—'}</td></tr>;
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
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
                                {downloading ? <span className="spinner" /> : <><Download size={16} /> Download Individual PDFs ({rankedStudents.length} files)</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderDemo = () => (
        <div className="card">
            <div className="card-header"><h3 className="card-title">Demo Report Card</h3></div>
            <div style={{ padding: '1rem' }}>
                <p className="text-sm text-muted mb-4">
                    Generate a sample report card with pre-filled data to see how the analytics and PDF generation will look
                    when real student data is entered. This includes performance trends, subject comparisons, and personalized insights.
                </p>
                <div style={{ background: 'var(--gray-50)', padding: '1.5rem', borderRadius: 8, marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem', color: 'var(--green-700)' }}>Demo Student Profile</h4>
                    <div className="grid-2" style={{ fontSize: '0.9rem' }}>
                        <div><strong>Name:</strong> James Omondi</div>
                        <div><strong>Adm No:</strong> 2024001</div>
                        <div><strong>Class:</strong> Form 2 East</div>
                        <div><strong>Exam:</strong> End of Term 2 Examination 2024</div>
                        <div><strong>Position:</strong> 3 out of 45</div>
                        <div><strong>Mean Grade:</strong> B (74.6%)</div>
                    </div>
                </div>
                <div style={{ background: 'var(--blue-50)', padding: '1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <strong>Analytics Included:</strong>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li>Movement across exams (Term 1 → Mid Term → End Term)</li>
                        <li>Subject performance with class mean comparison</li>
                        <li>Grade mix distribution (A: 2, B: 4, C: 2)</li>
                        <li>Strengths: Mathematics, Biology, English</li>
                        <li>Focus areas: Geography, History</li>
                        <li>Personalized advice based on performance</li>
                    </ul>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleDemoReport}
                    disabled={downloading}
                >
                    {downloading ? <span className="spinner" /> : <><Download size={16} /> Download Demo Report Card</>}
                </button>
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
