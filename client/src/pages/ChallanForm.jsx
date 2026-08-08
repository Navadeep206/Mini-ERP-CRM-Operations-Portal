import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, Info } from 'lucide-react';
import { customerService } from '../services/customer';
import { productService } from '../services/product';
import { challanService } from '../services/challan';

export default function ChallanForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Data Catalogs
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState([]); // [{ productId, quantity, name, sku, currentStock, unitPrice }]

  // Product Selection dropdown temp state
  const [tempProductId, setTempProductId] = useState('');
  const [tempQuantity, setTempQuantity] = useState(1);

  // UX states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // 1. Initial Data Load
  useEffect(() => {
    const loadCatalogs = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const [custData, prodData] = await Promise.all([
          customerService.getCustomers({ limit: 100 }),
          productService.getProducts({ limit: 100 }),
        ]);

        setCustomers(custData || []);
        setProducts(prodData || []);

        if (prodData && prodData.length > 0) {
          setTempProductId(prodData[0].id);
        }

        // Load Challan details if in edit mode
        if (isEditMode) {
          const challan = await challanService.getChallan(id);
          if (challan.status !== 'DRAFT') {
            navigate('/challans');
            return;
          }
          setSelectedCustomerId(challan.customerId);
          
          // Map line items with catalog specs
          const mappedItems = challan.items.map((item) => {
            // Find corresponding item in active product catalog (to check currentStock availability)
            const catProd = prodData?.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              name: item.productNameSnapshot,
              sku: item.skuSnapshot,
              unitPrice: Number(item.unitPriceSnapshot),
              currentStock: catProd ? catProd.currentStock : item.quantity, // fallback
            };
          });
          setItems(mappedItems);
        }
      } catch {
        setErrorMsg('Failed to load customers and products specifications catalogs.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCatalogs();
  }, [id, isEditMode, navigate]);

  // 2. Add Product Line Action
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!tempProductId) return;

    // Check if duplicate
    const exists = items.some((item) => item.productId === tempProductId);
    if (exists) {
      setFormErrors({ ...formErrors, items: 'Product already added to line items list' });
      return;
    }

    const prod = products.find((p) => p.id === tempProductId);
    if (!prod) return;

    setItems([
      ...items,
      {
        productId: tempProductId,
        quantity: tempQuantity,
        name: prod.name,
        sku: prod.sku,
        unitPrice: prod.unitPrice,
        currentStock: prod.currentStock,
      },
    ]);

    setTempQuantity(1);
    setFormErrors({});
  };

  // 3. Remove Product Line Action
  const handleRemoveItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
    setFormErrors({});
  };

  // 4. Update Quantity directly
  const handleQuantityChange = (index, value) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, parseInt(value, 10) || 1);
    setItems(updated);
    setFormErrors({});
  };

  // 5. Total Quantity Calculator
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // 6. Form validation
  const validateForm = () => {
    const errors = {};
    if (!selectedCustomerId) errors.customerId = 'Customer selection is required';
    if (items.length === 0) errors.items = 'Please add at least one product line item';
    
    // Check if any quantity exceeds currentStock
    const hasInsufficientStock = items.some((item) => item.quantity > item.currentStock);
    if (hasInsufficientStock) {
      errors.stock = 'One or more items exceed current warehouse stock availability';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 7. Submit form (Saves as DRAFT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setErrorMsg('');

    const payload = {
      customerId: selectedCustomerId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      status: 'DRAFT', // explicitly saves as DRAFT
    };

    try {
      let savedChallan;
      if (isEditMode) {
        savedChallan = await challanService.updateChallan(id, payload);
      } else {
        savedChallan = await challanService.createChallan(payload);
      }
      
      // Navigate to newly created or modified challan detail page
      navigate(`/challans/${savedChallan.id || id}`);
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        setErrorMsg(`Validation checks failed: ${err.errors.map(e => `${e.field.split('.').pop()}: ${e.message}`).join(', ')}`);
      } else {
        setErrorMsg(err.message || 'Failed to submit sales challan sheets.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
        <span>Loading catalogs specifications...</span>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link 
            to="/challans" 
            className="btn" 
            style={{ width: 'auto', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', marginTop: 0 }}
            title="Back to Directory"
          >
            <ArrowLeft size={16} />
          </Link>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {isEditMode ? 'Edit Draft Challan' : 'Draft New Sales Challan'}
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Customer select box */}
        <div className="form-group" style={{ maxWidth: '480px' }}>
          <label className="form-label" htmlFor="customer">Customer Entity *</label>
          <select
            id="customer"
            className="form-input"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            disabled={isSaving}
            required
          >
            <option value="">Select customer account...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.businessName})
              </option>
            ))}
          </select>
          {formErrors.customerId && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{formErrors.customerId}</span>}
        </div>

        <hr style={{ borderColor: 'var(--border-glass)' }} />

        {/* Product selector picker layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Add Line Item</h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '2', minWidth: '240px' }}>
              <label className="form-label" htmlFor="prod-select">Product Item</label>
              <select
                id="prod-select"
                className="form-input"
                value={tempProductId}
                onChange={(e) => setTempProductId(e.target.value)}
                disabled={isSaving}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (SKU: {p.sku} | Price: ${p.unitPrice.toFixed(2)} | Stock: {p.currentStock})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: '0.5', minWidth: '100px' }}>
              <label className="form-label" htmlFor="temp-qty">Quantity</label>
              <input
                id="temp-qty"
                type="number"
                min="1"
                className="form-input"
                value={tempQuantity}
                onChange={(e) => setTempQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                disabled={isSaving}
              />
            </div>

            <button
              type="button"
              className="btn"
              onClick={handleAddItem}
              disabled={isSaving || !tempProductId}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}
            >
              <Plus size={16} /> Add Line
            </button>
          </div>
          {formErrors.items && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{formErrors.items}</span>}
        </div>

        {/* Added Items table list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>Line Items Directory</h3>

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', border: '1px dashed var(--border-glass)', borderRadius: '8px', color: 'var(--text-muted)' }}>
              <Info size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No products added. Select a product above and click "Add Line".</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map((item, idx) => {
                const isStockInsufficient = item.quantity > item.currentStock;
                return (
                  <div 
                    key={item.productId}
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.01)', 
                      border: isStockInsufficient ? '1px solid var(--danger-light)' : '1px solid var(--border-glass)',
                      borderRadius: 'var(--border-radius-md)', 
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    {/* Item specs */}
                    <div style={{ flex: '2', minWidth: '220px' }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        SKU: <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{item.sku}</strong> | Price: ${item.unitPrice.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: isStockInsufficient ? 'var(--danger)' : 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isStockInsufficient ? (
                          <>
                            <AlertCircle size={12} /> Insufficient stock: current stock is {item.currentStock}
                          </>
                        ) : (
                          <>
                            Stock Availability: {item.currentStock} units
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quantity modifier and delete actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="form-group" style={{ width: '90px', marginBottom: 0 }}>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          disabled={isSaving}
                          aria-label={`Quantity for ${item.name}`}
                        />
                      </div>
                      
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={isSaving}
                        style={{ width: 'auto', padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', marginTop: 0 }}
                        title="Remove Line"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Challan Summary totals */}
        {items.length > 0 && (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: 'var(--border-radius-md)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Total Line Items: <strong>{items.length}</strong>
            </div>
            
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Total Quantity: <span style={{ color: 'var(--accent-cyan)' }}>{totalQuantity} units</span>
            </div>
          </div>
        )}

        {/* Submitting Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '24px', marginTop: '12px' }}>
          <Link to="/challans" className="btn" style={{ width: 'auto', backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid var(--border-glass)', marginTop: 0 }}>
            Cancel
          </Link>
          <button 
            type="submit" 
            className="btn" 
            disabled={isSaving || (formErrors.stock !== undefined)}
            style={{ width: 'auto', marginTop: 0 }}
          >
            <Save size={16} /> {isSaving ? 'Saving Draft...' : 'Save Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
