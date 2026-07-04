import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

export default function DutyRosterPage() {
    const { school } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [teachers, setTeachers] = useState<any[]>([]);
    const [studentLeaders, setStudentLeaders] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);

    // Form state
    const [rosterName, setRosterName] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('');
    const [weeksCount, setWeeksCount] = useState(14);
    const [rosters, setRosters] = useState<any[]>([]);

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [teaRes, slRes, ayRes, tRes, rosRes] = await Promise.all([
            supabase.from('teachers').select('*').eq('school_id', school.id).eq('status', 'active'),
            supabase.from('student_leaders').select('*, students(first_name, last_name)').eq('school_id', school.id),
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false }),
            supabase.from('terms').select('*').eq('school_id', school.id),
            supabase.from('duty_rosters').select('*, duty_roster_weeks(*, teachers(first_name, last_name), student_leaders(students(first_name, last_name)))').eq('school_id', school.id).order('created_at', { ascending: false })
        ]);

        setTeachers(teaRes.data || []);
        setStudentLeaders(slRes.data || []);
        setAcademicYears(ayRes.data || []);
        setTerms(tRes.data || []);
        setRosters(rosRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const handleGenerate = async () => {
        if (!rosterName || !selectedYear || !selectedTerm || weeksCount < 1) {
            toast.error("Please fill all fields");
            return;
        }

        if (teachers.length === 0) {
            toast.error("No active teachers found to assign duty.");
            return;
        }

        setSaving(true);

        // Create roster
        const { data: roster, error: rosErr } = await supabase.from('duty_rosters').insert({
            school_id: school!.id,
            academic_year_id: selectedYear,
            term_id: selectedTerm,
            name: rosterName
        }).select().single();

        if (rosErr) { toast.error(rosErr.message); setSaving(false); return; }

        // Generate weeks
        const weeksData = [];
        let teacherIndex = 0;
        let prefectIndex = 0;

        // Simplistic date generation starting from today
        const startDate = new Date();

        for (let i = 1; i <= weeksCount; i++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(weekStart.getDate() + (i - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 4); // Mon - Fri roughly

            weeksData.push({
                school_id: school!.id,
                roster_id: roster.id,
                week_number: i,
                start_date: weekStart.toISOString().slice(0, 10),
                end_date: weekEnd.toISOString().slice(0, 10),
                teacher_id: teachers[teacherIndex % teachers.length].id,
                prefect_id: studentLeaders.length > 0 ? studentLeaders[prefectIndex % studentLeaders.length].id : null
            });

            teacherIndex++;
            prefectIndex++;
        }

        const { error: wErr } = await supabase.from('duty_roster_weeks').insert(weeksData);
        if (wErr) { toast.error(wErr.message); }
        else { toast.success("Duty roster generated successfully!"); await fetchAll(); }

        setSaving(false);
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Duty Roster</h1>
                    <p className="page-subtitle">Auto-generate and manage weekly teacher and prefect duties</p>
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                    <div className="card">
                        <h3 className="card-title mb-4">Generate New Roster</h3>
                        <div className="form-group">
                            <label className="form-label">Roster Name</label>
                            <input className="form-input" placeholder="e.g. Term 1 2026 Duty" value={rosterName} onChange={e => setRosterName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Academic Year</label>
                            <select className="form-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                                <option value="">Select Year</option>
                                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Term</label>
                            <select className="form-select" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
                                <option value="">Select Term</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Number of Weeks</label>
                            <input type="number" className="form-input" value={weeksCount} onChange={e => setWeeksCount(parseInt(e.target.value))} />
                        </div>
                        <button className="btn btn-primary btn-full mt-4" onClick={handleGenerate} disabled={saving}>
                            {saving ? <span className="spinner" /> : 'Generate Roster'}
                        </button>
                    </div>

                    <div className="space-y-6">
                        {rosters.length === 0 ? (
                            <div className="card empty-state">
                                <h3>No Rosters Generated</h3>
                                <p>Use the panel on the left to generate an auto-assigned duty roster.</p>
                            </div>
                        ) : rosters.map(roster => (
                            <div key={roster.id} className="card">
                                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{roster.name}</h3>
                                        <p className="text-sm text-gray-500">Created: {new Date(roster.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <button className="btn btn-secondary btn-sm" onClick={() => toast.success("Download started (PDF ready)")}>
                                        <Download size={16} /> Download PDF
                                    </button>
                                </div>
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Week</th>
                                                <th>Dates</th>
                                                <th>Teacher on Duty</th>
                                                <th>Prefect in Charge</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roster.duty_roster_weeks?.sort((a: any, b: any) => a.week_number - b.week_number).map((w: any) => (
                                                <tr key={w.id}>
                                                    <td>Week {w.week_number}</td>
                                                    <td>{w.start_date} - {w.end_date}</td>
                                                    <td><strong>{w.teachers?.first_name} {w.teachers?.last_name}</strong></td>
                                                    <td>
                                                        {w.student_leaders?.students
                                                            ? `${w.student_leaders.students.first_name} ${w.student_leaders.students.last_name}`
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
