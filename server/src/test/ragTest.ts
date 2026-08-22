import { evaluateInventoryRisk } from '../controllers/intelligence';
import { LocalVectorDb } from '../utils/vectorDb';

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

async function runRagTests() {
  console.log('🏁 Starting Inventory Risk & RAG AI Assistant Integration Test Suite...\n');

  // --- UNIT TEST 1: Risk Logic Classification & Math ---
  console.log('--- Test Case 1: Inventory Risk Logic Evaluation ---');
  
  const mockProduct = {
    id: 'p-100',
    name: 'Test Rebar steel',
    currentStock: 10,
    minimumStock: 20
  };

  // Scenario A: Demand depletes stock below 0 in week 1 (Expected: CRITICAL)
  const criticalForecast = [
    { date: '2026-08-24', quantity: 15 },
    { date: '2026-08-31', quantity: 10 }
  ];
  const criticalRisk = evaluateInventoryRisk(mockProduct, criticalForecast, 2);
  console.log(`[Critical Stockout] Risk: ${criticalRisk.riskLevel} | Reorder recommendation: ${criticalRisk.recommendedReorderQuantity}`);
  if (criticalRisk.riskLevel === 'CRITICAL' && criticalRisk.recommendedReorderQuantity === 35) {
    console.log('✅ Correctly flagged CRITICAL stock-out risk level and calculated safety bounds.');
  } else {
    console.error('❌ Failed Critical risk classification check.');
  }

  // Scenario B: Demand depletes stock below minimum threshold within 2 weeks (Expected: HIGH)
  const highForecast = [
    { date: '2026-08-24', quantity: 4 },
    { date: '2026-08-31', quantity: 4 }
  ];
  const highRisk = evaluateInventoryRisk(mockProduct, highForecast, 2);
  console.log(`[High Risk Violation] Risk: ${highRisk.riskLevel} | Reorder recommendation: ${highRisk.recommendedReorderQuantity}`);
  if (highRisk.riskLevel === 'HIGH' && highRisk.recommendedReorderQuantity === 18) {
    console.log('✅ Correctly flagged HIGH risk level and calculated reorders.');
  } else {
    console.error('❌ Failed High risk classification check.');
  }

  // --- UNIT TEST 2: Local TF-IDF Vector Search Cosine Similarities ---
  console.log('\n--- Test Case 2: Local TF-IDF Vector DB Search ---');
  const tempDb = LocalVectorDb.getInstance();
  tempDb.clear();

  tempDb.addDocument('PRODUCT', '1', 'Shirts of finished goods categories located in Warehouse-A', {});
  tempDb.addDocument('PRODUCT', '2', 'Heavy duty screwdrivers mechanical toolset items', {});
  tempDb.addDocument('PRODUCT', '3', 'Steel structural rebars and concrete support materials', {});

  const shirtHits = tempDb.search('shirts Warehouse');
  console.log(`Search query: "shirts Warehouse" | Hits resolved: ${shirtHits.length}`);
  if (shirtHits.length > 0 && shirtHits[0].document.entityId === '1') {
    console.log(`✅ TF-IDF correctly retrieved best document (ID: ${shirtHits[0].document.entityId}) with Cosine Score: ${(shirtHits[0].score * 100).toFixed(1)}%`);
  } else {
    console.error('❌ TF-IDF similarity search failed.');
  }

  // --- API INTEGRATION TESTS ---
  console.log('\n--- Test Case 3: API Integration & RAG Routing ---');
  
  console.log('Logging in admin token...');
  const token = await loginUser('admin@example.com');
  
  if (!token) {
    console.error('❌ Failed auth token lookup. Server is likely offline. Skip API tests.');
    return;
  }

  // A. Fetch Bulk Inventory Risk Intelligence
  const bulkRes = await fetch(`${BASE_URL}/inventory/intelligence`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const bulkData = await bulkRes.json() as any;
  console.log(`[GET /inventory/intelligence] Status: ${bulkRes.status} | Products analyzed: ${bulkData.results?.length}`);
  if (bulkRes.status === 200 && bulkData.success && bulkData.results?.length > 0) {
    console.log('✅ Bulk risk analytics evaluated successfully. First product risk:', bulkData.results[0].riskLevel);
  } else {
    console.error('❌ Bulk risk analytics API failed.');
  }

  // B. RAG AI Assistant - PATH 1: Structured Counts
  console.log('\nQuery: "How many products do we have?"');
  const countQueryRes = await fetch(`${BASE_URL}/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ question: 'How many products do we have?' })
  });
  const countData = await countQueryRes.json() as any;
  console.log(`[RAG Path: Structured] Status: ${countQueryRes.status}`);
  console.log(`AI Response: ${countData.answer}`);
  if (countQueryRes.status === 200 && countData.success && countData.answer.includes('products')) {
    console.log('✅ Structured count query routed and NLG generated correctly.');
  } else {
    console.error('❌ Structured query failed.');
  }

  // C. RAG AI Assistant - PATH 2: Semantic vector Search
  console.log('\nQuery: "Find products similar to Shirts"');
  const semQueryRes = await fetch(`${BASE_URL}/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ question: 'Find products similar to Shirts' })
  });
  const semData = await semQueryRes.json() as any;
  console.log(`[RAG Path: Semantic] Status: ${semQueryRes.status}`);
  console.log(`AI Response: ${semData.answer}`);
  if (semQueryRes.status === 200 && semData.success && semData.answer.includes('Shirts')) {
    console.log('✅ Semantic cosine search query matches catalog index successfully.');
  } else {
    console.error('❌ Semantic query failed.');
  }

  // D. RAG AI Assistant - PATH 3: Forecast / Stockout risks
  console.log('\nQuery: "Which products may run out next week?"');
  const mlQueryRes = await fetch(`${BASE_URL}/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ question: 'Which products may run out next week?' })
  });
  const mlData = await mlQueryRes.json() as any;
  console.log(`[RAG Path: ML Forecast] Status: ${mlQueryRes.status}`);
  console.log(`AI Response: ${mlData.answer}`);
  if (mlQueryRes.status === 200 && mlData.success && (mlData.answer.includes('RISK') || mlData.answer.includes('Low'))) {
    console.log('✅ ML forecast risk query executed and NLG formatted successfully.');
  } else {
    console.error('❌ ML query failed.');
  }

  console.log('\n🎉 RAG and Risk Intelligence Tests Completed successfully!');
}

runRagTests();

export {};
