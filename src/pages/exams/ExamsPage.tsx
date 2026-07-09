import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
    LayoutDashboard, Settings, FileText, BarChart3, Download,
    Plus, X, Trash2, Shuffle, BookOpen, CheckCircle, Database, Sparkles
} from 'lucide-react';
import HelpIcon from '../../components/ui/HelpIcon';
import { addTableToPdf, createPdfWithHeader, downloadPdf } from '../../lib/pdf';

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'setup', label: 'Exam Setup', icon: Settings },
    { key: 'grades', label: 'Grade Scale', icon: BarChart3 },
    { key: 'marks', label: 'Marks Entry', icon: FileText },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'super-analytics', label: 'Super Analytics', icon: Sparkles },
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
    const [departments, setDepartments] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);

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

    // Download centre state
    const [dlScope, setDlScope] = useState<'school' | 'class' | 'individual' | 'subject'>('school');
    const [dlExam, setDlExam] = useState('');
    const [dlClass, setDlClass] = useState('');
    const [dlSubject, setDlSubject] = useState('');
    const [dlStudent, setDlStudent] = useState('');
    const [dlFormat, setDlFormat] = useState<'csv' | 'pdf'>('pdf');
    const [analyticsDownloading, setAnalyticsDownloading] = useState(false);
    const [analyticsTab, setAnalyticsTab] = useState<'school' | 'classes' | 'subject' | 'trs' | 'gender' | 'individual'>('school');

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [exRes, etRes, clRes, subRes, stuRes, gsRes, tRes, ayRes, resRes, deptRes, teaRes, assignRes] = await Promise.all([
            supabase.from('exams').select('*, exam_types(name), terms(name), academic_years(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('exam_types').select('*').eq('school_id', school.id).order('name'),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('subjects').select('*').eq('school_id', school.id).order('name'),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            supabase.from('grade_scales').select('*').eq('school_id', school.id).order('min_marks', { ascending: false }),
            supabase.from('terms').select('*').eq('school_id', school.id).order('term_number'),
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false }),
            supabase.from('exam_results').select('*, students(first_name, last_name, admission_number, class_id, classes(name)), subjects(name), exams(name)').eq('school_id', school.id).limit(10000),
            supabase.from('departments').select('*').eq('school_id', school.id).order('name'),
            supabase.from('teachers').select('*').eq('school_id', school.id).order('first_name'),
            supabase.from('teacher_subject_assignments').select('*').eq('school_id', school.id),
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
        setDepartments(deptRes.data || []);
        setTeachers(teaRes.data || []);
        setTeacherAssignments(assignRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    useEffect(() => {
        if (!selectedExam || !selectedClass || !selectedSubject) return;
        const existingMarks: Record<string, string> = {};
        results
            .filter(result => result.exam_id === selectedExam && result.class_id === selectedClass && result.subject_id === selectedSubject)
            .forEach(result => {
                existingMarks[result.student_id] = String(result.marks ?? '');
            });
        setMarksData(existingMarks);
    }, [selectedExam, selectedClass, selectedSubject, results]);

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
                                {ranked.slice(0, 5).map((s) => {
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

    const handleDownloadAnalytics = async () => {
        if (!dlExam) {
            toast.error('Select an exam');
            return;
        }
        setAnalyticsDownloading(true);
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
                setAnalyticsDownloading(false);
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
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            toast.success('Analytics downloaded');
        } catch (err: any) {
            toast.error('Download failed: ' + err.message);
        }
        setAnalyticsDownloading(false);
    };

    const renderDownload = () => {
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
                <button className="btn btn-primary" onClick={handleDownloadAnalytics} disabled={!dlExam || analyticsDownloading}>
                    {analyticsDownloading ? <span className="spinner" /> : <><Download size={18} /> Download Analytics (CSV)</>}
                </button>
            </div>
        );
    };

    const buildAdvancedAnalytics = (examId: string) => {
        const examResults = results.filter(r => r.exam_id === examId);
        const exam = exams.find(e => e.id === examId);
        const previousExam = exams
            .filter(e => e.id !== examId && (!exam?.created_at || new Date(e.created_at) < new Date(exam.created_at)))
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
        const previousResults = previousExam ? results.filter(r => r.exam_id === previousExam.id) : [];
        const expectedRows = students.length * subjects.length;
        const completion = expectedRows ? Math.round((examResults.length / expectedRows) * 100) : 0;

        // Data maps
        const studentMap: Record<string, any> = {};
        const subjectMap: Record<string, any> = {};
        const classMap: Record<string, any> = {};
        const departmentMap: Record<string, any> = {};
        const streamMap: Record<string, any> = {};
        const teacherMap: Record<string, any> = {};
        const gradeCounts: Record<string, number> = {};
        gradeScales.forEach(gs => { gradeCounts[gs.grade] = 0; });

        let boysCount = 0, girlsCount = 0;
        let boysMarks = 0, girlsMarks = 0;
        let boysPasses = 0, girlsPasses = 0;
        let totalPasses = 0;
        let distinctionCount = 0;

        const fullName = (person: any) => `${person?.first_name || ''} ${person?.last_name || ''}`.trim() || 'N/A';
        const teacherName = (teacherId?: string) => fullName(teachers.find(t => t.id === teacherId));
        const teacherForResult = (r: any) => {
            if (r.teacher_id) return r.teacher_id;
            return teacherAssignments.find(a => a.subject_id === r.subject_id && (!a.class_id || a.class_id === r.class_id))?.teacher_id;
        };
        const toStats = (marks: number[]) => {
            if (!marks.length) return { median: 0, mode: 'N/A', standardDeviation: 0, range: 0 };
            const sorted = [...marks].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            const frequencies = sorted.reduce((acc, mark) => ({ ...acc, [mark]: (acc[mark] || 0) + 1 }), {} as Record<string, number>);
            const maxFrequency = Math.max(...Object.values(frequencies));
            const mode = maxFrequency > 1 ? Object.entries(frequencies).filter(([, count]) => count === maxFrequency).map(([mark]) => mark).join(', ') : 'N/A';
            const mean = marks.reduce((sum, mark) => sum + mark, 0) / marks.length;
            const standardDeviation = Math.sqrt(marks.reduce((sum, mark) => sum + Math.pow(mark - mean, 2), 0) / marks.length);
            return { median, mode, standardDeviation, range: sorted[sorted.length - 1] - sorted[0] };
        };

        examResults.forEach(r => {
            const marks = Number(r.marks || 0);
            const student = students.find(s => s.id === r.student_id);
            const isPass = marks >= 40; // Default pass mark 40 for analytics purposes
            const studentName = student ? `${student.first_name} ${student.last_name}`.trim() : 'Unknown';
            const sClass = classes.find(c => c.id === r.class_id);
            const className = sClass?.name || 'Unassigned';
            const streamId = student?.stream_id || sClass?.stream_id;
            const streamName = sClass?.streams?.name || 'N/A';
            const subject = subjects.find(s => s.id === r.subject_id);
            const subjectName = subject?.name || 'Unknown';
            const deptId = subject?.department_id;
            const department = departments.find(d => d.id === deptId);
            const gender = student?.gender;
            const resultTeacherId = teacherForResult(r);

            // Student level
            if (!studentMap[r.student_id]) studentMap[r.student_id] = { id: r.student_id, name: studentName, className, classId: r.class_id, streamName, total: 0, count: 0, passes: 0, subjects: [] };
            studentMap[r.student_id].total += marks;
            studentMap[r.student_id].count += 1;
            if (isPass) studentMap[r.student_id].passes += 1;
            studentMap[r.student_id].subjects.push({ subject: subjectName, marks, grade: r.grade || getGrade(marks)?.grade || 'N/A' });

            // Subject level
            if (!subjectMap[r.subject_id]) subjectMap[r.subject_id] = { id: r.subject_id, name: subjectName, total: 0, count: 0, highest: -1, lowest: 101, passes: 0, marks: [], teachers: new Set() };
            subjectMap[r.subject_id].total += marks;
            subjectMap[r.subject_id].count += 1;
            if (marks > subjectMap[r.subject_id].highest) subjectMap[r.subject_id].highest = marks;
            if (marks < subjectMap[r.subject_id].lowest) subjectMap[r.subject_id].lowest = marks;
            if (isPass) subjectMap[r.subject_id].passes += 1;
            subjectMap[r.subject_id].marks.push(marks);
            if (resultTeacherId) subjectMap[r.subject_id].teachers.add(resultTeacherId);

            // Class level
            if (!classMap[r.class_id]) classMap[r.class_id] = { id: r.class_id, name: className, total: 0, count: 0, students: new Set(), passes: 0 };
            classMap[r.class_id].total += marks;
            classMap[r.class_id].count += 1;
            classMap[r.class_id].students.add(r.student_id);
            if (isPass) classMap[r.class_id].passes += 1;

            // Department level
            if (deptId) {
                if (!departmentMap[deptId]) departmentMap[deptId] = { id: deptId, name: department?.name || `Department ${deptId.slice(0, 4)}`, total: 0, count: 0, passes: 0 };
                departmentMap[deptId].total += marks;
                departmentMap[deptId].count += 1;
                if (isPass) departmentMap[deptId].passes += 1;
            }

            // Stream level
            if (streamId) {
                if (!streamMap[streamId]) streamMap[streamId] = { id: streamId, name: streamName, total: 0, count: 0, passes: 0 };
                streamMap[streamId].total += marks;
                streamMap[streamId].count += 1;
                if (isPass) streamMap[streamId].passes += 1;
            }

            // Teacher level
            if (resultTeacherId) {
                if (!teacherMap[resultTeacherId]) teacherMap[resultTeacherId] = { id: resultTeacherId, name: teacherName(resultTeacherId), total: 0, count: 0, passes: 0, distinctions: 0 };
                teacherMap[resultTeacherId].total += marks;
                teacherMap[resultTeacherId].count += 1;
                if (isPass) teacherMap[resultTeacherId].passes += 1;
                if (marks >= 80) teacherMap[resultTeacherId].distinctions += 1;
            }

            // Gender level
            if (gender === 'male') { boysCount++; boysMarks += marks; if (isPass) boysPasses++; }
            if (gender === 'female') { girlsCount++; girlsMarks += marks; if (isPass) girlsPasses++; }

            if (isPass) totalPasses++;
            if (marks >= 80) distinctionCount++;

            const grade = r.grade || getGrade(marks)?.grade || 'Ungraded';
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });

        // Computed Aggregations
        const computeMeans = (mapObj: Record<string, any>) => Object.values(mapObj).map(v => ({ ...v, mean: v.count ? v.total / v.count : 0 })).sort((a, b) => b.mean - a.mean);
        const previousMeans = (key: 'student_id' | 'class_id' | 'subject_id' | 'teacher_id') => {
            const map: Record<string, { total: number; count: number }> = {};
            previousResults.forEach(r => {
                const teacherId = key === 'teacher_id' ? teacherForResult(r) : null;
                const id = teacherId || r[key];
                if (!id) return;
                if (!map[id]) map[id] = { total: 0, count: 0 };
                map[id].total += Number(r.marks || 0);
                map[id].count += 1;
            });
            return Object.entries(map).reduce((acc, [id, d]) => ({ ...acc, [id]: d.count ? d.total / d.count : 0 }), {} as Record<string, number>);
        };
        const withMovement = (items: any[], prev: Record<string, number>) => items.map(item => ({
            ...item,
            previousMean: prev[item.id],
            improvement: typeof prev[item.id] === 'number' ? item.mean - prev[item.id] : null,
        }));

        const ranked = withMovement(computeMeans(studentMap), previousMeans('student_id'));
        const subjectsRanked = withMovement(computeMeans(subjectMap).map(s => ({ ...s, ...toStats(s.marks), teachers: Array.from(s.teachers || []).map(id => teacherName(String(id))).join(', ') || 'N/A' })), previousMeans('subject_id'));
        const classesRanked = withMovement(computeMeans(classMap).map(c => ({ ...c, studentCount: c.students.size })), previousMeans('class_id'));
        const departmentsRanked = computeMeans(departmentMap);
        const streamsRanked = computeMeans(streamMap);
        const teachersRanked = withMovement(computeMeans(teacherMap), previousMeans('teacher_id'));

        const overallMean = examResults.length ? examResults.reduce((sum, r) => sum + Number(r.marks || 0), 0) / examResults.length : 0;
        const passRate = examResults.length ? (totalPasses / examResults.length) * 100 : 0;
        const failRate = 100 - passRate;
        const distinctionRate = examResults.length ? (distinctionCount / examResults.length) * 100 : 0;
        const weakSubjects = subjectsRanked.slice().sort((a, b) => a.mean - b.mean).slice(0, 3);
        const topStudents = ranked.slice(0, 100);
        const bottomStudents = ranked.slice().sort((a, b) => a.mean - b.mean).slice(0, 100);
        const mostImprovedStudents = ranked.filter(s => s.improvement !== null && s.improvement > 0).sort((a, b) => b.improvement - a.improvement).slice(0, 10);
        const biggestDeclineStudents = ranked.filter(s => s.improvement !== null && s.improvement < 0).sort((a, b) => a.improvement - b.improvement).slice(0, 10);
        const mostImprovedClasses = classesRanked.filter(c => c.improvement !== null).sort((a, b) => (b.improvement || 0) - (a.improvement || 0)).slice(0, 5);
        const mostImprovedSubjects = subjectsRanked.filter(s => s.improvement !== null).sort((a, b) => (b.improvement || 0) - (a.improvement || 0)).slice(0, 5);
        const mostImprovedTeachers = teachersRanked.filter(t => t.improvement !== null).sort((a, b) => (b.improvement || 0) - (a.improvement || 0)).slice(0, 5);
        const atRiskStudents = ranked.filter(s => s.mean < 40 || s.passes < Math.ceil(s.count / 2)).slice(0, 25);
        const straightAStudents = ranked.filter(s => s.subjects.length && s.subjects.every((sub: any) => String(sub.grade).toUpperCase().startsWith('A')));
        const allPassStudents = ranked.filter(s => s.count && s.passes === s.count);
        const failingMultipleSubjects = ranked.filter(s => (s.count - s.passes) >= 2);

        const boysMean = boysCount ? boysMarks / boysCount : 0;
        const girlsMean = girlsCount ? girlsMarks / girlsCount : 0;
        const boys = ranked.filter(s => students.find(st => st.id === s.id)?.gender === 'male');
        const girls = ranked.filter(s => students.find(st => st.id === s.id)?.gender === 'female');
        const genderResults = {
            boysMean,
            girlsMean,
            boysCount,
            girlsCount,
            boysPassRate: boysCount ? (boysPasses / boysCount) * 100 : 0,
            girlsPassRate: girlsCount ? (girlsPasses / girlsCount) * 100 : 0,
            bestBoy: boys[0]?.name || 'N/A',
            bestGirl: girls[0]?.name || 'N/A',
            topBoys: boys.slice(0, 10),
            topGirls: girls.slice(0, 10),
        };

        const coverage = classes.flatMap(cls => subjects.map(subject => {
            const classStudentsCount = students.filter(s => s.class_id === cls.id).length;
            const keyed = examResults.filter(r => r.class_id === cls.id && r.subject_id === subject.id).length;
            return {
                classId: cls.id, className: cls.name, subjectId: subject.id, subjectName: subject.name,
                keyed, expected: classStudentsCount, remaining: Math.max(classStudentsCount - keyed, 0),
                percent: classStudentsCount ? Math.round((keyed / classStudentsCount) * 100) : 0,
            };
        }));

        return {
            examResults, expectedRows, completion, ranked, subjectsRanked,
            classesRanked, departmentsRanked, streamsRanked, teachersRanked,
            gradeCounts, overallMean, passRate, failRate, distinctionRate, weakSubjects, coverage, genderResults,
            previousExamName: previousExam?.name || 'N/A',
            bestSubject: subjectsRanked[0]?.name || 'N/A',
            mostDifficultSubject: weakSubjects[0]?.name || 'N/A',
            bestClass: classesRanked[0]?.name || 'N/A',
            lowestClass: classesRanked.slice().sort((a, b) => a.mean - b.mean)[0]?.name || 'N/A',
            bestDepartment: departmentsRanked[0]?.name || 'N/A',
            lowestDepartment: departmentsRanked.slice().sort((a, b) => a.mean - b.mean)[0]?.name || 'N/A',
            topStudents,
            bottomStudents,
            mostImprovedStudents,
            biggestDeclineStudents,
            mostImprovedClasses,
            mostImprovedSubjects,
            mostImprovedTeachers,
            atRiskStudents,
            straightAStudents,
            allPassStudents,
            failingMultipleSubjects,
            targetAnalysis: [['Students Meeting Target', 'N/A'], ['Students Below Target', 'N/A'], ['Subjects Meeting Target', 'N/A'], ['Teachers Meeting Target', 'N/A'], ['Classes Meeting Target', 'N/A'], ['Departments Meeting Target', 'N/A']],
            jointAnalysis: [['Overall Joint School Position', 'N/A'], ['Best Performing School', 'N/A'], ['Lowest Performing School', 'N/A'], ['School vs Joint Average', 'N/A'], ['Highest Improved School', 'N/A'], ['Most Consistent School', 'N/A']],
            attendanceAnalysis: [['Attendance Rate During Exams', 'N/A'], ['Perfect Attendance + High Performance', 'N/A'], ['Missed Lessons', 'N/A'], ['Exam Attendance', 'N/A']],
        };
    };

    const renderAdvancedAnalytics = () => {
        const analyticsExam = selectedExam || exams[0]?.id || '';
        const analytics = analyticsExam ? buildAdvancedAnalytics(analyticsExam) : null;
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        const maxSubjectMean = Math.max(...(analytics?.subjectsRanked.map(s => s.mean) || [1]), 1);
        const gradeTotal = Object.values(analytics?.gradeCounts || {}).reduce((sum, count) => sum + count, 0);
        const movementItems = [
            ...(analytics?.mostImprovedStudents.slice(0, 5).map(s => ({ label: s.name.split(' ')[0], value: Math.max(s.improvement || 0, 0) })) || []),
            ...(analytics?.biggestDeclineStudents.slice(0, 5).map(s => ({ label: s.name.split(' ')[0], value: Math.abs(Math.min(s.improvement || 0, 0)) })) || []),
        ];
        const gradePie = (() => {
            let start = 0;
            return Object.entries(analytics?.gradeCounts || {}).map(([_, count], index) => {
                const slice = gradeTotal ? (count / gradeTotal) * 100 : 0;
                const segment = `${colors[index % colors.length]} ${start}% ${start + slice}%`;
                start += slice;
                return segment;
            }).join(', ');
        })();
        const genderTotal = (analytics?.genderResults.boysCount || 0) + (analytics?.genderResults.girlsCount || 0);
        const genderPie = genderTotal
            ? `#3b82f6 0% ${((analytics!.genderResults.boysCount / genderTotal) * 100).toFixed(1)}%, #ec4899 ${((analytics!.genderResults.boysCount / genderTotal) * 100).toFixed(1)}% 100%`
            : '#e5e7eb 0% 100%';
        const trendPoints = analytics ? [analytics.overallMean, analytics.passRate, analytics.distinctionRate, analytics.completion] : [];
        const renderDonut = (background: string, center: string, label: string) => (
            <div className="super-donut-wrap">
                <div className="super-donut" style={{ background: `conic-gradient(${background || '#e5e7eb 0% 100%'})` }}>
                    <div><strong>{center}</strong><span>{label}</span></div>
                </div>
            </div>
        );
        const renderBars = (items: any[], getLabel: (item: any) => string, getValue: (item: any) => number, suffix = '') => {
            const maxValue = Math.max(...items.map(getValue), 1);
            return (
                <div className="super-bars">
                    {items.length ? items.map((item, index) => {
                        const value = getValue(item);
                        return (
                            <div className="super-bar-row" key={`${getLabel(item)}-${index}`}>
                                <span title={getLabel(item)}>{getLabel(item)}</span>
                                <div><i style={{ width: `${Math.max((value / maxValue) * 100, 4)}%`, background: colors[index % colors.length] }} /></div>
                                <strong>{value.toFixed(1)}{suffix}</strong>
                            </div>
                        );
                    }) : <div className="text-muted text-sm">N/A</div>}
                </div>
            );
        };
        const renderLine = (values: number[], labels: string[]) => {
            const points = values.map((value, index) => {
                const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
                const y = 100 - Math.max(Math.min(value, 100), 0);
                return `${x},${y}`;
            }).join(' ');
            return (
                <div className="super-line-chart">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polyline points="0,100 100,100" className="super-line-base" />
                        <polyline points={points} className="super-line-path" />
                        {values.map((value, index) => {
                            const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
                            const y = 100 - Math.max(Math.min(value, 100), 0);
                            return <circle key={labels[index]} cx={x} cy={y} r="2.4" className="super-line-dot" />;
                        })}
                    </svg>
                    <div className="super-line-labels">{labels.map((label, index) => <span key={label}>{label}<strong>{values[index].toFixed(1)}</strong></span>)}</div>
                </div>
            );
        };

        return (
            <>
                <div className="flex justify-between items-center mb-4">
                    <div><h3 className="text-lg font-bold">Super Analytics Command Centre</h3><p className="text-sm text-muted">Decision-support analytics for awards, interventions, departments, teachers, classes, subjects, and students.</p></div>
                    <select className="form-select" style={{ width: 'auto', minWidth: 240 }} value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                        <option value="">Latest Exam</option>
                        {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                </div>

                <div className="analytics-nav mb-6">
                    {[{ key: 'school', label: 'School Analysis' },
                    { key: 'classes', label: 'Classes & Streams' },
                    { key: 'subject', label: 'Subjects & Departments' },
                    { key: 'trs', label: 'Teachers' },
                    { key: 'gender', label: 'Gender & Demographics' },
                    { key: 'individual', label: 'Students & Lists' }].map(tab => (
                        <button key={tab.key} onClick={() => setAnalyticsTab(tab.key as any)} className={`analytics-tab ${analyticsTab === tab.key ? 'active' : ''}`}>{tab.label}</button>
                    ))}
                </div>

                <div className="alert alert-info mb-6 flex items-start gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <Database size={24} className="text-blue-600 mt-1" />
                    <div>
                        <h4 className="text-blue-800 font-bold mb-1">Database Snapshot Active (Notice to Exam Officers)</h4>
                        <p className="text-sm text-blue-700">
                            This multi-level analytics engine is directly linked to the immutable <strong>exam_analytics_snapshots</strong>
                            table within your school's secure database. These insights are structurally isolated and locked
                            at the exact time the exam is published, ensuring that structural data modifications over time do not alter
                            historical report performance, guaranteeing decision-support integrity.
                        </p>
                    </div>
                </div>

                <div className="analytics-body">
                    {!analytics || analytics.examResults.length === 0 ? (
                        <div className="empty-state card"><h3>No results yet</h3><p>Enter marks first, then analytics will populate here.</p></div>
                    ) : (
                        <>
                            {analyticsTab === 'school' && (
                                <>
                                    <div className="analytics-kpi-grid">
                                        <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">School Mean</span><div className="kpi-icon bg-blue-100 text-blue-600"><BarChart3 size={18} /></div></div><div className="kpi-value">{analytics.overallMean.toFixed(2)}</div><div className="kpi-sub">Out of 100</div></div>
                                        <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">Pass Rate</span><div className="kpi-icon bg-green-100 text-green-600"><CheckCircle size={18} /></div></div><div className="kpi-value">{analytics.passRate.toFixed(1)}%</div><div className="kpi-sub">Achieved pass mark</div></div>
                                        <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">Completion</span><div className="kpi-icon bg-orange-100 text-orange-600"><FileText size={18} /></div></div><div className="kpi-value">{analytics.completion}%</div><div className="kpi-sub">{analytics.examResults.length} marks keyed</div></div>
                                        <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">Distinction Rate</span><div className="kpi-icon bg-purple-100 text-purple-600"><Sparkles size={18} /></div></div><div className="kpi-value">{analytics.distinctionRate.toFixed(1)}%</div><div className="kpi-sub">80 marks and above</div></div>
                                    </div>

                                    <div className="super-chart-grid">
                                        <div className="panel">
                                            <div className="panel-title">Grade Share Pie Chart</div>
                                            <div className="super-chart-split">
                                                {renderDonut(gradePie, String(gradeTotal), 'entries')}
                                                <div className="exam-pie-legend">
                                                    {Object.entries(analytics.gradeCounts).map(([grade, count], index) => (
                                                        <span key={grade}><i style={{ background: colors[index % colors.length] }} /> Grade {grade}: <strong>{gradeTotal ? ((count / gradeTotal) * 100).toFixed(1) : 0}%</strong></span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Performance Trend Snapshot</div>
                                            {renderLine(trendPoints, ['Mean', 'Pass', 'Dist.', 'Done'])}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Pass vs Fail</div>
                                            {renderBars([
                                                { label: 'Pass', value: analytics.passRate },
                                                { label: 'Fail', value: analytics.failRate },
                                                { label: 'Distinction', value: analytics.distinctionRate },
                                            ], item => item.label, item => item.value, '%')}
                                        </div>
                                    </div>

                                    <div className="analytics-grid">
                                        <div className="panel">
                                            <div className="panel-title"><BarChart3 className="panel-title-icon" size={20} /> Subject Performance</div>
                                            <div className="vertical-chart">
                                                {analytics.subjectsRanked.slice(0, 8).map((subject, index) => (
                                                    <div className="v-bar-group" key={subject.id}>
                                                        <div className="v-bar" style={{ height: `${Math.max((subject.mean / maxSubjectMean) * 100, 10)}%`, background: colors[index % colors.length] }} />
                                                        <span className="v-bar-label">{subject.name.substring(0, 4)}.</span>
                                                        <div className="v-bar-tooltip">{subject.name}: {subject.mean.toFixed(1)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title"><BookOpen className="panel-title-icon" size={20} /> Grade Distribution</div>
                                            {Object.entries(analytics.gradeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([grade, count], index) => {
                                                const percent = Math.round((count / Math.max(gradeTotal, 1)) * 100);
                                                return (
                                                    <div className="dist-item" key={grade}>
                                                        <div className="dist-item-header"><span>Grade {grade}</span><span>{count} ({percent}%)</span></div>
                                                        <div className="dist-item-bar"><div className="dist-item-fill" style={{ width: `${percent}%`, background: colors[index % colors.length] }} /></div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="panel mb-6">
                                        <div className="panel-title">Marks Entry Coverage by Class and Subject</div>
                                        <div className="table-wrapper">
                                            <table className="data-table">
                                                <thead><tr><th>Class</th><th>Subject</th><th>Keyed</th><th>Remaining</th><th>Progress</th></tr></thead>
                                                <tbody>
                                                    {analytics.coverage.filter(row => row.remaining > 0 || row.percent < 100).slice(0, 5).map(row => (
                                                        <tr key={`${row.classId}-${row.subjectId}`}>
                                                            <td><strong>{row.className}</strong></td>
                                                            <td>{row.subjectName}</td>
                                                            <td>{row.keyed} / {row.expected}</td>
                                                            <td>{row.remaining}</td>
                                                            <td><div className="dist-item-bar" style={{ width: 100, height: 6, marginTop: 6 }}><div className="dist-item-fill" style={{ width: `${row.percent}%`, background: row.percent === 100 ? 'var(--success)' : 'var(--warning)' }} /></div></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="analytics-grid">
                                        <div className="panel">
                                            <div className="panel-title">Decision Summary</div>
                                            <div className="table-wrapper"><table className="data-table"><tbody>
                                                <tr><td>Previous Exam</td><td><strong>{analytics.previousExamName}</strong></td></tr>
                                                <tr><td>Best Subject Overall</td><td><strong>{analytics.bestSubject}</strong></td></tr>
                                                <tr><td>Most Difficult Subject</td><td><strong>{analytics.mostDifficultSubject}</strong></td></tr>
                                                <tr><td>Best Performing Class</td><td><strong>{analytics.bestClass}</strong></td></tr>
                                                <tr><td>Lowest Performing Class</td><td><strong>{analytics.lowestClass}</strong></td></tr>
                                                <tr><td>Best Department</td><td><strong>{analytics.bestDepartment}</strong></td></tr>
                                                <tr><td>Lowest Department</td><td><strong>{analytics.lowestDepartment}</strong></td></tr>
                                            </tbody></table></div>
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Joint School Analysis</div>
                                            <div className="table-wrapper"><table className="data-table"><tbody>
                                                {analytics.jointAnalysis.map(([metric, value]) => <tr key={metric}><td>{metric}</td><td><strong>{value}</strong></td></tr>)}
                                            </tbody></table></div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {analyticsTab === 'classes' && (
                                <div className="grid" style={{ gap: '1rem' }}>
                                    <div className="super-chart-grid">
                                        <div className="panel">
                                            <div className="panel-title">Class Mean Bar Chart</div>
                                            {renderBars(analytics.classesRanked.slice(0, 10), cls => cls.name, cls => cls.mean)}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Stream Mean Bar Chart</div>
                                            {renderBars(analytics.streamsRanked.slice(0, 10), stream => stream.name, stream => stream.mean)}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Class Improvement Line</div>
                                            {renderLine(analytics.classesRanked.slice(0, 5).map(c => Math.max(Math.min((c.improvement || 0) + 50, 100), 0)), analytics.classesRanked.slice(0, 5).map(c => c.name.substring(0, 6)))}
                                        </div>
                                    </div>
                                    <div className="analytics-grid">
                                        <div className="panel">
                                            <div className="panel-title">Class Performance Ranking</div>
                                            <div className="mini-leaderboard">
                                                {analytics.classesRanked.map((cls, index) => (
                                                    <div className="mini-lead-row" key={cls.id}>
                                                        <div className="mini-lead-left">
                                                            <div className={`mini-lead-rank ${index < 3 ? `top-${index + 1}` : ''}`}>{index + 1}</div>
                                                            <div><div className="mini-lead-name">{cls.name}</div><div className="mini-lead-sub">{cls.studentCount} candidates</div></div>
                                                        </div>
                                                        <div className="mini-lead-score">{cls.mean.toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Stream Averages (Level 7)</div>
                                            {analytics.streamsRanked.length ? (
                                                <div className="mini-leaderboard">
                                                    {analytics.streamsRanked.map(stream => (
                                                        <div className="mini-lead-row" key={stream.id}>
                                                            <div className="mini-lead-left"><div className="mini-lead-name">{stream.name}</div><div className="mini-lead-sub">{stream.count} entries</div></div>
                                                            <div className="mini-lead-score">{stream.mean.toFixed(2)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <div className="text-muted text-sm">No streams configured.</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analyticsTab === 'subject' && (
                                <div className="grid" style={{ gap: '1rem' }}>
                                    <div className="super-chart-grid">
                                        <div className="panel">
                                            <div className="panel-title">Subject Mean Bar Chart</div>
                                            {renderBars(analytics.subjectsRanked.slice(0, 10), s => s.name, s => s.mean)}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Subject Pass Rate Chart</div>
                                            {renderBars(analytics.subjectsRanked.slice(0, 10), s => s.name, s => s.count ? (s.passes / s.count) * 100 : 0, '%')}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Department Mean Chart</div>
                                            {renderBars(analytics.departmentsRanked.slice(0, 8), d => d.name, d => d.mean)}
                                        </div>
                                    </div>
                                    <div className="analytics-grid">
                                        <div className="panel">
                                            <div className="panel-title">Full Subject Analysis (Level 4)</div>
                                            <div className="table-wrapper"><table className="data-table text-sm"><thead><tr><th>Subject</th><th>Mean</th><th>Median</th><th>Mode</th><th>Std Dev</th><th>High/Low</th><th>Pass Rate</th><th>Teacher</th></tr></thead><tbody>
                                                {analytics.subjectsRanked.map(s => (
                                                    <tr key={s.id}>
                                                        <td><strong>{s.name}</strong></td>
                                                        <td>{s.mean.toFixed(2)}</td>
                                                        <td>{s.median.toFixed(1)}</td>
                                                        <td>{s.mode}</td>
                                                        <td>{s.standardDeviation.toFixed(1)}</td>
                                                        <td><span className="text-success">{s.highest.toFixed(0)}</span> / <span className="text-danger">{s.lowest === 101 ? '-' : s.lowest.toFixed(0)}</span></td>
                                                        <td>{s.count ? ((s.passes / s.count) * 100).toFixed(0) : 0}%</td>
                                                        <td>{s.teachers}</td>
                                                    </tr>
                                                ))}
                                            </tbody></table></div>
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Department Analysis (Level 3)</div>
                                            {analytics.departmentsRanked.length ? (
                                                <div className="mini-leaderboard">
                                                    {analytics.departmentsRanked.map(dept => (
                                                        <div className="mini-lead-row" key={dept.id}>
                                                            <div className="mini-lead-left"><div className="mini-lead-name">{dept.name}</div></div>
                                                            <div className="mini-lead-score">{dept.mean.toFixed(2)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <div className="text-muted text-sm">Departments not configured or mapped to subjects.</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analyticsTab === 'trs' && (
                                <div className="grid" style={{ gap: '1rem' }}>
                                    <div className="super-chart-grid">
                                        <div className="panel">
                                            <div className="panel-title">Teacher Mean Chart</div>
                                            {renderBars(analytics.teachersRanked.slice(0, 10), t => t.name, t => t.mean)}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Teacher Pass Rate Chart</div>
                                            {renderBars(analytics.teachersRanked.slice(0, 10), t => t.name, t => t.count ? (t.passes / t.count) * 100 : 0, '%')}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Teacher Distinction Chart</div>
                                            {renderBars(analytics.teachersRanked.slice(0, 10), t => t.name, t => t.count ? (t.distinctions / t.count) * 100 : 0, '%')}
                                        </div>
                                    </div>
                                    <div className="panel">
                                        <div className="panel-title">Teacher Value Add (Level 5)</div>
                                        {analytics.teachersRanked.length ? (
                                            <div className="table-wrapper"><table className="data-table"><thead><tr><th>Teacher</th><th>Candidates</th><th>Mean Score</th><th>Pass Rate</th><th>Distinction Rate</th><th>Improvement</th><th>Recognition</th></tr></thead><tbody>
                                                {analytics.teachersRanked.map(t => (
                                                    <tr key={t.id}>
                                                        <td><strong>{t.name}</strong></td>
                                                        <td>{t.count}</td>
                                                        <td><strong>{t.mean.toFixed(2)}</strong></td>
                                                        <td>{t.count ? ((t.passes / t.count) * 100).toFixed(0) : 0}%</td>
                                                        <td>{t.count ? ((t.distinctions / t.count) * 100).toFixed(0) : 0}%</td>
                                                        <td>{t.improvement === null ? 'N/A' : t.improvement.toFixed(1)}</td>
                                                        <td>{analytics.teachersRanked[0]?.id === t.id ? 'Best Teacher' : analytics.mostImprovedTeachers[0]?.id === t.id ? 'Most Improved' : 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody></table></div>
                                        ) : <div className="text-muted text-sm">No teacher associations found in current results. Ensure teachers are assigned when marks are logged.</div>}
                                    </div>
                                </div>
                            )}

                            {analyticsTab === 'gender' && (
                                <div className="grid" style={{ gap: '1rem' }}>
                                    <div className="super-chart-grid">
                                        <div className="panel">
                                            <div className="panel-title">Gender Entry Pie Chart</div>
                                            <div className="super-chart-split">
                                                {renderDonut(genderPie, String(genderTotal || 'N/A'), 'entries')}
                                                <div className="exam-pie-legend">
                                                    <span><i style={{ background: '#3b82f6' }} /> Boys: <strong>{genderTotal ? ((analytics.genderResults.boysCount / genderTotal) * 100).toFixed(1) : 'N/A'}%</strong></span>
                                                    <span><i style={{ background: '#ec4899' }} /> Girls: <strong>{genderTotal ? ((analytics.genderResults.girlsCount / genderTotal) * 100).toFixed(1) : 'N/A'}%</strong></span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Gender Mean Comparison</div>
                                            {renderBars([
                                                { label: 'Boys', value: analytics.genderResults.boysMean },
                                                { label: 'Girls', value: analytics.genderResults.girlsMean },
                                            ], item => item.label, item => item.value)}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Gender Pass Rate Comparison</div>
                                            {renderBars([
                                                { label: 'Boys', value: analytics.genderResults.boysPassRate },
                                                { label: 'Girls', value: analytics.genderResults.girlsPassRate },
                                            ], item => item.label, item => item.value, '%')}
                                        </div>
                                    </div>
                                    <div className="analytics-grid">
                                        <div className="panel">
                                            <div className="panel-title">Gender Analysis (Level 9)</div>
                                            <div className="flex gap-4">
                                                <div className="flex-1 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                    <h4 className="text-blue-800 font-semibold mb-2">Boys</h4>
                                                    <div className="text-2xl font-bold text-blue-900 mb-1">{analytics.genderResults.boysMean.toFixed(2)} <span className="text-xs text-blue-600 font-normal">mean</span></div>
                                                    <div className="text-sm text-blue-700">{analytics.genderResults.boysPassRate.toFixed(1)}% pass rate</div>
                                                    <div className="text-xs text-blue-500 mt-2">{analytics.genderResults.boysCount} entries</div>
                                                </div>
                                                <div className="flex-1 bg-pink-50 p-4 rounded-lg border border-pink-100">
                                                    <h4 className="text-pink-800 font-semibold mb-2">Girls</h4>
                                                    <div className="text-2xl font-bold text-pink-900 mb-1">{analytics.genderResults.girlsMean.toFixed(2)} <span className="text-xs text-pink-600 font-normal">mean</span></div>
                                                    <div className="text-sm text-pink-700">{analytics.genderResults.girlsPassRate.toFixed(1)}% pass rate</div>
                                                    <div className="text-xs text-pink-500 mt-2">{analytics.genderResults.girlsCount} entries</div>
                                                </div>
                                            </div>
                                            <div className="table-wrapper mt-4"><table className="data-table"><tbody>
                                                <tr><td>Best Boy</td><td><strong>{analytics.genderResults.bestBoy}</strong></td></tr>
                                                <tr><td>Best Girl</td><td><strong>{analytics.genderResults.bestGirl}</strong></td></tr>
                                                <tr><td>Top 10 Boys</td><td>{analytics.genderResults.topBoys.length ? analytics.genderResults.topBoys.map(s => s.name).join(', ') : 'N/A'}</td></tr>
                                                <tr><td>Top 10 Girls</td><td>{analytics.genderResults.topGirls.length ? analytics.genderResults.topGirls.map(s => s.name).join(', ') : 'N/A'}</td></tr>
                                            </tbody></table></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analyticsTab === 'individual' && (
                                <div className="grid" style={{ gap: '1rem' }}>
                                    <div className="super-chart-grid">
                                        <div className="panel">
                                            <div className="panel-title">Top Students Mean Chart</div>
                                            {renderBars(analytics.topStudents.slice(0, 10), s => s.name, s => s.mean)}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Improvement / Decline Movement</div>
                                            {renderBars(movementItems.slice(0, 10), item => item.label, item => item.value)}
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Special List Percentages</div>
                                            {renderBars([
                                                { label: 'All Passes', value: analytics.ranked.length ? (analytics.allPassStudents.length / analytics.ranked.length) * 100 : 0 },
                                                { label: 'At Risk', value: analytics.ranked.length ? (analytics.atRiskStudents.length / analytics.ranked.length) * 100 : 0 },
                                                { label: 'Straight A', value: analytics.ranked.length ? (analytics.straightAStudents.length / analytics.ranked.length) * 100 : 0 },
                                                { label: 'Failing 2+', value: analytics.ranked.length ? (analytics.failingMultipleSubjects.length / analytics.ranked.length) * 100 : 0 },
                                            ], item => item.label, item => item.value, '%')}
                                        </div>
                                    </div>
                                    <div className="panel">
                                        <div className="panel-title">Top 100 Students (Level 8 & 13)</div>
                                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Rank</th><th>Student</th><th>Class</th><th>Total Marks</th><th>Mean Score</th><th>Passes</th><th>Improvement</th><th>Grade</th></tr></thead><tbody>
                                        {analytics.topStudents.map((s, i) => {
                                            const gs = getGrade(s.mean);
                                            return <tr key={s.id}><td><strong className={i < 3 ? 'text-success' : ''}>{i + 1}</strong></td><td><strong>{s.name}</strong></td><td>{s.className}</td><td>{s.total.toFixed(0)}</td><td>{s.mean.toFixed(2)}</td><td>{s.passes}/{s.count}</td><td>{s.improvement === null ? 'N/A' : s.improvement.toFixed(1)}</td><td>{gs ? <span className="badge badge-green">{gs.grade}</span> : 'N/A'}</td></tr>;
                                        })}
                                        </tbody></table></div>
                                    </div>
                                    <div className="analytics-grid">
                                        <div className="panel">
                                            <div className="panel-title">Improvement Analysis</div>
                                            <div className="table-wrapper"><table className="data-table"><tbody>
                                                <tr><td>Most Improved Student</td><td><strong>{analytics.mostImprovedStudents[0]?.name || 'N/A'}</strong></td></tr>
                                                <tr><td>Most Improved Class</td><td><strong>{analytics.mostImprovedClasses[0]?.name || 'N/A'}</strong></td></tr>
                                                <tr><td>Most Improved Subject</td><td><strong>{analytics.mostImprovedSubjects[0]?.name || 'N/A'}</strong></td></tr>
                                                <tr><td>Most Improved Teacher</td><td><strong>{analytics.mostImprovedTeachers[0]?.name || 'N/A'}</strong></td></tr>
                                                <tr><td>Biggest Decline Student</td><td><strong>{analytics.biggestDeclineStudents[0]?.name || 'N/A'}</strong></td></tr>
                                            </tbody></table></div>
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Special Lists</div>
                                            <div className="table-wrapper"><table className="data-table"><tbody>
                                                <tr><td>Straight A</td><td>{analytics.straightAStudents.length || 'N/A'}</td></tr>
                                                <tr><td>All Passes</td><td>{analytics.allPassStudents.length || 'N/A'}</td></tr>
                                                <tr><td>Failing Multiple Subjects</td><td>{analytics.failingMultipleSubjects.length || 'N/A'}</td></tr>
                                                <tr><td>At-Risk Students</td><td>{analytics.atRiskStudents.length || 'N/A'}</td></tr>
                                                <tr><td>Bottom 100 Available</td><td>{analytics.bottomStudents.length || 'N/A'}</td></tr>
                                            </tbody></table></div>
                                        </div>
                                    </div>
                                    <div className="analytics-grid">
                                        <div className="panel">
                                            <div className="panel-title">Target Analysis</div>
                                            <div className="table-wrapper"><table className="data-table"><tbody>{analytics.targetAnalysis.map(([metric, value]) => <tr key={metric}><td>{metric}</td><td><strong>{value}</strong></td></tr>)}</tbody></table></div>
                                        </div>
                                        <div className="panel">
                                            <div className="panel-title">Attendance Analysis</div>
                                            <div className="table-wrapper"><table className="data-table"><tbody>{analytics.attendanceAnalysis.map(([metric, value]) => <tr key={metric}><td>{metric}</td><td><strong>{value}</strong></td></tr>)}</tbody></table></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </>
        );
    };

    const handleDownloadAdvancedAnalytics = async () => {
        if (!dlExam) {
            toast.error('Select an exam');
            return;
        }
        setAnalyticsDownloading(true);
        try {
            const analytics = buildAdvancedAnalytics(dlExam);
            let filtered = analytics.examResults;
            if (dlScope === 'class' && dlClass) filtered = filtered.filter(r => r.class_id === dlClass);
            if (dlScope === 'individual' && dlStudent) filtered = filtered.filter(r => r.student_id === dlStudent);
            if (dlScope === 'subject' && dlSubject) filtered = filtered.filter(r => r.subject_id === dlSubject);
            if (filtered.length === 0) {
                toast.error('No results found for this criteria');
                setAnalyticsDownloading(false);
                return;
            }

            const rows = filtered.map(r => [
                `${r.students?.first_name || ''} ${r.students?.last_name || ''}`.trim(),
                r.students?.admission_number || '',
                r.students?.classes?.name || classes.find(c => c.id === r.class_id)?.name || '',
                r.subjects?.name || '',
                String(r.marks || 0),
                r.grade || '',
            ]);

            if (dlFormat === 'csv') {
                const ws = XLSX.utils.aoa_to_sheet([['Student', 'Adm No.', 'Class', 'Subject', 'Marks', 'Grade'], ...rows]);
                const csv = XLSX.utils.sheet_to_csv(ws);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `exam_analytics_${dlScope}_${Date.now()}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                toast.success('Analytics CSV downloaded');
            } else {
                const examName = exams.find(ex => ex.id === dlExam)?.name || 'Exam';
                const doc = await createPdfWithHeader({
                    title: 'Super Analytics Decision Report',
                    subtitle: `${examName} | Mean ${analytics.overallMean.toFixed(1)} | Completion ${analytics.completion}%`,
                    schoolName: school?.name || 'School',
                    schoolMotto: school?.motto,
                    logoUrl: school?.logo_url,
                    watermarkUrl: school?.watermark_url,
                    orientation: 'landscape',
                });
                const nextY = () => ((doc as any).lastAutoTable?.finalY || (doc as any).__contentStartY || 40) + 8;
                const fallbackRows = (rows: any[][], cols: number) => rows.length ? rows : [Array.from({ length: cols }, (_, i) => i === 0 ? 'N/A' : '')];
                addTableToPdf(doc, ['Metric', 'Value'], [
                    ['School Mean', analytics.overallMean.toFixed(1)],
                    ['School Mean Grade', getGrade(analytics.overallMean)?.grade || 'N/A'],
                    ['Pass Rate', `${analytics.passRate.toFixed(1)}%`],
                    ['Fail Rate', `${analytics.failRate.toFixed(1)}%`],
                    ['Distinction Rate', `${analytics.distinctionRate.toFixed(1)}%`],
                    ['Marks Entered', String(analytics.examResults.length)],
                    ['Expected Rows', String(analytics.expectedRows)],
                    ['Completion', `${analytics.completion}%`],
                    ['Top Student', analytics.ranked[0]?.name || 'N/A'],
                    ['Bottom Student', analytics.bottomStudents[0]?.name || 'N/A'],
                    ['Best Subject Overall', analytics.bestSubject],
                    ['Most Difficult Subject', analytics.mostDifficultSubject],
                    ['Best Class', analytics.bestClass],
                    ['Lowest Class', analytics.lowestClass],
                    ['Best Department', analytics.bestDepartment],
                    ['Lowest Department', analytics.lowestDepartment],
                    ['Previous Exam Comparison', analytics.previousExamName],
                ]);
                addTableToPdf(doc, ['Joint School Metric', 'Value'], analytics.jointAnalysis, nextY());
                addTableToPdf(doc, ['Grade', 'Count', 'Percentage'], Object.entries(analytics.gradeCounts).map(([grade, count]) => [grade, String(count), `${((count / Math.max(analytics.examResults.length, 1)) * 100).toFixed(1)}%`]), nextY());
                addTableToPdf(doc, ['Subject', 'Mean', 'Median', 'Mode', 'Std Dev', 'Range', 'Highest', 'Lowest', 'Pass Rate', 'Teacher'], fallbackRows(analytics.subjectsRanked.map(s => [s.name, s.mean.toFixed(1), s.median.toFixed(1), s.mode, s.standardDeviation.toFixed(1), s.range.toFixed(1), String(s.highest), s.lowest === 101 ? 'N/A' : String(s.lowest), `${s.count ? ((s.passes / s.count) * 100).toFixed(1) : 0}%`, s.teachers]), 10), nextY());
                addTableToPdf(doc, ['Department', 'Mean', 'Entries', 'Pass Rate'], fallbackRows(analytics.departmentsRanked.map(d => [d.name, d.mean.toFixed(1), String(d.count), `${d.count ? ((d.passes / d.count) * 100).toFixed(1) : 0}%`]), 4), nextY());
                addTableToPdf(doc, ['Teacher', 'Candidates', 'Mean', 'Pass Rate', 'Distinction Rate', 'Improvement', 'Recognition'], fallbackRows(analytics.teachersRanked.map(t => [t.name, String(t.count), t.mean.toFixed(1), `${t.count ? ((t.passes / t.count) * 100).toFixed(1) : 0}%`, `${t.count ? ((t.distinctions / t.count) * 100).toFixed(1) : 0}%`, t.improvement === null ? 'N/A' : t.improvement.toFixed(1), analytics.teachersRanked[0]?.id === t.id ? 'Best Teacher' : analytics.mostImprovedTeachers[0]?.id === t.id ? 'Most Improved' : 'N/A']), 7), nextY());
                addTableToPdf(doc, ['Class', 'Mean', 'Candidates', 'Pass Rate', 'Improvement'], fallbackRows(analytics.classesRanked.map(c => [c.name, c.mean.toFixed(1), String(c.studentCount), `${c.count ? ((c.passes / c.count) * 100).toFixed(1) : 0}%`, c.improvement === null ? 'N/A' : c.improvement.toFixed(1)]), 5), nextY());
                addTableToPdf(doc, ['Stream', 'Mean', 'Entries', 'Pass Rate'], fallbackRows(analytics.streamsRanked.map(s => [s.name, s.mean.toFixed(1), String(s.count), `${s.count ? ((s.passes / s.count) * 100).toFixed(1) : 0}%`]), 4), nextY());
                addTableToPdf(doc, ['Gender Metric', 'Value'], [
                    ['Boys Mean', analytics.genderResults.boysCount ? analytics.genderResults.boysMean.toFixed(1) : 'N/A'],
                    ['Girls Mean', analytics.genderResults.girlsCount ? analytics.genderResults.girlsMean.toFixed(1) : 'N/A'],
                    ['Best Boy', analytics.genderResults.bestBoy],
                    ['Best Girl', analytics.genderResults.bestGirl],
                    ['Top 10 Boys', analytics.genderResults.topBoys.length ? analytics.genderResults.topBoys.map(s => s.name).join(', ') : 'N/A'],
                    ['Top 10 Girls', analytics.genderResults.topGirls.length ? analytics.genderResults.topGirls.map(s => s.name).join(', ') : 'N/A'],
                ], nextY());
                addTableToPdf(doc, ['Rank', 'Student', 'Class', 'Total', 'Mean', 'Grade', 'Improvement'], fallbackRows(analytics.topStudents.map((s, i) => [String(i + 1), s.name, s.className, s.total.toFixed(0), s.mean.toFixed(1), getGrade(s.mean)?.grade || 'N/A', s.improvement === null ? 'N/A' : s.improvement.toFixed(1)]), 7), nextY());
                addTableToPdf(doc, ['Rank', 'Student', 'Class', 'Total', 'Mean', 'Grade'], fallbackRows(analytics.bottomStudents.map((s, i) => [String(i + 1), s.name, s.className, s.total.toFixed(0), s.mean.toFixed(1), getGrade(s.mean)?.grade || 'N/A']), 6), nextY());
                addTableToPdf(doc, ['Improvement Metric', 'Value'], [
                    ['Most Improved Student', analytics.mostImprovedStudents[0]?.name || 'N/A'],
                    ['Most Improved Class', analytics.mostImprovedClasses[0]?.name || 'N/A'],
                    ['Most Improved Subject', analytics.mostImprovedSubjects[0]?.name || 'N/A'],
                    ['Most Improved Teacher', analytics.mostImprovedTeachers[0]?.name || 'N/A'],
                    ['Most Improved Stream', 'N/A'],
                    ['Most Improved Department', 'N/A'],
                    ['Most Improved School (Joint)', 'N/A'],
                    ['Biggest Decline Student', analytics.biggestDeclineStudents[0]?.name || 'N/A'],
                    ['Biggest Decline Class', analytics.mostImprovedClasses.slice().sort((a, b) => (a.improvement || 0) - (b.improvement || 0))[0]?.name || 'N/A'],
                ], nextY());
                addTableToPdf(doc, ['Target Metric', 'Value'], analytics.targetAnalysis, nextY());
                addTableToPdf(doc, ['Attendance Metric', 'Value'], analytics.attendanceAnalysis, nextY());
                addTableToPdf(doc, ['Special List', 'Value'], [
                    ['Top 10', analytics.topStudents.slice(0, 10).map(s => s.name).join(', ') || 'N/A'],
                    ['Top 50 Count', String(analytics.topStudents.slice(0, 50).length || 'N/A')],
                    ['Top 100 Count', String(analytics.topStudents.length || 'N/A')],
                    ['Bottom 10', analytics.bottomStudents.slice(0, 10).map(s => s.name).join(', ') || 'N/A'],
                    ['Straight A Students', analytics.straightAStudents.map(s => s.name).join(', ') || 'N/A'],
                    ['All Passes', analytics.allPassStudents.map(s => s.name).join(', ') || 'N/A'],
                    ['Failing Multiple Subjects', analytics.failingMultipleSubjects.map(s => s.name).join(', ') || 'N/A'],
                    ['Perfect Attendance + High Performance', 'N/A'],
                    ['At-Risk Students', analytics.atRiskStudents.map(s => s.name).join(', ') || 'N/A'],
                ], nextY());
                addTableToPdf(doc, ['Student', 'Adm No.', 'Class', 'Subject', 'Marks', 'Grade'], rows.slice(0, 120), nextY());
                downloadPdf(doc, `super_analytics_${dlScope}_${Date.now()}`);
                toast.success('Super analytics PDF downloaded');
            }
        } catch (err: any) {
            toast.error('Download failed: ' + err.message);
        }
        setAnalyticsDownloading(false);
    };

    const renderAdvancedDownload = () => {
        const analytics = dlExam ? buildAdvancedAnalytics(dlExam) : null;
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
        const classMeans = analytics?.classesRanked.slice(0, 4) || [];
        const totalGrades = Object.values(analytics?.gradeCounts || {}).reduce((sum, count) => sum + count, 0);
        let pieStart = 0;
        const gradePie = Object.entries(analytics?.gradeCounts || {}).map(([_, count], index) => {
            const slice = totalGrades ? (count / totalGrades) * 100 : 0;
            const segment = `${colors[index % colors.length]} ${pieStart}% ${pieStart + slice}%`;
            pieStart += slice;
            return segment;
        }).join(', ');

        return (
            <div className="grid" style={{ gap: '1rem' }}>
                <div className="card">
                    <h3 className="card-title mb-4">Examination Analytics Download Centre</h3>
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
                        <div className="form-group">
                            <label className="form-label">Format</label>
                            <select className="form-select" value={dlFormat} onChange={e => setDlFormat(e.target.value as any)}>
                                <option value="pdf">PDF Report</option>
                                <option value="csv">CSV Data</option>
                            </select>
                        </div>
                        {dlScope === 'class' && <div className="form-group"><label className="form-label">Select Class</label><select className="form-select" value={dlClass} onChange={e => setDlClass(e.target.value)}><option value="">Select Class...</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
                        {dlScope === 'individual' && <div className="form-group"><label className="form-label">Select Student</label><select className="form-select" value={dlStudent} onChange={e => setDlStudent(e.target.value)}><option value="">Select Student...</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>}
                        {dlScope === 'subject' && <div className="form-group"><label className="form-label">Select Subject</label><select className="form-select" value={dlSubject} onChange={e => setDlSubject(e.target.value)}><option value="">Select Subject...</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
                    </div>
                    <button className="btn btn-primary" onClick={handleDownloadAdvancedAnalytics} disabled={!dlExam || analyticsDownloading}>
                        {analyticsDownloading ? <span className="spinner" /> : <><Download size={18} /> Download {dlFormat.toUpperCase()}</>}
                    </button>
                </div>

                {analytics && (
                    <div className="exam-download-preview">
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Download Preview</h3></div>
                            <div className="grid-3">
                                <div className="exam-preview-metric"><span>School Mean</span><strong>{analytics.overallMean.toFixed(1)}</strong></div>
                                <div className="exam-preview-metric"><span>Completion</span><strong>{analytics.completion}%</strong></div>
                                <div className="exam-preview-metric"><span>Rows</span><strong>{analytics.examResults.length}</strong></div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Grade Mix</h3></div>
                            <div className="exam-pie-layout">
                                <div className="exam-pie small" style={{ background: `conic-gradient(${gradePie || '#e5e7eb 0% 100%'})` }} />
                                <div className="exam-pie-legend">{Object.entries(analytics.gradeCounts).map(([grade, count], index) => <span key={grade}><i style={{ background: colors[index % colors.length] }} /> {grade}: <strong>{count}</strong></span>)}</div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Top Classes</h3></div>
                            <div className="exam-bars">
                                {classMeans.map((cls, index) => <div className="exam-bar-row" key={cls.id}><span>{cls.name}</span><div><i style={{ width: `${cls.mean}%`, background: colors[index % colors.length] }} /></div><strong>{cls.mean.toFixed(1)}</strong></div>)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    void renderAnalytics;
    void renderDownload;

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Examinations</h1>
                    <p className="page-subtitle">Manage exams, enter marks, view analytics</p>
                </div>
                <HelpIcon section="examinations" />
            </div>

            {/* Internal Tab Navigation */}
            <div className="card mb-4" style={{ padding: '0.5rem 1rem' }}>
                <div className="flex gap-1" style={{ overflowX: 'auto' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            className={`btn btn-sm ${tab.key === 'super-analytics' ? 'btn-super-analytics' : activeTab === tab.key ? 'btn-primary' : 'btn-ghost'} ${tab.key === 'super-analytics' && activeTab === tab.key ? 'active' : ''}`}
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
                    {activeTab === 'super-analytics' && renderAdvancedAnalytics()}
                    {activeTab === 'download' && renderAdvancedDownload()}
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
