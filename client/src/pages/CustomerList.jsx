import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Calendar, 
  Briefcase 
} from 'lucide-react';
import { customerService } from '../services/customer';
import { useAuth } from '../hooks/useAuth';

export default function CustomerList() {
  const { role } = useAuth();

  // State parameters
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Search & Filter State
  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Sorting State
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debouncing timeout reference
  const debounceRef = useRef(null);

  // 1. Debounce Search Input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchVal);
      setCurrentPage(1); // Reset to page 1 on search
    }, 450);

    return () => clearTimeout(debounceRef.current);
  }, [searchVal]);

  // 2. Fetch Customers Data
  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await customerService.getCustomers({
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter,
        customerType: typeFilter,
        sortBy,
        sortOrder,
      });

      setCustomers(data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve customers catalog.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, typeFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const isWriteAllowed = ['ADMIN', 'SALES'].includes(role);

  // Status Badge Component
  const renderStatusBadge = (status) => {
    let cls = 'badge-info';
    if (status === 'ACTIVE') cls = 'badge-success';
    if (status === 'INACTIVE') cls = 'badge-danger';
    if (status === 'LEAD') cls = 'badge-warning';

    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Top Header Panel - Title & Description */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage client contacts, lead histories, and pipeline follow-ups.
            {totalCount > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>• {totalCount} total customers</span>}
          </p>
        </div>
        {isWriteAllowed && (
          <Link to="/customers/new" className="btn" style={{ width: 'auto', marginTop: 0, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            <Plus size={14} /> Add Customer
          </Link>
        )}
      </div>

      {/* Action + search/filter toolbar */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: 'rgba(19, 26, 44, 0.3)',
          padding: '10px 14px',
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--border-glass)'
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search name, email, mobile, business..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{ paddingLeft: '34px', width: '100%', height: '34px', fontSize: '0.8rem' }}
            aria-label="Search Customers"
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }} htmlFor="status-select">Status</label>
          <select 
            id="status-select"
            className="form-input" 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '130px', height: '34px', padding: '0 8px', fontSize: '0.8rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="LEAD">Leads</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Customer Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }} htmlFor="type-select">Type</label>
          <select 
            id="type-select"
            className="form-input" 
            value={typeFilter} 
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '130px', height: '34px', padding: '0 8px', fontSize: '0.8rem' }}
          >
            <option value="ALL">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div 
          style={{ 
            backgroundColor: 'var(--danger-light)', 
            color: 'var(--danger)', 
            padding: '12px 16px', 
            borderRadius: 'var(--border-radius-md)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontSize: '0.85rem'
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Customer table/card */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <span>Loading client directory...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="placeholder-view" style={{ padding: '60px 0' }}>
            <Briefcase size={48} className="placeholder-icon" />
            <h3 className="placeholder-title">No Customers Found</h3>
            <p className="placeholder-desc">No client records match your active search filter parameters. Try checking your parameters or add a new record.</p>
          </div>
        ) : (
          <>
            {/* Scrollable Responsive Table Wrapper */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '21%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.015)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                      Customer {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('businessName')}>
                      Business {sortBy === 'businessName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 16px' }}>Mobile</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('followUpDate')}>
                      Next Follow-up {sortBy === 'followUpDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleSort('createdAt')}>
                      Date Created {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr 
                      key={c.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-glass)', 
                        fontSize: '0.82rem',
                        transition: 'var(--transition-smooth)'
                      }}
                      className="table-row-hover"
                    >
                      <style>{`
                        .table-row-hover:hover {
                          background-color: rgba(255, 255, 255, 0.01);
                        }
                      `}</style>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{c.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.businessName}</div>
                        {c.gstNumber && <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>GST: {c.gstNumber}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{c.mobile}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{c.customerType}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{renderStatusBadge(c.status)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {c.followUpDate ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                            <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                            {new Date(c.followUpDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None Scheduled</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <Link 
                            to={`/customers/${c.id}`} 
                            className="btn" 
                            style={{ width: 'auto', padding: '5px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
                            title="View Details"
                          >
                            <Eye size={12} />
                          </Link>
                          {isWriteAllowed && (
                            <Link 
                              to={`/customers/${c.id}/edit`} 
                              className="btn" 
                              style={{ width: 'auto', padding: '5px 8px', fontSize: '0.75rem', backgroundColor: 'rgba(79, 70, 229, 0.08)', color: '#a78bfa', border: '1px solid rgba(79, 70, 229, 0.15)', marginTop: 0 }}
                              title="Edit Profile"
                            >
                              <Edit2 size={12} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Section */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                flexWrap: 'wrap', 
                gap: '16px',
                padding: '12px 16px',
                borderTop: '1px solid var(--border-glass)',
                backgroundColor: 'rgba(255, 255, 255, 0.005)'
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Showing {customers.length} of {totalCount} records (Page {currentPage} of {totalPages})
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{ 
                    width: 'auto', 
                    padding: '6px 10px', 
                    marginTop: 0, 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-glass)',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="btn"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{ 
                    width: 'auto', 
                    padding: '6px 10px', 
                    marginTop: 0, 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-glass)',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
