import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { GraduationCap, Search } from 'lucide-react';

export default function AlumniPage() {
    const { school } = useAuth();
    const [alumni, setAlumni] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!school?.id) return;
        const fetchAll = async () => {
            setLoading(true);
            const [alumniRes, yearRes] = await Promise.all([
                supabase.from('alumni').select('*, academic_years(name), guardians(first_name, last_name)').eq('school_id', school.id).order('created_at', { ascending: false }),
                supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false }),
            ]);
            [alumniRes.error, yearRes.error].filter(Boolean).forEach(error => toast.error(error!.message));
            setAlumni(alumniRes.data || []);
            setYears(yearRes.data || []);
            setSelectedYear(yearRes.data?.[0]?.id || '');
            setLoading(false);
        };
        fetchAll();
    }, [school?.id]);

    const filtered = useMemo(() => alumni.filter(record => {
        const matchesYear = !selectedYear || record.academic_year_id === selectedYear;
        const matchesSearch = `${record.first_name} ${record.last_name} ${record.admission_number || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesYear && matchesSearch;
    }), [alumni, selectedYear, searchTerm]);

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Alumni</h1>
                    <p className="page-subtitle">Graduated learners are archived here by academic year and final class.</p>
                </div>
                <div className="stat-card alumni-count">
                    <GraduationCap size={24} />
                    <div>
                        <div className="text-xs text-muted">Displayed Alumni</div>
                        <strong>{filtered.length}</strong>
                    </div>
                </div>
            </div>

            <div className="card mb-4">
                <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
                    <div className="header-search" style={{ maxWidth: '300px' }}>
                        <Search />
                        <input placeholder="Search alumni..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ maxWidth: 220 }} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                        <option value="">All academic years</option>
                        {years.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="card">
                {loading ? <div className="flex justify-center p-8"><span className="spinner" /></div> : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Adm No.</th>
                                    <th>Final Class</th>
                                    <th>Academic Year</th>
                                    <th>Guardian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(record => (
                                    <tr key={record.id}>
                                        <td><strong>{record.first_name} {record.last_name}</strong></td>
                                        <td>{record.admission_number || '-'}</td>
                                        <td>{record.final_class_name || '-'}</td>
                                        <td>{record.academic_years?.name || '-'}</td>
                                        <td>{record.guardians ? `${record.guardians.first_name} ${record.guardians.last_name}` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!filtered.length && <div className="empty-state"><h3>No alumni records</h3><p>Create a new academic year with promotion enabled to populate this dashboard.</p></div>}
                    </div>
                )}
            </div>
        </>
    );
}
