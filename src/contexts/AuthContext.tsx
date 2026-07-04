import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User as AppUser, School } from '../types/database';

interface AuthState {
    user: AppUser | null;
    school: School | null;
    session: any;
    loading: boolean;
    isSetupComplete: boolean;
    isInviteFlow: boolean;
}

interface AuthContextType extends AuthState {
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    resetPassword: (email: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    signInAsTest: () => Promise<{ error: any }>;
    refreshUser: () => Promise<void>;
    refreshSchool: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        school: null,
        session: null,
        loading: true,
        isSetupComplete: false,
        isInviteFlow: false,
    });

    const fetchUser = async (userId: string) => {
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        return data;
    };

    const fetchSchool = async (schoolId: string) => {
        const { data } = await supabase
            .from('schools')
            .select('*')
            .eq('id', schoolId)
            .single();
        return data;
    };

    const fetchUserWithSchool = async (userId: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('id', userId)
            .maybeSingle();

        if (!error && data) {
            const { schools, ...user } = data as any;
            return { user, school: schools || null };
        }

        // If user not found in database (e.g., during invite flow), return null
        // This allows the user to proceed to create-account page
        if (error || !data) {
            console.log('User not found in database, likely in invite flow');
            return { user: null, school: null };
        }

        const user = await fetchUser(userId);
        const school = user?.school_id ? await fetchSchool(user.school_id) : null;
        return { user, school };
    };

    const refreshUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const { user, school } = await fetchUserWithSchool(session.user.id);
            if (user) {
                setState(prev => ({
                    ...prev,
                    user,
                    school,
                    isSetupComplete: school?.is_setup_complete ?? false,
                }));
            }
        }
    };

    const refreshSchool = async () => {
        if (state.user?.school_id) {
            const school = await fetchSchool(state.user.school_id);
            setState(prev => ({
                ...prev,
                school,
                isSetupComplete: school?.is_setup_complete ?? false,
            }));
        }
    };

    useEffect(() => {
        // Check if we're on the invite/create-account page
        const isOnCreateAccountPage = window.location.pathname === '/auth/create-account';

        const init = async () => {
            // If on create-account page, don't interfere with the invite flow.
            // Just stop loading and let InviteAcceptPage handle everything.
            if (isOnCreateAccountPage) {
                setState(prev => ({ ...prev, loading: false, isInviteFlow: true }));
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { user, school } = await fetchUserWithSchool(session.user.id);
                setState({
                    user,
                    school,
                    session,
                    loading: false,
                    isSetupComplete: school?.is_setup_complete ?? false,
                    isInviteFlow: false,
                });
            } else {
                setState(prev => ({ ...prev, loading: false }));
            }
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Skip auth state processing on the create-account page to
                // prevent the AuthContext from racing with InviteAcceptPage
                if (isOnCreateAccountPage) return;

                if (event === 'SIGNED_IN' && session?.user) {
                    const { user, school } = await fetchUserWithSchool(session.user.id);
                    setState({
                        user,
                        school,
                        session,
                        loading: false,
                        isSetupComplete: school?.is_setup_complete ?? false,
                        isInviteFlow: false,
                    });
                } else if (event === 'SIGNED_OUT') {
                    setState({
                        user: null,
                        school: null,
                        session: null,
                        loading: false,
                        isSetupComplete: false,
                        isInviteFlow: false,
                    });
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, fullName: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
            },
        });
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        return { error };
    };

    const resetPassword = async (email: string) => {
        const { data: appUser, error: lookupError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (lookupError) return { error: lookupError };
        if (!appUser) return { error: { message: 'No admin account exists for that email.' } };

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/login`,
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const signInAsTest = async () => {
        // Find existing admin
        let { data: user } = await supabase.from('users').select('*').limit(1).maybeSingle();

        if (!user) {
            // Create a dummy school and admin for testing
            const { data: newSchool } = await supabase.from('schools').insert({
                name: 'Test Nexa Academy',
                email: 'test@gmail.com',
                school_type: 'secondary',
                curriculum: 'cbc',
                is_setup_complete: true
            }).select().single();

            if (newSchool) {
                const { data: newUser } = await supabase.from('users').insert({
                    id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for test bypass
                    full_name: 'System Admin (Test)',
                    email: 'admin@gmail.com',
                    school_id: newSchool.id,
                    is_admin: true
                }).select().single();
                user = newUser;
            }
        }

        if (user) {
            const school = user.school_id ? await fetchSchool(user.school_id) : null;
            setState({
                user,
                school,
                session: { user: { id: user.id } },
                loading: false,
                isSetupComplete: school?.is_setup_complete ?? false,
                isInviteFlow: false,
            });
            return { error: null };
        }
        return { error: { message: 'Failed to create test user.' } };
    };

    return (
        <AuthContext.Provider value={{ ...state, signUp, signIn, resetPassword, signOut, refreshUser, refreshSchool, signInAsTest }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
