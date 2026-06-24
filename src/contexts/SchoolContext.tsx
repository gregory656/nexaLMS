import React, { createContext, useContext, useState } from 'react';
import type { School } from '../types/database';

interface SchoolContextType {
    school: School | null;
    setSchool: (school: School | null) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
    const [school, setSchool] = useState<School | null>(null);

    return (
        <SchoolContext.Provider value={{ school, setSchool }}>
            {children}
        </SchoolContext.Provider>
    );
}

export function useSchool() {
    const ctx = useContext(SchoolContext);
    if (!ctx) throw new Error('useSchool must be used within SchoolProvider');
    return ctx;
}
