import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { businessAPI, fileAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Upload, CheckCircle } from 'lucide-react';

const BUSINESS_TYPES = [
  '🏪 Retail Shop', '🍕 Restaurant', '💊 Pharmacy', '🏨 Hotel / Guesthouse',
  '🚗 Car Dealer', '💇 Salon / Barber', '📦 Logistics', '🏦 Financial Service',
  '🛒 Supermarket', '🧪 Medical Clinic', '📱 Electronics Shop', 'Other'
];

const PLANS = [
  { value: 'basic', label: 'Basic', price: 50, desc: '1 bot, standard speed' },
  { value: 'pro', label: 'Pro', price: 100, desc: 'Priority AI, analytics' },
  { value: 'enterprise', label: 'Enterprise', price: 200, desc: 'Multi-bot, full support' },
];

const AddBusinessPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [createdId, setCreatedId] = useState(null);
  const [uploading, setUploading] = useState({});

  const [form, setForm] = useState({
    name: '', owner_name: '', whatsapp_number: '', business_type: '',
    city: '', description: '', plan: 'basic', monthly_fee: 50,
    greeting_somali: 'Ku soo dhawoow! Sideen kuu caawin karaa? 🌟',
    greeting_english: 'Welcome! How can I help you today? 🌟',
    language_preference: 'both', business_hours: 'Sat-Thu 8am-9pm',
    after_hours_message: 'Xafiiska waa xiran yahay. We are currently closed. ⏰'
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: () => businessAPI.create(form),
    onSuccess: (res) => {
      setCreatedId(res.data.business.id);
      qc.invalidateQueries(['businesses']);
      qc.invalidateQueries(['dashboard-stats']);
      toast.success('Business created! Now upload files.');
      setTab(1);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file || !createdId) return;
    setUploading(u => ({ ...u, [fileType]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fileType', fileType);
      await fileAPI.upload(createdId, fd);
      toast.success(`${file.name} uploaded & processed!`);
      setUploading(u => ({ ...u, [fileType]: false, [`${fileType}_done`]: file.name }));
    } catch (err) {
      toast.error('Upload failed: ' + (err.response?.data?.error || err.message));
      setUploading(u => ({ ...u, [fileType]: false }));
    }
  };

  const handlePlanChange = (plan) => {
    const price = { basic: 50, pro: 100, enterprise: 200 }[plan] || 50;
    setForm(f => ({ ...f, plan, monthly_fee: price }));
  };

  const tabs = ['📋 Business Info', '📁 Upload Files', '⚙️ Bot Config'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Add New Business</h1>
          <p className="page-subtitle">Register a client to set up their WhatsApp bot</p>
        </div>
      </div>

      <div style={{ maxWidth: 680 }}>
        {/* Tab bar */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {tabs.map((t, i) => (
            <div key={i} className={`tab ${tab === i ? 'active' : ''}`}
              onClick={() => { if (i > 0 && !createdId) { toast.error('Complete Step 1 first'); return; } setTab(i); }}
              style={{ cursor: i > 0 && !createdId ? 'not-allowed' : 'pointer', opacity: i > 0 && !createdId ? 0.5 : 1 }}>
              {t}
            </div>
          ))}
        </div>

        <div className="card">
          {/* TAB 0 - Business Info */}
          {tab === 0 && (
            <>
              <div className="modal-title" style={{ marginBottom: 4 }}>Business Information</div>
              <div className="modal-sub">Enter the client's basic details</div>

              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Business Name *</label>
                  <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Halal Pharmacy Mogadishu" />
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-input" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Ahmed Hassan" />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Number *</label>
                  <input className="form-input" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} placeholder="+252612345678" />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Type *</label>
                  <select className="form-select" value={form.business_type} onChange={e => set('business_type', e.target.value)}>
                    <option value="">Select type...</option>
                    {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mogadishu / Hargeisa / Bosaso..." />
                </div>
                <div className="form-group full">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this business sell or offer?" />
                </div>
              </div>

              {/* Plan selector */}
              <div style={{ marginTop: 20 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 10 }}>Subscription Plan</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {PLANS.map(p => (
                    <div key={p.value}
                      onClick={() => handlePlanChange(p.value)}
                      style={{
                        border: `2px solid ${form.plan === p.value ? 'var(--green)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)', padding: 14, cursor: 'pointer',
                        background: form.plan === p.value ? 'var(--green-glow)' : 'var(--surface2)',
                        transition: 'all 0.18s'
                      }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{p.label}</div>
                      <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800 }}>${p.price}<span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>/mo</span></div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => navigate('/businesses')}>Cancel</button>
                <button className="btn btn-primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating...</> : '→ Create & Continue'}
                </button>
              </div>
            </>
          )}

          {/* TAB 1 - File uploads */}
          {tab === 1 && (
            <>
              <div className="modal-title" style={{ marginBottom: 4 }}>Upload Knowledge Files</div>
              <div className="modal-sub">These files train the bot to answer customer questions</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'faq_pdf', label: '📄 FAQ Document (PDF)', desc: 'Upload your business FAQ — bot will answer from this', accept: '.pdf' },
                  { key: 'price_excel', label: '📊 Price List (Excel / CSV)', desc: 'Product names, prices, stock availability', accept: '.xlsx,.xls,.csv' },
                  { key: 'product_catalog', label: '🛒 Product Catalog (PDF, optional)', desc: 'Full product descriptions and details', accept: '.pdf' },
                ].map(f => (
                  <label key={f.key} className={`upload-zone ${uploading[f.key] ? 'drag' : ''}`} style={{ display: 'block' }}>
                    <input type="file" accept={f.accept} style={{ display: 'none' }} onChange={e => handleFileUpload(e, f.key)} />
                    {uploading[`${f.key}_done`] ? (
                      <div style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <CheckCircle size={20} /> <strong>{uploading[`${f.key}_done`]}</strong> — uploaded ✓
                      </div>
                    ) : uploading[f.key] ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <div className="spinner" /> Processing...
                      </div>
                    ) : (
                      <>
                        <Upload size={24} style={{ color: 'var(--muted)', margin: '0 auto 8px', display: 'block' }} />
                        <p><strong style={{ color: 'var(--text)' }}>{f.label}</strong></p>
                        <p>{f.desc}</p>
                        <p style={{ color: 'var(--green)', marginTop: 6, fontSize: 12 }}>Click to select file</p>
                      </>
                    )}
                  </label>
                ))}
              </div>

              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setTab(0)}>← Back</button>
                <button className="btn btn-outline" onClick={() => setTab(2)}>Skip for now</button>
                <button className="btn btn-primary" onClick={() => setTab(2)}>→ Configure Bot</button>
              </div>
            </>
          )}

          {/* TAB 2 - Bot config */}
          {tab === 2 && (
            <>
              <div className="modal-title" style={{ marginBottom: 4 }}>Bot Configuration</div>
              <div className="modal-sub">Customize how the bot talks to customers</div>

              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Greeting Message (Somali)</label>
                  <textarea className="form-textarea" value={form.greeting_somali} onChange={e => set('greeting_somali', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Greeting Message (English)</label>
                  <textarea className="form-textarea" value={form.greeting_english} onChange={e => set('greeting_english', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Response Language</label>
                  <select className="form-select" value={form.language_preference} onChange={e => set('language_preference', e.target.value)}>
                    <option value="both">Somali + English (Recommended)</option>
                    <option value="somali">Somali Only</option>
                    <option value="english">English Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Business Hours</label>
                  <input className="form-input" value={form.business_hours} onChange={e => set('business_hours', e.target.value)} placeholder="Sat-Thu 8am-9pm, Fri 2pm-9pm" />
                </div>
                <div className="form-group full">
                  <label className="form-label">After-Hours Message</label>
                  <textarea className="form-textarea" value={form.after_hours_message} onChange={e => set('after_hours_message', e.target.value)} />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setTab(1)}>← Back</button>
                <button className="btn btn-primary" onClick={async () => {
                  try {
                    await businessAPI.update(createdId, {
                      greeting_somali: form.greeting_somali,
                      greeting_english: form.greeting_english,
                      language_preference: form.language_preference,
                      business_hours: form.business_hours,
                      after_hours_message: form.after_hours_message,
                    });
                    toast.success('🚀 Bot is ready!');
                    navigate(`/businesses/${createdId}`);
                  } catch {
                    toast.error('Failed to save config');
                  }
                }}>
                  🚀 Finish Setup
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddBusinessPage;
