import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
    const { signUp } = useAuth();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.toLowerCase().endsWith('@gmail.com')) {
            setError('Only @gmail.com email addresses are allowed');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        const { error: authError } = await signUp(email, password, fullName);
        if (authError) {
            setError(authError.message || 'Failed to create account');
            setLoading(false);
        } else {
            navigate('/setup');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="auth-logo-icon">N</div>
                    <span className="auth-logo-text">NexaLMS</span>
                </div>

                <h2 className="auth-title">Create School Account</h2>
                <p className="auth-subtitle">One admin account per school. You'll set up your school next.</p>

                {error && (
                    <div style={{
                        background: 'var(--danger-light)',
                        color: 'var(--danger)',
                        padding: '0.7rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        marginBottom: '1.25rem',
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="signup-name">Full Name</label>
                        <div className="form-input-icon">
                            <User />
                            <input
                                id="signup-name"
                                type="text"
                                className="form-input"
                                placeholder="John Kamau"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="signup-email">School Email</label>
                        <div className="form-input-icon">
                            <Mail />
                            <input
                                id="signup-email"
                                type="email"
                                className="form-input"
                                placeholder="admin@gmail.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="signup-password">Password</label>
                        <div className="form-input-icon">
                            <Lock />
                            <input
                                id="signup-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Min 8 characters"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={8}
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

                    <div className="form-group">
                        <label className="form-label" htmlFor="signup-confirm">Confirm Password</label>
                        <div className="form-input-icon">
                            <Lock />
                            <input
                                id="signup-confirm"
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-full mt-4"
                        disabled={loading}
                        id="btn-signup"
                    >
                        {loading ? <span className="spinner" /> : 'Create Account'}
                    </button>
                </form>

                <p style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    fontSize: '0.88rem',
                    color: 'var(--gray-500)'
                }}>
                    Already have an account?{' '}
                    <Link to="/auth/login" style={{ color: 'var(--green-600)', fontWeight: 600 }}>
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
