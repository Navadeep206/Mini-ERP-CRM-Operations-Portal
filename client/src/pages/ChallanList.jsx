import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Eye, Edit2, ChevronLeft, ChevronRight, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { challanService } from '../services/challan';
import { useAuth } from '../hooks/useAuth';

export default function ChallanList() {
  const { role } = useAuth();

  // Data states
  const [challans, setChallans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Search & Filters
  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
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

  // 2. Fetch Challans
  const loadChallans = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await challanService.getChallans({
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter,
      });

      setChallans(data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve sales challan directory.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadChallans();
  }, [loadChallans]);

  const isWriteAllowed = ['ADMIN', 'SALES'].includes(role);

  // Accessible Status Badge helper
  const renderStatusBadge = (status) => {
    let cls = 'badge-info';
    if (status === 'CONFIRMED') cls = 'badge-success';
    if (status === 'CANCELLED') cls = 'badge-danger';
    return (
      <span className={`badge ${cls}`} style={{ fontWeight: 600 }}>
        {status}
      </span>
    );
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Panel */}
      <div className="panel-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Sales Challan Directory</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Track billing drafts, confirmed dispatches, and inventory logs.</p>
        </div>
        {isWriteAllowed && (
          <Link to="/challans/new" className="btn" style={{ width: 'auto', marginTop: 0 }}>
            <Plus size={16} /> New Challan
          </Link>
        )}
      </div>

      {/* Filters Control Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search number, customer name, business..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{ paddingLeft: '48px', width: '100%' }}
            aria-label="Search Challans"
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }} htmlFor="status-select">Status:</label>
          <select 
            id="status-select"
            className="form-input" 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Drafts</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error triggers */}
      {errorMsg && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '16px', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table grid loading checks */}
      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <span>Loading sales challan catalog...</span>
        </div>
      ) : challans.length === 0 ? (
        <div className="placeholder-view" style={{ padding: '60px 0' }}>
          <FileSpreadsheet size={48} className="placeholder-icon" />
          <h3 className="placeholder-title">No Challans Recorded</h3>
          <p className="placeholder-desc">No challan sheets match your query filters. Register a new sequence or change parameters.</p>
        </div>
      ) : (
        <>
          {/* Scrollable Responsive Table */}
          <div style={{ overflowX: 'auto', width: '100%', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-glass)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px 20px' }}>Challan Number</th>
                  <th style={{ padding: '16px 20px' }}>Customer</th>
                  <th style={{ padding: '16px 20px' }}>Total Quantity</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px' }}>Created By</th>
                  <th style={{ padding: '16px 20px' }}>Created Date</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((item) => (
                  <tr 
                    key={item.id} 
                    style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.9rem' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '16px 20px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{item.challanNumber}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600 }}>{item.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.customer?.businessName}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{item.totalQuantity} units</td>
                    <td style={{ padding: '16px 20px' }}>{renderStatusBadge(item.status)}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      <div>{item.creator?.name || 'System'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.creator?.role}</div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Link 
                          to={`/challans/${item.id}`} 
                          className="btn" 
                          style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </Link>
                        {isWriteAllowed && item.status === 'DRAFT' && (
                          <Link 
                            to={`/challans/${item.id}/edit`} 
                            className="btn" 
                            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#a78bfa', border: '1px solid rgba(79, 70, 229, 0.2)', marginTop: 0 }}
                            title="Edit Draft"
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

          {/* Pagination control */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {challans.length} of {totalCount} records (Page {currentPage} of {totalPages})
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
