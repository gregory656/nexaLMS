import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Mail, Phone, MessageSquare, MapPin,
    Send, CheckCircle, Smartphone, Building2, CreditCard, LogIn
} from 'lucide-react';
import nexagenLogo from '../../assets/nexagen.png';

type FormData = {
    name: string;
    school: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
};

export default function ContactPage() {
    const [form, setForm] = useState<FormData>({ name: '', school: '', email: '', phone: '', subject: 'demo', message: '' });
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) return;
        setSending(true);
        await new Promise(r => setTimeout(r, 1400));
        setSending(false);
        setSent(true);
    };

    const contactMethods = [
        {
            icon: Phone,
            label: 'Phone & WhatsApp',
            value: '+254 719 637 416',
            sub: 'Mon – Sat, 8 AM – 6 PM EAT',
            color: '#10b981',
            action: 'tel:+254719637416',
        },
        {
            icon: Mail,
            label: 'Email',
            value: 'hello@nexagen.co.ke',
            sub: 'We reply within 24 hours',
            color: '#3b82f6',
            action: 'mailto:hello@nexagen.co.ke',
        },
        {
            icon: MessageSquare,
            label: 'WhatsApp Chat',
            value: 'Chat directly with us',
            sub: 'Fastest response channel',
            color: '#22c55e',
            action: 'https://wa.me/254719637416',
        },
        {
            icon: MapPin,
            label: 'Location',
            value: 'Nairobi, Kenya',
            sub: 'Remote-first, serving all counties',
            color: '#f59e0b',
            action: null,
        },
    ];

    const paymentMethods = [
        {
            icon: Smartphone,
            label: 'M-PESA (Send Money)',
            lines: ['Number: 0719 637 416', 'Name: STEPHEN OTIENO'],
            accent: '#10b981',
        },
        {
            icon: Building2,
            label: 'M-PESA Paybill',
            lines: ['Paybill: 522522', 'Account: 1339185296'],
            accent: '#06b6d4',
        },
        {
            icon: CreditCard,
            label: 'Bank Transfer',
            lines: ['Account: 1339185396', 'Name: STEPHEN OTIENO'],
            accent: '#8b5cf6',
        },
    ];

    return (
        <div className="contact-shell">
            {/* Animated background */}
            <div className="contact-bg">
                <div className="contact-orb contact-orb-1" />
                <div className="contact-orb contact-orb-2" />
                <div className="contact-orb contact-orb-3" />
                <div className="contact-grid-overlay" />
            </div>

            {/* Header */}
            <header className="contact-header">
                <Link to="/site" className="contact-back">
                    <ArrowLeft size={18} />
                    <img src={nexagenLogo} alt="NexaGen" />
                    <span>NexaLMS</span>
                </Link>
                <nav className="contact-header-nav">
                    <Link to="/site">Home</Link>
                    <Link to="/site/features">Features</Link>
                    <Link to="/site/pricing">Pricing</Link>
                    <Link to="/auth/login" className="contact-login-btn">
                        <LogIn size={16} /> Login
                    </Link>
                </nav>
            </header>

            {/* Hero */}
            <section className="contact-hero">
                <div className="contact-hero-badge">Sales & Support</div>
                <h1 className="contact-hero-title">
                    Let's build your<br />
                    <span className="contact-gradient-text">digital school</span>
                </h1>
                <p className="contact-hero-sub">
                    Book a live demo, request a custom quote, or ask anything about NexaLMS.
                    Our team is ready to walk your school through the platform.
                </p>
            </section>

            {/* Main content grid */}
            <div className="contact-main">

                {/* Left — Contact methods + payment */}
                <div className="contact-left">

                    {/* Contact methods */}
                    <div className="contact-glass-card">
                        <h2 className="contact-card-title">Get in touch</h2>
                        <div className="contact-methods">
                            {contactMethods.map(m => (
                                <div key={m.label} className="contact-method-item">
                                    <div className="contact-method-icon" style={{ background: `${m.color}22`, color: m.color }}>
                                        <m.icon size={20} />
                                    </div>
                                    <div className="contact-method-body">
                                        <span className="contact-method-label">{m.label}</span>
                                        {m.action ? (
                                            <a href={m.action} className="contact-method-value" target={m.action.startsWith('http') ? '_blank' : '_self'} rel="noreferrer">
                                                {m.value}
                                            </a>
                                        ) : (
                                            <span className="contact-method-value no-link">{m.value}</span>
                                        )}
                                        <span className="contact-method-sub">{m.sub}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="contact-glass-card contact-payment-card">
                        <h2 className="contact-card-title">Payment channels</h2>
                        <p className="contact-card-sub">Subscription payments accepted via:</p>
                        <div className="contact-payment-grid">
                            {paymentMethods.map(pm => (
                                <div key={pm.label} className="contact-pay-item" style={{ borderTop: `3px solid ${pm.accent}` }}>
                                    <div className="contact-pay-icon" style={{ color: pm.accent }}>
                                        <pm.icon size={22} />
                                    </div>
                                    <h4>{pm.label}</h4>
                                    {pm.lines.map(l => <p key={l}>{l}</p>)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick responses */}
                    <div className="contact-glass-card contact-promise-card">
                        <div className="contact-promise-row">
                            <CheckCircle size={18} className="contact-promise-icon" />
                            <div>
                                <strong>Live demo within 24 hours</strong>
                                <p>A NexaGen team member will walk your school through the platform.</p>
                            </div>
                        </div>
                        <div className="contact-promise-row">
                            <CheckCircle size={18} className="contact-promise-icon" />
                            <div>
                                <strong>Custom quote in 48 hours</strong>
                                <p>Pricing is based on your active student count. No hidden fees.</p>
                            </div>
                        </div>
                        <div className="contact-promise-row">
                            <CheckCircle size={18} className="contact-promise-icon" />
                            <div>
                                <strong>Onboarding support included</strong>
                                <p>We help your team set up the system and train administrators.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right — Contact form */}
                <div className="contact-right">
                    <div className="contact-glass-card contact-form-card">
                        {sent ? (
                            <div className="contact-success">
                                <div className="contact-success-icon">
                                    <CheckCircle size={48} />
                                </div>
                                <h2>Message received!</h2>
                                <p>Thank you, <strong>{form.name}</strong>. We'll get back to you at <strong>{form.email}</strong> within one business day.</p>
                                <button className="contact-submit-btn" onClick={() => { setSent(false); setForm({ name: '', school: '', email: '', phone: '', subject: 'demo', message: '' }); }}>
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2 className="contact-card-title">Send us a message</h2>
                                <p className="contact-card-sub">Fill in your details and we'll be in touch shortly.</p>
                                <form className="contact-form" onSubmit={handleSubmit}>
                                    <div className="contact-form-row">
                                        <div className="contact-form-group">
                                            <label>Your name *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. John Mwangi"
                                                value={form.name}
                                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div className="contact-form-group">
                                            <label>School name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Moi High School"
                                                value={form.school}
                                                onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="contact-form-row">
                                        <div className="contact-form-group">
                                            <label>Email address *</label>
                                            <input
                                                type="email"
                                                placeholder="you@school.ac.ke"
                                                value={form.email}
                                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div className="contact-form-group">
                                            <label>Phone / WhatsApp</label>
                                            <input
                                                type="tel"
                                                placeholder="+254 700 000 000"
                                                value={form.phone}
                                                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="contact-form-group">
                                        <label>What can we help with?</label>
                                        <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                                            <option value="demo">Book a live demo</option>
                                            <option value="quote">Request a quote / proposal</option>
                                            <option value="onboarding">Onboarding & setup help</option>
                                            <option value="pricing">Pricing enquiry</option>
                                            <option value="support">Technical support</option>
                                            <option value="partnership">Partnership / reseller</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="contact-form-group">
                                        <label>Message *</label>
                                        <textarea
                                            placeholder="Tell us about your school — student count, what you need, or any questions you have…"
                                            value={form.message}
                                            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                            rows={5}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="contact-submit-btn" disabled={sending}>
                                        {sending ? (
                                            <><span className="contact-spinner" /> Sending…</>
                                        ) : (
                                            <><Send size={18} /> Send message</>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="contact-footer">
                <span>NexaGen Technologies © {new Date().getFullYear()}</span>
                <span>+254 719 637 416</span>
                <span>www.nexagen.co.ke</span>
            </footer>
        </div>
    );
}
