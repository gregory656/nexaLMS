import { Link } from 'react-router-dom';
import { LockKeyhole, Mail } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import AuthFooter from '../../components/auth/AuthFooter';

export default function SignupPage() {
    return (
        <div className="auth-page">
            <div className="auth-card auth-card--centered">
                <div className="auth-visual">
                    <img src={nexagenImage} alt="" />
                    <LockKeyhole size={22} />
                </div>

                <div className="auth-logo">
                    <div className="auth-logo-icon">N</div>
                    <span className="auth-logo-text">NexaLMS</span>
                </div>

                <h2 className="auth-title">Sign up closed</h2>
                <p className="auth-subtitle">Accounts are issued by your administrator.</p>

                <Link to="/auth/login" className="btn btn-primary btn-lg btn-full">
                    <Mail size={18} /> Sign in
                </Link>

                <AuthFooter />
            </div>
        </div>
    );
}
