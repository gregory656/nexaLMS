import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    GraduationCap, Users, UserCheck, BookOpen,
    ClipboardList, TrendingUp, Calendar,
    Bell, ArrowUpRight, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

interface DashboardStats {
    students: number;
    teachers: number;
    guardians: number;
    classes: number;
    subjects: number;
    houses: number;
    streams: number;
}

const DASHBOARD_CACHE = new Map<string, {
    stats: DashboardStats;
    recentStudents: any[];
    recentTeachers: any[];
    academicYears: any[];
    selectedYearId: string;
}>();

export default function DashboardPage() {
    const { school, user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        students: 0, teachers: 0, guardians: 0, classes: 0,
        subjects: 0, houses: 0, streams: 0,
    });
    const [recentStudents, setRecentStudents] = useState<any[]>([]);
    const [recentTeachers, setRecentTeachers] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [selectedYearId, setSelectedYearId] = useState('');
    const [showStudents, setShowStudents] = useState(false);
    const [showStaff, setShowStaff] = useState(false);

    const getAdminName = () => {
        const fullName = user?.full_name?.trim();
        if (fullName && !fullName.includes('@')) return fullName;
        const fallback = user?.email?.split('@')[0] || 'Admin';
        return fallback
            .split(/[._-]/)
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ') || 'Admin';
    };

    useEffect(() => {
        if (!school?.id) return;
        const cached = DASHBOARD_CACHE.get(school.id);
        if (cached) {
            setStats(cached.stats);
            setRecentStudents(cached.recentStudents);
            setRecentTeachers(cached.recentTeachers);
            setAcademicYears(cached.academicYears);
            setSelectedYearId(cached.selectedYearId);
        }

        const fetchYears = async () => {
            const { data } = await supabase
                .from('academic_years')
                .select('*')
                .eq('school_id', school.id)
                .order('is_current', { ascending: false })
                .order('start_date', { ascending: false });
            setAcademicYears(data || []);
            const current = data?.find(y => y.is_current) || data?.[0];
            if (current) setSelectedYearId(current.id);
        };

        fetchYears();
    }, [school?.id]);

    useEffect(() => {
        if (!school?.id) return;

        const fetchStats = async () => {
            const [students, teachers, guardians, classes, subjects, houses, streams] = await Promise.all([
                supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', school.id).neq('status', 'graduated'),
                supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('guardians').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('houses').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('streams').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
            ]);

            const nextStats = {
                students: students.count || 0,
                teachers: teachers.count || 0,
                guardians: guardians.count || 0,
                classes: classes.count || 0,
                subjects: subjects.count || 0,
                houses: houses.count || 0,
                streams: streams.count || 0,
            };
            setStats(nextStats);
            return nextStats;
        };

        const fetchRecent = async () => {
            const studentQuery = supabase
                .from('students')
                .select('*, classes(name, academic_year_id)')
                .eq('school_id', school.id)
                .neq('status', 'graduated')
                .order('created_at', { ascending: false });

            const { data: stu } = await studentQuery.limit(50);
            const filteredStudents = (stu || []).filter(s => !selectedYearId || s.classes?.academic_year_id === selectedYearId);
            setRecentStudents(filteredStudents);

            const { data: tea } = await supabase
                .from('teachers')
                .select('*')
                .eq('school_id', school.id)
                .order('created_at', { ascending: false })
                .limit(50);
            setRecentTeachers(tea || []);
            return { students: filteredStudents, teachers: tea || [] };
        };

        const refresh = async () => {
            const [nextStats, people] = await Promise.all([fetchStats(), fetchRecent()]);
            DASHBOARD_CACHE.set(school.id, {
                stats: nextStats,
                recentStudents: people.students,
                recentTeachers: people.teachers,
                academicYears,
                selectedYearId,
            });
        };
        refresh();
    }, [school?.id, selectedYearId]);

    useEffect(() => {
        if (!school?.id) return;
        DASHBOARD_CACHE.set(school.id, {
            stats,
            recentStudents,
            recentTeachers,
            academicYears,
            selectedYearId,
        });
    }, [school?.id, stats, recentStudents, recentTeachers, academicYears, selectedYearId]);

    const selectedYear = useMemo(
        () => academicYears.find(year => year.id === selectedYearId),
        [academicYears, selectedYearId]
    );

    const statCards = [
        { label: 'Total Students', value: stats.students, icon: GraduationCap, color: 'green', change: selectedYear ? `Showing ${selectedYear.name}` : 'All active learners' },
        { label: 'Teaching Staff', value: stats.teachers, icon: Users, color: 'blue', change: `${stats.teachers} active` },
        { label: 'Guardians', value: stats.guardians, icon: UserCheck, color: 'orange', change: 'Linked to students' },
        { label: 'Active Classes', value: stats.classes, icon: BookOpen, color: 'green', change: `${stats.streams} streams` },
        { label: 'Subjects Offered', value: stats.subjects, icon: ClipboardList, color: 'blue', change: 'Across departments' },
        { label: 'Houses', value: stats.houses, icon: TrendingUp, color: 'orange', change: 'For sports and events' },
    ];

    const currentDate = new Date().toLocaleDateString('en-KE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title glitter-title">
                        Welcome, {getAdminName()}
                    </h1>
                    <p className="page-subtitle shiny-date">{currentDate} - {school?.name || 'NexaLMS'}</p>
                </div>
                <div className="flex gap-2">
                    <select className="form-select" value={selectedYearId} onChange={e => setSelectedYearId(e.target.value)} style={{ minWidth: 170 }}>
                        {academicYears.length === 0 && <option value="">No academic years</option>}
                        {academicYears.map(year => (
                            <option key={year.id} value={year.id}>{year.name}{year.is_current ? ' current' : ''}</option>
                        ))}
                    </select>
                    <Link to="/academics/years" className="btn btn-secondary btn-sm">
                        <Calendar size={16} /> {selectedYear ? selectedYear.name : 'Academic Year'}
                    </Link>
                    <button className="btn btn-primary btn-sm">
                        <Bell size={16} /> Announcements
                    </button>
                </div>
            </div>

            {stats.students === 0 && stats.teachers === 0 && (
                <div className="card mb-4 setup-nudge">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={24} style={{ color: 'var(--green-600)' }} />
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '1rem' }}>Set up your school workspace</h4>
                            <p className="text-sm text-muted">
                                Start by adding streams, subjects, staff, and students. Streams and classes should come first.
                            </p>
                        </div>
                        <Link to="/academics/streams" className="btn btn-primary btn-sm">
                            Get Started <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </div>
            )}

            <div className="grid-3 mb-6">
                {statCards.map(card => (
                    <div key={card.label} className="stat-card">
                        <div className={`stat-icon ${card.color}`}>
                            <card.icon size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{card.label}</h3>
                            <div className="stat-value">{card.value}</div>
                            <div className="stat-change positive">{card.change}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card mb-6 school-profile-card">
                <div className="card-header">
                    <h3 className="card-title">School Profile</h3>
                    <Link to="/settings" className="btn btn-ghost btn-sm">Edit Profile</Link>
                </div>
                <div className="school-profile-grid">
                    {school?.logo_url || school?.watermark_url ? (
                        <img src={school.logo_url || school.watermark_url} alt="School logo" className="school-profile-logo" />
                    ) : (
                        <div className="school-profile-logo placeholder">
                            <GraduationCap size={36} />
                        </div>
                    )}
                    <div className="profile-fields">
                        {[
                            ['School', school?.name],
                            ['Email', school?.email],
                            ['Phone', school?.phone || '-'],
                            ['County', school?.county || '-'],
                            ['Curriculum', school?.curriculum?.toUpperCase()],
                            ['Type', school?.school_type],
                            ['Motto', school?.motto || '-'],
                            ['Website', school?.website || '-'],
                        ].map(([label, val]) => (
                            <div key={label as string}>
                                <span className="text-xs text-muted">{label}</span>
                                <p className="text-sm font-semibold">{val || '-'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <CompactPeopleCard
                    title="Recent Students"
                    emptyTitle="No students yet"
                    emptyText="Add your first student to get started"
                    href="/students"
                    rows={recentStudents}
                    expanded={showStudents}
                    onToggle={() => setShowStudents(value => !value)}
                    renderRow={student => (
                        <>
                            <td><strong>{student.first_name} {student.last_name}</strong></td>
                            <td>{student.classes?.name || '-'}</td>
                            <td><span className="badge badge-green">{student.status}</span></td>
                        </>
                    )}
                    headers={['Name', 'Class', 'Status']}
                    icon={<GraduationCap />}
                />

                <CompactPeopleCard
                    title="Recent Staff"
                    emptyTitle="No staff yet"
                    emptyText="Add teachers and staff to your school"
                    href="/staff"
                    rows={recentTeachers}
                    expanded={showStaff}
                    onToggle={() => setShowStaff(value => !value)}
                    renderRow={teacher => (
                        <>
                            <td><strong>{teacher.first_name} {teacher.last_name}</strong></td>
                            <td>{teacher.email || '-'}</td>
                            <td><span className="badge badge-green">{teacher.status}</span></td>
                        </>
                    )}
                    headers={['Name', 'Email', 'Status']}
                    icon={<Users />}
                />
            </div>
        </>
    );
}

function CompactPeopleCard({
    title, emptyTitle, emptyText, href, rows, expanded, onToggle, renderRow, headers, icon
}: {
    title: string;
    emptyTitle: string;
    emptyText: string;
    href: string;
    rows: any[];
    expanded: boolean;
    onToggle: () => void;
    renderRow: (row: any) => ReactNode;
    headers: string[];
    icon: ReactNode;
}) {
    return (
        <div className="card compact-list-card">
            <div className="card-header">
                <h3 className="card-title">{title}</h3>
                <div className="flex gap-2">
                    {rows.length > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={onToggle}>
                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            {expanded ? 'See Less' : 'See More'}
                        </button>
                    )}
                    <Link to={href} className="btn btn-ghost btn-sm">View All</Link>
                </div>
            </div>
            {rows.length === 0 ? (
                <div className="empty-state compact-empty">
                    {icon}
                    <h3>{emptyTitle}</h3>
                    <p>{emptyText}</p>
                    <Link to={href} className="btn btn-primary btn-sm">Open</Link>
                </div>
            ) : (
                <div className="table-wrapper compact-table">
                    <table className="data-table">
                        <thead>
                            <tr>{headers.map(header => <th key={header}>{header}</th>)}</tr>
                        </thead>
                        <tbody>
                            {(expanded ? rows : rows.slice(0, 1)).map(row => (
                                <tr key={row.id}>{renderRow(row)}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
