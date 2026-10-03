# SalesIQ AI Dashboard — Project Context

> **Purpose of this file:** This document gives any AI model or developer a complete understanding of the SalesIQ project — architecture, tech stack, file map, data model, role system, key algorithms, and conventions — so they can work on the codebase without reading every file first. Read this first, then dive into specific files as needed.

---

## 1. What Is SalesIQ?

SalesIQ is a **production-grade retail business management web application** for:
- Point-of-sale billing (with FEFO batch deduction for perishables)
- Product catalog & inventory management (stock alerts, batch expiry tracking)
- Sales analytics & reporting (PDF, Excel, CSV, JSON exports)
- AI-powered business insights & demand forecasting (Google Gemini)
- Multi-tenant admin/staff role system with real-time data sync
- Demo/simulation mode for academic presentations

---

## 2. Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Vanilla HTML5 + CSS3 + ES Modules | No React/Vue/Angular. Pages use `<script type="module">`. Runs on any HTTP server (e.g. VS Code Live Server) |
| **CSS Framework** | Tailwind CSS v3.4.19 | Precompiled from `css/tailwind-src.css` → `css/tailwind.css` via `npm run build:css`. Some pages still use CDN (`<script src="https://cdn.tailwindcss.com">`) — this is a known inconsistency |
| **Custom Styling** | `css/shared.css`, `css/liquid-glass.css`, `css/auth.css` | CSS variables for theming, glassmorphism panels, 3D tilt cards, animated background gradients |
| **Backend/DB** | Firebase v10.12.4 | Firebase Authentication (email/password + Google OAuth) and Cloud Firestore (NoSQL) |
| **Charts** | Chart.js v4.4.1 (UMD) | Auto dark/light theme sync. Factory helper in `js/shared.js` (`makeChart`) |
| **AI** | Google Gemini API | Multi-model orchestrator with automatic quota failover in `js/gemini-service.js` |
| **Exports** | SheetJS (XLSX v0.18.5), jsPDF | PDF invoices, Excel spreadsheets, CSV, JSON database backups |
| **Package Manager** | npm | `package.json` has Tailwind build scripts and pptxgenjs |

---

## 3. Complete File & Directory Map

