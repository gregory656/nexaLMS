import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, UserCheck, Mail, Phone, GraduationCap, X, Edit2 } from 'lucide-react';

export default function GuardiansPage() {
    const { school } = useAuth();
    const [guardians, setGuardians] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedGuardian, setSelectedGuardian] = useState<any>(null);

    const fetchGuardians = async () => {
        if (!school?.id) return;
        setLoading(true);
        // Fetch guardians and their linked students
        const { data } = await supabase
            .from('guardians')
            .select('*, students(first_name, last_name, class_id, classes(name))')
            .eq('school_id', school.id)
            .order('first_name');
        setGuardians(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchGuardians(); }, [school?.id]);

    const filtered = guardians.filter(g =>
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.phone && g.phone.includes(searchTerm)) ||
        (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Guardians & Parents</h1>
                    <p className="page-subtitle">Manage family contacts and student relationships</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setSelectedGuardian(null); setShowModal(true); }}>
                    <Plus size={18} /> New Guardian
                </button>
            </div>

            <div className="card mb-4">
                <div className="header-search" style={{ maxWidth: '320px' }}>
                    <Search />
                    <input
                        type="text"
                        placeholder="Search guardians by name, phone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="card">
                {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Guardian Name</th>
                                    <th>Relationship</th>
                                    <th>Contact Information</th>
                                    <th>Linked Students</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(guardian => (
                                    <tr key={guardian.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="sidebar-user-avatar" style={{ background: 'var(--orange-500)' }}>
                                                    {guardian.first_name[0]}{guardian.last_name[0]}
                                                </div>
                                                <div className="font-semibold">{guardian.first_name} {guardian.last_name}</div>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-orange">{guardian.relationship}</span></td>
                                        <td>
                                            <div className="text-sm"><Mail size={12} className="inline mr-1" /> {guardian.email || '—'}</div>
                                            <div className="text-sm"><Phone size={12} className="inline mr-1" /> {guardian.phone || '—'}</div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {guardian.students?.map((s: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-1 text-xs">
                                                        <GraduationCap size={12} style={{ color: 'var(--green-600)' }} />
                                                        <span>{s.first_name} {s.last_name}</span>
                                                        <span className="text-muted">({s.classes?.name || 'No Class'})</span>
                                                    </div>
                                                ))}
                                                {!guardian.students?.length && <span className="text-xs text-muted italic">No students linked</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedGuardian(guardian); setShowModal(true); }}>
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!filtered.length && <div className="empty-state"><h3>No guardians found</h3></div>}
                    </div>
                )}
            </div>

            {/* Basic Guardian modal for now */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedGuardian ? 'Edit Guardian' : 'New Guardian'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-muted">Use the <strong>Students</strong> page to link guardians to specific students during admission.</p>
                            {/* Just a placeholder for the form to keep it simple but functional */}
                            <div className="grid-2 mt-4">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input className="form-input" defaultValue={selectedGuardian?.first_name} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input className="form-input" defaultValue={selectedGuardian?.last_name} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                            <button className="btn btn-primary">Save Guardian</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
