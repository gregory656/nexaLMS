import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { isValidKenyanPhone, normalizeKenyanPhone } from '../../lib/phone';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { createPdfWithHeader, addTableToPdf, downloadPdf, downloadCsv } from '../../lib/pdf';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, X, Download, Upload, Camera } from 'lucide-react';
import * as XLSX from 'xlsx';
import HelpIcon from '../../components/ui/HelpIcon';

export default function StudentsPage() {
    const { school } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [houses, setHouses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [guardians, setGuardians] = useState<any[]>([]);
    const [gradeLevels, setGradeLevels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    // Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [importColumns, setImportColumns] = useState<string[]>([]);
    const [importMapping, setImportMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Download state
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [dlScope, setDlScope] = useState('all');
    const [dlGradeLevel, setDlGradeLevel] = useState('');
    const [dlClass, setDlClass] = useState('');
    const [dlGender, setDlGender] = useState('');
    const [dlFormat, setDlFormat] = useState('pdf');

    // Profile pic
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [profilePicPreview, setProfilePicPreview] = useState('');
    const profilePicRef = useRef<HTMLInputElement>(null);

    const blankForm = {
        first_name: '', last_name: '', other_names: '', gender: '',
        date_of_birth: '', admission_date: '', class_id: '', house_id: '', guardian_name: '',
        guardian_phone: '', guardian_email: '', guardian_relationship: 'guardian',
        admission_number: '', previous_school: '', medical_info: '',
        special_needs: '', nationality: 'Kenyan', religion: '',
    };
    const [form, setForm] = useState(blankForm);
    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [stuRes, clsRes, housRes, subjRes, guardRes, glRes] = await Promise.all([
            supabase.from('students').select('*, classes(name), houses(name), guardians(first_name, last_name)').eq('school_id', school.id).order('created_at', { ascending: false }),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('houses').select('*').eq('school_id', school.id).order('name'),
            supabase.from('subjects').select('*').eq('school_id', school.id).order('name'),
            supabase.from('guardians').select('*').eq('school_id', school.id).order('first_name'),
            supabase.from('grade_levels').select('*').eq('school_id', school.id).order('level_order'),
        ]);
        [stuRes.error, clsRes.error, housRes.error, subjRes.error, guardRes.error, glRes.error].filter(Boolean).forEach(error => toast.error(error!.message));
        setStudents(stuRes.data || []);
        setClasses(clsRes.data || []);
        setHouses(housRes.data || []);
        setSubjects(subjRes.data || []);
        setGuardians(guardRes.data || []);
        setGradeLevels(glRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const canAddStudents = classes.length > 0 && houses.length > 0 && subjects.length > 0;

    // ─── PROFILE PIC HANDLING ───
    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
        setProfilePicFile(file);
        setProfilePicPreview(URL.createObjectURL(file));
    };

    // ─── SAVE ───
    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) return;
        if (!canAddStudents) {
            toast.error('Set up subjects, houses, streams, and classes before adding students.');
            return;
        }
        if (!form.class_id || !form.house_id) {
            toast.error('Select a class and house for this student.');
            return;
        }
        if (form.guardian_phone && !isValidKenyanPhone(form.guardian_phone)) {
            toast.error('Use a valid Kenyan phone number, e.g. +254712345678.');
            return;
        }
        setSaving(true);

        try {
            let guardian_id = null;

            if (form.guardian_name.trim()) {
                const names = form.guardian_name.trim().split(' ');
                const gFirst = names[0] || '';
                const gLast = names.slice(1).join(' ') || '';
                const guardianPhone = normalizeKenyanPhone(form.guardian_phone);

                const existing = guardians.find(g =>
                    g.first_name.toLowerCase() === gFirst.toLowerCase() &&
                    g.last_name.toLowerCase() === gLast.toLowerCase() &&
                    (!guardianPhone || !g.phone || g.phone === guardianPhone)
                );

                if (existing) {
                    guardian_id = existing.id;
                    if (guardianPhone || form.guardian_email) {
                        const { error } = await supabase.from('guardians').update({
                            phone: guardianPhone || existing.phone,
                            email: form.guardian_email || existing.email,
                            relationship: form.guardian_relationship || existing.relationship,
                        }).eq('id', existing.id);
                        if (error) throw error;
                    }
                } else {
                    const { data: newGuardian, error } = await supabase.from('guardians').insert({
                        school_id: school!.id,
                        first_name: gFirst,
                        last_name: gLast,
                        phone: guardianPhone || null,
                        email: form.guardian_email,
                        relationship: form.guardian_relationship as any,
                    }).select().single();
                    if (error) throw error;
                    guardian_id = newGuardian?.id;
                }
            }

            // Upload profile picture if provided
            let profile_picture_url = editingStudent?.profile_picture_url || null;
            if (profilePicFile) {
                try {
                    const result = await uploadToCloudinary(profilePicFile, 'nexalms/students');
                    profile_picture_url = result.url;
                } catch (err: any) {
                    toast.error('Failed to upload profile picture: ' + (err.message || ''));
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
                admission_date: form.admission_date || null,
                previous_school: form.previous_school || null,
                medical_info: form.medical_info || null,
                special_needs: form.special_needs || null,
                nationality: form.nationality || 'Kenyan',
                religion: form.religion || null,
                profile_picture_url,
            };

            if (editingStudent) {
                const { error } = await supabase.from('students').update(studentData).eq('id', editingStudent.id);
                if (error) throw error;
                if (guardian_id) {
                    const { error: linkError } = await supabase.from('student_guardians').upsert({
                        student_id: editingStudent.id,
                        guardian_id,
                        is_primary: true,
                    }, { onConflict: 'student_id,guardian_id' });
                    if (linkError) console.warn('Could not write student_guardians link', linkError);
                }
            } else {
                const { data: newStudent, error } = await supabase.from('students').insert(studentData).select().single();
                if (error) throw error;

                if (guardian_id && newStudent) {
                    const { error: linkError } = await supabase.from('student_guardians').upsert({
                        student_id: newStudent.id,
                        guardian_id,
                        is_primary: true,
                    }, { onConflict: 'student_id,guardian_id' });
                    if (linkError) console.warn('Could not write student_guardians link', linkError);
                }
            }

            toast.success(editingStudent ? 'Student updated' : 'Student saved');
            setShowModal(false);
            setForm(blankForm);
            setEditingStudent(null);
            setProfilePicFile(null);
            setProfilePicPreview('');
            await fetchAll();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save student');
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
            admission_date: student.admission_date || '',
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
        setProfilePicPreview(student.profile_picture_url || '');
        setProfilePicFile(null);
        setShowModal(true);
        setMenuOpen(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to remove this student?')) {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) toast.error(error.message);
            else {
                toast.success('Student removed');
                await fetchAll();
            }
        }
        setMenuOpen(null);
    };

    // ─── IMPORT FROM EXCEL/PDF ───
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = new Uint8Array(ev.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

                if (jsonData.length === 0) {
                    toast.error('No data found in file');
                    return;
                }

                const cols = Object.keys(jsonData[0] as any);
                setImportColumns(cols);
                setImportData(jsonData);

                // Auto-map columns
                const autoMap: Record<string, string> = {};
                const fieldMap: Record<string, string[]> = {
                    first_name: ['first name', 'firstname', 'first_name', 'fname', 'given name'],
                    last_name: ['last name', 'lastname', 'last_name', 'lname', 'surname', 'family name'],
                    gender: ['gender', 'sex'],
                    admission_number: ['adm no', 'admission number', 'admission_number', 'adm', 'adm_no', 'reg no', 'registration'],
                    date_of_birth: ['dob', 'date of birth', 'date_of_birth', 'birth date', 'birthday'],
                    guardian_name: ['guardian', 'parent', 'guardian name', 'parent name', 'guardian_name'],
                    guardian_phone: ['guardian phone', 'parent phone', 'phone', 'tel', 'guardian_phone'],
                    nationality: ['nationality', 'country'],
                    religion: ['religion'],
                    previous_school: ['previous school', 'previous_school', 'former school'],
                };

                cols.forEach(col => {
                    const lc = col.toLowerCase().trim();
                    for (const [field, keywords] of Object.entries(fieldMap)) {
                        if (keywords.some(k => lc.includes(k) || lc === k)) {
                            if (!autoMap[field]) autoMap[field] = col;
                        }
                    }
                });

                setImportMapping(autoMap);
                setShowImportModal(true);
                toast.success(`Found ${jsonData.length} records with ${cols.length} columns`);
            } catch (err: any) {
                toast.error('Failed to read file: ' + (err.message || 'Unknown error'));
            }
        };
        reader.readAsArrayBuffer(file);
        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImportSave = async () => {
        if (!importMapping.first_name || !importMapping.last_name) {
            toast.error('Map at least First Name and Last Name columns');
            return;
        }
        setImporting(true);
        let success = 0, failed = 0;

        for (const row of importData) {
            try {
                const firstName = String(row[importMapping.first_name] || '').trim();
                const lastName = String(row[importMapping.last_name] || '').trim();
                if (!firstName || !lastName) { failed++; continue; }

                const gender = importMapping.gender ? String(row[importMapping.gender] || '').toLowerCase() : '';
                const validGender = ['male', 'female', 'other'].includes(gender) ? gender : (gender.startsWith('m') ? 'male' : gender.startsWith('f') ? 'female' : null);

                const studentData: any = {
                    school_id: school!.id,
                    first_name: firstName,
                    last_name: lastName,
                    gender: validGender,
                    admission_number: importMapping.admission_number ? String(row[importMapping.admission_number] || '') || null : null,
                    date_of_birth: importMapping.date_of_birth ? String(row[importMapping.date_of_birth] || '') || null : null,
                    nationality: importMapping.nationality ? String(row[importMapping.nationality] || 'Kenyan') : 'Kenyan',
                    religion: importMapping.religion ? String(row[importMapping.religion] || '') || null : null,
                    previous_school: importMapping.previous_school ? String(row[importMapping.previous_school] || '') || null : null,
                    class_id: classes.length > 0 ? classes[0].id : null,
                    house_id: houses.length > 0 ? houses[0].id : null,
                };

                const { error } = await supabase.from('students').insert(studentData);
                if (error) { failed++; console.warn('Import error:', error.message); }
                else success++;
            } catch { failed++; }
        }

        toast.success(`Imported ${success} students${failed > 0 ? ` (${failed} failed)` : ''}`);
        setShowImportModal(false);
        setImportData([]);
        setImporting(false);
        await fetchAll();
    };

    // ─── DOWNLOAD ───
    const handleDownload = async () => {
        let downloadStudents = [...students];

        // Filter based on scope
        if (dlScope === 'grade' && dlGradeLevel) {
            const gradeClasses = classes.filter(c => c.grade_level_id === dlGradeLevel).map(c => c.id);
            downloadStudents = downloadStudents.filter(s => gradeClasses.includes(s.class_id));
        } else if (dlScope === 'class' && dlClass) {
            downloadStudents = downloadStudents.filter(s => s.class_id === dlClass);
        }

        // Gender filter
        if (dlGender) {
            downloadStudents = downloadStudents.filter(s => s.gender === dlGender);
        }

        if (downloadStudents.length === 0) {
            toast.error('No students found for the selected criteria');
            return;
        }

        const scopeLabel = dlScope === 'all' ? 'All Students' :
            dlScope === 'grade' ? `${gradeLevels.find(g => g.id === dlGradeLevel)?.name || 'Grade'} Students` :
                `${classes.find(c => c.id === dlClass)?.name || 'Class'} Students`;
        const genderLabel = dlGender ? ` (${dlGender === 'male' ? 'Boys' : 'Girls'})` : '';
        const title = `${scopeLabel}${genderLabel}`;

        const headers = ['#', 'Name', 'Adm No.', 'Gender', 'Class', 'House', 'Guardian', 'Status'];
        const rows = downloadStudents.map((s, i) => [
            String(i + 1),
            `${s.first_name} ${s.last_name}`,
            s.admission_number || '—',
            s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : '—',
            s.classes?.name || '—',
            s.houses?.name || '—',
            s.guardians ? `${s.guardians.first_name} ${s.guardians.last_name}` : '—',
            s.status || 'active',
        ]);

        if (dlFormat === 'csv') {
            downloadCsv(headers, rows, `students_${dlScope}_${Date.now()}`);
            toast.success('CSV downloaded');
        } else {
            const doc = await createPdfWithHeader({
                title,
                subtitle: `Total: ${downloadStudents.length} students — Generated ${new Date().toLocaleDateString('en-GB')}`,
                schoolName: school?.name || '',
                schoolMotto: school?.motto || '',
                logoUrl: school?.logo_url || '',
                watermarkUrl: school?.watermark_url || school?.logo_url || '',
            });
            addTableToPdf(doc, headers, rows);
            downloadPdf(doc, `students_${dlScope}_${Date.now()}`);
            toast.success('PDF downloaded');
        }
        setShowDownloadModal(false);
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
                    <HelpIcon section="students" />
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                        onChange={handleFileImport}
                    />
                    <button className="btn btn-download btn-sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} /> Import
                    </button>
                    <button className="btn btn-download btn-sm" onClick={() => setShowDownloadModal(true)}>
                        <Download size={16} /> Download
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            if (!canAddStudents) {
                                toast.error('Set up subjects, houses, streams, and classes before adding students.');
                                return;
                            }
                            setEditingStudent(null);
                            setForm({ ...blankForm, admission_date: new Date().toISOString().slice(0, 10) });
                            setProfilePicFile(null);
                            setProfilePicPreview('');
                            setShowModal(true);
                        }}
                        id="btn-add-student"
                    >
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
                {!canAddStudents && !loading && (
                    <div className="form-error mb-4">
                        Set up at least one subject, house, stream, and class before admitting students.
                    </div>
                )}
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
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {s.profile_picture_url ? (
                                                    <img src={s.profile_picture_url} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                                                ) : null}
                                                <strong>{s.first_name} {s.last_name}</strong>
                                            </div>
                                        </td>
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
                            {/* Profile Picture Upload */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div
                                    onClick={() => profilePicRef.current?.click()}
                                    style={{
                                        width: 80, height: 80, borderRadius: 8, border: '2px dashed var(--gray-300)',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', background: 'var(--gray-50)', flexShrink: 0,
                                    }}
                                    title="Click to upload profile picture"
                                >
                                    {profilePicPreview ? (
                                        <img src={profilePicPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <Camera size={24} style={{ color: 'var(--gray-400)' }} />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Profile Picture</p>
                                    <p className="text-xs text-muted">Optional — Click to upload (max 5MB)</p>
                                </div>
                                <input
                                    type="file"
                                    ref={profilePicRef}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleProfilePicChange}
                                />
                            </div>

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
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Date Admitted</label>
                                    <input className="form-input" type="date" value={form.admission_date} onChange={e => update('admission_date', e.target.value)} />
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
                                    <input
                                        className="form-input"
                                        placeholder="+254712345678"
                                        value={form.guardian_phone}
                                        onChange={e => update('guardian_phone', e.target.value)}
                                        onBlur={e => update('guardian_phone', normalizeKenyanPhone(e.target.value))}
                                    />
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
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.first_name.trim() || !form.last_name.trim() || !form.class_id || !form.house_id}>
                                {saving ? <span className="spinner" /> : editingStudent ? 'Update Student' : 'Add Student'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">📁 Import Students from File</h3>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-muted mb-4">
                                Found <strong>{importData.length}</strong> records with <strong>{importColumns.length}</strong> columns.
                                Map your file columns to student fields below.
                            </p>
                            {['first_name', 'last_name', 'gender', 'admission_number', 'date_of_birth', 'guardian_name', 'guardian_phone', 'nationality', 'religion'].map(field => (
                                <div key={field} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <label className="form-label" style={{ width: 140, marginBottom: 0, textTransform: 'capitalize' }}>
                                        {field.replace(/_/g, ' ')} {['first_name', 'last_name'].includes(field) ? '*' : ''}
                                    </label>
                                    <select
                                        className="form-select"
                                        style={{ flex: 1 }}
                                        value={importMapping[field] || ''}
                                        onChange={e => setImportMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                    >
                                        <option value="">— Skip —</option>
                                        {importColumns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                            <p className="form-hint mt-2">Students will be assigned to the first available class and house. You can reassign them after import.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleImportSave} disabled={importing || !importMapping.first_name || !importMapping.last_name}>
                                {importing ? <span className="spinner" /> : `Import ${importData.length} Students`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download Modal */}
            {showDownloadModal && (
                <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">📥 Download Student List</h3>
                            <button className="modal-close" onClick={() => setShowDownloadModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">What do you want to download?</label>
                                <select className="form-select" value={dlScope} onChange={e => { setDlScope(e.target.value); setDlGradeLevel(''); setDlClass(''); }}>
                                    <option value="all">All Students in the School</option>
                                    <option value="grade">Students by Grade Level</option>
                                    <option value="class">Students by Specific Class</option>
                                </select>
                            </div>
                            {dlScope === 'grade' && (
                                <div className="form-group">
                                    <label className="form-label">Select Grade Level</label>
                                    <select className="form-select" value={dlGradeLevel} onChange={e => setDlGradeLevel(e.target.value)}>
                                        <option value="">Choose Grade</option>
                                        {gradeLevels.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {dlScope === 'class' && (
                                <div className="form-group">
                                    <label className="form-label">Select Class</label>
                                    <select className="form-select" value={dlClass} onChange={e => setDlClass(e.target.value)}>
                                        <option value="">Choose Class</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Gender Filter</label>
                                <select className="form-select" value={dlGender} onChange={e => setDlGender(e.target.value)}>
                                    <option value="">All Students</option>
                                    <option value="male">Boys Only</option>
                                    <option value="female">Girls Only</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Format</label>
                                <select className="form-select" value={dlFormat} onChange={e => setDlFormat(e.target.value)}>
                                    <option value="pdf">PDF Document</option>
                                    <option value="csv">CSV Spreadsheet</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDownloadModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleDownload}>
                                <Download size={16} /> Download
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
