import React from 'react';
import { FileSpreadsheet, FileText, Info } from 'lucide-react';

export default function Challans() {
  return (
    <div className="glass-card">
      <div className="panel-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Delivery Challans</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Create, authorize, and archive formal cargo distribution logs.</p>
        </div>
        <button className="btn" style={{ width: 'auto', marginTop: 0 }}>
          <FileText size={16} /> Draft New Challan
        </button>
      </div>

      <div className="placeholder-view">
        <FileSpreadsheet size={64} className="placeholder-icon" />
        <h3 className="placeholder-title">No Challan History</h3>
        <p className="placeholder-desc">
          Delivery challenge logs will track dispatch timings, quantity transfers, and customer signatures. Standard formatting templates will print directly to PDF.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--accent-cyan)', fontSize: '0.85rem', backgroundColor: 'var(--accent-cyan-light)', padding: '10px 16px', borderRadius: '8px', marginTop: '16px' }}>
          <Info size={16} /> Real-time PDF generator packages will build invoices and dispatch records.
        </div>
      </div>
    </div>
  );
}
