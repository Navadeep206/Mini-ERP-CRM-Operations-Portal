import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Layers, Layout, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="login-container" style={{ flexDirection: 'column', gap: '32px' }}>
      <div className="glass-card text-center" style={{ maxWidth: '600px', width: '100%', padding: '48px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 className="login-logo" style={{ fontSize: '2.5rem' }}>MINI ERP + CRM</h1>
          <p className="login-subtitle">Operations & Administrative Control Portal</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)', color: '#a78bfa', padding: '10px', borderRadius: '12px' }}>
              <Layers size={24} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, marginBottom: '4px' }}>Unified Business Platform</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Seamlessly coordinate customer records, product catalogues, live inventory, and delivery challans.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '10px', borderRadius: '12px' }}>
              <Shield size={24} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, marginBottom: '4px' }}>Role-Based Operations</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Strict audit trails, environment validation via Zod, and granular permission sets for administrative control.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/login" className="btn" style={{ flex: 1 }}>
            Sign In to Portal <ArrowRight size={18} />
          </Link>
          <Link to="/dashboard" className="btn" style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}>
            Quick Demo
          </Link>
        </div>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        v1.0.0-foundation • Build environment verification active
      </div>
    </div>
  );
}
