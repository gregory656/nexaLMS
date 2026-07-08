import { Download, FileText, FolderOpen } from 'lucide-react';
import { businessDocuments, downloadBusinessDocument } from '../../lib/businessDocumentsPdf';

const categories = Array.from(new Set(businessDocuments.map(doc => doc.category)));

export default function DocumentationPage() {
    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Business Documentation</h1>
                    <p className="page-subtitle">Download NexaLMS sales, legal, onboarding, support, and security documents.</p>
                </div>
                <a className="btn btn-secondary" href="/site/documentation" target="_blank" rel="noreferrer">
                    <FileText size={16} /> Website docs
                </a>
            </div>

            <div className="documentation-hero mb-6">
                <div>
                    <span className="documentation-kicker">NexaGen Technologies</span>
                    <h2>School-ready documentation pack</h2>
                    <p>
                        Use these files when visiting schools, preparing proposals, issuing quotations,
                        explaining compliance, and onboarding a signed institution.
                    </p>
                </div>
                <div className="documentation-payment">
                    <strong>Official payment details</strong>
                    <span>M-PESA: 0719637416</span>
                    <span>Paybill: 522522</span>
                    <span>Account: 1339185296</span>
                    <span>Bank: 1339185396</span>
                    <small>Both names: STEPHEN OTIENO</small>
                </div>
            </div>

            <div className="documentation-groups">
                {categories.map(category => {
                    const docs = businessDocuments.filter(doc => doc.category === category);
                    return (
                        <section className="documentation-section" key={category}>
                            <div className="documentation-section-header">
                                <FolderOpen size={20} />
                                <h3>{category}</h3>
                            </div>
                            <div className="documentation-grid">
                                {docs.map(doc => (
                                    <article className="documentation-card" key={doc.id}>
                                        <div className="documentation-card-icon">
                                            <FileText size={20} />
                                        </div>
                                        <div className="documentation-card-body">
                                            <h4>{doc.title}</h4>
                                            <p>{doc.summary}</p>
                                            <span>{doc.fileName}.pdf</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => downloadBusinessDocument(doc)}
                                        >
                                            <Download size={14} /> PDF
                                        </button>
                                    </article>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </>
    );
}
