# Nexus ERP + CRM Operations Portal

A premium, full-stack, recruiter-grade enterprise management platform designed for wholesale and distribution operations. Nexus ERP coordinates customer relationships (CRM), product cataloging, real-time inventory tracking with audit trails, and multi-item sales delivery challan workflows under a strict Role-Based Access Control (RBAC) permission model.

---

## 🚀 Live Deployments & API Documentation

- **Frontend Client (Vercel)**: [https://mini-erp-crm-operations-portal-vfo6-seven.vercel.app](https://mini-erp-crm-operations-portal-vfo6-seven.vercel.app)
- **Backend API (Render)**: [https://mini-erp-crm-operations-portal.onrender.com](https://mini-erp-crm-operations-portal.onrender.com)
- **API Health Check**: [https://mini-erp-crm-operations-portal.onrender.com/api/health](https://mini-erp-crm-operations-portal.onrender.com/api/health)
- **Postman Collection**: Located in the repository at [postman/mini-erp-crm.postman_collection.json](file:///Users/navadeepguduru/MINI%20ERP/postman/mini-erp-crm.postman_collection.json)

---

## 👥 Seeded Test Credentials

The system seeds default accounts with specific operational roles to test the permission model. All roles use the password: `DevPassword123!`

| Role | User Name | Email Address | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| **ADMIN** | System Administrator | `admin@example.com` | Full platform control, audit logs, and catalog editing. |
| **SALES** | Sales Representative | `sales@example.com` | Lead generation, customer profiles, follow-ups, and sales challans. |
| **WAREHOUSE** | Warehouse Manager | `warehouse@example.com` | Inventory levels, manual stock adjustments (IN/OUT), and specifications. |
| **ACCOUNTS** | Accounts Officer | `accounts@example.com` | Read-only access to CRM records, product pricing, and audit movements. |

---

## 💎 Key Features & Business Logic

### 1. Authentication & Security (RBAC)
- **Secure Sessions**: Token-based authentication using **JSON Web Tokens (JWT)**.
- **Route Protection**: Client-side protected routes (`ProtectedRoute` + `RequireRole`) coupled with server-side HTTP authorization middlewares.
- **Brute-Force Protection**: Rate limiter middleware configured specifically for authentication requests.

### 2. Customer CRM
- **Full Profile Registry**: Tracks customer name, business name, mobile, email, billing/delivery address, customer type (Retail, Wholesale, Distributor), status (Lead, Active, Inactive), and optional GST number (validated against 15-character GSTIN specifications).
- **Follow-up Interaction Logs**: Chronological timeline of customer notes, next follow-up scheduling, and recording of the agent who conducted the interaction.
- **Database Search**: Configured indexes on `name`, `email`, `businessName`, `status`, and `customerType` for fast case-insensitive lookups.

### 3. Product & Inventory Control
- **Unified Catalog**: Manages product titles, SKUs, category groups, unit pricing, current stock levels, safety threshold alerts, and warehouse rack locations.
- **Manual Stock Adjustments**: Restocking (IN) and Shrinkage/Disposal (OUT) logging.
- **Audit Trails**: Non-deletable `StockMovement` records logging quantity changes, direction, user, timestamp, and detailed justification.

### 4. Sales Challan Workflow
- **Line-item Multi-selection**: Allows drafts containing multiple items, matching quantities, and live price extensions.
- **Atomic Stock Deduction**: When transitioning a Challan from **Draft** to **Confirmed**, a transactional lock (`FOR UPDATE`) is placed on affected product records, ensuring database-level protection against negative stock and race conditions.
- **Data Snapshots**: Preserves historical product names, SKUs, and unit prices at the moment of Challan creation, insulating records from future catalog price modifications.
- **Status Lifecycles**: Strict lifecycle management: `DRAFT ──> CONFIRMED` (deducts stock) or `DRAFT ──> CANCELLED` (releases draft lock).

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: React.js (built on Vite with ES Modules)
- **Routing**: React Router DOM v6 (declarative protected layout routes)
- **State & Context**: Isolated `AuthProvider` and `UIProvider` for toast alerts and session persistence.
- **Interactive UI**: Custom Vanilla CSS system optimized for responsiveness, glassmorphic dark-theme controls, and micro-interactions.
- **3D Visualization**: **Three.js** with **React Three Fiber (R3F)** and **Drei** to render an interactive 3D node network mapping CRM, Inventory, and Sales on the landing page.
- **Icons**: Lucide React

### Backend (Server)
- **Framework**: Node.js with Express.js
- **Language**: TypeScript (enforces strict compilation rules)
- **ORM & Database**: Prisma ORM client with PostgreSQL
- **Validation**: Zod schema validators acting as boundary middleware for all request objects.
- **Logging**: Morgan HTTP logger
- **Environment**: dotenv configuration

---

## 📐 System Architecture

### Application Layers
```
[ React Client (Vite) ]  ──( REST API over HTTPS )──>  [ Express.js App ]
                                                             │
                                                             ├── morgan (Logger)
                                                             ├── rateLimit (Security)
                                                             ├── authenticate (JWT Middleware)
                                                             ├── validateRequest (Zod validation)
                                                             ↓
                                                       [ Controllers ]
                                                             │
                                                       [ Prisma Client ]
                                                             ↓
                                                    [ PostgreSQL Database ]
```

### Authentication & RBAC Flow
```
User ──> Input Credentials ──> POST /api/auth/login ──> JWT Issued ──> Saved in localStorage
                                                                              │
   ┌──────────────────────────────────────────────────────────────────────────┘
   ↓
Protected Request ──> Header: Bearer <Token> ──> JWT verify ──> authorize(['ADMIN', ...]) ──> Controller
```

---

## 🔒 Permission Matrix (RBAC)

The table below describes the authorization boundaries enforced on the **backend API layer** (unauthorized access returns `403 Forbidden`).

| Module | Endpoints | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Authentication** | `POST /login`, `GET /me` | ✔ | ✔ | ✔ | ✔ |
| **Dashboard** | `GET /dashboard/summary` | ✔ | ✔ | ✔ | ✔ |
| **Customers** | `GET /customers`, `GET /customers/:id` | ✔ | ✔ | ❌ | ✔ |
| **Customer Manage**| `POST /customers`, `PATCH /customers/:id` | ✔ | ✔ | ❌ | ❌ |
| **CRM Follow-Ups** | `POST /customers/:id/follow-ups` | ✔ | ✔ | ❌ | ❌ |
| **Product Catalog**| `GET /products`, `GET /products/:id` | ✔ | ✔ | ✔ | ✔ |
| **Catalog Manage** | `POST /products`, `PATCH /products/:id` | ✔ | ❌ | ✔ | ❌ |
| **Stock Adjustments**| `POST /products/:id/stock-movements` | ✔ | ❌ | ✔ | ❌ |
| **Stock Audits** | `GET /products/:id/stock-movements` | ✔ | ❌ | ✔ | ✔ |
| **Inventory Alerts**| `GET /inventory/low-stock`, `/stats` | ✔ | ❌ | ✔ | ✔ |
| **Sales Challans** | `GET /challans`, `GET /challans/:id` | ✔ | ✔ | ✔ | ✔ |
| **Challan Manage** | `POST /challans`, `PATCH /challans/:id` | ✔ | ✔ | ❌ | ❌ |
| **Challan Execution**| `POST /challans/:id/confirm`, `/cancel` | ✔ | ✔ | ❌ | ❌ |

---

## 🗄️ Database Design (Entity-Relationship)

The application uses Prisma to structure and validate database operations. Models are configured with specific cascading and restriction rules.

```mermaid
erDiagram
    User ||--o{ CustomerFollowUp : "records"
    User ||--o{ StockMovement : "registers"
    User ||--o{ SalesChallan : "issues"
    Customer ||--o{ CustomerFollowUp : "receives"
    Customer ||--o{ SalesChallan : "ordered by"
    Product ||--o{ StockMovement : "audited by"
    Product ||--o{ SalesChallanItem : "referenced in"
    SalesChallan ||--o{ SalesChallanItem : "contains"

    User {
        string id PK
        string name
        string email UK
        string passwordHash
        Role role
        datetime createdAt
    }

    Customer {
        string id PK
        string name
        string mobile
        string email
        string businessName
        string gstNumber
        CustomerType customerType
        string address
        CustomerStatus status
        datetime followUpDate
        string notes
    }

    CustomerFollowUp {
        string id PK
        string customerId FK
        string note
        datetime followUpDate
        string createdBy FK
        datetime createdAt
    }

    Product {
        string id PK
        string name
        string sku UK
        string category
        decimal unitPrice
        int currentStock
        int minimumStock
        string warehouseLocation
    }

    StockMovement {
        string id PK
        string productId FK
        int quantityChanged
        MovementType movementType
        string reason
        string createdBy FK
        datetime createdAt
    }

    SalesChallan {
        string id PK
        string challanNumber UK
        string customerId FK
        int totalQuantity
        ChallanStatus status
        string createdBy FK
        datetime createdAt
    }

    SalesChallanItem {
        string id PK
        string challanId FK
        string productId FK
        string productNameSnapshot
        string skuSnapshot
        decimal unitPriceSnapshot
        int quantity
    }
```

---

## 📂 Project Structure

```text
/
├── client/                     # React Frontend (Vite)
│   ├── public/                 # Static assets (favicons, manifest)
│   ├── src/
│   │   ├── assets/             # Brand logos & graphics
│   │   ├── components/         # Global widgets, guards (ProtectedRoute, RequireRole)
│   │   ├── hooks/              # Context hook providers (useAuth, useUI)
│   │   ├── layouts/            # App shell Layout system (Sidebar navigation portal)
│   │   ├── pages/              # Portal page views (Dashboard, CRM, Catalog, Challans)
│   │   ├── services/           # REST API fetch calls (api.js, auth.js, customer.js)
│   │   ├── utils/              # Utility helpers
│   │   ├── App.jsx             # Routes declaration manifest
│   │   └── main.jsx            # Application bootstrap
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Express Backend (TypeScript)
│   ├── src/
│   │   ├── config/             # Environment validation and app settings
│   │   ├── controllers/        # Route controllers (Auth, CRM, Challan transactions)
│   │   ├── middleware/         # Custom middlewares (auth validation, error handler)
│   │   ├── routes/             # API Router definitions
│   │   ├── services/           # Shared database client initializer
│   │   ├── validators/         # Request payload validations (Zod schemas)
│   │   ├── app.ts              # App configurations, CORS, and limits setup
│   │   └── server.ts           # Server start entrypoint
│   ├── prisma/                 # Database configurations
│   │   ├── schema.prisma       # Prisma client declarations & indexes
│   │   └── seed.ts             # Idempotent seeding script
│   └── package.json
│
├── docs/                       # System architectures & raw references
├── postman/                    # Exported Postman collections
└── package.json                # Workspace script manager
```

---

## 🧠 AI/ML Features & Pipelines

### 1. AI Bulk Excel Imports (Phase 2)
*   **Pipeline Flow**: Excel Upload ──> File Validation ──> Header Schema Mapping ──> Validation / Cleaning ──> Duplicate Detection ──> DB Ingestion.
*   **Header Mapping**: Automates mapping of spreadsheet columns to catalog schemas, allowing manual overrides.
*   **Duplicate Detection**: Compares incoming rows against database keys (emails, SKUs) and offers resolution alerts.

### 2. Demand Forecasting Microservice (Phase 3)
*   **Stack**: Python, FastAPI, Pandas, Scikit-Learn, XGBoost, Joblib.
*   **Aggregation**: Resamples sales transaction logs on Monday-based weekly boundaries (`W-MON`), filling empty periods with `0.0`.
*   **Evaluation & Selection**: Splits history (75% train, 25% validation), comparing Mean Absolute Error (MAE) and RMSE of XGBoost against a baseline. Serializes the best-performing model as a `.joblib` binary.
*   **Node.js High-Availability Fallback**: If the FastAPI microservice is unreachable, the Express backend automatically falls back to a locally computed 4-week Moving Average forecast, ensuring zero-downtime.

### 3. Inventory Risk Intelligence (Phase 4)
*   **Risk Metrics Evaluation**: Correlates active stocks with weekly demand predictions to project stockouts.
*   **Risk Classification Levels**:
    *   `CRITICAL`: Projected inventory drops below or equal to 0 within 2 weeks.
    *   `HIGH`: Projected stock drops below safety margins within 2 weeks or stockout within 4 weeks.
    *   `MEDIUM`: Projected stock drops below safety margins in weeks 3-4.
    *   `LOW`: Stable stock levels remaining above safety buffers.
*   **Reorder Suggestions**: Calculates reorder sizes: $\max(0, CumulativeDemand + SafetyStock - CurrentInventory)$.

### 4. RAG AI Assistant (Phase 4)
*   **Query Router**: Inspects queries to choose the best data source:
    *   *Structured counts/stats* -> relational database metrics.
    *   *Fuzzy catalog matches* -> local memory TF-IDF Vector Database.
    *   *Stockouts/depletion* -> ML forecasting and inventory risk models.
*   **Response Generation**: Gathers context into a structured markdown block:
    *   *Online Mode*: Calls the Google Gemini REST API (specifically `gemini-1.5-flash`) when `GEMINI_API_KEY` is configured.
    *   *Offline Mode*: Falls back to the custom local NLG engine.

---

## 📐 System Architecture

```text
                    [ REACT CLIENT (Vite) ]
                               │
                               ▼
                    [ NODE / EXPRESS SERVER ]
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
[ DATABASE (PostgreSQL) ]  [ ML MICROSERVICE ]  [ AI SERVICE (LLM) ]
 - Users / Catalog          - Python FastAPI     - Gemini REST API
 - Sales Challans           - XGBoost Forecasts  - Local NLG Fallback
 - Audit Movements          - joblib Binaries    - TF-IDF Vector DB
```

---

## 💻 Local Workspace Setup

### Prerequisites
*   **Node.js**: v18.0.0 or higher
*   **Python**: v3.12 (specifically recommended for scikit-learn/xgboost wheels compatibility)
*   **Database**: PostgreSQL instance

### Setup Steps

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Navadeep206/Mini-ERP-CRM-Operations-Portal.git
    cd Mini-ERP-CRM-Operations-Portal
    ```

2.  **Install Node Dependencies**:
    ```bash
    npm run install:all
    ```

3.  **Install Python ML Dependencies**:
    ```bash
    cd ml-service
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables**:
    *   Create a `/server/.env` file:
        ```env
        PORT=5001
        NODE_ENV=development
        DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME?schema=public"
        JWT_SECRET="your-super-secret-jwt-key"
        JWT_EXPIRES_IN="1d"
        CLIENT_URL="http://localhost:5173"
        ML_SERVICE_URL="http://127.0.0.1:8000"
        GEMINI_API_KEY="your-google-gemini-api-key-if-applicable"
        ```
    *   Create a `/client/.env` file:
        ```env
        VITE_API_URL="http://localhost:5001"
        ```

5.  **Sync database**:
    ```bash
    cd ../server
    npx prisma db push
    npx prisma db seed
    ```

6.  **Run Dev Servers**:
    *   Start Python microservice (port 8000):
        ```bash
        cd ../ml-service
        source venv/bin/activate
        uvicorn main:app --host 127.0.0.1 --port 8000
        ```
    *   Start Node and React dev servers (root folder):
        ```bash
        cd ..
        npm run dev
        ```

---

## ⚠️ Known Limitations & Assumptions
*   **GST Validation**: GST is stored as a string and validated for format length and regex constraints, but is not verified against external tax registries.
*   **Single-Location Inventory**: Assumes simple single-location warehouse bins for products, lacking multi-location transfer routing.
*   **Vector DB Portability**: Uses a memory-based TF-IDF search index, which rebuilds on boot or on catalog synchronization updates.
*   **Model Training Frequency**: The demand forecast model is trained offline when triggered by admins; online requests are served from the pre-serialized XGBoost or moving average fallback loops.

