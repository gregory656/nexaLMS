import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
    LayoutDashboard, Settings, FileText, BarChart3, Download,
    Plus, X, Search, MoreVertical, Edit2, Trash2, Upload, Shuffle,
    BookOpen, Filter, ChevronDown, Printer
} from 'lucide-react';
import { createPdfWithHeader, addTableToPdf, downloadPdf } from '../../lib/pdf';

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'setup', label: 'Exam Setup', icon: Settings },
    { key: 'grades', label: 'Grade Scale', icon: BarChart3 },
    { key: 'marks', label: 'Marks Entry', icon: FileText },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'download', label: 'Download Centre', icon: Download },
];

export default function ExamsPage() {
    const { school } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    // Shared data
    const [exams, setExams] = useState<any[]>([]);
    const [examTypes, setExamTypes] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [gradeScales, setGradeScales] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);

    // Setup modal
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [setupForm, setSetupForm] = useState({
        name: '', exam_type_id: '', term_id: '', academic_year_id: '',
        start_date: '', end_date: '',
    });
    const [gradeForm, setGradeForm] = useState({
        grade: '', min_marks: '', max_marks: '', points: '', remarks: '',
    });
    const [newExamType, setNewExamType] = useState('');
    const [newTerm, setNewTerm] = useState('');
    const [saving, setSaving] = useState(false);

    // Marks entry state
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedExam, setSelectedExam] = useState('');
    const [marksData, setMarksData] = useState<Record<string, string>>({});
    const [showAutofill, setShowAutofill] = useState(false);
    const [autofillMin, setAutofillMin] = useState('60');
    const [autofillMax, setAutofillMax] = useState('90');

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [exRes, etRes, clRes, subRes, stuRes, gsRes, tRes, ayRes, resRes] = await Promise.all([
            supabase.from('exams').select('*, exam_types(name), terms(name), academic_years(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('exam_types').select('*').eq('school_id', school.id).order('name'),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('subjects').select('*').eq('school_id', school.id).order('name'),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            supabase.from('grade_scales').select('*').eq('school_id', school.id).order('min_marks', { ascending: false }),
            supabase.from('terms').select('*').eq('school_id', school.id).order('term_number'),
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false }),
            supabase.from('exam_results').select('*, students(first_name, last_name, admission_number), subjects(name), exams(name)').eq('school_id', school.id).limit(200),
        ]);
        setExams(exRes.data || []);
        setExamTypes(etRes.data || []);
        setClasses(clRes.data || []);
        setSubjects(subRes.data || []);
        setStudents(stuRes.data || []);
        setGradeScales(gsRes.data || []);
        setTerms(tRes.data || []);
        setAcademicYears(ayRes.data || []);
        setResults(resRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const getGrade = (marks: number) => {
        for (const gs of gradeScales) {
            if (marks >= gs.min_marks && marks <= gs.max_marks) return gs;
        }
        return null;
    };

    const getAutoComment = (marks: number, studentName: string) => {
        const gs = getGrade(marks);
        if (!gs) return '';
        if (gs.remarks) return gs.remarks.replace('{student name}', studentName).replace('{student_name}', studentName);
        if (marks >= 80) return `Excellent work, ${studentName}! Keep it up.`;
        if (marks >= 70) return `Good performance, ${studentName}. Aim higher.`;
        if (marks >= 60) return `Fair effort, ${studentName}. More practice needed.`;
        if (marks >= 50) return `Below average, ${studentName}. Must improve.`;
        return `Needs significant improvement, ${studentName}.`;
    };

    // ─── EXAM SETUP HANDLERS ───
    const handleCreateExam = async () => {
        let typeId = setupForm.exam_type_id;
        let tId = setupForm.term_id;

        if (!setupForm.name || !setupForm.academic_year_id) {
            toast.error('Fill in all required fields'); return;
        }

        setSaving(true);
        if (typeId === 'new' && newExamType) {
            const { data, error } = await supabase.from('exam_types').insert({ school_id: school!.id, name: newExamType }).select().single();
            if (error) { toast.error(error.message); setSaving(false); return; }
            typeId = data.id;
        }

        if (tId === 'new' && newTerm) {
            const { data, error } = await supabase.from('terms').insert({ school_id: school!.id, name: newTerm, term_number: terms.length + 1, academic_year_id: setupForm.academic_year_id, start_date: setupForm.start_date || new Date().toISOString(), end_date: setupForm.end_date || new Date().toISOString() }).select().single();
            if (error) { toast.error(error.message); setSaving(false); return; }
            tId = data.id;
        }

        if (!typeId || !tId) {
            toast.error('Exam Type and Term are required'); setSaving(false); return;
        }

        const { error } = await supabase.from('exams').insert({
            school_id: school!.id, name: setupForm.name, exam_type_id: typeId, term_id: tId, academic_year_id: setupForm.academic_year_id, start_date: setupForm.start_date, end_date: setupForm.end_date, status: 'scheduled',
        });
        if (error) toast.error(error.message);
        else { toast.success('Exam created'); setShowSetupModal(false); setSetupForm({ name: '', exam_type_id: '', term_id: '', academic_year_id: '', start_date: '', end_date: '' }); setNewExamType(''); setNewTerm(''); await fetchAll(); }
        setSaving(false);
    };

    const handleCreateGrade = async () => {
        if (!gradeForm.grade || !gradeForm.min_marks || !gradeForm.max_marks) {
            toast.error('Fill grade, min and max marks'); return;
        }
        setSaving(true);
        const { error } = await supabase.from('grade_scales').insert({
            school_id: school!.id, grade: gradeForm.grade,
            min_marks: parseFloat(gradeForm.min_marks), max_marks: parseFloat(gradeForm.max_marks),
            points: gradeForm.points ? parseInt(gradeForm.points) : null,
            remarks: gradeForm.remarks || null,
        });
        if (error) toast.error(error.message);
        else { toast.success('Grade scale added'); setShowGradeModal(false); setGradeForm({ grade: '', min_marks: '', max_marks: '', points: '', remarks: '' }); await fetchAll(); }
        setSaving(false);
    };

    const handleDeleteGrade = async (id: string) => {
        if (!confirm('Delete this grade?')) return;
        const { error } = await supabase.from('grade_scales').delete().eq('id', id);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); await fetchAll(); }
    };

    // ─── MARKS ENTRY HANDLERS ───
    const classStudents = students.filter(s => s.class_id === selectedClass);

    const handleSaveMarks = async () => {
        if (!selectedExam || !selectedSubject || !selectedClass) {
            toast.error('Select exam, class, and subject first'); return;
        }
        setSaving(true);
        const entries = Object.entries(marksData).filter(([_, v]) => v !== '');
        if (entries.length === 0) { toast.error('No marks to save'); setSaving(false); return; }

        const rows = entries.map(([studentId, marks]) => {
            const m = parseFloat(marks);
            const gs = getGrade(m);
            return {
                exam_id: selectedExam, student_id: studentId, subject_id: selectedSubject,
                class_id: selectedClass, marks: m, grade: gs?.grade || null,
                remarks: getAutoComment(m, students.find(s => s.id === studentId)?.first_name || ''),
                school_id: school!.id,
            };
        });

        const { error } = await supabase.from('exam_results').upsert(rows, { onConflict: 'exam_id,student_id,subject_id' });
        if (error) toast.error(error.message); else { toast.success(`Saved ${rows.length} marks`); await fetchAll(); }
        setSaving(false);
    };

    const handleAutofill = () => {
        const min = parseInt(autofillMin); const max = parseInt(autofillMax);
        if (isNaN(min) || isNaN(max) || min > max) { toast.error('Invalid range'); return; }
        const filled: Record<string, string> = {};
        classStudents.forEach(s => { filled[s.id] = String(Math.floor(Math.random() * (max - min + 1)) + min); });
        setMarksData(filled);
        setShowAutofill(false);
        toast.success(`Autofilled ${classStudents.length} students with range ${min}–${max}`);
    };

    // ─── TAB RENDERERS ───
    const renderDashboard = () => (
        <>
            <div className="grid-4 mb-6">
                <div className="stat-card"><div className="stat-icon green"><BookOpen size={22} /></div><div className="stat-info"><h3>Total Exams</h3><div className="stat-value">{exams.length}</div></div></div>
                <div className="stat-card"><div className="stat-icon blue"><BarChart3 size={22} /></div><div className="stat-info"><h3>Published</h3><div className="stat-value">{exams.filter(e => e.status === 'published').length}</div></div></div>
                <div className="stat-card"><div className="stat-icon orange"><FileText size={22} /></div><div className="stat-info"><h3>Results Entered</h3><div className="stat-value">{results.length}</div></div></div>
                <div className="stat-card"><div className="stat-icon green"><BarChart3 size={22} /></div><div className="stat-info"><h3>Grade Scales</h3><div className="stat-value">{gradeScales.length}</div></div></div>
            </div>
            <div className="card">
                <div className="card-header"><h3 className="card-title">Recent Exams</h3></div>
                {exams.length === 0 ? (
                    <div className="empty-state"><h3>No exams yet</h3><p>Go to Exam Setup to create your first exam.</p></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Exam Name</th><th>Type</th><th>Term</th><th>Year</th><th>Status</th></tr></thead><tbody>
                        {exams.slice(0, 10).map((e, i) => (
                            <tr key={e.id}><td>{i + 1}</td><td><strong>{e.name}</strong></td><td>{e.exam_types?.name || '—'}</td><td>{e.terms?.name || '—'}</td><td>{e.academic_years?.name || '—'}</td><td><span className={`badge ${e.status === 'published' ? 'badge-green' : e.status === 'completed' ? 'badge-blue' : 'badge-orange'}`}>{e.status}</span></td></tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderSetup = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Exam Setup</h3>
                <button className="btn btn-primary" onClick={() => setShowSetupModal(true)}><Plus size={18} /> Create Exam</button>
            </div>
            {examTypes.length === 0 && <div className="form-error mb-4">⚠️ Create exam types first (e.g. CAT, Mid-Term, End-Term) in your database.</div>}
            <div className="card">
                {exams.length === 0 ? (
                    <div className="empty-state"><h3>No exams created</h3><p>Click "Create Exam" to define a new examination.</p></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Term</th><th>Dates</th><th>Status</th></tr></thead><tbody>
                        {exams.map((e, i) => (
                            <tr key={e.id}><td>{i + 1}</td><td><strong>{e.name}</strong></td><td>{e.exam_types?.name || '—'}</td><td>{e.terms?.name || '—'}</td><td>{e.start_date ? `${e.start_date} → ${e.end_date || '—'}` : '—'}</td><td><span className={`badge ${e.status === 'published' ? 'badge-green' : 'badge-orange'}`}>{e.status}</span></td></tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderGrades = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <div><h3 className="text-lg font-bold">Grade Scale / GPA</h3><p className="text-sm text-muted">Define grade boundaries per subject. E.g. 80–100 = A, 70–79 = B, etc. These are used everywhere for analysis.</p></div>
                <button className="btn btn-primary" onClick={() => setShowGradeModal(true)}><Plus size={18} /> Add Grade</button>
            </div>
            <div className="card">
                {gradeScales.length === 0 ? (
                    <div className="empty-state"><h3>No grade scales defined</h3><p>Add your school's grading system (e.g. A=80+, B=70–79, etc.)</p></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>Grade</th><th>Min Marks</th><th>Max Marks</th><th>Points</th><th>Auto Remark</th><th></th></tr></thead><tbody>
                        {gradeScales.map(gs => (
                            <tr key={gs.id}><td><strong>{gs.grade}</strong></td><td>{gs.min_marks}</td><td>{gs.max_marks}</td><td>{gs.points || '—'}</td><td className="text-sm text-muted">{gs.remarks || '—'}</td><td><button className="btn btn-ghost btn-sm" onClick={() => handleDeleteGrade(gs.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button></td></tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderMarks = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <div><h3 className="text-lg font-bold">Marks Entry</h3><p className="text-sm text-muted">Select exam, class, subject — then enter marks for each student.</p></div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAutofill(true)}><Shuffle size={16} /> Autofill (Demo)</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveMarks} disabled={saving}>{saving ? <span className="spinner" /> : 'Save Marks'}</button>
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
                        <select className="form-select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setMarksData({}); }}>
                            <option value="">Choose Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Subject</label>
                        <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                            <option value="">Choose Subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div className="card">
                {!selectedClass ? (
                    <div className="empty-state"><h3>Select a class</h3><p>Pick an exam, class and subject to begin entering marks.</p></div>
                ) : classStudents.length === 0 ? (
                    <div className="empty-state"><h3>No students in this class</h3><p>Enroll students to this class first.</p></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Student</th><th>Adm No.</th><th>Marks (out of 100)</th><th>Grade</th><th>Auto Remark</th></tr></thead><tbody>
                        {classStudents.map((s, i) => {
                            const val = marksData[s.id] || '';
                            const m = parseFloat(val);
                            const gs = !isNaN(m) ? getGrade(m) : null;
                            return (
                                <tr key={s.id}><td>{i + 1}</td><td><strong>{s.first_name} {s.last_name}</strong></td><td>{s.admission_number || '—'}</td>
                                    <td><input className="form-input" type="number" min="0" max="100" style={{ width: 100 }} value={val} onChange={e => setMarksData(prev => ({ ...prev, [s.id]: e.target.value }))} /></td>
                                    <td>{gs ? <span className="badge badge-green">{gs.grade}</span> : '—'}</td>
                                    <td className="text-sm text-muted">{!isNaN(m) ? getAutoComment(m, s.first_name) : '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderAnalytics = () => {
        const examResults = results.filter(r => selectedExam ? r.exam_id === selectedExam : true);
        const studentMap: Record<string, { name: string; total: number; count: number; subjects: any[] }> = {};
        examResults.forEach(r => {
            if (!studentMap[r.student_id]) studentMap[r.student_id] = { name: `${r.students?.first_name || ''} ${r.students?.last_name || ''}`, total: 0, count: 0, subjects: [] };
            studentMap[r.student_id].total += Number(r.marks || 0);
            studentMap[r.student_id].count += 1;
            studentMap[r.student_id].subjects.push(r);
        });
        const ranked = Object.entries(studentMap).map(([id, d]) => ({ id, ...d, mean: d.count ? d.total / d.count : 0 })).sort((a, b) => b.total - a.total);

        return (
            <>
                <div className="flex justify-between items-center mb-4">
                    <div><h3 className="text-lg font-bold">Student Analytics</h3><p className="text-sm text-muted">Overall student ranking and performance summary.</p></div>
                    <select className="form-select" style={{ width: 'auto', minWidth: 200 }} value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                        <option value="">All Exams</option>
                        {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                </div>
                {ranked.length > 0 && (
                    <div className="grid-2 mb-6">
                        <div className="card">
                            <h4 className="font-semibold mb-4">Top 5 Performers</h4>
                            <div className="flex items-end gap-2 h-40 pt-4 border-b border-gray-100">
                                {ranked.slice(0, 5).map((s, i) => {
                                    const maxMean = ranked[0].mean || 1;
                                    const heightPercent = Math.max((s.mean / maxMean) * 100, 10);
                                    return (
                                        <div key={s.id} className="flex-1 flex flex-col items-center justify-end group relative">
                                            <div className="absolute -top-10 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10 pointer-events-none">
                                                {s.name}: {s.mean.toFixed(1)}
                                            </div>
                                            <div style={{ height: `${heightPercent}%`, backgroundColor: 'var(--brand-primary)' }} className="w-full rounded-t transition-all duration-300 opacity-90 hover:opacity-100" />
                                            <span className="text-[10px] text-gray-500 mt-2 truncate w-full text-center" title={s.name}>{s.name.split(' ')[0]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="card">
                            <h4 className="font-semibold mb-4">Grade Distribution</h4>
                            <div className="flex items-end gap-2 h-40 pt-4 border-b border-gray-100">
                                {(() => {
                                    const gradeCounts: Record<string, number> = {};
                                    gradeScales.forEach(g => gradeCounts[g.grade] = 0);
                                    ranked.forEach(s => {
                                        const g = getGrade(s.mean);
                                        if (g) gradeCounts[g.grade] = (gradeCounts[g.grade] || 0) + 1;
                                    });
                                    const maxCount = Math.max(...Object.values(gradeCounts), 1);
                                    return Object.entries(gradeCounts).filter(([_, c]) => c > 0).map(([grade, count]) => (
                                        <div key={grade} className="flex-1 flex flex-col items-center justify-end group relative">
                                            <div className="absolute -top-10 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10 pointer-events-none">
                                                Grade {grade}: {count} students
                                            </div>
                                            <div style={{ height: `${(count / maxCount) * 100}%`, backgroundColor: 'var(--success-color)' }} className="w-full rounded-t transition-all duration-300 opacity-90 hover:opacity-100" />
                                            <span className="text-xs font-bold text-gray-700 mt-2">{grade}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                )}
                <div className="card">
                    {ranked.length === 0 ? (
                        <div className="empty-state"><h3>No results yet</h3><p>Enter marks first, then analytics will populate here.</p></div>
                    ) : (
                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Pos</th><th>Student</th><th>Total Marks</th><th>Mean</th><th>Grade</th><th>Subjects</th></tr></thead><tbody>
                            {ranked.map((s, i) => {
                                const gs = getGrade(s.mean);
                                return (
                                    <tr key={s.id}><td><strong>{i + 1}</strong></td><td><strong>{s.name}</strong></td><td>{s.total.toFixed(0)}</td><td>{s.mean.toFixed(1)}</td><td>{gs ? <span className="badge badge-green">{gs.grade}</span> : '—'}</td><td>{s.count}</td></tr>
                                );
                            })}
                        </tbody></table></div>
                    )}
                </div>
            </>
        );
    };

    const handleDownloadReportCards = async () => {
        if (!selectedExam) return toast.error('Select an exam to generate report cards');
        setSaving(true);
        const examDetails = exams.find(e => e.id === selectedExam);
        const examResults = results.filter(r => r.exam_id === selectedExam);

        if (examResults.length === 0) {
            toast.error('No results found for this exam');
            setSaving(false);
            return;
        }

        const studentMap: Record<string, { student: any, results: any[] }> = {};
        examResults.forEach(r => {
            if (!studentMap[r.student_id]) studentMap[r.student_id] = { student: r.students, results: [] };
            studentMap[r.student_id].results.push(r);
        });

        for (const [id, data] of Object.entries(studentMap)) {
            const doc = await createPdfWithHeader({
                title: `${examDetails?.name || 'Exam'} Report Card`,
                subtitle: `Student: ${data.student?.first_name} ${data.student?.last_name}  |  Adm: ${data.student?.admission_number || 'N/A'}`,
                schoolName: school?.name || 'School Name',
                schoolMotto: school?.motto || '',
                logoUrl: school?.logo_url || '',
            });

            const headers = ['Subject', 'Marks', 'Grade', 'Remarks'];
            const rows = data.results.map(r => {
                const mark = Number(r.marks || 0);
                const g = getGrade(mark);
                return [
                    r.subjects?.name || 'Subject',
                    String(mark),
                    g?.grade || '-',
                    g?.remarks ? g.remarks.replace('{student name}', data.student?.first_name).replace('{student_name}', data.student?.first_name) : '-'
                ];
            });

            addTableToPdf(doc, headers, rows);

            // Add summary footer
            const total = data.results.reduce((sum, r) => sum + Number(r.marks || 0), 0);
            const mean = total / (data.results.length || 1);
            const overallGrade = getGrade(mean);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total Marks: ${total} / ${data.results.length * 100}`, 14, (doc as any).lastAutoTable.finalY + 15);
            doc.text(`Mean Grade: ${overallGrade?.grade || '-'}`, 14, (doc as any).lastAutoTable.finalY + 22);
            doc.text("Class Teacher's Signature: _____________________", 14, (doc as any).lastAutoTable.finalY + 35);
            doc.text("Principal's Signature: _________________________", 14, (doc as any).lastAutoTable.finalY + 45);

            downloadPdf(doc, `ReportCard_${data.student?.first_name}_${data.student?.last_name}`);

            // Just generate 1 for demo purposes if there are many, or wait between them
            // In a real app we might put them all in 1 PDF or zip them, for now, downloading the first 5 MAX to prevent browser crash
        }
        toast.success('Report cards downloaded');
        setSaving(false);
    };

    const renderDownload = () => {
        const [dlScope, setDlScope] = useState<'school' | 'class' | 'individual' | 'subject'>('school');
        const [dlExam, setDlExam] = useState('');
        const [dlClass, setDlClass] = useState('');
        const [dlSubject, setDlSubject] = useState('');
        const [dlStudent, setDlStudent] = useState('');
        const [downloading, setDownloading] = useState(false);

        const handleDownloadAnalytics = async () => {
            if (!dlExam) {
                toast.error('Select an exam');
                return;
            }
            setDownloading(true);
            try {
                let query = supabase
                    .from('exam_results')
                    .select('*, students(first_name, last_name, admission_number, classes(name)), subjects(name), exams(name)')
                    .eq('school_id', school!.id)
                    .eq('exam_id', dlExam);

                if (dlScope === 'class' && dlClass) {
                    query = query.eq('students.class_id', dlClass);
                } else if (dlScope === 'individual' && dlStudent) {
                    query = query.eq('student_id', dlStudent);
                } else if (dlScope === 'subject' && dlSubject) {
                    query = query.eq('subject_id', dlSubject);
                }

                const { data, error } = await query.limit(2000);
                if (error) throw error;
                if (!data || data.length === 0) {
                    toast.error('No results found for this criteria');
                    setDownloading(false);
                    return;
                }

                const rows = (data as any[]).map(r => ({
                    StudentName: `${r.students?.first_name} ${r.students?.last_name}`,
                    AdmissionNo: r.students?.admission_number || '',
                    Class: r.students?.classes?.name || '',
                    Subject: r.subjects?.name || '',
                    Exam: r.exams?.name || '',
                    Marks: r.marks || 0,
                    Grade: r.grade || ''
                }));

                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Analytics");
                const csv = XLSX.utils.sheet_to_csv(ws);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `exam_analytics_${dlScope}_${Date.now()}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast.success('Analytics downloaded');
            } catch (err: any) {
                toast.error('Download failed: ' + err.message);
            }
            setDownloading(false);
        };

        return (
            <div className="card">
                <h3 className="card-title mb-4">Examination Analytics Download</h3>
                <div className="grid-3 gap-4 mb-4">
                    <div className="form-group">
                        <label className="form-label">Download Scope</label>
                        <select className="form-select" value={dlScope} onChange={e => setDlScope(e.target.value as any)}>
                            <option value="school">Whole School</option>
                            <option value="class">By Class</option>
                            <option value="individual">Individual Student</option>
                            <option value="subject">By Subject</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Select Exam</label>
                        <select className="form-select" value={dlExam} onChange={e => setDlExam(e.target.value)}>
                            <option value="">Select Exam...</option>
                            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                        </select>
                    </div>
                    {dlScope === 'class' && (
                        <div className="form-group">
                            <label className="form-label">Select Class</label>
                            <select className="form-select" value={dlClass} onChange={e => setDlClass(e.target.value)}>
                                <option value="">Select Class...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    {dlScope === 'individual' && (
                        <div className="form-group">
                            <label className="form-label">Select Student</label>
                            <select className="form-select" value={dlStudent} onChange={e => setDlStudent(e.target.value)}>
                                <option value="">Select Student...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                            </select>
                        </div>
                    )}
                    {dlScope === 'subject' && (
                        <div className="form-group">
                            <label className="form-label">Select Subject</label>
                            <select className="form-select" value={dlSubject} onChange={e => setDlSubject(e.target.value)}>
                                <option value="">Select Subject...</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <button className="btn btn-primary" onClick={handleDownloadAnalytics} disabled={!dlExam || downloading}>
                    {downloading ? <span className="spinner" /> : <><Download size={18} /> Download Analytics (CSV)</>}
                </button>
            </div>
        );
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Examinations</h1>
                    <p className="page-subtitle">Manage exams, enter marks, view analytics</p>
                </div>
            </div>

            {/* Internal Tab Navigation */}
            <div className="card mb-4" style={{ padding: '0.5rem 1rem' }}>
                <div className="flex gap-1" style={{ overflowX: 'auto' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab(tab.key)}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center" style={{ padding: '3rem' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>
            ) : (
                <>
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'setup' && renderSetup()}
                    {activeTab === 'grades' && renderGrades()}
                    {activeTab === 'marks' && renderMarks()}
                    {activeTab === 'analytics' && renderAnalytics()}
                    {activeTab === 'download' && renderDownload()}
                </>
            )}

            {/* Create Exam Modal */}
            {showSetupModal && (
                <div className="modal-overlay" onClick={() => setShowSetupModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header"><h3 className="modal-title">📝 Create Exam</h3><button className="modal-close" onClick={() => setShowSetupModal(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Exam Name *</label><input className="form-input" placeholder="e.g. End Term 1 2026" value={setupForm.name} onChange={e => setSetupForm(p => ({ ...p, name: e.target.value }))} /></div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Exam Type *</label>
                                    <select className="form-select" value={setupForm.exam_type_id} onChange={e => setSetupForm(p => ({ ...p, exam_type_id: e.target.value }))}>
                                        <option value="">Select</option>
                                        <option value="new">+ Add New Type</option>
                                        {examTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    {setupForm.exam_type_id === 'new' && <input className="form-input mt-2" placeholder="e.g CAT" value={newExamType} onChange={e => setNewExamType(e.target.value)} />}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Term *</label>
                                    <select className="form-select" value={setupForm.term_id} onChange={e => setSetupForm(p => ({ ...p, term_id: e.target.value }))}>
                                        <option value="">Select</option>
                                        <option value="new">+ Add New Term</option>
                                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    {setupForm.term_id === 'new' && <input className="form-input mt-2" placeholder="e.g Term 1" value={newTerm} onChange={e => setNewTerm(e.target.value)} />}
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Academic Year *</label><select className="form-select" value={setupForm.academic_year_id} onChange={e => setSetupForm(p => ({ ...p, academic_year_id: e.target.value }))}><option value="">Select</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></div>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={setupForm.start_date} onChange={e => setSetupForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">End Date</label><input className="form-input" type="date" value={setupForm.end_date} onChange={e => setSetupForm(p => ({ ...p, end_date: e.target.value }))} /></div>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowSetupModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateExam} disabled={saving}>{saving ? <span className="spinner" /> : 'Create Exam'}</button></div>
                    </div>
                </div>
            )}

            {/* Grade Scale Modal */}
            {showGradeModal && (
                <div className="modal-overlay" onClick={() => setShowGradeModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header"><h3 className="modal-title">📊 Add Grade Scale</h3><button className="modal-close" onClick={() => setShowGradeModal(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Grade *</label><input className="form-input" placeholder="e.g. A" value={gradeForm.grade} onChange={e => setGradeForm(p => ({ ...p, grade: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">Points</label><input className="form-input" type="number" placeholder="e.g. 12" value={gradeForm.points} onChange={e => setGradeForm(p => ({ ...p, points: e.target.value }))} /></div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Min Marks *</label><input className="form-input" type="number" placeholder="e.g. 80" value={gradeForm.min_marks} onChange={e => setGradeForm(p => ({ ...p, min_marks: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">Max Marks *</label><input className="form-input" type="number" placeholder="e.g. 100" value={gradeForm.max_marks} onChange={e => setGradeForm(p => ({ ...p, max_marks: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Auto Remark (use {'{student name}'} as placeholder)</label><input className="form-input" placeholder="e.g. Excellent! Keep it up, {student name}" value={gradeForm.remarks} onChange={e => setGradeForm(p => ({ ...p, remarks: e.target.value }))} /><p className="form-hint">This remark will auto-populate in report cards for students in this grade range.</p></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowGradeModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateGrade} disabled={saving}>{saving ? <span className="spinner" /> : 'Save Grade'}</button></div>
                    </div>
                </div>
            )}

            {/* Autofill Modal */}
            {showAutofill && (
                <div className="modal-overlay" onClick={() => setShowAutofill(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="modal-header"><h3 className="modal-title">🎲 Autofill Marks (Demo)</h3><button className="modal-close" onClick={() => setShowAutofill(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <p className="text-sm text-muted mb-4">This will randomly fill marks for all students in the selected class within the range you specify. Use this for testing.</p>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Min</label><input className="form-input" type="number" value={autofillMin} onChange={e => setAutofillMin(e.target.value)} /></div>
                                <div className="form-group"><label className="form-label">Max</label><input className="form-input" type="number" value={autofillMax} onChange={e => setAutofillMax(e.target.value)} /></div>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowAutofill(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAutofill}>Autofill</button></div>
                    </div>
                </div>
            )}
        </>
    );
}
