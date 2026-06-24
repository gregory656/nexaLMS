import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadToCloudinary } from '../../lib/cloudinary';
import {
    School, Upload, Check, ArrowRight, ArrowLeft, ImageIcon, Globe, Phone, MapPin
} from 'lucide-react';

interface SchoolFormData {
    name: string;
    motto: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    county: string;
    country: string;
    postal_code: string;
    website: string;
    school_type: string;
    curriculum: string;
    established_year: string;
    registration_number: string;
}

const STEPS = [
    { label: 'School Info', icon: School },
    { label: 'Logo & Badge', icon: ImageIcon },
    { label: 'Contact', icon: Phone },
    { label: 'Confirm', icon: Check },
];

export default function SetupPage() {
    const { user, refreshUser, refreshSchool } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const watermarkInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<SchoolFormData>({
        name: '',
        motto: '',
        email: user?.email || '',
        phone: '',
        address: '',
        city: '',
        county: '',
        country: 'Kenya',
        postal_code: '',
        website: '',
        school_type: 'secondary',
        curriculum: '844',
        established_year: '',
        registration_number: '',
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
    const [watermarkPreview, setWatermarkPreview] = useState('');

    const update = (field: keyof SchoolFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleFileSelect = (file: File | undefined, type: 'logo' | 'watermark') => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (type === 'logo') {
                setLogoFile(file);
                setLogoPreview(e.target?.result as string);
            } else {
                setWatermarkFile(file);
                setWatermarkPreview(e.target?.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            let logo_url = '';
            let watermark_url = '';
            let watermark_public_id = '';

            // Upload logo if selected
            if (logoFile) {
                try {
                    const result = await uploadToCloudinary(logoFile, 'nexalms/logos');
                    logo_url = result.url;
                } catch {
                    // Cloudinary not configured, store locally
                    logo_url = logoPreview;
                }
            }

            // Upload watermark if selected
            if (watermarkFile) {
                try {
                    const result = await uploadToCloudinary(watermarkFile, 'nexalms/watermarks');
                    watermark_url = result.url;
                    watermark_public_id = result.publicId;
                } catch {
                    watermark_url = watermarkPreview;
                }
            }

            // Create school
            const { data: school, error: schoolError } = await supabase
                .from('schools')
                .insert({
                    name: form.name,
                    motto: form.motto,
                    email: form.email,
                    phone: form.phone,
                    address: form.address,
                    city: form.city,
                    county: form.county,
                    country: form.country,
                    postal_code: form.postal_code,
                    website: form.website,
                    school_type: form.school_type,
                    curriculum: form.curriculum,
                    established_year: form.established_year ? parseInt(form.established_year) : null,
                    registration_number: form.registration_number,
                    logo_url,
                    watermark_url,
                    watermark_public_id,
                    is_setup_complete: true,
                })
                .select()
                .single();

            if (schoolError) throw schoolError;

            // Link user to school
            const { error: userError } = await supabase
                .from('users')
                .update({ school_id: school.id, is_admin: true })
                .eq('id', user!.id);

            if (userError) throw userError;

            // Create default admin role
            const { data: adminRole } = await supabase
                .from('roles')
                .insert({
                    name: 'admin',
                    display_name: 'Administrator',
                    description: 'Full access to all school features',
                    school_id: school.id,
                    is_system: true,
                })
                .select()
                .single();

            if (adminRole) {
                await supabase.from('user_roles').insert({
                    user_id: user!.id,
                    role_id: adminRole.id,
                });
            }

            await refreshUser();
            await refreshSchool();
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to create school');
        } finally {
            setLoading(false);
        }
    };

    const canProceed = () => {
        if (step === 0) return form.name.trim() && form.email.trim();
        return true;
    };

    return (
        <div className="setup-page">
            <div className="setup-header">
                <div className="auth-logo" style={{ justifyContent: 'center' }}>
                    <div className="auth-logo-icon">N</div>
                    <span className="auth-logo-text">NexaLMS</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                    Set Up Your School
                </h2>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                    Configure your school before anyone else can access the system
                </p>
            </div>

            {/* Steps indicator */}
            <div className="setup-steps">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s.label}>
                        <div className={`setup-step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
                            <div className="setup-step-number">
                                {i < step ? <Check size={14} /> : i + 1}
                            </div>
                            <span className="setup-step-label">{s.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`setup-step-line ${i < step ? 'completed' : ''}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {error && (
                <div style={{
                    background: 'var(--danger-light)',
                    color: 'var(--danger)',
                    padding: '0.7rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    maxWidth: '640px',
                    width: '100%'
                }}>
                    ⚠️ {error}
                </div>
            )}

            <div className="setup-card">
                {/* Step 0: School Info */}
                {step === 0 && (
                    <>
                        <h3 className="mb-4">Basic School Information</h3>
                        <div className="form-group">
                            <label className="form-label" htmlFor="school-name">School Name *</label>
                            <input
                                id="school-name"
                                className="form-input"
                                placeholder="e.g. Starehe Boys Centre"
                                value={form.name}
                                onChange={e => update('name', e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="school-motto">School Motto</label>
                            <input
                                id="school-motto"
                                className="form-input"
                                placeholder="e.g. Education for Service"
                                value={form.motto}
                                onChange={e => update('motto', e.target.value)}
                            />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-type">School Type</label>
                                <select
                                    id="school-type"
                                    className="form-select"
                                    value={form.school_type}
                                    onChange={e => update('school_type', e.target.value)}
                                >
                                    <option value="primary">Primary</option>
                                    <option value="secondary">Secondary</option>
                                    <option value="mixed">Mixed (Primary & Secondary)</option>
                                    <option value="tertiary">Tertiary</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-curriculum">Curriculum</label>
                                <select
                                    id="school-curriculum"
                                    className="form-select"
                                    value={form.curriculum}
                                    onChange={e => update('curriculum', e.target.value)}
                                >
                                    <option value="cbc">CBC</option>
                                    <option value="844">8-4-4</option>
                                    <option value="igcse">IGCSE</option>
                                    <option value="ib">IB</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-year">Year Established</label>
                                <input
                                    id="school-year"
                                    className="form-input"
                                    type="number"
                                    placeholder="e.g. 1995"
                                    value={form.established_year}
                                    onChange={e => update('established_year', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-reg">Registration Number</label>
                                <input
                                    id="school-reg"
                                    className="form-input"
                                    placeholder="MOE reg number"
                                    value={form.registration_number}
                                    onChange={e => update('registration_number', e.target.value)}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Step 1: Logo & Watermark */}
                {step === 1 && (
                    <>
                        <h3 className="mb-4">School Logo & Badge Watermark</h3>
                        <p className="text-sm text-muted mb-4">
                            Upload your school badge. It will appear as a watermark on all printed/downloaded documents.
                        </p>

                        <div className="grid-2" style={{ gap: '1.5rem' }}>
                            <div>
                                <label className="form-label">School Logo</label>
                                <div
                                    className={`upload-area ${logoPreview ? 'has-file' : ''}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {logoPreview ? (
                                        <>
                                            <img src={logoPreview} alt="Logo" className="upload-preview" />
                                            <p className="text-sm text-muted">Click to change</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={32} style={{ color: 'var(--gray-400)', margin: '0 auto 0.5rem' }} />
                                            <p className="text-sm text-muted">Upload school logo</p>
                                            <p className="text-xs text-muted">PNG, JPG up to 2MB</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={e => handleFileSelect(e.target.files?.[0], 'logo')}
                                />
                            </div>

                            <div>
                                <label className="form-label">Watermark Badge 📛</label>
                                <div
                                    className={`upload-area ${watermarkPreview ? 'has-file' : ''}`}
                                    onClick={() => watermarkInputRef.current?.click()}
                                >
                                    {watermarkPreview ? (
                                        <>
                                            <img src={watermarkPreview} alt="Watermark" className="upload-preview" />
                                            <p className="text-sm text-muted">Click to change</p>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon size={32} style={{ color: 'var(--gray-400)', margin: '0 auto 0.5rem' }} />
                                            <p className="text-sm text-muted">Upload school badge</p>
                                            <p className="text-xs text-muted">This appears on ALL documents</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={watermarkInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={e => handleFileSelect(e.target.files?.[0], 'watermark')}
                                />
                            </div>
                        </div>

                        {/* Watermark Preview */}
                        {watermarkPreview && (
                            <div className="mt-6">
                                <label className="form-label mb-2">📄 Document Watermark Preview</label>
                                <div className="watermark-preview-container">
                                    <div className="watermark-bg">
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <img key={i} src={watermarkPreview} alt="" />
                                        ))}
                                    </div>
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <h4 style={{ marginBottom: '0.5rem' }}>{form.name || 'School Name'}</h4>
                                        <p className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>
                                            Academic Report Card — Term 1, 2026
                                        </p>
                                        <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.5rem' }}>
                                            <div><span className="text-xs text-muted">Student:</span> <strong className="text-sm">John Doe</strong></div>
                                            <div><span className="text-xs text-muted">Class:</span> <strong className="text-sm">Form 2B</strong></div>
                                            <div><span className="text-xs text-muted">Adm No:</span> <strong className="text-sm">2024/001</strong></div>
                                        </div>
                                        <table style={{ width: '100%', fontSize: '0.82rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                                                    <th style={{ padding: '0.4rem', textAlign: 'left' }}>Subject</th>
                                                    <th style={{ padding: '0.4rem', textAlign: 'center' }}>Marks</th>
                                                    <th style={{ padding: '0.4rem', textAlign: 'center' }}>Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {['Mathematics', 'English', 'Kiswahili', 'Physics'].map(sub => (
                                                    <tr key={sub} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                                        <td style={{ padding: '0.4rem' }}>{sub}</td>
                                                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>{Math.floor(Math.random() * 30 + 70)}</td>
                                                        <td style={{ padding: '0.4rem', textAlign: 'center' }}>A</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Step 2: Contact Info */}
                {step === 2 && (
                    <>
                        <h3 className="mb-4">Contact & Location</h3>
                        <div className="form-group">
                            <label className="form-label" htmlFor="school-email">School Email *</label>
                            <div className="form-input-icon">
                                <Globe />
                                <input
                                    id="school-email"
                                    type="email"
                                    className="form-input"
                                    placeholder="info@school.ac.ke"
                                    value={form.email}
                                    onChange={e => update('email', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-phone">Phone Number</label>
                                <input
                                    id="school-phone"
                                    className="form-input"
                                    placeholder="+254 712 345 678"
                                    value={form.phone}
                                    onChange={e => update('phone', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-website">Website</label>
                                <input
                                    id="school-website"
                                    className="form-input"
                                    placeholder="www.school.ac.ke"
                                    value={form.website}
                                    onChange={e => update('website', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="school-address">Address</label>
                            <div className="form-input-icon">
                                <MapPin />
                                <input
                                    id="school-address"
                                    className="form-input"
                                    placeholder="P.O. Box 123-00100"
                                    value={form.address}
                                    onChange={e => update('address', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid-3">
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-city">City/Town</label>
                                <input
                                    id="school-city"
                                    className="form-input"
                                    placeholder="Nairobi"
                                    value={form.city}
                                    onChange={e => update('city', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-county">County</label>
                                <input
                                    id="school-county"
                                    className="form-input"
                                    placeholder="Nairobi"
                                    value={form.county}
                                    onChange={e => update('county', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="school-postal">Postal Code</label>
                                <input
                                    id="school-postal"
                                    className="form-input"
                                    placeholder="00100"
                                    value={form.postal_code}
                                    onChange={e => update('postal_code', e.target.value)}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                    <>
                        <h3 className="mb-4">Review & Confirm</h3>
                        <div className="card" style={{ background: 'var(--gray-50)', border: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <School size={28} style={{ color: 'var(--green-600)' }} />
                                    </div>
                                )}
                                <div>
                                    <h4 style={{ fontSize: '1.15rem' }}>{form.name}</h4>
                                    {form.motto && <p className="text-sm text-muted">"{form.motto}"</p>}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {[
                                    ['Type', form.school_type === 'secondary' ? 'Secondary' : form.school_type],
                                    ['Curriculum', form.curriculum.toUpperCase()],
                                    ['Email', form.email],
                                    ['Phone', form.phone || '—'],
                                    ['County', form.county || '—'],
                                    ['City', form.city || '—'],
                                    ['Watermark', watermarkFile ? '✅ Uploaded' : '—'],
                                    ['Est.', form.established_year || '—'],
                                ].map(([label, val]) => (
                                    <div key={label}>
                                        <span className="text-xs text-muted">{label}</span>
                                        <p className="text-sm font-semibold">{val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    {step > 0 ? (
                        <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                            <ArrowLeft size={16} /> Back
                        </button>
                    ) : <div />}

                    {step < STEPS.length - 1 ? (
                        <button
                            className="btn btn-primary"
                            onClick={() => setStep(step + 1)}
                            disabled={!canProceed()}
                        >
                            Next <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleSubmit}
                            disabled={loading}
                            id="btn-complete-setup"
                        >
                            {loading ? <span className="spinner" /> : '🚀 Complete Setup'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
