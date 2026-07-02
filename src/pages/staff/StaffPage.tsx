import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { isValidKenyanPhone, normalizeKenyanPhone } from '../../lib/phone';
import { Plus, Search, MoreVertical, Shield, Mail, Phone, X, Trash2, Edit2, BookOpen, Link2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    const [activeTab, setActiveTab] = useState<'staff' | 'combinations'>('staff');

    const [subjects, setSubjects] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [combinations, setCombinations] = useState<any[]>([]);
    const [showComboModal, setShowComboModal] = useState(false);
    const [editingCombo, setEditingCombo] = useState<any>(null);
    const [comboForm, setComboForm] = useState({
        teacher_id: '', subject_id: '', class_id: '', academic_year_id: '', lessons_per_week: '5',
    });
    const [staffSubjects, setStaffSubjects] = useState<{ subject_id: string; class_id: string; lessons_per_week: string }[]>([
        { subject_id: '', class_id: '', lessons_per_week: '5' },
    ]);
    const [linkEmail, setLinkEmail] = useState('');

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

    const fetchCombinations = async () => {
        if (!school?.id) return;
        const [subRes, clsRes, yrRes, comboRes] = await Promise.all([
            supabase.from('subjects').select('*').eq('school_id', school.id).order('name'),
            supabase.from('classes').select('*').eq('school_id', school.id).order('name'),
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('is_current', { ascending: false }),
            supabase.from('teacher_subject_assignments')
                .select('*, teachers(first_name, last_name), subjects(name), classes(name)')
                .eq('school_id', school.id)
                .order('created_at', { ascending: false }),
        ]);
        setSubjects(subRes.data || []);
        setClasses(clsRes.data || []);
        setAcademicYears(yrRes.data || []);
        setCombinations(comboRes.data || []);
        const currentYear = yrRes.data?.find(y => y.is_current) || yrRes.data?.[0];
        if (currentYear) {
            setComboForm(f => ({ ...f, academic_year_id: f.academic_year_id || currentYear.id }));
        }
    };

    useEffect(() => { fetchStaff(); fetchCombinations(); }, [school?.id]);

    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) return;
        if (!isValidKenyanPhone(form.phone)) {
            toast.error('Use a valid Kenyan phone number, e.g. +254712345678.');
            return;
        }
        if (!selectedStaff) {
            const validSubjects = staffSubjects.filter(s => s.subject_id && s.class_id);
            if (validSubjects.length === 0) {
                toast.error('Add at least one subject combination for this staff member.');
                return;
            }
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

        if (selectedStaff && !showRoleModal) {
            const { error } = await supabase.from('teachers').update(teacherData).eq('id', selectedStaff.id);
            if (error) {
                toast.error(error.message);
                setSaving(false);
                return;
            }
            toast.success('Staff member updated');
        } else if (!selectedStaff) {
            const { data: newTeacher, error } = await supabase.from('teachers').insert(teacherData).select().single();
            if (error || !newTeacher) {
                toast.error(error?.message || 'Failed to save staff');
                setSaving(false);
                return;
            }
            const yearId = academicYears.find(y => y.is_current)?.id || academicYears[0]?.id;
            const validSubjects = staffSubjects.filter(s => s.subject_id && s.class_id);
            if (validSubjects.length > 0 && yearId) {
                const rows = validSubjects.map(s => ({
                    teacher_id: newTeacher.id,
                    subject_id: s.subject_id,
                    class_id: s.class_id,
                    academic_year_id: yearId,
                    lessons_per_week: parseInt(s.lessons_per_week, 10) || 5,
                    school_id: school!.id,
                }));
                const { error: comboError } = await supabase.from('teacher_subject_assignments').insert(rows);
                if (comboError) toast.error(comboError.message);
            }
            toast.success('Staff member saved with subject assignments');
        }

        setShowModal(false);
        setSelectedStaff(null);
        setForm({
            first_name: '', last_name: '', email: '', phone: '', gender: '',
            tsc_number: '', id_number: '', qualification: '', employment_type: 'permanent',
        });
        setStaffSubjects([{ subject_id: '', class_id: '', lessons_per_week: '5' }]);
        await fetchStaff();
        await fetchCombinations();
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
        setLinkEmail(member.email || '');
        setShowRoleModal(true);
        setMenuOpen(null);
    };

    const linkStaffAccount = async (): Promise<string | null> => {
        if (!selectedStaff || !linkEmail.trim()) {
            toast.error('Enter the staff email to link their account.');
            return null;
        }
        const { data: linkedUser, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', linkEmail.trim().toLowerCase())
            .eq('school_id', school!.id)
            .maybeSingle();

        if (error || !linkedUser) {
            toast.error('No user account found with that email. The staff member must have a registered account first.');
            return null;
        }

        const { error: updateError } = await supabase
            .from('teachers')
            .update({ user_id: linkedUser.id })
            .eq('id', selectedStaff.id);

        if (updateError) {
            toast.error(updateError.message);
            return null;
        }

        toast.success('Account linked successfully');
        return linkedUser.id;
    };

    const saveRoles = async () => {
        let userId = selectedStaff?.user_id;
        if (!userId) {
            userId = await linkStaffAccount();
            if (!userId) return;
        }

        setSaving(true);
        const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId);
        if (deleteError) {
            toast.error(deleteError.message);
            setSaving(false);
            return;
        }

        if (assignedRoleIds.length > 0) {
            const inserts = assignedRoleIds.map(roleId => ({
                user_id: userId,
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

    const saveCombination = async () => {
        if (!comboForm.teacher_id || !comboForm.subject_id || !comboForm.class_id || !comboForm.academic_year_id) {
            toast.error('Fill all fields for the subject combination.');
            return;
        }
        setSaving(true);
        const payload = {
            teacher_id: comboForm.teacher_id,
            subject_id: comboForm.subject_id,
            class_id: comboForm.class_id,
            academic_year_id: comboForm.academic_year_id,
            lessons_per_week: parseInt(comboForm.lessons_per_week, 10) || 5,
            school_id: school!.id,
        };
        const { error } = editingCombo
            ? await supabase.from('teacher_subject_assignments').update(payload).eq('id', editingCombo.id)
            : await supabase.from('teacher_subject_assignments').insert(payload);
        if (error) toast.error(error.message);
        else {
            toast.success(editingCombo ? 'Combination updated' : 'Subject combination saved');
            setShowComboModal(false);
            setEditingCombo(null);
            await fetchCombinations();
        }
        setSaving(false);
    };

    const deleteCombination = async (id: string) => {
        if (!confirm('Remove this subject combination?')) return;
        const { error } = await supabase.from('teacher_subject_assignments').delete().eq('id', id);
        if (error) toast.error(error.message);
        else {
            toast.success('Combination removed');
            await fetchCombinations();
        }
    };

    const openComboModal = (combo?: any) => {
        setEditingCombo(combo || null);
        setComboForm(combo ? {
            teacher_id: combo.teacher_id,
            subject_id: combo.subject_id,
            class_id: combo.class_id || '',
            academic_year_id: combo.academic_year_id,
            lessons_per_week: String(combo.lessons_per_week || 5),
        } : {
            teacher_id: '', subject_id: '', class_id: '',
            academic_year_id: academicYears.find(y => y.is_current)?.id || academicYears[0]?.id || '',
            lessons_per_week: '5',
        });
        setShowComboModal(true);
    };

    const handleToggleRole = (roleId: string) => {
        setAssignedRoleIds(prev =>
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
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
                <div className="flex gap-2">
                    {activeTab === 'combinations' && (
                        <button className="btn btn-primary" onClick={() => openComboModal()}>
                            <Plus size={18} /> Add Combination
                        </button>
                    )}
                    {activeTab === 'staff' && (
                        <button className="btn btn-primary" onClick={() => openStaffModal()}>
                            <Plus size={18} /> New Staff
                        </button>
                    )}
                </div>
            </div>

            <div className="tabs mb-4">
                <div className={`tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
                    <Users size={16} /> Staff List
                </div>
                <div className={`tab ${activeTab === 'combinations' ? 'active' : ''}`} onClick={() => setActiveTab('combinations')}>
                    <BookOpen size={16} /> Subject Combinations
                </div>
            </div>

            {activeTab === 'staff' && (
            <>
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
            </>
            )}

            {activeTab === 'combinations' && (
                <div className="card">
                    <p className="text-sm text-muted p-4 border-b">
                        Subject combinations define which teacher teaches which subject to which class. These are used by the timetable generator.
                    </p>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Teacher</th>
                                    <th>Subject</th>
                                    <th>Class</th>
                                    <th>Lessons/Week</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {combinations.map(c => (
                                    <tr key={c.id}>
                                        <td><strong>{c.teachers?.first_name} {c.teachers?.last_name}</strong></td>
                                        <td>{c.subjects?.name}</td>
                                        <td>{c.classes?.name || '—'}</td>
                                        <td><span className="badge badge-blue">{c.lessons_per_week || 5}</span></td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openComboModal(c)}><Edit2 size={14} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => deleteCombination(c.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {combinations.length === 0 && (
                            <div className="empty-state">
                                <BookOpen size={32} style={{ color: 'var(--gray-300)' }} />
                                <h3>No subject combinations</h3>
                                <p>Add teacher-subject-class assignments for timetable generation.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                            {!selectedStaff && (
                                <div className="form-group mt-4 border-t pt-4">
                                    <label className="form-label font-semibold">Subject Combinations (required)</label>
                                    <p className="text-xs text-muted mb-3">Assign at least one subject this staff member will teach.</p>
                                    {staffSubjects.map((row, idx) => (
                                        <div key={idx} className="grid-3 gap-2 mb-2">
                                            <select className="form-select" value={row.subject_id}
                                                onChange={e => {
                                                    const next = [...staffSubjects];
                                                    next[idx].subject_id = e.target.value;
                                                    setStaffSubjects(next);
                                                }}>
                                                <option value="">Subject</option>
                                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <select className="form-select" value={row.class_id}
                                                onChange={e => {
                                                    const next = [...staffSubjects];
                                                    next[idx].class_id = e.target.value;
                                                    setStaffSubjects(next);
                                                }}>
                                                <option value="">Class</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <div className="flex gap-1">
                                                <input type="number" className="form-input" placeholder="Lessons/wk" min={1} max={20}
                                                    value={row.lessons_per_week}
                                                    onChange={e => {
                                                        const next = [...staffSubjects];
                                                        next[idx].lessons_per_week = e.target.value;
                                                        setStaffSubjects(next);
                                                    }} />
                                                {staffSubjects.length > 1 && (
                                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStaffSubjects(staffSubjects.filter((_, i) => i !== idx))}>
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => setStaffSubjects([...staffSubjects, { subject_id: '', class_id: '', lessons_per_week: '5' }])}>
                                        <Plus size={14} /> Add Another Subject
                                    </button>
                                </div>
                            )}
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
                            {!selectedStaff?.user_id && (
                                <div className="form-group mb-4 p-3" style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                                    <label className="form-label flex items-center gap-2">
                                        <Link2 size={14} /> Link User Account
                                    </label>
                                    <p className="text-xs text-muted mb-2">Enter the staff member's registered email to link their account before assigning roles.</p>
                                    <div className="flex gap-2">
                                        <input className="form-input" type="email" value={linkEmail}
                                            onChange={e => setLinkEmail(e.target.value)} placeholder="staff@school.com" />
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={linkStaffAccount}>Link</button>
                                    </div>
                                </div>
                            )}
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
                                    <Link to="/roles" className="btn btn-ghost btn-sm mt-2">Manage Roles</Link>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveRoles} disabled={saving}>
                                {saving ? 'Saving...' : 'Update Roles'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subject Combination Modal */}
            {showComboModal && (
                <div className="modal-overlay" onClick={() => setShowComboModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingCombo ? 'Edit Combination' : 'Add Subject Combination'}</h3>
                            <button className="modal-close" onClick={() => setShowComboModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Teacher</label>
                                <select className="form-select" value={comboForm.teacher_id}
                                    onChange={e => setComboForm(f => ({ ...f, teacher_id: e.target.value }))}>
                                    <option value="">Select Teacher</option>
                                    {staff.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subject</label>
                                <select className="form-select" value={comboForm.subject_id}
                                    onChange={e => setComboForm(f => ({ ...f, subject_id: e.target.value }))}>
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Class</label>
                                <select className="form-select" value={comboForm.class_id}
                                    onChange={e => setComboForm(f => ({ ...f, class_id: e.target.value }))}>
                                    <option value="">Select Class</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Academic Year</label>
                                    <select className="form-select" value={comboForm.academic_year_id}
                                        onChange={e => setComboForm(f => ({ ...f, academic_year_id: e.target.value }))}>
                                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Lessons per Week</label>
                                    <input type="number" className="form-input" min={1} max={20}
                                        value={comboForm.lessons_per_week}
                                        onChange={e => setComboForm(f => ({ ...f, lessons_per_week: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowComboModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveCombination} disabled={saving}>
                                {saving ? <span className="spinner" /> : 'Save Combination'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
