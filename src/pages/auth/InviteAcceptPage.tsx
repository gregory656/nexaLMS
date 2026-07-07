import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, CheckCircle, Sparkles } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import toast from 'react-hot-toast';
import { generateUserManualPdf, downloadPdf } from '../../lib/manualPdf';
import AuthFooter from '../../components/auth/AuthFooter';

export default function InviteAcceptPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [accountCreated, setAccountCreated] = useState(false);
    const [downloadingManual, setDownloadingManual] = useState(false);
    const [isRecovery, setIsRecovery] = useState(false);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) {
            setIsRecovery(true);
        }
    }, []);

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

            await supabase.auth.signOut();
            toast.success(isRecovery ? 'Password updated!' : 'Account created!');
            setAccountCreated(true);
        } catch (error: any) {
            toast.error(error.message || "Failed to create account. Please try again.");
            setSubmitting(false);
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

    if (accountCreated) {
        return (
            <div className="auth-page">
                <div className="auth-card auth-card--centered">
                    <div className="auth-visual">
                        <img src={nexagenImage} alt="" />
                        <Sparkles size={22} />
                    </div>

                    <CheckCircle size={40} className="auth-success-icon" />
                    <h2 className="auth-title">
                        {isRecovery ? 'Password updated' : 'All set'}
                    </h2>
                    <p className="auth-subtitle">
                        {isRecovery ? 'Sign in with your new password.' : 'Your account is ready to use.'}
                    </p>

                    <Link to="/auth/login" className="btn btn-primary btn-lg btn-full">
                        Sign in
                    </Link>

                    <AuthFooter
                        onDownloadManual={handleDownloadManual}
                        downloadingManual={downloadingManual}
                    />
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

                <h2 className="auth-title">
                    {isRecovery ? 'New password' : 'Create account'}
                </h2>

                <form onSubmit={handleCreateAccount}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="new-password">Password</label>
                        <div className="form-input-icon">
                            <Lock />
                            <input
                                id="new-password"
                                type="password"
                                className="form-input"
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirm-password">Confirm</label>
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
                        {submitting ? <span className="spinner" /> : isRecovery ? 'Update password' : 'Create account'}
                    </button>

                    <p className="auth-inline-link">
                        <Link to="/auth/login">Back to sign in</Link>
                    </p>
                </form>

                <AuthFooter
                    onDownloadManual={handleDownloadManual}
                    downloadingManual={downloadingManual}
                />
            </div>
        </div>
    );
}
