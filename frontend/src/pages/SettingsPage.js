import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Save, Eye, EyeOff } from 'lucide-react';

const SettingsPage = () => {
  const { admin } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const [apiSettings, setApiSettings] = useState({
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    ANTHROPIC_API_KEY: '',
    WEBHOOK_BASE_URL: window.location.origin,
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password updated!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    }
    setSaving(false);
  };

  const SectionCard = ({ title, desc, children }) => (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700 }}>{title}</div>
        {desc && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{desc}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">System configuration and integrations</p>
        </div>
      </div>

      <div style={{ maxWidth: 620 }}>
        {/* Admin info */}
        <SectionCard title="Admin Account" desc="Your account details">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#000' }}>
              {admin?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{admin?.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{admin?.email} · {admin?.role}</div>
            </div>
          </div>

          <form onSubmit={handlePasswordChange}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Change Password</div>
            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving} style={{ marginTop: 12 }}>
              <Save size={13} /> Update Password
            </button>
          </form>
        </SectionCard>

        {/* Twilio */}
        <SectionCard title="Twilio WhatsApp API"
          desc="Connect your Twilio account to send/receive WhatsApp messages. Get credentials at twilio.com">
          <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid var(--green-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            💡 After getting Twilio credentials, set webhook URL in your Twilio console to:<br />
            <code style={{ color: 'var(--green)', background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
              {apiSettings.WEBHOOK_BASE_URL}/api/webhook/whatsapp
            </code>
          </div>
          <div className="form-grid">
            {[
              { label: 'Account SID', key: 'TWILIO_ACCOUNT_SID', placeholder: 'ACxxxxxxxxxxxxxxxx' },
              { label: 'Auth Token', key: 'TWILIO_AUTH_TOKEN', placeholder: '••••••••••••••••', type: 'password' },
              { label: 'WhatsApp From Number', key: 'TWILIO_WHATSAPP_FROM', placeholder: 'whatsapp:+14155238886' },
            ].map(f => (
              <div key={f.key} className={`form-group ${f.key === 'TWILIO_WHATSAPP_FROM' ? '' : ''}`}>
                <label className="form-label">{f.label}</label>
                <input className="form-input" type={f.type || 'text'} value={apiSettings[f.key]}
                  onChange={e => setApiSettings(s => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10 }}>
            ⚠️ Save these in your backend <code>.env</code> file — they cannot be set from the UI for security reasons.
          </p>
        </SectionCard>

        {/* Claude AI */}
        <SectionCard title="Claude AI (Anthropic)"
          desc="The AI engine that powers your bots. Get an API key at console.anthropic.com">
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Anthropic API Key</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showKey ? 'text' : 'password'}
                value={apiSettings.ANTHROPIC_API_KEY}
                onChange={e => setApiSettings(s => ({ ...s, ANTHROPIC_API_KEY: e.target.value }))}
                placeholder="sk-ant-api03-..." style={{ paddingRight: 40 }} />
              <button onClick={() => setShowKey(!showKey)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Default Language</label>
            <select className="form-select">
              <option>Somali + English (Recommended)</option>
              <option>English Only</option>
              <option>Somali Only</option>
            </select>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>
            ⚠️ Set <code>ANTHROPIC_API_KEY</code> in your backend <code>.env</code> file.
          </p>
        </SectionCard>

        {/* Webhook info */}
        <SectionCard title="Webhook Information" desc="Configure these in your Twilio dashboard">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Incoming Message Webhook', value: '/api/webhook/whatsapp', method: 'POST' },
              { label: 'Health Check', value: '/health', method: 'GET' },
            ].map(w => (
              <div key={w.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{w.label}</div>
                  <code style={{ fontSize: 12, color: 'var(--green)' }}>{w.method} {w.value}</code>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(`${apiSettings.WEBHOOK_BASE_URL}${w.value}`); toast.success('Copied!'); }}>
                  Copy
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default SettingsPage;
