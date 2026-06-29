import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    LayoutDashboard, Users, GraduationCap, UserCheck,
    BookOpen, Calendar, ClipboardList, DollarSign,
    Settings, Shield, CreditCard,
    School, FileText, Clock, Megaphone,
    UserCog, BarChart3, LogOut, Home
} from 'lucide-react';

const navSections = [
    {
        title: 'Overview',
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        title: 'People',
        items: [
            { to: '/students', icon: GraduationCap, label: 'Students' },
            { to: '/staff', icon: Users, label: 'Staff / Teachers' },
            { to: '/guardians', icon: UserCheck, label: 'Guardians & Parents' },
            { to: '/alumni', icon: GraduationCap, label: 'Alumni' },
        ]
    },
    {
        title: 'Academics',
        items: [
            { to: '/academics/streams', icon: Home, label: 'Streams & Classes' },
            { to: '/academics/subjects', icon: BookOpen, label: 'Subjects' },
            { to: '/academics/houses', icon: School, label: 'Houses' },
            { to: '/academics/years', icon: Calendar, label: 'Academic Years' },
            { to: '/academics/departments', icon: BarChart3, label: 'Departments' },
            { to: '/academics/timetable', icon: Clock, label: 'Timetable' },
        ]
    },
    {
        title: 'Assessment',
        items: [
            { to: '/exams', icon: ClipboardList, label: 'Examinations' },
            { to: '/reports', icon: FileText, label: 'Report Cards' },
            { to: '/attendance', icon: UserCog, label: 'Attendance' },
        ]
    },
    {
        title: 'Finance',
        items: [
            { to: '/finance', icon: DollarSign, label: 'Fee Management' },
        ]
    },
    {
        title: 'Administration',
        items: [
            { to: '/roles', icon: Shield, label: 'Roles & Permissions' },
            { to: '/subscription', icon: CreditCard, label: 'Subscription' },
            { to: '/announcements', icon: Megaphone, label: 'Announcements' },
            { to: '/settings', icon: Settings, label: 'School Settings' },
        ]
    }
];

export default function Sidebar() {
    const { user, school, signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/auth/login');
    };

    const initials = user?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'AD';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                {school?.logo_url || school?.watermark_url ? (
                    <img className="sidebar-logo-image" src={school.logo_url || school.watermark_url} alt="" />
                ) : (
                    <div className="sidebar-logo-icon">N</div>
                )}
                <div>
                    <div className="sidebar-logo-text">{school?.name || 'NexaLMS'}</div>
                    <div className="sidebar-logo-sub">School ERP</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navSections.map(section => (
                    <div key={section.title} className="sidebar-section">
                        <div className="sidebar-section-title">{section.title}</div>
                        {section.items.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `sidebar-item ${isActive ? 'active' : ''}`
                                }
                            >
                                <item.icon />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user" onClick={handleLogout} title="Sign Out">
                    <div className="sidebar-user-avatar">{initials}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.full_name || 'Admin'}</div>
                        <div className="sidebar-user-role">Administrator</div>
                    </div>
                    <LogOut size={16} style={{ color: 'var(--gray-400)' }} />
                </div>
            </div>
        </aside>
    );
}
