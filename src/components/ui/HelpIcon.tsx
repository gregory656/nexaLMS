import { HelpCircle } from 'lucide-react';
import { useHelpSidebar } from '../../contexts/HelpContext';

interface HelpIconProps {
  section?: string;
  className?: string;
}

export default function HelpIcon({ section, className = '' }: HelpIconProps) {
  const { openHelp } = useHelpSidebar();

  return (
    <button
      className={`help-icon-button ${className}`}
      onClick={() => openHelp(section)}
      title="Get help with this page"
    >
      <HelpCircle size={18} />
    </button>
  );
}
