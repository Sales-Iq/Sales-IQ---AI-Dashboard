import {
  requireAuth,
  initAppShell,
  fetchAll,
  getCachedCollection,
  hideSkeletonLoader,
  $,
  $$,
  money,
  getCurrency,
  dateText,
  toDate,
  toCSV,
  downloadJSON,
  emptyState,
  toast,
} from "../../js/shared.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "reports", profile);

// ── Application State ───────────────────────────────────────────────────────
let products = [];
let sales = [];
let purchases = [];
let customers = [];
let admins = [];
let staff = [];
let accounts = [];

let activeReportKey = "daily";
let activeRange = "all";
let startDate = null;
let endDate = null;
let tableSearchQuery = "";
let currentPage = 1;
const pageSize = 15;

// ── Fast Synchronous Cache Restore (0ms Instant Render) ─────────────────────
try {
  const cachedP = getCachedCollection(
    `salesiq_cache_products_${profile.id}_false`,
  );
  const cachedS = getCachedCollection(
    `salesiq_cache_sales_${profile.id}_true`,
  );
  const cachedPurch = getCachedCollection(
    `salesiq_cache_purchases_${profile.id}_false`,
  );
  const cachedC = getCachedCollection(
    `salesiq_cache_customers_${profile.id}_false`,
  );
  const cachedAdm = getCachedCollection("salesiq_cache_admins_all_false");
  const cachedSt = getCachedCollection("salesiq_cache_staff_all_false");

  if (cachedP?.data) products = cachedP.data;
  if (cachedS?.data) sales = cachedS.data;
  if (cachedPurch?.data) purchases = cachedPurch.data;
  if (cachedC?.data) customers = cachedC.data;
  if (cachedAdm?.data) admins = cachedAdm.data;
  if (cachedSt?.data) staff = cachedSt.data;

  accounts = [
    ...(admins || []).map((a) => ({ ...a, accountCollection: "admins" })),
    ...(staff || []).map((s) => ({ ...s, accountCollection: "staff" })),
  ];
} catch (_) {}

// ── Helper Date Utilities ──────────────────────────────────────────────────
function toYMD(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSaleDate(s) {
  const d = toDate(s.createdAt);
  return d ? toYMD(d) : "";
}

function getSalesperson(s) {
  if (!s) return "Admin";
  if (
    s.salespersonName &&
    !["System Demo", "Dummy Generator", "demo", "Unknown"].includes(s.salespersonName)
  ) {
    return s.salespersonName;
  }
  if (s.salespersonId && Array.isArray(accounts)) {
    const acc = accounts.find((a) => a.id === s.salespersonId);
    if (acc?.name) return acc.name;
    if (acc?.email) return acc.email;
  }
  return profile?.name || profile?.email || "Admin";
}

// ── Date Range Presets ─────────────────────────────────────────────────────
function setTimeframe(rangeKey) {
  activeRange = rangeKey;
  const now = new Date();
  const todayStr = toYMD(now);

  if (rangeKey === "today") {
    startDate = todayStr;
    endDate = todayStr;
  } else if (rangeKey === "yesterday") {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = toYMD(yest);
    startDate = yestStr;
    endDate = yestStr;
  } else if (rangeKey === "7d") {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 7);
    startDate = toYMD(past7);
    endDate = todayStr;
  } else if (rangeKey === "30d") {
    const past30 = new Date(now);
    past30.setDate(past30.getDate() - 30);
    startDate = toYMD(past30);
    endDate = todayStr;
  } else if (rangeKey === "month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = toYMD(firstDay);
    endDate = todayStr;
  } else if (rangeKey === "last_month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    startDate = toYMD(firstDay);
    endDate = toYMD(lastDay);
  } else {
    // "all"
    startDate = null;
    endDate = null;
  }

  // Update inputs
  const startInput = $("#reportStartDate");
  const endInput = $("#reportEndDate");
  if (startInput) startInput.value = startDate || "";
  if (endInput) endInput.value = endDate || "";

  // Highlight active timeframe button
  $$("#reportsTimeframeGroup button").forEach((btn) => {
    if (btn.dataset.range === rangeKey) {
      btn.className = "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-primary font-medium";
    } else {
      btn.className = "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-ghost font-medium";
    }
  });

  currentPage = 1;
  renderAll();
}

function filterSalesByDate(list) {
  if (!startDate && !endDate) return list;
  return list.filter((s) => {
    const dStr = getSaleDate(s);
    if (!dStr) return true;
    if (startDate && dStr < startDate) return false;
    if (endDate && dStr > endDate) return false;
    return true;
  });
}

