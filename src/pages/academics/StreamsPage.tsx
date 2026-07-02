import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Plus, Home, Layers, School, X, Edit2, Trash2 } from 'lucide-react';

export default function StreamsPage() {
    const { school } = useAuth();
    const [streams, setStreams] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'streams' | 'grades' | 'classes'>('streams');

    // Modals
    const [showStreamModal, setShowStreamModal] = useState(false);
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [showClassModal, setShowClassModal] = useState(false);

    // Forms
    const [streamName, setStreamName] = useState('');
    const [gradeName, setGradeName] = useState('');
    const [gradeOrder, setGradeOrder] = useState('1');
    const [classGradeId, setClassGradeId] = useState('');
    const [classStreamId, setClassStreamId] = useState('');
    const [classYearId, setClassYearId] = useState('');
    const [saving, setSaving] = useState(false);

    // Edit state
    const [editingStream, setEditingStream] = useState<any>(null);
    const [editingGrade, setEditingGrade] = useState<any>(null);
    const [editingClass, setEditingClass] = useState<any>(null);
    const [editStreamName, setEditStreamName] = useState('');
    const [editGradeName, setEditGradeName] = useState('');
    const [editGradeOrder, setEditGradeOrder] = useState('1');

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [strRes, graRes, clsRes, yrRes] = await Promise.all([
            supabase.from('streams').select('*').eq('school_id', school.id).order('name'),
            supabase.from('grade_levels').select('*').eq('school_id', school.id).order('level_order'),
            supabase.from('classes').select('*, grade_levels(name), streams(name)').eq('school_id', school.id),
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('is_current', { ascending: false }),
        ]);
        [strRes.error, graRes.error, clsRes.error, yrRes.error].filter(Boolean).forEach(error => toast.error(error!.message));
        setStreams(strRes.data || []);
        setGrades(graRes.data || []);
        setClasses(clsRes.data || []);
        setYears(yrRes.data || []);
        setLoading(false);

        if (yrRes.data?.[0]) setClassYearId(yrRes.data[0].id);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const handleAddStream = async () => {
        if (!streamName.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('streams').insert({ name: streamName.trim(), school_id: school!.id });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Stream saved');
            setStreamName('');
            setShowStreamModal(false);
            await fetchAll();
        }
        setSaving(false);
    };

    const handleAddGrade = async () => {
        if (!gradeName.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('grade_levels').insert({
            name: gradeName.trim(),
            level_order: parseInt(gradeOrder, 10) || 1,
            school_id: school!.id
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Grade level saved');
            setGradeName('');
            setGradeOrder('1');
            setShowGradeModal(false);
            await fetchAll();
        }
        setSaving(false);
    };

    const ensureCurrentAcademicYear = async () => {
        const current = years.find(y => y.is_current) || years[0];
        if (current) return current.id;

        const year = new Date().getFullYear();
        const { data, error } = await supabase
            .from('academic_years')
            .insert({
                school_id: school!.id,
                name: String(year),
                start_date: `${year}-01-01`,
                end_date: `${year}-12-31`,
                is_current: true,
            })
            .select()
            .single();

        if (error) throw error;
        return data.id;
    };

    const handleAddClass = async () => {
        if (!classGradeId || !classStreamId) return;
        setSaving(true);

        try {
            const grade = grades.find(g => g.id === classGradeId);
            const stream = streams.find(s => s.id === classStreamId);
            const yearId = classYearId || await ensureCurrentAcademicYear();
            const name = `${grade.name} ${stream.name}`.trim();

            const { error } = await supabase.from('classes').insert({
                school_id: school!.id,
                grade_level_id: classGradeId,
                stream_id: classStreamId,
                academic_year_id: yearId,
                name
            });

            if (error) throw error;
            toast.success('Class group created');
            setShowClassModal(false);
            setClassGradeId('');
            setClassStreamId('');
            await fetchAll();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create class group');
        } finally {
            setSaving(false);
        }
    };

    const handleEditStream = async () => {
        if (!editingStream || !editStreamName.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('streams').update({ name: editStreamName.trim() }).eq('id', editingStream.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Stream updated');
            setEditingStream(null);
            await fetchAll();
        }
        setSaving(false);
    };

    const handleDeleteStream = async (stream: any) => {
        if (!confirm(`Delete stream "${stream.name}"?`)) return;
        const { error } = await supabase.from('streams').delete().eq('id', stream.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Stream deleted');
            await fetchAll();
        }
    };

    const openEditGrade = (grade: any) => {
        setEditingGrade(grade);
        setEditGradeName(grade.name);
        setEditGradeOrder(String(grade.level_order));
    };

    const handleEditGrade = async () => {
        if (!editingGrade || !editGradeName.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('grade_levels').update({
            name: editGradeName.trim(),
            level_order: parseInt(editGradeOrder, 10) || 1,
        }).eq('id', editingGrade.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Grade level updated');
            setEditingGrade(null);
            await fetchAll();
        }
        setSaving(false);
    };

    const handleDeleteGrade = async (grade: any) => {
        if (!confirm(`Delete grade "${grade.name}"?`)) return;
        const { error } = await supabase.from('grade_levels').delete().eq('id', grade.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Grade level deleted');
            await fetchAll();
        }
    };

    const openEditClass = (cls: any) => {
        setEditingClass(cls);
        setClassGradeId(cls.grade_level_id);
        setClassStreamId(cls.stream_id);
        setClassYearId(cls.academic_year_id);
    };

    const handleEditClass = async () => {
        if (!editingClass || !classGradeId || !classStreamId) return;
        setSaving(true);
        const grade = grades.find(g => g.id === classGradeId);
        const stream = streams.find(s => s.id === classStreamId);
        const name = `${grade?.name} ${stream?.name}`.trim();
        const { error } = await supabase.from('classes').update({
            grade_level_id: classGradeId,
            stream_id: classStreamId,
            academic_year_id: classYearId,
            name,
        }).eq('id', editingClass.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Class updated');
            setEditingClass(null);
            await fetchAll();
        }
        setSaving(false);
    };

    const handleDeleteClass = async (cls: any) => {
        if (!confirm(`Delete class "${cls.name}"?`)) return;
        const { error } = await supabase.from('classes').delete().eq('id', cls.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Class deleted');
            await fetchAll();
        }
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Academic Structure</h1>
                    <p className="page-subtitle">Manage your school's streams, grades, and class groups</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'streams' && (
                        <button className="btn btn-primary" onClick={() => setShowStreamModal(true)}>
                            <Plus size={18} /> New Stream
                        </button>
                    )}
                    {activeTab === 'grades' && (
                        <button className="btn btn-primary" onClick={() => setShowGradeModal(true)}>
                            <Plus size={18} /> New Grade Level
                        </button>
                    )}
                    {activeTab === 'classes' && (
                        <button className="btn btn-primary" onClick={() => setShowClassModal(true)}>
                            <Plus size={18} /> Generate Class Groups
                        </button>
                    )}
                </div>
            </div>

            <div className="tabs">
                <div className={`tab ${activeTab === 'streams' ? 'active' : ''}`} onClick={() => setActiveTab('streams')}>
                    <Home size={16} /> Streams
                </div>
                <div className={`tab ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>
                    <Layers size={16} /> Grade Levels
                </div>
                <div className={`tab ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
                    <School size={16} /> Classes
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="flex justify-center p-8"><span className="spinner" /></div>
                ) : (
                    <>
                        {activeTab === 'streams' && (
                            <div className="grid-4">
                                {streams.map(s => (
                                    <div key={s.id} className="card" style={{ background: 'var(--gray-50)', textAlign: 'center', position: 'relative' }}>
                                        <div className="flex justify-end gap-1" style={{ position: 'absolute', top: 8, right: 8 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingStream(s); setEditStreamName(s.name); }} title="Edit">
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteStream(s)} style={{ color: 'var(--danger)' }} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <Home size={24} style={{ color: 'var(--green-600)', margin: '0 auto 0.5rem' }} />
                                        <h4 className="font-bold">{s.name}</h4>
                                        <p className="text-xs text-muted mt-1">Stream</p>
                                    </div>
                                ))}
                                {streams.length === 0 && <div className="empty-state" style={{ gridColumn: 'span 4' }}><h3>No streams added</h3></div>}
                            </div>
                        )}

                        {activeTab === 'grades' && (
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Order</th>
                                            <th>Grade Level</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grades.map(g => (
                                            <tr key={g.id}>
                                                <td>{g.level_order}</td>
                                                <td><strong>{g.name}</strong></td>
                                                <td>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEditGrade(g)}><Edit2 size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteGrade(g)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'classes' && (
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Class Name</th>
                                            <th>Grade Level</th>
                                            <th>Stream</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classes.map(c => (
                                            <tr key={c.id}>
                                                <td><strong>{c.name}</strong></td>
                                                <td>{c.grade_levels?.name}</td>
                                                <td>{c.streams?.name}</td>
                                                <td>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEditClass(c)}><Edit2 size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteClass(c)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {classes.length === 0 && (
                                    <div className="empty-state">
                                        <h3>No class groups generated</h3>
                                        <p>Combine grades and streams to create classes for students</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Stream Modal */}
            {showStreamModal && (
                <div className="modal-overlay" onClick={() => setShowStreamModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add New Stream</h3>
                            <button className="modal-close" onClick={() => setShowStreamModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Stream Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. East, West, Green, Blue"
                                    value={streamName}
                                    onChange={e => setStreamName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowStreamModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAddStream} disabled={saving || !streamName.trim()}>
                                {saving ? <span className="spinner" /> : 'Save Stream'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grade Modal */}
            {showGradeModal && (
                <div className="modal-overlay" onClick={() => setShowGradeModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Grade Level</h3>
                            <button className="modal-close" onClick={() => setShowGradeModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Grade Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Form 1, Grade 4"
                                    value={gradeName}
                                    onChange={e => setGradeName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Level Order (for sorting)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={gradeOrder}
                                    onChange={e => setGradeOrder(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowGradeModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAddGrade} disabled={saving || !gradeName.trim()}>
                                {saving ? <span className="spinner" /> : 'Save Grade'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Class Modal */}
            {showClassModal && (
                <div className="modal-overlay" onClick={() => setShowClassModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Generate Class Group</h3>
                            <button className="modal-close" onClick={() => setShowClassModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-muted mb-4">Combine a grade level and a stream to create a new class.</p>
                            <div className="form-group">
                                <label className="form-label">Select Grade Level</label>
                                <select className="form-select" value={classGradeId} onChange={e => setClassGradeId(e.target.value)}>
                                    <option value="">Select Grade</option>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Select Stream</label>
                                <select className="form-select" value={classStreamId} onChange={e => setClassStreamId(e.target.value)}>
                                    <option value="">Select Stream</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Academic Year</label>
                                <select className="form-select" value={classYearId} onChange={e => setClassYearId(e.target.value)}>
                                    {years.map(y => <option key={y.id} value={y.id}>{y.name} {y.is_current ? '(Current)' : ''}</option>)}
                                </select>
                                {years.length === 0 && <p className="form-hint">A current academic year will be created automatically.</p>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowClassModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAddClass} disabled={saving || !classGradeId || !classStreamId}>
                                {saving ? <span className="spinner" /> : 'Create Class Group'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Stream Modal */}
            {editingStream && (
                <div className="modal-overlay" onClick={() => setEditingStream(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Stream</h3>
                            <button className="modal-close" onClick={() => setEditingStream(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Stream Name</label>
                                <input className="form-input" value={editStreamName} onChange={e => setEditStreamName(e.target.value)} autoFocus />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingStream(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleEditStream} disabled={saving || !editStreamName.trim()}>
                                {saving ? <span className="spinner" /> : 'Update Stream'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Grade Modal */}
            {editingGrade && (
                <div className="modal-overlay" onClick={() => setEditingGrade(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Grade Level</h3>
                            <button className="modal-close" onClick={() => setEditingGrade(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Grade Name</label>
                                <input className="form-input" value={editGradeName} onChange={e => setEditGradeName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Level Order</label>
                                <input className="form-input" type="number" value={editGradeOrder} onChange={e => setEditGradeOrder(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingGrade(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleEditGrade} disabled={saving || !editGradeName.trim()}>
                                {saving ? <span className="spinner" /> : 'Update Grade'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Class Modal */}
            {editingClass && (
                <div className="modal-overlay" onClick={() => setEditingClass(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Class Group</h3>
                            <button className="modal-close" onClick={() => setEditingClass(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Grade Level</label>
                                <select className="form-select" value={classGradeId} onChange={e => setClassGradeId(e.target.value)}>
                                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Stream</label>
                                <select className="form-select" value={classStreamId} onChange={e => setClassStreamId(e.target.value)}>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Academic Year</label>
                                <select className="form-select" value={classYearId} onChange={e => setClassYearId(e.target.value)}>
                                    {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingClass(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleEditClass} disabled={saving}>
                                {saving ? <span className="spinner" /> : 'Update Class'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
