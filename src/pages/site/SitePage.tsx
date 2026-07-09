import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check, Download, LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import nexagenLogo from '../../assets/nexagen.png';
import heroImage from '../../assets/hero.png';
import { businessDocuments, downloadBusinessDocument } from '../../lib/businessDocumentsPdf';
import { homepageHighlights, pricingPlans, sitePages } from './siteContent';

export default function SitePage() {
    const { page } = useParams();
    const [menuOpen, setMenuOpen] = useState(false);
    const activePage = sitePages.find(item => item.slug === page);

    const renderHome = () => (
        <>
            <section className="site-hero" style={{ backgroundImage: `linear-gradient(115deg, rgba(4, 120, 87, 0.94), rgba(15, 118, 110, 0.88)), url(${heroImage})` }}>
                <div className="site-hero-inner">
                    <div className="site-hero-copy">
                        <img src={nexagenLogo} alt="NexaGen" className="site-hero-logo" />
                        <h1>NexaLMS</h1>
                        <p>
                            A school management system for Kenyan schools that need clean records,
                            fast report cards, dependable fee tracking, and a demo that feels real.
                        </p>
                        <div className="site-hero-actions">
                            <Link className="site-btn site-btn-primary" to="/auth/login"><LogIn size={18} /> Login</Link>
                            <Link className="site-btn site-btn-secondary" to="/site/pricing">View pricing <ArrowRight size={18} /></Link>
                        </div>
                    </div>
                    <div className="site-hero-panel">
                        <span>Monthly from</span>
                        <strong>KES 5</strong>
                        <small>per active student</small>
                        <div className="site-mini-grid">
                            <div><b>300</b><span>demo students</span></div>
                            <div><b>20</b><span>demo teachers</span></div>
                            <div><b>PDF</b><span>documents</span></div>
                            <div><b>Live</b><span>analytics</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="site-band">
                <div className="site-section-heading">
                    <span>What schools see</span>
                    <h2>Polished from the first demo</h2>
                </div>
                <div className="site-feature-grid">
                    {homepageHighlights.map(item => (
                        <article className="site-feature-card" key={item.title}>
                            <item.icon size={22} />
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="site-band site-band-soft">
                <div className="site-section-heading">
                    <span>Packages</span>
                    <h2>Choose a plan by school readiness</h2>
                </div>
                <div className="site-pricing-grid">
                    {pricingPlans.map(plan => (
                        <article className="site-price-card" key={plan.name}>
                            <h3>{plan.name}</h3>
                            <p>{plan.description}</p>
                            <div className="site-price">KES {plan.price}<span>/student/month</span></div>
                            {plan.features.map(feature => <div className="site-check" key={feature}><Check size={16} /> {feature}</div>)}
                        </article>
                    ))}
                </div>
            </section>
        </>
    );

    const renderDetail = () => {
        if (!activePage) return renderHome();
        const Icon = activePage.icon;
        return (
            <>
                <section className="site-page-hero">
                    <div>
                        <span>{activePage.eyebrow}</span>
                        <h1>{activePage.title}</h1>
                        <p>{activePage.description}</p>
                    </div>
                    <Icon size={64} />
                </section>

                <section className="site-band">
                    <div className="site-detail-list">
                        {activePage.bullets.map(item => (
                            <div className="site-detail-row" key={item}>
                                <Check size={18} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {activePage.slug === 'documentation' && (
                    <section className="site-band site-band-soft">
                        <div className="site-section-heading">
                            <span>Downloads</span>
                            <h2>Business document PDFs</h2>
                        </div>
                        <div className="site-doc-grid">
                            {businessDocuments.map(doc => (
                                <button className="site-doc-download" type="button" key={doc.id} onClick={() => downloadBusinessDocument(doc)}>
                                    <span>{doc.title}</span>
                                    <small>{doc.fileName}.pdf</small>
                                    <Download size={16} />
                                </button>
                            ))}
                        </div>
                    </section>
                )}


            </>
        );
    };

    return (
        <div className="site-shell">
            <header className="site-header">
                <Link className="site-brand" to="/site">
                    <img src={nexagenLogo} alt="NexaGen" />
                    <span>NexaLMS</span>
                </Link>
                <button className="site-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <nav className={menuOpen ? 'open' : ''}>
                    <Link to="/site" onClick={() => setMenuOpen(false)}>Home</Link>
                    {sitePages.map(item => (
                        <Link key={item.slug} to={`/site/${item.slug}`} onClick={() => setMenuOpen(false)}>{item.label}</Link>
                    ))}
                    <Link className="site-login-link" to="/auth/login"><LogIn size={16} /> Login</Link>
                </nav>
            </header>
            <main>{activePage ? renderDetail() : renderHome()}</main>
            <footer className="site-footer">
                <span>NexaGen Technologies</span>
                <span>+254 719 637 416</span>
                <span>www.nexagen.co.ke</span>
            </footer>
        </div>
    );
}
