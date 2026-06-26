import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, School, Trash2, X } from 'lucide-react';

export default function HousesPage() {
    const { school } = useAuth();
    const [houses, setHouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [houseName, setHouseName] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchHouses = async () => {
        if (!school?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('houses')
            .select('*')
            .eq('school_id', school.id)
            .order('name');

        if (error) toast.error(error.message);
        setHouses(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchHouses(); }, [school?.id]);

    const handleSave = async () => {
        if (!school?.id || !houseName.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('houses').insert({
            school_id: school.id,
            name: houseName.trim(),
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('House saved');
            setHouseName('');
            setShowModal(false);
            await fetchHouses();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this house?')) return;
        const { error } = await supabase.from('houses').delete().eq('id', id);
        if (error) toast.error(error.message);
        else {
            toast.success('House removed');
            await fetchHouses();
        }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Houses</h1>
                    <p className="page-subtitle">Create houses before admitting students</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> New House
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex justify-center p-8"><span className="spinner" /></div>
                ) : (
                    <div className="grid-4">
                        {houses.map(house => (
                            <div key={house.id} className="card" style={{ background: 'var(--gray-50)' }}>
                                <div className="flex items-center justify-between">
                                    <School size={24} style={{ color: 'var(--green-600)' }} />
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(house.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <h4 className="font-bold mt-3">{house.name}</h4>
                                <p className="text-xs text-muted mt-1">Available during student admission</p>
                            </div>
                        ))}
                        {houses.length === 0 && (
                            <div className="empty-state" style={{ gridColumn: 'span 4' }}>
                                <h3>No houses added</h3>
                                <p>Add house names here before creating students.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add House</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">House Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Muthaiga"
                                    value={houseName}
                                    onChange={e => setHouseName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !houseName.trim()}>
                                {saving ? <span className="spinner" /> : 'Save House'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