```
SalesIQ-AI-Dashboard/
├── CONTEXT.md                     ← YOU ARE HERE
├── .gitignore
├── package.json                   # npm metadata, Tailwind build scripts
├── tailwind.config.js             # Tailwind content scanning & custom keyframes
├── README.md                      # Setup instructions & architecture notes
├── FEATURES.txt                   # Feature checklist
├── firestore-rules.txt            # Firestore security rules (RBAC + tenant scoping)
├── 404.html                       # Fallback error page
├── index.html                     # Landing/showcase page
├── login.html                     # 3D interactive login portal
├── register.html                  # Registration with role selection
├── profile.html                   # User profile editing & theme selector
│
├── css/
│   ├── tailwind-src.css           # Tailwind @base/@components/@utilities directives
│   ├── tailwind.css               # Compiled Tailwind distribution (minified)
│   ├── shared.css                 # Base theme variables, .glass panels, skeleton loaders, buttons, tables
│   ├── liquid-glass.css           # Glassmorphism backdrop, animated light lines, mousemove effects
│   └── auth.css                   # 3D perspective, floating cubes, auth page orbs
│
├── js/
│   ├── firebase-config.js         # Firebase app init, Auth, Firestore refs, Gemini API constants
│   ├── account.js                 # Role resolution, profile fetching, last-login tracking
│   ├── auth.js                    # Email/password & Google OAuth login/register handlers
│   ├── auth-3d.js                 # 3D mouse tilt interaction on auth cards
│   ├── shared.js                  # ★ CORE UTILITY: requireAuth, initAppShell, cache layer,
│   │                              #   makeChart, formatters (money, dateText), fetchFromFirestore,
│   │                              #   watchCollection (real-time listeners)
│   ├── gemini-service.js          # ★ AI ENGINE: Multi-model Gemini orchestrator, quota failover,
│   │                              #   Excel header mapping, synonym fallback dictionary
│   ├── demo-live-data.js          # Background sales simulator with multi-tab lock
│   ├── fallback-ui.js             # Skeleton/empty state fallback for offline/slow connections
│   ├── landing.js                 # Landing page chart and animation initiator
│   ├── liquid-glass.js            # Global mouse-tracker and magnetic tilt button effects
│   └── profile.js                 # Profile updates & theme toggling
│
├── admin/                         # ★ ADMIN PANEL (full access)
│   ├── dashboard.html             # Main overview: KPI tiles, resizable layout, live demo controls
│   ├── products.html              # Product CRUD, batch inspection, AI Excel/CSV import
│   ├── inventory.html             # Stock management, fast/slow movers, batch expiry tracking
│   ├── sales.html                 # Sales journal with filtering, deletion, CSV export
│   ├── add-sale.html              # POS billing terminal with FEFO batch deduction
│   ├── forecasting.html           # Demand forecasting: weighted moving average + Gemini predictions
│   ├── ai-insights.html           # AI business copilot & health diagnostics
│   ├── analytics.html             # Multi-chart performance breakdown
│   ├── customers.html             # Customer directory with loyalty tagging
│   ├── suppliers.html             # Supplier registry
│   ├── purchases.html             # Restock order logger with batch creation
│   ├── reports.html               # Multi-format report builder (PDF/Excel/CSV/JSON)
│   ├── users.html                 # Admin & staff team management, invitations
│   ├── notifications.html         # Real-time alert feed
│   ├── settings.html              # Shop config, currency, Gemini API key manager
│   ├── cleanup-duplicates.js      # Utility for removing duplicate SKU entries
│   ├── css/admin.css              # Admin-specific styles: column resizer, drag-drop, layout
│   └── js/
│       ├── dashboard.js           # Dashboard state, drag-drop tiles, date filters, charts
│       ├── products.js            # Catalog management, Excel import modal, schema validation
│       ├── inventory.js           # Stock thresholds, nearest expiry, manual updates
│       ├── sales.js               # Sales log rendering, deletion guards, CSV exports
│       ├── add-sale.js            # Admin billing POS, FEFO batch selection, invoice generation
│       ├── forecasting.js         # Math regression, stockout prediction, Gemini forecast
│       ├── ai-insights.js         # AI prompt library, store analytics, Gemini integration
│       ├── analytics.js           # Aggregate calculations for 6 Chart.js visualizations
│       ├── customers.js           # Customer record management and search
│       ├── suppliers.js           # Supplier management and restock linking
│       ├── purchases.js           # Stock increment transactions, batch entry logging
│       ├── reports.js             # jsPDF and SheetJS export orchestrator
│       ├── users.js               # Staff search, invitations, status gating
│       ├── notifications.js       # Live notification stream management
│       ├── settings.js            # Settings persistence & Gemini connection testing
│       └── demoSeeder.js          # Full database seeder (products, suppliers, customers, sales)
│
├── sales/                         # ★ SALES STAFF PANEL (restricted access)
│   ├── dashboard.html             # Staff personal performance dashboard
│   ├── add-sale.html              # Restricted POS billing (stock-decrement only)
│   ├── my-sales.html              # Personal transaction history
│   ├── stock-view.html            # Read-only stock inventory viewer
│   ├── css/sales.css              # Staff green-accent theme overrides
│   └── js/
│       ├── dashboard.js           # Staff KPIs, personal sales chart, invitation banner
│       ├── add-sale.js            # Staff billing with admin-scoping and FEFO
│       ├── my-sales.js            # Staff personal sales filters and exports
│       └── stock-view.js          # Stock catalog, auto-connection to admin
│
├── superadmin/                    # ★ SUPER ADMIN (system-wide oversight)
│   ├── dashboard.html             # Master overview across all tenants
│   └── js/dashboard.js            # Cross-tenant admin/staff supervision and deletion
│
└── ChartsForPpt/                  # Presentation assets
    ├── FinalFlowChart.txt         # PlantUML system activity flowchart
    ├── UseCaseChart.txt           # PlantUML use-case specification
    └── *.png                      # Rendered UML diagrams
```

---

## 4. Authentication & Role System (3-Tier RBAC)

### Roles

| Role | Storage | Identification | Access Level |
|---|---|---|---|
| **Super Admin** | Hardcoded | Email `boss@gmail.com` in `js/account.js` | System-wide: read/delete all admins & staff |
| **Admin** | `admins` collection (doc ID = `user.uid`) | `role: "Admin"` field | Full CRUD on own tenant's data (products, sales, inventory, etc.) |
| **Sales Staff** | `staff` collection (doc ID = `user.uid`) | `role: "Sales Staff"` field + `adminId` linking | Create sales, decrement stock, read products/customers. Cannot delete sales, edit prices, or manage suppliers |

