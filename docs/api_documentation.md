# Mini ERP + CRM Portal REST API Reference Specifications

This document serves as the authoritative specification reference for the REST APIs available on the Mini ERP + CRM Operations Portal.

---

## 🔒 Security & Global Conventions

### Response Formats

#### Single Resource Success (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Optional descriptive execution message",
  "data": {
    "id": "uuid-string-here",
    "attribute": "value"
  }
}
```

#### Paginated List Success (HTTP 200)
```json
{
  "success": true,
  "message": "Resource lists fetched successfully",
  "data": [
    { "id": "uuid-1", "name": "Resource A" },
    { "id": "uuid-2", "name": "Resource B" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 24,
    "totalPages": 3
  }
}
```

#### Errors Response (HTTP 400 / 401 / 403 / 404 / 409 / 500)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 👥 Permission Matrix (RBAC)

| Endpoint | Path | Required Role(s) |
| --- | --- | --- |
| **Auth Login** | `POST /api/auth/login` | *Public* |
| **User Me** | `GET /api/auth/me` | *All authenticated users* |
| **Customers List** | `GET /api/customers` | `ADMIN`, `SALES`, `ACCOUNTS` |
| **Customer detail** | `GET /api/customers/:id` | `ADMIN`, `SALES`, `ACCOUNTS` |
| **Customer Create** | `POST /api/customers` | `ADMIN`, `SALES` |
| **Customer Edit** | `PATCH /api/customers/:id` | `ADMIN`, `SALES` |
| **Customer Follow-up** | `POST /api/customers/:id/follow-ups` | `ADMIN`, `SALES` |
| **Products List** | `GET /api/products` | `ADMIN`, `WAREHOUSE`, `SALES`, `ACCOUNTS` |
| **Product Detail** | `GET /api/products/:id` | `ADMIN`, `WAREHOUSE`, `SALES`, `ACCOUNTS` |
| **Product Create** | `POST /api/products` | `ADMIN`, `WAREHOUSE` |
| **Product Edit** | `PATCH /api/products/:id` | `ADMIN`, `WAREHOUSE` |
| **Movement List** | `GET /api/products/:id/stock-movements` | `ADMIN`, `WAREHOUSE`, `ACCOUNTS` |
| **Movement Create** | `POST /api/products/:id/stock-movements` | `ADMIN`, `WAREHOUSE` |
| **Inventory Low-Stock** | `GET /api/inventory/low-stock` | `ADMIN`, `WAREHOUSE`, `ACCOUNTS` |
| **Inventory Stats** | `GET /api/inventory/stats` | `ADMIN`, `WAREHOUSE`, `ACCOUNTS` |
| **Challans List** | `GET /api/challans` | `ADMIN`, `SALES`, `ACCOUNTS`, `WAREHOUSE` |
| **Challan Detail** | `GET /api/challans/:id` | `ADMIN`, `SALES`, `ACCOUNTS`, `WAREHOUSE` |
| **Challan Create** | `POST /api/challans` | `ADMIN`, `SALES` |
| **Challan Edit** | `PATCH /api/challans/:id` | `ADMIN`, `SALES` |
| **Challan Confirm** | `POST /api/challans/:id/confirm` | `ADMIN`, `SALES` |
| **Challan Cancel** | `POST /api/challans/:id/cancel` | `ADMIN`, `SALES` |

---

## 🔐 Authentication Module

### 1. User Authenticator
* **Method & URL**: `POST /api/auth/login`
* **Auth**: *None*
* **Request Body** (strict):
  ```json
  {
    "email": "admin@example.com",
    "password": "DevPassword123!"
  }
  ```
* **Success (200)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "fa8eb891-b3b3-4638-95d6-ec269c2dfca8",
        "name": "Administrator",
        "email": "admin@example.com",
        "role": "ADMIN"
      },
      "token": "jwt-token-string"
    }
  }
  ```
* **Errors**: `401 Unauthorized` (Invalid credentials), `400 Bad Request` (Validation errors).

### 2. Session Resolver
* **Method & URL**: `GET /api/auth/me`
* **Auth**: Bearer Token
* **Success (200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "fa8eb891-b3b3-4638-95d6-ec269c2dfca8",
      "name": "Administrator",
      "email": "admin@example.com",
      "role": "ADMIN",
      "createdAt": "2026-08-08T06:17:22.000Z"
    }
  }
  ```

---

## 👥 Customer CRM Module

### 1. Customers Directory list
* **Method & URL**: `GET /api/customers`
* **Auth**: Bearer Token
* **Query Parameters**:
  * `page` (optional): string-numeric, default `1`
  * `limit` (optional): string-numeric, default `10` (max 100)
  * `search` (optional): matched case-insensitively on name, business name, GST number, email, mobile.
  * `status` (optional): `LEAD` | `ACTIVE` | `INACTIVE`
  * `customerType` (optional): `RETAIL` | `WHOLESALE` | `DISTRIBUTOR`
  * `sortBy` (optional): `name` | `email` | `businessName` | `createdAt` | `updatedAt` | `followUpDate`
  * `sortOrder` (optional): `asc` | `desc`
* **Success (200)**: Paginated response listing customer cards.

### 2. Create Customer Profile
* **Method & URL**: `POST /api/customers`
* **Auth**: Bearer Token (ADMIN, SALES)
* **Request Body** (strict):
  ```json
  {
    "name": "Jane Doe",
    "mobile": "+1555123456",
    "email": "jane@example.com",
    "businessName": "Jane Enterprises",
    "gstNumber": "27AAACD1234A1Z1",
    "customerType": "RETAIL",
    "address": "123 High Street, London",
    "status": "LEAD",
    "notes": "Premium lead details"
  }
  ```

### 3. Log Follow-up Note
* **Method & URL**: `POST /api/customers/:id/follow-ups`
* **Auth**: Bearer Token (ADMIN, SALES)
* **Request Body** (strict):
  ```json
  {
    "note": "Spoke to customer. Schedule next calls",
    "followUpDate": "2026-08-15T00:00:00.000Z"
  }
  ```

---

## 📦 Product & Inventory Module

### 1. Products List
* **Method & URL**: `GET /api/products`
* **Auth**: Bearer Token
* **Query Parameters**:
  * `page`, `limit` (max 100)
  * `search`, `category`, `warehouseLocation`, `stockStatus` (`IN_STOCK` | `LOW_STOCK` | `OUT_OF_STOCK`)
  * `sortBy` (`name` | `sku` | `unitPrice` | `currentStock` | `createdAt`)
* **Success (200)**: Paginated listing.

### 2. Adjust Stock (Movements)
* **Method & URL**: `POST /api/products/:id/stock-movements`
* **Auth**: Bearer Token (ADMIN, WAREHOUSE)
* **Request Body** (strict):
  ```json
  {
    "quantityChanged": 10,
    "movementType": "IN",
    "reason": "Replenishment from supplier"
  }
  ```

---

## 📄 Sales Challan Module

### 1. Create Sales Challan
* **Method & URL**: `POST /api/challans`
* **Auth**: Bearer Token (ADMIN, SALES)
* **Request Body** (strict):
  ```json
  {
    "customerId": "customer-uuid",
    "items": [
      { "productId": "prod-uuid", "quantity": 5 }
    ],
    "status": "DRAFT"
  }
  ```

### 2. Confirm Challan
* **Method & URL**: `POST /api/challans/:id/confirm`
* **Auth**: Bearer Token (ADMIN, SALES)
* **Success (200)**: Mashes stock deduction, OUT movement logging, and updates status to `CONFIRMED`.
