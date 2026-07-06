import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, CheckCircle, ExternalLink } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import toast from 'react-hot-toast';

export default function InviteAcceptPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [accountCreated, setAccountCreated] = useState(false);

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match"); return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters"); return;
        }

        setSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                if (error.message.includes('password') || error.message.includes('already')) {
                    toast.error("Account has already been created. Please sign in with your password.");
                } else {
                    toast.error(error.message);
                }
                setSubmitting(false);
                return;
            }

            // Sign out so they can sign in with new credentials
            await supabase.auth.signOut();
            toast.success("Account created successfully!");
            setAccountCreated(true);
        } catch (error: any) {
            toast.error(error.message || "Failed to create account. Please try again.");
            setSubmitting(false);
        }
    };

    // Success screen
    if (accountCreated) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="auth-visual">
                        <img src={nexagenImage} alt="" />
                        <ShieldCheck size={22} />
                    </div>
                    <div style={{ margin: '1.5rem 0' }}>
                        <CheckCircle size={56} style={{ color: 'var(--green-600)', margin: '0 auto 1rem' }} />
                        <h2 className="auth-title" style={{ color: 'var(--green-700)' }}>Account Created!</h2>
                        <p className="auth-subtitle" style={{ marginTop: '0.5rem', lineHeight: 1.6 }}>
                            Your account has been created successfully.<br />
                            You can now log in using your email and the password you just set.
                        </p>
                    </div>

                    <a
                        href="https://nexagen.co.ke"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-lg btn-full"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <ExternalLink size={18} /> Go to nexagen.co.ke to Login
                    </a>

                    <p className="text-sm text-center text-muted mt-4">
                        Or <a href="/auth/login" className="underline font-bold">sign in here</a> if you're already on the platform.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-visual">
                    <img src={nexagenImage} alt="" />
                    <ShieldCheck size={22} />
                </div>
                <div className="auth-logo">
                    <div className="auth-logo-icon">N</div>
                    <span className="auth-logo-text">NexaLMS</span>
                </div>
                <h2 className="auth-title">Create Your Account</h2>
                <p className="auth-subtitle">
                    Set a secure password to activate your account.
                </p>

                <form onSubmit={handleCreateAccount} className="mt-4">
                    <div className="form-group">
                        <label className="form-label" htmlFor="new-password">New Password</label>
                        <div className="form-input-icon">
                            <Lock />
                            <input
                                id="new-password"
                                type="password"
                                className="form-input"
                                placeholder="Enter strong password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                        <div className="form-input-icon">
                            <Lock />
                            <input
                                id="confirm-password"
                                type="password"
                                className="form-input"
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg btn-full mt-4" disabled={submitting}>
                        {submitting ? <span className="spinner" /> : 'Create Account'}
                    </button>

                    <p className="text-sm text-center text-muted mt-4">
                        If you reached here by mistake, please <a href="/auth/login" className="underline font-bold">sign in</a>.
                    </p>
                </form>
            </div>
        </div>
    );
}
