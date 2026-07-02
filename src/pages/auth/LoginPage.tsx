import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Sparkles, Phone } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';

export default function LoginPage() {
    const { signIn, resetPassword } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [recoveryMode, setRecoveryMode] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        if (recoveryMode) {
            const { error: resetError } = await resetPassword(email.trim());
            if (resetError) setError(resetError.message || 'Could not send password reset link');
            else setMessage('Password reset link sent. Check that email inbox.');
            setLoading(false);
            return;
        }

        const { error: authError } = await signIn(email, password);
        if (authError) {
            setError(authError.message || 'Invalid credentials');
            setLoading(false);
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-visual">
                    <img src={nexagenImage} alt="" />
                    <Sparkles size={22} />
                </div>

                <div className="auth-logo">
                    <div className="auth-logo-icon">N</div>
                    <span className="auth-logo-text">NexaLMS</span>
                </div>

                <h2 className="auth-title">{recoveryMode ? 'Recover password' : 'Welcome back'}</h2>
                <p className="auth-subtitle">
                    {recoveryMode ? 'Enter your admin email to receive a reset link' : 'Sign in to your school admin account'}
                </p>

                {error && (
                    <div className="form-error-banner">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="success-banner">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Admin Email</label>
                        <div className="form-input-icon">
                            <Mail />
                            <input
                                id="login-email"
                                type="email"
                                className="form-input"
                                placeholder="admin@school.ac.ke"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {!recoveryMode && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="login-password">Password</label>
                            <div className="form-input-icon">
                                <Lock />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '2.75rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="input-icon-button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        className="auth-link-button"
                        onClick={() => {
                            setRecoveryMode(!recoveryMode);
                            setError('');
                            setMessage('');
                        }}
                    >
                        {recoveryMode ? 'Back to sign in' : 'Forgot password?'}
                    </button>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-full mt-4"
                        disabled={loading}
                        id="btn-login"
                    >
                        {loading ? <span className="spinner" /> : recoveryMode ? 'Send Reset Link' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-contact-card">
                    <p className="auth-contact-label">Need help? Contact NexaLMS Support</p>
                    <a href="tel:+254719637416" className="auth-contact-phone">+254 719 637 416</a>
                    <div className="auth-contact-actions">
                        <a href="tel:+254719637416" className="auth-contact-btn call" title="Call support">
                            <Phone size={18} />
                            <span>Call</span>
                        </a>
                        <a
                            href="https://wa.me/254719637416?text=Hello%20NexaLMS%20Support"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="auth-contact-btn whatsapp"
                            title="WhatsApp support"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            <span>WhatsApp</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