### Auth Flow (`js/shared.js` → `requireAuth(allowedRoles)`)
1. **Optimistic path:** Reads cached profile from `localStorage` key `salesiq_user`. If valid & active, page loads instantly (0ms) while silently validating via `onAuthStateChanged` in the background.
2. **Role redirection:** Admin accessing `/sales/` → redirected to `/admin/dashboard.html`. Staff accessing `/admin/` → redirected to `/sales/dashboard.html`.
3. **Deactivated accounts:** `status === "inactive"` → `signOut(auth)` + redirect to `login.html?inactive=1`.

### Staff-to-Admin Connection
- Admin searches for staff by email/name in `admin/js/users.js` and sends an invitation (`pendingRequest`).
- Staff sees Accept/Reject banner on login (`sales/js/dashboard.js`).
- Auto-fallback: If only one Admin exists, unconnected staff auto-link to them (`sales/js/stock-view.js`).

---

## 5. Firestore Database Schema

### Collections & Fields

| Collection | Key Fields | Tenant Scoped? |
|---|---|---|
| `admins` | `name`, `email`, `role`, `status`, `photoURL`, `createdAt`, `lastLoginAt` | By `uid` |
| `staff` | `name`, `email`, `role`, `status`, `adminId`, `adminName`, `adminEmail`, `pendingRequest` | By `adminId` |
| `products` | `name`, `sku`, `category`, `price`, `costPrice`, `stock`, `minStock`, `status`, `adminId`, `source`, `isDemo` | By `adminId` |
| `productBatches` | `productId`, `batchNumber`, `quantity`, `manufactureDate`, `expiryDate`, `adminId` | By `adminId` |
| `sales` | `invoiceNumber`, `productName`, `productId`, `quantity`, `totalAmount`, `salespersonId`, `salespersonName`, `salespersonEmail`, `source`, `adminId`, `paymentMethod`, `createdAt`, `isDemo` | By `adminId` |
| `customers` | `name`, `email`, `phone`, `totalSpent`, `orderCount`, `adminId` | By `adminId` |
| `suppliers` | `name`, `email`, `phone`, `category`, `paymentStatus`, `adminId` | By `adminId` |
| `purchases` | `productId`, `productName`, `quantity`, `costPrice`, `supplierId`, `adminId`, `batchNumber`, `expiryDate` | By `adminId` |
| `notifications` | `title`, `message`, `type`, `read`, `adminId`, `createdAt` | By `adminId` |
| `businessSettings` | `storeName`, `taxRate`, `currency`, `geminiApiKey`, `adminId` | By `adminId` |

### Security Rules (see `firestore-rules.txt`)
- **Tenant isolation:** All queries filter by `adminId === request.auth.uid` (admin) or `adminId === resource.data.adminId` (staff).
- **`stockOnlyUpdate()` guard:** Staff can only modify `stock`, `status`, `updatedAt` fields on products — cannot change prices, names, or SKUs.

---

## 6. Key Architectural Patterns

### 6.1 Client-Side Cache (Stale-While-Revalidate)
Located in `js/shared.js`:
- **In-memory:** `Map` object for instant access during session
- **Persistent:** `localStorage` / `sessionStorage` with cache keys like `salesiq_cache_{collection}_{tenantId}_{sorted}`
- Renders cached data immediately, then silently fetches fresh data from Firestore and re-renders

### 6.2 Real-Time Listeners (`watchCollection`)
- Uses Firestore `onSnapshot` for live updates across all connected clients
- Special sales listener: queries `where("adminId", "==", tenantId)` for strict tenant isolation
- Heals orphaned staff sales (missing `adminId`) by patching documents in the background

### 6.3 FEFO Algorithm (First Expiring, First Out)
Located in `admin/js/add-sale.js` and `sales/js/add-sale.js`:
- When billing perishable items (Food/Medicine), queries `productBatches` ordered by `expiryDate` ascending
- Allocates stock deductions from earliest-expiring batch first
- Uses `runTransaction` to prevent concurrent overselling

### 6.4 Gemini Multi-Model Orchestrator (`js/gemini-service.js`)
- **Model tiers:**
  - Flagship (50 RPD): `gemini-3.8-flash`, `gemini-3.5-flash`, etc. — for AI Insights & forecasting
  - Fast/Lite (500 RPD): `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` — for Excel mapping & JSON parsing
- **Automatic failover:** On HTTP 429 (quota exhausted), marks model with 1-hour cooldown in `localStorage`, falls over to next candidate
- **Offline fallback:** `getSynonymMapping()` provides a local dictionary for Excel header mapping when API is unavailable

