# Mini ERP + CRM Operations Portal

This repository contains the production-quality codebase foundation for a Mini ERP & CRM Operations Portal. It uses a monorepo-style organization separating frontend and backend code.

---

## Project Overview

The Mini ERP + CRM Operations Portal is designed to stream operations, handle customer relationship management, track products, manage inventories, generate challans, and maintain real-time logging/audit trails.

This phase sets up the core infrastructure, routing, middleware, standard configuration modules, and type systems.

---

## Tech Stack

### Frontend (Client)
- **Framework**: React.js (JavaScript, scaffolded via Vite)
- **Routing**: React Router DOM (v6)
- **Icons**: Lucide React
- **Styling**: Premium custom Vanilla CSS (supporting responsive layout, sidebar navbar portal shell)

### Backend (Server)
- **Framework**: Node.js, Express
- **Language**: TypeScript (with strict mode verification)
- **ORM**: Prisma ORM
- **Database**: PostgreSQL (eventually configured for Neon/Supabase)
- **Validation**: Zod
- **Logging**: Morgan HTTP logger
- **Environment**: dotenv

---

## Project Structure

```text
/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── assets/         # Images, fonts, and icons
│   │   ├── components/     # Reusable layout and UI elements
│   │   ├── hooks/          # Custom react hooks
│   │   ├── layouts/        # Application shell (AppLayout)
│   │   ├── pages/          # Route level page views
│   │   ├── services/       # API call handlers
│   │   ├── utils/          # Client-side helpers
│   │   ├── App.jsx         # App router and bootstrap config
│   │   ├── index.css       # Premium custom global styling
│   │   └── main.jsx        # App entry point
│   ├── .env.example        # Frontend environment template
│   └── package.json        # Frontend dependencies
├── server/                 # Express backend (TypeScript)
│   ├── src/
│   │   ├── config/         # App configuration parameters
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom Express middleware (central error handler, logger)
│   │   ├── routes/         # Express endpoint definitions
│   │   ├── services/       # Business logic / Prisma helpers
│   │   ├── utils/          # Shared server-side helper modules
│   │   ├── validators/     # Request body validators (Zod schemas)
│   │   ├── app.ts          # Express application setup
│   │   └── server.ts       # Server runtime entrypoint
│   ├── prisma/             # Prisma schema & migrations
│   │   └── schema.prisma
│   ├── .env.example        # Server environment template
│   ├── package.json        # Server dependencies
│   └── tsconfig.json       # Strict TypeScript configuration
├── docs/                   # Architectural plans, design mockups, systems flow
└── postman/                # Exported Postman collection JSON
```

---

## Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (v9 or higher)
- PostgreSQL database (or an online instance from Neon/Supabase)

### Setup Steps
1. **Clone and Install Workspace Dependencies**
   From the root of this project:
   ```bash
   npm run install:all
   ```
   This will install all root dev tools, and recursively run `npm install` inside both the `client/` and `server/` directories.

2. **Configure Environment Variables**
   - Copy `server/.env.example` to `server/.env` and update the `DATABASE_URL` with your PostgreSQL connection string.
   - Copy `client/.env.example` to `client/.env` and specify `VITE_API_URL`.

3. **Prisma Client Generation**
   In the `server` directory, run:
   ```bash
   npx prisma generate
   ```

---

## Development Commands

Run these scripts from the project root:

| Command | Action |
| :--- | :--- |
| `npm run install:all` | Installs root, client, and server dependencies. |
| `npm run dev` | Runs both client (Vite) and server (Express) concurrently. |
| `npm run dev:client` | Runs only the React client dev server. |
| `npm run dev:server` | Runs only the Express TypeScript backend. |
| `npm run build` | Builds both frontend assets and compiles backend TypeScript. |
| `npm run build:client` | Runs frontend Vite build. |
| `npm run build:server` | Compiles server TypeScript files. |

---

## Planned Modules (Future Phases)

- **Authentication & Authorization**: JWT token auth, path-level role access (Admin, Operator, Manager).
- **Customer CRM**: Management of customer registry, billing logs, and interaction records.
- **Inventory & Product Catalog**: Stock tracking, automatic threshold alerts, product tags.
- **Challan generation**: Delivery challenge workflows, transaction logs, PDF printing support.
