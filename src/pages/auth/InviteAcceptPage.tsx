import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import toast from 'react-hot-toast';

export default function InviteAcceptPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
            // Update user password immediately
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

            // Success — sign out so they can sign in with new credentials
            await supabase.auth.signOut();

            toast.success("Account created successfully! Please sign in with your new password.");
            navigate('/auth/login');
        } catch (error: any) {
            toast.error(error.message || "Failed to create account. Please try again.");
            setSubmitting(false);
        }
    };

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
