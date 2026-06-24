import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Shield, Plus, ShieldCheck, ShieldAlert, X } from 'lucide-react';

export default function RolesPage() {
    const { school } = useAuth();
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '' });

    const fetchRoles = async () => {
        if (!school?.id) return;
        setLoading(true);
        const { data } = await supabase
            .from('roles')
            .select('*')
            .eq('school_id', school.id)
            .order('is_system', { ascending: false });
        setRoles(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchRoles(); }, [school?.id]);

    const prePopulateRoles = async () => {
        const defaultRoles = [
            { name: 'deputy', display_name: 'Deputy Headteacher', description: 'Administrative second-in-command' },
            { name: 'dos', display_name: 'Director of Studies (DOS)', description: 'Manages academics and exams' },
            { name: 'tod', display_name: 'Teacher on Duty (TOD)', description: 'Weekly operational oversight' },
            { name: 'subject_teacher', display_name: 'Subject Teacher', description: 'Handles specific subjects' },
            { name: 'class_teacher', display_name: 'Class Teacher', description: 'Oversees a specific class stream' },
            { name: 'bursar', display_name: 'Bursar', description: 'Financial management and fees' },
        ];

        const inserts = defaultRoles.map(r => ({ ...r, school_id: school!.id, is_system: true }));
        await supabase.from('roles').insert(inserts);
        fetchRoles();
    };

    const handleAddRole = async () => {
        if (!newRole.display_name.trim()) return;
        const name = newRole.display_name.toLowerCase().replace(/\s+/g, '_');
        await supabase.from('roles').insert({ ...newRole, name, school_id: school!.id, is_system: false });
        setShowModal(false);
        setNewRole({ name: '', display_name: '', description: '' });
        fetchRoles();
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Roles & Permissions</h1>
                    <p className="page-subtitle">Configure administrative roles for staff members</p>
                </div>
                <div className="flex gap-2">
                    {roles.length === 0 && (
                        <button className="btn btn-secondary" onClick={prePopulateRoles}>
                            ✨ Pre-populate Standard Roles
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> New Custom Role
                    </button>
                </div>
            </div>

            <div className="grid-3">
                {loading ? <div className="flex justify-center p-8" style={{ gridColumn: 'span 3' }}><span className="spinner" /></div> : (
                    roles.map(role => (
                        <div key={role.id} className="card">
                            <div className="card-header">
                                <div className="flex items-center gap-2">
                                    <Shield size={20} style={{ color: role.is_system ? 'var(--green-600)' : 'var(--gray-400)' }} />
                                    <h3 className="card-title">{role.display_name}</h3>
                                </div>
                                {role.is_system && <span className="badge badge-green">System</span>}
                            </div>
                            <div className="card-body">
                                <p className="text-sm text-muted mb-4">{role.description || 'No description provided.'}</p>
                                <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: '1px solid var(--gray-100)' }}>
                                    <button className="btn btn-ghost btn-sm">
                                        <ShieldCheck size={14} /> Permissions
                                    </button>
                                    {!role.is_system && (
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>
                                            <ShieldAlert size={14} /> Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {!loading && roles.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: 'span 3' }}>
                        <h3>No roles defined yet</h3>
                        <p>Define roles before assigning them to staff.</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create Custom Role</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Role Display Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Head of Science"
                                    value={newRole.display_name}
                                    onChange={e => setNewRole({ ...newRole, display_name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="What can this role do?"
                                    value={newRole.description}
                                    onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAddRole}>Create Role</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
