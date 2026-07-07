import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, CheckCircle, ExternalLink, Download, Book } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import toast from 'react-hot-toast';
import { generateUserManualPdf, downloadPdf } from '../../lib/manualPdf';

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

            // Sign out so they can sign in with new credentials
            await supabase.auth.signOut();
            toast.success(isRecovery ? 'Password updated successfully!' : 'Account created successfully!');
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
                        <h2 className="auth-title" style={{ color: 'var(--green-700)' }}>
                            {isRecovery ? 'Password Updated!' : 'Account Created!'}
                        </h2>
                        <p className="auth-subtitle" style={{ marginTop: '0.5rem', lineHeight: 1.6 }}>
                            {isRecovery ? (
                                <>Your password has been reset successfully.<br />You can now sign in with your new password.</>
                            ) : (
                                <>Your account has been created successfully.<br />You can now log in using your email and the password you just set.</>
                            )}
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

                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'linear-gradient(135deg, var(--green-50), var(--white))', borderRadius: '8px' }}>
                        <div className="flex items-center gap-2 mb-2 justify-center">
                            <Book size={18} className="text-green-600" />
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>User Manual</p>
                        </div>
                        <p className="text-sm text-muted mb-3">Download the comprehensive NexaLMS user guide (PDF)</p>
                        <button
                            className="btn btn-primary btn-sm btn-full"
                            onClick={handleDownloadManual}
                            disabled={downloadingManual}
                        >
                            {downloadingManual ? <span className="spinner" /> : <><Download size={16} /> Download Manual</>}
                        </button>
                        <p className="text-xs text-muted text-center mt-2">Version 1.0.0 • Jan 7, 2025</p>
                    </div>
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
                <h2 className="auth-title">{isRecovery ? 'Reset Your Password' : 'Create Your Account'}</h2>
                <p className="auth-subtitle">
                    {isRecovery
                        ? 'Choose a new password for your admin account.'
                        : 'Set a secure password to activate your account.'}
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
                        {submitting ? <span className="spinner" /> : isRecovery ? 'Update Password' : 'Create Account'}
                    </button>

                    <p className="text-sm text-center text-muted mt-4">
                        If you reached here by mistake, please <a href="/auth/login" className="underline font-bold">sign in</a>.
                    </p>

                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'linear-gradient(135deg, var(--green-50), var(--white))', borderRadius: '8px' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Book size={18} className="text-green-600" />
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>User Manual</p>
                        </div>
                        <p className="text-sm text-muted mb-3">Download the comprehensive NexaLMS user guide (PDF)</p>
                        <button
                            className="btn btn-primary btn-sm btn-full"
                            onClick={handleDownloadManual}
                            disabled={downloadingManual}
                        >
                            {downloadingManual ? <span className="spinner" /> : <><Download size={16} /> Download Manual</>}
                        </button>
                        <p className="text-xs text-muted text-center mt-2">Version 1.0.0 • Jan 7, 2025</p>
                    </div>
                </form>
            </div>
        </div>
    );
}
