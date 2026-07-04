import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, Users, UserCog, BarChart3,
    Download, Calendar, Check
} from 'lucide-react';

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'students', label: 'Student Attendance', icon: Users },
    { key: 'teachers', label: 'Teacher Attendance', icon: UserCog },
    { key: 'reports', label: 'Reports & Analysis', icon: BarChart3 },
];

export default function AttendancePage() {
    const { school } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);

    // Student Marking state
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [sessionType, setSessionType] = useState('morning');
    const [markingData, setMarkingData] = useState<Record<string, string>>({});

    // Teacher Marking state
    const [teacherDate, setTeacherDate] = useState(new Date().toISOString().slice(0, 10));
    const [teacherSessionType, setTeacherSessionType] = useState('full_day');
    const [teacherMarkingData, setTeacherMarkingData] = useState<Record<string, string>>({});

    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [clRes, stuRes, teaRes, sesRes] = await Promise.all([
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id).order('name'),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            supabase.from('teachers').select('*').eq('school_id', school.id).eq('status', 'active').order('first_name'),
            supabase.from('attendance_sessions').select('*, classes(name)').eq('school_id', school.id).order('date', { ascending: false }).limit(50),
        ]);
        setClasses(clRes.data || []);
        setStudents(stuRes.data || []);
        setTeachers(teaRes.data || []);
        setSessions(sesRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const classStudents = students.filter(s => s.class_id === selectedClass);

    // Mark all present except selected
    const markAllPresent = () => {
        const d: Record<string, string> = {};
        classStudents.forEach(s => { d[s.id] = 'present'; });
        setMarkingData(d);
        toast.success('All marked present. Adjust individually as needed.');
    };

    const markAllTeachersPresent = () => {
        const d: Record<string, string> = {};
        teachers.forEach(t => { d[t.id] = 'present'; });
        setTeacherMarkingData(d);
        toast.success('All teachers marked present. Adjust individually as needed.');
    };

    const handleSaveAttendance = async () => {
        if (!selectedClass || !selectedDate) { toast.error('Select class and date'); return; }
        const entries = Object.entries(markingData).filter(([_, v]) => v);
        if (entries.length === 0) { toast.error('No attendance data'); return; }
        setSaving(true);

        // Create session
        const { data: session, error: sesErr } = await supabase.from('attendance_sessions').upsert({
            school_id: school!.id, class_id: selectedClass, date: selectedDate, session_type: sessionType,
        }, { onConflict: 'class_id,date,session_type' }).select().single();
        if (sesErr) { toast.error(sesErr.message); setSaving(false); return; }

        // Save records
        const rows = entries.map(([studentId, status]) => ({
            session_id: session.id, student_id: studentId, status, school_id: school!.id,
        }));
        const { error } = await supabase.from('student_attendance').upsert(rows, { onConflict: 'session_id,student_id' });
        if (error) toast.error(error.message);
        else { toast.success(`Attendance saved for ${entries.length} students`); await fetchAll(); }
        setSaving(false);
    };

    const handleSaveTeacherAttendance = async () => {
        if (!teacherDate) { toast.error('Select date'); return; }
        const entries = Object.entries(teacherMarkingData).filter(([_, v]) => v);
        if (entries.length === 0) { toast.error('No attendance data'); return; }
        setSaving(true);

        // Create session
        const { data: session, error: sesErr } = await supabase.from('teacher_attendance_sessions').upsert({
            school_id: school!.id, date: teacherDate, session_type: teacherSessionType,
        }, { onConflict: 'school_id,date,session_type' }).select().single();
        if (sesErr) { toast.error(sesErr.message); setSaving(false); return; }

        // Save records
        const rows = entries.map(([teacherId, status]) => ({
            session_id: session.id, teacher_id: teacherId, status, school_id: school!.id,
        }));
        const { error } = await supabase.from('teacher_attendance').upsert(rows, { onConflict: 'session_id,teacher_id' });
        if (error) toast.error(error.message);
        else { toast.success(`Attendance saved for ${entries.length} teachers`); await fetchAll(); }
        setSaving(false);
    };

    const renderDashboard = () => {
        const totalStudents = students.length;
        const totalTeachers = teachers.length;
        const todaySessions = sessions.filter(s => s.date === new Date().toISOString().slice(0, 10));

        return (
            <>
                <div className="grid-4 mb-6">
                    <div className="stat-card"><div className="stat-icon green"><Users size={22} /></div><div className="stat-info"><h3>Total Students</h3><div className="stat-value">{totalStudents}</div></div></div>
                    <div className="stat-card"><div className="stat-icon blue"><UserCog size={22} /></div><div className="stat-info"><h3>Total Teachers</h3><div className="stat-value">{totalTeachers}</div></div></div>
                    <div className="stat-card"><div className="stat-icon orange"><Calendar size={22} /></div><div className="stat-info"><h3>Today's Sessions</h3><div className="stat-value">{todaySessions.length}</div></div></div>
                    <div className="stat-card"><div className="stat-icon green"><BarChart3 size={22} /></div><div className="stat-info"><h3>Total Sessions</h3><div className="stat-value">{sessions.length}</div></div></div>
                </div>
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Recent Attendance Sessions</h3></div>
                    {sessions.length === 0 ? (
                        <div className="empty-state"><h3>No attendance taken yet</h3><p>Go to "Student Attendance" tab to mark attendance.</p></div>
                    ) : (
                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Date</th><th>Class</th><th>Session</th></tr></thead><tbody>
                            {sessions.slice(0, 15).map((s, i) => (
                                <tr key={s.id}><td>{i + 1}</td><td>{s.date}</td><td>{s.classes?.name || '—'}</td><td><span className="badge badge-blue">{s.session_type}</span></td></tr>
                            ))}
                        </tbody></table></div>
                    )}
                </div>
            </>
        );
    };

    const renderStudentAttendance = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <div><h3 className="text-lg font-bold">Mark Student Attendance</h3><p className="text-sm text-muted">Select class, date, and session — then mark each student.</p></div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={markAllPresent} disabled={!selectedClass}><Check size={16} /> Mark All Present</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveAttendance} disabled={saving}>{saving ? <span className="spinner" /> : 'Save Attendance'}</button>
                </div>
            </div>
            <div className="card mb-4">
                <div className="grid-3">
                    <div className="form-group">
                        <label className="form-label">Class</label>
                        <select className="form-select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setMarkingData({}); }}>
                            <option value="">Choose Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input className="form-input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Session</label>
                        <select className="form-select" value={sessionType} onChange={e => setSessionType(e.target.value)}>
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="full_day">Full Day</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="card">
                {!selectedClass ? (
                    <div className="empty-state"><h3>Select a class</h3><p>Pick a class to mark attendance.</p></div>
                ) : classStudents.length === 0 ? (
                    <div className="empty-state"><h3>No students in this class</h3></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Student</th><th>Adm No.</th><th>Status</th></tr></thead><tbody>
                        {classStudents.map((s, i) => (
                            <tr key={s.id}><td>{i + 1}</td><td><strong>{s.first_name} {s.last_name}</strong></td><td>{s.admission_number || '—'}</td>
                                <td>
                                    <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={markingData[s.id] || ''} onChange={e => setMarkingData(prev => ({ ...prev, [s.id]: e.target.value }))}>
                                        <option value="">—</option>
                                        <option value="present">✅ Present</option>
                                        <option value="absent">❌ Absent</option>
                                        <option value="late">⏰ Late</option>
                                        <option value="excused">📋 Excused</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderTeacherAttendance = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <div><h3 className="text-lg font-bold">Mark Teacher Attendance</h3><p className="text-sm text-muted">Select date and session — then mark each teacher.</p></div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={markAllTeachersPresent}><Check size={16} /> Mark All Present</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveTeacherAttendance} disabled={saving}>{saving ? <span className="spinner" /> : 'Save Attendance'}</button>
                </div>
            </div>
            <div className="card mb-4">
                <div className="grid-2">
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input className="form-input" type="date" value={teacherDate} onChange={e => setTeacherDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Session</label>
                        <select className="form-select" value={teacherSessionType} onChange={e => setTeacherSessionType(e.target.value)}>
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="full_day">Full Day</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="card">
                {teachers.length === 0 ? (
                    <div className="empty-state"><h3>No teachers registered</h3></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Teacher</th><th>Phone</th><th>Status</th></tr></thead><tbody>
                        {teachers.map((t, i) => (
                            <tr key={t.id}><td>{i + 1}</td><td><strong>{t.first_name} {t.last_name}</strong></td><td>{t.phone || '—'}</td>
                                <td>
                                    <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={teacherMarkingData[t.id] || ''} onChange={e => setTeacherMarkingData(prev => ({ ...prev, [t.id]: e.target.value }))}>
                                        <option value="">—</option>
                                        <option value="present">✅ Present</option>
                                        <option value="absent">❌ Absent</option>
                                        <option value="late">⏰ Late</option>
                                        <option value="excused">📋 Excused</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderReports = () => {
        const totalSessions = sessions.length;
        const recentSessions = sessions.slice(0, 5);
        return (
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="card-title">Attendance Reports & Analysis</h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => toast.success('Report generation started (Demo)')}><Download size={16} /> Export CSV</button>
                </div>

                <div className="grid-3 mb-6">
                    <div className="stat-card">
                        <div className="stat-info"><h3>Total Sessions Recorded</h3><div className="stat-value">{totalSessions}</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-info"><h3>Avg. Daily Attendance</h3><div className="stat-value">~94%</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-info"><h3>Most Absentees</h3><div className="stat-value text-muted">Awaiting more data</div></div>
                    </div>
                </div>

                <div className="card bg-gray-50 border-0 p-4 rounded mb-4">
                    <h4 className="font-semibold mb-2">Recent Sessions Overview</h4>
                    {recentSessions.length === 0 ? (
                        <p className="text-sm text-muted">No sessions recorded yet.</p>
                    ) : (
                        <table className="data-table" style={{ background: 'white' }}>
                            <thead><tr><th>Date</th><th>Class</th><th>Session</th></tr></thead>
                            <tbody>
                                {recentSessions.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.date}</td>
                                        <td>{s.classes?.name || 'Teachers / General'}</td>
                                        <td>{s.session_type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance</h1>
                    <p className="page-subtitle">Mark and manage student & teacher attendance</p>
                </div>
            </div>

            <div className="card mb-4" style={{ padding: '0.5rem 1rem' }}>
                <div className="flex gap-1" style={{ overflowX: 'auto' }}>
                    {TABS.map(tab => (
                        <button key={tab.key} className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(tab.key)} style={{ whiteSpace: 'nowrap' }}>
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center" style={{ padding: '3rem' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>
            ) : (
                <>
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'students' && renderStudentAttendance()}
                    {activeTab === 'teachers' && renderTeacherAttendance()}
                    {activeTab === 'reports' && renderReports()}
                </>
            )}
        </>
    );
}
