import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import { generateUserManualPdf, downloadPdf } from '../../lib/manualPdf';
import AuthFooter from '../../components/auth/AuthFooter';

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
    const [downloadingManual, setDownloadingManual] = useState(false);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash && (hash.includes('access_token') || hash.includes('type=invite') || hash.includes('type=recovery'))) {
            navigate(`/auth/create-account${hash}`, { replace: true });
        }
    }, [navigate]);

    const sendResetLink = async () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setRecoveryMode(true);
            setError('');
            setMessage('');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        const { error: resetError } = await resetPassword(trimmedEmail);
        if (resetError) setError(resetError.message || 'Could not send password reset link');
        else setMessage('Reset link sent — check your inbox.');

        setLoading(false);
    };

    const handleForgotPassword = () => {
        if (recoveryMode) {
            setRecoveryMode(false);
            setError('');
            setMessage('');
            return;
        }
        void sendResetLink();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        if (recoveryMode) {
            await sendResetLink();
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

    const handleDownloadManual = async () => {
        setDownloadingManual(true);
        try {
            const doc = await generateUserManualPdf();
            downloadPdf(doc, `NexaLMS_User_Manual_V1.0.0`);
        } catch (error) {
            console.error('Failed to download manual:', error);
        }
        setDownloadingManual(false);
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

                <h2 className="auth-title">{recoveryMode ? 'Reset password' : 'Welcome back'}</h2>

                {error && <div className="form-error-banner">{error}</div>}
                {message && <div className="success-banner">{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email</label>
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

                    <div className="auth-form-actions">
                        {!recoveryMode && (
                            <button
                                type="button"
                                className="auth-link-button"
                                onClick={handleForgotPassword}
                                disabled={loading}
                            >
                                Forgot password?
                            </button>
                        )}
                        {recoveryMode && (
                            <button
                                type="button"
                                className="auth-link-button"
                                onClick={handleForgotPassword}
                                disabled={loading}
                            >
                                Back to sign in
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-full mt-4"
                        disabled={loading}
                        id="btn-login"
                    >
                        {loading ? <span className="spinner" /> : recoveryMode ? 'Send reset link' : 'Sign in'}
                    </button>
                </form>

                <AuthFooter
                    onDownloadManual={handleDownloadManual}
                    downloadingManual={downloadingManual}
                />
            </div>
        </div>
    );
}
