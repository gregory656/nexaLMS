import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, CreditCard, Zap, ShieldCheck, TrendingUp, Info } from 'lucide-react';

export default function SubscriptionPage() {
    const { school } = useAuth();
    const [plans, setPlans] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [studentCount, setStudentCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            if (!school?.id) return;
            setLoading(true);

            const [plansRes, subRes, stuRes] = await Promise.all([
                supabase.from('subscription_plans').select('*').eq('is_active', true),
                supabase.from('subscriptions').select('*, subscription_plans(*)').eq('school_id', school.id).maybeSingle(),
                supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
            ]);

            setPlans(plansRes.data || []);
            setSubscription(subRes.data || null);
            setStudentCount(stuRes.count || 0);
            setLoading(false);
        };

        fetchData();
    }, [school?.id]);

    const pricing = {
        basic: 50, // 50 KES per student
        pro: 150,  // 150 KES per student
    };

    const calculateTotal = (planType: string) => {
        const rate = planType === 'pro' ? pricing.pro : pricing.basic;
        // Minimum charge for 10 students
        const effectiveCount = Math.max(studentCount, 10);
        return effectiveCount * rate;
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Subscription Plan</h1>
                    <p className="page-subtitle">Manage your NexaLMS licensing and features</p>
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                <>
                    {/* Current Subscription Status */}
                    <div className="card mb-8" style={{ borderLeft: '4px solid var(--green-500)' }}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="card-title mb-1">Current Status</h3>
                                {subscription ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="badge badge-green">Active: {subscription.subscription_plans?.name}</span>
                                            <span className="text-sm text-muted">Started on {new Date(subscription.start_date).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm">You are currently billed for <strong>{subscription.total_students}</strong> students.</p>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="badge badge-orange">Trial Period</span>
                                        <span className="text-sm text-muted">Explore NexaLMS features for free</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="text-xs text-muted">Student Count</div>
                                <div className="font-bold text-xl" style={{ color: 'var(--green-700)' }}>{studentCount} Students</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid-2">
                        {plans.map(plan => (
                            <div key={plan.id} className="card" style={{
                                position: 'relative',
                                border: plan.plan_type === 'pro' ? '2px solid var(--green-500)' : '1px solid var(--gray-200)',
                                background: plan.plan_type === 'pro' ? 'linear-gradient(to bottom, var(--green-50), white)' : 'white'
                            }}>
                                {plan.plan_type === 'pro' && (
                                    <div style={{
                                        position: 'absolute', top: -12, right: 20,
                                        background: 'var(--green-500)', color: 'white',
                                        padding: '2px 10px', borderRadius: 'var(--radius-full)',
                                        fontSize: '0.7rem', fontWeight: 'bold'
                                    }}>RECOMMENDED</div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="stat-icon" style={{
                                        background: plan.plan_type === 'pro' ? 'var(--green-500)' : 'var(--gray-100)',
                                        color: plan.plan_type === 'pro' ? 'white' : 'var(--gray-600)'
                                    }}>
                                        {plan.plan_type === 'pro' ? <Zap size={20} /> : <CreditCard size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{plan.name}</h3>
                                        <p className="text-xs text-muted">{plan.description}</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold">KES {pricing[plan.plan_type as keyof typeof pricing]}</span>
                                        <span className="text-muted text-sm">/ student / term</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted mt-1">
                                        <TrendingUp size={12} /> Charge scales automatically with student intake
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Key Features</h4>
                                    <ul style={{ listStyle: 'none' }}>
                                        {plan.features?.map((f: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2 text-sm mb-2">
                                                <Check size={14} style={{ color: 'var(--green-500)' }} /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.25rem' }}>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-semibold">Estimated Total ({studentCount} students)</span>
                                        <span className="text-lg font-bold">KES {calculateTotal(plan.plan_type).toLocaleString()}</span>
                                    </div>
                                    <button className={`btn btn-full ${plan.plan_type === 'pro' ? 'btn-primary' : 'btn-secondary'}`} disabled={subscription?.plan_id === plan.id}>
                                        {subscription?.plan_id === plan.id ? 'Current Plan' : `Switch to ${plan.name}`}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card mt-6" style={{ background: 'var(--info-light)', borderColor: 'var(--info)' }}>
                        <div className="flex gap-3">
                            <Info size={20} style={{ color: 'var(--info)', flexShrink: 0 }} />
                            <div>
                                <h4 className="text-sm font-bold" style={{ color: 'var(--info)' }}>Dynamic Pricing Policy</h4>
                                <p className="text-xs mt-1" style={{ color: '#1e40af' }}>
                                    Your final bill for the term is calculated at every student admission. NexaLMS ensures you only pay for the students you are actively managing. Prices exclude VAT.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
