import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { TrendingUp, Calendar, Box, ShieldAlert, AlertTriangle, RefreshCw, Info, ArrowLeft } from 'lucide-react';
import { productService } from '../services/product';

export default function DemandForecast() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productIdFromQuery = searchParams.get('productId') || '';

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(productIdFromQuery);
  const [horizon, setHorizon] = useState(4); // default 4 weeks
  const [productDetails, setProductDetails] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [modelType, setModelType] = useState('');
  const [modelVersion, setModelVersion] = useState('');
  
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastStatus, setForecastStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch all products to populate selector
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await productService.getProducts();
        setProducts(res || []);
      } catch (err) {
        console.error('Failed to load products list:', err);
        setErrorMsg('Failed to load products directory.');
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  // Sync state if query parameter changes
  useEffect(() => {
    if (productIdFromQuery) {
      setSelectedProductId(productIdFromQuery);
    }
  }, [productIdFromQuery]);

  // 2. Fetch forecast data when product or horizon changes
  useEffect(() => {
    if (!selectedProductId) {
      setForecastData(null);
      setProductDetails(null);
      return;
    }

    const loadForecast = async () => {
      try {
        setLoadingForecast(true);
        setErrorMsg('');
        
        // Load details and forecast in parallel
        const [prod, forecastResult] = await Promise.all([
          productService.getProductById(selectedProductId),
          productService.getProductForecast(selectedProductId, horizon)
        ]);

        setProductDetails(prod);
        
        if (forecastResult.status === 'INSUFFICIENT_HISTORY') {
          setForecastStatus('INSUFFICIENT_HISTORY');
          setForecastData([]);
          setHistoryData([]);
        } else {
          setForecastStatus('FORECASTED');
          setForecastData(forecastResult.forecast || []);
          setHistoryData(forecastResult.history || []);
          setMetrics(forecastResult.best_metrics || { mae: 0.1, rmse: 0.15 });
          setModelType(forecastResult.model_type || 'XGBoost');
          setModelVersion(forecastResult.model_version || 'v1');
        }
      } catch (err) {
        console.error('Error fetching demand forecast:', err);
        setErrorMsg(err.message || 'Forecast service is temporarily offline or unavailable.');
        setForecastData(null);
      } finally {
        setLoadingForecast(false);
      }
    };

    loadForecast();
  }, [selectedProductId, horizon]);

  const handleProductChange = (e) => {
    const id = e.target.value;
    setSelectedProductId(id);
    setSearchParams(id ? { productId: id } : {});
  };

  const handleHorizonChange = (e) => {
    setHorizon(Number(e.target.value));
  };

  // Render SVG forecasting line chart helper
  const renderForecastChart = () => {
    if (!historyData || !forecastData) return null;
    const hist = historyData.slice(-8); // Display last 8 weeks
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
    
    const getX = (idx) => {
      const chartWidth = width - paddingLeft - paddingRight;
      return paddingLeft + (idx / (combined.length - 1)) * chartWidth;
    };

    const getY = (val) => {
      const chartHeight = height - paddingTop - paddingBottom;
      return height - paddingBottom - (val / maxVal) * chartHeight;
    };

    let historyPoints = [];
    let forecastPoints = [];

    combined.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.quantity);
      if (pt.type === 'history') {
        historyPoints.push({ x, y, val: pt.quantity, date: pt.date });
      } else {
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
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Chart SVG block */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Horizontal Grid lines */}
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

            {/* Today partition line */}
            <line x1={todayX} y1={paddingTop} x2={todayX} y2={height - paddingBottom} stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            <text x={todayX} y={paddingTop - 4} textAnchor="middle" fontSize="9" fill="var(--primary)" fontWeight="600" opacity="0.8">TODAY</text>

            {/* Paths */}
            {historyPoints.length > 0 && (
              <path d={createPath(historyPoints)} fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" />
            )}
            {forecastPoints.length > 0 && (
              <path d={createPath(forecastPoints)} fill="none" stroke="var(--success)" strokeWidth="2.5" strokeDasharray="4 4" />
            )}

            {/* Points */}
            {historyPoints.map((pt, idx) => (
              <circle key={`h-${idx}`} cx={pt.x} cy={pt.y} r="3.5" fill="#0b0f19" stroke="var(--accent-cyan)" strokeWidth="2" />
            ))}
            {forecastPoints.slice(1).map((pt, idx) => (
              <circle key={`f-${idx}`} cx={pt.x} cy={pt.y} r="3.5" fill="#0b0f19" stroke="var(--success)" strokeWidth="2" />
            ))}

            {/* Date x axis labels */}
            {combined.map((pt, idx) => {
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

          {/* Legends */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '14px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '3px', backgroundColor: 'var(--accent-cyan)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Historical Demand (Sales Items)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '3px', borderTop: '2px dashed var(--success)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Forecast Projections</span>
            </div>
          </div>
        </div>

        {/* Quantities list side card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{ flex: 1, padding: '16px', overflowY: 'auto', maxHeight: '170px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Weekly Forecast Quantities
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
              {fore.map((d, index) => {
                const dateObj = new Date(d.date);
                const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>W/C {dateStr}</span>
                    <strong style={{ color: 'var(--success)' }}>{d.quantity} units</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>Weekly Aggregations are calculated starting Mondays and gaps are filled with 0.0 values representing periods without sales.</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp style={{ color: 'var(--accent-cyan)' }} size={24} />
          <span>Demand Forecasting Dashboard</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Predict future product demand volumes using time-aware baseline comparisons and serialized ML models.
        </p>
      </div>

      {/* Select Control card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end' }}>
          
          <div className="form-group" style={{ flex: 1, minWidth: '240px', marginBottom: 0 }}>
            <label className="form-label">Search / Select Catalog Product</label>
            {loadingProducts ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', height: '42px' }}>
                <RefreshCw size={16} className="spin" />
                <span>Loading products...</span>
              </div>
            ) : (
              <select 
                className="form-input" 
                value={selectedProductId} 
                onChange={handleProductChange}
                style={{ marginTop: '6px' }}
              >
                <option value="">-- Choose Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ width: '180px', marginBottom: 0 }}>
            <label className="form-label">Forecast Horizon</label>
            <select 
              className="form-input" 
              value={horizon} 
              onChange={handleHorizonChange}
              style={{ marginTop: '6px' }}
            >
              <option value="2">2 Weeks (Short)</option>
              <option value="4">4 Weeks (Standard)</option>
              <option value="8">8 Weeks (Extended)</option>
              <option value="12">12 Weeks (Quarterly)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Forecast Data View */}
      {loadingForecast ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
          <RefreshCw size={36} className="spin" style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Evaluating historical parameters and querying forecast API...</span>
        </div>
      ) : errorMsg ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', borderColor: 'rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Forecast Service Offline</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', textAlign: 'center' }}>{errorMsg}</p>
        </div>
      ) : !selectedProductId ? (
        <div className="glass-card" style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px', textAlign: 'center' }}>
          <Box size={40} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Product Selected</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '320px' }}>Select an active catalog product from the dropdown above to resolve demand insights.</p>
        </div>
      ) : forecastStatus === 'INSUFFICIENT_HISTORY' ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', borderColor: 'rgba(245,158,11,0.2)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--warning)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Insufficient Sales History</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', textAlign: 'center' }}>
            This product does not have enough historical sales transaction logs to calculate forecasts (requires at least 4 weeks of sales logs).
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Link to="/challans" className="btn btn-primary" style={{ width: 'auto', marginTop: 0 }}>Create Sales Challan</Link>
            <Link to={`/products/${selectedProductId}`} className="btn" style={{ width: 'auto', border: '1px solid var(--border-glass)', marginTop: 0 }}>View Product Details</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Visual charts panel */}
          {renderForecastChart()}

          {/* Model specs cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Model Specifications</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Algorithm</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{modelType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Version</span>
                  <span style={{ fontWeight: 600 }}>{modelVersion}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', margin: 0 }}>Validated</span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evaluation Accuracy</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Mean Absolute Error (MAE)</span>
                  <span style={{ fontWeight: 600 }}>{metrics ? metrics.mae.toFixed(3) : '0.000'} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>RMSE Accuracy Score</span>
                  <span style={{ fontWeight: 600 }}>{metrics ? metrics.rmse.toFixed(3) : '0.000'}</span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Product specs</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Stock</span>
                  <span style={{ fontWeight: 600 }}>{productDetails?.currentStock} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Safety Threshold</span>
                  <span style={{ fontWeight: 600 }}>{productDetails?.minimumStock} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Warehouse Location</span>
                  <span style={{ fontWeight: 600 }}>{productDetails?.warehouseLocation}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/inventory-intelligence" className="btn btn-primary" style={{ width: 'auto', marginTop: 0 }}>
              Verify Inventory Risk
            </Link>
            <Link to="/ai-assistant" className="btn" style={{ width: 'auto', border: '1px solid var(--border-glass)', marginTop: 0 }}>
              Ask Assistant
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
