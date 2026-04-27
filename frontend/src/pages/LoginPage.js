import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('admin@botxafiis.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Fill in all fields');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', background: 'var(--green)',
            borderRadius: '16px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '28px', margin: '0 auto 12px'
          }}>💬</div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '26px', fontWeight: 800 }}>BotXafiis</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            WhatsApp Bot SaaS — Admin Panel
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
            Sign In
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@botxafiis.com"
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : '→ Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '12px', marginTop: '16px' }}>
          Default: admin@botxafiis.com / admin123
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
