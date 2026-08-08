import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { customerService } from '../services/customer';

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Form Field States
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [customerType, setCustomerType] = useState('RETAIL');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('LEAD');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  // UI/UX States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // 1. Fetch existing profile for Edit Mode
  useEffect(() => {
    if (!isEditMode) return;

    const loadCustomer = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const customer = await customerService.getCustomer(id);
        setName(customer.name || '');
        setMobile(customer.mobile || '');
        setEmail(customer.email || '');
        setBusinessName(customer.businessName || '');
        setGstNumber(customer.gstNumber || '');
        setCustomerType(customer.customerType || 'RETAIL');
        setAddress(customer.address || '');
        setStatus(customer.status || 'LEAD');
        setNotes(customer.notes || '');
        
        if (customer.followUpDate) {
          // Format date string as YYYY-MM-DD for date input
          const d = new Date(customer.followUpDate);
          const formatted = d.toISOString().split('T')[0];
          setFollowUpDate(formatted);
        }
      } catch {
        setErrorMsg('Failed to load customer profile details.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomer();
  }, [id, isEditMode]);

  // 2. Validate Inputs
  const validateForm = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Customer name is required';
    if (!mobile.trim()) errors.mobile = 'Mobile number is required';
    
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email address format';
    }

    if (!businessName.trim()) errors.businessName = 'Business name is required';
    if (!address.trim()) errors.address = 'Billing/shipping address is required';
    
    if (gstNumber && gstNumber.trim().length !== 15) {
      errors.gstNumber = 'GSTIN must be exactly 15 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 3. Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setErrorMsg('');

    const payload = {
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      businessName: businessName.trim(),
      gstNumber: gstNumber.trim() || null,
      customerType,
      address: address.trim(),
      status,
      followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
      notes: notes.trim() || null,
    };

    try {
      if (isEditMode) {
        await customerService.updateCustomer(id, payload);
      } else {
        await customerService.createCustomer(payload);
      }
      navigate('/customers');
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const errorsMap = {};
        err.errors.forEach((e) => {
          const fieldKey = e.field.split('.').pop();
          errorsMap[fieldKey] = e.message;
        });
        setFieldErrors(errorsMap);
        setErrorMsg('Validation checks failed. Please inspect input properties below.');
      } else {
        setErrorMsg(err.message || 'Error occurred while saving customer record.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <span>Loading customer details...</span>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header Row */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid var(--border-glass)', 
          paddingBottom: '20px',
          marginBottom: '32px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to="/customers" 
            className="btn" 
            style={{ width: 'auto', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
            title="Back to Directory"
          >
            <ArrowLeft size={16} />
          </Link>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {isEditMode ? 'Edit Customer Profile' : 'Register New Customer'}
          </h2>
        </div>
      </div>

      {/* Global Errors */}
      {errorMsg && (
        <div 
          style={{ 
            backgroundColor: 'var(--danger-light)', 
            color: 'var(--danger)', 
            padding: '16px', 
            borderRadius: 'var(--border-radius-md)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '24px' 
          }}
        >
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Left Column (Contact Info) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Contact Details</h3>
            
            {/* Customer Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="name">Customer Name *</label>
              <input
                id="name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={isSaving}
                aria-required="true"
              />
              {fieldErrors.name && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.name}</span>}
            </div>

            {/* Mobile */}
            <div className="form-group">
              <label className="form-label" htmlFor="mobile">Mobile Number *</label>
              <input
                id="mobile"
                type="text"
                className="form-input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+1 555-0199"
                disabled={isSaving}
                aria-required="true"
              />
              {fieldErrors.mobile && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.mobile}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@email.com"
                disabled={isSaving}
                aria-required="true"
              />
              {fieldErrors.email && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.email}</span>}
            </div>
          </div>

          {/* Right Column (Company Info) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Business Details</h3>

            {/* Business Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="business">Business Name *</label>
              <input
                id="business"
                type="text"
                className="form-input"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Global Inc."
                disabled={isSaving}
                aria-required="true"
              />
              {fieldErrors.businessName && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.businessName}</span>}
            </div>

            {/* GST Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="gst">GST Number (Optional)</label>
              <input
                id="gst"
                type="text"
                className="form-input"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="15-character GSTIN"
                disabled={isSaving}
              />
              {fieldErrors.gstNumber && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.gstNumber}</span>}
            </div>

            {/* Customer Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="type">Customer Type *</label>
              <select
                id="type"
                className="form-input"
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                disabled={isSaving}
              >
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Full-width Fields (Address and CRM Params) */}
        <hr style={{ borderColor: 'var(--border-glass)' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Operational Parameters</h3>

          {/* Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="address">Billing & Delivery Address *</label>
            <textarea
              id="address"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full street location details..."
              style={{ minHeight: '80px', resize: 'vertical' }}
              disabled={isSaving}
              aria-required="true"
            />
            {fieldErrors.address && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.address}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {/* Status */}
            <div className="form-group">
              <label className="form-label" htmlFor="status">CRM Status *</label>
              <select
                id="status"
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSaving}
              >
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Next Follow-up Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="followup">Scheduled Follow-up Date</label>
              <input
                id="followup"
                type="date"
                className="form-input"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Initial/Update Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="notes">Operational Notes</label>
            <textarea
              id="notes"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pre-sales interactions, scheduling logs, specific customer requirements..."
              style={{ minHeight: '80px', resize: 'vertical' }}
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Submission Actions */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '16px',
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '24px',
            marginTop: '12px' 
          }}
        >
          <Link 
            to="/customers" 
            className="btn" 
            style={{ width: 'auto', backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid var(--border-glass)', marginTop: 0 }}
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            className="btn" 
            disabled={isSaving}
            style={{ width: 'auto', marginTop: 0 }}
          >
            <Save size={16} /> {isSaving ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
