import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, CreditCard, Info } from 'lucide-react';

const plans = [
    {
        name: 'Starter',
        price: 5,
        description: 'Essential school operations for a clean first rollout.',
        features: ['Student Management', 'Teachers', 'Attendance'],
    },
    {
        name: 'Standard',
        price: 7,
        description: 'Academic management for reports, exams, and timetables.',
        features: ['Everything in Starter', 'Exams', 'Report Cards', 'Timetable'],
    },
    {
        name: 'Premium',
        price: 10,
        description: 'Full operating system for finance, analytics, and priority support.',
        features: ['Everything in Standard', 'Finance', 'Analytics', 'Priority Support'],
    },
];

export default function SubscriptionPage() {
    const { school } = useAuth();
    const [loading, setLoading] = useState(true);
    const [studentCount, setStudentCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            if (!school?.id) return;
            setLoading(true);

            const { count } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', school.id)
                .eq('status', 'active');

            setStudentCount(count || 0);
            setLoading(false);
        };

        fetchData();
    }, [school?.id]);

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Software Licensing & Subscription</h1>
                    <p className="page-subtitle">Manage NexaLMS billing, packages, and official payment details</p>
                </div>
            </div>

            {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                <>
                    <div className="card mb-8" style={{ borderLeft: '4px solid var(--green-500)' }}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="card-title mb-1">Current Billing Summary</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="badge badge-green">Active Subscription</span>
                                    <span className="text-sm text-muted">Billed monthly based on active students</span>
                                </div>
                                <p className="text-sm">You are currently managing <strong>{studentCount}</strong> active students.</p>
                            </div>
                        </div>
                    </div>

                    <div className="subscription-plan-grid mb-6">
                        {plans.map((plan, index) => (
                            <div className="subscription-plan-card" key={plan.name}>
                                <div className="subscription-plan-top">
                                    <span className={`badge ${index === 0 ? 'badge-blue' : index === 1 ? 'badge-green' : 'badge-orange'}`}>{plan.name}</span>
                                    <strong>KES {plan.price}</strong>
                                    <small>per active student / month</small>
                                </div>
                                <p>{plan.description}</p>
                                <div className="subscription-feature-list">
                                    {plan.features.map(feature => (
                                        <span key={feature}><Check size={15} /> {feature}</span>
                                    ))}
                                </div>
                                <div className="subscription-total">
                                    <span>For {studentCount} students</span>
                                    <strong>KES {(studentCount * plan.price).toLocaleString()} / month</strong>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card" style={{ maxWidth: 720, margin: '0 auto', borderTop: '4px solid var(--green-500)' }}>
                        <div className="text-center mb-6">
                            <div className="stat-icon mx-auto mb-4" style={{ background: 'var(--green-50)', color: 'var(--green-600)', width: 64, height: 64 }}>
                                <CreditCard size={32} />
                            </div>
                            <h2 className="text-2xl font-bold">Monthly Usage Calculation</h2>
                            <p className="text-muted text-sm mt-2">Choose a package, then multiply by active students only.</p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                                <span className="text-gray-600 uppercase text-xs font-bold tracking-wider">Plan</span>
                                <span className="text-gray-600 uppercase text-xs font-bold tracking-wider">Expected Payment</span>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <span className="font-semibold text-gray-800">Total Active Students</span>
                                <span className="font-bold text-lg">{studentCount} <span className="text-sm font-normal text-muted">students</span></span>
                            </div>

                            {plans.map(plan => (
                                <div className="subscription-calc-row" key={plan.name}>
                                    <span>{plan.name} at KES {plan.price}</span>
                                    <strong>KES {(studentCount * plan.price).toLocaleString()} <small>/ month</small></strong>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                className="btn btn-primary btn-full py-4 flex items-center justify-center gap-3 relative overflow-hidden"
                                style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                                onClick={() => window.open('https://nexagen.co.ke/stkpush', '_blank')}
                            >
                                <div className="font-black italic tracking-tighter text-white" style={{ fontSize: '1.2rem', padding: '2px 6px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>
                                    M-PESA
                                </div>
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="font-bold text-sm">Pay via M-PESA</span>
                                    <span className="text-xs opacity-90">0719637416 STEPHEN OTIENO</span>
                                </div>
                            </button>
                            <div className="subscription-payment-grid">
                                <div><strong>Paybill</strong><span>522522</span></div>
                                <div><strong>Account</strong><span>1339185296</span></div>
                                <div><strong>Bank Transfer</strong><span>1339185396</span></div>
                                <div><strong>Name</strong><span>STEPHEN OTIENO</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="card mt-6" style={{ background: 'var(--info-light)', borderColor: 'var(--info)' }}>
                        <div className="flex gap-3">
                            <Info size={20} style={{ color: 'var(--info)', flexShrink: 0 }} />
                            <div>
                                <h4 className="text-sm font-bold" style={{ color: 'var(--info)' }}>Official NexaGen Billing Policy</h4>
                                <p className="text-xs mt-1" style={{ color: '#1e40af' }}>
                                    Your software access fee is dynamically calculated from the selected package:
                                    Starter KES 5, Standard KES 7, or Premium KES 10 per active student profile per month.
                                    Alumni, transferred, or inactive students are excluded from this calculation.
                                    <br /><br />
                                    <strong>Need Help?</strong> Contact support via <a href="https://nexagen.co.ke" target="_blank" rel="noreferrer" className="underline font-bold">nexagen.co.ke</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
