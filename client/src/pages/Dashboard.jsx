import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  FileSpreadsheet, 
  AlertTriangle, 
  Calendar,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  ClipboardList,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { dashboardService } from '../services/dashboard';
import { productService } from '../services/product';

export default function Dashboard() {
  const { user, role } = useAuth();
  const [data, setData] = useState(null);
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summary, riskSummary] = await Promise.all([
        dashboardService.getDashboardSummary(),
        productService.getBulkRisk(4).catch(err => {
          console.warn('Could not fetch bulk intelligence metrics, using offline fallback empty list:', err.message);
          return { results: [] };
        })
      ]);
      setData(summary);
      setRiskData(riskSummary?.results || []);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError(err.message || 'An error occurred while loading dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Skeleton Header */}
        <div style={{ width: '40%', height: '32px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '6px' }} className="skeleton" />
        <div style={{ width: '25%', height: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} className="skeleton" />
        
        {/* Skeleton Cards Grid */}
        <div className="dashboard-grid" style={{ marginTop: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card" style={{ height: '120px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)' }} className="skeleton" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ width: '60%', height: '14px', backgroundColor: 'rgba(255,255,255,0.05)' }} className="skeleton" />
                  <div style={{ width: '30%', height: '24px', backgroundColor: 'rgba(255,255,255,0.08)' }} className="skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }}>
          <div className="glass-card skeleton" style={{ height: '320px', backgroundColor: 'rgba(255,255,255,0.02)' }} />
          <div className="glass-card skeleton" style={{ height: '320px', backgroundColor: 'rgba(255,255,255,0.02)' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center', gap: '16px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Failed to Load Dashboard Data</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px' }}>{error}</p>
        <button 
          onClick={fetchSummary} 
          className="btn" 
          style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  const { metrics, recentCustomers, recentChallans, lowStockProducts, recentStockMovements, upcomingFollowUps } = data;

  const cardDefinitions = [
    {
      title: 'Total Customers',
      value: metrics.totalCustomers,
      icon: Users,
      color: '#4f46e5',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
      desc: 'Registered CRM accounts'
    },
    {
      title: 'Active Customers',
      value: metrics.activeCustomers,
      icon: UserCheck,
      color: '#10b981',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
      desc: 'Active business accounts'
    },
    {
      title: 'Total Products',
      value: metrics.totalProducts,
      icon: Package,
      color: '#06b6d4',
      roles: ['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'],
      desc: 'Items in catalog'
    },
    {
      title: 'Low Stock Products',
      value: metrics.lowStockProducts,
      icon: ShoppingCart,
      color: '#ef4444',
      roles: ['ADMIN', 'WAREHOUSE', 'ACCOUNTS'],
      desc: 'At/below safety thresholds'
    },
    {
      title: 'Draft Challans',
      value: metrics.draftChallans,
      icon: ClipboardList,
      color: '#f59e0b',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'],
      desc: 'Awaiting confirmation'
    },
    {
      title: 'Confirmed Challans',
      value: metrics.confirmedChallans,
      icon: FileSpreadsheet,
      color: '#8b5cf6',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'],
      desc: 'Inventory stock deducted'
    }
  ];

  // Filter metrics cards based on role
  const visibleCards = cardDefinitions.filter(card => card.roles.includes(role));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
          Welcome back, {user?.name || 'Operator'}
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Operational overview for role: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>{role}</span>
        </p>
      </div>

      {/* Summary metrics cards */}
      <div className="dashboard-grid">
        {visibleCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="glass-card stat-widget">
              <div className="stat-icon-wrapper" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">{card.title}</span>
                <span className="stat-value">{card.value}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Inventory Health Widget Row */}
      {['ADMIN', 'WAREHOUSE', 'ACCOUNTS'].includes(role) && riskData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>AI Inventory Risk Intelligence Overview</span>
          </h3>
          <div className="dashboard-grid" style={{ marginTop: 0 }}>
            <div className="glass-card stat-widget" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Critical Stockout Risks</span>
                <span className="stat-value" style={{ color: 'var(--danger)' }}>
                  {riskData.filter(r => r.riskLevel === 'CRITICAL').length}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Depletion expected in &lt;2w</span>
              </div>
            </div>

            <div className="glass-card stat-widget" style={{ borderColor: 'rgba(245, 158, 11, 0.25)' }}>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">High Depletion Risks</span>
                <span className="stat-value" style={{ color: 'var(--warning)' }}>
                  {riskData.filter(r => r.riskLevel === 'HIGH').length}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safety buffer breaches in &lt;2w</span>
              </div>
            </div>

            <div className="glass-card stat-widget" style={{ borderColor: 'rgba(6, 182, 212, 0.25)' }}>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                <ShoppingCart size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Medium Stock Breaches</span>
                <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                  {riskData.filter(r => r.riskLevel === 'MEDIUM').length}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safety breaches expected in &lt;4w</span>
              </div>
            </div>

            <div className="glass-card stat-widget" style={{ borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                <RefreshCw size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Suggested Reorder</span>
                <span className="stat-value" style={{ color: 'var(--success)' }}>
                  {riskData.reduce((sum, r) => sum + r.recommendedReorderQuantity, 0)} units
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required for forecast safety</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Activity Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }}>
        
        {/* Left Column Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Recent Challans List (Visible to all) */}
          {['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'].includes(role) && (
            <div className="glass-card">
              <div className="panel-header">
                <h3 className="panel-title">Recent Delivery Challans</h3>
                <Link to="/challans" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                  All Challans <ArrowRight size={14} />
                </Link>
              </div>

              {recentChallans.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No challans recorded.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px' }}>Challan No</th>
                        <th style={{ padding: '10px' }}>Customer</th>
                        <th style={{ padding: '10px' }}>Quantity</th>
                        <th style={{ padding: '10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentChallans.map((challan) => (
                        <tr key={challan.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '12px 10px' }}>
                            <Link to={`/challans/${challan.id}`} style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                              {challan.challanNumber}
                            </Link>
                          </td>
                          <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                            {challan.customer.name}
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            {challan.totalQuantity} items
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <span className={`badge badge-${challan.status === 'CONFIRMED' ? 'success' : challan.status === 'CANCELLED' ? 'danger' : 'warning'}`}>
                              {challan.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Follow-ups (ADMIN, SALES only) */}
          {['ADMIN', 'SALES'].includes(role) && (
            <div className="glass-card">
              <div className="panel-header">
                <h3 className="panel-title">Upcoming CRM Follow-ups</h3>
                <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} /> Schedule
                </span>
              </div>

              {upcomingFollowUps.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No pending follow-ups scheduled.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {upcomingFollowUps.map((customer) => (
                    <div key={customer.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                      <div>
                        <Link to={`/customers/${customer.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                          {customer.name}
                        </Link>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{customer.businessName}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 600, display: 'block' }}>
                          {new Date(customer.followUpDate).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scheduled call</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Customer CRM Activity (ADMIN, SALES, ACCOUNTS) */}
          {['ADMIN', 'SALES', 'ACCOUNTS'].includes(role) && (
            <div className="glass-card">
              <div className="panel-header">
                <h3 className="panel-title">Recent CRM Accounts Added</h3>
                <Link to="/customers" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                  All CRM <ArrowRight size={14} />
                </Link>
              </div>

              {recentCustomers.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No customer profiles found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentCustomers.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <div>
                        <Link to={`/customers/${c.id}`} style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {c.name}
                        </Link>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{c.businessName}</div>
                      </div>
                      <span className={`badge badge-${c.status === 'ACTIVE' ? 'success' : c.status === 'LEAD' ? 'info' : 'danger'}`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* AI Reorder Suggestions Insights (ADMIN, WAREHOUSE, ACCOUNTS only) */}
          {['ADMIN', 'WAREHOUSE', 'ACCOUNTS'].includes(role) && riskData.length > 0 && (
            <div className="glass-card" style={{ borderColor: 'rgba(6, 182, 212, 0.25)', background: 'linear-gradient(135deg, rgba(6,182,212,0.02) 0%, rgba(255,255,255,0.01) 100%)' }}>
              <div className="panel-header">
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
                  <Sparkles size={18} />
                  <span>AI Reorder Suggestions</span>
                </h3>
                <Link to="/inventory-intelligence" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                  Risk Panel <ArrowRight size={14} />
                </Link>
              </div>

              {riskData.filter(r => r.recommendedReorderQuantity > 0).length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--success)' }}>
                  All systems green. No reorders needed.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {riskData
                    .filter(r => r.recommendedReorderQuantity > 0)
                    .slice(0, 3)
                    .map((r, idx) => (
                      <div key={idx} style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <Link to={`/products/${r.productId}`} style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {r.productName}
                          </Link>
                          <span className={`badge badge-${r.riskLevel === 'CRITICAL' ? 'danger' : r.riskLevel === 'HIGH' ? 'warning' : 'info'}`} style={{ fontSize: '0.65rem' }}>
                            {r.riskLevel}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{r.explanation}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.02)', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Current stock: <strong>{r.currentStock}</strong></span>
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>Suggested: +{r.recommendedReorderQuantity}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Low Stock Product safety list (ADMIN, WAREHOUSE, ACCOUNTS only) */}
          {['ADMIN', 'WAREHOUSE', 'ACCOUNTS'].includes(role) && (
            <div className="glass-card">
              <div className="panel-header">
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                  Inventory Low-Stock Alerts
                </h3>
                <Link to="/inventory" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                  View Inventory <ArrowRight size={14} />
                </Link>
              </div>

              {lowStockProducts.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--success)' }}>
                  ✅ No low stock safety violations. All inventory counts safe.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {lowStockProducts.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', backgroundColor: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.12)', borderRadius: '10px' }}>
                      <div>
                        <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.name}
                        </Link>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          SKU: {p.sku} | Location: {p.warehouseLocation}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 700, display: 'block' }}>
                          {p.currentStock} / {p.minimumStock}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock Margin</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Stock movements audits logs (ADMIN, WAREHOUSE, ACCOUNTS only) */}
          {['ADMIN', 'WAREHOUSE', 'ACCOUNTS'].includes(role) && (
            <div className="glass-card">
              <div className="panel-header">
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} style={{ color: 'var(--accent-cyan)' }} />
                  Recent Stock Movements
                </h3>
              </div>

              {recentStockMovements.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No stock audits logs recorded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {recentStockMovements.map((move) => (
                    <div key={move.id} style={{ display: 'flex', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.01)' }}>
                      <div 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '6px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: move.movementType === 'IN' ? 'var(--success-light)' : 'var(--danger-light)',
                          color: move.movementType === 'IN' ? 'var(--success)' : 'var(--danger)'
                        }}
                      >
                        {move.movementType === 'IN' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {move.product.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Reason: {move.reason} | Audited by {move.creator.name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: move.movementType === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                          {move.movementType === 'IN' ? '+' : '-'}{move.quantityChanged}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(move.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
