import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Stable UUIDs for idempotent seeding
const USER_IDS = {
  admin: 'c3b88b77-cfc5-430c-ab22-ec9866384a65',
  sales: 'fa8eb891-b3b3-4638-95d6-ec269c2dfca8',
  warehouse: 'd7488fbb-71e1-4560-843b-3129845d8b7b',
  accounts: '0f8c85c2-f90b-4b10-8bde-d515a81e9b28',
};

const PRODUCT_IDS = {
  ledMonitor: '12d1b8ab-b0be-45a8-ac19-91ee6bdfeb5e',
  wirelessMouse: '5966a3d9-95ec-45ad-be9d-47209ca4e1a3',
  packingTape: '15d31294-f25b-49ea-9943-41bbd9426f8d',
  cardboardBox: 'bfeb9857-41ab-430f-b1e1-e1e3b6e828d5',
  stapler: '8114421b-10f8-450f-ad7b-6c4bbd5db8d9',
  printerPaper: 'a0280eb2-9d33-4df4-8d43-162751fbb3bd',
  hammer: 'c1d9df5d-4f1b-4cf7-be41-1188448ebf5d',
  screwdriverSet: 'a1914eb1-c91f-4cb1-80a9-f027814db5da',
};

const CUSTOMER_IDS = {
  megaCorp: '57a8a1eb-291d-44a6-89cd-cdb98bd5d848',
  techHub: '6b2bb857-9dbd-4c3e-8c43-2cbde85fdf68',
  retailDepot: 'dfa218eb-0e1b-4028-ac7c-ce22c7a45698',
  boxSmart: '1e19de5d-e2fb-4cf1-97ce-b695dbbf4f5d',
  fastCargo: '9a9de5d1-d2ab-44ab-b19b-c0f2095f9a65',
};

