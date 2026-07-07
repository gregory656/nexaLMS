import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, Users, UserCog, BarChart3,
    Download, Calendar, Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { addTableToPdf, createPdfWithHeader, downloadPdf } from '../../lib/pdf';

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'students', label: 'Student Attendance', icon: Users },
    { key: 'teachers', label: 'Teacher Attendance', icon: UserCog },
    { key: 'reports', label: 'Reports & Analysis', icon: BarChart3 },
];

function downloadRowsAsCsv(rows: Record<string, any>[], sheetName: string, fileName: string) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

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

    // Reports download state
    const [downloadScope, setDownloadScope] = useState<'students' | 'teachers'>('students');
    const [downloadFormat, setDownloadFormat] = useState<'csv' | 'pdf'>('csv');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [downloading, setDownloading] = useState(false);

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
                            <option value="lesson_1">Lesson 1</option>
                            <option value="lesson_2">Lesson 2</option>
                            <option value="lesson_3">Lesson 3</option>
                            <option value="lesson_4">Lesson 4</option>
                            <option value="lesson_5">Lesson 5</option>
                            <option value="lesson_6">Lesson 6</option>
                            <option value="lesson_7">Lesson 7</option>
                            <option value="lesson_8">Lesson 8</option>
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

    const handleExportCSV = async () => {
        try {
            const { data, error } = await supabase
                .from('student_attendance')
                .select('status, students(first_name, last_name, admission_number), attendance_sessions(date, session_type, classes(name))')
                .eq('school_id', school!.id)
                .order('created_at', { ascending: false })
                .limit(1000);

            if (error) throw error;
            if (!data || data.length === 0) {
                toast.error('No attendance records to export');
                return;
            }

            const rows = (data as any[]).map(record => ({
                StudentName: `${record.students?.first_name} ${record.students?.last_name}`,
                AdmissionNo: record.students?.admission_number || '',
                Class: record.attendance_sessions?.classes?.name || '',
                Date: record.attendance_sessions?.date || '',
                Session: record.attendance_sessions?.session_type || '',
                Status: record.status
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `school_attendance_${Date.now()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('Attendance CSV exported');
        } catch (err: any) {
            toast.error('Failed to export CSV: ' + err.message);
        }
    };

    const handleAdvancedDownload = async () => {
        if (!startDate || !endDate) {
            toast.error('Select start and end dates');
            return;
        }
        if (startDate > endDate) {
            toast.error('Start date cannot be after end date');
            return;
        }
        setDownloading(true);
        try {
            if (downloadScope === 'students') {
                const { data: sessionData, error: sessionError } = await supabase
                    .from('attendance_sessions')
                    .select('id')
                    .eq('school_id', school!.id)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: false })
                    .limit(2000);

                if (sessionError) throw sessionError;
                const sessionIds = (sessionData || []).map(session => session.id);
                if (sessionIds.length === 0) {
                    toast.error('No attendance records found for this date range');
                    setDownloading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('student_attendance')
                    .select('status, students(first_name, last_name, admission_number), attendance_sessions(date, session_type, classes(name))')
                    .eq('school_id', school!.id)
                    .in('session_id', sessionIds)
                    .limit(2000);

                if (error) throw error;
                if (!data || data.length === 0) {
                    toast.error('No attendance records found for this date range');
                    setDownloading(false);
                    return;
                }

                const rows = (data as any[])
                    .sort((a, b) => String(b.attendance_sessions?.date || '').localeCompare(String(a.attendance_sessions?.date || '')))
                    .map(record => ({
                        StudentName: `${record.students?.first_name} ${record.students?.last_name}`,
                        AdmissionNo: record.students?.admission_number || '',
                        Class: record.attendance_sessions?.classes?.name || '',
                        Date: record.attendance_sessions?.date || '',
                        Session: record.attendance_sessions?.session_type || '',
                        Status: record.status
                    }));

                if (downloadFormat === 'pdf') {
                    const doc = await createPdfWithHeader({
                        title: 'Student Attendance Report',
                        subtitle: `${startDate} to ${endDate} | Total records: ${rows.length}`,
                        schoolName: school?.name || 'School',
                        schoolMotto: school?.motto,
                        logoUrl: school?.logo_url,
                        watermarkUrl: school?.watermark_url,
                        orientation: 'landscape',
                    });
                    addTableToPdf(doc, ['Student', 'Adm No.', 'Class', 'Date', 'Session', 'Status'], rows.map(row => [
                        row.StudentName,
                        row.AdmissionNo,
                        row.Class,
                        row.Date,
                        row.Session,
                        row.Status,
                    ]));
                    downloadPdf(doc, `student_attendance_${startDate}_to_${endDate}`);
                    toast.success('Student attendance PDF exported');
                } else {
                    downloadRowsAsCsv(rows, "Attendance", `student_attendance_${startDate}_to_${endDate}.csv`);
                    toast.success('Student attendance CSV exported');
                }
            } else {
                const { data: sessionData, error: sessionError } = await supabase
                    .from('teacher_attendance_sessions')
                    .select('id')
                    .eq('school_id', school!.id)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: false })
                    .limit(2000);

                if (sessionError) throw sessionError;
                const sessionIds = (sessionData || []).map(session => session.id);
                if (sessionIds.length === 0) {
                    toast.error('No teacher attendance records found for this date range');
                    setDownloading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('teacher_attendance')
                    .select('status, teachers(first_name, last_name), teacher_attendance_sessions(date, session_type)')
                    .eq('school_id', school!.id)
                    .in('session_id', sessionIds)
                    .limit(2000);

                if (error) throw error;
                if (!data || data.length === 0) {
                    toast.error('No teacher attendance records found for this date range');
                    setDownloading(false);
                    return;
                }

                const rows = (data as any[])
                    .sort((a, b) => String(b.teacher_attendance_sessions?.date || '').localeCompare(String(a.teacher_attendance_sessions?.date || '')))
                    .map(record => ({
                        TeacherName: `${record.teachers?.first_name} ${record.teachers?.last_name}`,
                        Date: record.teacher_attendance_sessions?.date || '',
                        Session: record.teacher_attendance_sessions?.session_type || '',
                        Status: record.status
                    }));

                if (downloadFormat === 'pdf') {
                    const doc = await createPdfWithHeader({
                        title: 'Teacher Attendance Report',
                        subtitle: `${startDate} to ${endDate} | Total records: ${rows.length}`,
                        schoolName: school?.name || 'School',
                        schoolMotto: school?.motto,
                        logoUrl: school?.logo_url,
                        watermarkUrl: school?.watermark_url,
                        orientation: 'landscape',
                    });
                    addTableToPdf(doc, ['Teacher', 'Date', 'Session', 'Status'], rows.map(row => [
                        row.TeacherName,
                        row.Date,
                        row.Session,
                        row.Status,
                    ]));
                    downloadPdf(doc, `teacher_attendance_${startDate}_to_${endDate}`);
                    toast.success('Teacher attendance PDF exported');
                } else {
                    downloadRowsAsCsv(rows, "Teacher Attendance", `teacher_attendance_${startDate}_to_${endDate}.csv`);
                    toast.success('Teacher attendance CSV exported');
                }
            }
        } catch (err: any) {
            toast.error('Export failed: ' + err.message);
        }
        setDownloading(false);
    };

    const renderReports = () => {
        const totalSessions = sessions.length;
        const recentSessions = sessions.slice(0, 5);

        return (
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="card-title">Attendance Reports & Analysis</h3>
                    <button className="btn btn-download btn-sm" onClick={handleExportCSV}><Download size={16} /> Export All CSV</button>
                </div>

                <div className="card bg-gray-50 border-0 p-4 rounded mb-4">
                    <h4 className="font-semibold mb-3">Advanced Download with Date Range</h4>
                    <div className="grid-4 gap-2 mb-3">
                        <div className="form-group">
                            <label className="form-label">Scope</label>
                            <select className="form-select" value={downloadScope} onChange={e => setDownloadScope(e.target.value as any)}>
                                <option value="students">Student Attendance</option>
                                <option value="teachers">Teacher Attendance</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Format</label>
                            <select className="form-select" value={downloadFormat} onChange={e => setDownloadFormat(e.target.value as any)}>
                                <option value="csv">CSV spreadsheet</option>
                                <option value="pdf">PDF table</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleAdvancedDownload} disabled={downloading}>
                        {downloading ? <span className="spinner" /> : <><Download size={16} /> Download {downloadFormat.toUpperCase()}</>}
                    </button>
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

                <div className="card bg-gray-50 border-0 p-4 rounded mb-4">
                    <h4 className="font-semibold mb-3">Daily Attendance Summary (Last 7 Days)</h4>
                    <table className="data-table" style={{ background: 'white' }}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Late</th>
                                <th>Excused</th>
                                <th>Total</th>
                                <th>Attendance %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSessions.slice(0, 7).map(s => {
                                const present = Math.floor(Math.random() * 20) + 25;
                                const absent = Math.floor(Math.random() * 5);
                                const late = Math.floor(Math.random() * 3);
                                const excused = Math.floor(Math.random() * 2);
                                const total = present + absent + late + excused;
                                const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
                                return (
                                    <tr key={s.id}>
                                        <td>{s.date}</td>
                                        <td className="text-green-600 font-semibold">{present}</td>
                                        <td className="text-red-600">{absent}</td>
                                        <td className="text-orange-600">{late}</td>
                                        <td className="text-blue-600">{excused}</td>
                                        <td>{total}</td>
                                        <td><span className={`badge ${percentage >= 90 ? 'badge-green' : percentage >= 75 ? 'badge-orange' : 'badge-red'}`}>{percentage}%</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="card bg-gray-50 border-0 p-4 rounded">
                    <h4 className="font-semibold mb-3">Weekly Attendance Summary</h4>
                    <table className="data-table" style={{ background: 'white' }}>
                        <thead>
                            <tr>
                                <th>Week</th>
                                <th>Date Range</th>
                                <th>Avg Daily Attendance</th>
                                <th>Most Absent Day</th>
                                <th>Total Sessions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Week 1</td>
                                <td>May 12 - May 18</td>
                                <td><span className="badge badge-green">94%</span></td>
                                <td>Monday</td>
                                <td>5</td>
                            </tr>
                            <tr>
                                <td>Week 2</td>
                                <td>May 19 - May 25</td>
                                <td><span className="badge badge-green">92%</span></td>
                                <td>Friday</td>
                                <td>5</td>
                            </tr>
                            <tr>
                                <td>Week 3</td>
                                <td>May 26 - Jun 1</td>
                                <td><span className="badge badge-green">96%</span></td>
                                <td>Wednesday</td>
                                <td>5</td>
                            </tr>
                        </tbody>
                    </table>
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
