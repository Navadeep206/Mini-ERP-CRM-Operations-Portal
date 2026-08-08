import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers & Guards
import { AuthProvider } from './hooks/useAuth';
import { UIProvider } from './hooks/useUI';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import AppLayout from './layouts/AppLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerForm from './pages/CustomerForm';
import CustomerDetail from './pages/CustomerDetail';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import ProductDetail from './pages/ProductDetail';
import Inventory from './pages/Inventory';
import ChallanList from './pages/ChallanList';
import ChallanForm from './pages/ChallanForm';
import ChallanDetail from './pages/ChallanDetail';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <UIProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />

              {/* Protected Portal Shell */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  {/* Workspace Hub - all roles */}
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* Customers CRM - ADMIN, SALES, ACCOUNTS */}
                  <Route 
                    path="/customers" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                        <CustomerList />
                      </RequireRole>
                    } 
                  />

                  {/* Customers CRM: Create - ADMIN, SALES */}
                  <Route 
                    path="/customers/new" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'SALES']}>
                        <CustomerForm />
                      </RequireRole>
                    } 
                  />

                  {/* Customers CRM: Detail - ADMIN, SALES, ACCOUNTS */}
                  <Route 
                    path="/customers/:id" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                        <CustomerDetail />
                      </RequireRole>
                    } 
                  />

                  {/* Customers CRM: Edit - ADMIN, SALES */}
                  <Route 
                    path="/customers/:id/edit" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'SALES']}>
                        <CustomerForm />
                      </RequireRole>
                    } 
                  />

                  {/* Product Catalog - ADMIN, WAREHOUSE, SALES, ACCOUNTS */}
                  <Route 
                    path="/products" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS']}>
                        <ProductList />
                      </RequireRole>
                    } 
                  />

                  {/* Product Catalog: Create - ADMIN, WAREHOUSE */}
                  <Route 
                    path="/products/new" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'WAREHOUSE']}>
                        <ProductForm />
                      </RequireRole>
                    } 
                  />

                  {/* Product Catalog: Detail - ADMIN, WAREHOUSE, SALES, ACCOUNTS */}
                  <Route 
                    path="/products/:id" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS']}>
                        <ProductDetail />
                      </RequireRole>
                    } 
                  />

                  {/* Product Catalog: Edit - ADMIN, WAREHOUSE */}
                  <Route 
                    path="/products/:id/edit" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'WAREHOUSE']}>
                        <ProductForm />
                      </RequireRole>
                    } 
                  />

                  {/* Inventory Control - ADMIN, WAREHOUSE, ACCOUNTS */}
                  <Route 
                    path="/inventory" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'WAREHOUSE', 'ACCOUNTS']}>
                        <Inventory />
                      </RequireRole>
                    } 
                  />

                  {/* Delivery Challans Directory - all roles */}
                  <Route 
                    path="/challans" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE']}>
                        <ChallanList />
                      </RequireRole>
                    } 
                  />

                  {/* Delivery Challans: Create - ADMIN, SALES */}
                  <Route 
                    path="/challans/new" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'SALES']}>
                        <ChallanForm />
                      </RequireRole>
                    } 
                  />

                  {/* Delivery Challans: Detail - all roles */}
                  <Route 
                    path="/challans/:id" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE']}>
                        <ChallanDetail />
                      </RequireRole>
                    } 
                  />

                  {/* Delivery Challans: Edit - ADMIN, SALES */}
                  <Route 
                    path="/challans/:id/edit" 
                    element={
                      <RequireRole allowedRoles={['ADMIN', 'SALES']}>
                        <ChallanForm />
                      </RequireRole>
                    } 
                  />

                  {/* Forbidden Access Fallback Page */}
                  <Route path="/forbidden" element={<Forbidden />} />
                </Route>
              </Route>

              {/* 404 Route */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
        </UIProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
