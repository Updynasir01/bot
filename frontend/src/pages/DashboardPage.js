import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardAPI, businessAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Store, Bot, DollarSign, AlertCircle, ArrowRight } from 'lucide-react';

const BIZ_COLORS = {
  '🏪 Retail Shop': '#3b82f6', '🍕 Restaurant': '#f97316', '💊 Pharmacy': '#10b981',
  '🏨 Hotel / Guesthouse': '#8b5cf6', '🚗 Car Dealer': '#ef4444',
  '💇 Salon / Barber': '#ec4899', '📦 Logistics': '#f59e0b',
  '🏦 Financial Service': '#06b6d4', '🛒 Supermarket': '#84cc16', 'Other': '#6b7280'
};

const StatusPill = ({ status }) => (
  <span className={`pill ${status}`}>
    <span className="pill-dot" />{status}
  </span>
);

const DashboardPage = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: bizData, isLoading: bizLoading } = useQuery({
    queryKey: ['businesses', { limit: 6 }],
    queryFn: () => businessAPI.getAll({ limit: 6 }).then(r => r.data),
  });

  const chartData = stats?.revenueByMonth?.length
    ? stats.revenueByMonth
    : [
        { month: 'Nov', revenue: 0 }, { month: 'Dec', revenue: 0 },
        { month: 'Jan', revenue: 0 }, { month: 'Feb', revenue: 0 },
        { month: 'Mar', revenue: 0 }, { month: 'Apr', revenue: 0 },
      ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) return (
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: 'var(--muted)', fontSize: 12 }}>{label}</p>
        <p style={{ color: 'var(--gold)', fontWeight: 700 }}>${payload[0].value}</p>
      </div>
    );
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Dashboard <span style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
              — <span className="live-dot" /> Live
            </span>
          </h1>
          <p className="page-subtitle">Overview of all your WhatsApp bots</p>
        </div>
        <Link to="/businesses/add" className="btn btn-primary">
          <Store size={15} /> Add Business
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Clients', value: stats?.businesses?.total || 0, cls: 'green', icon: <Store size={20} />, sub: 'Registered businesses' },
          { label: 'Active Bots', value: stats?.businesses?.active || 0, cls: '', icon: <Bot size={20} />, sub: `${stats?.businesses?.total ? Math.round((stats.businesses.active / stats.businesses.total) * 100) : 0}% online` },
          { label: 'Monthly Revenue', value: `$${(stats?.businesses?.monthly_revenue || 0).toLocaleString()}`, cls: 'gold', icon: <DollarSign size={20} />, sub: 'at $50+/client/mo' },
          { label: 'Pending Setup', value: stats?.businesses?.pending || 0, cls: 'red', icon: <AlertCircle size={20} />, sub: 'Need attention' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="stat-label">{s.label}</div>
              <div style={{ color: 'var(--muted)', opacity: 0.6 }}>{s.icon}</div>
            </div>
            <div className={`stat-value ${s.cls}`}>{statsLoading ? '—' : s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 24 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Revenue Overview</div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--green-glow)' }} />
              <Bar dataKey="revenue" fill="var(--green)" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="card">
          <div className="section-title">Messages (30 days)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Total Messages', value: stats?.messages?.total_messages || 0, color: 'var(--green)' },
              { label: 'Unique Customers', value: stats?.messages?.unique_customers || 0, color: 'var(--blue)' },
              { label: 'Unpaid Clients', value: stats?.businesses?.unpaid || 0, color: 'var(--red)' },
              { label: 'Est. Hours Saved', value: `${Math.round((stats?.messages?.total_messages || 0) * 0.05)}h`, color: 'var(--gold)' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, color: item.color }}>
                  {statsLoading ? '—' : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent clients */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>Recent Clients</div>
        <Link to="/businesses" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          View All <ArrowRight size={13} />
        </Link>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>WhatsApp</th>
              <th>Status</th>
              <th>Messages</th>
              <th>Fee</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {bizLoading ? (
              <tr><td colSpan={6}><div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div></td></tr>
            ) : bizData?.businesses?.length === 0 ? (
              <tr><td colSpan={6}><div className="empty"><div className="empty-icon">🏪</div><h3>No clients yet</h3><p>Add your first business to get started</p></div></td></tr>
            ) : bizData?.businesses?.map(biz => {
              const emoji = biz.business_type?.split(' ')[0] || '🏪';
              const color = BIZ_COLORS[biz.business_type] || '#6b7280';
              return (
                <tr key={biz.id} style={{ cursor: 'pointer' }} onClick={() => {}}>
                  <td>
                    <div className="biz-cell">
                      <div className="biz-icon" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>{emoji}</div>
                      <div>
                        <div className="biz-name">{biz.name}</div>
                        <div className="biz-type">{biz.owner_name} · {biz.city || 'Somalia'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="monospace">{biz.whatsapp_number}</span></td>
                  <td><StatusPill status={biz.status} /></td>
                  <td>{biz.total_messages || 0}</td>
                  <td><span className="gold bold">${biz.monthly_fee}/mo</span></td>
                  <td><span className="muted text-sm">{new Date(biz.created_at).toLocaleDateString()}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;
