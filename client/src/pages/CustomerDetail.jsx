import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit2, 
  Plus, 
  Calendar, 
  User, 
  AlertCircle, 
  Clock, 
  Phone, 
  Mail, 
  MapPin
} from 'lucide-react';
import { customerService } from '../services/customer';
import { useAuth } from '../hooks/useAuth';

export default function CustomerDetail() {
  const { id } = useParams();
  const { role } = useAuth();

  // Data States
  const [customer, setCustomer] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  
  // UI/UX States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Add Follow-up Form States
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch Customer Detail and Follow-ups
  const loadDetails = useCallback(async () => {
    try {
      const data = await customerService.getCustomer(id);
      setCustomer(data);
      setFollowUps(data.followUps || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve customer log details.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // 2. Add Follow-up Handler
  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!note.trim()) {
      setFormError('Note text cannot be empty');
      return;
    }
    if (!followUpDate) {
      setFormError('Please select a scheduled follow-up date');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        note: note.trim(),
        followUpDate: new Date(followUpDate).toISOString(),
      };
      
      await customerService.createFollowUp(id, payload);
      
      setNote('');
      setFollowUpDate('');
      setSuccessMsg('Customer follow-up note logged successfully!');
      
      // Reload details to sync database state dynamically
      await loadDetails();
    } catch (err) {
      setFormError(err.message || 'Failed to record follow-up logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <span>Loading profile file logs...</span>
      </div>
    );
  }

  if (errorMsg || !customer) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Customer Record Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{errorMsg || 'The requested customer profile does not exist.'}</p>
        <Link to="/customers" className="btn" style={{ width: 'auto', margin: '0 auto' }}>
          Back to Directory
        </Link>
      </div>
    );
  }

  const isWriteAllowed = ['ADMIN', 'SALES'].includes(role);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Top action header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to="/customers" 
            className="btn" 
            style={{ width: 'auto', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
            title="Back to Directory"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
              {customer.name}
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{customer.customerType}</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>CRM Profile Details and Follow-up Log</p>
          </div>
        </div>

        {isWriteAllowed && (
          <Link 
            to={`/customers/${customer.id}/edit`} 
            className="btn" 
            style={{ width: 'auto', marginTop: 0 }}
          >
            <Edit2 size={16} /> Edit Profile
          </Link>
        )}
      </div>

      {/* Profile detail grid layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        
        {/* Left Side: General Profile card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
              General Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              {/* Business Name */}
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Business entity</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{customer.businessName}</span>
              </div>

              {/* GSTIN */}
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>GST Registration number</span>
                <span style={{ color: customer.gstNumber ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {customer.gstNumber || 'Not Registered'}
                </span>
              </div>

              {/* Contact numbers */}
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Contact Channels</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Phone size={14} /> {customer.mobile}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Mail size={14} /> {customer.email}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Billing Address</span>
                <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  {customer.address}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
              CRM Operations Meta
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              {/* Status */}
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Pipeline Status</span>
                <span style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {customer.status}
                </span>
              </div>

              {/* Next follow-up */}
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Next Scheduled Follow-up</span>
                {customer.followUpDate ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 500 }}>
                    <Calendar size={16} /> {new Date(customer.followUpDate).toLocaleDateString()}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No follow-up scheduled</span>
                )}
              </div>

              {/* Notes */}
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Operational Memo</span>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', backgroundColor: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  {customer.notes || 'No customer notes recorded.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Follow-up history list & form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Add follow up card */}
          {isWriteAllowed && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
                Add Follow-up Note
              </h3>

              {formError && (
                <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <AlertCircle size={16} /> <span>{formError}</span>
                </div>
              )}

              {successMsg && (
                <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleAddFollowUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="followUpDate">Schedule Next Date *</label>
                  <input
                    id="followUpDate"
                    type="date"
                    className="form-input"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="note">Interaction Notes *</label>
                  <textarea
                    id="note"
                    className="form-input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Discussed pricing adjustments, pending wholesale orders..."
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  disabled={isSubmitting}
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={16} /> {isSubmitting ? 'Logging note...' : 'Log Follow-up'}
                </button>
              </form>
            </div>
          )}

          {/* Follow-up logs list */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
              Follow-up History Logs
            </h3>

            {followUps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <Clock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p>No historical interactions recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {followUps.map((log) => (
                  <div 
                    key={log.id} 
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.01)', 
                      border: '1px solid var(--border-glass)', 
                      borderRadius: 'var(--border-radius-md)', 
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {/* Note Content */}
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {log.note}
                    </p>

                    {/* Metadata footer */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        flexWrap: 'wrap', 
                        gap: '12px', 
                        fontSize: '0.78rem', 
                        color: 'var(--text-secondary)',
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                        paddingTop: '8px',
                        marginTop: '4px'
                      }}
                    >
                      {/* Operator signature */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> by <strong>{log.creator?.name || 'Unknown'}</strong> ({log.creator?.role || 'Operator'})
                      </span>

                      {/* Created date */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Next date details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                      <Calendar size={12} /> Next Follow-up: <strong>{new Date(log.followUpDate).toLocaleDateString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
