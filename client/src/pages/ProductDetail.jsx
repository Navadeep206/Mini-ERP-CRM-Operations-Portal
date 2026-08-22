import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, User, AlertCircle, Plus, Minus, Info, CheckCircle2 } from 'lucide-react';
import { productService } from '../services/product';
import { useAuth } from '../hooks/useAuth';

export default function ProductDetail() {
  const { id } = useParams();
  const { role } = useAuth();

  // Core Product Data
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  
  // UI/UX states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Forecasting States
  const [forecastData, setForecastData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [forecastStatus, setForecastStatus] = useState('LOADING');
  const [forecastModel, setForecastModel] = useState('');
  const [forecastHorizon, setForecastHorizon] = useState(4);

  // Stock Adjustment Form States
  const [adjustType, setAdjustType] = useState('IN'); // 'IN' or 'OUT'
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Pagination for movements
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 1. Fetch Product details and movements history
  const loadProductData = useCallback(async () => {
    try {
      const [details, hist] = await Promise.all([
        productService.getProduct(id),
        productService.getStockMovements(id, { page: currentPage, limit: 10 }),
      ]);
      setProduct(details);
      setMovements(hist || []);
      setTotalPages(hist.pagination?.totalPages || 1);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve product details and logs.');
    } finally {
      setIsLoading(false);
    }
  }, [id, currentPage]);

  const loadForecast = useCallback(async () => {
    setForecastStatus('LOADING');
    try {
      const res = await productService.getProductForecast(id, forecastHorizon);
      if (res.status === 'INSUFFICIENT_HISTORY') {
        setForecastStatus('INSUFFICIENT_HISTORY');
        setForecastData([]);
        setHistoryData([]);
      } else {
        setForecastData(res.forecast || []);
        setHistoryData(res.history || []);
        setForecastModel(res.model_type || 'Moving Average');
        setForecastStatus('FORECASTED');
      }
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setForecastStatus('ERROR');
    }
  }, [id, forecastHorizon]);

  useEffect(() => {
    loadProductData();
    loadForecast();
  }, [loadProductData, loadForecast]);

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (quantity <= 0) {
      setFormError('Quantity must be greater than zero');
      return;
    }
    if (!reason.trim()) {
      setFormError('Reason is required for inventory movements audit log');
      return;
    }

    if (adjustType === 'OUT' && quantity > product.currentStock) {
      setFormError(`Insufficient stock. Current stock is ${product.currentStock}, but attempting to remove ${quantity}.`);
      return;
    }

    // Open confirm dialog
    setShowConfirmModal(true);
  };

  const confirmAdjustment = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setFormError('');

    try {
      await productService.createStockMovement(id, {
        quantityChanged: Number(quantity),
        movementType: adjustType,
        reason: reason.trim(),
      });

      setSuccessMsg(`Successfully adjusted inventory by ${adjustType === 'IN' ? '+' : '-'}${quantity} units!`);
      setQuantity(1);
      setReason('');
      
      // Reload product info
      await loadProductData();
    } catch (err) {
      setFormError(err.message || 'Failed to submit stock adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <span>Loading product dossier file...</span>
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Product Record Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{errorMsg || 'The requested product profile does not exist.'}</p>
        <Link to="/products" className="btn" style={{ width: 'auto', margin: '0 auto' }}>
          Back to Catalog
        </Link>
      </div>
    );
  }

  const isWriteAllowed = ['ADMIN', 'WAREHOUSE'].includes(role);

  // Visual Stock Status badge helper
  const renderStatusBadge = (status) => {
    if (status === 'OUT_OF_STOCK') {
      return <span className="badge badge-danger">● OUT OF STOCK</span>;
    }
    if (status === 'LOW_STOCK') {
      return <span className="badge badge-warning">▲ LOW STOCK ALERT</span>;
    }
    return <span className="badge badge-success">✓ IN STOCK</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to="/products" 
            className="btn" 
            style={{ width: 'auto', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
            title="Back to Catalog"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{product.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>SKU Code: <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{product.sku}</strong></p>
          </div>
        </div>

        {isWriteAllowed && (
          <Link 
            to={`/products/${product.id}/edit`} 
            className="btn" 
            style={{ width: 'auto', marginTop: 0 }}
          >
            <Edit2 size={16} /> Edit Specs
          </Link>
        )}
      </div>

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        
        {/* Left Column (Stats & Metadata cards) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* General specs */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
              Specifications
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Category</span>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{product.category}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Valuation (Unit Price)</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--success)' }}>${product.unitPrice.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>Storage Location</span>
                <span style={{ fontSize: '1rem', fontWeight: 500 }}>{product.warehouseLocation}</span>
              </div>
            </div>
          </div>

          {/* Current Stock indicators */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
              Inventory Counts
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Units in Stock</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: product.currentStock <= product.minimumStock ? 'var(--danger)' : '#fff' }}>
                  {product.currentStock}
                </span>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Safety Margin</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {product.minimumStock}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>System Classification:</span>
              {renderStatusBadge(product.stockStatus)}
            </div>
          </div>
        </div>

        {/* Right Column (Adjustments Form & Movement logs) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stock adjustment form */}
          {isWriteAllowed && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
                Inventory Stock Adjustment
              </h3>

              {formError && (
                <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <AlertCircle size={16} /> <span>{formError}</span>
                </div>
              )}

              {successMsg && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', color: 'var(--success)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <CheckCircle2 size={16} /> <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* IN/OUT select button toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => { setAdjustType('IN'); setFormError(''); }}
                    style={{ 
                      marginTop: 0, 
                      backgroundColor: adjustType === 'IN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                      border: adjustType === 'IN' ? '1px solid var(--success)' : '1px solid var(--border-glass)',
                      color: adjustType === 'IN' ? 'var(--success)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Plus size={16} /> Stock IN
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => { setAdjustType('OUT'); setFormError(''); }}
                    style={{ 
                      marginTop: 0, 
                      backgroundColor: adjustType === 'OUT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                      border: adjustType === 'OUT' ? '1px solid var(--danger)' : '1px solid var(--border-glass)',
                      color: adjustType === 'OUT' ? 'var(--danger)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Minus size={16} /> Stock OUT
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="qty-adjust">Quantity *</label>
                    <input
                      id="qty-adjust"
                      type="number"
                      min="1"
                      className="form-input"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'var(--text-secondary)', paddingBottom: '10px' }}>
                    {adjustType === 'IN' ? (
                      <span>Expected final: <strong>{product.currentStock + quantity}</strong> units</span>
                    ) : (
                      <span>Expected remaining: <strong>{Math.max(0, product.currentStock - quantity)}</strong> units</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reason">Adjustment Reason *</label>
                  <input
                    id="reason"
                    type="text"
                    className="form-input"
                    placeholder="Enter adjustment reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn">
                  Log Stock Adjustment
                </button>
              </form>
            </div>
          )}

          {/* Audit History Logs */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', color: 'var(--accent-cyan)' }}>
              Stock Movement History
            </h3>

            {movements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <Info size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p>No historical inventory movements logged.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                  {movements.map((log) => (
                    <div 
                      key={log.id} 
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--border-glass)', 
                        borderRadius: 'var(--border-radius-md)', 
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`badge ${log.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                          {log.movementType === 'IN' ? `Stock IN: +${log.quantityChanged}` : `Stock OUT: -${log.quantityChanged}`}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '4px 0 2px' }}>
                        {log.reason}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px' }}>
                        <User size={10} /> By <strong>{log.creator?.name || 'System'}</strong> ({log.creator?.role || 'Operator'})
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem', marginTop: 0, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', opacity: currentPage === 1 ? 0.4 : 1 }}
                      >
                        Prev
                      </button>
                      <button
                        className="btn"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem', marginTop: 0, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', opacity: currentPage === totalPages ? 0.4 : 1 }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Demand Forecasting Dashboard Section */}
      <div className="glass-card" style={{ marginTop: '32px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} />
              <span>AI Product Demand Forecasting</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
              Time-series regressions aggregated on a weekly interval.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="horizon-select" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Horizon:</label>
              <select
                id="horizon-select"
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(parseInt(e.target.value, 10))}
                className="form-input"
                style={{ width: '100px', height: '32px', padding: '0 8px', fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-primary)', marginTop: 0 }}
              >
                <option value="2">2 Weeks</option>
                <option value="4">4 Weeks</option>
                <option value="8">8 Weeks</option>
                <option value="12">12 Weeks</option>
              </select>
            </div>
            {forecastStatus === 'FORECASTED' && (
              <span className="badge badge-info" style={{ textTransform: 'uppercase', padding: '4px 10px', fontSize: '0.7rem', height: 'fit-content' }}>
                Model: {forecastModel.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {forecastStatus === 'LOADING' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem' }}>Running predictive inferences...</span>
          </div>
        )}

        {forecastStatus === 'INSUFFICIENT_HISTORY' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 20px', backgroundColor: 'var(--warning-light)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--border-radius-md)' }}>
            <Info size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              This product does not have enough historical sales data to generate a reliable forecast (needs at least 4 weeks of sales records).
            </span>
          </div>
        )}

        {forecastStatus === 'ERROR' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 20px', backgroundColor: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--border-radius-md)' }}>
            <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Failed to connect to the forecasting engine.
            </span>
          </div>
        )}

        {forecastStatus === 'FORECASTED' && (() => {
          // Process chart dimensions
          const hist = historyData.slice(-8); // display last 8 weeks
          const fore = forecastData;
          const combined = [
            ...hist.map(d => ({ ...d, type: 'history' })),
            ...fore.map(d => ({ ...d, type: 'forecast' }))
          ];
          
          if (combined.length === 0) return null;

          const width = 600;
          const height = 220;
          const paddingLeft = 45;
          const paddingRight = 20;
          const paddingTop = 15;
          const paddingBottom = 35;

          const maxVal = Math.max(...combined.map(d => d.quantity), 10);
          
          // Map index to X coordinate
          const getX = (idx) => {
            const chartWidth = width - paddingLeft - paddingRight;
            return paddingLeft + (idx / (combined.length - 1)) * chartWidth;
          };

          // Map quantity to Y coordinate
          const getY = (val) => {
            const chartHeight = height - paddingTop - paddingBottom;
            return height - paddingBottom - (val / maxVal) * chartHeight;
          };

          // Generate paths
          let historyPoints = [];
          let forecastPoints = [];

          combined.forEach((pt, idx) => {
            const x = getX(idx);
            const y = getY(pt.quantity);
            if (pt.type === 'history') {
              historyPoints.push({ x, y, val: pt.quantity, date: pt.date });
            } else {
              // Connect last history point to first forecast point
              if (idx === hist.length) {
                const prev = combined[idx - 1];
                forecastPoints.push({ x: getX(idx - 1), y: getY(prev.quantity), val: prev.quantity, date: prev.date });
              }
              forecastPoints.push({ x, y, val: pt.quantity, date: pt.date });
            }
          });

          const createPath = (pts) => {
            if (pts.length === 0) return '';
            return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
          };

          const todayIdx = hist.length - 1;
          const todayX = getX(todayIdx);

          return (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
              {/* SVG Render */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: 'var(--border-radius-md)', padding: '16px' }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                    const y = getY(maxVal * ratio);
                    return (
                      <g key={ratio} style={{ opacity: 0.15 }}>
                        <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--text-secondary)" strokeWidth="1" />
                        <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-primary)" fontWeight="500">
                          {Math.round(maxVal * ratio)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dividers */}
                  <line x1={todayX} y1={paddingTop} x2={todayX} y2={height - paddingBottom} stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                  <text x={todayX} y={paddingTop - 4} textAnchor="middle" fontSize="9" fill="var(--primary)" fontWeight="600" opacity="0.8">TODAY</text>

                  {/* Lines */}
                  {historyPoints.length > 0 && (
                    <path d={createPath(historyPoints)} fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" />
                  )}
                  {forecastPoints.length > 0 && (
                    <path d={createPath(forecastPoints)} fill="none" stroke="var(--success)" strokeWidth="2.5" strokeDasharray="4 4" />
                  )}

                  {/* Points */}
                  {historyPoints.map((pt, idx) => (
                    <circle key={`h-${idx}`} cx={pt.x} cy={pt.y} r="4" fill="#0b0f19" stroke="var(--accent-cyan)" strokeWidth="2" />
                  ))}
                  {forecastPoints.slice(1).map((pt, idx) => (
                    <circle key={`f-${idx}`} cx={pt.x} cy={pt.y} r="4" fill="#0b0f19" stroke="var(--success)" strokeWidth="2" />
                  ))}

                  {/* Axis labels */}
                  {combined.map((pt, idx) => {
                    // Show labels selectively to avoid overlap
                    if (idx % 2 === 0 || idx === todayIdx || idx === combined.length - 1) {
                      const dateObj = new Date(pt.date);
                      const displayDate = `${dateObj.getUTCMonth() + 1}/${dateObj.getUTCDate()}`;
                      return (
                        <text key={idx} x={getX(idx)} y={height - paddingBottom + 16} textAnchor="middle" fontSize="9" fill="var(--text-secondary)" fontWeight="500">
                          {displayDate}
                        </text>
                      );
                    }
                    return null;
                  })}
                </svg>

                {/* Legend indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', backgroundColor: 'var(--accent-cyan)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Historical Demand</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '3px', borderTop: '2px dashed var(--success)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Forecast Predictions</span>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: 'var(--border-radius-md)', padding: '16px', flex: 1, overflowY: 'auto', maxHeight: '180px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '10px' }}>
                    Forecast Quantities (Weekly)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                    {fore.map((d, index) => {
                      const dateObj = new Date(d.date);
                      const dateString = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                      return (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Week starting {dateString}</span>
                          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{d.quantity} units</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '4px', alignItems: 'center', marginTop: '12px' }}>
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>Forecast generated at {new Date().toLocaleTimeString()}. Evaluates historic sales frequency patterns.</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Confirmation Dialog Overlay Modal (ACCESSIBLE) */}
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
          aria-labelledby="modal-title"
        >
          <div className="glass-card" style={{ maxWidth: '480px', width: '90%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div>
              <h4 id="modal-title" style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: adjustType === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                <AlertCircle size={20} />
                Confirm Stock Adjustment
              </h4>
            </div>

            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '12px', lineHeight: '1.5' }}>
              <p>
                Are you sure you want to log this inventory movement?
              </p>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>Operation: <strong style={{ color: adjustType === 'IN' ? 'var(--success)' : 'var(--danger)' }}>{adjustType === 'IN' ? 'ADD STOCK (IN)' : 'REMOVE STOCK (OUT)'}</strong></div>
                <div>Quantity: <strong>{quantity} units</strong></div>
                <div>Current Stock: <strong>{product.currentStock} units</strong></div>
                <div>Remaining Stock: <strong>{adjustType === 'IN' ? product.currentStock + quantity : product.currentStock - quantity} units</strong></div>
                <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Reason: <em style={{ color: 'var(--text-secondary)' }}>"{reason}"</em></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowConfirmModal(false)}
                style={{ width: 'auto', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={confirmAdjustment}
                style={{ 
                  width: 'auto', 
                  backgroundColor: adjustType === 'IN' ? 'var(--success)' : 'var(--danger)', 
                  border: 'none',
                  color: '#fff',
                  marginTop: 0 
                }}
              >
                Confirm Adjust
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
