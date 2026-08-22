import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, RefreshCw, AlertTriangle, ArrowUpDown, Info, Eye, TrendingUp } from 'lucide-react';
import { productService } from '../services/product';

export default function InventoryIntelligence() {
  const [horizon, setHorizon] = useState(4); // default 4 weeks
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filters & Sorting state
  const [filterRisk, setFilterRisk] = useState('ALL'); // ALL, CRITICAL, HIGH, MEDIUM, LOW
  const [sortField, setSortField] = useState('riskLevel'); // name, currentStock, predictedDemand, projectedStock, recommendedReorderQuantity, riskLevel
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  const loadRiskAnalytics = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await productService.getBulkRisk(horizon);
      setRisks(data.results || []);
    } catch (err) {
      console.error('Failed to load inventory intelligence risk details:', err);
      setErrorMsg(err.message || 'Inventory risk API is temporarily unreachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiskAnalytics();
  }, [horizon]);

  // Sorting helper logic
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Maps risk level values to ordering weights
  const getRiskWeight = (level) => {
    switch (level) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  };

  // Perform filtration
  const filteredRisks = risks.filter(r => {
    if (filterRisk === 'ALL') return true;
    return r.riskLevel === filterRisk;
  });

  // Perform sorting
  const sortedRisks = [...filteredRisks].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'riskLevel') {
      valA = getRiskWeight(a.riskLevel);
      valB = getRiskWeight(b.riskLevel);
    }

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const riskFilters = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const getRiskBadgeClass = (level) => {
    switch (level) {
      case 'CRITICAL': return 'badge-danger';
      case 'HIGH': return 'badge-warning';
      case 'MEDIUM': return 'badge-info';
      case 'LOW': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert style={{ color: 'var(--accent-cyan)' }} size={24} />
            <span>Inventory Risk Intelligence</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Time-series risk evaluations correlating current stock margins with upcoming weekly demand forecasts.
          </p>
        </div>

        {/* Horizon selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Forecast window:</label>
          <select 
            className="form-input" 
            value={horizon} 
            onChange={(e) => setHorizon(Number(e.target.value))}
            style={{ width: '130px', marginTop: 0 }}
          >
            <option value="2">2 Weeks</option>
            <option value="4">4 Weeks</option>
            <option value="8">8 Weeks</option>
            <option value="12">12 Weeks</option>
          </select>
        </div>
      </div>

      {/* Filter tab buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px' }}>
        {riskFilters.map(filter => (
          <button
            key={filter}
            type="button"
            className="btn"
            onClick={() => setFilterRisk(filter)}
            style={{
              marginTop: 0,
              padding: '6px 16px',
              fontSize: '0.8rem',
              backgroundColor: filterRisk === filter ? 'var(--primary)' : 'rgba(255,255,255,0.01)',
              border: filterRisk === filter ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
              color: filterRisk === filter ? '#fff' : 'var(--text-secondary)',
              borderRadius: '20px'
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Risk table data block */}
      {loading ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
          <RefreshCw size={36} className="spin" style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Aggregating catalog histories and forecasting risk metrics...</span>
        </div>
      ) : errorMsg ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Risk Engine Offline</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{errorMsg}</p>
          <button onClick={loadRiskAnalytics} className="btn btn-primary" style={{ width: 'auto', marginTop: '12px' }}>
            Retry Analytics
          </button>
        </div>
      ) : sortedRisks.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <ShieldAlert size={40} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No items found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No catalog items found matching risk filter: {filterRisk}</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => handleSort('productName')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Product Name <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => handleSort('currentStock')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Current Stock <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => handleSort('predictedDemand')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Forecast Demand <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => handleSort('projectedStock')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Projected Stock <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => handleSort('riskLevel')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Risk Level <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 10px', cursor: 'pointer' }} onClick={() => handleSort('recommendedReorderQuantity')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Suggested Reorder <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRisks.map((r, idx) => (
                  <tr 
                    key={idx} 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      backgroundColor: r.riskLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.01)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '14px 10px' }}>
                      <Link to={`/products/${r.productId}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.productName}
                      </Link>
                      {r.status === 'INSUFFICIENT_HISTORY' && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Insufficient Sales History
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      <strong style={{ color: r.currentStock <= r.minimumStock ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {r.currentStock}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}> / {r.minimumStock} min</span>
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      {r.status === 'INSUFFICIENT_HISTORY' ? '-' : `${r.predictedDemand} units`}
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      {r.status === 'INSUFFICIENT_HISTORY' ? (
                        '-'
                      ) : (
                        <strong style={{ color: r.projectedStock <= 0 ? 'var(--danger)' : r.projectedStock < r.minimumStock ? 'var(--warning)' : 'var(--success)' }}>
                          {r.projectedStock} units
                        </strong>
                      )}
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      <span className={`badge ${getRiskBadgeClass(r.riskLevel)}`} style={{ fontSize: '0.72rem' }}>
                        {r.riskLevel}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px' }}>
                      {r.recommendedReorderQuantity > 0 ? (
                        <strong style={{ color: 'var(--success)' }}>+{r.recommendedReorderQuantity} units</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0 (Fulfill)</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Link 
                          to={`/products/${r.productId}`} 
                          className="btn" 
                          style={{ margin: 0, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', border: '1px solid var(--border-glass)' }}
                          title="View product details"
                        >
                          <Eye size={12} />
                          <span>Specs</span>
                        </Link>
                        {r.status !== 'INSUFFICIENT_HISTORY' && (
                          <Link 
                            to={`/demand-forecast?productId=${r.productId}`} 
                            className="btn" 
                            style={{ margin: 0, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', border: '1px solid var(--border-glass)' }}
                            title="View demand forecast charts"
                          >
                            <TrendingUp size={12} />
                            <span>Forecast</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '12px' }}>
            <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>Risk calculations are updated dynamically. Click table headers to sort fields. Double check current physical inventory balances before filing external vendor reorders.</span>
          </div>
        </div>
      )}
    </div>
  );
}