### 6.5 Demo Data Isolation
- Demo products: `source: "demo"`, `isDemo: true`
- Demo sales: `source: "dummy"`, `isDemo: true`, invoice prefix `DUMMY-`
- Staff sales: `source: "staff"`
- Admin sales: `source: "admin"`
- Live simulator (`js/demo-live-data.js`): Uses `localStorage` multi-tab locking (`takeDemoLock`) to prevent race conditions

---

## 7. Forecasting Engine Formulas

Located in `admin/js/forecasting.js`:

**Weighted Daily Velocity:**
```
velocity = ((units_sold_last_7_days × 2) + units_sold_days_8_to_14) / 21
```

**Stock Depletion Days:**
```
finish_days = current_stock / velocity
```

**Reorder Quantity:**
```
reorder = (velocity × forecast_horizon_days) + safety_stock - current_stock
```

Velocity and depletion data is also sent to Gemini for qualitative risk summaries.

---

## 8. Styling Architecture

### Theme System
- **Dark mode** (default): CSS variables in `:root` — `--bg: #020617`, `--panel: rgba(15, 23, 42, 0.72)`
- **Light mode**: `.light` class on `<body>` overrides variables — `--bg: #f8fafc`, `--panel: rgba(255, 255, 255, 0.72)`
- Toggle via `js/shared.js` (`initAppShell`) and persisted in `localStorage`

### Key CSS Classes
| Class | File | Purpose |
|---|---|---|
| `.glass` | `css/shared.css` | Semi-transparent panel with backdrop-filter blur and border |
| `.glass-strong` | `css/shared.css` | Higher-opacity variant for modals |
| `.animated-bg` | `css/shared.css` | Fixed radial gradient background behind all content |
| `.app-shell` | `css/shared.css` | Main layout container (sidebar + main content) |
| `.page-container` | `css/shared.css` | Content area with padding |
| `.stats-grid` | `css/shared.css` | Responsive grid for KPI stat cards |
| `.table-wrap` | `css/shared.css` | Table container with overflow scroll and rounded borders |

### Page-Specific Styles
- `admin/css/admin.css` — Dashboard column resizer, drag-drop tiles, height resizers
- `sales/css/sales.css` — Staff panel green-accent overrides
- `css/auth.css` — 3D auth card perspective, floating cubes

---

## 9. Important Conventions

1. **All pages use ES Modules:** `<script type="module" src="...">`. Imports come from `js/shared.js` and Firebase CDN.
2. **DOM helpers:** `$()` = `document.querySelector`, `$$()` = `document.querySelectorAll` (defined in `js/shared.js`).
3. **Currency formatting:** `money(amount)` helper reads `salesiq_currency` from `localStorage`.
4. **Date formatting:** `dateText(timestamp)` and `onlyDate(timestamp)` handle Firestore Timestamps, JS Dates, ISO strings, and pending `serverTimestamp()` objects.
5. **Toast notifications:** `showToast(message, type)` — types: `success`, `error`, `warn`, `info`.
6. **Empty states:** `emptyState(title, subtitle)` renders a placeholder when no data exists.
7. **Skeleton loaders:** `tableSkeleton(rows, cols)` renders animated placeholder rows while data loads.

---

## 10. Known Issues & Considerations

1. **Gemini API key in frontend:** Stored as base64 in `js/firebase-config.js` and `localStorage`. For production, should be moved to a backend proxy (Firebase Cloud Function or Cloudflare Worker).
2. **Tailwind CSS inconsistency:** Some pages (e.g. `inventory.html`) use the Tailwind CDN runtime (`<script src="https://cdn.tailwindcss.com">`) while others use the precompiled `css/tailwind.css`. This can cause subtle styling differences.
3. **Open admin registration:** `firestore-rules.txt` allows any signed-in user to create their own `admins/{uid}` document. For production, gate with invite codes.
4. **Staff limit on sales healing:** `where("salespersonId", "in", staffArr)` supports max 30 items per Firestore query. Admins with 30+ staff may see delayed healing of orphaned sales.
5. **PlantUML diagram references Groq API** (`ChartsForPpt/FinalFlowChart.txt`) but codebase is fully Gemini-integrated.

---

## 11. How to Run

```bash
# 1. Install dependencies (for Tailwind build only)
npm install

# 2. Build Tailwind CSS (if you modify any Tailwind classes)
npm run build:css

# 3. Serve with any HTTP server (e.g. VS Code Live Server, or:)
npx serve .

# 4. Open in browser
# Navigate to index.html, login.html, or directly to admin/dashboard.html
```

**Firebase Setup:** The Firebase config is in `js/firebase-config.js`. The app uses an existing Firebase project — no local emulator setup is required for development.

---

*Last updated: 2 October 2026*
