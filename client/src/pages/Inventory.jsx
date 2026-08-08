import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, Layers, Database, Eye, AlertCircle } from 'lucide-react';
import { productService } from '../services/product';

export default function Inventory() {
  // Statistics States
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUnits: 0,
    outOfStockProducts: 0,
    lowStockProducts: 0,
  });

  // Low stock catalog listing
  const [lowStockProducts, setLowStockProducts] = useState([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadInventoryDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [dashboardStats, lowStockData] = await Promise.all([
        productService.getInventoryStats(),
        productService.getLowStockProducts({ page: currentPage, limit: 8 }),
      ]);

      setStats(dashboardStats);
      setLowStockProducts(lowStockData || []);
      setTotalPages(lowStockData.pagination?.totalPages || 1);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to compile inventory metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadInventoryDashboard();
  }, [loadInventoryDashboard]);

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <span>Compiling inventory metrics dashboard...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Inventory Control Center</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Real-time summaries, warehouse capacities, and low-stock warning tables.</p>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '16px', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Aggregate Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* Total Products */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
            <Layers size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Total SKU Types</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalProducts}</span>
          </div>
        </div>

        {/* Total Units */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
            <Database size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Total Stock Units</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalUnits}</span>
          </div>
        </div>

        {/* Low Stock count */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Low Stock Items</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.lowStockProducts > 0 ? 'var(--warning)' : '#fff' }}>
              {stats.lowStockProducts}
            </span>
          </div>
        </div>

        {/* Out of Stock count */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
            <Package size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Out of Stock</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.outOfStockProducts > 0 ? 'var(--danger)' : '#fff' }}>
              {stats.outOfStockProducts}
            </span>
          </div>
        </div>

      </div>

      {/* Low-stock Table Section */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            Safety Threshold Warnings (Reorder Table)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            List of catalog SKUs whose stock count is equal to or below the minimum safety levels.
          </p>
        </div>

        {lowStockProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <CheckCircle2Icon />
            <p style={{ marginTop: '12px', fontWeight: 500 }}>All products are sufficiently stocked!</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', width: '100%', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-glass)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '14px 20px' }}>Product</th>
                    <th style={{ padding: '14px 20px' }}>SKU</th>
                    <th style={{ padding: '14px 20px' }}>Category</th>
                    <th style={{ padding: '14px 20px' }}>Current Stock</th>
                    <th style={{ padding: '14px 20px' }}>Safety Stock</th>
                    <th style={{ padding: '14px 20px' }}>Warehouse</th>
                    <th style={{ padding: '14px 20px' }}>Classification</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.9rem' }} className="table-row-hover">
                      <td style={{ padding: '14px 20px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{p.sku}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{p.category}</td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: p.currentStock === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                        {p.currentStock}
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{p.minimumStock}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>{p.warehouseLocation}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className={`badge ${p.classification === 'OUT_OF_STOCK' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                          {p.classification === 'OUT_OF_STOCK' ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <Link 
                          to={`/products/${p.id}`} 
                          className="btn" 
                          style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
                        >
                          <Eye size={14} /> Adjust
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  className="btn"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ width: 'auto', padding: '6px 12px', marginTop: 0, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  Prev
                </button>
                <button
                  className="btn"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{ width: 'auto', padding: '6px 12px', marginTop: 0, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', opacity: currentPage === totalPages ? 0.4 : 1 }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Icon helper
function CheckCircle2Icon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto', opacity: 0.8 }}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
