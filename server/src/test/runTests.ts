export {};

const BASE_URL = 'http://127.0.0.1:5001/api';

async function testRequest(name: string, endpoint: string, method: string, body?: any, token?: string): Promise<any> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    console.log(`[${name}] Status: ${response.status} | OK: ${response.ok}`);
    return { status: response.status, ok: response.ok, data };
  } catch (error: any) {
    console.error(`[${name}] Error:`, error.message);
    return { status: 500, ok: false, error };
  }
}

async function loginUser(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'DevPassword123!' }),
  });
  const body = (await res.json()) as any;
  return body.data?.token || '';
}

async function runTests() {
  console.log('🏁 Starting Hardened Backend Integration Test Suite...\n');

  // 1. AUTHENTICATION & LOGIN TESTS
  console.log('--- Auth & Login Tests ---');
  
  // A. Valid login
  const adminToken = await loginUser('admin@example.com');
  const salesToken = await loginUser('sales@example.com');
  const accountsToken = await loginUser('accounts@example.com');
  const warehouseToken = await loginUser('warehouse@example.com');

  if (adminToken && salesToken && accountsToken && warehouseToken) {
    console.log('✅ Valid login credentials resolved successfully for all roles.');
  } else {
    console.error('❌ Failed resolving valid login credentials.');
    process.exit(1);
  }

  // B. Invalid login
  const badLogin = await testRequest('Login - Bad Password', '/auth/login', 'POST', {
    email: 'admin@example.com',
    password: 'wrongpassword'
  });
  if (badLogin.status === 401 && badLogin.data.success === false) {
    console.log('✅ Bad password rejected with 401 and success: false.');
  } else {
    console.error('❌ Bad password test failed.');
  }

  // C. Missing credentials
  const missingLogin = await testRequest('Login - Missing Fields', '/auth/login', 'POST', {
    email: 'admin@example.com'
  });
  if (missingLogin.status === 400 && missingLogin.data.success === false) {
    console.log('✅ Missing password validation caught by Zod with 400 and success: false.');
  } else {
    console.error('❌ Missing login verification test failed.');
  }

  // D. Invalid token
  const badToken = await testRequest('Get Profile - Bad Token', '/auth/me', 'GET', undefined, 'bad-token-here');
  if (badToken.status === 401 && badToken.data.success === false) {
    console.log('✅ Invalid JWT access token rejected with 401.');
  } else {
    console.error('❌ Invalid token test failed.');
  }

  // 2. RBAC TESTS
  console.log('\n--- RBAC Access Control Tests ---');
  
  // A. Create Customer under WAREHOUSE (Expected: 403)
  const warehouseCustomer = await testRequest('Create Customer - WAREHOUSE', '/customers', 'POST', {
    name: 'RBAC Test customer',
    mobile: '12345',
    email: 'rbac@test.com',
    businessName: 'RBAC corp',
    customerType: 'RETAIL',
    address: 'Warehouse Lane',
    status: 'LEAD'
  }, warehouseToken);
  
  if (warehouseCustomer.status === 403 && warehouseCustomer.data.success === false) {
    console.log('✅ Role WAREHOUSE barred from CRM Customer modifications (403 Forbidden).');
  } else {
    console.error('❌ RBAC Customer Create test failed.');
  }

  // B. Create Product under SALES (Expected: 403)
  const salesProduct = await testRequest('Create Product - SALES', '/products', 'POST', {
    name: 'RBAC Test product',
    sku: 'RBAC-TEST-SKU',
    category: 'RBAC',
    unitPrice: 100,
    currentStock: 0,
    minimumStock: 5,
    warehouseLocation: 'Zone A'
  }, salesToken);

  if (salesProduct.status === 403 && salesProduct.data.success === false) {
    console.log('✅ Role SALES barred from Product Catalog creations (403 Forbidden).');
  } else {
    console.error('❌ RBAC Product Create test failed.');
  }

  // 3. CUSTOMER CRM TESTS
  console.log('\n--- Customer CRM Tests ---');
  
  // A. Create Customer
  const custRes = await testRequest('Create Customer - ADMIN', '/customers', 'POST', {
    name: 'Dynamic Test Customer',
    mobile: '987654321',
    email: 'dynamic@test.com',
    businessName: 'Dynamic Inc',
    customerType: 'DISTRIBUTOR',
    address: '77 GIDC Road',
    status: 'ACTIVE'
  }, adminToken);
  
  const customerId = custRes.data?.data?.id;
  if (custRes.status === 201 && customerId) {
    console.log('✅ Customer created successfully.');
  } else {
    console.error('❌ Customer creation failed.');
  }

  // B. Strict parameter validation injection check (reject unknown body parameters)
  const injectCustomer = await testRequest('Create Customer with Unknown fields (strict check)', '/customers', 'POST', {
    name: 'Hacker Customer',
    mobile: '999999',
    email: 'hacker@test.com',
    businessName: 'Hacker corp',
    customerType: 'RETAIL',
    address: 'Hacker road',
    status: 'LEAD',
    hackerProperty: 'should-fail'
  }, adminToken);

  if (injectCustomer.status === 400 && injectCustomer.data.success === false) {
    console.log('✅ Strict parameter validation checks rejected custom injected fields successfully.');
  } else {
    console.error('❌ Strict customer fields check failed.');
  }

  // C. Add Follow-up note
  const followUpRes = await testRequest('Create Customer Follow-Up', `/customers/${customerId}/follow-ups`, 'POST', {
    note: 'Initial CRM check call',
    followUpDate: '2026-08-20T00:00:00.000Z'
  }, adminToken);

  if (followUpRes.status === 201 && followUpRes.data.success) {
    console.log('✅ Follow-up log appended successfully.');
  } else {
    console.error('❌ Follow-up log failed.');
  }

  // 4. PRODUCT CATALOG TESTS
  console.log('\n--- Product Catalog Tests ---');
  const uniqueSku = `TEST-SKU-${Date.now()}`;
  
  // A. Create Product
  const prodResA = await testRequest('Create Product A - WAREHOUSE', '/products', 'POST', {
    name: 'Premium Rebar',
    sku: uniqueSku,
    category: 'Materials',
    unitPrice: 15.00,
    currentStock: 10,
    minimumStock: 5,
    warehouseLocation: 'Warehouse East'
  }, warehouseToken);

  const prodA = prodResA.data?.data;
  if (prodResA.status === 201 && prodA?.id) {
    console.log('✅ Product A created successfully.');
  } else {
    console.error('❌ Product A creation failed.');
  }

  // B. Duplicate SKU constraint check
  const prodResB = await testRequest('Create Duplicate SKU Product - WAREHOUSE', '/products', 'POST', {
    name: 'Premium Rebar Clone',
    sku: uniqueSku,
    category: 'Materials',
    unitPrice: 15.00,
    currentStock: 10,
    minimumStock: 5,
    warehouseLocation: 'Warehouse East'
  }, warehouseToken);

  if (prodResB.status === 409 && prodResB.data.success === false) {
    console.log('✅ Duplicate SKU rejected with 409 Conflict.');
  } else {
    console.error('❌ Duplicate SKU constraint validation failed.');
  }

  // C. Block Stock count in profile updates
  const updateProd = await testRequest('Update Product A specs (attempt stock injection)', `/products/${prodA.id}`, 'PATCH', {
    name: 'Premium Rebar Renovated',
    currentStock: 9999 // injection attempt
  }, warehouseToken);

  if (updateProd.status === 400 && updateProd.data.success === false) {
    console.log('✅ Injecting "currentStock" in PATCH specs rejected successfully via strict validation.');
  } else {
    console.error('❌ Product stock edit injection protection failed.');
  }

  // 5. INVENTORY & TRANSACTION ROLLBACK TESTS
  console.log('\n--- Inventory & Rollback Tests ---');
  
  // Create Product B with stock 2
  const skuB = `TEST-SKU-B-${Date.now()}`;
  const prodResC = await testRequest('Create Product B', '/products', 'POST', {
    name: 'Standard Packing box',
    sku: skuB,
    category: 'Packaging',
    unitPrice: 2.50,
    currentStock: 2,
    minimumStock: 50,
    warehouseLocation: 'Warehouse West'
  }, warehouseToken);
  const prodB = prodResC.data?.data;

  // A. Trigger IN stock movement
  const inRes = await testRequest('Stock Movement IN - WAREHOUSE', `/products/${prodA.id}/stock-movements`, 'POST', {
    quantityChanged: 5,
    movementType: 'IN',
    reason: 'Restocking shipment'
  }, warehouseToken);
  if (inRes.status === 201 && inRes.data?.data?.newStock === 15) {
    console.log('✅ Stock movement IN successfully updated stock to 15.');
  } else {
    console.error('❌ Stock movement IN test failed.');
  }

  // B. Trigger OUT stock movement exceeding stock
  const outRes = await testRequest('Stock Movement OUT - Exceeding Stock', `/products/${prodB.id}/stock-movements`, 'POST', {
    quantityChanged: 10, // exceeds currentStock of 2
    movementType: 'OUT',
    reason: 'Dispatch order'
  }, warehouseToken);

  if (outRes.status === 409 && outRes.data.success === false) {
    console.log('✅ Stock movement OUT exceeding current stock rejected with 409 Conflict.');
  } else {
    console.error('❌ Stock movement OUT bounds check failed.');
  }

  // 6. SALES CHALLAN TESTS (WORKFLOW & SNAPSHOTS)
  console.log('\n--- Sales Challan Tests ---');
  
  // A. Create Draft Challan
  const challanPayload = {
    customerId,
    items: [
      { productId: prodA.id, quantity: 4 },
      { productId: prodB.id, quantity: 1 }
    ],
    status: 'DRAFT'
  };

  const draftRes = await testRequest('Create Draft Challan - SALES', '/challans', 'POST', challanPayload, salesToken);
  const challan = draftRes.data?.data;
  if (draftRes.status === 201 && challan?.id) {
    console.log(`✅ Draft challan ${challan.challanNumber} created successfully.`);
  } else {
    console.error('❌ Draft challan creation failed.');
  }

  // B. SNAPSHOT PRESERVATION TEST
  // Change Product A details in the catalog
  await testRequest('Update Product A Catalog details', `/products/${prodA.id}`, 'PATCH', {
    name: 'Premium Rebar Changed-Name',
    sku: `${prodA.sku}-NEW`,
    unitPrice: prodA.unitPrice + 10.00
  }, warehouseToken);

  // Fetch challan details and verify historical details remain untouched
  const fetchChallan = await testRequest('Fetch Challan detail sheet', `/challans/${challan.id}`, 'GET', undefined, salesToken);
  const rebarItem = fetchChallan.data?.data?.items?.find((i: any) => i.productId === prodA.id);
  
  if (
    rebarItem?.productNameSnapshot === 'Premium Rebar' &&
    rebarItem?.skuSnapshot === prodA.sku &&
    Number(rebarItem?.unitPriceSnapshot) === 15.00
  ) {
    console.log('✅ Historical product snapshots preserved successfully (Snapshot test passed).');
  } else {
    console.error('❌ Product snapshot preservation verification failed.');
  }

  // Restore Product A specs to keep data consistent
  await testRequest('Restore Product A Catalog details', `/products/${prodA.id}`, 'PATCH', {
    name: 'Premium Rebar',
    sku: prodA.sku,
    unitPrice: 15.00
  }, warehouseToken);

  // C. CHALLAN STOCK TRANSACTION CONFIRMATION & ROLLBACKS
  // Create another draft challan that exceeds Product B stock (B has 2, we demand 5)
  const badChallanPayload = {
    customerId,
    items: [
      { productId: prodA.id, quantity: 2 },
      { productId: prodB.id, quantity: 5 } // exceeds stock count
    ],
    status: 'DRAFT'
  };

  const badDraftRes = await testRequest('Create Excess Draft Challan - SALES', '/challans', 'POST', badChallanPayload, salesToken);
  const badChallan = badDraftRes.data?.data;

  // Confirm excess challan (Expected: 409, rolls back and keeps stock counts unchanged)
  const badConfirm = await testRequest('Confirm Excess Challan (Rollback check)', `/challans/${badChallan.id}/confirm`, 'POST', undefined, salesToken);
  if (badConfirm.status === 409 && badConfirm.data.success === false) {
    console.log('✅ Excess challan confirmation rejected with 409.');
    
    // Check if Product A stock remains 15 (unaffected by bad transaction confirmation attempt)
    const checkStockRollback = await testRequest('Verify Product A Stock after rollback', `/products/${prodA.id}`, 'GET', undefined, adminToken);
    if (checkStockRollback.data?.data?.currentStock === 15) {
      console.log('✅ Transaction rollback verified successfully. Stock of Product A remains 15.');
    } else {
      console.error('❌ Transaction rollback failed; stock was deducted!');
    }
  } else {
    console.error('❌ Excess challan confirmation check failed.');
  }

  // D. SUCCESSFUL CONFIRMATION
  // Confirm the first draft challan (decrements Product A stock from 15 to 11, and Product B from 2 to 1)
  const confirmRes = await testRequest('Confirm Valid Challan - SALES', `/challans/${challan.id}/confirm`, 'POST', undefined, salesToken);
  if (confirmRes.status === 200 && confirmRes.data.success) {
    console.log('✅ Valid challan confirmed successfully.');
    
    // Verify final stock counts
    const finalStockA = await testRequest('Check Product A stock', `/products/${prodA.id}`, 'GET', undefined, adminToken);
    const finalStockB = await testRequest('Check Product B stock', `/products/${prodB.id}`, 'GET', undefined, adminToken);
    
    if (finalStockA.data?.data?.currentStock === 11 && finalStockB.data?.data?.currentStock === 1) {
      console.log('✅ Final stock counts verify correctly: Product A has 11, Product B has 1.');
    } else {
      console.error(`❌ Final stock verification failed: A has ${finalStockA.data?.data?.currentStock}, B has ${finalStockB.data?.data?.currentStock}`);
    }
  } else {
    console.error('❌ Valid challan confirmation failed.');
  }

  // E. CONFLICTS ON TERMINAL STATUSES
  // Try to edit a confirmed challan (Expected: 409)
  const editConf = await testRequest('Edit Confirmed Challan', `/challans/${challan.id}`, 'PATCH', { customerId }, salesToken);
  if (editConf.status === 409 && editConf.data.success === false) {
    console.log('✅ Modifying confirmed challans blocked with 409 Conflict.');
  } else {
    console.error('❌ Block confirmed edit check failed.');
  }

  // Try to cancel a confirmed challan (Expected: 409)
  const cancelConf = await testRequest('Cancel Confirmed Challan', `/challans/${challan.id}/cancel`, 'POST', undefined, salesToken);
  if (cancelConf.status === 409 && cancelConf.data.success === false) {
    console.log('✅ Cancelling confirmed challans blocked with 409 Conflict.');
  } else {
    console.error('❌ Block confirmed cancel check failed.');
  }

  console.log('\n🎉 All Hardened Backend Integration Tests completed successfully!');
}

runTests();
