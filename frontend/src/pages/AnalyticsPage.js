import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

const AnalyticsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsAPI.get().then(r => r.data),
    refetchInterval: 60000,
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) return (
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
        <p style={{ color: 'var(--muted)', fontSize: 12 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</p>)}
      </div>
    );
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Bot performance and usage insights (last 30 days)</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Messages', value: data?.overall?.total_messages || 0, cls: 'green' },
          { label: 'Active Bots', value: data?.overall?.active_bots || 0, cls: '' },
          { label: 'Avg Response Time', value: data?.overall?.avg_response_ms ? `${Math.round(data.overall.avg_response_ms)}ms` : '—', cls: '' },
          { label: 'Hours Saved', value: `${Math.round((data?.overall?.total_messages || 0) * 0.05)}h`, cls: 'gold' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{isLoading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Daily messages */}
        <div className="card">
          <div className="section-title">Daily Messages (14 days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.daily || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="messages" stroke="var(--green)" strokeWidth={2} dot={false} name="Messages" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top bots */}
        <div className="card">
          <div className="section-title">Top Bots by Messages</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.topBots?.slice(0,6) || []} layout="vertical" barSize={16}>
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="messages" fill="var(--green)" radius={[0,4,4,0]} opacity={0.85} name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed table */}
      <div className="section-title">Bot Performance Details</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Business</th><th>Type</th><th>Messages</th><th>Unique Users</th><th>Activity Bar</th></tr></thead>
          <tbody>
            {!data?.topBots?.length ? (
              <tr><td colSpan={5}><div className="empty"><div className="empty-icon">📊</div><h3>No data yet</h3><p>Analytics will show here once bots start receiving messages</p></div></td></tr>
            ) : data.topBots.map((bot, i) => {
              const maxMsg = data.topBots[0]?.messages || 1;
              return (
                <tr key={i}>
                  <td><span style={{ fontWeight: 600 }}>{bot.name}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--muted)' }}>{bot.business_type}</span></td>
                  <td><span className="green bold">{bot.messages}</span></td>
                  <td>{bot.users}</td>
                  <td style={{ minWidth: 160 }}>
                    <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(bot.messages / maxMsg) * 100}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 0.6s' }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsPage;