// ── Report Catalog Definitions ─────────────────────────────────────────────
const REPORT_DEFINITIONS = {
  daily: {
    key: "daily",
    title: "Daily Sales Register",
    icon: "📅",
    tag: "Essential",
    desc: "Complete itemized log of all sales, payment methods, and cashiers for the day.",
    getRows() {
      const todayStr = toYMD(new Date());
      const targetDay = startDate && startDate === endDate ? startDate : todayStr;
      const daySales = sales.filter((s) => getSaleDate(s) === targetDay);

      return daySales.map((s) => ({
        invoice: s.invoiceNumber || s.invoice || "N/A",
        date: dateText(s.createdAt),
        customer: s.customerName || "Walk-in Customer",
        product: s.productName || "Product",
        qty: Number(s.quantity || 1),
        payment: s.paymentMethod || "Cash",
        cashier: getSalesperson(s),
        amount: Number(s.totalAmount || 0),
      }));
    },
    columns: [
      { key: "invoice", label: "Invoice #" },
      { key: "date", label: "Date & Time" },
      { key: "customer", label: "Customer" },
      { key: "product", label: "Product / Item" },
      { key: "qty", label: "Qty", align: "center" },
      { key: "payment", label: "Payment" },
      { key: "cashier", label: "Cashier" },
      { key: "amount", label: "Amount", align: "right", isCurrency: true },
    ],
  },

  sales: {
    key: "sales",
    title: "Date Range Sales Register",
    icon: "📋",
    tag: "Comprehensive",
    desc: "Detailed multi-day sales transactions filtered by your selected timeframe.",
    getRows() {
      const filtered = filterSalesByDate(sales);
      return filtered.map((s) => ({
        invoice: s.invoiceNumber || s.invoice || "N/A",
        date: dateText(s.createdAt),
        customer: s.customerName || "Walk-in",
        product: s.productName || "Item",
        qty: Number(s.quantity || 1),
        tax: Number(s.taxAmount || 0),
        amount: Number(s.totalAmount || 0),
        payment: s.paymentMethod || "Cash",
        salesperson: getSalesperson(s),
      }));
    },
    columns: [
      { key: "invoice", label: "Invoice #" },
      { key: "date", label: "Date" },
      { key: "customer", label: "Customer" },
      { key: "product", label: "Product" },
      { key: "qty", label: "Qty", align: "center" },
      { key: "tax", label: "Tax", align: "right", isCurrency: true },
      { key: "amount", label: "Total", align: "right", isCurrency: true },
      { key: "payment", label: "Payment" },
      { key: "salesperson", label: "Staff" },
    ],
  },

  inventory: {
    key: "inventory",
    title: "Inventory Asset Valuation",
    icon: "🏷️",
    tag: "Auditing",
    desc: "Catalog valuation measuring asset cost, retail worth, and unrealized profit.",
    getRows() {
      return products.map((p) => {
        const stock = Number(p.stock || 0);
        const cost = Number(p.costPrice || (p.price ? p.price * 0.7 : 0));
        const price = Number(p.price || 0);
        const assetVal = stock * cost;
        const retailVal = stock * price;
        const unrealizedMargin = retailVal - assetVal;

        return {
          sku: p.sku || p.barcode || "N/A",
          name: p.name || "Untitled Product",
          category: p.category || "General",
          stock: stock,
          unitCost: cost,
          unitPrice: price,
          assetVal: assetVal,
          retailVal: retailVal,
          margin: unrealizedMargin,
        };
      });
    },
    columns: [
      { key: "sku", label: "SKU / Code" },
      { key: "name", label: "Product Name" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Stock Qty", align: "center" },
      { key: "unitCost", label: "Cost Price", align: "right", isCurrency: true },
      { key: "unitPrice", label: "Retail Price", align: "right", isCurrency: true },
      { key: "assetVal", label: "Asset Value", align: "right", isCurrency: true },
      { key: "retailVal", label: "Retail Value", align: "right", isCurrency: true },
      { key: "margin", label: "Unrealized Margin", align: "right", isCurrency: true },
    ],
  },

  low: {
    key: "low",
    title: "Low Stock & Reorder Advisory",
    icon: "⚠️",
    tag: "Actionable",
    desc: "Critical items below safety threshold with suggested replenishment budget.",
    getRows() {
      return products
        .filter((p) => Number(p.stock || 0) <= Number(p.minStock || 0))
        .map((p) => {
          const stock = Number(p.stock || 0);
          const min = Number(p.minStock || 0);
          const suggestedReorder = Math.max(min * 2 - stock, 5);
          const cost = Number(p.costPrice || (p.price ? p.price * 0.7 : 0));
          const estBudget = suggestedReorder * cost;

          return {
            name: p.name || "Item",
            category: p.category || "General",
            stock: stock,
            minStock: min,
            suggested: suggestedReorder,
            unitCost: cost,
            estBudget: estBudget,
            urgency: stock === 0 ? "Critical (Out)" : "Warning (Low)",
          };
        });
    },
    columns: [
      { key: "name", label: "Product Name" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Current Stock", align: "center" },
      { key: "minStock", label: "Min Limit", align: "center" },
      { key: "suggested", label: "Reorder Units", align: "center" },
      { key: "unitCost", label: "Unit Cost", align: "right", isCurrency: true },
      { key: "estBudget", label: "Restock Cost", align: "right", isCurrency: true },
      { key: "urgency", label: "Urgency Status", align: "center" },
    ],
  },

  tax: {
    key: "tax",
    title: "Tax & GST Compliance Summary",
    icon: "🏛️",
    tag: "Taxation",
    desc: "Taxable turnover, CGST/SGST/VAT breakdown, and gross taxable collections.",
    getRows() {
      const filtered = filterSalesByDate(sales);
      return filtered.map((s) => {
        const total = Number(s.totalAmount || 0);
        const tax = Number(s.taxAmount || 0);
        const taxable = Math.max(0, total - tax);
        const rate = Number(s.taxPercent || (taxable > 0 ? (tax / taxable) * 100 : 0));

        return {
          invoice: s.invoiceNumber || s.invoice || "N/A",
          date: dateText(s.createdAt),
          customer: s.customerName || "Walk-in",
          taxable: taxable,
          rate: `${rate.toFixed(0)}%`,
          tax: tax,
          total: total,
        };
      });
    },
    columns: [
      { key: "invoice", label: "Invoice #" },
      { key: "date", label: "Date" },
      { key: "customer", label: "Customer" },
      { key: "taxable", label: "Taxable Turnover", align: "right", isCurrency: true },
      { key: "rate", label: "Tax Rate", align: "center" },
      { key: "tax", label: "Tax Collected", align: "right", isCurrency: true },
      { key: "total", label: "Gross Total", align: "right", isCurrency: true },
    ],
  },

  profit: {
    key: "profit",
    title: "Gross Profit & Margin Analysis",
    icon: "📈",
    tag: "Financial",
    desc: "Profitability per transaction comparing revenue against Cost of Goods Sold (COGS).",
    getRows() {
      const filtered = filterSalesByDate(sales);
      return filtered.map((s) => {
        const revenue = Number(s.totalAmount || 0);
        const qty = Number(s.quantity || 1);
        const unitCost = Number(s.costPrice || (s.unitPrice ? s.unitPrice * 0.7 : 0));
        const cogs = unitCost * qty;
        const profit =
          s.profit !== undefined ? Number(s.profit) : Math.max(0, revenue - cogs);
        const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          invoice: s.invoiceNumber || s.invoice || "N/A",
          date: dateText(s.createdAt),
          product: s.productName || "Product",
          revenue: revenue,
          cogs: cogs,
          profit: profit,
          margin: `${marginPct.toFixed(1)}%`,
        };
      });
    },
    columns: [
      { key: "invoice", label: "Invoice #" },
      { key: "date", label: "Date" },
      { key: "product", label: "Product" },
      { key: "revenue", label: "Gross Revenue", align: "right", isCurrency: true },
      { key: "cogs", label: "COGS (Cost)", align: "right", isCurrency: true },
      { key: "profit", label: "Net Gross Profit", align: "right", isCurrency: true },
      { key: "margin", label: "Margin %", align: "center" },
    ],
  },

  performance: {
    key: "performance",
    title: "Staff Sales & Commission Audit",
    icon: "👥",
    tag: "HR & Payroll",
    desc: "Productivity report ranking cashiers by orders closed, volume, and commission.",
    getRows() {
      const filtered = filterSalesByDate(sales);
      const staffMap = {};

      filtered.forEach((s) => {
        const sp = getSalesperson(s);
        if (!staffMap[sp]) {
          staffMap[sp] = {
            salesperson: sp,
            orders: 0,
            units: 0,
            revenue: 0,
          };
        }
        staffMap[sp].orders += 1;
        staffMap[sp].units += Number(s.quantity || 1);
        staffMap[sp].revenue += Number(s.totalAmount || 0);
      });

      return Object.values(staffMap).map((m) => {
        const aov = m.orders > 0 ? m.revenue / m.orders : 0;
        const commission = m.revenue * 0.02; // Standard 2% benchmark
        return {
          salesperson: m.salesperson,
          orders: m.orders,
          units: m.units,
          revenue: m.revenue,
          aov: aov,
          commission: commission,
        };
      });
    },
    columns: [
      { key: "salesperson", label: "Staff Member / Cashier" },
      { key: "orders", label: "Transactions", align: "center" },
      { key: "units", label: "Units Sold", align: "center" },
      { key: "revenue", label: "Total Revenue", align: "right", isCurrency: true },
      { key: "aov", label: "Avg Ticket (AOV)", align: "right", isCurrency: true },
      { key: "commission", label: "Est. Commission (2%)", align: "right", isCurrency: true },
    ],
  },

  payments: {
    key: "payments",
    title: "Payment Method Drawer Audit",
    icon: "💳",
    tag: "Reconciliation",
    desc: "Cash vs UPI vs Card breakdown for daily register balancing and drawer closing.",
    getRows() {
      const filtered = filterSalesByDate(sales);
      const payMap = {
        Cash: { method: "Cash", count: 0, total: 0 },
        UPI: { method: "UPI / QR", count: 0, total: 0 },
        Card: { method: "Credit / Debit Card", count: 0, total: 0 },
        "Net Banking": { method: "Net Banking", count: 0, total: 0 },
      };

      let grandTotal = 0;
      filtered.forEach((s) => {
        const p = s.paymentMethod || "Cash";
        const amt = Number(s.totalAmount || 0);
        grandTotal += amt;

        if (p.toLowerCase().includes("upi") || p.toLowerCase().includes("qr")) {
          payMap["UPI"].count += 1;
          payMap["UPI"].total += amt;
        } else if (p.toLowerCase().includes("card")) {
          payMap["Card"].count += 1;
          payMap["Card"].total += amt;
        } else if (p.toLowerCase().includes("net") || p.toLowerCase().includes("bank")) {
          payMap["Net Banking"].count += 1;
          payMap["Net Banking"].total += amt;
        } else {
          payMap["Cash"].count += 1;
          payMap["Cash"].total += amt;
        }
      });

      return Object.values(payMap).map((m) => {
        const share = grandTotal > 0 ? (m.total / grandTotal) * 100 : 0;
        return {
          method: m.method,
          count: m.count,
          total: m.total,
          share: `${share.toFixed(1)}%`,
          audit: m.count > 0 ? "Balanced" : "No Activity",
        };
      });
    },
    columns: [
      { key: "method", label: "Payment Channel" },
      { key: "count", label: "Transactions", align: "center" },
      { key: "total", label: "Total Collected", align: "right", isCurrency: true },
      { key: "share", label: "Share of Total", align: "center" },
      { key: "audit", label: "Drawer Status", align: "center" },
    ],
  },

  customers: {
    key: "customers",
    title: "Top Customers & VIP Directory",
    icon: "⭐",
    tag: "CRM & Loyalty",
    desc: "Customer spending rankings, frequency of visits, and average order size.",
    getRows() {
      const custMap = {};

      sales.forEach((s) => {
        const name = s.customerName || "Walk-in Customer";
        const phone = s.customerPhone || "-";
        const key = phone !== "-" ? phone : name;

        if (!custMap[key]) {
          custMap[key] = {
            name: name,
            phone: phone,
            orders: 0,
            totalSpent: 0,
            lastDate: s.createdAt,
          };
        }
        custMap[key].orders += 1;
        custMap[key].totalSpent += Number(s.totalAmount || 0);
        if (s.createdAt) custMap[key].lastDate = s.createdAt;
      });

      return Object.values(custMap)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .map((c) => {
          const avgSpend = c.orders > 0 ? c.totalSpent / c.orders : 0;
          let tier = "Standard";
          if (c.totalSpent >= 15000) tier = "VIP Platinum";
          else if (c.totalSpent >= 5000) tier = "Gold Member";

          return {
            name: c.name,
            phone: c.phone,
            orders: c.orders,
            totalSpent: c.totalSpent,
            avgSpend: avgSpend,
            lastVisit: dateText(c.lastDate),
            tier: tier,
          };
        });
    },
    columns: [
      { key: "name", label: "Customer Name" },
      { key: "phone", label: "Phone / Contact" },
      { key: "orders", label: "Visits", align: "center" },
      { key: "totalSpent", label: "Lifetime Spend", align: "right", isCurrency: true },
      { key: "avgSpend", label: "Avg Ticket", align: "right", isCurrency: true },
      { key: "lastVisit", label: "Last Visit" },
      { key: "tier", label: "Loyalty Tier", align: "center" },
    ],
  },

  dead_stock: {
    key: "dead_stock",
    title: "Dead Stock & Slow Movers",
    icon: "📦",
    tag: "Optimization",
    desc: "Inventory with zero sales velocity to identify trapped capital and clear space.",
    getRows() {
      // Find sold product names / IDs in the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
      const recentSales = sales.filter((s) => getSaleDate(s) >= thirtyDaysAgo);
      const soldNames = new Set(recentSales.map((s) => (s.productName || "").toLowerCase().trim()));

      return products
        .filter((p) => {
          const stock = Number(p.stock || 0);
          if (stock <= 0) return false;
          const pName = (p.name || "").toLowerCase().trim();
          return !soldNames.has(pName);
        })
        .map((p) => {
          const stock = Number(p.stock || 0);
          const cost = Number(p.costPrice || (p.price ? p.price * 0.7 : 0));
          const lockedVal = stock * cost;

          return {
            name: p.name || "Product",
            category: p.category || "General",
            stock: stock,
            lockedVal: lockedVal,
            days: "30+ Days (Zero Sales)",
            action: "Clearance / 25% Discount",
          };
        });
    },
    columns: [
      { key: "name", label: "Product Name" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Stock on Hand", align: "center" },
      { key: "lockedVal", label: "Trapped Capital", align: "right", isCurrency: true },
      { key: "days", label: "Inactivity Period", align: "center" },
      { key: "action", label: "Recommended Strategy", align: "center" },
    ],
  },
};

// ── Render Top KPI Metric Strip ────────────────────────────────────────────
function renderKpis() {
  const filteredSales = filterSalesByDate(sales);

  let totalRev = 0;
  let totalUnits = 0;
  let totalProfit = 0;

  filteredSales.forEach((s) => {
    const rev = Number(s.totalAmount || 0);
    const qty = Number(s.quantity || 1);
    const unitCost = Number(s.costPrice || (s.unitPrice ? s.unitPrice * 0.7 : 0));
    const profit = s.profit !== undefined ? Number(s.profit) : Math.max(0, rev - unitCost * qty);

    totalRev += rev;
    totalUnits += qty;
    totalProfit += profit;
  });

  let totalAssetVal = 0;
  products.forEach((p) => {
    const stock = Number(p.stock || 0);
    const cost = Number(p.costPrice || (p.price ? p.price * 0.7 : 0));
    totalAssetVal += stock * cost;
  });

  const aov = filteredSales.length > 0 ? totalRev / filteredSales.length : 0;
  const marginPct = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;

  const revEl = $("#kpiFilteredRevenue");
  if (revEl) revEl.textContent = money(totalRev);

  const ordersEl = $("#kpiFilteredOrders");
  if (ordersEl) ordersEl.textContent = `${filteredSales.length} orders recorded`;

  const unitsEl = $("#kpiFilteredUnits");
  if (unitsEl) unitsEl.textContent = totalUnits.toLocaleString();

  const aovEl = $("#kpiAvgOrderVal");
  if (aovEl) aovEl.textContent = `Avg ticket: ${money(aov)}`;

  const assetEl = $("#kpiInventoryAssetVal");
  if (assetEl) assetEl.textContent = money(totalAssetVal);

  const skusEl = $("#kpiTotalSkus");
  if (skusEl) skusEl.textContent = `${products.length} catalog items`;

  const profitEl = $("#kpiProfitMargin");
  if (profitEl) profitEl.textContent = money(totalProfit);

  const marginEl = $("#kpiMarginPercent");
  if (marginEl) marginEl.textContent = `Margin: ${marginPct.toFixed(1)}%`;
}

// ── Render Report Catalog Cards ────────────────────────────────────────────
function renderReportCards() {
  const container = $("#reportCards");
  if (!container) return;

  const cardsHtml = Object.values(REPORT_DEFINITIONS)
    .map((r) => {
      const isActive = r.key === activeReportKey;
      return `
        <div
          class="p-4 rounded-2xl report-card ${isActive ? "report-card-active" : "border border-slate-800"}"
          data-report-card="${r.key}"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-2xl">${r.icon}</span>
            <span class="badge ${isActive ? "badge-primary text-white font-black shadow-sm" : "badge-ghost"} text-[10px] uppercase font-bold tracking-wider">
              ${isActive ? "ACTIVE • " + r.tag : r.tag}
            </span>
          </div>
          <h4 class="${isActive ? "text-white font-black text-sm" : "text-slate-100 font-bold text-sm"} mb-1 leading-snug">${r.title}</h4>
          <p class="${isActive ? "text-slate-200 font-medium" : "text-slate-400"} text-[11px] line-clamp-2 mb-3 min-h-[32px]">${r.desc}</p>
          <div class="flex items-center gap-1.5 pt-2 mt-auto no-print">
            <button
              class="btn btn-xs ${isActive ? "btn-primary font-bold shadow-md shadow-sky-500/25" : "btn-ghost border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"} flex-1"
              onclick="window.selectReport('${r.key}')"
            >
              ${isActive ? "Selected ✓" : "View"}
            </button>
            <button
              class="btn btn-xs btn-ghost border border-slate-800 px-2 text-slate-300 hover:text-white"
              onclick="event.stopPropagation(); window.quickExport('${r.key}', 'pdf')"
              title="Quick download PDF"
            >
              PDF
            </button>
            <button
              class="btn btn-xs btn-ghost border border-slate-800 px-2 text-slate-300 hover:text-white"
              onclick="event.stopPropagation(); window.quickExport('${r.key}', 'excel')"
              title="Quick download Excel"
            >
              XLS
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = cardsHtml;


  // Add click listeners to cards
  $$("[data-report-card]").forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.reportCard;
      if (key) window.selectReport(key);
    });
  });
}

// ── Render Live Preview Table ──────────────────────────────────────────────
function renderLiveTable() {
  const def = REPORT_DEFINITIONS[activeReportKey] || REPORT_DEFINITIONS.daily;

  // Update header labels
  const titleEl = $("#activeReportTitle");
  if (titleEl) titleEl.textContent = def.title;

  const iconEl = $("#activeReportIcon");
  if (iconEl) iconEl.textContent = def.icon;

  const descEl = $("#activeReportDesc");
  if (descEl) {
    const rangeText = startDate && endDate ? `${startDate} to ${endDate}` : "All Recorded History";
    descEl.textContent = `${def.desc} (Timeline: ${rangeText})`;
  }

  // Get raw rows
  const allRows = def.getRows();

  // Apply search query
  const query = tableSearchQuery.toLowerCase().trim();
  const filteredRows = query
    ? allRows.filter((r) =>
        Object.values(r).some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(query),
        ),
      )
    : allRows;

  // Update badge count
  const badgeEl = $("#reportRecordCountBadge");
  if (badgeEl) badgeEl.textContent = `${filteredRows.length} rows`;

  const wrap = $("#reportTableWrap");
  if (!wrap) return;

  if (filteredRows.length === 0) {
    wrap.innerHTML = emptyState(
      "No matching records",
      "Try selecting a different date range or clearing your search filter.",
    );
    renderPagination(0, 1);
    return;
  }

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(startIdx, startIdx + pageSize);

  // Calculate totals for currency columns
  const columnTotals = {};
  def.columns.forEach((col) => {
    if (col.isCurrency || col.align === "center" && (col.key === "qty" || col.key === "orders" || col.key === "units")) {
      const sum = filteredRows.reduce((acc, row) => acc + Number(row[col.key] || 0), 0);
      columnTotals[col.key] = sum;
    }
  });

  // Build table HTML
  const headerHtml = def.columns
    .map((col) => {
      const alignClass =
        col.align === "right"
          ? "text-right"
          : col.align === "center"
            ? "text-center"
            : "text-left";
      return `<th class="${alignClass} text-xs uppercase font-bold text-slate-400 py-3 px-3">${col.label}</th>`;
    })
    .join("");

  const rowsHtml = pageRows
    .map((row) => {
      const cells = def.columns
        .map((col) => {
          const rawVal = row[col.key];
          const alignClass =
            col.align === "right"
              ? "text-right font-mono"
              : col.align === "center"
                ? "text-center"
                : "text-left";

          let displayVal = rawVal ?? "-";
          if (col.isCurrency) {
            displayVal = `<span class="text-emerald-400 font-semibold">${money(rawVal)}</span>`;
          } else if (col.key === "urgency") {
            const isCrit = String(rawVal).includes("Critical");
            displayVal = `<span class="badge ${isCrit ? "badge-danger" : "badge-warning"} text-[10px]">${rawVal}</span>`;
          } else if (col.key === "tier") {
            const isVip = String(rawVal).includes("VIP");
            displayVal = `<span class="badge ${isVip ? "badge-primary" : "badge-info"} text-[10px]">${rawVal}</span>`;
          } else if (col.key === "audit") {
            displayVal = `<span class="badge badge-success text-[10px]">${rawVal}</span>`;
          }

          return `<td class="${alignClass} text-xs py-2.5 px-3 border-t border-slate-800">${displayVal}</td>`;
        })
        .join("");


      return `<tr class="hover:bg-slate-900/40 transition-colors">${cells}</tr>`;
    })
    .join("");

  // Footer totals row
  const footerCells = def.columns
    .map((col, idx) => {
      const alignClass =
        col.align === "right"
          ? "text-right font-mono font-bold"
          : col.align === "center"
            ? "text-center font-bold"
            : "text-left font-bold";

      if (idx === 0) {
        return `<td class="text-left font-bold text-slate-200 text-xs py-3 px-3">Total (${filteredRows.length} rows)</td>`;
      }

      if (columnTotals[col.key] !== undefined) {
        const val = columnTotals[col.key];
        const formatted = col.isCurrency ? money(val) : val.toLocaleString();
        return `<td class="${alignClass} text-emerald-400 text-xs py-3 px-3">${formatted}</td>`;
      }

      return `<td class="py-3 px-3"></td>`;
    })
    .join("");

  wrap.innerHTML = `
    <div class="table-wrap overflow-x-auto rounded-xl border border-slate-800/80">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-950/70 border-b border-slate-800">
          <tr>${headerHtml}</tr>
        </thead>
        <tbody class="divide-y divide-slate-800/40">
          ${rowsHtml}
        </tbody>
        <tfoot class="bg-slate-950/90 border-t-2 border-slate-700">
          <tr>${footerCells}</tr>
        </tfoot>
      </table>
    </div>
  `;

  renderPagination(filteredRows.length, totalPages);
}

// ── Render Pagination Controls ─────────────────────────────────────────────
function renderPagination(totalCount, totalPages) {
  const infoEl = $("#paginationInfo");
  const controlsEl = $("#paginationControls");
  if (!infoEl || !controlsEl) return;

  if (totalCount === 0) {
    infoEl.textContent = "Showing 0 to 0 of 0 entries";
    controlsEl.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);
  infoEl.textContent = `Showing ${start} to ${end} of ${totalCount} entries`;

  controlsEl.innerHTML = `
    <button
      class="btn btn-xs btn-ghost border border-slate-800 text-slate-300 hover:text-white"
      ${currentPage <= 1 ? "disabled" : ""}
      onclick="window.changePage(${currentPage - 1})"
    >
      Previous
    </button>
    <span class="px-2 font-mono text-xs text-slate-300">
      Page ${currentPage} of ${totalPages}
    </span>
    <button
      class="btn btn-xs btn-ghost border border-slate-800 text-slate-300 hover:text-white"
      ${currentPage >= totalPages ? "disabled" : ""}
      onclick="window.changePage(${currentPage + 1})"
    >
      Next
    </button>
  `;
}

window.changePage = (p) => {
  currentPage = p;
  renderLiveTable();
};

window.selectReport = (key) => {
  if (!REPORT_DEFINITIONS[key]) return;
  activeReportKey = key;
  currentPage = 1;
  renderReportCards();
  renderLiveTable();
};

// ── Exporter: Professional Branded PDF Generator ───────────────────────────
window.downloadPDF = (targetKey = activeReportKey) => {
  const def = REPORT_DEFINITIONS[targetKey] || REPORT_DEFINITIONS.daily;
  const rows = def.getRows();

  if (!rows || rows.length === 0) {
    toast("No data available for this report.", "warn");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    toast("PDF library is still loading. Please try again in a moment.", "err");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const storeName =
      localStorage.getItem("salesiq_business_name") ||
      profile.businessName ||
      profile.name ||
      "SalesIQ Retail Store";
    const storeCode = profile.id || "SIQ-MAIN";
    const currency = getCurrency();
    const rangeText = startDate && endDate ? `${startDate} to ${endDate}` : "All Time";
    const genDate = new Date().toLocaleString();

    // 1. Corporate Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 24, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(storeName.toUpperCase(), 14, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`STORE ID: ${storeCode} | OFFICIAL REPORT REGISTER`, 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text(`GENERATED: ${genDate}`, 283, 12, { align: "right" });
    doc.text(`TIMELINE: ${rangeText}`, 283, 18, { align: "right" });

    // 2. Report Title & Subtitle Banner
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(def.title.toUpperCase(), 14, 33);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`${def.desc} (Records: ${rows.length} | Currency: ${currency})`, 14, 38);

    // 3. Format Columns & Data for autoTable
    const tableColumns = def.columns.map((c) => ({
      header: c.label,
      dataKey: c.key,
    }));

    const tableRows = rows.map((r) => {
      const obj = {};
      def.columns.forEach((c) => {
        const val = r[c.key];
        if (c.isCurrency) {
          obj[c.key] = `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
          obj[c.key] = val !== undefined && val !== null ? String(val) : "-";
        }
      });
      return obj;
    });

    // 4. Calculate Column Styles (Right-align currency & numbers)
    const columnStyles = {};
    def.columns.forEach((c, idx) => {
      if (c.align === "right") {
        columnStyles[c.key] = { halign: "right" };
      } else if (c.align === "center") {
        columnStyles[c.key] = { halign: "center" };
      }
    });

    if (typeof doc.autoTable === "function") {
      doc.autoTable({
        startY: 42,
        columns: tableColumns,
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          halign: "left",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: columnStyles,
        margin: { left: 14, right: 14, bottom: 18 },
        didDrawPage: (data) => {
          // Page Footer
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `SalesIQ Intelligent Retail Suite — Certified Business Record — Page ${data.pageNumber} of ${pageCount}`,
            14,
            202,
          );
        },
      });
    } else {
      // Clean fallback if autoTable script was blocked
      let y = 46;
      rows.slice(0, 40).forEach((r, i) => {
        doc.setFontSize(8);
        doc.text(
          `${i + 1}. ` +
            Object.entries(r)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" | ")
              .slice(0, 140),
          14,
          y,
        );
        y += 6;
      });
    }

    const filename = `${def.key}_report_${toYMD(new Date())}.pdf`;
    doc.save(filename);
    toast(`PDF exported: ${filename}`, "ok");
  } catch (err) {
    console.error("PDF generation failed:", err);
    toast("Failed to generate PDF: " + err.message, "err");
  }
};

