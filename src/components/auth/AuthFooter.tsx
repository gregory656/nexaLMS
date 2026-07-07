interface AuthFooterProps {
    onDownloadManual?: () => void | Promise<void>;
    downloadingManual?: boolean;
}

export default function AuthFooter({ onDownloadManual, downloadingManual }: AuthFooterProps) {
    return (
        <div className="auth-footer">
            <p className="auth-footer-support">
                <span>Support</span>
                <a href="tel:+254719637416">+254 719 637 416</a>
                <a
                    href="https://wa.me/254719637416?text=Hello%20NexaLMS%20Support"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    WhatsApp
                </a>
            </p>
            {onDownloadManual && (
                <button
                    type="button"
                    className="auth-footer-link"
                    onClick={onDownloadManual}
                    disabled={downloadingManual}
                >
                    {downloadingManual ? 'Preparing…' : 'Download manual'}
                </button>
            )}
        </div>
    );
}
