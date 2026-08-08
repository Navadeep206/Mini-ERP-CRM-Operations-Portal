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
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Panel Header */}
      <div className="panel-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>Customer CRM Directory</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage client contacts, lead histories, and pipeline follow-ups.</p>
        </div>
        {isWriteAllowed && (
          <Link to="/customers/new" className="btn" style={{ width: 'auto', marginTop: 0 }}>
            <Plus size={16} /> Add Customer
          </Link>
        )}
      </div>

      {/* Filters & Search Control Bar */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
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
            placeholder="Search name, email, mobile, business..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            style={{ paddingLeft: '48px', width: '100%' }}
            aria-label="Search Customers"
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
            <option value="LEAD">Leads</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Customer Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }} htmlFor="type-select">Type:</label>
          <select 
            id="type-select"
            className="form-input" 
            value={typeFilter} 
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="ALL">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div 
          style={{ 
            backgroundColor: 'var(--danger-light)', 
            color: 'var(--danger)', 
            padding: '16px', 
            borderRadius: 'var(--border-radius-md)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px' 
          }}
        >
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading & Data Table States */}
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
          <div style={{ overflowX: 'auto', width: '100%', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-glass)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                    Customer {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleSort('businessName')}>
                    Business {sortBy === 'businessName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '16px 20px' }}>Mobile</th>
                  <th style={{ padding: '16px 20px' }}>Type</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleSort('followUpDate')}>
                    Next Follow-up {sortBy === 'followUpDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleSort('createdAt')}>
                    Date Created {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr 
                    key={c.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-glass)', 
                      fontSize: '0.9rem',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="table-row-hover"
                  >
                    <style>{`
                      .table-row-hover:hover {
                        background-color: rgba(255, 255, 255, 0.01);
                      }
                    `}</style>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div>{c.businessName}</div>
                      {c.gstNumber && <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>GST: {c.gstNumber}</div>}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{c.mobile}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{c.customerType}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>{renderStatusBadge(c.status)}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      {c.followUpDate ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} />
                          {new Date(c.followUpDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None Scheduled</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Link 
                          to={`/customers/${c.id}`} 
                          className="btn" 
                          style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </Link>
                        {isWriteAllowed && (
                          <Link 
                            to={`/customers/${c.id}/edit`} 
                            className="btn" 
                            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#a78bfa', border: '1px solid rgba(79, 70, 229, 0.2)', marginTop: 0 }}
                            title="Edit Profile"
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

          {/* Reusable Pagination Controls Section */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: '16px',
              marginTop: '16px' 
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {customers.length} of {totalCount} records (Page {currentPage} of {totalPages})
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ 
                  width: 'auto', 
                  padding: '8px 12px', 
                  marginTop: 0, 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-glass)',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ 
                  width: 'auto', 
                  padding: '8px 12px', 
                  marginTop: 0, 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-glass)',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
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
