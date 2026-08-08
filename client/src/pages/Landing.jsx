import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Layers, 
  ArrowRight, 
  Users, 
  Package, 
  FileSpreadsheet, 
  CheckCircle,
  Database,
  Lock,
  Menu,
  X,
  Server,
  Code
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ThreeScene from '../components/ThreeScene';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardPath = isAuthenticated ? '/dashboard' : '/login';

  const features = [
    {
      title: 'Customer CRM',
      desc: 'Manage customer profiles, leads, statuses, and history logs.',
      icon: Users,
      color: 'var(--accent-cyan)'
    },
    {
      title: 'Inventory Management',
      desc: 'Track products catalog, safety stock thresholds, and locations.',
      icon: Package,
      color: 'var(--success)'
    },
    {
      title: 'Sales Challans',
      desc: 'Form draft challans, confirm stock allocation, and log dispatches.',
      icon: FileSpreadsheet,
      color: 'var(--warning)'
    },
    {
      title: 'Role-Based Access',
      desc: 'Separate actions for Admin, Sales, Warehouse, and Accounts.',
      icon: Shield,
      color: '#8b5cf6'
    },
    {
      title: 'Transaction-Safe Inventory',
      desc: 'Atomic SELECT FOR UPDATE locks block race conditions and negative stocks.',
      icon: Lock,
      color: 'var(--danger)'
    },
    {
      title: 'REST API Architecture',
      desc: 'Strict Node.js + Express + TypeScript backend routing structure.',
      icon: Layers,
      color: '#ec4899'
    }
  ];

  const steps = [
    { num: '1', title: 'Customer Selected', desc: 'Select a verified CRM contact profile.' },
    { num: '2', title: 'Products Added', desc: 'Specify items and quantities required.' },
    { num: '3', title: 'Stock Validated', desc: 'System verifies current database counts.' },
    { num: '4', title: 'Challan Confirmed', desc: 'Challan is confirmed and locked.' },
    { num: '5', title: 'Inventory Updated', desc: 'Transaction deducts counts atomically.' },
    { num: '6', title: 'Movement Recorded', desc: 'Outward audit trail log is committed.' }
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div style={{ backgroundColor: '#0b0f19', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-family)', overflowX: 'hidden' }}>
      
      {/* 1. Header Navbar */}
      <header 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          backgroundColor: 'rgba(11, 15, 25, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-glass)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span 
            style={{ 
              fontWeight: 800, 
              fontSize: '1.25rem', 
              background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            MINI ERP
          </span>
        </div>

        {/* Desktop Navigation links */}
        <nav style={{ display: 'flex', gap: '32px' }} className="desktop-nav">
          <button onClick={() => scrollToSection('features')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>Features</button>
          <button onClick={() => scrollToSection('workflow')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>Workflow</button>
          <button onClick={() => scrollToSection('architecture')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>Architecture</button>
          <button onClick={() => scrollToSection('tech-stack')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>Technology</button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to={dashboardPath} 
            className="btn" 
            style={{ 
              padding: '8px 18px', 
              fontSize: '0.85rem', 
              marginTop: 0,
              width: 'auto',
              display: 'inline-flex'
            }}
          >
            Launch Dashboard
          </Link>
          
          {/* Mobile menu icon */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'none' }}
            className="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0,
            backgroundColor: '#0b0f19',
            borderBottom: '1px solid var(--border-glass)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            zIndex: 999
          }}
        >
          <button onClick={() => scrollToSection('features')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, textAlign: 'left' }}>Features</button>
          <button onClick={() => scrollToSection('workflow')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, textAlign: 'left' }}>Workflow</button>
          <button onClick={() => scrollToSection('architecture')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, textAlign: 'left' }}>Architecture</button>
          <button onClick={() => scrollToSection('tech-stack')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, textAlign: 'left' }}>Technology</button>
        </div>
      )}

      {/* 2. Hero Section */}
      <section 
        style={{
          minHeight: '100vh',
          padding: '140px 24px 80px',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'center',
          gap: '48px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span 
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(79, 70, 229, 0.12)',
              border: '1px solid rgba(79, 70, 229, 0.3)',
              borderRadius: '20px',
              color: '#a78bfa',
              fontSize: '0.8rem',
              fontWeight: 600,
              width: 'fit-content',
              letterSpacing: '0.5px'
            }}
          >
            Phase 9: Live 3D Operations Node Visualizer
          </span>
          <h1 
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-1px'
            }}
          >
            One Operations Hub.<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Every Business Flow.
            </span>
          </h1>
          <p 
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              maxWidth: '480px'
            }}
          >
            Connect customer relationships, inventory operations and sales workflows in one reliable, hardened full-stack ERP platform.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
            <Link 
              to={dashboardPath} 
              className="btn" 
              style={{
                width: 'auto',
                padding: '14px 28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Explore Dashboard <ArrowRight size={18} />
            </Link>
            <button 
              onClick={() => scrollToSection('architecture')}
              className="btn"
              style={{
                width: 'auto',
                padding: '14px 28px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              View Architecture
            </button>
          </div>
        </div>

        {/* 3D Visualization */}
        <div style={{ height: '480px', width: '100%', position: 'relative' }}>
          <ThreeScene />
        </div>
      </section>

      {/* 3. Features Section */}
      <section 
        id="features" 
        style={{
          padding: '100px 24px',
          maxWidth: '1280px',
          margin: '0 auto'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '12px' }}>Everything your operations team needs.</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto' }}>
            Designed as a high-fidelity business operations platform with strict transactional safety guards.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="glass-card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: `${feature.color}15`, color: feature.color, padding: '12px', borderRadius: '12px' }}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>{feature.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Workflow Section */}
      <section 
        id="workflow" 
        style={{
          padding: '100px 24px',
          backgroundColor: '#0e1424',
          borderTop: '1px solid var(--border-glass)',
          borderBottom: '1px solid var(--border-glass)'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '12px' }}>From customer request to confirmed sale.</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto' }}>
              Understand the transactional data flows executing inside the Mini ERP portal.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', position: 'relative' }}>
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="glass-card" 
                style={{ 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '12px',
                  position: 'relative'
                }}
              >
                <div 
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(79, 70, 229, 0.15)', 
                    color: '#a78bfa',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {step.num}
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{step.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Architecture Section */}
      <section 
        id="architecture" 
        style={{
          padding: '100px 24px',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >
        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '12px' }}>System Architecture & Stack Layers</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '48px' }}>
          Production-quality layered web portal design specifications.
        </p>

        {/* Stack block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '340px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Code size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontWeight: 600 }}>REACT FRONTEND (VITE)</span>
          </div>
          <div style={{ height: '24px', width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          
          <div className="glass-card" style={{ width: '100%', maxWidth: '340px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Layers size={18} style={{ color: '#8b5cf6' }} />
            <span style={{ fontWeight: 600 }}>REST API GATEWAY</span>
          </div>
          <div style={{ height: '24px', width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          
          <div className="glass-card" style={{ width: '100%', maxWidth: '340px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Server size={18} style={{ color: 'var(--warning)' }} />
            <span style={{ fontWeight: 600 }}>NODE.JS + EXPRESS + TYPESCRIPT</span>
          </div>
          <div style={{ height: '24px', width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

          <div className="glass-card" style={{ width: '100%', maxWidth: '340px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Database size={18} style={{ color: 'var(--success)' }} />
            <span style={{ fontWeight: 600 }}>PRISMA ORM ENGINE</span>
          </div>
          <div style={{ height: '24px', width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

          <div className="glass-card" style={{ width: '100%', maxWidth: '340px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Database size={18} style={{ color: 'var(--danger)' }} />
            <span style={{ fontWeight: 600 }}>POSTGRESQL RELATIONAL DB</span>
          </div>
        </div>

        {/* Security badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '40px' }}>
          <span className="badge badge-info" style={{ padding: '8px 14px' }}>JWT Secure</span>
          <span className="badge badge-success" style={{ padding: '8px 14px' }}>RBAC Enforced</span>
          <span className="badge badge-warning" style={{ padding: '8px 14px' }}>Zod Validated</span>
          <span className="badge badge-danger" style={{ padding: '8px 14px' }}>Helmet Hardened</span>
        </div>
      </section>

      {/* 6. Technical highlights */}
      <section 
        id="tech-stack" 
        style={{
          padding: '100px 24px',
          backgroundColor: '#0e1424',
          borderTop: '1px solid var(--border-glass)'
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '16px' }}>Designed as a real business system.</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              This platform isn't just a basic interface. The backend implements strong relational validation, strict request checks, audit trails, and concurrency row locking to operate safely.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              'Layered backend router & service architecture',
              'Strict validation of all params, queries, and bodies',
              'PostgreSQL schemas managed via Prisma ORM migration sets',
              'Atomically isolated database transaction blocks',
              'Historical product snapshots bound to challan records',
              'Granular user session role matrix rules enforcement'
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA Section */}
      <section 
        style={{
          padding: '120px 24px',
          textAlign: 'center',
          maxWidth: '680px',
          margin: '0 auto'
        }}
      >
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>Ready to explore the operations hub?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '32px' }}>
          Experience the complete integration connecting customer relations CRM, products inventory control, and delivery challans tracking.
        </p>
        <Link 
          to={dashboardPath} 
          className="btn" 
          style={{
            width: 'auto',
            padding: '16px 36px',
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Launch Dashboard <ArrowRight size={18} />
        </Link>
      </section>

      {/* 8. Footer */}
      <footer 
        style={{
          borderTop: '1px solid var(--border-glass)',
          padding: '48px 24px',
          backgroundColor: '#0b0f19',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem', marginBottom: '6px' }}>MINI ERP</div>
            <div>Mini ERP + CRM Operations Portal.</div>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <button onClick={() => scrollToSection('features')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit' }}>Features</button>
            <button onClick={() => scrollToSection('workflow')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit' }}>Workflow</button>
            <button onClick={() => scrollToSection('architecture')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit' }}>Architecture</button>
          </div>
        </div>
      </footer>

      {/* CSS Rules */}
      <style>{`
        .desktop-nav button:hover {
          color: var(--text-primary) !important;
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
