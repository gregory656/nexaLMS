import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, BookOpen, Trash2, Edit2, X } from 'lucide-react';

export default function SubjectsPage() {
    const { school } = useAuth();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', code: '', category: 'core', is_compulsory: true });

    const fetchSubjects = async () => {
        if (!school?.id) return;
        setLoading(true);
        const { data } = await supabase
            .from('subjects')
            .select('*')
            .eq('school_id', school.id)
            .order('name');
        setSubjects(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchSubjects(); }, [school?.id]);

    const handleSave = async () => {
        if (!formData.name.trim()) return;
        await supabase.from('subjects').insert({ ...formData, school_id: school!.id });
        setFormData({ name: '', code: '', category: 'core', is_compulsory: true });
        setShowModal(false);
        fetchSubjects();
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Subjects</h1>
                    <p className="page-subtitle">Define the curriculum and subjects offered at {school?.name}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> New Subject
                </button>
            </div>

            <div className="card">
                {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject Name</th>
                                    <th>Code</th>
                                    <th>Category</th>
                                    <th>Compulsory</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map(subject => (
                                    <tr key={subject.id}>
                                        <td><strong>{subject.name}</strong></td>
                                        <td>{subject.code || '—'}</td>
                                        <td><span className="badge badge-blue">{subject.category}</span></td>
                                        <td>{subject.is_compulsory ? '✅ Yes' : '—'}</td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm"><Edit2 size={16} /></button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
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
                            <h3 className="modal-title">Add New Subject</h3>
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
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-select"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="core">Core / Mandatory</option>
                                        <option value="elective">Elective / Optional</option>
                                        <option value="science">Sciences</option>
                                        <option value="humanities">Humanities</option>
                                        <option value="creative">Creative Arts</option>
                                    </select>
                                </div>
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
                            <button className="btn btn-primary" onClick={handleSave}>Save Subject</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
