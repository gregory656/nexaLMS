import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, X, Download } from 'lucide-react';

export default function StudentsPage() {
    const { school } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [houses, setHouses] = useState<any[]>([]);
    const [guardians, setGuardians] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    const blankForm = {
        first_name: '', last_name: '', other_names: '', gender: '',
        date_of_birth: '', class_id: '', house_id: '', guardian_name: '',
        guardian_phone: '', guardian_email: '', guardian_relationship: 'guardian',
        admission_number: '', previous_school: '', medical_info: '',
        special_needs: '', nationality: 'Kenyan', religion: '',
    };
    const [form, setForm] = useState(blankForm);
    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [stuRes, clsRes, housRes, guardRes] = await Promise.all([
            supabase.from('students').select('*, classes(name), houses(name), guardians(first_name, last_name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('houses').select('*').eq('school_id', school.id).order('name'),
            supabase.from('guardians').select('*').eq('school_id', school.id).order('first_name'),
        ]);
        setStudents(stuRes.data || []);
        setClasses(clsRes.data || []);
        setHouses(housRes.data || []);
        setGuardians(guardRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        if (!form.first_name.trim()) return;
        setSaving(true);

        try {
            let guardian_id = null;

            // Create/link guardian if name is provided
            if (form.guardian_name.trim()) {
                const names = form.guardian_name.trim().split(' ');
                const gFirst = names[0] || '';
                const gLast = names.slice(1).join(' ') || '';

                // Check if guardian exists
                const existing = guardians.find(g =>
                    g.first_name.toLowerCase() === gFirst.toLowerCase() &&
                    g.last_name.toLowerCase() === gLast.toLowerCase()
                );

                if (existing) {
                    guardian_id = existing.id;
                    // Update guardian contact if provided
                    if (form.guardian_phone || form.guardian_email) {
                        await supabase.from('guardians').update({
                            phone: form.guardian_phone || existing.phone,
                            email: form.guardian_email || existing.email,
                            relationship: form.guardian_relationship || existing.relationship,
                        }).eq('id', existing.id);
                    }
                } else {
                    const { data: newGuardian } = await supabase.from('guardians').insert({
                        school_id: school!.id,
                        first_name: gFirst,
                        last_name: gLast,
                        phone: form.guardian_phone,
                        email: form.guardian_email,
                        relationship: form.guardian_relationship as any,
                    }).select().single();
                    guardian_id = newGuardian?.id;
                }
            }

            const studentData = {
                school_id: school!.id,
                first_name: form.first_name,
                last_name: form.last_name,
                other_names: form.other_names || null,
                gender: form.gender || null,
                date_of_birth: form.date_of_birth || null,
                class_id: form.class_id || null,
                house_id: form.house_id || null,
                guardian_id,
                admission_number: form.admission_number || null,
                previous_school: form.previous_school || null,
                medical_info: form.medical_info || null,
                special_needs: form.special_needs || null,
                nationality: form.nationality || 'Kenyan',
                religion: form.religion || null,
            };

            if (editingStudent) {
                await supabase.from('students').update(studentData).eq('id', editingStudent.id);
            } else {
                const { data: newStudent } = await supabase.from('students').insert(studentData).select().single();

                // Create student-guardian relationship too
                if (guardian_id && newStudent) {
                    await supabase.from('student_guardians').insert({
                        student_id: newStudent.id,
                        guardian_id,
                        is_primary: true,
                    });
                }
            }

            setShowModal(false);
            setForm(blankForm);
            setEditingStudent(null);
            await fetchAll();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (student: any) => {
        setEditingStudent(student);
        setForm({
            first_name: student.first_name || '',
            last_name: student.last_name || '',
            other_names: student.other_names || '',
            gender: student.gender || '',
            date_of_birth: student.date_of_birth || '',
            class_id: student.class_id || '',
            house_id: student.house_id || '',
            guardian_name: student.guardians ? `${student.guardians.first_name} ${student.guardians.last_name}` : '',
            guardian_phone: '', guardian_email: '', guardian_relationship: 'guardian',
            admission_number: student.admission_number || '',
            previous_school: student.previous_school || '',
            medical_info: student.medical_info || '',
            special_needs: student.special_needs || '',
            nationality: student.nationality || 'Kenyan',
            religion: student.religion || '',
        });
        setShowModal(true);
        setMenuOpen(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to remove this student?')) {
            await supabase.from('students').delete().eq('id', id);
            await fetchAll();
        }
        setMenuOpen(null);
    };

    const filtered = students.filter(s => {
        const matchesSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = !filterClass || s.class_id === filterClass;
        const matchesGender = !filterGender || s.gender === filterGender;
        return matchesSearch && matchesClass && matchesGender;
    });

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Students</h1>
                    <p className="page-subtitle">{students.length} students enrolled</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm">
                        <Download size={16} /> Export
                    </button>
                    <button className="btn btn-primary" onClick={() => { setEditingStudent(null); setForm(blankForm); setShowModal(true); }} id="btn-add-student">
                        <Plus size={18} /> New Student
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-4">
                <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
                    <div className="header-search" style={{ maxWidth: '280px' }}>
                        <Search />
                        <input
                            type="text"
                            placeholder="Search students…"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="form-select" style={{ width: 'auto', minWidth: '160px' }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                        <option value="">All Classes</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: '130px' }} value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                        <option value="">All Genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                    <Filter size={16} style={{ color: 'var(--gray-400)' }} />
                </div>
            </div>

            {/* Table */}
            <div className="card">
                {loading ? (
                    <div className="flex justify-center" style={{ padding: '3rem' }}>
                        <span className="spinner" style={{ width: 32, height: 32 }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <h3>No students found</h3>
                        <p>Add students using the "New Student" button above</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Adm No.</th>
                                    <th>Gender</th>
                                    <th>Class</th>
                                    <th>House</th>
                                    <th>Guardian</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s, i) => (
                                    <tr key={s.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{s.first_name} {s.last_name}</strong></td>
                                        <td>{s.admission_number || '—'}</td>
                                        <td>{s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : '—'}</td>
                                        <td>{s.classes?.name || '—'}</td>
                                        <td>{s.houses?.name || '—'}</td>
                                        <td>{s.guardians ? `${s.guardians.first_name} ${s.guardians.last_name}` : '—'}</td>
                                        <td><span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-red'}`}>{s.status}</span></td>
                                        <td>
                                            <div className="dropdown">
                                                <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(menuOpen === s.id ? null : s.id)}>
                                                    <MoreVertical size={16} />
                                                </button>
                                                {menuOpen === s.id && (
                                                    <div className="dropdown-menu">
                                                        <button className="dropdown-item" onClick={() => handleEdit(s)}>
                                                            <Edit2 size={14} /> Edit
                                                        </button>
                                                        <button className="dropdown-item" onClick={() => handleDelete(s.id)} style={{ color: 'var(--danger)' }}>
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

            {/* Add/Edit Student Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingStudent ? 'Edit Student' : '🎓 New Student'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--green-700)' }}>Personal Information</h4>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input className="form-input" placeholder="e.g. Gregory" value={form.first_name} onChange={e => update('first_name', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name *</label>
                                    <input className="form-input" placeholder="e.g. Mwangi" value={form.last_name} onChange={e => update('last_name', e.target.value)} required />
                                </div>
                            </div>
                            <div className="grid-3">
                                <div className="form-group">
                                    <label className="form-label">Gender</label>
                                    <select className="form-select" value={form.gender} onChange={e => update('gender', e.target.value)}>
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input className="form-input" type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Adm Number</label>
                                    <input className="form-input" placeholder="e.g. 2026/001" value={form.admission_number} onChange={e => update('admission_number', e.target.value)} />
                                </div>
                            </div>

                            <h4 className="text-sm font-semibold mb-2 mt-4" style={{ color: 'var(--green-700)' }}>Academic Placement</h4>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Class (e.g. Form 1G)</label>
                                    <select className="form-select" value={form.class_id} onChange={e => update('class_id', e.target.value)}>
                                        <option value="">Select Class</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    {classes.length === 0 && <p className="form-hint">⚠️ Create streams & classes first</p>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">House (e.g. Muthaiga B)</label>
                                    <select className="form-select" value={form.house_id} onChange={e => update('house_id', e.target.value)}>
                                        <option value="">Select House</option>
                                        {houses.map(h => (
                                            <option key={h.id} value={h.id}>{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <h4 className="text-sm font-semibold mb-2 mt-4" style={{ color: 'var(--green-700)' }}>Guardian / Parent</h4>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Guardian Name</label>
                                    <input className="form-input" placeholder="e.g. Steve Mwangi" value={form.guardian_name} onChange={e => update('guardian_name', e.target.value)} />
                                    <p className="form-hint">Auto-links to Guardians section</p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Relationship</label>
                                    <select className="form-select" value={form.guardian_relationship} onChange={e => update('guardian_relationship', e.target.value)}>
                                        <option value="father">Father</option>
                                        <option value="mother">Mother</option>
                                        <option value="guardian">Guardian</option>
                                        <option value="uncle">Uncle</option>
                                        <option value="aunt">Aunt</option>
                                        <option value="grandparent">Grandparent</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Guardian Phone</label>
                                    <input className="form-input" placeholder="+254 712 345 678" value={form.guardian_phone} onChange={e => update('guardian_phone', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Guardian Email</label>
                                    <input className="form-input" type="email" placeholder="guardian@email.com" value={form.guardian_email} onChange={e => update('guardian_email', e.target.value)} />
                                </div>
                            </div>

                            <h4 className="text-sm font-semibold mb-2 mt-4" style={{ color: 'var(--green-700)' }}>Additional Info</h4>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Nationality</label>
                                    <input className="form-input" value={form.nationality} onChange={e => update('nationality', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Religion</label>
                                    <input className="form-input" placeholder="e.g. Christian" value={form.religion} onChange={e => update('religion', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Previous School</label>
                                <input className="form-input" placeholder="School attended before" value={form.previous_school} onChange={e => update('previous_school', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Medical Information</label>
                                <textarea className="form-textarea" placeholder="Allergies, conditions, etc." value={form.medical_info} onChange={e => update('medical_info', e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.first_name.trim()}>
                                {saving ? <span className="spinner" /> : editingStudent ? 'Update Student' : 'Add Student'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
