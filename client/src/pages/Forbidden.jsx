import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '440px', width: '100%', padding: '32px', backgroundColor: '#131a2c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        <ShieldAlert size={48} style={{ color: '#f59e0b', marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px', color: '#fff' }}>Access Denied</h2>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '24px' }}>
          You don't have permission to access this page. Please return to the central operational dashboard.
        </p>
        <Link 
          to="/dashboard" 
          className="btn" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'auto', margin: '0 auto', padding: '12px 20px', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
