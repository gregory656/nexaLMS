import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    FileText, ClipboardList, Download, Eye, ToggleLeft, ToggleRight,
    Printer, QrCode
} from 'lucide-react';

const TABS = [
    { key: 'generate', label: 'Generate', icon: FileText },
    { key: 'published', label: 'Published Reports', icon: ClipboardList },
    { key: 'download', label: 'Bulk Download', icon: Download },
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
    const [saving, setSaving] = useState(false);

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
        return null;
    };

    const getStudentReport = (studentId: string) => {
        const studentRes = examResults.filter(r => r.student_id === studentId);
        const total = studentRes.reduce((s, r) => s + Number(r.marks || 0), 0);
        const mean = studentRes.length ? total / studentRes.length : 0;
        const gs = getGrade(mean);
        return { subjects: studentRes, total, mean, grade: gs?.grade || '—', remarks: gs?.remarks || '' };
    };

    // Preview a single student report
    const previewStudent = selectedStudent ? getStudentReport(selectedStudent) : null;
    const previewStudentData = selectedStudent ? students.find(s => s.id === selectedStudent) : null;

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
            {previewStudent && previewStudentData && (
                <div className="card" style={{ border: '2px solid var(--green-200)', maxWidth: 700, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        {school?.logo_url && <img src={school.logo_url} alt="" style={{ width: 60, height: 60, borderRadius: 8, margin: '0 auto 0.5rem' }} />}
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{school?.name || 'School Name'}</h2>
                        <p className="text-sm text-muted">{school?.motto || ''}</p>
                        <h3 style={{ marginTop: 8, color: 'var(--green-700)' }}>STUDENT REPORT CARD</h3>
                    </div>

                    <div className="grid-2 mb-4" style={{ fontSize: '0.88rem' }}>
                        <div><strong>Name:</strong> {previewStudentData.first_name} {previewStudentData.last_name}</div>
                        <div><strong>Adm No:</strong> {previewStudentData.admission_number || '—'}</div>
                        <div><strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name || '—'}</div>
                        <div><strong>Exam:</strong> {exams.find(e => e.id === selectedExam)?.name || '—'}</div>
                    </div>

                    <div className="table-wrapper mb-4">
                        <table className="data-table">
                            <thead><tr><th>Subject</th><th>Marks</th><th>Grade</th><th>Remarks</th></tr></thead>
                            <tbody>
                                {previewStudent.subjects.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No results found for this student.</td></tr>
                                ) : previewStudent.subjects.map((r: any, i: number) => {
                                    const gs = getGrade(Number(r.marks));
                                    return <tr key={i}><td>{r.subjects?.name || '—'}</td><td><strong>{r.marks}</strong></td><td>{gs ? <span className="badge badge-green">{gs.grade}</span> : '—'}</td><td className="text-sm text-muted">{r.remarks || '—'}</td></tr>;
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid-2 mb-4" style={{ fontSize: '0.9rem', background: 'var(--gray-50)', padding: '1rem', borderRadius: 8 }}>
                        <div><strong>Total Marks:</strong> {previewStudent.total.toFixed(0)}</div>
                        <div><strong>Mean:</strong> {previewStudent.mean.toFixed(1)}</div>
                        <div><strong>Overall Grade:</strong> <span className="badge badge-green">{previewStudent.grade}</span></div>
                        <div><strong>Subjects:</strong> {previewStudent.subjects.length}</div>
                    </div>

                    {includeFeeBalance && (
                        <div style={{ background: 'var(--warning-light)', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                            <strong>Fee Balance:</strong> (Will be pulled from finance module)
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
                        <div style={{ fontSize: '0.82rem' }}>
                            <p><strong>Class Teacher:</strong> _______________</p>
                            <p style={{ marginTop: 4 }}><strong>Principal:</strong> _______________</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <QrCode size={48} style={{ color: 'var(--gray-300)' }} />
                            <p className="text-xs text-muted">QR Verification</p>
                        </div>
                    </div>
                </div>
            )}

            {!previewStudent && selectedExam && selectedClass && (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Class Report Summary</h3></div>
                    {classStudents.length === 0 ? (
                        <div className="empty-state"><h3>No students in this class</h3></div>
                    ) : (
                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Student</th><th>Total</th><th>Mean</th><th>Grade</th><th>Preview</th></tr></thead><tbody>
                            {classStudents.map((s, i) => {
                                const rep = getStudentReport(s.id);
                                return (
                                    <tr key={s.id}><td>{i + 1}</td><td><strong>{s.first_name} {s.last_name}</strong></td><td>{rep.total.toFixed(0)}</td><td>{rep.mean.toFixed(1)}</td><td>{rep.grade !== '—' ? <span className="badge badge-green">{rep.grade}</span> : '—'}</td>
                                        <td><button className="btn btn-ghost btn-sm" onClick={() => setSelectedStudent(s.id)}><Eye size={14} /> View</button></td>
                                    </tr>
                                );
                            })}
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
            <div className="empty-state">
                <Download size={48} style={{ color: 'var(--gray-300)', marginBottom: '1rem' }} />
                <h3>Bulk Download</h3>
                <p>Download individual reports, entire class reports, or all school report cards as PDF. Coming soon.</p>
                <div className="flex gap-2 mt-4 justify-center">
                    <button className="btn btn-secondary btn-sm" disabled><Printer size={16} /> Print Class Reports</button>
                    <button className="btn btn-secondary btn-sm" disabled><Download size={16} /> Download All (PDF)</button>
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
                </>
            )}
        </>
    );
}
