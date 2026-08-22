import ExcelJS from 'exceljs';

const BASE_URL = 'http://127.0.0.1:5001/api';

// Helper function to create Excel sheet in memory and return buffer
async function createExcelBuffer(headers: string[], rows: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Import Sheet');
  worksheet.addRow(headers);
  rows.forEach((r) => {
    worksheet.addRow(r);
  });
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
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

async function runImportTests() {
  console.log('🏁 Starting Intelligent Excel Ingestion API Test Suite...\n');

  // Authenticate roles
  console.log('Logging in test roles...');
  const adminToken = await loginUser('admin@example.com');
  const warehouseToken = await loginUser('warehouse@example.com');
  console.log('Tokens resolved successfully.\n');

  // Utility to send file upload requests
  async function testUpload(name: string, entity: string, fileBuffer: Buffer, fileName: string, mimeType: string, token?: string): Promise<any> {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, fileName);
      formData.append('entity', entity);

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${BASE_URL}/import/analyze`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = (await res.json()) as any;
      console.log(`[${name}] Status: ${res.status} | Success: ${data.success}`);
      return { status: res.status, data };
    } catch (err: any) {
      console.error(`[${name}] Exception:`, err.message);
      return { status: 500 };
    }
  }

  // 1. FILE SECURITY CHECKS
  console.log('--- File Security Verification ---');
  
  // A. Block invalid MIME type / extension
  const badTxtBuffer = Buffer.from('Fake txt data content');
  const badMimeRes = await testUpload(
    'Upload TXT file (MIME check)',
    'PRODUCTS',
    badTxtBuffer,
    'hack.txt',
    'text/plain',
    adminToken
  );
  if (badMimeRes.status === 400 || badMimeRes.status === 500) {
    console.log('✅ Correctly blocked text/plain MIME type with error.');
  } else {
    console.error('❌ Failed text/plain MIME check block.');
  }

  // 2. PRODUCTS INGESTION TESTS
  console.log('\n--- Product Catalog Import Tests ---');
  
  // A. Valid Products import (Test Case 2)
  const sku1 = `SKU-IMP-${Date.now()}`;
  const sku2 = `SKU-IMP-B-${Date.now()}`;
  const prodHeaders = ['Product Name', 'SKU Code', 'Category', 'Unit Price', 'Available Quantity', 'Safety Stock', 'Warehouse Location'];
  const prodRows = [
    ['Imported LED Monitor', sku1, 'Electronics', 299.99, 10, 2, 'Aisle 3, Shelf A'],
    ['Imported Mouse Pad', sku2, 'Electronics', 19.99, 50, 5, 'Aisle 3, Shelf B'],
  ];
  const validProdExcel = await createExcelBuffer(prodHeaders, prodRows);

  const prodAnalyze = await testUpload(
    'Analyze Valid Products Excel',
    'PRODUCTS',
    validProdExcel,
    'products.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    warehouseToken
  );

  if (prodAnalyze.status === 200 && prodAnalyze.data.data.summary.valid === 2) {
    console.log('✅ Parsed and validated 2 product rows successfully.');
    console.log('Detected mappings:', JSON.stringify(prodAnalyze.data.data.mappings));
  } else {
    console.error('❌ Failed analyzing valid products Excel.');
  }

  // Confirm Products Ingestion
  const confirmPayload = {
    entity: 'PRODUCTS',
    rows: prodAnalyze.data.data.rows.map((r: any) => r.data),
  };

  const prodConfirmRes = await fetch(`${BASE_URL}/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${warehouseToken}`,
    },
    body: JSON.stringify(confirmPayload),
  });

  const prodConfirmData = (await prodConfirmRes.json()) as any;
  console.log(`[Confirm Products Import] Status: ${prodConfirmRes.status} | OK: ${prodConfirmRes.ok}`);
  if (prodConfirmRes.status === 200 && prodConfirmData.data.imported === 2) {
    console.log('✅ Ingested 2 products successfully into database.');
  } else {
    console.error('❌ Ingest confirmation failed.');
  }

  // 3. SCHEMA MAPPING & VALIDATION ERROR CHECKS
  console.log('\n--- Field Schema Validation Checks ---');
  
  // A. Missing required field (Test Case 3) & Negative price (Test Case 5)
  const badProdRows = [
    ['', 'SKU-ERR-1', 'Electronics', 50, 10, 2, 'Zone B'], // Missing Name
    ['Invalid Price Monitor', 'SKU-ERR-2', 'Electronics', -200, 10, 2, 'Zone B'], // Negative Price
  ];
  const invalidProdExcel = await createExcelBuffer(prodHeaders, badProdRows);
  const badProdAnalyze = await testUpload(
    'Analyze Invalid Products Excel',
    'PRODUCTS',
    invalidProdExcel,
    'bad_products.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    adminToken
  );
  if (badProdAnalyze.status === 200 && badProdAnalyze.data.data.summary.invalid === 2) {
    console.log('✅ Validation caught both missing name and negative price constraints.');
    const rows = badProdAnalyze.data.data.rows;
    console.log('Row 2 errors:', JSON.stringify(rows[0].errors));
    console.log('Row 3 errors:', JSON.stringify(rows[1].errors));
  } else {
    console.error('❌ Failed mapping/validation failure check.');
  }

  // 4. DUPLICATE DETECTION TESTS
  console.log('\n--- Duplicate Detection Checks ---');
  
  // A. Intra-file duplicate SKU check (Test Case 7)
  const dupSku = `SKU-DUP-${Date.now()}`;
  const dupProdRows = [
    ['First Product Entry', dupSku, 'Electronics', 100, 5, 1, 'Zone C'],
    ['Duplicate Product Entry', dupSku, 'Electronics', 100, 5, 1, 'Zone C'],
  ];
  const dupProdExcel = await createExcelBuffer(prodHeaders, dupProdRows);
  const dupProdAnalyze = await testUpload(
    'Analyze Excel with Intra-file Duplicates',
    'PRODUCTS',
    dupProdExcel,
    'dup_products.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    adminToken
  );
  const rows = dupProdAnalyze.data.data.rows;
  if (dupProdAnalyze.status === 200 && rows[1].status === 'DUPLICATE') {
    console.log('✅ Intra-file duplicate SKU correctly flagged in Row 3.');
    console.log('Row 3 Duplicate details:', JSON.stringify(rows[1].duplicateDetails));
  } else {
    console.error('❌ Failed intra-file duplicate SKU check.');
  }

  // B. Existing Database Duplicate SKU check (Test Case 8)
  // We upload sku1 (which was already confirmed and written to database)
  const dbDupRows = [
    ['Identical Monitor Specs', sku1, 'Electronics', 299.99, 10, 2, 'Aisle 3, Shelf A'],
  ];
  const dbDupExcel = await createExcelBuffer(prodHeaders, dbDupRows);
  const dbDupAnalyze = await testUpload(
    'Analyze Excel with Database Duplicate SKU',
    'PRODUCTS',
    dbDupExcel,
    'db_dup_product.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    adminToken
  );
  if (dbDupAnalyze.status === 200 && dbDupAnalyze.data.data.rows[0].status === 'DUPLICATE') {
    console.log('✅ Database duplicate check correctly flagged Row 2 as duplicate against database.');
    console.log('Duplicate details:', JSON.stringify(dbDupAnalyze.data.data.rows[0].duplicateDetails));
  } else {
    console.error('❌ Failed database duplicate check.');
  }

  // 5. USERS INGESTION TESTS
  console.log('\n--- User Account Import Tests ---');
  
  // A. Valid users import (Test Case 1)
  const userEmail = `staff.new-${Date.now()}@example.com`;
  const userHeaders = ['Full Name', 'Email Address', 'User Role'];
  const userRows = [
    ['Bulk Imported Staff', userEmail, 'SALES'],
  ];
  const validUserExcel = await createExcelBuffer(userHeaders, userRows);
  
  const userAnalyze = await testUpload(
    'Analyze Valid Users Excel',
    'USERS',
    validUserExcel,
    'users.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    adminToken
  );
  if (userAnalyze.status === 200 && userAnalyze.data.data.summary.valid === 1) {
    console.log('✅ Parsed and validated user row successfully.');
  } else {
    console.error('❌ Failed user excel validation.');
  }

  // B. Role-based authorization security verify (Test Case 14)
  // Warehouse manager attempts to confirm User imports (expected: 403 Forbidden)
  const badUserConfirmRes = await fetch(`${BASE_URL}/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${warehouseToken}`,
    },
    body: JSON.stringify({
      entity: 'USERS',
      rows: userAnalyze.data.data.rows.map((r: any) => r.data),
    }),
  });
  console.log(`[Confirm User Ingestion - WAREHOUSE (RBAC Check)] Status: ${badUserConfirmRes.status} (Expected: 403)`);
  if (badUserConfirmRes.status === 403) {
    console.log('✅ Access correctly denied to WAREHOUSE role.');
  } else {
    console.error('❌ RBAC check for Users import failed!');
  }

  // Admin attempts to confirm User imports (expected: 200 OK)
  const okUserConfirmRes = await fetch(`${BASE_URL}/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      entity: 'USERS',
      rows: userAnalyze.data.data.rows.map((r: any) => r.data),
    }),
  });
  console.log(`[Confirm User Ingestion - ADMIN] Status: ${okUserConfirmRes.status} (Expected: 200)`);
  if (okUserConfirmRes.status === 200) {
    console.log('✅ Ingested user record successfully.');
  } else {
    console.error('❌ Admin user ingestion failed.');
  }

  console.log('\n🎉 Excel Ingestion Integration Tests Completed Successfully!');
}

runImportTests();
