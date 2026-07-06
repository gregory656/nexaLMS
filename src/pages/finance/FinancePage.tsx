import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, DollarSign, CreditCard, BarChart3,
    Plus, X, Download
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
    const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [gradeLevels, setGradeLevels] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);

    // Fee setup
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
    const [feeForm, setFeeForm] = useState({ target_type: 'grade', grade_level_id: '', student_id: '', class_id: '', academic_year_id: '', term_id: '', fee_category_id: '', amount: '', is_optional: false });
    const [transactionForm, setTransactionForm] = useState({ student_id: '', transaction_type: 'payment', amount: '', description: '', payment_method: 'mpesa', reference_number: '' });
    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        if (!school?.id) return;
        setLoading(true);
        try {
            const [fcRes, fsRes, ledRes, stuRes, glRes, ayRes, tRes] = await Promise.all([
                supabase.from('fee_categories').select('*').eq('school_id', school.id).order('name'),
                supabase.from('fee_structures').select('*, fee_categories(name), grade_levels(name), academic_years(name), terms(name), classes(name)').eq('school_id', school.id),
                supabase.from('fee_ledger').select('*, students(first_name, last_name, admission_number)').eq('school_id', school.id).order('created_at', { ascending: false }).limit(200),
                supabase.from('students').select('*').eq('school_id', school.id).eq('status', 'active'),
                supabase.from('grade_levels').select('*').eq('school_id', school.id).order('level_order'),
                supabase.from('academic_years').select('*').eq('school_id', school.id).order('start_date', { ascending: false }),
                supabase.from('terms').select('*').eq('school_id', school.id).order('term_number'),
            ]);
            if (fcRes.error) throw fcRes.error;
            if (fsRes.error) throw fsRes.error;
            if (ledRes.error) throw ledRes.error;
            if (stuRes.error) throw stuRes.error;
            if (glRes.error) throw glRes.error;
            if (ayRes.error) throw ayRes.error;
            if (tRes.error) throw tRes.error;
            
            setFeeCategories(fcRes.data || []);
            setFeeStructures(fsRes.data || []);
            setLedgerEntries(ledRes.data || []);
            setStudents(stuRes.data || []);
            setGradeLevels(glRes.data || []);
            setAcademicYears(ayRes.data || []);
            setTerms(tRes.data || []);
        } catch (err: any) {
            console.error('Finance fetch error:', err);
            toast.error('Failed to load finance data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [school?.id]);

    const totalCollected = ledgerEntries.filter(e => e.transaction_type === 'payment').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalOutstanding = students.reduce((sum, s) => sum + Number(s.fee_balance || 0), 0);
    const totalCharged = ledgerEntries.filter(e => e.transaction_type === 'charge').reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const handleCreateCategory = async () => {
        if (!categoryForm.name.trim()) { toast.error('Enter category name'); return; }
        setSaving(true);
        const { error } = await supabase.from('fee_categories').insert({ school_id: school!.id, name: categoryForm.name, description: categoryForm.description || null });
        if (error) toast.error(error.message); else { toast.success('Category created'); setShowCategoryModal(false); setCategoryForm({ name: '', description: '' }); await fetchAll(); }
        setSaving(false);
    };

    const handleCreateFee = async () => {
        if (!feeForm.academic_year_id || !feeForm.fee_category_id || !feeForm.amount) { toast.error('Fill all required fields'); return; }
        if (feeForm.target_type === 'grade' && !feeForm.grade_level_id) { toast.error('Select a grade level'); return; }
        if (feeForm.target_type === 'class' && !feeForm.class_id) { toast.error('Select a class'); return; }
        if (feeForm.target_type === 'individual' && !feeForm.student_id) { toast.error('Select a student'); return; }

        setSaving(true);
        try {
            const { error } = await supabase.from('fee_structures').insert({
                school_id: school!.id,
                grade_level_id: feeForm.target_type === 'grade' ? feeForm.grade_level_id : null,
                class_id: feeForm.target_type === 'class' ? feeForm.class_id : null,
                student_id: feeForm.target_type === 'individual' ? feeForm.student_id : null,
                academic_year_id: feeForm.academic_year_id,
                term_id: feeForm.term_id || null,
                fee_category_id: feeForm.fee_category_id,
                amount: parseFloat(feeForm.amount),
                is_optional: feeForm.is_optional,
            });
            if (error) throw error;
            toast.success('Fee added');
            setShowFeeModal(false);
            setFeeForm({ target_type: 'grade', grade_level_id: '', student_id: '', class_id: '', academic_year_id: '', term_id: '', fee_category_id: '', amount: '', is_optional: false });
            await fetchAll();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add fee');
        }
        setSaving(false);
    };

    const handleSaveTransaction = async () => {
        if (!transactionForm.student_id || !transactionForm.amount) { toast.error('Fill required fields'); return; }
        setSaving(true);
        const amountNum = parseFloat(transactionForm.amount);

        const targetStudent = students.find(s => s.id === transactionForm.student_id);
        const currentBalance = Number(targetStudent?.fee_balance || 0);

        const newBalance = transactionForm.transaction_type === 'payment'
            ? currentBalance - amountNum
            : currentBalance + amountNum;

        const { error: ledgerError } = await supabase.from('fee_ledger').insert({
            school_id: school!.id,
            student_id: transactionForm.student_id,
            amount: amountNum,
            transaction_type: transactionForm.transaction_type,
            description: transactionForm.description,
            payment_method: transactionForm.payment_method || null,
            reference_number: transactionForm.reference_number || null,
            recorded_by: (await supabase.auth.getUser()).data.user?.id
        });

        if (ledgerError) { toast.error(ledgerError.message); setSaving(false); return; }

        const { error: studentError } = await supabase.from('students').update({
            fee_balance: newBalance,
            fee_balance_updated_at: new Date().toISOString()
        }).eq('id', transactionForm.student_id);

        if (studentError) { toast.error(studentError.message); }
        else {
            toast.success('Transaction recorded successfully');
            setShowTransactionModal(false);
            setTransactionForm({ ...transactionForm, amount: '', description: '', reference_number: '' });
            await fetchAll();
        }
        setSaving(false);
    };

    const renderDashboard = () => (
        <>
            <div className="grid-3 mb-6">
                <div className="stat-card"><div className="stat-icon blue"><CreditCard size={22} /></div><div className="stat-info"><h3>Total Collected</h3><div className="stat-value">KES {totalCollected.toLocaleString()}</div></div></div>
                <div className="stat-card"><div className="stat-icon red"><DollarSign size={22} /></div><div className="stat-info"><h3>Total Charged</h3><div className="stat-value">KES {totalCharged.toLocaleString()}</div></div></div>
                <div className="stat-card"><div className="stat-icon orange"><BarChart3 size={22} /></div><div className="stat-info"><h3>Students Balances</h3><div className="stat-value">KES {totalOutstanding.toLocaleString()}</div></div></div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">Recent Ledger Entries</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowTransactionModal(true)}>
                    <Plus size={16} /> Record Transaction
                </button>
            </div>

            <div className="card">
                {ledgerEntries.length === 0 ? (
                    <div className="empty-state"><h3>No financial transactions recorded</h3><p>Payments and fees charges will appear here.</p></div>
                ) : (
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Student</th><th>Amount</th><th>Method</th><th>Ref</th></tr></thead><tbody>
                        {ledgerEntries.slice(0, 15).map((e, i) => (
                            <tr key={e.id}>
                                <td>{i + 1}</td>
                                <td>{new Date(e.created_at).toLocaleDateString()}</td>
                                <td><span className={`badge ${e.transaction_type === 'payment' ? 'badge-green' : 'badge-red'}`}>{e.transaction_type}</span></td>
                                <td><strong>{e.students?.first_name} {e.students?.last_name}</strong> {e.students?.admission_number && `(${e.students.admission_number})`}</td>
                                <td>KES {Number(e.amount).toLocaleString()}</td>
                                <td>{e.payment_method || '—'}</td>
                                <td>{e.reference_number || '—'}</td>
                            </tr>
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
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Category</th><th>Target</th><th>Year</th><th>Term</th><th>Amount</th><th>Optional?</th></tr></thead><tbody>
                        {feeStructures.map((fs, i) => (
                            <tr key={fs.id}><td>{i + 1}</td><td><strong>{fs.fee_categories?.name}</strong></td>
                                <td>{fs.grade_levels?.name || fs.students ? `Student: ${fs.students.first_name}` : 'All Students'}</td>
                                <td>{fs.academic_years?.name || '—'}</td><td>{fs.terms?.name || 'All'}</td><td>KES {Number(fs.amount).toLocaleString()}</td><td>{fs.is_optional ? <span className="badge badge-orange">Optional</span> : <span className="badge badge-green">Required</span>}</td></tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </>
    );

    const renderPayments = () => (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">All Ledger Transactions</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowTransactionModal(true)}>
                    <Plus size={16} /> Record Transaction
                </button>
            </div>
            {ledgerEntries.length === 0 ? (
                <div className="empty-state"><h3>No transactions yet</h3><p>Record payments or fee charges to see them here.</p></div>
            ) : (
                <div className="table-wrapper"><table className="data-table"><thead><tr><th>Date</th><th>Student</th><th>Type</th><th>Description</th><th>Amount</th><th>Method</th><th>Ref</th></tr></thead><tbody>
                    {ledgerEntries.map(e => (
                        <tr key={e.id}>
                            <td>{new Date(e.created_at).toLocaleDateString()}</td>
                            <td><strong>{e.students?.first_name} {e.students?.last_name}</strong></td>
                            <td><span className={`badge ${e.transaction_type === 'payment' ? 'badge-green' : 'badge-red'}`}>{e.transaction_type}</span></td>
                            <td>{e.description || '—'}</td>
                            <td>KES {Number(e.amount).toLocaleString()}</td>
                            <td>{e.payment_method || '—'}</td>
                            <td>{e.reference_number || '—'}</td>
                        </tr>
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
                            <div className="form-group"><label className="form-label">Category *</label><select className="form-select" value={feeForm.fee_category_id} onChange={e => setFeeForm(p => ({ ...p, fee_category_id: e.target.value }))}><option value="">Select</option>{feeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Target *</label>
                                    <select className="form-select" value={feeForm.target_type} onChange={e => setFeeForm(p => ({ ...p, target_type: e.target.value }))}>
                                        <option value="grade">Specific Grade Level</option>
                                        <option value="all">All Students</option>
                                        <option value="individual">Individual Student</option>
                                    </select>
                                </div>
                                {feeForm.target_type === 'grade' && (
                                    <div className="form-group"><label className="form-label">Grade Level *</label><select className="form-select" value={feeForm.grade_level_id} onChange={e => setFeeForm(p => ({ ...p, grade_level_id: e.target.value }))}><option value="">Select Grade</option>{gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                                )}
                                {feeForm.target_type === 'individual' && (
                                    <div className="form-group"><label className="form-label">Student *</label><select className="form-select" value={feeForm.student_id} onChange={e => setFeeForm(p => ({ ...p, student_id: e.target.value }))}><option value="">Select Student</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
                                )}
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

            {/* Transaction Modal */}
            {showTransactionModal && (
                <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header"><h3 className="modal-title">💸 Record Transaction</h3><button className="modal-close" onClick={() => setShowTransactionModal(false)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Student *</label>
                                <select className="form-select" value={transactionForm.student_id} onChange={e => setTransactionForm(p => ({ ...p, student_id: e.target.value }))}>
                                    <option value="">Select Student...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name} {s.admission_number ? `(${s.admission_number})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Transaction Type *</label>
                                    <select className="form-select" value={transactionForm.transaction_type} onChange={e => setTransactionForm(p => ({ ...p, transaction_type: e.target.value }))}>
                                        <option value="payment">💳 Received Payment</option>
                                        <option value="charge">🧾 Add Fee/Charge</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (KES) *</label>
                                    <input className="form-input" type="number" placeholder="0.00" value={transactionForm.amount} onChange={e => setTransactionForm(p => ({ ...p, amount: e.target.value }))} />
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Payment Method</label>
                                    <input className="form-input" placeholder="M-Pesa, Cash, Bank..." value={transactionForm.payment_method} onChange={e => setTransactionForm(p => ({ ...p, payment_method: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reference No.</label>
                                    <input className="form-input" placeholder="e.g TXN12345" value={transactionForm.reference_number} onChange={e => setTransactionForm(p => ({ ...p, reference_number: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description / Remarks</label>
                                <input className="form-input" placeholder="e.g. Tuition fee part payment" value={transactionForm.description} onChange={e => setTransactionForm(p => ({ ...p, description: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowTransactionModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSaveTransaction} disabled={saving}>{saving ? <span className="spinner" /> : 'Save Transaction'}</button></div>
                    </div>
                </div>
            )}
        </>
    );
}
