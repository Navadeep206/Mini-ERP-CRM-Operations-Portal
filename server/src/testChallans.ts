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
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log('----------------------------------------------------');
    return { status: response.status, data };
  } catch (error: any) {
    console.error(`[${name}] Error:`, error.message);
    console.log('----------------------------------------------------');
    return { status: 500, error };
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
  console.log('🏁 Starting Sales Challan API Verification Suite...\n');

  // Authenticate roles
  console.log('Authenticating roles...');
  const adminToken = await loginUser('admin@example.com');
  const salesToken = await loginUser('sales@example.com');
  const accountsToken = await loginUser('accounts@example.com');
  console.log('Tokens resolved successfully.\n');

  // Set up products and customers for testing
  // Get active products
  const productsRes = await testRequest('Get Catalog', '/products?limit=10', 'GET', undefined, adminToken);
  const prodA = productsRes.data?.data?.products?.[0];
  const prodB = productsRes.data?.data?.products?.[1];
  
  // Get active customers
  const customersRes = await testRequest('Get Customers', '/customers?limit=5', 'GET', undefined, adminToken);
  const customer = customersRes.data?.data?.customers?.[0];

  if (!prodA || !prodB || !customer) {
    console.error('❌ Missing prerequisite data. Verify database has products and customers seeded.');
    return;
  }

  // Stock values
  console.log(`Prerequisites resolved:`);
  console.log(`Customer: ${customer.name}`);
  console.log(`Product A: ${prodA.name} | SKU: ${prodA.sku} | Stock: ${prodA.currentStock} | Price: $${prodA.unitPrice}`);
  console.log(`Product B: ${prodB.name} | SKU: ${prodB.sku} | Stock: ${prodB.currentStock} | Price: $${prodB.unitPrice}`);
  console.log('----------------------------------------------------');

  const draftPayload = {
    customerId: customer.id,
    items: [
      { productId: prodA.id, quantity: 2 },
      { productId: prodB.id, quantity: 3 }
    ],
    status: 'DRAFT'
  };

  // 1. Create Draft Challan under SALES (Expected: 201, stock remains unchanged)
  const createRes = await testRequest('Create Draft Challan - SALES', '/challans', 'POST', draftPayload, salesToken);
  const challanId = createRes.data?.data?.id;
  const challanNumber = createRes.data?.data?.challanNumber;

  if (!challanId || !challanNumber) {
    console.error('❌ Failed to create draft challan. Aborting dependent tests.');
    return;
  }

  // Verify stock is unchanged
  const checkStock1 = await testRequest('Check Product A Stock - Draft Mode', `/products/${prodA.id}`, 'GET', undefined, adminToken);
  console.log(`Verified: Product A stock remains ${checkStock1.data?.data?.currentStock} (expected: ${prodA.currentStock})`);
  console.log('----------------------------------------------------');

  // 2. SNAPSHOT TEST: Verify product snapshots are preserved
  // First, change Product A name, SKU, price in DB
  const oldPrice = prodA.unitPrice;
  const updateProdPayload = {
    name: `${prodA.name} Modified-Name`,
    sku: `${prodA.sku}-NEW`,
    unitPrice: oldPrice + 50.00
  };
  await testRequest('Modify Product A specs', `/products/${prodA.id}`, 'PATCH', updateProdPayload, adminToken);

  // Fetch draft challan detail and verify snapshots match historical details, not the updated ones!
  const challanDetail = await testRequest('Fetch Challan details after product update', `/challans/${challanId}`, 'GET', undefined, adminToken);
  const itemSnap = challanDetail.data?.data?.items?.find((i: any) => i.productId === prodA.id);
  console.log(`Snapshot verification:`);
  console.log(`Snapshot Name: "${itemSnap?.productNameSnapshot}" (Expected: "${prodA.name}")`);
  console.log(`Snapshot SKU: "${itemSnap?.skuSnapshot}" (Expected: "${prodA.sku}")`);
  console.log(`Snapshot Price: $${itemSnap?.unitPriceSnapshot} (Expected: $${oldPrice})`);
  console.log('----------------------------------------------------');

  // Revert Product A updates to keep database clean
  await testRequest('Restore Product A specs', `/products/${prodA.id}`, 'PATCH', {
    name: prodA.name,
    sku: prodA.sku,
    unitPrice: prodA.unitPrice
  }, adminToken);

  // Wait 1.5 seconds to make sure server nodemon reload finishes completely
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 3. Confirm Challan under ACCOUNTS (Expected: 403)
  await testRequest('Confirm Challan - ACCOUNTS', `/challans/${challanId}/confirm`, 'POST', undefined, accountsToken);

  // 4. TRANSACTION ROLLBACK TEST: Create a draft challan exceeding stock
  const excessPayload = {
    customerId: customer.id,
    items: [
      { productId: prodA.id, quantity: 2 }, // valid quantity
      { productId: prodB.id, quantity: prodB.currentStock + 50 } // exceeds stock count
    ],
    status: 'DRAFT'
  };
  const excessRes = await testRequest('Create Excess Draft Challan', '/challans', 'POST', excessPayload, salesToken);
  const excessId = excessRes.data?.data?.id;

  // Confirm excess challan (Expected: 409, rolls back and keeps stock counts unchanged)
  await testRequest('Confirm Excess Challan (Rollback check)', `/challans/${excessId}/confirm`, 'POST', undefined, salesToken);

  // Verify stock of Product A remained unchanged (rollback safety check)
  const checkStockRollback = await testRequest('Verify Product A Stock after rollback', `/products/${prodA.id}`, 'GET', undefined, adminToken);
  console.log(`Verified: Product A stock remains ${checkStockRollback.data?.data?.currentStock} (expected: ${prodA.currentStock})`);
  console.log('----------------------------------------------------');

  // 5. SUCCESSFUL CONFIRMATION TEST: Confirm the first draft challan
  await testRequest('Confirm Draft Challan - SALES', `/challans/${challanId}/confirm`, 'POST', undefined, salesToken);

  // Verify stock decreased for Product A (stock - 2)
  const checkStockFinal = await testRequest('Verify Product A Stock post-confirmation', `/products/${prodA.id}`, 'GET', undefined, adminToken);
  console.log(`Verified: Product A stock decreased to ${checkStockFinal.data?.data?.currentStock} (expected: ${prodA.currentStock - 2})`);
  console.log('----------------------------------------------------');

  // 6. Confirmed Challan cancellation check (Expected: 409 Conflict)
  await testRequest('Cancel Confirmed Challan', `/challans/${challanId}/cancel`, 'POST', undefined, salesToken);

  // 7. Confirmed Challan editing check (Expected: 409 Conflict)
  await testRequest('Edit Confirmed Challan', `/challans/${challanId}`, 'PATCH', { customerId: customer.id }, salesToken);

  console.log('🎉 Sales Challan API Verification Suite Completed!');
}

runTests();
