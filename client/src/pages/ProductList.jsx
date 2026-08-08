import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Eye, Edit2, ChevronLeft, ChevronRight, AlertCircle, Package } from 'lucide-react';
import { productService } from '../services/product';
import { useAuth } from '../hooks/useAuth';

export default function ProductList() {
  const { role } = useAuth();

  // Data Catalog states
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Search & Filter states
  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');

  // Sorting states
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const debounceRef = useRef(null);

  // 1. Debounce Search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchVal);
      setCurrentPage(1);
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [searchVal]);

  // 2. Fetch Products Catalog
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await productService.getProducts({
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        category: categoryFilter,
        warehouseLocation: warehouseFilter,
        stockStatus: stockFilter,
        sortBy,
        sortOrder,
      });

      setProducts(data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve products inventory list.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, categoryFilter, warehouseFilter, stockFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const isWriteAllowed = ['ADMIN', 'WAREHOUSE'].includes(role);

  // Derived stock status visuals (Accessible with both unique color badges and text labels)
  const renderStockBadge = (current, min) => {
    if (current === 0) {
      return (
        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ● OUT OF STOCK
        </span>
      );
    }
    if (current <= min) {
      return (
        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ▲ LOW STOCK ({current}/{min})
        </span>
      );
    }
    return (
      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        ✓ IN STOCK
      </span>
    );
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Panel */}
      <div className="panel-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Product Catalog Directory</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor SKU metrics, unit prices, location storage warehouses, and safety thresholds.</p>
        </div>
        {isWriteAllowed && (
          <Link to="/products/new" className="btn" style={{ width: 'auto', marginTop: 0 }}>
            <Plus size={16} /> Add Product
          </Link>
        )}
      </div>

      {/* Search and Filters grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          alignItems: 'center'
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search name, SKU, category..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{ paddingLeft: '48px', width: '100%' }}
            aria-label="Search Products"
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }} htmlFor="cat-select">Category:</label>
          <select 
            id="cat-select"
            className="form-input" 
            value={categoryFilter} 
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="ALL">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Raw Materials">Raw Materials</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="Finished Goods">Finished Goods</option>
          </select>
        </div>

        {/* Warehouse Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }} htmlFor="wh-select">Warehouse:</label>
          <select 
            id="wh-select"
            className="form-input" 
            value={warehouseFilter} 
            onChange={(e) => { setWarehouseFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="ALL">All Locations</option>
            <option value="Warehouse-A">Warehouse-A</option>
            <option value="Warehouse-B">Warehouse-B</option>
            <option value="Warehouse-C">Warehouse-C</option>
          </select>
        </div>

        {/* Stock Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }} htmlFor="stock-select">Stock:</label>
          <select 
            id="stock-select"
            className="form-input" 
            value={stockFilter} 
            onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Errors view */}
      {errorMsg && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '16px', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main content table loader checks */}
      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <span>Loading product catalog...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="placeholder-view" style={{ padding: '60px 0' }}>
          <Package size={48} className="placeholder-icon" />
          <h3 className="placeholder-title">No Products Found</h3>
          <p className="placeholder-desc">No product records match your filter criteria. Try updating your criteria or create a new catalog record.</p>
        </div>
      ) : (
        <>
          {/* Scrollable Responsive Table */}
          <div style={{ overflowX: 'auto', width: '100%', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-glass)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                    Product {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleSort('sku')}>
                    SKU {sortBy === 'sku' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '16px 20px' }}>Category</th>
                  <th style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleSort('unitPrice')}>
                    Unit Price {sortBy === 'unitPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleSort('currentStock')}>
                    Stock {sortBy === 'currentStock' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '16px 20px' }}>Warehouse</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr 
                    key={p.id} 
                    style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.9rem' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{p.sku}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{p.category}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>${p.unitPrice.toFixed(2)}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontWeight: 600 }}>{p.currentStock}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                        (min: {p.minimumStock})
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{p.warehouseLocation}</td>
                    <td style={{ padding: '16px 20px' }}>{renderStockBadge(p.currentStock, p.minimumStock)}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Link 
                          to={`/products/${p.id}`} 
                          className="btn" 
                          style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
                          title="View History & Details"
                        >
                          <Eye size={14} />
                        </Link>
                        {isWriteAllowed && (
                          <Link 
                            to={`/products/${p.id}/edit`} 
                            className="btn" 
                            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#a78bfa', border: '1px solid rgba(79, 70, 229, 0.2)', marginTop: 0 }}
                            title="Edit specs"
                          >
                            <Edit2 size={14} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyBehavior: 'space-between', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {products.length} of {totalCount} records (Page {currentPage} of {totalPages})
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ width: 'auto', padding: '8px 12px', marginTop: 0, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ width: 'auto', padding: '8px 12px', marginTop: 0, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
