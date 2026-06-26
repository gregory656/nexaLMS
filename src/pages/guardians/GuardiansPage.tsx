import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { isValidKenyanPhone, normalizeKenyanPhone } from '../../lib/phone';
import { Plus, Search, Mail, Phone, GraduationCap, X, Edit2 } from 'lucide-react';

export default function GuardiansPage() {
    const { school } = useAuth();
    const [guardians, setGuardians] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedGuardian, setSelectedGuardian] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const blankForm = {
        first_name: '',
        last_name: '',
        relationship: 'guardian',
        phone: '',
        alternate_phone: '',
        email: '',
        occupation: '',
        address: '',
        national_id: '',
        student_id: '',
    };
    const [form, setForm] = useState(blankForm);

    const fetchGuardians = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [{ data, error }, studentRes] = await Promise.all([
            supabase
            .from('guardians')
            .select('*, students(first_name, last_name, class_id, classes(name))')
            .eq('school_id', school.id)
                .order('first_name'),
            supabase
                .from('students')
                .select('id, first_name, last_name, admission_number, guardian_id, classes(name)')
                .eq('school_id', school.id)
                .order('first_name')
        ]);
        if (error) toast.error(error.message);
        if (studentRes.error) toast.error(studentRes.error.message);
        setGuardians(data || []);
        setStudents(studentRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchGuardians(); }, [school?.id]);

    const filtered = guardians.filter(g =>
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.phone && g.phone.includes(searchTerm)) ||
        (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const openNewGuardian = () => {
        if (students.length === 0) {
            toast.error('Add students before creating guardians or parents.');
            return;
        }
        setSelectedGuardian(null);
        setForm(blankForm);
        setShowModal(true);
    };

    const openEditGuardian = (guardian: any) => {
        setSelectedGuardian(guardian);
        setForm({
            first_name: guardian.first_name || '',
            last_name: guardian.last_name || '',
            relationship: guardian.relationship || 'guardian',
            phone: guardian.phone || '',
            alternate_phone: guardian.alternate_phone || '',
            email: guardian.email || '',
            occupation: guardian.occupation || '',
            address: guardian.address || '',
            national_id: guardian.national_id || '',
            student_id: students.find(s => s.guardian_id === guardian.id)?.id || '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!school?.id || !form.first_name.trim() || !form.last_name.trim()) return;
        if (!selectedGuardian && !form.student_id) {
            toast.error('Select the student this guardian is linked to.');
            return;
        }
        if (!isValidKenyanPhone(form.phone) || !isValidKenyanPhone(form.alternate_phone)) {
            toast.error('Use a valid Kenyan phone number, e.g. +254712345678.');
            return;
        }

        setSaving(true);
        try {
            const guardianData = {
                school_id: school.id,
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                relationship: form.relationship as any,
                phone: normalizeKenyanPhone(form.phone) || null,
                alternate_phone: normalizeKenyanPhone(form.alternate_phone) || null,
                email: form.email.trim() || null,
                occupation: form.occupation.trim() || null,
                address: form.address.trim() || null,
                national_id: form.national_id.trim() || null,
            };

            let guardianId = selectedGuardian?.id;
            if (selectedGuardian) {
                const { error } = await supabase.from('guardians').update(guardianData).eq('id', selectedGuardian.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('guardians').insert(guardianData).select().single();
                if (error) throw error;
                guardianId = data.id;
            }

            if (form.student_id && guardianId) {
                const { error: studentError } = await supabase
                    .from('students')
                    .update({ guardian_id: guardianId })
                    .eq('id', form.student_id);
                if (studentError) throw studentError;

                const { error: linkError } = await supabase.from('student_guardians').upsert({
                    student_id: form.student_id,
                    guardian_id: guardianId,
                    is_primary: true,
                }, { onConflict: 'student_id,guardian_id' });
                if (linkError) console.warn('Could not write student_guardians link', linkError);
            }

            toast.success(selectedGuardian ? 'Guardian updated' : 'Guardian saved');
            setShowModal(false);
            setForm(blankForm);
            await fetchGuardians();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save guardian');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Guardians & Parents</h1>
                    <p className="page-subtitle">Manage family contacts and student relationships</p>
                </div>
                <button className="btn btn-primary" onClick={openNewGuardian}>
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
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEditGuardian(guardian)}>
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

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedGuardian ? 'Edit Guardian' : 'New Guardian'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input className="form-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name *</label>
                                    <input className="form-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Relationship</label>
                                    <select className="form-select" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>
                                        <option value="father">Father</option>
                                        <option value="mother">Mother</option>
                                        <option value="guardian">Guardian</option>
                                        <option value="uncle">Uncle</option>
                                        <option value="aunt">Aunt</option>
                                        <option value="grandparent">Grandparent</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Linked Student {!selectedGuardian && '*'}</label>
                                    <select className="form-select" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}>
                                        <option value="">Select Student</option>
                                        {students.map(student => (
                                            <option key={student.id} value={student.id}>
                                                {student.first_name} {student.last_name} {student.admission_number ? `(${student.admission_number})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="form-hint">Students must be admitted before guardians are created.</p>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        className="form-input"
                                        placeholder="+254712345678"
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        onBlur={e => setForm({ ...form, phone: normalizeKenyanPhone(e.target.value) })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Alternate Phone</label>
                                    <input
                                        className="form-input"
                                        placeholder="+254712345678"
                                        value={form.alternate_phone}
                                        onChange={e => setForm({ ...form, alternate_phone: e.target.value })}
                                        onBlur={e => setForm({ ...form, alternate_phone: normalizeKenyanPhone(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Occupation</label>
                                    <input className="form-input" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">National ID</label>
                                    <input className="form-input" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.first_name.trim() || !form.last_name.trim() || (!selectedGuardian && !form.student_id)}>
                                {saving ? <span className="spinner" /> : 'Save Guardian'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
