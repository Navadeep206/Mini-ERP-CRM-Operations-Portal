import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Frontend rendering error boundary intercepted:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0f19', color: '#fff', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: '440px', width: '100%', padding: '32px', backgroundColor: '#131a2c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px' }}>Application Render Error</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '24px' }}>
              An unexpected client-side error occurred while rendering this interface page. Please refresh the window to reload the systems.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
            >
              <RefreshCw size={16} /> Reload Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
