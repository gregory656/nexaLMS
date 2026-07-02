import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

export default function SubjectsPage() {
    const { school } = useAuth();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', code: '', department_id: '', is_compulsory: true, lessons_per_week: '5' });

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [subjectRes, departmentRes] = await Promise.all([
            supabase.from('subjects').select('*, departments(name)').eq('school_id', school.id).order('name'),
            supabase.from('departments').select('*').eq('school_id', school.id).order('name'),
        ]);
        [subjectRes.error, departmentRes.error].filter(Boolean).forEach(error => toast.error(error!.message));
        setSubjects(subjectRes.data || []);
        setDepartments(departmentRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const openModal = (subject?: any) => {
        setEditing(subject || null);
        setFormData(subject ? {
            name: subject.name || '',
            code: subject.code || '',
            department_id: subject.department_id || '',
            is_compulsory: subject.is_compulsory,
            lessons_per_week: String(subject.lessons_per_week || 5),
        } : { name: '', code: '', department_id: departments[0]?.id || '', is_compulsory: true, lessons_per_week: '5' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.department_id) {
            toast.error('Create and select a department before saving a subject.');
            return;
        }
        setSaving(true);
        const department = departments.find(item => item.id === formData.department_id);
        const payload = {
            name: formData.name.trim(),
            code: formData.code.trim() || null,
            category: department?.name || null,
            department_id: formData.department_id,
            is_compulsory: formData.is_compulsory,
            lessons_per_week: parseInt(formData.lessons_per_week, 10) || 5,
            school_id: school!.id,
        };
        const { error } = editing
            ? await supabase.from('subjects').update(payload).eq('id', editing.id)
            : await supabase.from('subjects').insert(payload);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success(editing ? 'Subject updated' : 'Subject saved');
            setShowModal(false);
            setEditing(null);
            await fetchAll();
        }
        setSaving(false);
    };

    const handleDelete = async (subject: any) => {
        if (!confirm(`Delete ${subject.name}?`)) return;
        const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Subject deleted');
            await fetchAll();
        }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Subjects</h1>
                    <p className="page-subtitle">Define subjects after creating departments/categories.</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()} disabled={departments.length === 0}>
                    <Plus size={18} /> New Subject
                </button>
            </div>

            {departments.length === 0 && !loading && (
                <div className="card mb-4 setup-nudge">
                    <div>
                        <h3 className="card-title">Departments required</h3>
                        <p className="text-sm text-muted">Subjects must belong to an existing department such as Humanities, Sciences, or Languages.</p>
                    </div>
                    <Link to="/academics/departments" className="btn btn-primary btn-sm">Manage Departments</Link>
                </div>
            )}

            <div className="card">
                {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject Name</th>
                                    <th>Code</th>
                                    <th>Department</th>
                                    <th>Lessons/Week</th>
                                    <th>Compulsory</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map(subject => (
                                    <tr key={subject.id}>
                                        <td><strong>{subject.name}</strong></td>
                                        <td>{subject.code || '-'}</td>
                                        <td><span className="badge badge-blue">{subject.departments?.name || subject.category || '-'}</span></td>
                                        <td><span className="badge badge-green">{subject.lessons_per_week || 5}</span></td>
                                        <td>{subject.is_compulsory ? 'Yes' : '-'}</td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(subject)}><Edit2 size={16} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(subject)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!subjects.length && <div className="empty-state"><h3>No subjects defined</h3><p>Add the subjects your school offers here.</p></div>}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Edit Subject' : 'Add New Subject'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Subject Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Mathematics, English Language"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Subject Code</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. MAT, ENG"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select
                                        className="form-select"
                                        value={formData.department_id}
                                        onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                    >
                                        <option value="">Select department</option>
                                        {departments.map(department => (
                                            <option key={department.id} value={department.id}>{department.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Weekly Lessons (for timetable)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min={1}
                                    max={20}
                                    value={formData.lessons_per_week}
                                    onChange={e => setFormData({ ...formData, lessons_per_week: e.target.value })}
                                />
                            </div>
                            <div className="form-group flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="compulsory"
                                    checked={formData.is_compulsory}
                                    onChange={e => setFormData({ ...formData, is_compulsory: e.target.checked })}
                                />
                                <label htmlFor="compulsory" className="text-sm">This subject is compulsory for all students</label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formData.name.trim() || !formData.department_id}>
                                {saving ? <span className="spinner" /> : 'Save Subject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
