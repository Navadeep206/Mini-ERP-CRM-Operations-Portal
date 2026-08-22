import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw, 
  HelpCircle, 
  AlertTriangle, 
  Database,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { uploadFileHelper, requestHelper } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const STEPS = {
  SETUP: 1,
  MAPPING: 2,
  PREVIEW: 3,
  COMPLETE: 4,
};

export default function ImportPortal() {
  const { role } = useAuth();
  
  // State variables
  const [currentStep, setCurrentStep] = useState(STEPS.SETUP);
  const [entity, setEntity] = useState('PRODUCTS');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Analysis results from server
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Manual adjustments for header mapping
  const [mappings, setMappings] = useState({});
  const [availableHeaders, setAvailableHeaders] = useState([]);

  // Final ingestion result from server
  const [ingestResult, setIngestResult] = useState(null);

  // Field structures mapping configuration
  const productFields = [
    { key: 'name', label: 'Product Name', required: true, desc: 'E.g. UltraWide 34" Monitor' },
    { key: 'sku', label: 'SKU Code', required: true, desc: 'Unique SKU string identifier' },
    { key: 'category', label: 'Category', required: true, desc: 'Item category group classification' },
    { key: 'unitPrice', label: 'Unit Price', required: true, desc: 'Non-negative selling price numeric value' },
    { key: 'currentStock', label: 'Current Stock', required: false, desc: 'Integer stock count (default: 0)' },
    { key: 'minimumStock', label: 'Minimum Stock', required: false, desc: 'Low-stock safety threshold' },
    { key: 'warehouseLocation', label: 'Warehouse Location', required: true, desc: 'Storage zone aisle/shelf identifier' },
  ];

  const userFields = [
    { key: 'name', label: 'Name', required: true, desc: 'Full user employee name' },
    { key: 'email', label: 'Email Address', required: true, desc: 'Unique staff email address' },
    { key: 'role', label: 'User Role', required: true, desc: 'Must be: ADMIN, SALES, WAREHOUSE, ACCOUNTS' },
  ];

  const activeFields = entity === 'PRODUCTS' ? productFields : userFields;

  // Handle Drag & Drop Events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMsg('');
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setErrorMsg('Unsupported file format. Please upload a valid Microsoft Excel file (.xlsx, .xls)');
      return;
    }
    setFile(selectedFile);
  };

  // Step 1: Submit File for Backend Analysis
  const handleAnalyzeFile = async () => {
    if (!file) {
      setErrorMsg('Please select a file to import');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity', entity);

      const result = await uploadFileHelper(`/api/import/analyze`, formData);
      setAnalysisResult(result);
      setMappings(result.mappings || {});
      
      // Determine headers extracted from file
      const headers = Object.values(result.mappings || {});
      // Include any other spreadsheet keys returned in rows
      if (result.rows && result.rows.length > 0) {
        const firstRowData = result.rows[0].data;
        // Merge mapped ones and unmapped headers if any
        setAvailableHeaders(Object.keys(firstRowData).map(k => result.mappings[k] || k));
      } else {
        setAvailableHeaders(headers);
      }
      
      setCurrentStep(STEPS.MAPPING);
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred during Excel validation parsing');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm Headers mappings mapping
  const handleConfirmMapping = () => {
    // Validate that all required fields are mapped
    const missingFields = activeFields
      .filter(f => f.required && !mappings[f.key])
      .map(f => f.label);

    if (missingFields.length > 0) {
      setErrorMsg(`Required fields mapping is missing: ${missingFields.join(', ')}`);
      return;
    }

    setErrorMsg('');
    setCurrentStep(STEPS.PREVIEW);
  };

  // Step 3: Run final bulk transactional ingestion
  const handleConfirmImport = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Gather only valid rows for database loading
      const validRows = analysisResult.rows
        .filter(r => r.status !== 'INVALID')
        .map(r => r.data);

      if (validRows.length === 0) {
        throw new Error('No valid records are available to import. Please check validation errors.');
      }

      const payload = {
        entity,
        rows: validRows,
      };

      const result = await requestHelper(`/api/import/confirm`, 'POST', payload);
      setIngestResult(result);
      setCurrentStep(STEPS.COMPLETE);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete transactional bulk import');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset import flow state
  const handleResetFlow = () => {
    setFile(null);
    setAnalysisResult(null);
    setMappings({});
    setIngestResult(null);
    setErrorMsg('');
    setCurrentStep(STEPS.SETUP);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. Header Step Tracker Progress Indicator */}
      <div className="glass-card" style={{ padding: '20px 30px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} className="text-cyan" />
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>AI Intelligent Import Pipeline</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {[
            { step: STEPS.SETUP, label: 'Upload Sheet' },
            { step: STEPS.MAPPING, label: 'Column Mapping' },
            { step: STEPS.PREVIEW, label: 'Preview Validation' },
            { step: STEPS.COMPLETE, label: 'Completed' },
          ].map((s, idx) => (
            <React.Fragment key={s.step}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: currentStep === s.step ? 'var(--primary)' : currentStep > s.step ? 'var(--success-light)' : 'var(--bg-primary)',
                  color: currentStep === s.step ? '#fff' : currentStep > s.step ? 'var(--success)' : 'var(--text-secondary)',
                  border: currentStep === s.step ? 'none' : '1px solid var(--border-glass)',
                }}>
                  {currentStep > s.step ? '✓' : s.step}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: currentStep === s.step ? 600 : 400, color: currentStep === s.step ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {s.label}
                </span>
              </div>
              {idx < 3 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 20px', backgroundColor: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--border-radius-md)' }}>
          <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{errorMsg}</span>
        </div>
      )}

      {/* 2. Step Views */}
      
      {/* STEP 1: SETUP SHEET */}
      {currentStep === STEPS.SETUP && (
        <div className="grid grid-cols-3" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          
          {/* Config column */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Import Entity Config
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>What entity are you importing?</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setEntity('PRODUCTS')}
                  className={`btn ${entity === 'PRODUCTS' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Products Catalog
                </button>
                {role === 'ADMIN' && (
                  <button
                    onClick={() => setEntity('USERS')}
                    className={`btn ${entity === 'USERS' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px' }}
                  >
                    User Accounts
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '10px' }}>Expected columns in Excel:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeFields.map(f => (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-glass)' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.label}</span>
                      {f.required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{f.key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upload card */}
          <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-glass)'}`,
                borderRadius: 'var(--border-radius-lg)',
                backgroundColor: dragActive ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-primary)',
                width: '100%',
                padding: '50px 30px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
            >
              <input
                type="file"
                id="excel-file-upload"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="excel-file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Upload size={48} className="text-cyan" style={{ marginBottom: '16px', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>
                  {file ? file.name : 'Select or drag your spreadsheet here'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Supports Microsoft Excel formats (.xlsx, .xls) up to 5MB
                </p>
                <div className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: '0.85rem' }}>
                  Choose Local File
                </div>
              </label>
            </div>

            {file && (
              <button
                onClick={handleAnalyzeFile}
                disabled={isLoading}
                className="btn btn-primary"
                style={{ marginTop: '24px', padding: '12px 36px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Analyzing File...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze Structures</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: SCHEMA MAPPING */}
      {currentStep === STEPS.MAPPING && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Map Column Headers</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Nexus ERP auto-detects columns using fuzzy mapping. Match any remaining unmapped database fields to spreadsheet column headers.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span>DATABASE FIELD</span>
              <span>EXCEL COLUMN HEADER</span>
              <span>MAPPING CONFIDENCE</span>
            </div>

            {activeFields.map(f => {
              const currentMappedValue = mappings[f.key] || '';
              const isMapped = !!currentMappedValue;
              
              return (
                <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-glass)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.label}</span>
                    {f.required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{f.desc}</div>
                  </div>
                  
                  <div>
                    <select
                      value={currentMappedValue}
                      onChange={(e) => setMappings({ ...mappings, [f.key]: e.target.value })}
                      className="form-input"
                      style={{ width: '100%', height: '40px', padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-primary)' }}
                    >
                      <option value="">-- Click to select column --</option>
                      {availableHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    {isMapped ? (
                      <span className="badge badge-success" style={{ display: 'flex', width: 'fit-content', gap: '4px', alignItems: 'center', fontSize: '0.75rem', padding: '4px 10px', backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                        <CheckCircle size={12} />
                        <span>Mapped</span>
                      </span>
                    ) : f.required ? (
                      <span className="badge badge-danger" style={{ display: 'flex', width: 'fit-content', gap: '4px', alignItems: 'center', fontSize: '0.75rem', padding: '4px 10px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                        <AlertCircle size={12} />
                        <span>Required</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Optional</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={handleResetFlow} className="btn btn-secondary">
              Back to Upload
            </button>
            <button onClick={handleConfirmMapping} className="btn btn-primary" style={{ padding: '12px 36px' }}>
              Confirm Mapping
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & DUPLICATES CHECK */}
      {currentStep === STEPS.PREVIEW && analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Summary Stats Panel */}
          <div className="grid grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Total Rows', val: analysisResult.summary.totalRows, color: 'var(--primary)' },
              { label: 'Valid Records', val: analysisResult.summary.valid, color: 'var(--success)' },
              { label: 'Invalid Records', val: analysisResult.summary.invalid, color: 'var(--danger)' },
              { label: 'Fuzzy Duplicates', val: analysisResult.summary.duplicates, color: 'var(--warning)' },
            ].map(stat => (
              <div key={stat.label} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: stat.color, marginBottom: '4px' }}>
                  {stat.val}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Detailed Row List */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Data Validation Audit Preview</h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '12px' }}>ROW</th>
                    <th style={{ padding: '12px' }}>STATUS</th>
                    <th style={{ padding: '12px' }}>DETAILS / VALUES</th>
                    <th style={{ padding: '12px' }}>ERRORS / DUPLICATE REASONS</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult.rows.map((rowObj) => {
                    const statusColors = {
                      VALID: { text: 'var(--success)', bg: 'var(--success-light)' },
                      INVALID: { text: 'var(--danger)', bg: 'var(--danger-light)' },
                      DUPLICATE: { text: 'var(--warning)', bg: 'var(--warning-light)' },
                    };

                    const col = statusColors[rowObj.status] || { text: 'var(--text-secondary)', bg: 'var(--bg-primary)' };

                    return (
                      <tr key={rowObj.rowNumber} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{rowObj.rowNumber}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 'var(--border-radius-sm)',
                            backgroundColor: col.bg,
                            color: col.text,
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}>
                            {rowObj.status}
                          </span>
                        </td>
                        
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '400px' }}>
                            {entity === 'PRODUCTS' ? (
                              <>
                                <span style={{ fontWeight: 600 }}>{rowObj.data.name || 'N/A'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  SKU: {rowObj.data.sku} | Price: ${rowObj.data.unitPrice} | Stock: {rowObj.data.currentStock}
                                </span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontWeight: 600 }}>{rowObj.data.name || 'N/A'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  Email: {rowObj.data.email} | Role: {rowObj.data.role}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '12px' }}>
                          {rowObj.status === 'INVALID' && rowObj.errors && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--danger)' }}>
                              {rowObj.errors.map((err, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                  <AlertCircle size={12} />
                                  <span>{err.field}: {err.message} (value: {err.value === undefined ? 'null' : String(err.value)})</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {rowObj.status === 'DUPLICATE' && rowObj.duplicateDetails && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--warning)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                <AlertTriangle size={12} />
                                <span>{rowObj.duplicateDetails.reason}</span>
                              </div>
                              {rowObj.duplicateDetails.existingRecord && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  Conflicted ID: {rowObj.duplicateDetails.existingRecord.id}
                                </span>
                              )}
                            </div>
                          )}

                          {rowObj.status === 'VALID' && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No issues detected. Will be added as a new record.</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setCurrentStep(STEPS.MAPPING)} className="btn btn-secondary">
                Back to Mapping
              </button>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Only valid and duplicate rows will be written. Invalid rows will be skipped.
                </span>
                <button
                  onClick={handleConfirmImport}
                  disabled={isLoading || analysisResult.summary.valid === 0 && analysisResult.summary.duplicates === 0}
                  className="btn btn-primary"
                  style={{ padding: '12px 36px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={18} className="spin" />
                      <span>Ingesting data...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={18} />
                      <span>Confirm & Ingest Batch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: INGESTION COMPLETE */}
      {currentStep === STEPS.COMPLETE && ingestResult && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: '24px' }} />
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>
            Data Import Complete!
          </h2>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px' }}>
            The spreadsheet batch was safely processed and written to the database under transactional safety bounds.
          </p>

          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '24px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-glass)', marginBottom: '32px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              Import Summary Stats
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Successfully Imported:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{ingestResult.imported}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Skipped Duplicates:</span>
                <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{ingestResult.skipped}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Errors Skipped:</span>
                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{ingestResult.errors}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', fontWeight: 600 }}>
                <span>Total Rows Handled:</span>
                <span>{ingestResult.total}</span>
              </div>
            </div>
          </div>

          <button onClick={handleResetFlow} className="btn btn-primary" style={{ padding: '12px 36px' }}>
            Start New Import
          </button>
        </div>
      )}

    </div>
  );
}