// ── Exporter: Formatted Excel (XLSX) Generator ─────────────────────────────
window.downloadExcel = (targetKey = activeReportKey) => {
  const def = REPORT_DEFINITIONS[targetKey] || REPORT_DEFINITIONS.daily;
  const rows = def.getRows();

  if (!rows || rows.length === 0) {
    toast("No data available for this report.", "warn");
    return;
  }

  if (!window.XLSX) {
    toast("Excel engine (SheetJS) is not loaded.", "err");
    return;
  }

  try {
    // Format human-friendly column names
    const formattedRows = rows.map((r) => {
      const obj = {};
      def.columns.forEach((c) => {
        obj[c.label] = r[c.key] ?? "";
      });
      return obj;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedRows);

    // Auto-fit column widths
    const colWidths = def.columns.map((c) => {
      let maxLen = c.label.length;
      formattedRows.forEach((r) => {
        const valLen = String(r[c.label] || "").length;
        if (valLen > maxLen) maxLen = valLen;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, def.title.slice(0, 31));
    const filename = `${def.key}_report_${toYMD(new Date())}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast(`Excel exported: ${filename}`, "ok");
  } catch (err) {
    console.error("Excel generation error:", err);
    toast("Excel export failed: " + err.message, "err");
  }
};

// ── Exporter: CSV Table ────────────────────────────────────────────────────
window.downloadCSV = (targetKey = activeReportKey) => {
  const def = REPORT_DEFINITIONS[targetKey] || REPORT_DEFINITIONS.daily;
  const rows = def.getRows();

  if (!rows || rows.length === 0) {
    toast("No data available to export.", "warn");
    return;
  }

  const formattedRows = rows.map((r) => {
    const obj = {};
    def.columns.forEach((c) => {
      obj[c.label] = r[c.key] ?? "";
    });
    return obj;
  });

  const filename = `${def.key}_report_${toYMD(new Date())}.csv`;
  toCSV(formattedRows, filename);
};

// ── Exporter: Quick Export Helper from Cards ───────────────────────────────
window.quickExport = (key, format) => {
  if (format === "pdf") window.downloadPDF(key);
  else if (format === "excel") window.downloadExcel(key);
  else if (format === "csv") window.downloadCSV(key);
};

// ── Exporter: Print Direct ─────────────────────────────────────────────────
window.printActiveReport = () => {
  const def = REPORT_DEFINITIONS[activeReportKey] || REPORT_DEFINITIONS.daily;
  const rows = def.getRows();

  if (!rows || rows.length === 0) {
    toast("No data to print.", "warn");
    return;
  }

  const storeName =
    localStorage.getItem("salesiq_business_name") ||
    profile.businessName ||
    profile.name ||
    "SalesIQ Retail Store";
  const currency = getCurrency();
  const rangeText = startDate && endDate ? `${startDate} to ${endDate}` : "All Recorded History";

  const headerCols = def.columns
    .map((c) => `<th style="text-align: ${c.align || "left"}">${c.label}</th>`)
    .join("");

  const bodyRows = rows
    .map((r) => {
      const cells = def.columns
        .map((c) => {
          let val = r[c.key] ?? "-";
          if (c.isCurrency) val = `${currency} ${Number(val).toLocaleString()}`;
          return `<td style="text-align: ${c.align || "left"}">${val}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const printArea = $("#reportPrintArea");
  if (!printArea) return;

  printArea.innerHTML = `
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px;">
      <h1 style="font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase;">${storeName}</h1>
      <p style="font-size: 11px; color: #475569; margin: 3px 0 0 0;">
        OFFICIAL REPORT: <b>${def.title}</b> | TIMELINE: <b>${rangeText}</b> | PRINTED: ${new Date().toLocaleString()}
      </p>
    </div>
    <table>
      <thead>
        <tr>${headerCols}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <div style="margin-top: 24px; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px;">
      Certified by SalesIQ Intelligent Retail Suite. This is a computer-generated document.
    </div>
  `;

  window.print();
};

// ── Exporter: Full Store Database JSON Backup ──────────────────────────────
window.backupFullStoreJson = () => {
  const backup = {
    metadata: {
      generatedAt: new Date().toISOString(),
      storeName:
        localStorage.getItem("salesiq_business_name") || profile.name || "SalesIQ",
      storeCode: profile.id,
      exportedBy: profile.email || "Admin",
      recordCounts: {
        products: products.length,
        sales: sales.length,
        purchases: purchases.length,
        customers: customers.length,
      },
    },
    products,
    sales,
    purchases,
    customers,
    admins,
    staff,
  };

  const filename = `salesiq_full_backup_${toYMD(new Date())}.json`;
  downloadJSON(backup, filename);
  toast(`Full backup downloaded: ${filename}`, "ok");
};

// ── Master Render Orchestrator ─────────────────────────────────────────────
function renderAll() {
  renderKpis();
  renderReportCards();
  renderLiveTable();
}

// ── Attach Event Listeners ─────────────────────────────────────────────────
function attachListeners() {
  // Timeframe buttons
  $$("#reportsTimeframeGroup button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const range = btn.dataset.range;
      if (range) setTimeframe(range);
    });
  });

  // Custom Date Range Pickers
  const startInput = $("#reportStartDate");
  const endInput = $("#reportEndDate");

  if (startInput) {
    startInput.addEventListener("change", (e) => {
      startDate = e.target.value || null;
      activeRange = "custom";
      $$("#reportsTimeframeGroup button").forEach((b) => {
        b.className = "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-ghost font-medium";
      });
      currentPage = 1;
      renderAll();
    });
  }

  if (endInput) {
    endInput.addEventListener("change", (e) => {
      endDate = e.target.value || null;
      activeRange = "custom";
      $$("#reportsTimeframeGroup button").forEach((b) => {
        b.className = "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-ghost font-medium";
      });
      currentPage = 1;
      renderAll();
    });
  }

  const resetDatesBtn = $("#resetReportDates");
  if (resetDatesBtn) {
    resetDatesBtn.addEventListener("click", () => {
      setTimeframe("all");
    });
  }

  // Live Table Search Filter
  const searchInput = $("#reportTableSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      tableSearchQuery = e.target.value;
      currentPage = 1;
      renderLiveTable();
    });
  }

  // Top Action Buttons
  const printBtn = $("#printActiveBtn");
  if (printBtn) printBtn.onclick = () => window.printActiveReport();

  const pdfBtn = $("#downloadPdfBtn");
  if (pdfBtn) pdfBtn.onclick = () => window.downloadPDF(activeReportKey);

  const xlsBtn = $("#downloadExcelBtn");
  if (xlsBtn) xlsBtn.onclick = () => window.downloadExcel(activeReportKey);

  const csvBtn = $("#downloadCsvBtn");
  if (csvBtn) csvBtn.onclick = () => window.downloadCSV(activeReportKey);

  const backupBtn = $("#exportAllJson");
  if (backupBtn) backupBtn.onclick = () => window.backupFullStoreJson();
}