async function main() {
  console.log('🌱 Start seeding...');

  // Hash common password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('DevPassword123!', saltRounds);

  // 1. Seed Users
  console.log('User seeding...');
  const usersData = [
    { id: USER_IDS.admin, name: 'System Administrator', email: 'admin@example.com', role: Role.ADMIN },
    { id: USER_IDS.sales, name: 'Sales Representative', email: 'sales@example.com', role: Role.SALES },
    { id: USER_IDS.warehouse, name: 'Warehouse Manager', email: 'warehouse@example.com', role: Role.WAREHOUSE },
    { id: USER_IDS.accounts, name: 'Accounts Officer', email: 'accounts@example.com', role: Role.ACCOUNTS },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });
  }

  // 2. Seed Customers
  console.log('Customer seeding...');
  const customersData = [
    {
      id: CUSTOMER_IDS.megaCorp,
      name: 'MegaCorp Enterprises',
      mobile: '+15550192',
      email: 'procurement@megacorp.com',
      businessName: 'MegaCorp Global LLC',
      gstNumber: '29ABCDE1234F1Z5',
      customerType: CustomerType.DISTRIBUTOR,
      address: '100 Industrial Pkwy, Suite 400, Metro City',
      status: CustomerStatus.ACTIVE,
    },
    {
      id: CUSTOMER_IDS.techHub,
      name: 'TechHub Solutions',
      mobile: '+15550293',
      email: 'billing@techhub.io',
      businessName: 'TechHub Solutions Inc.',
      gstNumber: '27FGHIJ5678K2Z6',
      customerType: CustomerType.WHOLESALE,
      address: '42 Innovation Way, Silicon Valley',
      status: CustomerStatus.ACTIVE,
    },
    {
      id: CUSTOMER_IDS.retailDepot,
      name: 'Retail Depot Outlet',
      mobile: '+15550394',
      email: 'store-a@retaildepot.com',
      businessName: 'Retail Depot Ltd',
      gstNumber: null,
      customerType: CustomerType.RETAIL,
      address: '789 Commercial Blvd, Downtown',
      status: CustomerStatus.LEAD,
    },
    {
      id: CUSTOMER_IDS.boxSmart,
      name: 'BoxSmart Packaging Co',
      mobile: '+15550495',
      email: 'orders@boxsmart.com',
      businessName: 'BoxSmart Packaging Solutions',
      gstNumber: '19KLMNO9012L3Z7',
      customerType: CustomerType.DISTRIBUTOR,
      address: '12 Logistics Dr, Freight Harbor',
      status: CustomerStatus.ACTIVE,
    },
    {
      id: CUSTOMER_IDS.fastCargo,
      name: 'FastCargo Logistics',
      mobile: '+15550596',
      email: 'dispatch@fastcargo.net',
      businessName: 'FastCargo & Co.',
      gstNumber: '09PQRST3456M4Z8',
      customerType: CustomerType.WHOLESALE,
      address: '500 Transit Rd, Terminal 2',
      status: CustomerStatus.INACTIVE,
    },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        mobile: c.mobile,
        email: c.email,
        businessName: c.businessName,
        gstNumber: c.gstNumber,
        customerType: c.customerType,
        address: c.address,
        status: c.status,
      },
      create: c,
    });
  }

  // 3. Seed Products
  console.log('Product seeding...');
  const productsData = [
    {
      id: PRODUCT_IDS.ledMonitor,
      name: 'UltraWide 34" LED Monitor',
      sku: 'ELEC-MON-34W',
      category: 'Electronics',
      unitPrice: 349.99,
      currentStock: 45,
      minimumStock: 10,
      warehouseLocation: 'Aisle 4, Shelf B',
    },
    {
      id: PRODUCT_IDS.wirelessMouse,
      name: 'Ergonomic Wireless Mouse',
      sku: 'ELEC-MOU-WRL',
      category: 'Electronics',
      unitPrice: 24.50,
      currentStock: 120,
      minimumStock: 25,
      warehouseLocation: 'Aisle 4, Shelf C',
    },
    {
      id: PRODUCT_IDS.packingTape,
      name: 'Heavy Duty Packing Tape (6-Pack)',
      sku: 'PKG-TAP-HD',
      category: 'Packaging',
      unitPrice: 15.99,
      currentStock: 300,
      minimumStock: 50,
      warehouseLocation: 'Aisle 12, Shelf A',
    },
    {
      id: PRODUCT_IDS.cardboardBox,
      name: 'Double-Wall Cardboard Box 18x18x16',
      sku: 'PKG-BOX-DW18',
      category: 'Packaging',
      unitPrice: 2.75,
      currentStock: 500,
      minimumStock: 100,
      warehouseLocation: 'Aisle 15, Bulk A',
    },
    {
      id: PRODUCT_IDS.stapler,
      name: 'Professional Desktop Stapler',
      sku: 'OFF-STP-PRO',
      category: 'Office Supplies',
      unitPrice: 12.00,
      currentStock: 80,
      minimumStock: 15,
      warehouseLocation: 'Aisle 2, Shelf D',
    },
    {
      id: PRODUCT_IDS.printerPaper,
      name: 'Premium A4 Printer Paper (Ream)',
      sku: 'OFF-PAP-A4P',
      category: 'Office Supplies',
      unitPrice: 6.50,
      currentStock: 400,
      minimumStock: 75,
      warehouseLocation: 'Aisle 1, Shelf B',
    },
    {
      id: PRODUCT_IDS.hammer,
      name: 'Claw Hammer 16oz',
      sku: 'HDW-HAM-16',
      category: 'Hardware',
      unitPrice: 18.25,
      currentStock: 65,
      minimumStock: 12,
      warehouseLocation: 'Aisle 7, Shelf F',
    },
    {
      id: PRODUCT_IDS.screwdriverSet,
      name: 'Magnetic Screwdriver Set (12-Piece)',
      sku: 'HDW-SCR-M12',
      category: 'Hardware',
      unitPrice: 29.99,
      currentStock: 50,
      minimumStock: 10,
      warehouseLocation: 'Aisle 7, Shelf G',
    },
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        category: p.category,
        unitPrice: p.unitPrice,
        currentStock: p.currentStock,
        minimumStock: p.minimumStock,
        warehouseLocation: p.warehouseLocation,
      },
      create: p,
    });
  }

  // 4. Seed Stock Movements
  console.log('Stock Movement seeding...');
  // We can delete existing stock movements during seeding to avoid duplicate tracking in dev
  await prisma.stockMovement.deleteMany({});

  const movementsData = [
    {
      productId: PRODUCT_IDS.ledMonitor,
      quantityChanged: 50,
      movementType: MovementType.IN,
      reason: 'Initial supplier shipment receipt',
      createdBy: USER_IDS.warehouse,
    },
    {
      productId: PRODUCT_IDS.ledMonitor,
      quantityChanged: 5,
      movementType: MovementType.OUT,
      reason: 'Internal testing batch dispatch',
      createdBy: USER_IDS.admin,
    },
    {
      productId: PRODUCT_IDS.packingTape,
      quantityChanged: 300,
      movementType: MovementType.IN,
      reason: 'Standard stock replenishment',
      createdBy: USER_IDS.warehouse,
    },
    {
      productId: PRODUCT_IDS.hammer,
      quantityChanged: 70,
      movementType: MovementType.IN,
      reason: 'Vendor bulk purchase delivery',
      createdBy: USER_IDS.warehouse,
    },
    {
      productId: PRODUCT_IDS.hammer,
      quantityChanged: 5,
      movementType: MovementType.OUT,
      reason: 'Damaged item return',
      createdBy: USER_IDS.warehouse,
    },
  ];

  for (const m of movementsData) {
    await prisma.stockMovement.create({
      data: m,
    });
  }

  console.log('🌱 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
