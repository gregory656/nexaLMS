import { useState } from 'react';
import { X, Search, Book, Download, ChevronRight, ExternalLink } from 'lucide-react';
import { helpSections, searchHelpContent } from '../../data/helpContent';
import { generateUserManualPdf, downloadPdf } from '../../lib/manualPdf';

interface HelpSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: string;
}

export default function HelpSidebar({ isOpen, onClose, initialSection }: HelpSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(initialSection || null);
  const [, setActiveSubsection] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const filteredSections = searchHelpContent(searchQuery);
  const activeSectionData = activeSection ? helpSections.find(s => s.id === activeSection) : null;

  const handleDownloadManual = async () => {
    setDownloading(true);
    try {
      const doc = await generateUserManualPdf();
      downloadPdf(doc, `NexaLMS_User_Manual_V1.0.0`);
    } catch (error) {
      console.error('Failed to download manual:', error);
    }
    setDownloading(false);
  };

  const scrollToSubsection = (subsectionId: string) => {
    setActiveSubsection(subsectionId);
    setTimeout(() => {
      const element = document.getElementById(`subsection-${subsectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="help-sidebar-overlay" onClick={onClose}>
      <div className="help-sidebar" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="help-sidebar-header">
          <div className="flex items-center gap-2">
            <Book size={24} className="text-green-600" />
            <h2 className="help-sidebar-title">Help Centre</h2>
          </div>
          <button className="help-sidebar-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="help-sidebar-search">
          <div className="form-input-icon">
            <Search size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Download Manual Button */}
        <div className="help-sidebar-download">
          <button
            className="btn btn-primary btn-sm btn-full"
            onClick={handleDownloadManual}
            disabled={downloading}
          >
            {downloading ? (
              <span className="spinner" />
            ) : (
              <>
                <Download size={16} />
                Download User Manual (PDF)
              </>
            )}
          </button>
          <p className="text-xs text-muted text-center mt-1">
            Version 1.0.0 • Updated: Jan 7, 2025
          </p>
        </div>

        {/* Content */}
        <div className="help-sidebar-content">
          {!activeSection ? (
            /* Section List */
            <div className="help-sections-list">
              {filteredSections.map((section) => (
                <div
                  key={section.id}
                  className="help-section-item"
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="help-section-icon">{section.icon}</span>
                    <div className="flex-1">
                      <h3 className="help-section-item-title">{section.title}</h3>
                      <p className="help-section-item-desc">{section.content.slice(0, 80)}...</p>
                    </div>
                    <ChevronRight size={16} className="text-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Section Detail */
            <div className="help-section-detail">
              <button
                className="help-back-button"
                onClick={() => {
                  setActiveSection(null);
                  setActiveSubsection(null);
                }}
              >
                <ChevronRight size={16} className="rotate-180" />
                Back to all topics
              </button>

              <div className="help-detail-header">
                <span className="help-detail-icon">{activeSectionData?.icon}</span>
                <h2 className="help-detail-title">{activeSectionData?.title}</h2>
              </div>

              <div className="help-detail-content">
                <p className="help-detail-intro">{activeSectionData?.content}</p>

                {activeSectionData?.subsections && (
                  <div className="help-subsections">
                    {activeSectionData.subsections.map((subsection) => (
                      <div
                        key={subsection.id}
                        id={`subsection-${subsection.id}`}
                        className="help-subsection"
                      >
                        <h3 className="help-subsection-title">{subsection.title}</h3>
                        <p className="help-subsection-content">{subsection.content}</p>

                        {subsection.steps && subsection.steps.length > 0 && (
                          <div className="help-steps">
                            <h4 className="help-steps-title">Steps:</h4>
                            <ol className="help-steps-list">
                              {subsection.steps.map((step, index) => (
                                <li key={index} className="help-step-item">{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {subsection.tips && subsection.tips.length > 0 && (
                          <div className="help-tips">
                            <h4 className="help-tips-title">💡 Tips:</h4>
                            <ul className="help-tips-list">
                              {subsection.tips.map((tip, index) => (
                                <li key={index} className="help-tip-item">{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {subsection.troubleshooting && subsection.troubleshooting.length > 0 && (
                          <div className="help-troubleshooting">
                            <h4 className="help-troubleshooting-title">🔧 Troubleshooting:</h4>
                            <div className="help-troubleshooting-list">
                              {subsection.troubleshooting.map((item, index) => (
                                <div key={index} className="help-troubleshoot-item">
                                  <div className="help-troubleshoot-problem">
                                    <strong>Problem:</strong> {item.problem}
                                  </div>
                                  <div className="help-troubleshoot-solution">
                                    <strong>Solution:</strong> {item.solution}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Navigation */}
              {activeSectionData?.subsections && activeSectionData.subsections.length > 3 && (
                <div className="help-quick-nav">
                  <h4 className="help-quick-nav-title">Quick Navigation:</h4>
                  <div className="help-quick-nav-list">
                    {activeSectionData.subsections.map((subsection) => (
                      <button
                        key={subsection.id}
                        className="help-quick-nav-item"
                        onClick={() => scrollToSubsection(subsection.id)}
                      >
                        {subsection.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="help-sidebar-footer">
          <p className="help-sidebar-footer-text">
            Need more help?{' '}
            <a href="tel:+254719637416" className="help-sidebar-footer-link">
              Contact Support
            </a>
          </p>
          <a
            href="https://nexagen.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="help-sidebar-footer-link flex items-center gap-1"
          >
            www.nexagen.co.ke <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
