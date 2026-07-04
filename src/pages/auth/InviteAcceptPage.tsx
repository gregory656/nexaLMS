import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import nexagenImage from '../../assets/nexagen.png';
import toast from 'react-hot-toast';

export default function InviteAcceptPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [email, setEmail] = useState('');
    const [sessionReady, setSessionReady] = useState(false);
    const [tokenError, setTokenError] = useState(false);
    const processedRef = useRef(false);

    useEffect(() => {
        // Check if there's a hash fragment with tokens (from Supabase invite email link).
        // Supabase appends #access_token=...&type=invite to the redirect URL.
        const hash = window.location.hash;
        const hasTokenInHash = hash && (hash.includes('access_token') || hash.includes('token'));

        // Also check for an existing session (user may have already been authenticated)
        const checkExistingSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                setEmail(session.user.email);
                setSessionReady(true);
                processedRef.current = true;
            }
        };

        // Listen for auth state changes.
        // When Supabase processes the hash tokens, it fires SIGNED_IN or PASSWORD_RECOVERY.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[InviteAcceptPage] Auth event:', event);

            if (
                (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') &&
                session?.user?.email
            ) {
                if (!processedRef.current) {
                    processedRef.current = true;
                    setEmail(session.user.email);
                    setSessionReady(true);
                }
            }
        });

        // Check for existing session first
        checkExistingSession();

        // If no hash tokens and no session found, set a timeout to show error
        if (!hasTokenInHash) {
            const timer = setTimeout(() => {
                if (!processedRef.current) {
                    // No tokens in URL and no existing session — invalid access
                    setTokenError(true);
                }
            }, 3000);
            return () => {
                timer && clearTimeout(timer);
                subscription.unsubscribe();
            };
        }

        // If there are tokens in the hash, give Supabase time to process them
        const tokenTimeout = setTimeout(() => {
            if (!processedRef.current) {
                // Supabase didn't fire auth event — token may be expired
                setTokenError(true);
            }
        }, 8000);

        return () => {
            clearTimeout(tokenTimeout);
            subscription.unsubscribe();
        };
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
            // Verify user session is still valid
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Session expired. Please use the invitation link again.");
                navigate('/auth/login');
                setSubmitting(false);
                return;
            }

            // Update user password
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

    // --- Token error / expired state ---
    if (tokenError) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-visual">
                        <img src={nexagenImage} alt="" />
                        <AlertTriangle size={22} />
                    </div>
                    <div className="auth-logo">
                        <div className="auth-logo-icon">N</div>
                        <span className="auth-logo-text">NexaLMS</span>
                    </div>
                    <h2 className="auth-title">Invalid or Expired Link</h2>
                    <p className="auth-subtitle">
                        This invitation link is invalid or has expired. Please ask your administrator to resend the invitation.
                    </p>
                    <a href="/auth/login" className="btn btn-primary btn-lg btn-full mt-4">
                        Go to Sign In
                    </a>
                </div>
            </div>
        );
    }

    // --- Loading state while Supabase processes the token ---
    if (!sessionReady) {
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
                    <h2 className="auth-title">Verifying Invitation...</h2>
                    <p className="auth-subtitle">Please wait while we verify your invitation link.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                        <span className="spinner" />
                    </div>
                </div>
            </div>
        );
    }

    // --- Create account form ---
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
