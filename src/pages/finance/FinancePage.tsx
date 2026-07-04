import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, DollarSign, CreditCard, BarChart3,
    Plus, X, Users, Download
} from 'lucide-react';

const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'structure', label: 'Fee Structure', icon: DollarSign },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function FinancePage() {
    const { school } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    const [feeCategories, setFeeCategories] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [gradeLevels, setGradeLevels] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);

    // Fee setup
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
    const [feeForm, setFeeForm] = useState({ grade_level_id: '', academic_year_id: '', term_id: '', fee_category_id: '', amount: '', is_optional: false });
    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        const [fcRes, fsRes, invRes, payRes, stuRes, glRes, ayRes, tRes] = await Promise.all([
            supabase.from('fee_categories').select('*').eq('school_id', school.id).order('name'),
            supabase.from('fee_structures').select('*, fee_categories(name), grade_levels(name), academic_years(name), terms(name)').eq('school_id', school.id),
            supabase.from('invoices').select('*, students(first_name, last_name, admission_number)').eq('school_id', school.id).order('created_at', { ascending: false }).limit(100),
            supabase.from('payments').select('*, students(first_name, last_name), invoices(invoice_number, total_amount)').eq('school_id', school.id).order('payment_date', { ascending: false }).limit(100),
            supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active'),
            supabase.from('grade_levels').select('*').eq('school_id', school.id).order('level_order'),
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false }),
            supabase.from('terms').select('*').eq('school_id', school.id).order('term_number'),
        ]);
        setFeeCategories(fcRes.data || []);
        setFeeStructures(fsRes.data || []);
        setInvoices(invRes.data || []);
        setPayments(payRes.data || []);
        setStudents(stuRes.data || []);
        setGradeLevels(glRes.data || []);
        setAcademicYears(ayRes.data || []);
        setTerms(tRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);

    const handleCreateCategory = async () => {
        if (!categoryForm.name.trim()) { toast.error('Enter category name'); return; }
        setSaving(true);
        const { error } = await supabase.from('fee_categories').insert({ school_id: school!.id, name: categoryForm.name, description: categoryForm.description || null });
        if (error) toast.error(error.message); else { toast.success('Category created'); setShowCategoryModal(false); setCategoryForm({ name: '', description: '' }); await fetchAll(); }
        setSaving(false);
    };

    const handleCreateFee = async () => {
        if (!feeForm.grade_level_id || !feeForm.academic_year_id || !feeForm.fee_category_id || !feeForm.amount) { toast.error('Fill all required fields'); return; }
        setSaving(true);
        const { error } = await supabase.from('fee_structures').insert({
            school_id: school!.id, grade_level_id: feeForm.grade_level_id, academic_year_id: feeForm.academic_year_id,
            term_id: feeForm.term_id || null, fee_category_id: feeForm.fee_category_id,
            amount: parseFloat(feeForm.amount), is_optional: feeForm.is_optional,
        });
        if (error) toast.error(error.message); else { toast.success('Fee added'); setShowFeeModal(false); setFeeForm({ grade_level_id: '', academic_year_id: '', term_id: '', fee_category_id: '', amount: '', is_optional: false }); await fetchAll(); }
        setSaving(false);
    };

    const renderDashboard = () => (
        <>
            <div className="grid-4 mb-6">
                <div className="stat-card"><div className="stat-icon green"><DollarSign size={22} /></div><div className="stat-info"><h3>Total Invoiced</h3><div className="stat-value">KES {totalInvoiced.toLocaleString()}</div></div></div>
                <div className="stat-card"><div className="stat-icon blue"><CreditCard size={22} /></div><div className="stat-info"><h3>Total Collected</h3><div className="stat-value">KES {totalCollected.toLocaleString()}</div></div></div>
                <div className="stat-card"><div className="stat-icon orange"><BarChart3 size={22} /></div><div className="stat-info"><h3>Outstanding</h3><div className="stat-value">KES {totalOutstanding.toLocaleString()}</div></div></div>
                <div className="stat-card"><div className="stat-icon green"><Users size={22} /></div><div className="stat-info"><h3>Active Students</h3><div className="stat-value">{students.length}</div></div></div>
            </div>
            <div className="card">
                <div className="card-header"><h3 className="card-title">Recent Payments</h3></div>
                {payments.length === 0 ? (
                    <div className="empty-state"><h3>No payments recorded</h3><p>Payments will appear here once fees are collected.</p></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Student</th><th>Amount</th><th>Method</th><th>Date</th><th>Reference</th></tr></thead><tbody>
                        {payments.slice(0, 15).map((p, i) => (
                            <tr key={p.id}><td>{i + 1}</td><td><strong>{p.students?.first_name} {p.students?.last_name}</strong></td><td>KES {Number(p.amount).toLocaleString()}</td><td><span className="badge badge-blue">{p.payment_method || '—'}</span></td><td>{p.payment_date}</td><td>{p.reference_number || '—'}</td></tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderStructure = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <div><h3 className="text-lg font-bold">Fee Structure</h3><p className="text-sm text-muted">Define fee categories (Tuition, Damages, Remedial, etc.) and set amounts per grade level.</p></div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(true)}><Plus size={16} /> Add Category</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowFeeModal(true)}><Plus size={16} /> Add Fee</button>
                </div>
            </div>

            {/* Fee Categories */}
            <div className="card mb-4">
                <div className="card-header"><h3 className="card-title">Fee Categories</h3></div>
                {feeCategories.length === 0 ? (
                    <div className="empty-state"><h3>No categories</h3><p>Add categories like "Tuition", "Boarding", "Activity Fee", "Damages", etc.</p></div>
                ) : (
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        {feeCategories.map(c => <span key={c.id} className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>{c.name}</span>)}
                    </div>
                )}
            </div>

            {/* Fee Structure Table */}
            <div className="card">
                <div className="card-header"><h3 className="card-title">Fee Breakdown</h3></div>
                {feeStructures.length === 0 ? (
                    <div className="empty-state"><h3>No fee structures defined</h3><p>Click "Add Fee" to define fees per grade level per term.</p></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Grade</th><th>Year</th><th>Term</th><th>Amount</th><th>Optional?</th></tr></thead><tbody>
                        {feeStructures.map((fs, i) => (
                            <tr key={fs.id}><td>{i + 1}</td><td><strong>{fs.fee_categories?.name}</strong></td><td>{fs.grade_levels?.name || '—'}</td><td>{fs.academic_years?.name || '—'}</td><td>{fs.terms?.name || 'All'}</td><td>KES {Number(fs.amount).toLocaleString()}</td><td>{fs.is_optional ? <span className="badge badge-orange">Optional</span> : <span className="badge badge-green">Required</span>}</td></tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderPayments = () => (
        <div className="card">
            <div className="card-header"><h3 className="card-title">All Payments</h3></div>
            {payments.length === 0 ? (
                <div className="empty-state"><h3>No payments yet</h3><p>Record payments against student invoices.</p></div>
            ) : (
                <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Student</th><th>Invoice</th><th>Amount</th><th>Method</th><th>Date</th><th>Ref</th></tr></thead><tbody>
                    {payments.map((p, i) => (
                        <tr key={p.id}><td>{i + 1}</td><td><strong>{p.students?.first_name} {p.students?.last_name}</strong></td><td>{p.invoices?.invoice_number || '—'}</td><td>KES {Number(p.amount).toLocaleString()}</td><td><span className="badge badge-blue">{p.payment_method || '—'}</span></td><td>{p.payment_date}</td><td>{p.reference_number || '—'}</td></tr>
                    ))}
                </tbody></table></div>
            )}
        </div>
    );

    const renderReports = () => (
        <div className="card">
            <div className="empty-state">
                <Download size={48} style={{ color: 'var(--gray-300)', marginBottom: '1rem' }} />
                <h3>Finance Reports</h3>
                <p>Download fee balance reports, defaulter lists, receipts, and statements. Coming soon.</p>
            </div>
        </div>
    );

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Fee Management</h1>
                    <p className="page-subtitle">Set up fees, track payments, manage balances</p>
                </div>
            </div>

            <div className="card mb-4" style={{ padding: '0.5rem 1rem' }}>
                <div className="flex gap-1" style={{ overflowX: 'auto' }}>
                    {TABS.map(tab => (
                        <button key={tab.key} className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(tab.key)} style={{ whiteSpace: 'nowrap' }}>
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center" style={{ padding: '3rem' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>
            ) : (
                <>
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'structure' && renderStructure()}
                    {activeTab === 'payments' && renderPayments()}
                    {activeTab === 'reports' && renderReports()}
                </>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header"><h3 className="modal-title">💰 Add Fee Category</h3><button className="modal-close" onClick={() => setShowCategoryModal(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Category Name *</label><input className="form-input" placeholder="e.g. Tuition, Damages, Remedial" value={categoryForm.name} onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))} /></div>
                            <div className="form-group"><label className="form-label">Description</label><input className="form-input" placeholder="Optional description" value={categoryForm.description} onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateCategory} disabled={saving}>{saving ? <span className="spinner" /> : 'Create'}</button></div>
                    </div>
                </div>
            )}

            {/* Add Fee Modal */}
            {showFeeModal && (
                <div className="modal-overlay" onClick={() => setShowFeeModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header"><h3 className="modal-title">📋 Add Fee to Structure</h3><button className="modal-close" onClick={() => setShowFeeModal(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Category *</label><select className="form-select" value={feeForm.fee_category_id} onChange={e => setFeeForm(p => ({ ...p, fee_category_id: e.target.value }))}><option value="">Select</option>{feeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Grade Level *</label><select className="form-select" value={feeForm.grade_level_id} onChange={e => setFeeForm(p => ({ ...p, grade_level_id: e.target.value }))}><option value="">Select</option>{gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Academic Year *</label><select className="form-select" value={feeForm.academic_year_id} onChange={e => setFeeForm(p => ({ ...p, academic_year_id: e.target.value }))}><option value="">Select</option>{academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Term</label><select className="form-select" value={feeForm.term_id} onChange={e => setFeeForm(p => ({ ...p, term_id: e.target.value }))}><option value="">All Terms</option>{terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Amount (KES) *</label><input className="form-input" type="number" placeholder="e.g. 42000" value={feeForm.amount} onChange={e => setFeeForm(p => ({ ...p, amount: e.target.value }))} /></div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.4rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={feeForm.is_optional} onChange={e => setFeeForm(p => ({ ...p, is_optional: e.target.checked }))} /> Optional Fee
                                    </label>
                                </div>
                            </div>
                            <p className="form-hint">When fee is added, all students in the selected grade level will have their balance updated accordingly.</p>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowFeeModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateFee} disabled={saving}>{saving ? <span className="spinner" /> : 'Add Fee'}</button></div>
                    </div>
                </div>
            )}
        </>
    );
}
