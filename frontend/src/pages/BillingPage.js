import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentAPI, businessAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { DollarSign } from 'lucide-react';

const BillingPage = () => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['payment-analytics'],
    queryFn: () => paymentAPI.getAnalytics().then(r => r.data),
  });

  const { data: allPayments } = useQuery({
    queryKey: ['all-payments'],
    queryFn: () => paymentAPI.getAll().then(r => r.data),
  });

  const payMutation = useMutation({
    mutationFn: ({ bizId, amount }) => paymentAPI.record(bizId, { amount, payment_method: 'cash' }),
    onSuccess: () => { qc.invalidateQueries(['payment-analytics']); qc.invalidateQueries(['all-payments']); qc.invalidateQueries(['businesses']); toast.success('💰 Payment recorded!'); },
    onError: () => toast.error('Failed'),
  });

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
          <h1 className="page-title">Billing & Revenue</h1>
          <p className="page-subtitle">Track payments and subscriptions</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Collected', value: `$${data?.summary?.total_collected || 0}`, cls: 'gold' },
          { label: 'Outstanding', value: `$${(data?.unpaidBusinesses?.length || 0) * 50}`, cls: 'red' },
          { label: 'Active Subscriptions', value: data?.summary?.paid_count || 0, cls: 'green' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{isLoading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24 }}>
        {/* Revenue chart */}
        <div className="card">
          <div className="section-title">Monthly Revenue</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data?.monthlyRevenue || []} barSize={32}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--green-glow)' }} />
              <Bar dataKey="revenue" fill="var(--gold)" radius={[4,4,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Unpaid businesses */}
        <div className="card">
          <div className="section-title">Overdue Payments</div>
          {!data?.unpaidBusinesses?.length ? (
            <div style={{ textAlign: 'center', color: 'var(--green)', padding: '20px 0' }}>
              <CheckCircle size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
              All clients are paid!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.unpaidBusinesses.slice(0,5).map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{b.whatsapp_number}</div>
                  </div>
                  <button className="btn btn-primary btn-sm"
                    onClick={() => payMutation.mutate({ bizId: b.id, amount: b.monthly_fee })}>
                    <DollarSign size={12} /> ${b.monthly_fee}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All payments */}
      <div className="section-title">All Payments</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Business</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {!allPayments?.payments?.length ? (
              <tr><td colSpan={5}><div className="empty"><div className="empty-icon">💰</div><h3>No payments yet</h3></div></td></tr>
            ) : allPayments.payments.map(p => (
              <tr key={p.id}>
                <td>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.business_name}</div>
                    <div className="muted text-sm">{p.whatsapp_number}</div>
                  </div>
                </td>
                <td><span className="gold bold">${p.amount}</span></td>
                <td style={{ textTransform: 'capitalize' }}>{p.payment_method}</td>
                <td><span className={`pill ${p.status === 'paid' ? 'paid' : 'unpaid'}`}><span className="pill-dot" />{p.status}</span></td>
                <td className="muted text-sm">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// eslint-disable-next-line no-undef
const CheckCircle = ({ size, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>;

export default BillingPage;
