import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';
import {
  LayoutDashboard, Store, PlusCircle, Bot, CreditCard,
  BarChart3, Settings, LogOut, MessageSquare
} from 'lucide-react';

const Layout = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then(r => r.data),
    refetchInterval: 30000,
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={16} />, label: 'Dashboard', exact: true },
    { to: '/businesses', icon: <Store size={16} />, label: 'Clients', badge: stats?.businesses?.total },
    { to: '/businesses/add', icon: <PlusCircle size={16} />, label: 'Add Business' },
  ];
  const navItems2 = [
    { to: '/analytics', icon: <BarChart3 size={16} />, label: 'Analytics' },
    { to: '/billing', icon: <CreditCard size={16} />, label: 'Billing', badge: stats?.businesses?.unpaid, badgeRed: true },
    { to: '/settings', icon: <Settings size={16} />, label: 'Settings' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">💬</div>
          <div>
            <div className="logo-name">BotXafiis</div>
            <div className="logo-tag">Admin Panel</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-section">Main</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className={`nav-badge${item.badgeRed ? ' red' : ''}`}>{item.badge}</span>
              )}
            </NavLink>
          ))}

          <div className="nav-section">Management</div>
          {navItems2.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className={`nav-badge${item.badgeRed ? ' red' : ''}`}>{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-card">
            <div className="user-avatar">{admin?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin?.name}
              </div>
              <div className="user-role">{admin?.role}</div>
            </div>
            <button className="btn-icon" onClick={handleLogout} title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
