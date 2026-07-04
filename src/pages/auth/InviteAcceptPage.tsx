import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import toast from 'react-hot-toast';

export default function InviteAcceptPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [validInvite, setValidInvite] = useState(false);

    useEffect(() => {
        // Supabase passes type=invite in the hash or handles it via INITIAL_SESSION/PASSWORD_RECOVERY
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setValidInvite(true);
            } else {
                toast.error("Invalid or expired invitation link.");
                navigate('/auth/login');
            }
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                setValidInvite(true);
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match"); return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters"); return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Account created successfully. Welcome!");
            navigate('/dashboard');
        }
        setLoading(false);
    };

    if (!validInvite) {
        return <div className="flex justify-center p-8"><span className="spinner" /></div>;
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
                <h2 className="auth-title">Complete your Account</h2>
                <p className="auth-subtitle">
                    Welcome! Set a secure password to activate your admin account.
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

                    <button type="submit" className="btn btn-primary btn-lg btn-full mt-4" disabled={loading}>
                        {loading ? <span className="spinner" /> : 'Activate Account'}
                    </button>

                    <p className="text-sm text-center text-muted mt-4">
                        If you reached here by mistake, please <a href="/auth/login" className="underline font-bold">sign in</a>.
                    </p>
                </form>
            </div>
        </div>
    );
}