// ── Instant 0ms Fast Boot from Cache ───────────────────────────────────────
try {
  const cSales = getCachedCollection(`salesiq_cache_sales_${profile.id}_true`);
  const cProds = getCachedCollection(`salesiq_cache_products_${profile.id}_false`);
  const cCusts = getCachedCollection(`salesiq_cache_customers_${profile.id}_false`);

  if (cSales?.data || cProds?.data) {
    sales = cSales?.data || [];
    products = cProds?.data || [];
    customers = cCusts?.data || [];
    renderAll();
    hideSkeletonLoader();
  }
} catch (_) {}

// ── Network Fetch from Firestore ───────────────────────────────────────────
async function load() {
  try {
    [products, sales, purchases, customers, admins, staff] = await Promise.all([
      fetchAll("products", false, profile.id),
      fetchAll("sales", true, profile.id),
      fetchAll("purchases", false, profile.id),
      fetchAll("customers", false, profile.id),
      fetchAll("admins", false),
      fetchAll("staff", false),
    ]);

    accounts = [
      ...admins.map((a) => ({ ...a, accountCollection: "admins" })),
      ...staff.map((s) => ({ ...s, accountCollection: "staff" })),
    ];

    renderAll();
  } catch (err) {
    console.error("Reports data load failed:", err);
    toast("Failed to refresh live report data.", "warn");
  } finally {
    hideSkeletonLoader();
  }
}

attachListeners();
renderAll();
load();
