import React from 'react';
import { Package, PlusCircle, Info } from 'lucide-react';

export default function Products() {
  return (
    <div className="glass-card">
      <div className="panel-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Product Catalog</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Master lists of item SKU definitions, retail values, and tax rules.</p>
        </div>
        <button className="btn" style={{ width: 'auto', marginTop: 0 }}>
          <PlusCircle size={16} /> Define New Product
        </button>
      </div>

      <div className="placeholder-view">
        <Package size={64} className="placeholder-icon" />
        <h3 className="placeholder-title">No Product Definitions Found</h3>
        <p className="placeholder-desc">
          The product master list is currently pending implementation. Database linkages will support product tags, categories, pricing guidelines, and custom description attributes.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--accent-cyan)', fontSize: '0.85rem', backgroundColor: 'var(--accent-cyan-light)', padding: '10px 16px', borderRadius: '8px', marginTop: '16px' }}>
          <Info size={16} /> Database connection handles will populate product cards with live prices.
        </div>
      </div>
    </div>
  );
}
