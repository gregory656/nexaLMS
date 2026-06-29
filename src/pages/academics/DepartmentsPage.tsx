import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Edit2, Plus, Trash2, UserRoundCheck, X } from 'lucide-react';

const DEFAULT_DEPARTMENTS = [
    'Languages',
    'Mathematics',
    'Sciences',
    'Humanities',
    'Creative Arts',
    'Technical Studies',
];

export default function DepartmentsPage() {
    const { school } = useAuth();
    const [departments, setDepartments] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', head_teacher_id: '' });

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [deptRes, teacherRes] = await Promise.all([
            supabase.from('departments').select('*').eq('school_id', school.id).order('name'),
            supabase.from('teachers').select('*').eq('school_id', school.id).order('first_name'),
        ]);
        [deptRes.error, teacherRes.error].filter(Boolean).forEach(error => toast.error(error!.message));
        const teacherRows = teacherRes.data || [];
        setDepartments((deptRes.data || []).map(department => ({
            ...department,
            head_teacher: teacherRows.find(teacher => teacher.id === department.head_teacher_id) || null,
        })));
        setTeachers(teacherRows);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const seedDefaults = async () => {
        setSaving(true);
        const existing = new Set(departments.map(dept => dept.name.toLowerCase()));
        const rows = DEFAULT_DEPARTMENTS
            .filter(name => !existing.has(name.toLowerCase()))
            .map(name => ({ name, school_id: school!.id, description: `${name} department` }));
        if (!rows.length) {
            toast.success('Default departments already exist');
            setSaving(false);
            return;
        }
        const { error } = await supabase.from('departments').insert(rows);
        if (error) toast.error(error.message);
        else {
            toast.success('Default departments added');
            await fetchAll();
        }
        setSaving(false);
    };

    const openModal = (department?: any) => {
        setEditing(department || null);
        setForm(department ? {
            name: department.name || '',
            description: department.description || '',
            head_teacher_id: department.head_teacher_id || '',
        } : { name: '', description: '', head_teacher_id: '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        const payload = {
            school_id: school!.id,
            name: form.name.trim(),
            description: form.description.trim() || null,
            head_teacher_id: form.head_teacher_id || null,
        };
        const { error } = editing
            ? await supabase.from('departments').update(payload).eq('id', editing.id)
            : await supabase.from('departments').insert(payload);

        if (error) toast.error(error.message);
        else {
            toast.success(editing ? 'Department updated' : 'Department created');
            setShowModal(false);
            await fetchAll();
        }
        setSaving(false);
    };

    const handleDelete = async (department: any) => {
        if (!confirm(`Delete ${department.name}? Subjects linked to it will keep their category text.`)) return;
        const { error } = await supabase.from('departments').delete().eq('id', department.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Department deleted');
            await fetchAll();
        }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Departments</h1>
                    <p className="page-subtitle">Manage subject categories and assign heads of department from staff.</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={seedDefaults} disabled={saving}>Add Defaults</button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> New Department
                    </button>
                </div>
            </div>

            <div className="card">
                {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Head of Department</th>
                                    <th>Description</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departments.map(department => (
                                    <tr key={department.id}>
                                        <td><strong>{department.name}</strong></td>
                                        <td>
                                            {department.head_teacher
                                                ? <span className="badge badge-green"><UserRoundCheck size={13} /> {department.head_teacher.first_name} {department.head_teacher.last_name}</span>
                                                : <span className="badge badge-gray">No HOD</span>}
                                        </td>
                                        <td>{department.description || '-'}</td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(department)}><Edit2 size={16} /></button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(department)}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!departments.length && <div className="empty-state"><h3>No departments yet</h3><p>Add defaults or create your first department.</p></div>}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Edit Department' : 'New Department'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Department Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Head of Department</label>
                                <select className="form-select" value={form.head_teacher_id} onChange={e => setForm({ ...form, head_teacher_id: e.target.value })}>
                                    <option value="">Select staff member</option>
                                    {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.first_name} {teacher.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                                {saving ? <span className="spinner" /> : 'Save Department'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
