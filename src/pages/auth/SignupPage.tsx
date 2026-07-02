import { Link } from 'react-router-dom';
import { LockKeyhole, Mail, Phone } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';

export default function SignupPage() {
    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-visual">
                    <img src={nexagenImage} alt="" />
                    <LockKeyhole size={22} />
                </div>
                <div className="auth-logo">
                    <div className="auth-logo-icon">N</div>
                    <span className="auth-logo-text">NexaLMS</span>
                </div>
                <h2 className="auth-title">Account creation is closed</h2>
                <p className="auth-subtitle">
                    Admin accounts are created from the database. Use the issued email and password to sign in.
                </p>
                <Link to="/auth/login" className="btn btn-primary btn-lg btn-full">
                    <Mail size={18} /> Sign In
                </Link>

                <div className="auth-contact-card">
                    <p className="auth-contact-label">Need help? Contact NexaLMS Support</p>
                    <a href="tel:+254719637416" className="auth-contact-phone">+254 719 637 416</a>
                    <div className="auth-contact-actions">
                        <a href="tel:+254719637416" className="auth-contact-btn call" title="Call support">
                            <Phone size={18} /><span>Call</span>
                        </a>
                        <a href="https://wa.me/254719637416" target="_blank" rel="noopener noreferrer" className="auth-contact-btn whatsapp" title="WhatsApp">
                            <span>WhatsApp</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
