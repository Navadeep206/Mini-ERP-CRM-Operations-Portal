import React from 'react';
import { Users, Package, ShoppingCart, FileSpreadsheet, TrendingUp, AlertCircle, Clock } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    {
      label: 'Total Registered Customers',
      value: '1,280',
      change: '+12% this month',
      isPositive: true,
      color: '#4f46e5',
      icon: Users
    },
    {
      label: 'Products in Catalog',
      value: '432',
      change: '15 low stock items',
      isPositive: false,
      color: '#06b6d4',
      icon: Package
    },
    {
      label: 'Active Inventory Value',
      value: '$240,500',
      change: '+4.2% price adjustment',
      isPositive: true,
      color: '#10b981',
      icon: ShoppingCart
    },
    {
      label: 'Processed Challans',
      value: '984',
      change: '4 pending approval',
      isPositive: true,
      color: '#f59e0b',
      icon: FileSpreadsheet
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px' }}>Operations Workspace</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome back. Here is the operational summary of your active systems.</p>
      </div>

      <div className="dashboard-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="glass-card stat-widget">
              <div className="stat-icon-wrapper" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                <Icon size={28} />
              </div>
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
                <span className="stat-change" style={{ color: stat.isPositive ? 'var(--success)' : 'var(--warning)' }}>
                  {stat.isPositive ? <TrendingUp size={14} /> : <AlertCircle size={14} />}
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }}>
        {/* Recent Events logs */}
        <div className="glass-card">
          <div className="panel-header">
            <h3 className="panel-title">System Status & Activity</h3>
            <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} /> Live Sync
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Prisma Client Loaded</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Schema sync configured with PostgreSQL</div>
              </div>
              <span className="badge badge-success" style={{ height: 'fit-content' }}>Active</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>API Endpoint Health</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Express routes mounted under /api/health</div>
              </div>
              <span className="badge badge-success" style={{ height: 'fit-content' }}>Healthy</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'between', paddingBottom: '4px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Zod Request Validator</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>JSON validation middleware deployed</div>
              </div>
              <span className="badge badge-success" style={{ height: 'fit-content' }}>Deployed</span>
            </div>
          </div>
        </div>

        {/* Action center */}
        <div className="glass-card">
          <div className="panel-header">
            <h3 className="panel-title">System Initialization Console</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <p>
              This is the project foundation dashboard. All modules have placeholder views connected with React Router matching the application architecture requirements.
            </p>
            <p>
              Development environment keys and database credentials must be loaded via local environment config files: <code>client/.env</code> and <code>server/.env</code>.
            </p>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', marginTop: '8px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Connected Components:</div>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Express + TS API Server</li>
                <li>React Client Shell + Sidebar Router</li>
                <li>PostgreSQL (via Prisma ORM client generator)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
