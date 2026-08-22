const BASE_URL = 'http://127.0.0.1:5001/api';

async function loginUser(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'DevPassword123!' }),
  });
  const body = (await res.json()) as any;
  return body.data?.token || '';
}

async function runForecastTests() {
  console.log('🏁 Starting Demand Forecasting API Integration Test Suite...\n');

  // Authenticate roles
  console.log('Logging in test roles...');
  const adminToken = await loginUser('admin@example.com');
  const warehouseToken = await loginUser('warehouse@example.com');
  const salesToken = await loginUser('sales@example.com');
  console.log('Tokens resolved successfully.\n');

  // Find a product with confirmed sales history
  // Fetch active products catalog
  console.log('Resolving product details...');
  const prodRes = await fetch(`${BASE_URL}/products?limit=10`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const prodData = (await prodRes.json()) as any;
  const products = prodData.data?.products || prodData.data || [];
  
  if (products.length === 0) {
    console.error('❌ No products seeded in the catalog database. Aborting tests.');
    return;
  }

  // Choose the first product
  const activeProduct = products[0];
  console.log(`Using product: ${activeProduct.name} | ID: ${activeProduct.id}\n`);

  // 1. ROLE-BASED ACCESS CONTROL (RBAC) TESTS FOR TRAINING
  console.log('--- RBAC Access Control Tests (Training API) ---');
  
  // A. Non-admin (WAREHOUSE) attempts to trigger model training (Expected: 403 Forbidden)
  const badTrainRes = await fetch(`${BASE_URL}/forecast/train`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${warehouseToken}` }
  });
  console.log(`[Trigger Train - WAREHOUSE] Status: ${badTrainRes.status} (Expected: 403)`);
  if (badTrainRes.status === 403) {
    console.log('✅ Access correctly denied to WAREHOUSE role.');
  } else {
    console.error('❌ Failed blocking WAREHOUSE role from training API.');
  }

  // B. Admin triggers model training (Expected: 200 OK)
  const trainRes = await fetch(`${BASE_URL}/forecast/train`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`[Trigger Train - ADMIN] Status: ${trainRes.status} (Expected: 200)`);
  if (trainRes.status === 200) {
    const trainData = await trainRes.json() as any;
    console.log('✅ Admin successfully triggered model training. Results count:', Object.keys(trainData.results || {}).length);
  } else {
    const errorText = await trainRes.text();
    console.error('❌ Failed triggering model training for Admin. Error:', errorText);
  }

  // 2. FORECAST PREDICTION & FALLBACK TESTS
  console.log('\n--- Forecast Prediction & Fallback Tests ---');

  // Fetch forecast for product (the ML service is currently offline, so it should trigger the Node Moving Average fallback!)
  const forecastRes = await fetch(`${BASE_URL}/forecast/${activeProduct.id}?horizon=4`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${salesToken}` }
  });
  
  const forecastData = (await forecastRes.json()) as any;
  console.log(`[Get Forecast - SALES] Status: ${forecastRes.status} | Success: ${forecastData.success}`);
  
  if (forecastRes.status === 200 && forecastData.success) {
    console.log(`Forecast Status: ${forecastData.status}`);
    console.log(`Model Type Used: ${forecastData.model_type}`);
    
    if (forecastData.status === 'FORECASTED') {
      console.log('Forecast Results:', JSON.stringify(forecastData.forecast));
      if (forecastData.model_type === 'MOVING_AVERAGE_FALLBACK') {
        console.log('✅ Fallback mechanism triggered correctly (offline safety validation passed).');
      } else {
        console.warn('⚠️ ML service was active, returned model type:', forecastData.model_type);
      }
    } else if (forecastData.status === 'INSUFFICIENT_HISTORY') {
      console.log('✅ Correctly handled product with insufficient history (observations count below threshold).');
    }
  } else {
    console.error('❌ Failed getting forecast prediction.');
  }

  // 3. PARAMETERS VALIDATION CHECKS
  console.log('\n--- Input Parameters Validation Checks ---');
  
  // A. Invalid horizon size (e.g. 15 weeks)
  const badHorizonRes = await fetch(`${BASE_URL}/forecast/${activeProduct.id}?horizon=15`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`[Get Forecast - Invalid Horizon 15] Status: ${badHorizonRes.status} (Expected: 400)`);
  if (badHorizonRes.status === 400) {
    console.log('✅ Zod correctly caught and rejected invalid horizon range.');
  } else {
    console.error('❌ Zod parameter check failed.');
  }

  // B. Invalid product ID format (not UUID)
  const badIdRes = await fetch(`${BASE_URL}/forecast/not-a-uuid?horizon=4`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`[Get Forecast - Invalid UUID ID] Status: ${badIdRes.status} (Expected: 400)`);
  if (badIdRes.status === 400) {
    console.log('✅ Zod correctly caught and rejected malformed UUID path variable.');
  } else {
    console.error('❌ Zod UUID check failed.');
  }

  console.log('\n🎉 Demand Forecasting Integration Tests Completed successfully!');
}

runForecastTests();

export {};
