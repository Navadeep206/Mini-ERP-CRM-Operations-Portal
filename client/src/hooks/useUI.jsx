import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, title: '', message: '', onConfirm: null });

  // 1. Toast triggers
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      setToast((prev) => (prev.message === message ? { ...prev, show: false } : prev));
    }, 4500);
  }, []);

  const dismissToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  // 2. Confirmation triggers
  const showConfirm = useCallback((title, message, onConfirm) => {
    setConfirm({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirm((prev) => ({ ...prev, show: false }));
      },
    });
  }, []);

  const dismissConfirm = useCallback(() => {
    setConfirm((prev) => ({ ...prev, show: false }));
  }, []);

  return (
    <UIContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Reusable Toast Alert Notification Box */}
      {toast.show && (
        <div 
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(59, 130, 246, 0.95)',
            color: '#fff',
            fontFamily: 'sans-serif',
            fontSize: '0.9rem',
            fontWeight: 600,
            maxWidth: '380px',
            animation: 'slideIn 0.3s ease-out'
          }}
          role="alert"
        >
          {toast.type === 'success' && <CheckCircle2 size={18} style={{ flexShrink: 0 }} />}
          {toast.type === 'error' && <AlertCircle size={18} style={{ flexShrink: 0 }} />}
          {toast.type === 'info' && <Info size={18} style={{ flexShrink: 0 }} />}
          <span style={{ flex: 1, lineHeight: '1.4' }}>{toast.message}</span>
          <button 
            onClick={dismissToast} 
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.8 }}
            aria-label="Dismiss Notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Reusable Confirmation Dialog Modal */}
      {confirm.show && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.75)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9998 
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <div 
            style={{ 
              backgroundColor: '#131a2c', 
              border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: '16px', 
              padding: '24px', 
              maxWidth: '440px', 
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            <h4 id="dialog-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={20} style={{ color: 'var(--warning)' }} />
              {confirm.title}
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              {confirm.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                onClick={dismissConfirm} 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  padding: '10px 16px', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirm.onConfirm} 
                style={{ 
                  backgroundColor: 'var(--primary)', 
                  border: 'none', 
                  borderRadius: '8px', 
                  padding: '10px 18px', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used inside a UIProvider');
  }
  return context;
}
