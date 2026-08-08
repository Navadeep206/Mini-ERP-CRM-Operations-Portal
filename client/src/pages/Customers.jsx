import React from 'react';
import { Users, UserPlus, Info } from 'lucide-react';

export default function Customers() {
  return (
    <div className="glass-card">
      <div className="panel-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Customer Management</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Registered business clients, credit allocations, and profile logs.</p>
        </div>
        <button className="btn" style={{ width: 'auto', marginTop: 0 }}>
          <UserPlus size={16} /> Add New Customer
        </button>
      </div>

      <div className="placeholder-view">
        <Users size={64} className="placeholder-icon" />
        <h3 className="placeholder-title">No Customers Loaded</h3>
        <p className="placeholder-desc">
          The CRM customer module is currently configured as a placeholder. In future phases, this screen will load client accounts, contact details, and transactions directly from PostgreSQL using the Prisma ORM layer.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--accent-cyan)', fontSize: '0.85rem', backgroundColor: 'var(--accent-cyan-light)', padding: '10px 16px', borderRadius: '8px', marginTop: '16px' }}>
          <Info size={16} /> Future logic will integrate contact cards, credit limits, and purchase histories.
        </div>
      </div>
    </div>
  );
}
