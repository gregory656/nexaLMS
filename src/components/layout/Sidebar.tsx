import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useHelpSidebar } from '../../contexts/HelpContext';
import {
    LayoutDashboard, Users, GraduationCap, UserCheck,
    BookOpen, Calendar, ClipboardList, DollarSign,
    Settings, Shield, CreditCard,
    School, FileText, Clock, Megaphone,
    UserCog, BarChart3, LogOut, Home, HelpCircle, Globe2
} from 'lucide-react';
import HelpSidebar from './HelpSidebar';

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
            { to: '/student-leaders', icon: Shield, label: 'Student Leaders' },
            { to: '/staff', icon: Users, label: 'Staff / Teachers' },
            { to: '/duty-roster', icon: ClipboardList, label: 'Duty Roster' },
            { to: '/guardians', icon: UserCheck, label: 'Guardians' },
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
    },
    {
        title: 'Documents',
        items: [
            { to: '/quotations', icon: FileText, label: 'Quotations', adminOnly: true },
            { to: '/documentation', icon: FileText, label: 'Agreements & Docs' },
        ]
    },
    {
        title: 'Support',
        items: [
            { to: 'help', icon: HelpCircle, label: 'Help Centre', action: 'open-help' },
            { to: '/site', icon: Globe2, label: 'Visit Site' },
        ]
    }
];

export default function Sidebar() {
    const { user, school, signOut } = useAuth();
    const navigate = useNavigate();
    const { isOpen: helpOpen, initialSection, closeHelp, openHelp } = useHelpSidebar();

    const handleLogout = async () => {
        await signOut();
        navigate('/auth/login');
    };

    const handleNavClick = (item: any) => {
        if (item.action === 'open-help') {
            openHelp();
        } else {
            navigate(item.to);
        }
    };

    const initials = user?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'AD';

    return (
        <>
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
                            {section.items.map(item => {
                                // Hide admin-only items unless user is admin@gmail.com
                                if (item.adminOnly && user?.email !== 'admin@gmail.com') {
                                    return null;
                                }

                                return item.action === 'open-help' ? (
                                    <button
                                        key={item.to}
                                        className="sidebar-item"
                                        onClick={() => handleNavClick(item)}
                                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </button>
                                ) : (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            `sidebar-item ${isActive ? 'active' : ''}`
                                        }
                                        onClick={(e) => {
                                            if (item.to === '/announcements') {
                                                e.preventDefault();
                                                toast.custom(() => (
                                                    <div style={{
                                                        background: 'white',
                                                        padding: '1.25rem',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                                                        borderLeft: '4px solid var(--green-500)',
                                                        display: 'flex',
                                                        gap: '1rem',
                                                        alignItems: 'flex-start',
                                                        maxWidth: '400px'
                                                    }}>
                                                        <div style={{ fontSize: '1.5rem' }}>📢</div>
                                                        <div>
                                                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0f172a' }}>Custom Domain Required</h4>
                                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                                                                The Announcements Dashboard is exclusively reserved for schools hosting NexaLMS on their own custom domain. Contact NexaGen to upgrade your plan and communicate directly with staff, parents, and students.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ), { duration: 7000 });
                                            }
                                        }}
                                    >
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </NavLink>
                                );
                            })}
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

            <HelpSidebar isOpen={helpOpen} onClose={closeHelp} initialSection={initialSection} />
        </>
    );
}
