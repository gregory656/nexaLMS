import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CalendarPlus, CheckCircle2, GraduationCap, X } from 'lucide-react';

export default function AcademicYearsPage() {
    const { school } = useAuth();
    const [years, setYears] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: '',
        start_date: '',
        end_date: '',
        promote_students: true,
        graduating_grade_id: '',
        entry_grade_id: '',
    });

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [yrRes, gradeRes, streamRes, classRes] = await Promise.all([
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false }),
            supabase.from('grade_levels').select('*').eq('school_id', school.id).order('level_order'),
            supabase.from('streams').select('*').eq('school_id', school.id).order('name'),
            supabase.from('classes').select('*, grade_levels(id, name, level_order), streams(id, name)').eq('school_id', school.id),
        ]);
        [yrRes.error, gradeRes.error, streamRes.error, classRes.error].filter(Boolean).forEach(error => toast.error(error!.message));
        setYears(yrRes.data || []);
        setGrades(gradeRes.data || []);
        setStreams(streamRes.data || []);
        setClasses(classRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const getGradeRank = (grade: any) => {
        const digits = String(grade?.name || '').match(/\d+/g)?.map(Number) || [];
        return digits.length ? Math.max(...digits) : Number(grade?.level_order || 0);
    };

    const sortedByDetectedRank = useMemo(
        () => [...grades].sort((a, b) => getGradeRank(a) - getGradeRank(b) || a.level_order - b.level_order),
        [grades]
    );

    const currentYear = useMemo(() => years.find(y => y.is_current) || years[0], [years]);
    const smallestGrade = sortedByDetectedRank[0] || grades[0];
    const biggestGrade = sortedByDetectedRank[sortedByDetectedRank.length - 1] || grades[grades.length - 1];

    const openModal = () => {
        const base = currentYear?.name?.match(/\d{4}/)?.[0];
        const next = base ? Number(base) + 1 : new Date().getFullYear();
        setForm({
            name: `${next}/${next + 1}`,
            start_date: `${next}-01-01`,
            end_date: `${next}-12-31`,
            promote_students: true,
            graduating_grade_id: biggestGrade?.id || '',
            entry_grade_id: smallestGrade?.id || '',
        });
        setShowModal(true);
    };

    const ensureClassesForYear = async (academicYearId: string) => {
        const inserted: any[] = [];
        for (const grade of grades) {
            for (const stream of streams) {
                const existing = classes.find(c =>
                    c.academic_year_id === academicYearId &&
                    c.grade_level_id === grade.id &&
                    c.stream_id === stream.id
                );
                if (existing) {
                    inserted.push(existing);
                    continue;
                }
                const { data, error } = await supabase.from('classes').insert({
                    school_id: school!.id,
                    academic_year_id: academicYearId,
                    grade_level_id: grade.id,
                    stream_id: stream.id,
                    name: `${grade.name} ${stream.name}`.trim(),
                }).select('*, grade_levels(id, name, level_order), streams(id, name)').single();
                if (error) throw error;
                inserted.push(data);
            }
        }
        return inserted;
    };

    const promoteStudents = async (newClasses: any[]) => {
        if (!currentYear?.id || grades.length === 0) return { promoted: 0, alumni: 0 };
        const graduatingGradeId = form.graduating_grade_id || biggestGrade?.id;

        const { data: students, error } = await supabase
            .from('students')
            .select('*, classes(id, name, grade_level_id, stream_id, academic_year_id, grade_levels(level_order, name), streams(name))')
            .eq('school_id', school!.id)
            .eq('status', 'active');
        if (error) throw error;

        let promoted = 0;
        let alumni = 0;

        for (const student of students || []) {
            const currentClass = student.classes;
            if (!currentClass || currentClass.academic_year_id !== currentYear.id) continue;

            const currentOrder = currentClass.grade_levels?.level_order;
            const nextGrade = grades.find(g => g.level_order === currentOrder + 1);

            if (currentClass.grade_level_id === graduatingGradeId || !nextGrade) {
                const { error: alumniError } = await supabase.from('alumni').insert({
                    school_id: school!.id,
                    academic_year_id: currentYear.id,
                    student_id: student.id,
                    admission_number: student.admission_number,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    other_names: student.other_names,
                    gender: student.gender,
                    guardian_id: student.guardian_id,
                    house_id: student.house_id,
                    final_class_id: student.class_id,
                    final_class_name: currentClass.name,
                });
                if (alumniError) throw alumniError;

                const { error: updateError } = await supabase
                    .from('students')
                    .update({ status: 'graduated', class_id: null })
                    .eq('id', student.id);
                if (updateError) throw updateError;
                alumni += 1;
                continue;
            }

            const targetClass = newClasses.find(c => c.grade_level_id === nextGrade.id && c.stream_id === currentClass.stream_id);
            if (!targetClass) continue;
            const { error: updateError } = await supabase
                .from('students')
                .update({ class_id: targetClass.id })
                .eq('id', student.id);
            if (updateError) throw updateError;
            promoted += 1;
        }

        return { promoted, alumni };
    };

    const handleCreateYear = async () => {
        if (!form.name.trim() || !form.start_date || !form.end_date) return;
        setSaving(true);
        try {
            await supabase.from('academic_years').update({ is_current: false }).eq('school_id', school!.id);
            const { data: year, error } = await supabase.from('academic_years').insert({
                school_id: school!.id,
                name: form.name.trim(),
                start_date: form.start_date,
                end_date: form.end_date,
                is_current: true,
            }).select().single();
            if (error) throw error;

            const newClasses = await ensureClassesForYear(year.id);
            const result = form.promote_students ? await promoteStudents(newClasses) : { promoted: 0, alumni: 0 };

            toast.success(`Academic year created. ${result.promoted} promoted, ${result.alumni} moved to alumni.`);
            setShowModal(false);
            await fetchAll();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create academic year');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Academic Years</h1>
                    <p className="page-subtitle">Create years, promote learners, and archive final classes into Alumni.</p>
                </div>
                <button className="btn btn-primary" onClick={openModal}>
                    <CalendarPlus size={18} /> New Academic Year
                </button>
            </div>

            <div className="card mb-4 promotion-summary">
                <GraduationCap size={28} />
                <div>
                    <h3>Promotion rule</h3>
                    <p>
                        The system detects the biggest grade level and promotes that level to Alumni.
                        The lowest grade level is left empty for new admissions.
                        Other students keep their stream and move to the next grade level.
                    </p>
                </div>
            </div>

            <div className="card">
                {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Academic Year</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {years.map(year => (
                                    <tr key={year.id}>
                                        <td><strong>{year.name}</strong></td>
                                        <td>{year.start_date}</td>
                                        <td>{year.end_date}</td>
                                        <td>{year.is_current ? <span className="badge badge-green">Current</span> : <span className="badge badge-gray">Archive</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!years.length && <div className="empty-state"><h3>No academic years</h3><p>Create your first academic year to begin class tracking.</p></div>}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create Academic Year</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Year Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input type="date" className="form-input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input type="date" className="form-input" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                                </div>
                            </div>
                            <label className="stat-card promotion-choice">
                                <input
                                    type="checkbox"
                                    checked={form.promote_students}
                                    onChange={e => setForm({ ...form, promote_students: e.target.checked })}
                                />
                                <div>
                                    <div className="font-semibold">Promote students automatically</div>
                                    <p className="text-sm text-muted">
                                        Biggest grade level goes to Alumni. Lowest grade level stays empty for new admissions.
                                    </p>
                                </div>
                                <CheckCircle2 size={20} />
                            </label>
                            {form.promote_students && (
                                <div className="grid-2 mt-4">
                                    <div className="form-group">
                                        <label className="form-label">Grade level to promote to Alumni</label>
                                        <select
                                            className="form-select"
                                            value={form.graduating_grade_id}
                                            onChange={e => setForm({ ...form, graduating_grade_id: e.target.value })}
                                        >
                                            {grades.map(grade => (
                                                <option key={grade.id} value={grade.id}>{grade.name}</option>
                                            ))}
                                        </select>
                                        <p className="form-hint">Detected biggest grade level: {biggestGrade?.name || '-'}</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Grade level left empty for admissions</label>
                                        <select
                                            className="form-select"
                                            value={form.entry_grade_id}
                                            onChange={e => setForm({ ...form, entry_grade_id: e.target.value })}
                                        >
                                            {grades.map(grade => (
                                                <option key={grade.id} value={grade.id}>{grade.name}</option>
                                            ))}
                                        </select>
                                        <p className="form-hint">Detected lowest grade level: {smallestGrade?.name || '-'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving || !form.name.trim() || !form.start_date || !form.end_date} onClick={handleCreateYear}>
                                {saving ? <span className="spinner" /> : 'Create and Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
