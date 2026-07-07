import { createContext, useContext, useState, type ReactNode } from 'react';

interface HelpContextType {
  isOpen: boolean;
  initialSection: string | null;
  openHelp: (section?: string) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialSection, setInitialSection] = useState<string | null>(null);

  const openHelp = (section?: string) => {
    setInitialSection(section || null);
    setIsOpen(true);
  };

  const closeHelp = () => {
    setIsOpen(false);
    setInitialSection(null);
  };

  return (
    <HelpContext.Provider value={{ isOpen, initialSection, openHelp, closeHelp }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelpSidebar() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelpSidebar must be used within a HelpProvider');
  }
  return context;
}
