import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
    LayoutDashboard, Settings, FileText, BarChart3, Download,
    Plus, X, Trash2, Shuffle, BookOpen, CheckCircle, Database
} from 'lucide-react';
import HelpIcon from '../../components/ui/HelpIcon';
import { addTableToPdf, createPdfWithHeader, downloadPdf } from '../../lib/pdf';

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
        const [exRes, etRes, clRes, subRes, stuRes, gsRes, tRes, ayRes, resRes] = await Promise.all([
            supabase.from('exams').select('*, exam_types(name), terms(name), academic_years(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('exam_types').select('*').eq('school_id', school.id).order('name'),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('subjects').select('*').eq('school_id', school.id).order('name'),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            supabase.from('grade_scales').select('*').eq('school_id', school.id).order('min_marks', { ascending: false }),
            supabase.from('terms').select('*').eq('school_id', school.id).order('term_number'),
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false }),
            supabase.from('exam_results').select('*, students(first_name, last_name, admission_number, class_id, classes(name)), subjects(name), exams(name)').eq('school_id', school.id).limit(10000),
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

        let boysCount = 0, girlsCount = 0;
        let boysMarks = 0, girlsMarks = 0;
        let boysPasses = 0, girlsPasses = 0;
        let totalPasses = 0;

        examResults.forEach(r => {
            const marks = Number(r.marks || 0);
            const student = students.find(s => s.id === r.student_id);
            const isPass = marks >= 40; // Default pass mark 40 for analytics purposes
            const studentName = student ? `${student.first_name} ${student.last_name}`.trim() : 'Unknown';
            const sClass = classes.find(c => c.id === r.class_id);
            const className = sClass?.name || 'Unassigned';
            const streamId = sClass?.stream_id;
            const subject = subjects.find(s => s.id === r.subject_id);
            const subjectName = subject?.name || 'Unknown';
            const deptId = subject?.department_id;
            const gender = student?.gender;

            // Student level
            if (!studentMap[r.student_id]) studentMap[r.student_id] = { id: r.student_id, name: studentName, className, classId: r.class_id, total: 0, count: 0, passes: 0 };
            studentMap[r.student_id].total += marks;
            studentMap[r.student_id].count += 1;
            if (isPass) studentMap[r.student_id].passes += 1;

            // Subject level
            if (!subjectMap[r.subject_id]) subjectMap[r.subject_id] = { id: r.subject_id, name: subjectName, total: 0, count: 0, highest: -1, lowest: 101, passes: 0 };
            subjectMap[r.subject_id].total += marks;
            subjectMap[r.subject_id].count += 1;
            if (marks > subjectMap[r.subject_id].highest) subjectMap[r.subject_id].highest = marks;
            if (marks < subjectMap[r.subject_id].lowest) subjectMap[r.subject_id].lowest = marks;
            if (isPass) subjectMap[r.subject_id].passes += 1;

            // Class level
            if (!classMap[r.class_id]) classMap[r.class_id] = { id: r.class_id, name: className, total: 0, count: 0, students: new Set(), passes: 0 };
            classMap[r.class_id].total += marks;
            classMap[r.class_id].count += 1;
            classMap[r.class_id].students.add(r.student_id);
            if (isPass) classMap[r.class_id].passes += 1;

            // Department level
            if (deptId) {
                if (!departmentMap[deptId]) departmentMap[deptId] = { id: deptId, name: `Dept ${deptId.slice(0, 4)}`, total: 0, count: 0 };
                departmentMap[deptId].total += marks;
                departmentMap[deptId].count += 1;
            }

            // Stream level
            if (streamId) {
                if (!streamMap[streamId]) streamMap[streamId] = { id: streamId, name: `Stream ${streamId.slice(0, 4)}`, total: 0, count: 0 };
                streamMap[streamId].total += marks;
                streamMap[streamId].count += 1;
            }

            // Teacher level
            if (r.teacher_id) {
                if (!teacherMap[r.teacher_id]) teacherMap[r.teacher_id] = { id: r.teacher_id, total: 0, count: 0, passes: 0 };
                teacherMap[r.teacher_id].total += marks;
                teacherMap[r.teacher_id].count += 1;
                if (isPass) teacherMap[r.teacher_id].passes += 1;
            }

            // Gender level
            if (gender === 'male') { boysCount++; boysMarks += marks; if (isPass) boysPasses++; }
            if (gender === 'female') { girlsCount++; girlsMarks += marks; if (isPass) girlsPasses++; }

            if (isPass) totalPasses++;

            const grade = r.grade || getGrade(marks)?.grade || 'Ungraded';
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });

        // Computed Aggregations
        const computeMeans = (mapObj: Record<string, any>) => Object.values(mapObj).map(v => ({ ...v, mean: v.count ? v.total / v.count : 0 })).sort((a, b) => b.mean - a.mean);

        const ranked = computeMeans(studentMap);
        const subjectsRanked = computeMeans(subjectMap);
        const classesRanked = computeMeans(classMap).map(c => ({ ...c, studentCount: c.students.size }));
        const departmentsRanked = computeMeans(departmentMap);
        const streamsRanked = computeMeans(streamMap);
        const teachersRanked = computeMeans(teacherMap);

        const overallMean = examResults.length ? examResults.reduce((sum, r) => sum + Number(r.marks || 0), 0) / examResults.length : 0;
        const passRate = examResults.length ? (totalPasses / examResults.length) * 100 : 0;
        const weakSubjects = subjectsRanked.slice().sort((a, b) => a.mean - b.mean).slice(0, 3);

        const boysMean = boysCount ? boysMarks / boysCount : 0;
        const girlsMean = girlsCount ? girlsMarks / girlsCount : 0;
        const genderResults = {
            boysMean,
            girlsMean,
            boysCount,
            girlsCount,
            boysPassRate: boysCount ? (boysPasses / boysCount) * 100 : 0,
            girlsPassRate: girlsCount ? (girlsPasses / girlsCount) * 100 : 0,
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
            gradeCounts, overallMean, passRate, weakSubjects, coverage, genderResults
        };
    };

    const renderAdvancedAnalytics = () => {
        const analyticsExam = selectedExam || exams[0]?.id || '';
        const analytics = analyticsExam ? buildAdvancedAnalytics(analyticsExam) : null;
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        const maxSubjectMean = Math.max(...(analytics?.subjectsRanked.map(s => s.mean) || [1]), 1);
        const gradeTotal = Object.values(analytics?.gradeCounts || {}).reduce((sum, count) => sum + count, 0);

        return (
            <>
                <div className="flex justify-between items-center mb-4">
                    <div><h3 className="text-lg font-bold">Exam Analytics Command Centre</h3><p className="text-sm text-muted">Advanced multidimensional analytics engine.</p></div>
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
                    { key: 'individual', label: 'Top Students' }].map(tab => (
                        <button key={tab.key} onClick={() => setAnalyticsTab(tab.key as any)} className={`analytics-tab ${analyticsTab === tab.key ? 'active' : ''}`}>{tab.label}</button>
                    ))}
                </div>

                <div className="alert alert-info mb-6 flex items-start gap-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <Database size={24} className="text-blue-600 mt-1" />
                    <div>
                        <h4 className="text-blue-800 font-bold mb-1">Database Snapshot Active (Notice to Exam Officers)</h4>
                        <p className="text-sm text-blue-700">
                            This multi-level analytics engine is directly linked to the immutable <strong>exam_analytics_snapshots</strong>
                            table within your school's secure Supabase database. These insights are structurally isolated and locked
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
                                </>
                            )}

                            {analyticsTab === 'classes' && (
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
                                                        <div className="mini-lead-left"><div className="mini-lead-name">{stream.name}</div></div>
                                                        <div className="mini-lead-score">{stream.mean.toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <div className="text-muted text-sm">No streams configured.</div>}
                                    </div>
                                </div>
                            )}

                            {analyticsTab === 'subject' && (
                                <div className="analytics-grid">
                                    <div className="panel">
                                        <div className="panel-title">Full Subject Analysis (Level 4)</div>
                                        <div className="table-wrapper"><table className="data-table text-sm"><thead><tr><th>Subject</th><th>Mean</th><th>High/Low</th><th>Pass Rate</th></tr></thead><tbody>
                                            {analytics.subjectsRanked.map(s => (
                                                <tr key={s.id}>
                                                    <td><strong>{s.name}</strong></td>
                                                    <td>{s.mean.toFixed(2)}</td>
                                                    <td><span className="text-success">{s.highest.toFixed(0)}</span> / <span className="text-danger">{s.lowest === 101 ? '-' : s.lowest.toFixed(0)}</span></td>
                                                    <td>{s.count ? ((s.passes / s.count) * 100).toFixed(0) : 0}%</td>
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
                            )}

                            {analyticsTab === 'trs' && (
                                <div className="panel">
                                    <div className="panel-title">Teacher Value Add (Level 5)</div>
                                    {analytics.teachersRanked.length ? (
                                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Teacher ID</th><th>Total Marks Keyed</th><th>Candidates</th><th>Mean Score</th><th>Pass Rate</th></tr></thead><tbody>
                                            {analytics.teachersRanked.map(t => (
                                                <tr key={t.id}>
                                                    <td>{t.id.slice(0, 8)}...</td>
                                                    <td>{t.total}</td>
                                                    <td>{t.count}</td>
                                                    <td><strong>{t.mean.toFixed(2)}</strong></td>
                                                    <td>{t.count ? ((t.passes / t.count) * 100).toFixed(0) : 0}%</td>
                                                </tr>
                                            ))}
                                        </tbody></table></div>
                                    ) : <div className="text-muted text-sm">No teacher associations found in current results. Ensure teachers are assigned when marks are logged.</div>}
                                </div>
                            )}

                            {analyticsTab === 'gender' && (
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
                                    </div>
                                </div>
                            )}

                            {analyticsTab === 'individual' && (
                                <div className="panel">
                                    <div className="panel-title">Top 100 Students (Level 8 & 13)</div>
                                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>Rank</th><th>Student</th><th>Class</th><th>Total Marks</th><th>Mean Score</th><th>Passes</th><th>Grade</th></tr></thead><tbody>
                                        {analytics.ranked.slice(0, 100).map((s, i) => {
                                            const gs = getGrade(s.mean);
                                            return <tr key={s.id}><td><strong className={i < 3 ? 'text-success' : ''}>{i + 1}</strong></td><td><strong>{s.name}</strong></td><td>{s.className}</td><td>{s.total.toFixed(0)}</td><td>{s.mean.toFixed(2)}</td><td>{s.passes}/{s.count}</td><td>{gs ? <span className="badge badge-green">{gs.grade}</span> : 'N/A'}</td></tr>;
                                        })}
                                    </tbody></table></div>
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
                    title: 'Examination Analytics Report',
                    subtitle: `${examName} | Mean ${analytics.overallMean.toFixed(1)} | Completion ${analytics.completion}%`,
                    schoolName: school?.name || 'School',
                    schoolMotto: school?.motto,
                    logoUrl: school?.logo_url,
                    watermarkUrl: school?.watermark_url,
                    orientation: 'landscape',
                });
                addTableToPdf(doc, ['Metric', 'Value'], [
                    ['School Mean', analytics.overallMean.toFixed(1)],
                    ['Marks Entered', String(analytics.examResults.length)],
                    ['Expected Rows', String(analytics.expectedRows)],
                    ['Completion', `${analytics.completion}%`],
                    ['Top Student', analytics.ranked[0]?.name || 'N/A'],
                ]);
                addTableToPdf(doc, ['Subject', 'Mean', 'Entries'], analytics.subjectsRanked.map(s => [s.name, s.mean.toFixed(1), String(s.count)]), (doc as any).lastAutoTable.finalY + 8);
                addTableToPdf(doc, ['Student', 'Adm No.', 'Class', 'Subject', 'Marks', 'Grade'], rows.slice(0, 120), (doc as any).lastAutoTable.finalY + 8);
                downloadPdf(doc, `exam_analytics_${dlScope}_${Date.now()}`);
                toast.success('Analytics PDF downloaded');
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
                    {activeTab === 'analytics' && renderAdvancedAnalytics()}
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
