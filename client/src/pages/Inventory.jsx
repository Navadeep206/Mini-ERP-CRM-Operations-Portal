import React from 'react';
import { ShoppingCart, RefreshCw, Info } from 'lucide-react';

export default function Inventory() {
  return (
    <div className="glass-card">
      <div className="panel-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Stock & Inventory Controls</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Track live warehouse allocations, item counts, and reorder levels.</p>
        </div>
        <button className="btn" style={{ width: 'auto', marginTop: 0, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-glass)' }}>
          <RefreshCw size={16} /> Run Stock Audit
        </button>
      </div>

      <div className="placeholder-view">
        <ShoppingCart size={64} className="placeholder-icon" />
        <h3 className="placeholder-title">Inventory Registry Offline</h3>
        <p className="placeholder-desc">
          Inventory control modules are decoupled from live state. When deployed, database logs will trace incoming receipts, stock transfers between locations, and automatically flag low quantities.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--accent-cyan)', fontSize: '0.85rem', backgroundColor: 'var(--accent-cyan-light)', padding: '10px 16px', borderRadius: '8px', marginTop: '16px' }}>
          <Info size={16} /> Automatic threshold monitoring is planned for the warehouse integration phase.
        </div>
      </div>
    </div>
  );
}
