import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, CheckCircle2, AlertCircle, Calendar, User, ShieldAlert } from 'lucide-react';
import { challanService } from '../services/challan';
import { useAuth } from '../hooks/useAuth';

export default function ChallanDetail() {
  const { id } = useParams();
  const { role } = useAuth();

  // Core Data States
  const [challan, setChallan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Confirm/Cancel action states
  const [actionType, setActionType] = useState(''); // 'CONFIRM' or 'CANCEL'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch Challan Details
  const loadChallanDetails = useCallback(async () => {
    try {
      const data = await challanService.getChallan(id);
      setChallan(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve challan details.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadChallanDetails();
  }, [loadChallanDetails]);

  // 2. Open confirmation trigger
  const handleActionTrigger = (type) => {
    setActionType(type);
    setActionError('');
    setSuccessMsg('');
    setShowConfirmModal(true);
  };

  // 3. Confirm trigger submit handler
  const executeChallanStateChange = async () => {
    setShowConfirmModal(false);
    setIsActionSubmitting(true);
    setActionError('');

    try {
      if (actionType === 'CONFIRM') {
        await challanService.confirmChallan(id);
        setSuccessMsg('Sales challan confirmed successfully! Inventory counts updated.');
      } else {
        await challanService.cancelChallan(id);
        setSuccessMsg('Draft challan successfully marked as CANCELLED.');
      }
      
      // Reload details to capture updated status
      await loadChallanDetails();
    } catch (err) {
      if (actionType === 'CONFIRM') {
        // Detailed stock validation error mapping
        setActionError(`Challan could not be confirmed because one or more products have insufficient stock. Details: ${err.message}`);
      } else {
        setActionError(err.message || 'Failed to cancel draft challan.');
      }
    } finally {
      setIsActionSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <span>Loading sales challan sheet...</span>
      </div>
    );
  }

  if (errorMsg || !challan) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Challan Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{errorMsg || 'The requested challan record does not exist.'}</p>
        <Link to="/challans" className="btn" style={{ width: 'auto', margin: '0 auto' }}>
          Back to Directory
        </Link>
      </div>
    );
  }

  const isWriteAllowed = ['ADMIN', 'SALES'].includes(role);
  const isDraft = challan.status === 'DRAFT';

  // Badge Class mapping
  const renderStatusBadge = (status) => {
    let cls = 'badge-info';
    if (status === 'CONFIRMED') cls = 'badge-success';
    if (status === 'CANCELLED') cls = 'badge-danger';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to="/challans" 
            className="btn" 
            style={{ width: 'auto', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
            title="Back to Directory"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
              Challan: {challan.challanNumber}
              {renderStatusBadge(challan.status)}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sales dispatch historical record log.</p>
          </div>
        </div>

        {/* Edit button (Draft mode ONLY) */}
        {isWriteAllowed && isDraft && (
          <Link 
            to={`/challans/${challan.id}/edit`} 
            className="btn" 
            style={{ width: 'auto', marginTop: 0 }}
          >
            <Edit2 size={16} /> Edit Draft
          </Link>
        )}
      </div>

      {/* Global Success / Action Errors Warnings Banners */}
      {successMsg && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', color: 'var(--success)', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {actionError && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px', lineHeight: '1.5' }}>
          <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Detail Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        
        {/* Left Side: General Profile Card & Customer specs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
              Challan Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Customer Account</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{challan.customer?.name}</span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {challan.customer?.businessName}
                </span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Contact Channels</span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div>Mobile: {challan.customer?.mobile}</div>
                  <div>Email: {challan.customer?.email}</div>
                  <div style={{ marginTop: '4px' }}>Address: {challan.customer?.address}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Created Date</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={12} /> {new Date(challan.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Operator Sign</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <User size={12} /> {challan.creator?.name || 'System'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow confirmations panels (Visible to SALES and ADMIN only in DRAFT status) */}
          {isWriteAllowed && isDraft && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px dashed var(--border-glass)', backgroundColor: 'rgba(34, 211, 238, 0.01)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Workflow Actions</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Transition this Draft record to confirm inventory dispatches or cancel billing requirements.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleActionTrigger('CONFIRM')}
                  disabled={isActionSubmitting}
                  style={{ flex: '1.5', marginTop: 0 }}
                >
                  Confirm dispatch
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleActionTrigger('CANCEL')}
                  disabled={isActionSubmitting}
                  style={{ flex: '1', marginTop: 0, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Snapshotted child items table */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
            Preserved Historical Line Items
          </h3>

          <div style={{ overflowX: 'auto', width: '100%', borderRadius: 'var(--border-radius-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 12px' }}>Product Snapshot</th>
                  <th style={{ padding: '8px 12px' }}>SKU</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {challan.items?.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '12px 12px', fontWeight: 600 }}>{item.productNameSnapshot}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{item.skuSnapshot}</td>
                    <td style={{ padding: '12px 12px', textAlign: 'right' }}>${item.unitPriceSnapshot.toFixed(2)}</td>
                    <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600 }}>
                      ${(item.quantity * item.unitPriceSnapshot).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Aggregated Quantity:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {challan.totalQuantity} units
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal dialog Overlay */}
      {showConfirmModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 999 
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="glass-card" style={{ maxWidth: '460px', width: '90%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div>
              <h4 id="confirm-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: actionType === 'CONFIRM' ? 'var(--success)' : 'var(--danger)' }}>
                <AlertCircle size={20} />
                {actionType === 'CONFIRM' ? 'Confirm Challan Dispatch?' : 'Cancel Draft Challan?'}
              </h4>
            </div>

            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
              {actionType === 'CONFIRM' ? (
                <p>
                  Confirming challan <strong>{challan.challanNumber}</strong> will immediately deduct stock counts from inventory and log outbound movement audits. This operation is non-reversible.
                </p>
              ) : (
                <p>
                  Are you sure you want to cancel draft challan <strong>{challan.challanNumber}</strong>? This will permanently disable editing and confirmation actions.
                </p>
              )}

              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '8px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                <div>Customer: <strong>{challan.customer?.name}</strong></div>
                <div>Total quantity to dispatch: <strong>{challan.totalQuantity} units</strong></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowConfirmModal(false)}
                style={{ width: 'auto', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn"
                onClick={executeChallanStateChange}
                style={{ 
                  width: 'auto', 
                  backgroundColor: actionType === 'CONFIRM' ? 'var(--success)' : 'var(--danger)', 
                  border: 'none',
                  color: '#fff',
                  marginTop: 0 
                }}
              >
                {actionType === 'CONFIRM' ? 'Deduct Stock & Confirm' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
