import { useState } from 'react';
import { Plus, Download, FileText, Copy, Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { downloadQuotationPdf } from '../../lib/businessDocumentsPdf';
import type { Quotation, QuotationItem } from '../../lib/businessDocumentsPdf';

const defaultTerms = [
    'Valid for 30 days from date of issue.',
    'Prices are in Kenya Shillings.',
    'Setup begins after acceptance and payment of the implementation fee.',
    'Subscription fees are billed separately according to the signed agreement.',
    'Additional customizations may attract extra charges.'
];

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
    const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        schoolName: '',
        principalName: '',
        address: '',
        email: '',
        phone: '',
        referenceNumber: '',
        preparedBy: 'NexaGen Technologies',
        validDays: '30'
    });

    const [items, setItems] = useState<QuotationItem[]>([
        { description: 'Founding Partner One-Time Setup & Training Fee', amount: 1250 }
    ]);

    const [terms, setTerms] = useState<string[]>(defaultTerms);

    const generateQuotationNumber = () => {
        const count = quotations.length + 1;
        return `Q${String(count).padStart(4, '0')}`;
    };

    const calculateAmounts = () => {
        const total = items.reduce((sum, item) => sum + item.amount, 0);
        return {
            normalAmount: 2000,
            discountAmount: 750,
            finalAmount: total
        };
    };

    const handleCreateQuotation = () => {
        const { normalAmount, discountAmount, finalAmount } = calculateAmounts();
        const today = new Date().toISOString().split('T')[0];
        const validUntil = new Date(Date.now() + parseInt(formData.validDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const newQuotation: Quotation = {
            id: Date.now().toString(),
            quotationNumber: generateQuotationNumber(),
            dateIssued: today,
            validUntil,
            preparedBy: formData.preparedBy,
            referenceNumber: formData.referenceNumber || undefined,
            status: 'pending',
            schoolInfo: {
                name: formData.schoolName,
                principalName: formData.principalName,
                address: formData.address,
                email: formData.email,
                phone: formData.phone
            },
            items: [...items],
            normalAmount,
            discountAmount,
            finalAmount,
            terms: [...terms]
        };

        setQuotations([...quotations, newQuotation]);
        resetForm();
        setShowForm(false);
    };

    const handleEditQuotation = (quotation: Quotation) => {
        setEditingQuotation(quotation);
        setFormData({
            schoolName: quotation.schoolInfo.name,
            principalName: quotation.schoolInfo.principalName,
            address: quotation.schoolInfo.address,
            email: quotation.schoolInfo.email,
            phone: quotation.schoolInfo.phone,
            referenceNumber: quotation.referenceNumber || '',
            preparedBy: quotation.preparedBy,
            validDays: '30'
        });
        setItems([...quotation.items]);
        setTerms([...quotation.terms]);
        setShowForm(true);
    };

    const handleUpdateQuotation = () => {
        if (!editingQuotation) return;

        const { normalAmount, discountAmount, finalAmount } = calculateAmounts();
        const updatedQuotation: Quotation = {
            ...editingQuotation,
            schoolInfo: {
                name: formData.schoolName,
                principalName: formData.principalName,
                address: formData.address,
                email: formData.email,
                phone: formData.phone
            },
            referenceNumber: formData.referenceNumber || undefined,
            preparedBy: formData.preparedBy,
            items: [...items],
            normalAmount,
            discountAmount,
            finalAmount,
            terms: [...terms]
        };

        setQuotations(quotations.map(q => q.id === editingQuotation.id ? updatedQuotation : q));
        setEditingQuotation(null);
        resetForm();
        setShowForm(false);
    };

    const handleDuplicateQuotation = (quotation: Quotation) => {
        const newQuotation: Quotation = {
            ...quotation,
            id: Date.now().toString(),
            quotationNumber: generateQuotationNumber(),
            dateIssued: new Date().toISOString().split('T')[0],
            status: 'pending'
        };
        setQuotations([...quotations, newQuotation]);
    };

    const handleStatusChange = (quotationId: string, newStatus: Quotation['status']) => {
        setQuotations(quotations.map(q => 
            q.id === quotationId ? { ...q, status: newStatus } : q
        ));
    };

    const handleDeleteQuotation = (quotationId: string) => {
        if (confirm('Are you sure you want to delete this quotation?')) {
            setQuotations(quotations.filter(q => q.id !== quotationId));
        }
    };

    const resetForm = () => {
        setFormData({
            schoolName: '',
            principalName: '',
            address: '',
            email: '',
            phone: '',
            referenceNumber: '',
            preparedBy: 'NexaGen Technologies',
            validDays: '30'
        });
        setItems([{ description: 'Founding Partner One-Time Setup & Training Fee', amount: 1250 }]);
        setTerms(defaultTerms);
        setEditingQuotation(null);
    };

    const addItem = () => {
        setItems([...items, { description: '', amount: 0 }]);
    };

    const updateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const getStatusIcon = (status: Quotation['status']) => {
        switch (status) {
            case 'accepted': return <CheckCircle size={16} className="text-green-500" />;
            case 'rejected': return <XCircle size={16} className="text-red-500" />;
            case 'expired': return <AlertCircle size={16} className="text-orange-500" />;
            default: return <Clock size={16} className="text-yellow-500" />;
        }
    };

    const getStatusColor = (status: Quotation['status']) => {
        switch (status) {
            case 'accepted': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'expired': return 'bg-orange-100 text-orange-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    if (showForm) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">
                            {editingQuotation ? 'Edit Quotation' : 'Create New Quotation'}
                        </h1>
                        <p className="page-subtitle">
                            {editingQuotation ? 'Modify quotation details' : 'Generate a professional quotation for a school'}
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => {
                        resetForm();
                        setShowForm(false);
                    }}>
                        Cancel
                    </button>
                </div>

                <div className="card">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        editingQuotation ? handleUpdateQuotation() : handleCreateQuotation();
                    }}>
                        {/* School Information */}
                        <h3 className="form-section-title">School Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">School Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.schoolName}
                                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Principal Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.principalName}
                                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number *</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">School Address *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Quotation Details */}
                        <h3 className="form-section-title">Quotation Details</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Reference Number (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.referenceNumber}
                                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prepared By</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.preparedBy}
                                    onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Valid For (Days)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.validDays}
                                    onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                                    min="1"
                                />
                            </div>
                        </div>

                        {/* Pricing Items */}
                        <h3 className="form-section-title">Pricing Items</h3>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th style={{ width: '150px' }}>Amount (KES)</th>
                                        <th style={{ width: '80px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                    placeholder="Item description"
                                                    required
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={item.amount}
                                                    onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    required
                                                />
                                            </td>
                                            <td>
                                                {items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={addItem}
                                style={{ marginTop: '1rem' }}
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="card" style={{ marginTop: '1.5rem', backgroundColor: '#f0fdf4' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Normal Setup & Training Fee:</span>
                                <strong>KES {calculateAmounts().normalAmount.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#dc2626' }}>
                                <span>Founding Partner Discount:</span>
                                <strong>-KES {calculateAmounts().discountAmount.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: '#047857' }}>
                                <span>Amount Payable:</span>
                                <strong>KES {calculateAmounts().finalAmount.toLocaleString()} (One-Time Only)</strong>
                            </div>
                        </div>

                        {/* Terms */}
                        <h3 className="form-section-title">Terms and Conditions</h3>
                        <div className="form-group">
                            {terms.map((term, index) => (
                                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={term}
                                        onChange={(e) => {
                                            const newTerms = [...terms];
                                            newTerms[index] = e.target.value;
                                            setTerms(newTerms);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={() => setTerms(terms.filter((_, i) => i !== index))}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setTerms([...terms, ''])}
                            >
                                <Plus size={14} /> Add Term
                            </button>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                {editingQuotation ? 'Update Quotation' : 'Create Quotation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Quotations</h1>
                    <p className="page-subtitle">Manage and generate professional quotations for schools</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={16} /> New Quotation
                </button>
            </div>

            {quotations.length === 0 ? (
                <div className="empty-state">
                    <FileText size={48} />
                    <h3>No Quotations Yet</h3>
                    <p>Create your first quotation to get started</p>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={16} /> Create Quotation
                    </button>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Quotation #</th>
                                <th>School</th>
                                <th>Date Issued</th>
                                <th>Valid Until</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotations.map((quotation) => (
                                <tr key={quotation.id}>
                                    <td>
                                        <strong>{quotation.quotationNumber}</strong>
                                    </td>
                                    <td>{quotation.schoolInfo.name}</td>
                                    <td>{quotation.dateIssued}</td>
                                    <td>{quotation.validUntil}</td>
                                    <td>
                                        <strong>KES {quotation.finalAmount.toLocaleString()}</strong>
                                    </td>
                                    <td>
                                        <span className={`badge ${getStatusColor(quotation.status)}`}>
                                            {getStatusIcon(quotation.status)}
                                            {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => setPreviewQuotation(quotation)}
                                                title="Preview"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => downloadQuotationPdf(quotation)}
                                                title="Download PDF"
                                            >
                                                <Download size={14} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEditQuotation(quotation)}
                                                title="Edit"
                                            >
                                                <FileText size={14} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleDuplicateQuotation(quotation)}
                                                title="Duplicate"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <select
                                                className="form-select"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                value={quotation.status}
                                                onChange={(e) => handleStatusChange(quotation.id, e.target.value as Quotation['status'])}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="accepted">Accepted</option>
                                                <option value="rejected">Rejected</option>
                                                <option value="expired">Expired</option>
                                            </select>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteQuotation(quotation.id)}
                                                title="Delete"
                                            >
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Preview Modal */}
            {previewQuotation && (
                <div className="modal-overlay" onClick={() => setPreviewQuotation(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>Quotation Preview - {previewQuotation.quotationNumber}</h3>
                            <button className="btn btn-sm btn-secondary" onClick={() => setPreviewQuotation(null)}>
                                Close
                            </button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div style={{ padding: '1rem' }}>
                                <h4 style={{ color: '#047857', marginBottom: '1rem' }}>School Information</h4>
                                <p><strong>School:</strong> {previewQuotation.schoolInfo.name}</p>
                                <p><strong>Principal:</strong> {previewQuotation.schoolInfo.principalName}</p>
                                <p><strong>Address:</strong> {previewQuotation.schoolInfo.address}</p>
                                <p><strong>Email:</strong> {previewQuotation.schoolInfo.email}</p>
                                <p><strong>Phone:</strong> {previewQuotation.schoolInfo.phone}</p>

                                <h4 style={{ color: '#047857', marginTop: '1.5rem', marginBottom: '1rem' }}>Pricing Details</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f0fdf4' }}>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #e5e7eb' }}>Description</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #e5e7eb' }}>Amount (KES)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewQuotation.items.map((item, index) => (
                                            <tr key={index}>
                                                <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{item.description}</td>
                                                <td style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #e5e7eb' }}>{item.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem' }}>
                                    <p>Normal Setup & Training Fee: KES {previewQuotation.normalAmount.toLocaleString()}</p>
                                    <p style={{ color: '#dc2626' }}>Founding Partner Discount: KES {previewQuotation.discountAmount.toLocaleString()}</p>
                                    <p style={{ color: '#047857', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        Amount Payable: KES {previewQuotation.finalAmount.toLocaleString()} (One-Time Only)
                                    </p>
                                </div>

                                <h4 style={{ color: '#047857', marginTop: '1.5rem', marginBottom: '1rem' }}>Terms and Conditions</h4>
                                <ul style={{ paddingLeft: '1.5rem' }}>
                                    {previewQuotation.terms.map((term, index) => (
                                        <li key={index}>{term}</li>
                                    ))}
                                </ul>

                                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem' }}>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                        <strong>Note:</strong> Subscription charges are governed separately under the Service Agreement and are not included in this quotation unless specifically stated.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setPreviewQuotation(null)}>
                                Close
                            </button>
                            <button className="btn btn-primary" onClick={() => {
                                downloadQuotationPdf(previewQuotation);
                                setPreviewQuotation(null);
                            }}>
                                <Download size={16} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
