import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  FileSpreadsheet, 
  LogOut, 
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function AppLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Close mobile navigation drawer whenever page route changes
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard Hub', icon: LayoutDashboard, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
    { to: '/customers', label: 'Customers CRM', icon: Users, roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
    { to: '/products', label: 'Product Catalog', icon: Package, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
    { to: '/inventory', label: 'Inventory Stocks', icon: ShoppingCart, roles: ['ADMIN', 'WAREHOUSE', 'ACCOUNTS'] },
    { to: '/challans', label: 'Delivery Challans', icon: FileSpreadsheet, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] }
  ];

  // Filter links dynamically based on user role (UX Guard only, backend enforces real security)
  const allowedLinks = navLinks.filter(link => link.roles.includes(role));

  // Determine current page title from path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Operational Dashboard';
    if (path.startsWith('/customers')) return 'Customers CRM';
    if (path.startsWith('/products')) return 'Product Catalog';
    if (path.startsWith('/inventory')) return 'Inventory Stocks Control';
    if (path.startsWith('/challans')) return 'Sales Delivery Challans';
    return 'Mini ERP Portal';
  };

  return (
    <div className="app-container">
      {/* Mobile Drawer Overlay */}
      {isMobileNavOpen && (
        <div 
          onClick={() => setIsMobileNavOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 95,
            backdropFilter: 'blur(3px)',
            transition: 'opacity 0.3s ease'
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}
        style={{
          transform: isMobileNavOpen ? 'translateX(0)' : undefined
        }}
      >
        <div className="sidebar-brand">
          <Link to="/dashboard" className="sidebar-logo" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>MINI ERP + CRM</span>
          </Link>
          {isMobileNavOpen && (
            <button 
              onClick={() => setIsMobileNavOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {allowedLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink 
                key={link.to} 
                to={link.to} 
                className={({ isActive }) => {
                  const isCurrentPrefix = location.pathname.startsWith(link.to);
                  return `sidebar-link ${isActive || isCurrentPrefix ? 'active' : ''}`;
                }}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={handleLogout} 
            className="sidebar-link" 
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Wrapper */}
      <div className="main-wrapper">
        <header className="navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setIsMobileNavOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', padding: 4 }}
              className="mobile-toggle"
              aria-label="Open menu"
            >
              <Menu size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                <span>Operations</span>
                <ChevronRight size={10} />
                <span>{getPageTitle()}</span>
              </div>
              <h1 className="navbar-title" style={{ lineHeight: 1.2 }}>{getPageTitle()}</h1>
            </div>
          </div>

          <div className="navbar-actions">
            <div className="user-profile">
              <div className="user-avatar" style={{ textTransform: 'uppercase' }}>
                {user?.name ? user.name[0] : 'U'}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || 'User Session'}</span>
                <span className="badge badge-info" style={{ width: 'fit-content', padding: '2px 8px', fontSize: '0.65rem', marginTop: '3px', textTransform: 'uppercase' }}>
                  {role}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
