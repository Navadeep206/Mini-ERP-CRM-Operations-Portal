import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Info } from 'lucide-react';
import { productService } from '../services/product';

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [unitPrice, setUnitPrice] = useState(0);
  const [minimumStock, setMinimumStock] = useState(0);
  const [warehouseLocation, setWarehouseLocation] = useState('Warehouse-A');
  
  // Initial Stock Field (Create mode only)
  const [initialStock, setInitialStock] = useState(0);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // 1. Fetch details on Edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const loadProduct = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const product = await productService.getProduct(id);
        setName(product.name || '');
        setSku(product.sku || '');
        setCategory(product.category || 'Electronics');
        setUnitPrice(product.unitPrice || 0);
        setMinimumStock(product.minimumStock || 0);
        setWarehouseLocation(product.warehouseLocation || 'Warehouse-A');
      } catch {
        setErrorMsg('Failed to load product profile data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id, isEditMode]);

  // 2. Validate Inputs
  const validateForm = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Product name is required';
    if (!sku.trim()) errors.sku = 'SKU code is required';
    if (unitPrice < 0) errors.unitPrice = 'Unit price must be non-negative';
    if (minimumStock < 0) errors.minimumStock = 'Minimum stock alert quantity must be non-negative';
    
    if (!isEditMode && initialStock < 0) {
      errors.initialStock = 'Initial stock quantity cannot be negative';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 3. Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setErrorMsg('');

    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      category,
      unitPrice: Number(unitPrice),
      minimumStock: Number(minimumStock),
      warehouseLocation,
      // Pass initialStock only during creation to trigger the backend audit log movement
      currentStock: isEditMode ? undefined : Number(initialStock),
    };

    try {
      if (isEditMode) {
        await productService.updateProduct(id, payload);
      } else {
        await productService.createProduct(payload);
      }
      navigate('/products');
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const errorsMap = {};
        err.errors.forEach((e) => {
          const fieldKey = e.field.split('.').pop();
          errorsMap[fieldKey] = e.message;
        });
        setFieldErrors(errorsMap);
        setErrorMsg('Validation checks failed. Please inspect input properties below.');
      } else {
        setErrorMsg(err.message || 'Error occurred while saving product record.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <span>Loading product details...</span>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header Panel */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid var(--border-glass)', 
          paddingBottom: '20px',
          marginBottom: '32px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to="/products" 
            className="btn" 
            style={{ width: 'auto', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
            title="Back to Catalog"
          >
            <ArrowLeft size={16} />
          </Link>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {isEditMode ? 'Edit Product Specifications' : 'Register New Product'}
          </h2>
        </div>
      </div>

      {/* Global Errors */}
      {errorMsg && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '16px', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Left Column (Specs) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Specification Sheet</h3>

            {/* Product Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="name">Product Name *</label>
              <input
                id="name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
                disabled={isSaving}
                aria-required="true"
              />
              {fieldErrors.name && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.name}</span>}
            </div>

            {/* SKU */}
            <div className="form-group">
              <label className="form-label" htmlFor="sku">SKU Code *</label>
              <input
                id="sku"
                type="text"
                className="form-input"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Enter SKU code"
                disabled={isSaving}
                aria-required="true"
              />
              {fieldErrors.sku && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.sku}</span>}
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label" htmlFor="category">Category *</label>
              <select
                id="category"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSaving}
              >
                <option value="Electronics">Electronics</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Finished Goods">Finished Goods</option>
              </select>
            </div>
          </div>

          {/* Right Column (Inventory & Valuation) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Valuation & Inventory</h3>

            {/* Unit Price */}
            <div className="form-group">
              <label className="form-label" htmlFor="price">Unit Price ($) *</label>
              <input
                id="price"
                type="number"
                step="0.01"
                className="form-input"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                disabled={isSaving}
                aria-required="true"
              />
              {fieldErrors.unitPrice && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.unitPrice}</span>}
            </div>

            {/* Minimum Stock Alert Level */}
            <div className="form-group">
              <label className="form-label" htmlFor="min-stock">Minimum Safety Stock Level *</label>
              <input
                id="min-stock"
                type="number"
                className="form-input"
                value={minimumStock}
                onChange={(e) => setMinimumStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                disabled={isSaving}
                aria-required="true"
              />
              {fieldErrors.minimumStock && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.minimumStock}</span>}
            </div>

            {/* Warehouse Location */}
            <div className="form-group">
              <label className="form-label" htmlFor="warehouse">Warehouse Location *</label>
              <select
                id="warehouse"
                className="form-input"
                value={warehouseLocation}
                onChange={(e) => setWarehouseLocation(e.target.value)}
                disabled={isSaving}
              >
                <option value="Warehouse-A">Warehouse-A</option>
                <option value="Warehouse-B">Warehouse-B</option>
                <option value="Warehouse-C">Warehouse-C</option>
              </select>
            </div>
          </div>
        </div>

        {/* Initial Stock Section (Creation Mode ONLY) */}
        {!isEditMode && (
          <>
            <hr style={{ borderColor: 'var(--border-glass)' }} />
            <div style={{ backgroundColor: 'rgba(34, 211, 238, 0.02)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--border-radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
                <Info size={16} />
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Initial Stock Placement</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Establishing stock quantity here automatically issues an initial stock audit transaction log in the database.
              </p>
              
              <div className="form-group" style={{ maxWidth: '320px', marginTop: '6px' }}>
                <label className="form-label" htmlFor="init-stock">Initial Stock Quantity</label>
                <input
                  id="init-stock"
                  type="number"
                  className="form-input"
                  value={initialStock}
                  onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  disabled={isSaving}
                />
                {fieldErrors.initialStock && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{fieldErrors.initialStock}</span>}
              </div>
            </div>
          </>
        )}

        {/* Actions Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px', marginTop: '12px' }}>
          <Link to="/products" className="btn" style={{ width: 'auto', backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid var(--border-glass)', marginTop: 0 }}>
            Cancel
          </Link>
          <button type="submit" className="btn" disabled={isSaving} style={{ width: 'auto', marginTop: 0 }}>
            <Save size={16} /> {isSaving ? 'Saving Product...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
