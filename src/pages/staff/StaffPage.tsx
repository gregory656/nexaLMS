import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { isValidKenyanPhone, normalizeKenyanPhone } from '../../lib/phone';
import { Plus, Search, MoreVertical, Shield, Mail, Phone, X, Trash2, Edit2 } from 'lucide-react';

export default function StaffPage() {
    const { school } = useAuth();
    const [staff, setStaff] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', phone: '', gender: '',
        tsc_number: '', id_number: '', qualification: '', employment_type: 'permanent',
    });

    const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const fetchStaff = async () => {
        if (!school?.id) return;
        setLoading(true);
        const { data: staffData, error: staffError } = await supabase
            .from('teachers')
            .select('*')
            .eq('school_id', school.id)
            .order('first_name');

        const userIds = (staffData || []).map(member => member.user_id).filter(Boolean);
        const { data: roleData, error: staffRoleError } = userIds.length
            ? await supabase
                .from('user_roles')
                .select('user_id, role_id, roles(display_name)')
                .in('user_id', userIds)
            : { data: [], error: null };

        const { data: rolesData, error: rolesError } = await supabase
            .from('roles')
            .select('*')
            .eq('school_id', school.id);

        if (staffError) toast.error(staffError.message);
        if (staffRoleError) toast.error(staffRoleError.message);
        if (rolesError) toast.error(rolesError.message);
        const roleMap = new Map<string, any[]>();
        (roleData || []).forEach(role => {
            if (!role.user_id) return;
            roleMap.set(role.user_id, [...(roleMap.get(role.user_id) || []), role]);
        });
        setStaff((staffData || []).map(member => ({
            ...member,
            user_roles: member.user_id ? roleMap.get(member.user_id) || [] : [],
        })));
        setRoles(rolesData || []);
        setLoading(false);
    };

    useEffect(() => { fetchStaff(); }, [school?.id]);

    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) return;
        if (!isValidKenyanPhone(form.phone)) {
            toast.error('Use a valid Kenyan phone number, e.g. +254712345678.');
            return;
        }
        setSaving(true);
        const teacherData = {
            ...form,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim() || null,
            phone: normalizeKenyanPhone(form.phone) || null,
            gender: form.gender || null,
            tsc_number: form.tsc_number.trim() || null,
            id_number: form.id_number.trim() || null,
            qualification: form.qualification.trim() || null,
            school_id: school!.id
        };

        const { error } = selectedStaff && !showRoleModal
            ? await supabase.from('teachers').update(teacherData).eq('id', selectedStaff.id)
            : await supabase.from('teachers').insert(teacherData);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success(selectedStaff ? 'Staff member updated' : 'Staff member saved');
            setShowModal(false);
            setSelectedStaff(null);
            setForm({
                first_name: '', last_name: '', email: '', phone: '', gender: '',
                tsc_number: '', id_number: '', qualification: '', employment_type: 'permanent',
            });
            await fetchStaff();
        }
        setSaving(false);
    };

    const openStaffModal = (member?: any) => {
        setSelectedStaff(member || null);
        setForm(member ? {
            first_name: member.first_name || '',
            last_name: member.last_name || '',
            email: member.email || '',
            phone: member.phone || '',
            gender: member.gender || '',
            tsc_number: member.tsc_number || '',
            id_number: member.id_number || '',
            qualification: member.qualification || '',
            employment_type: member.employment_type || 'permanent',
        } : {
            first_name: '', last_name: '', email: '', phone: '', gender: '',
            tsc_number: '', id_number: '', qualification: '', employment_type: 'permanent',
        });
        setShowModal(true);
        setMenuOpen(null);
    };

    const openRoleAssignment = (member: any) => {
        setSelectedStaff(member);
        const existingRoles = member.user_roles?.map((ur: any) => ur.role_id) || [];
        setAssignedRoleIds(existingRoles);
        setShowRoleModal(true);
        setMenuOpen(null);
    };

    const handleToggleRole = (roleId: string) => {
        setAssignedRoleIds(prev =>
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
    };

    const saveRoles = async () => {
        if (!selectedStaff?.user_id) {
            alert("This staff member doesn't have a system user account yet. Only accounts can have roles.");
            return;
        }

        setSaving(true);
        // Delete existing roles for this user
        const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', selectedStaff.user_id);
        if (deleteError) {
            toast.error(deleteError.message);
            setSaving(false);
            return;
        }

        // Insert new roles
        if (assignedRoleIds.length > 0) {
            const inserts = assignedRoleIds.map(roleId => ({
                user_id: selectedStaff.user_id,
                role_id: roleId
            }));
            const { error } = await supabase.from('user_roles').insert(inserts);
            if (error) {
                toast.error(error.message);
                setSaving(false);
                return;
            }
        }

        toast.success('Roles updated');
        setShowRoleModal(false);
        await fetchStaff();
        setSaving(false);
    };

    const handleDeleteStaff = async (id: string) => {
        if (!confirm('Remove this staff member?')) return;
        const { error } = await supabase.from('teachers').delete().eq('id', id);
        if (error) toast.error(error.message);
        else {
            toast.success('Staff member removed');
            await fetchStaff();
        }
        setMenuOpen(null);
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Staff & Teachers</h1>
                    <p className="page-subtitle">Manage educators and administrative personnel</p>
                </div>
                <button className="btn btn-primary" onClick={() => openStaffModal()}>
                    <Plus size={18} /> New Staff
                </button>
            </div>

            <div className="card mb-4">
                <div className="header-search" style={{ maxWidth: '320px' }}>
                    <Search />
                    <input
                        type="text"
                        placeholder="Search staff by name or email..."
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
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>TSC No.</th>
                                    <th>Roles</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staff.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())).map(member => (
                                    <tr key={member.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="sidebar-user-avatar">{member.first_name[0]}{member.last_name[0]}</div>
                                                <div>
                                                    <div className="font-semibold">{member.first_name} {member.last_name}</div>
                                                    <div className="text-xs text-muted">{member.employment_type}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm"><Mail size={12} className="inline mr-1" /> {member.email || '—'}</div>
                                            <div className="text-sm"><Phone size={12} className="inline mr-1" /> {member.phone || '—'}</div>
                                        </td>
                                        <td>{member.tsc_number || '—'}</td>
                                        <td>
                                            <div className="flex gap-1 flex-wrap">
                                                {member.user_roles?.map((ur: any) => (
                                                    <span key={ur.role_id} className="badge badge-blue">{ur.roles?.display_name}</span>
                                                )) || <span className="text-xs text-muted">No roles</span>}
                                            </div>
                                        </td>
                                        <td><span className="badge badge-green">{member.status}</span></td>
                                        <td>
                                            <div className="dropdown">
                                                <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}>
                                                    <MoreVertical size={16} />
                                                </button>
                                                {menuOpen === member.id && (
                                                    <div className="dropdown-menu">
                                                        <button className="dropdown-item" onClick={() => openRoleAssignment(member)}>
                                                            <Shield size={14} /> Assign Roles
                                                        </button>
                                                        <button className="dropdown-item" onClick={() => openStaffModal(member)}>
                                                            <Edit2 size={14} /> Edit Info
                                                        </button>
                                                        <button className="dropdown-item" onClick={() => handleDeleteStaff(member.id)} style={{ color: 'var(--danger)' }}>
                                                            <Trash2 size={14} /> Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Staff Info Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedStaff ? 'Edit Staff Member' : 'New Staff Member'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input className="form-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input className="form-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <input
                                        className="form-input"
                                        placeholder="+254712345678"
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        onBlur={e => setForm({ ...form, phone: normalizeKenyanPhone(e.target.value) })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">TSC Number</label>
                                    <input className="form-input" value={form.tsc_number} onChange={e => setForm({ ...form, tsc_number: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.first_name.trim() || !form.last_name.trim()}>
                                {saving ? <span className="spinner" /> : 'Save Staff Member'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Assignment Modal */}
            {showRoleModal && (
                <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Assign Roles: {selectedStaff?.first_name}</h3>
                            <button className="modal-close" onClick={() => setShowRoleModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-muted mb-4">Select the administrative roles for this staff member.</p>
                            <div className="flex flex-col gap-2">
                                {roles.map(role => (
                                    <label key={role.id} className="stat-card" style={{ cursor: 'pointer', padding: '0.75rem', gap: '0.75rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={assignedRoleIds.includes(role.id)}
                                            onChange={() => handleToggleRole(role.id)}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div className="font-semibold">{role.display_name}</div>
                                            <div className="text-xs text-muted">{role.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {roles.length === 0 && (
                                <div className="text-center p-4">
                                    <Shield size={32} style={{ color: 'var(--gray-300)', margin: '0 auto 1rem' }} />
                                    <p className="text-sm text-muted">No roles defined for this school yet.</p>
                                    <a href="/roles" className="btn btn-ghost btn-sm mt-2">Manage Roles</a>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveRoles} disabled={saving || !selectedStaff?.user_id}>
                                {saving ? 'Saving...' : 'Update Roles'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
