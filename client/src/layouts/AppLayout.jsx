import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  FileSpreadsheet, 
  LogOut, 
  User, 
  Menu, 
  ChevronRight 
} from 'lucide-react';

export default function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear simulation auth state if any and redirect
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Workspace Hub', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers CRM', icon: Users },
    { to: '/products', label: 'Product Catalog', icon: Package },
    { to: '/inventory', label: 'Inventory Control', icon: ShoppingCart },
    { to: '/challans', label: 'Delivery Challans', icon: FileSpreadsheet }
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-logo">
            <span>MINI ERP + CRM</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink 
                key={link.to} 
                to={link.to} 
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
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
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Wrapper */}
      <div className="main-wrapper">
        <header className="navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Menu size={20} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} className="mobile-toggle" />
            <h1 className="navbar-title">Administrative Operations</h1>
          </div>

          <div className="navbar-actions">
            <div className="user-profile">
              <div className="user-avatar">
                <User size={18} />
              </div>
              <div className="user-info">
                <span className="user-name">SysAdmin Operator</span>
                <span className="user-role">Full Access Role</span>
              </div>
            </div>
          </div>
        </header>

        <main className="content-container">
          {/* Nested pages render here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
