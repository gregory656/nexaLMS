import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Download, Trash2 } from 'lucide-react';
import { addTableToPdf, createPdfWithHeader, downloadCsv, downloadPdf } from '../../lib/pdf';

export default function StudentLeadersPage() {
    const { school } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [leaders, setLeaders] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);

    // Form state
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [role, setRole] = useState('Prefect');

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [ldRes, stRes, ayRes] = await Promise.all([
            supabase.from('student_leaders').select('*, students(first_name, last_name, admission_number), academic_years(name)').eq('school_id', school.id),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active'),
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false })
        ]);

        setLeaders(ldRes.data || []);
        setStudents(stRes.data || []);
        setAcademicYears(ayRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const handleAssign = async () => {
        if (!selectedStudent || !selectedYear || !role) {
            toast.error("Please fill all fields");
            return;
        }

        setSaving(true);

        const { error } = await supabase.from('student_leaders').insert({
            school_id: school!.id,
            student_id: selectedStudent,
            academic_year_id: selectedYear,
            role: role
        });

        if (error) { toast.error(error.message); }
        else {
            toast.success("Student appointed to leadership role");
            setSelectedStudent('');
            await fetchAll();
        }

        setSaving(false);
    };

    const handleRemove = async (id: string) => {
        if (!confirm("Remove this student's leadership role?")) return;
        const { error } = await supabase.from('student_leaders').delete().eq('id', id);
        if (error) toast.error(error.message);
        else fetchAll();
    };

    const leaderRows = leaders.map((leader, index) => [
        String(index + 1),
        `${leader.students?.first_name || ''} ${leader.students?.last_name || ''}`.trim(),
        leader.students?.admission_number || '',
        leader.role || '',
        leader.academic_years?.name || '',
    ]);

    const handleDownloadCsv = () => {
        if (leaders.length === 0) {
            toast.error('No student leaders to download');
            return;
        }
        downloadCsv(['#', 'Student', 'Adm No.', 'Role', 'Academic Year'], leaderRows, `student_leaders_${Date.now()}`);
        toast.success('Student leaders CSV downloaded');
    };

    const handleDownloadPdf = async () => {
        if (leaders.length === 0) {
            toast.error('No student leaders to download');
            return;
        }

        const doc = await createPdfWithHeader({
            title: 'Student Leaders',
            subtitle: `Total: ${leaders.length} leaders`,
            schoolName: school?.name || 'School',
            schoolMotto: school?.motto,
            logoUrl: school?.logo_url,
            watermarkUrl: school?.watermark_url,
        });
        addTableToPdf(doc, ['#', 'Student', 'Adm No.', 'Role', 'Academic Year'], leaderRows);
        downloadPdf(doc, `student_leaders_${Date.now()}`);
        toast.success('Student leaders PDF downloaded');
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Student Leaders</h1>
                    <p className="page-subtitle">Appoint Head Boys, Head Girls, Prefects and Captains</p>
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                    <div className="card">
                        <h3 className="card-title mb-4">Appoint Leader</h3>
                        <div className="form-group">
                            <label className="form-label">Student</label>
                            <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                                <option value="">Select Student</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Academic Year</label>
                            <select className="form-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                                <option value="">Select Year</option>
                                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                                <option value="School Captain">School Captain</option>
                                <option value="Head Boy">Head Boy</option>
                                <option value="Head Girl">Head Girl</option>
                                <option value="Deputy Head Boy">Deputy Head Boy</option>
                                <option value="Deputy Head Girl">Deputy Head Girl</option>
                                <option value="Prefect">Prefect</option>
                                <option value="Class Monitor">Class Monitor</option>
                            </select>
                        </div>
                        <button className="btn btn-primary btn-full mt-4" onClick={handleAssign} disabled={saving}>
                            {saving ? <span className="spinner" /> : 'Appoint Leader'}
                        </button>
                    </div>

                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title text-lg font-bold">Appointed Leaders</h3>
                            <div className="flex gap-2">
                                <button className="btn btn-secondary btn-sm" onClick={handleDownloadCsv} disabled={leaders.length === 0}>
                                    <Download size={16} /> CSV
                                </button>
                                <button className="btn btn-download btn-sm" onClick={handleDownloadPdf} disabled={leaders.length === 0}>
                                    <Download size={16} /> PDF
                                </button>
                            </div>
                        </div>

                        {leaders.length === 0 ? (
                            <div className="empty-state">
                                <h3>No student leaders appointed</h3>
                                <p>Use the panel on the left to appoint students to leadership roles.</p>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Adm No.</th>
                                            <th>Role</th>
                                            <th>Academic Year</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaders.map(l => (
                                            <tr key={l.id}>
                                                <td><strong>{l.students?.first_name} {l.students?.last_name}</strong></td>
                                                <td>{l.students?.admission_number || '—'}</td>
                                                <td><span className="badge badge-blue">{l.role}</span></td>
                                                <td>{l.academic_years?.name}</td>
                                                <td className="text-right">
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRemove(l.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
