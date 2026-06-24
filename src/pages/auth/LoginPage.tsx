import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const { signIn, signInAsTest } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

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
                <div className="auth-logo">
                    <div className="auth-logo-icon">N</div>
                    <span className="auth-logo-text">NexaLMS</span>
                </div>

                <h2 className="auth-title">Welcome back</h2>
                <p className="auth-subtitle">Sign in to your school admin account</p>

                {error && (
                    <div style={{
                        background: 'var(--danger-light)',
                        color: 'var(--danger)',
                        padding: '0.7rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">School Email</label>
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

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">Password</label>
                        <div className="form-input-icon">
                            <Lock />
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                style={{ paddingRight: '2.75rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--gray-400)',
                                    left: 'auto'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-full mt-4"
                        disabled={loading}
                        id="btn-login"
                    >
                        {loading ? <span className="spinner" /> : 'Sign In'}
                    </button>

                    <button
                        type="button"
                        className="btn btn-secondary btn-full mt-2"
                        onClick={async () => {
                            setLoading(true);
                            const { error: te } = await signInAsTest();
                            if (te) setError(te.message);
                            else navigate('/dashboard');
                            setLoading(false);
                        }}
                        style={{ borderStyle: 'dashed', background: 'transparent' }}
                    >
                        🚀 Bypass Rate Limit (Test Login)
                    </button>
                </form>

                <p style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    fontSize: '0.88rem',
                    color: 'var(--gray-500)'
                }}>
                    Don't have an account?{' '}
                    <Link to="/auth/signup" style={{ color: 'var(--green-600)', fontWeight: 600 }}>
                        Create School Account
                    </Link>
                </p>
            </div>
        </div>
    );
}
