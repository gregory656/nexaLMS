import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
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
            </div>
        </div>
    );
}
