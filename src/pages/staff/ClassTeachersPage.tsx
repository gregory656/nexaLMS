import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, Trash2, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ClassTeachersPage() {
    const { school } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [principalName, setPrincipalName] = useState('');
    const [form, setForm] = useState({ teacher_id: '', class_id: '' });

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [teacherRes, classRes, assignmentRes, schoolRes] = await Promise.all([
            supabase.from('teachers').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            supabase.from('classes').select('*').eq('school_id', school.id).order('name'),
            supabase.from('class_teacher_assignments').select('*, teachers(first_name, last_name), classes(name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('schools').select('principal_name').eq('id', school.id).maybeSingle(),
        ]);
        if (teacherRes.error) toast.error(teacherRes.error.message);
        if (classRes.error) toast.error(classRes.error.message);
        if (assignmentRes.error) toast.error(assignmentRes.error.message);
        setTeachers(teacherRes.data || []);
        setClasses(classRes.data || []);
        setAssignments(assignmentRes.data || []);
        setPrincipalName((schoolRes.data as any)?.principal_name || '');
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const savePrincipal = async () => {
        if (!school?.id) return;
        setSaving(true);
        const { error } = await supabase.from('schools').update({ principal_name: principalName.trim() || null }).eq('id', school.id);
        setSaving(false);
        if (error) toast.error(error.message);
        else toast.success('Principal name saved');
    };

    const saveAssignment = async () => {
        if (!school?.id || !form.teacher_id || !form.class_id) {
            toast.error('Choose a teacher and class.');
            return;
        }
        setSaving(true);
        const payload = { school_id: school.id, teacher_id: form.teacher_id, class_id: form.class_id };
        const existing = assignments.find(item => item.class_id === form.class_id);
        const { error } = existing
            ? await supabase.from('class_teacher_assignments').update(payload).eq('id', existing.id)
            : await supabase.from('class_teacher_assignments').insert(payload);
        if (!error) await supabase.from('classes').update({ class_teacher_id: form.teacher_id }).eq('id', form.class_id);
        setSaving(false);
        if (error) toast.error(error.message);
        else {
            toast.success('Class TR assignment saved');
            setForm({ teacher_id: '', class_id: '' });
            await fetchAll();
        }
    };

    const removeAssignment = async (assignment: any) => {
        if (!confirm('Remove this class TR assignment?')) return;
        const { error } = await supabase.from('class_teacher_assignments').delete().eq('id', assignment.id);
        if (!error) await supabase.from('classes').update({ class_teacher_id: null }).eq('id', assignment.class_id);
        if (error) toast.error(error.message);
        else {
            toast.success('Assignment removed');
            await fetchAll();
        }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Class TRs</h1>
                    <p className="page-subtitle">Assign class teachers and the principal name used on report cards.</p>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Principal</h3></div>
                    <div style={{ padding: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Principal Name</label>
                            <input className="form-input" value={principalName} onChange={e => setPrincipalName(e.target.value)} placeholder="e.g. Mrs Jane Wanjiku" />
                        </div>
                        <button className="btn btn-primary" onClick={savePrincipal} disabled={saving}>
                            <Save size={16} /> Save Principal
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><h3 className="card-title">Assign Class TR</h3></div>
                    <div style={{ padding: '1rem' }}>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Teacher</label>
                                <select className="form-select" value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}>
                                    <option value="">Choose teacher</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Class / Stream</label>
                                <select className="form-select" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                                    <option value="">Choose class</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={saveAssignment} disabled={saving}>
                            <UserCheck size={16} /> Save Assignment
                        </button>
                    </div>
                </div>
            </div>

            <div className="card mt-4">
                <div className="card-header"><h3 className="card-title">Current Class TRs</h3></div>
                {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Class</th><th>Class TR</th><th>Action</th></tr></thead>
                            <tbody>
                                {assignments.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.classes?.name}</td>
                                        <td><strong>{item.teachers?.first_name} {item.teachers?.last_name}</strong></td>
                                        <td><button className="btn btn-ghost btn-sm" onClick={() => removeAssignment(item)}><Trash2 size={14} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {assignments.length === 0 && <div className="empty-state"><h3>No class TR assignments yet</h3></div>}
                    </div>
                )}
            </div>
        </>
    );
}
