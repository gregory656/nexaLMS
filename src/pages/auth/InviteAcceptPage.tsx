import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import toast from 'react-hot-toast';

export default function InviteAcceptPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [validInvite, setValidInvite] = useState(false);
    const [email, setEmail] = useState('');

    useEffect(() => {
        // Check if this is accessed from a valid invitation flow
        const checkInviteValidity = async () => {
            // First check if there's an active session (Supabase auto-auths from email link)
            const { data: { session } } = await supabase.auth.getSession();
            
            console.log('Current session:', session);

            // Check URL hash for tokens (Supabase passes them here)
            const hash = window.location.hash;
            console.log('URL hash:', hash);
            
            // If there's a hash with tokens, let Supabase handle it
            if (hash && (hash.includes('access_token') || hash.includes('type=invite'))) {
                console.log('Found tokens in hash, waiting for Supabase to process...');
                // Supabase will automatically process the hash and set the session
                // We'll wait for the onAuthStateChange event
                return;
            }

            // If no session and no hash tokens, redirect to login
            if (!session) {
                console.log('No session found, redirecting to login');
                toast.error("Invalid invitation link. Please use the link from your email.");
                navigate('/auth/login');
                return;
            }

            // Session exists - this is a valid invite flow
            if (session.user?.email) {
                setEmail(session.user.email);
            }
            setValidInvite(true);
        };

        checkInviteValidity();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            
            if (event === 'SIGNED_IN' && session) {
                if (session.user?.email) {
                    setEmail(session.user.email);
                }
                setValidInvite(true);
            } else if (event === 'PASSWORD_RECOVERY' && session) {
                if (session.user?.email) {
                    setEmail(session.user.email);
                }
                setValidInvite(true);
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate, searchParams]);

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match"); return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters"); return;
        }

        setLoading(true);
        
        try {
            // Check if user already has a password set (prevents duplicate account creation)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Session expired. Please use the invitation link again.");
                navigate('/auth/login');
                return;
            }

            // Update user password
            const { error } = await supabase.auth.updateUser({ password });
            
            if (error) {
                // Check if error indicates user already has a password
                if (error.message.includes('password') || error.message.includes('already')) {
                    toast.error("Account has already been created. Please sign in with your password.");
                } else {
                    toast.error(error.message);
                }
                setLoading(false);
                return;
            }

            // Success - sign out user so they can sign in with their new credentials
            await supabase.auth.signOut();
            
            toast.success("Account created successfully! Please sign in with your new password.");
            
            // Redirect to sign-in page
            navigate('/auth/login');
        } catch (error: any) {
            toast.error(error.message || "Failed to create account. Please try again.");
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
                <h2 className="auth-title">Create Your Account</h2>
                <p className="auth-subtitle">
                    {email ? `You're invited to join as ${email}. Set your password to activate your account.` : 'Set a secure password to activate your account.'}
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
                        {loading ? <span className="spinner" /> : 'Create Account'}
                    </button>

                    <p className="text-sm text-center text-muted mt-4">
                        If you reached here by mistake, please <a href="/auth/login" className="underline font-bold">sign in</a>.
                    </p>
                </form>
            </div>
        </div>
    );
}
