import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { businessAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Search, Plus, ToggleLeft, ToggleRight, Trash2, Eye } from 'lucide-react';

const BIZ_COLORS = {
  '🏪 Retail Shop': '#3b82f6', '🍕 Restaurant': '#f97316', '💊 Pharmacy': '#10b981',
  '🏨 Hotel / Guesthouse': '#8b5cf6', '🚗 Car Dealer': '#ef4444',
  '💇 Salon / Barber': '#ec4899', '📦 Logistics': '#f59e0b',
  '🏦 Financial Service': '#06b6d4', '🛒 Supermarket': '#84cc16', 'Other': '#6b7280'
};

const BusinessesPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['businesses', { search, status: statusFilter }],
    queryFn: () => businessAPI.getAll({ search, status: statusFilter }).then(r => r.data),
    keepPreviousData: true,
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => businessAPI.toggleBot(id),
    onSuccess: () => { qc.invalidateQueries(['businesses']); qc.invalidateQueries(['dashboard-stats']); },
    onError: () => toast.error('Failed to toggle bot'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => businessAPI.delete(id),
    onSuccess: () => {
      toast.success('Business deleted');
      qc.invalidateQueries(['businesses']);
      qc.invalidateQueries(['dashboard-stats']);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleDelete = (e, id, name) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) deleteMutation.mutate(id);
  };

  const handleToggle = (e, id) => {
    e.stopPropagation();
    toggleMutation.mutate(id);
  };

  const filters = ['all', 'active', 'pending', 'inactive'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            {data?.total || 0} registered businesses
          </p>
        </div>
        <Link to="/businesses/add" className="btn btn-primary">
          <Plus size={15} /> Add Business
        </Link>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap">
          <Search size={14} />
          <input
            className="form-input search-input"
            placeholder="Search by name, number, owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {filters.map(f => (
            <button
              key={f}
              className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>WhatsApp</th>
              <th>Type</th>
              <th>Status</th>
              <th>Bot</th>
              <th>Messages</th>
              <th>Fee</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9}><div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div></td></tr>
            ) : data?.businesses?.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty">
                  <div className="empty-icon">🏪</div>
                  <h3>No clients found</h3>
                  <p>{search ? 'Try a different search term' : 'Add your first business to get started'}</p>
                  {!search && <Link to="/businesses/add" className="btn btn-primary" style={{ marginTop: 16 }}>+ Add Business</Link>}
                </div>
              </td></tr>
            ) : data?.businesses?.map(biz => {
              const emoji = biz.business_type?.split(' ')[0] || '🏪';
              const color = BIZ_COLORS[biz.business_type] || '#6b7280';
              return (
                <tr key={biz.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/businesses/${biz.id}`)}>
                  <td>
                    <div className="biz-cell">
                      <div className="biz-icon" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>{emoji}</div>
                      <div>
                        <div className="biz-name">{biz.name}</div>
                        <div className="biz-type">{biz.owner_name || '—'} · {biz.city || 'Somalia'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="monospace">{biz.whatsapp_number}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--muted)' }}>{biz.business_type?.replace(/^[^\s]+\s/, '')}</span></td>
                  <td><span className={`pill ${biz.status}`}><span className="pill-dot" />{biz.status}</span></td>
                  <td>
                    <button
                      className="btn-icon"
                      style={{ color: biz.bot_active ? 'var(--green)' : 'var(--muted)' }}
                      onClick={e => handleToggle(e, biz.id)}
                      title={biz.bot_active ? 'Bot is ON — click to pause' : 'Bot is OFF — click to activate'}
                    >
                      {biz.bot_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                  <td style={{ fontWeight: 600 }}>{biz.total_messages || 0}</td>
                  <td><span className="gold bold">${biz.monthly_fee}/mo</span></td>
                  <td>
                    <span className={`pill ${biz.is_paid ? 'paid' : 'unpaid'}`}>
                      <span className="pill-dot" />{biz.is_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" title="View details" onClick={() => navigate(`/businesses/${biz.id}`)}>
                        <Eye size={14} />
                      </button>
                      <button className="btn-icon" title="Delete" style={{ color: 'var(--red)' }}
                        onClick={e => handleDelete(e, biz.id, biz.name)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data?.pages > 1 && (
        <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--muted)', fontSize: 13 }}>
          Showing page 1 of {data.pages} — {data.total} total
        </div>
      )}
    </div>
  );
};

export default BusinessesPage;
