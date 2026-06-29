import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Bell, MessageSquare, User, ChevronDown, LogOut, Settings } from 'lucide-react';

export default function Header() {
    const { user, school, signOut } = useAuth();
    const navigate = useNavigate();
    const [showProfile, setShowProfile] = useState(false);

    const initials = user?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'AD';

    return (
        <header className="header">
            <div className="header-search">
                <Search />
                <input
                    type="text"
                    placeholder="Search students, teachers, classes…"
                    id="global-search"
                />
            </div>

            <div className="header-actions">
                <button className="header-action-btn" title="Notifications" id="btn-notifications">
                    <Bell size={20} />
                    <span className="badge"></span>
                </button>

                <button className="header-action-btn" title="Messages" id="btn-messages">
                    <MessageSquare size={20} />
                </button>

                <div className="header-divider"></div>

                <div className="dropdown">
                    <button
                        className="header-profile"
                        onClick={() => setShowProfile(!showProfile)}
                        id="btn-profile"
                    >
                        {school?.logo_url || school?.watermark_url ? (
                            <img className="header-profile-avatar image-avatar" src={school.logo_url || school.watermark_url} alt="" />
                        ) : (
                            <div className="header-profile-avatar">{initials}</div>
                        )}
                        <ChevronDown size={16} style={{ color: 'var(--gray-400)' }} />
                    </button>

                    {showProfile && (
                        <div className="dropdown-menu">
                            <button className="dropdown-item" id="dropdown-profile" onClick={() => navigate('/settings')}>
                                <User size={16} />
                                <span>My Profile</span>
                            </button>
                            <button className="dropdown-item" id="dropdown-settings" onClick={() => navigate('/settings')}>
                                <Settings size={16} />
                                <span>Settings</span>
                            </button>
                            <button
                                className="dropdown-item"
                                onClick={signOut}
                                id="dropdown-logout"
                                style={{ color: 'var(--danger)' }}
                            >
                                <LogOut size={16} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
