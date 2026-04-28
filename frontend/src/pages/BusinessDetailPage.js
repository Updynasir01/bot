import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessAPI, fileAPI, paymentAPI, messageAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  ToggleLeft, ToggleRight, Trash2, Upload, CheckCircle,
  MessageSquare, DollarSign, Bot, ArrowLeft, Send, TestTube
} from 'lucide-react';

const BIZ_COLORS = {
  '🏪 Retail Shop':'#3b82f6','🍕 Restaurant':'#f97316','💊 Pharmacy':'#10b981',
  '🏨 Hotel / Guesthouse':'#8b5cf6','🚗 Car Dealer':'#ef4444',
  '💇 Salon / Barber':'#ec4899','📦 Logistics':'#f59e0b',
  '🏦 Financial Service':'#06b6d4','🛒 Supermarket':'#84cc16','Other':'#6b7280'
};

const BusinessDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [uploading, setUploading] = useState({});
  const [testMsg, setTestMsg] = useState('');
  const [testResp, setTestResp] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['business', id],
    queryFn: () => businessAPI.getOne(id).then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: () => businessAPI.toggleBot(id),
    onSuccess: () => { qc.invalidateQueries(['business', id]); qc.invalidateQueries(['businesses']); toast.success('Bot status updated'); },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => businessAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['business', id]); setEditing(false); toast.success('Saved!'); },
    onError: () => toast.error('Failed to save'),
  });

  const paymentMutation = useMutation({
    mutationFn: (data) => paymentAPI.record(id, data),
    onSuccess: () => { qc.invalidateQueries(['business', id]); qc.invalidateQueries(['businesses']); toast.success('Payment recorded!'); },
    onError: () => toast.error('Failed to record payment'),
  });

  const handleFileUpload = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(u => ({ ...u, [fileType]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fileType', fileType);
      await fileAPI.upload(id, fd);
      toast.success(`${file.name} processed!`);
      qc.invalidateQueries(['business', id]);
      setUploading(u => ({ ...u, [fileType]: false }));
    } catch (err) {
      toast.error('Upload failed: ' + (err.response?.data?.error || err.message));
      setUploading(u => ({ ...u, [fileType]: false }));
    }
    e.target.value = '';
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await fileAPI.delete(fileId);
      toast.success('File deleted');
      qc.invalidateQueries(['business', id]);
    } catch { toast.error('Failed to delete file'); }
  };

  const handleTestBot = async () => {
    if (!testMsg.trim()) return;
    setTestLoading(true);
    try {
      const res = await businessAPI.testBot(id, testMsg);
      setTestResp(res.data.response);
    } catch (err) {
      setTestResp('Error: ' + (err.response?.data?.error || err.message));
    }
    setTestLoading(false);
  };

  if (isLoading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!data) return <div className="empty"><div className="empty-icon">❌</div><h3>Business not found</h3></div>;

  const { business, files = [], recentMessages = [], payments = [] } = data;
  const color = BIZ_COLORS[business.business_type] || '#6b7280';
  const emoji = business.business_type?.split(' ')[0] || '🏪';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/businesses')} style={{ marginBottom: 16 }}>
          <ArrowLeft size={13} /> Back to Clients
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, fontSize: 28,
              background: `${color}20`, border: `2px solid ${color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{emoji}</div>
            <div>
              <h1 className="page-title">{business.name}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <span className={`pill ${business.status}`}><span className="pill-dot" />{business.status}</span>
                <span className="pill" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>{business.business_type}</span>
                <span className="pill" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>{business.city || 'Somalia'}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${business.bot_active ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending}
            >
              {business.bot_active ? <><ToggleRight size={15} /> Pause Bot</> : <><ToggleLeft size={15} /> Activate Bot</>}
            </button>
            {!business.is_paid && (
              <button className="btn btn-outline" onClick={() => paymentMutation.mutate({ amount: business.monthly_fee, payment_method: 'cash' })}>
                <DollarSign size={15} /> Mark Paid
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Messages', value: business.total_messages || 0, color: 'var(--green)' },
          { label: 'Unique Customers', value: business.unique_customers || 0, color: 'var(--blue)' },
          { label: 'Monthly Fee', value: `$${business.monthly_fee}`, color: 'var(--gold)' },
          { label: 'Payment', value: business.is_paid ? '✓ Paid' : '✗ Unpaid', color: business.is_paid ? 'var(--green)' : 'var(--red)' },
        ].map((s, i) => (
          <div key={i} className="card card-sm" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {['overview', 'files', 'messages', 'bot test', 'payments'].map(t => (
          <div key={t} className={`tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t}
          </div>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Business Details</div>
              <button className="btn btn-outline btn-sm" onClick={() => { setEditing(!editing); setEditForm(business); }}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Name', key: 'name' }, { label: 'Owner', key: 'owner_name' },
                  { label: 'City', key: 'city' }, { label: 'Business Hours', key: 'business_hours' }
                ].map(f => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" value={editForm[f.key] || ''} onChange={e => setEditForm(x => ({ ...x, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={editForm.description || ''} onChange={e => setEditForm(x => ({ ...x, description: e.target.value }))} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => updateMutation.mutate(editForm)}>Save Changes</button>
              </div>
            ) : (
              <>
                {[
                  ['Owner', business.owner_name || '—'],
                  ['WhatsApp', business.whatsapp_number],
                  ['Business Code', business.business_code || '—'],
                  ['Type', business.business_type],
                  ['City', business.city || '—'],
                  ['Hours', business.business_hours || '—'],
                  ['Language', business.language_preference],
                  ['Plan', business.plan],
                  ['Joined', new Date(business.created_at).toLocaleDateString()],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                {business.shared_whatsapp_link && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    <span style={{ color: 'var(--muted)' }}>Customer Entry Link</span>
                    <a href={business.shared_whatsapp_link} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                      Open Link
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="section-title">Bot Greetings</div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Somali Greeting</label>
                  <textarea className="form-textarea" value={editForm.greeting_somali || ''} onChange={e => setEditForm(x => ({ ...x, greeting_somali: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">English Greeting</label>
                  <textarea className="form-textarea" value={editForm.greeting_english || ''} onChange={e => setEditForm(x => ({ ...x, greeting_english: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">After-Hours Message</label>
                  <textarea className="form-textarea" value={editForm.after_hours_message || ''} onChange={e => setEditForm(x => ({ ...x, after_hours_message: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: '🇸🇴 Somali', value: business.greeting_somali },
                  { label: '🇬🇧 English', value: business.greeting_english },
                  { label: '🌙 After Hours', value: business.after_hours_message },
                ].map(g => (
                  <div key={g.label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{g.label}</div>
                    <div style={{ fontSize: 14 }}>{g.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FILES */}
      {activeTab === 'files' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
            {[
              { key: 'faq_pdf', label: '📄 FAQ Document', accept: '.pdf' },
              { key: 'price_excel', label: '📊 Price List', accept: '.xlsx,.xls,.csv' },
              { key: 'product_catalog', label: '🛒 Product Catalog', accept: '.pdf' },
            ].map(f => (
              <label key={f.key} className="upload-zone" style={{ display: 'block', cursor: 'pointer' }}>
                <input type="file" accept={f.accept} style={{ display: 'none' }} onChange={e => handleFileUpload(e, f.key)} />
                {uploading[f.key] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <div className="spinner" /> Processing...
                  </div>
                ) : (
                  <>
                    <Upload size={22} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--muted)' }} />
                    <p style={{ fontWeight: 600, color: 'var(--text)' }}>{f.label}</p>
                    <p>Click to upload</p>
                  </>
                )}
              </label>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th>Type</th><th>Extracted</th><th>Uploaded</th><th>Action</th></tr></thead>
              <tbody>
                {files.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty"><div className="empty-icon">📁</div><h3>No files uploaded</h3></div></td></tr>
                ) : files.map(f => (
                  <tr key={f.id}>
                    <td><span style={{ fontSize: 13 }}>{f.original_name}</span></td>
                    <td><span className="pill" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>{f.file_type}</span></td>
                    <td><span style={{ color: 'var(--green)', fontSize: 12 }}>{f.text_chars ? `${(f.text_chars/1000).toFixed(1)}k chars` : '—'}</span></td>
                    <td><span className="muted text-sm">{new Date(f.created_at).toLocaleDateString()}</span></td>
                    <td>
                      <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => handleDeleteFile(f.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      {activeTab === 'messages' && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>From</th><th>Message</th><th>Direction</th><th>Response Time</th><th>Date</th></tr></thead>
            <tbody>
              {recentMessages.length === 0 ? (
                <tr><td colSpan={5}><div className="empty"><div className="empty-icon">💬</div><h3>No messages yet</h3><p>Messages will appear here once customers start chatting</p></div></td></tr>
              ) : recentMessages.map(m => (
                <tr key={m.id}>
                  <td><span className="monospace">{m.from_number}</span></td>
                  <td style={{ maxWidth: 300 }}><span style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message_body}</span></td>
                  <td><span className={`pill ${m.direction === 'inbound' ? 'pending' : 'active'}`}><span className="pill-dot" />{m.direction}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--muted)' }}>{m.response_time_ms ? `${m.response_time_ms}ms` : '—'}</span></td>
                  <td><span className="muted text-sm">{new Date(m.created_at).toLocaleString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BOT TEST */}
      {activeTab === 'bot test' && (
        <div style={{ maxWidth: 560 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Test Bot Response</div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              Simulate a customer message and see how the bot responds using this business's knowledge base.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="form-input"
                placeholder="e.g. What are your prices?"
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTestBot()}
              />
              <button className="btn btn-primary" onClick={handleTestBot} disabled={testLoading}>
                {testLoading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Send size={15} />}
              </button>
            </div>

            {testResp && (
              <div style={{ marginTop: 16, background: 'var(--surface2)', borderRadius: 10, padding: 16, borderLeft: '3px solid var(--green)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>🤖 Bot Response:</div>
                <p style={{ fontSize: 14, lineHeight: 1.7 }}>{testResp}</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-title">Quick Test Messages</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                'Hello, what do you offer?', 'Ma haysataa lacag?', 'What are your prices?',
                'Xafiiska goorma furmaa?', 'Where are you located?', 'How can I order?'
              ].map(msg => (
                <button key={msg} className="btn btn-outline btn-sm"
                  onClick={() => { setTestMsg(msg); }}>
                  {msg}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS */}
      {activeTab === 'payments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Payment History</div>
            <button className="btn btn-primary btn-sm"
              onClick={() => paymentMutation.mutate({ amount: business.monthly_fee, payment_method: 'cash' })}>
              <DollarSign size={13} /> Record Payment
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Notes</th><th>Date</th></tr></thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty"><div className="empty-icon">💰</div><h3>No payments recorded</h3></div></td></tr>
                ) : payments.map(p => (
                  <tr key={p.id}>
                    <td><span className="gold bold">${p.amount}</span></td>
                    <td>{p.payment_method}</td>
                    <td><span className={`pill ${p.status === 'paid' ? 'paid' : 'unpaid'}`}><span className="pill-dot" />{p.status}</span></td>
                    <td><span className="muted text-sm">{p.notes || '—'}</span></td>
                    <td><span className="muted text-sm">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDetailPage;
