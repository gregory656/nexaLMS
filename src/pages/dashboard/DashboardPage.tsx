import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    GraduationCap, Users, UserCheck, BookOpen,
    DollarSign, ClipboardList, TrendingUp, Calendar,
    Bell, ArrowUpRight, AlertCircle
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

export default function DashboardPage() {
    const { school, user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        students: 0, teachers: 0, guardians: 0, classes: 0,
        subjects: 0, houses: 0, streams: 0,
    });
    const [recentStudents, setRecentStudents] = useState<any[]>([]);
    const [recentTeachers, setRecentTeachers] = useState<any[]>([]);

    useEffect(() => {
        if (!school?.id) return;

        const fetchStats = async () => {
            const [students, teachers, guardians, classes, subjects, houses, streams] = await Promise.all([
                supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('guardians').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('houses').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
                supabase.from('streams').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
            ]);

            setStats({
                students: students.count || 0,
                teachers: teachers.count || 0,
                guardians: guardians.count || 0,
                classes: classes.count || 0,
                subjects: subjects.count || 0,
                houses: houses.count || 0,
                streams: streams.count || 0,
            });
        };

        const fetchRecent = async () => {
            const { data: stu } = await supabase
                .from('students')
                .select('*')
                .eq('school_id', school.id)
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentStudents(stu || []);

            const { data: tea } = await supabase
                .from('teachers')
                .select('*')
                .eq('school_id', school.id)
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentTeachers(tea || []);
        };

        fetchStats();
        fetchRecent();
    }, [school?.id]);

    const statCards = [
        { label: 'Total Students', value: stats.students, icon: GraduationCap, color: 'green', change: '+12 this term' },
        { label: 'Teaching Staff', value: stats.teachers, icon: Users, color: 'blue', change: `${stats.teachers} active` },
        { label: 'Guardians', value: stats.guardians, icon: UserCheck, color: 'orange', change: 'Linked to students' },
        { label: 'Active Classes', value: stats.classes, icon: BookOpen, color: 'green', change: `${stats.streams} streams` },
        { label: 'Subjects Offered', value: stats.subjects, icon: ClipboardList, color: 'blue', change: 'Across all levels' },
        { label: 'Houses', value: stats.houses, icon: TrendingUp, color: 'orange', change: 'For sports & events' },
    ];

    const currentDate = new Date().toLocaleDateString('en-KE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'} 👋
                    </h1>
                    <p className="page-subtitle">{currentDate} — {school?.name || 'NexaLMS'}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm">
                        <Calendar size={16} /> Academic Calendar
                    </button>
                    <button className="btn btn-primary btn-sm">
                        <Bell size={16} /> Announcements
                    </button>
                </div>
            </div>

            {/* Quick Setup Alert */}
            {stats.students === 0 && stats.teachers === 0 && (
                <div className="card mb-4" style={{
                    background: 'linear-gradient(135deg, var(--green-50), var(--white))',
                    borderColor: 'var(--green-200)'
                }}>
                    <div className="flex items-center gap-3">
                        <AlertCircle size={24} style={{ color: 'var(--green-600)' }} />
                        <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '1rem' }}>🚀 Let's set up your school</h4>
                            <p className="text-sm text-muted">
                                Start by adding streams, subjects, then staff and students. Go to <strong>Streams & Classes</strong> first.
                            </p>
                        </div>
                        <a href="/academics/streams" className="btn btn-primary btn-sm">
                            Get Started <ArrowUpRight size={14} />
                        </a>
                    </div>
                </div>
            )}

            {/* Stat Cards */}
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

            {/* School Info Banner */}
            <div className="card mb-6">
                <div className="card-header">
                    <h3 className="card-title">🏫 School Profile</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
                    {school?.logo_url ? (
                        <img src={school.logo_url} alt="Logo" style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GraduationCap size={36} style={{ color: 'var(--green-600)' }} />
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        {[
                            ['School', school?.name],
                            ['Email', school?.email],
                            ['Phone', school?.phone || '—'],
                            ['County', school?.county || '—'],
                            ['Curriculum', school?.curriculum?.toUpperCase()],
                            ['Type', school?.school_type],
                            ['Motto', school?.motto || '—'],
                            ['Website', school?.website || '—'],
                        ].map(([label, val]) => (
                            <div key={label as string}>
                                <span className="text-xs text-muted">{label}</span>
                                <p className="text-sm font-semibold" style={{ marginTop: '0.15rem' }}>{val || '—'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📚 Recent Students</h3>
                        <a href="/students" className="btn btn-ghost btn-sm">View All</a>
                    </div>
                    {recentStudents.length === 0 ? (
                        <div className="empty-state">
                            <GraduationCap />
                            <h3>No students yet</h3>
                            <p>Add your first student to get started</p>
                            <a href="/students" className="btn btn-primary btn-sm">Add Student</a>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Gender</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentStudents.map(s => (
                                        <tr key={s.id}>
                                            <td><strong>{s.first_name} {s.last_name}</strong></td>
                                            <td>{s.gender || '—'}</td>
                                            <td><span className="badge badge-green">{s.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">👩‍🏫 Recent Staff</h3>
                        <a href="/staff" className="btn btn-ghost btn-sm">View All</a>
                    </div>
                    {recentTeachers.length === 0 ? (
                        <div className="empty-state">
                            <Users />
                            <h3>No staff yet</h3>
                            <p>Add teachers and staff to your school</p>
                            <a href="/staff" className="btn btn-primary btn-sm">Add Staff</a>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTeachers.map(t => (
                                        <tr key={t.id}>
                                            <td><strong>{t.first_name} {t.last_name}</strong></td>
                                            <td>{t.email || '—'}</td>
                                            <td><span className="badge badge-green">{t.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
