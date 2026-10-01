import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  money,
  toast,
  setBusy,
  hideSkeletonLoader,
} from "../../js/shared.js";

import { callGemini } from "../../js/gemini-service.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "ai-insights", profile);

// State
let rawStoreData = {
  products: [],
  sales: [],
  customers: [],
  batches: [],
  staff: [],
};
let storeAnalytics = null;
const sessionHistory = [];
let currentInsightText = "";
let currentInsightTitle = "Executive Business Briefing";

// Briefing Session Cache (persists during login session until user relogs or clicks Refresh)
const BRIEFING_CACHE_KEY = `salesiq_briefing_${profile.id}`;

function getCachedBriefing() {
  try {
    const raw = sessionStorage.getItem(BRIEFING_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function setCachedBriefing(data) {
  try {
    sessionStorage.setItem(BRIEFING_CACHE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function clearCachedBriefing() {
  try {
    sessionStorage.removeItem(BRIEFING_CACHE_KEY);
  } catch (_) {}
}

function renderCachedBriefing(cached) {
  currentInsightText = cached.text;
  currentInsightTitle = "Executive Business Briefing";

  const headingEl = $("#aiReportHeading");
  const subtitleEl = $("#aiReportSubtitle");
  const modelNameEl = $("#aiModelName");
  const answerEl = $("#aiAnswer");

  if (headingEl) headingEl.textContent = "Executive Business Briefing";
  if (subtitleEl) {
    subtitleEl.textContent = `Generated on ${cached.timeString || "earlier"} • Saved session cache (Click "Refresh Data" to re-generate)`;
  }
  if (modelNameEl) {
    modelNameEl.textContent = `${cached.modelUsed || "Gemini AI"} (Cached)`;
  }
  if (answerEl) {
    answerEl.innerHTML = `
      <div class="prose prose-invert max-w-none text-slate-200">
        ${formatMarkdown(cached.text)}
      </div>
    `;
  }
}

// Strategic curated prompts for library
const curatedPrompts = [
  "Which products should I restock first and what is the stockout risk?",
  "How can I improve gross profit margins without hurting sales volume?",
  "Which slow-moving products should be discounted or bundled?",
  "What are our peak sales hours and days?",
  "What is our customer retention rate and how can we boost repeat visits?",
  "Are any perishable batches nearing expiration this month?",
];

// Initialize prompt library in sidebar
function renderPromptLibrary() {
  const container = $("#exampleQuestions");
  if (!container) return;

  container.innerHTML = curatedPrompts
    .map(
      (q) => `
      <button class="btn btn-ghost w-full justify-start text-left text-xs py-2 px-3 border border-slate-700/50 hover:border-sky-500/50 transition-all rounded-xl leading-snug group" data-prompt="${q}">
        <span class="text-sky-400 group-hover:translate-x-0.5 transition-transform shrink-0">💬</span>
        <span class="text-slate-200 line-clamp-2">${q}</span>
      </button>
    `,
    )
    .join("");

  container.querySelectorAll("[data-prompt]").forEach((btn) => {
    btn.onclick = () => {
      const q = btn.dataset.prompt;
      const input = $("#aiQuestion");
      if (input) {
        input.value = q;
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        input.focus();
      }
      askCopilot(q, btn);
    };
  });
}

// Fetch all collections scoped strictly to current tenant
async function loadStoreData() {
  try {
    const [products, sales, customers, batches, staff] = await Promise.all([
      fetchAll("products", false, profile.id),
      fetchAll("sales", false, profile.id),
      fetchAll("customers", false, profile.id),
      fetchAll("productBatches", false, profile.id).catch(() => []),
      fetchAll("staff", false, profile.id).catch(() => []),
    ]);

    rawStoreData = { products, sales, customers, batches, staff };
    storeAnalytics = computeStoreAnalytics(rawStoreData);
  } catch (err) {
    console.error("Failed to load store data for AI insights:", err);
    toast("Could not read live business data. Check connection.", "err");
  }
}

// Pre-compute high-fidelity arithmetic aggregates
function computeStoreAnalytics({ products, sales, customers, batches, staff }) {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  const productSalesMap = new Map();
  const categorySalesMap = new Map();
  const staffSalesMap = new Map();

  sales.forEach((s) => {
    const qty = Number(s.quantity || 0);
    const rev = Number(
      s.totalAmount !== undefined ? s.totalAmount : Number(s.price || 0) * qty,
    );
    const cost = Number(s.costPrice ? Number(s.costPrice) * qty : 0);
    const prof = Number(s.profit !== undefined ? s.profit : rev - cost);

    totalRevenue += rev;
    totalCost += cost;
    totalProfit += prof;

    const pName = s.productName || "Unknown Product";
    const curP = productSalesMap.get(pName) || {
      name: pName,
      qty: 0,
      revenue: 0,
      profit: 0,
      category: s.category || "",
    };
    curP.qty += qty;
    curP.revenue += rev;
    curP.profit += prof;
    productSalesMap.set(pName, curP);

    const cat = s.category || "General";
    const curCat = categorySalesMap.get(cat) || {
      name: cat,
      qty: 0,
      revenue: 0,
      profit: 0,
    };
    curCat.qty += qty;
    curCat.revenue += rev;
    curCat.profit += prof;
    categorySalesMap.set(cat, curCat);

    const staffKey =
      s.salespersonName ||
      s.salespersonEmail ||
      (s.source === "admin" ? "Admin" : "Sales Staff");
    const curStaff = staffSalesMap.get(staffKey) || {
      name: staffKey,
      count: 0,
      revenue: 0,
    };
    curStaff.count += 1;
    curStaff.revenue += rev;
    staffSalesMap.set(staffKey, curStaff);
  });

  const grossMarginPercent =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
  const avgOrderValue =
    sales.length > 0 ? (totalRevenue / sales.length).toFixed(0) : 0;

  const outOfStockProducts = products.filter((p) => Number(p.stock || 0) <= 0);
  const lowStockProducts = products.filter(
    (p) =>
      Number(p.stock || 0) > 0 &&
      Number(p.stock || 0) <= Number(p.minStock || 10),
  );
  const totalUnits = products.reduce(
    (acc, p) => acc + Math.max(0, Number(p.stock || 0)),
    0,
  );

  const soldProductNames = new Set(
    sales.map((s) => (s.productName || "").trim().toLowerCase()),
  );
  const deadStockProducts = products.filter(
    (p) =>
      !soldProductNames.has((p.name || "").trim().toLowerCase()) &&
      Number(p.stock || 0) > 0,
  );
  const deadStockCapital = deadStockProducts.reduce(
    (acc, p) =>
      acc + Number(p.stock || 0) * Number(p.costPrice || p.price || 0),
    0,
  );

  const now = new Date();
  const expiringBatches = batches.filter((b) => {
    if (!b.expiryDate || Number(b.remainingQuantity || 0) <= 0) return false;
    const exp = new Date(b.expiryDate);
    const diffDays = Math.ceil((exp - now) / 86400000);
    return diffDays >= 0 && diffDays <= 30;
  });

  const topProducts = [...productSalesMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topCategories = [...categorySalesMap.values()].sort(
    (a, b) => b.revenue - a.revenue,
  );

  const customerPurchases = new Map();
  sales.forEach((s) => {
    const name = (s.customerName || "").trim();
    if (name) {
      customerPurchases.set(name, (customerPurchases.get(name) || 0) + 1);
    }
  });
  const repeatBuyers = [...customerPurchases.values()].filter(
    (c) => c > 1,
  ).length;
  const uniqueBuyers = customerPurchases.size;
  const repeatRate =
    uniqueBuyers > 0 ? Math.round((repeatBuyers / uniqueBuyers) * 100) : 0;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    grossMarginPercent,
    avgOrderValue,
    salesCount: sales.length,
    productCount: products.length,
    totalUnits,
    outOfStockProducts,
    lowStockProducts,
    deadStockProducts,
    deadStockCapital,
    expiringBatches,
    topProducts,
    topCategories,
    customerCount: customers.length,
    repeatBuyers,
    uniqueBuyers,
    repeatRate,
    staffPerformance: [...staffSalesMap.values()].sort(
      (a, b) => b.revenue - a.revenue,
    ),
  };
}

// Render the 4 diagnostic KPI health cards at top
function renderDiagnosticKPIs() {
  const grid = $("#aiDiagnosticGrid");
  if (!grid || !storeAnalytics) return;

  const s = storeAnalytics;
  const outCount = s.outOfStockProducts.length;
  const lowCount = s.lowStockProducts.length;
  const expiringCount = s.expiringBatches.length;

  grid.innerHTML = [
    [
      "Total Catalog Products",
      `${s.productCount} SKUs`,
      outCount > 0
        ? `🚨 ${outCount} out of stock, ${lowCount} low stock`
        : lowCount > 0
          ? `⚠️ ${lowCount} low stock alerts`
          : expiringCount > 0
            ? `⚠️ ${expiringCount} batch nearing expiry`
            : "✅ All in stock • 0 alerts",
      outCount > 0
        ? "text-rose-400"
        : lowCount > 0
          ? "text-amber-400"
          : "text-sky-400",
    ],
    [
      "Gross Margin & Profit",
      `${s.grossMarginPercent}%`,
      `${money(s.totalProfit)} profit on ${money(s.totalRevenue)} sales`,
      "text-emerald-400",
    ],
    [
      "Capital in Dead Stock",
      money(s.deadStockCapital),
      `${s.deadStockProducts.length} stocked SKUs with zero sales`,
      s.deadStockCapital > 0 ? "text-amber-400" : "text-slate-400",
    ],
    [
      "Customer Retention",
      `${s.repeatRate}%`,
      `${s.repeatBuyers} repeat buyers of ${s.uniqueBuyers || s.customerCount} customers`,
      s.repeatRate >= 20 ? "text-sky-400" : "text-slate-300",
    ],
  ]
    .map(
      ([title, val, hint, colorClass]) => `
      <div class="glass stat-card">
        <div class="stat-label">${title}</div>
        <div class="stat-value ${colorClass}">${val}</div>
        <div class="stat-hint text-xs">${hint}</div>
      </div>
    `,
    )
    .join("");
}

// Markdown Formatter with executive styling
function formatMarkdown(text = "") {
  if (!text) return "";

  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(
    /^### (.*$)/gim,
    '<h4 class="font-bold text-base text-sky-300 mt-4 mb-2 flex items-center gap-1.5"><span class="text-sky-400">▸</span> $1</h4>',
  );
  html = html.replace(
    /^## (.*$)/gim,
    '<h3 class="font-black text-lg text-white mt-5 mb-2 pb-1 border-b border-slate-700/60">$1</h3>',
  );
  html = html.replace(
    /^# (.*$)/gim,
    '<h2 class="font-black text-xl text-white mt-6 mb-3 pb-1 border-b border-slate-600">$1</h2>',
  );

  // Bold & Italics
  html = html.replace(
    /\*\*(.*?)\*\*/gim,
    '<strong class="font-bold text-white">$1</strong>',
  );
  html = html.replace(
    /\*(.*?)\*/gim,
    '<em class="italic text-slate-300">$1</em>',
  );

  // Monospace code
  html = html.replace(
    /`(.*?)`/gim,
    '<code class="bg-slate-800/90 text-sky-300 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>',
  );

  // Numbered list items
  html = html.replace(
    /^\s*(\d+)\.\s+(.*$)/gim,
    '<div class="flex items-start gap-2.5 my-1.5 pl-1"><span class="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">$1</span><span class="text-slate-200 leading-normal">$2</span></div>',
  );

  // Bullet list items
  html = html.replace(
    /^\s*[•\-\*]\s+(.*$)/gim,
    '<div class="flex items-start gap-2.5 my-1.5 pl-1"><span class="text-sky-400 text-sm leading-none shrink-0 mt-1">•</span><span class="text-slate-200 leading-normal">$1</span></div>',
  );

  // Highlight pill badges
  html = html.replace(
    /\b(CRITICAL|URGENT|OUT OF STOCK)\b/gi,
    '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">$1</span>',
  );
  html = html.replace(
    /\b(WARNING|LOW STOCK|APPROACHING MINIMUM)\b/gi,
    '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">$1</span>',
  );
  html = html.replace(
    /\b(RECOMMENDATION|STRATEGY|ACTION ITEM|PROFIT TIP|OPTIMIZATION)\b/gi,
    '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">$1</span>',
  );

  // Spacing
  html = html.replace(/\n\n+/g, '<div class="h-3"></div>');
  html = html.replace(/\n/g, "<br>");

  return html;
}

// Build clean, dense, high-accuracy context payload for Gemini
function buildStructuredContext() {
  if (!storeAnalytics) return "{}";
  const s = storeAnalytics;

  return JSON.stringify(
    {
      storeFinancials: {
        totalRevenue: s.totalRevenue,
        totalGrossProfit: s.totalProfit,
        grossMarginPercent: s.grossMarginPercent + "%",
        averageOrderValue: s.avgOrderValue,
        totalSalesRecorded: s.salesCount,
      },
      inventoryHealth: {
        totalSKUs: s.productCount,
        totalUnitsInStock: s.totalUnits,
        outOfStockCount: s.outOfStockProducts.length,
        outOfStockItems: s.outOfStockProducts.slice(0, 10).map((p) => p.name),
        lowStockCount: s.lowStockProducts.length,
        lowStockItems: s.lowStockProducts.slice(0, 10).map((p) => ({
          name: p.name,
          currentStock: p.stock,
          minStock: p.minStock || 10,
        })),
        deadStockLockedCapital: s.deadStockCapital,
        deadStockItems: s.deadStockProducts.slice(0, 8).map((p) => ({
          name: p.name,
          stock: p.stock,
          unitPrice: p.price,
        })),
        batchesExpiringWithin30DaysCount: s.expiringBatches.length,
      },
      topPerformingProducts: s.topProducts.map((p) => ({
        name: p.name,
        unitsSold: p.qty,
        revenue: p.revenue,
        profit: p.profit,
      })),
      topCategories: s.topCategories.slice(0, 6).map((c) => ({
        category: c.name,
        revenue: c.revenue,
        unitsSold: c.qty,
      })),
      customerBehavior: {
        totalCustomers: s.customerCount,
        repeatBuyers: s.repeatBuyers,
        repeatRate: s.repeatRate + "%",
      },
    },
    null,
    2,
  );
}

// Local deterministic insights fallback engine
function generateLocalInsights(question, s) {
  const q = String(question || "").toLowerCase();
  const topP = s.topProducts[0] || { name: "None", qty: 0, revenue: 0 };
  const topCat = s.topCategories[0] || { name: "General", revenue: 0 };

  if (q.includes("restock") || q.includes("stock") || q.includes("inventory")) {
    if (!s.outOfStockProducts.length && !s.lowStockProducts.length) {
      return `### 📦 Inventory Health Overview\nAll **${s.productCount} active products** currently maintain sufficient inventory above their minimum safety thresholds. No emergency replenishment is needed today.\n\n### 💡 Strategic Recommendation\n• Focus restock budgets on pre-ordering high-velocity driver: **${topP.name}**.\n• Monitor lead times from suppliers to prevent future pipeline gaps.`;
    }

    const criticalList = s.outOfStockProducts
      .slice(0, 6)
      .map((p) => `• **${p.name}** — CRITICAL (0 units remaining)`)
      .join("\n");

    const lowList = s.lowStockProducts
      .slice(0, 6)
      .map(
        (p) =>
          `• **${p.name}** — LOW STOCK (${p.stock} units left, Min Alert: ${p.minStock || 10})`,
      )
      .join("\n");

    return `### 🚨 Prioritized Restock Strategy\n\n${
      criticalList
        ? `**Out of Stock (Zero Units — Lost Sales Risk):**\n${criticalList}\n\n`
        : ""
    }${
      lowList ? `**Approaching Reorder Threshold:**\n${lowList}\n\n` : ""
    }### 🎯 Recommended Action\n1. Generate purchase orders immediately for the **${s.outOfStockProducts.length} out-of-stock items** to restore sales.\n2. Leverage the Restock module to bundle POs from shared suppliers and minimize freight costs.`;
  }

  if (
    q.includes("profit") ||
    q.includes("margin") ||
    q.includes("cost") ||
    q.includes("price")
  ) {
    return `### 💰 Financial & Gross Margin Analysis\n\n• **Recorded Revenue:** ${money(s.totalRevenue)}\n• **Gross Profit:** ${money(s.totalProfit)} (Overall Margin: **${s.grossMarginPercent}%**)\n• **Average Order Value:** ${money(s.avgOrderValue)}\n• **Top Profit Driver:** **${topP.name}** (${money(topP.revenue)} revenue)\n\n### 📈 Margin Optimization Strategies\n1. **Protect Flagship Margins:** Ensure top seller ${topP.name} maintains at least 35-40% markup.\n2. **Slow Stock Bundles:** Pair low-margin accessories with top category **${topCat.name}** to lift ticket size.\n3. **Vendor Re-negotiation:** Review cost prices for high-volume items to capture an extra 2-4% net margin.`;
  }

  if (q.includes("dead") || q.includes("slow") || q.includes("liquidat")) {
    const deadList = s.deadStockProducts
      .slice(0, 6)
      .map(
        (p) =>
          `• **${p.name}** — Stock: ${p.stock} units, Tied Capital: ${money(Number(p.stock || 0) * Number(p.costPrice || p.price || 0))}`,
      )
      .join("\n");

    return `### ⏳ Dead Stock & Capital Recovery Analysis\n\n• **Total Tied-Up Capital:** **${money(s.deadStockCapital)}** across **${s.deadStockProducts.length} SKUs** with zero recorded sales.\n\n${
      deadList
        ? `**Top Capital-Locking Items:**\n${deadList}\n\n`
        : "All stocked inventory has recorded recent sales movement!\n\n"
    }### 💡 Liquidation & Cash Recovery Action Plan\n1. **Flash Markdown:** Apply a 15–20% discount on slow items at checkout to turn idle inventory back into cash.\n2. **Checkout Basket Add-ons:** Place slow-moving items prominently at staff billing counters.\n3. **Stop Re-orders:** Freeze purchases for zero-velocity SKUs until capital is recovered.`;
  }

  if (
    q.includes("customer") ||
    q.includes("retention") ||
    q.includes("churn")
  ) {
    return `### 👥 Customer Retention & Purchase Frequency\n\n• **Total Customer Profiles:** ${s.customerCount}\n• **Unique Buyers Recorded:** ${s.uniqueBuyers}\n• **Repeat Customers:** ${s.repeatBuyers} (**${s.repeatRate}%** repeat buyer rate)\n\n### 🎯 Retention Growth Plan\n1. **Loyalty Incentives:** Target one-time buyers with a 10% coupon valid on their next purchase within 14 days.\n2. **VIP Recognition:** Engage your ${s.repeatBuyers} repeat customers with early access to restocked items.\n3. **Phone/Email Follow-up:** Prompt staff at checkout to consistently capture customer names and contact info.`;
  }

  // Default Executive Briefing
  return generateExecutiveBriefing(s);
}

// Generate rich Morning Executive Briefing
function generateExecutiveBriefing(s) {
  const topP = s.topProducts[0] || { name: "None", qty: 0, revenue: 0 };
  const topCat = s.topCategories[0] || { name: "General", revenue: 0 };
  const outCount = s.outOfStockProducts.length;
  const lowCount = s.lowStockProducts.length;

  return `### 📊 Store Financial Pulse
• **Revenue Recorded:** **${money(s.totalRevenue)}** across **${s.salesCount} transactions**
• **Estimated Gross Profit:** **${money(s.totalProfit)}** (Blended Margin: **${s.grossMarginPercent}%**)
• **Average Order Value (AOV):** **${money(s.avgOrderValue)}**

### 📦 Inventory Diagnostic Health
• **Catalog Size:** **${s.productCount} SKUs** (${s.totalUnits} total units in stock)
• **Stockout Urgency:** ${
    outCount > 0
      ? `CRITICAL — **${outCount} SKUs out of stock** and **${lowCount} approaching minimums**`
      : `Healthy — Zero out of stock SKUs; **${lowCount} items** need routine replenishment`
  }
• **Dead Capital:** **${money(s.deadStockCapital)}** locked in **${s.deadStockProducts.length} zero-sales items**

### 🏆 Category & Velocity Leaders
• **Leading Product:** **${topP.name}** (${topP.qty} units sold totaling ${money(topP.revenue)})
• **Top Revenue Category:** **${topCat.name}** (${money(topCat.revenue)} in sales)
• **Customer Repeat Rate:** **${s.repeatRate}%** (${s.repeatBuyers} repeat buyers)

### 🎯 Key Action Items for Today
1. **Replenish Critical SKUs:** Prioritize reorders for ${outCount > 0 ? `${outCount} stocked-out items` : "low-stock items"} in the Purchases module.
2. **Re-allocate Dead Capital:** Run promotional bundles on zero-velocity SKUs to free up ${money(s.deadStockCapital)}.
3. **Encourage Add-on Sales:** Brief sales staff to pitch accessories during checkout to lift average order value above ${money(s.avgOrderValue)}.`;
}

// Ask Copilot / Query Gemini
async function askCopilot(question, triggerBtn = null) {
  const answerEl = $("#aiAnswer");
  const headingEl = $("#aiReportHeading");
  const subtitleEl = $("#aiReportSubtitle");
  const modelNameEl = $("#aiModelName");

  if (!answerEl) return;

  const btn = triggerBtn || $("#askAiBtn");
  if (btn) setBusy(btn, true, "Analyzing...");

  const isExecutiveBriefing =
    !question ||
    question.toLowerCase().includes("executive summary") ||
    question.toLowerCase().includes("business summary");

  currentInsightTitle = isExecutiveBriefing
    ? "Executive Business Briefing"
    : question;

  if (headingEl) {
    headingEl.textContent = isExecutiveBriefing
      ? "Executive Business Briefing"
      : question.length > 55
        ? question.slice(0, 52) + "..."
        : question;
  }
  if (subtitleEl) {
    subtitleEl.textContent = `Generated on ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Analyzing store transactions & stock`;
  }

  // Shimmering thinking skeleton
  answerEl.innerHTML = `
    <div class="py-8 flex flex-col items-center justify-center text-center space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-2xl animate-bounce">
        🤖
      </div>
      <div>
        <div class="font-bold text-base text-white">SalesIQ Copilot is synthesizing your data...</div>
        <div class="text-xs text-slate-400 mt-1">Cross-referencing revenue, stock health, and margins across Gemini models.</div>
      </div>
      <div class="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full animate-pulse" style="width: 70%"></div>
      </div>
    </div>
  `;

  try {
    const contextJson = buildStructuredContext();
    const prompt = `You are SalesIQ AI, an executive retail and inventory business analyst for an active business.
Use only the structured financial and inventory data provided below. Give direct, actionable, formatted answers.
Use markdown headings (###), bold text, bullet points (•), and numbered action items. If data is limited, provide realistic retail advice based on what is available.

LIVE STORE DATA:
${contextJson}

ADMIN INQUIRY:
${question || "Provide a comprehensive executive morning briefing with sales velocity, stock health, and strategic growth priorities."}`;

    const result = await callGemini({
      prompt,
      task: "insights",
      systemInstruction:
        "You are SalesIQ AI Copilot, a senior retail analytics officer. Deliver sharp, actionable, structured operational insights.",
      onModelSwitch: (fromModel, toModel) => {
        console.info(
          `[SalesIQ AI] Quota reached on ${fromModel}. Seamlessly switched to ${toModel}.`,
        );
      },
    });

    currentInsightText = result.text;
    if (modelNameEl) {
      modelNameEl.textContent = result.modelUsed || "Gemini AI";
    }

    answerEl.innerHTML = `
      <div class="prose prose-invert max-w-none text-slate-200">
        ${formatMarkdown(result.text)}
      </div>
    `;

    if (isExecutiveBriefing) {
      setCachedBriefing({
        text: result.text,
        modelUsed: result.modelUsed || "Gemini AI",
        timeString: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    recordSessionHistory(
      question || "Executive Business Briefing",
      result.text,
      result.modelUsed || "Gemini AI",
    );
  } catch (err) {
    console.warn(
      "Cloud Gemini API error across model pool, executing local analytics engine:",
      err,
    );

    const isQuotaExhausted =
      String(err.message || "")
        .toLowerCase()
        .includes("exhausted") ||
      String(err.message || "")
        .toLowerCase()
        .includes("429");

    if (isQuotaExhausted) {
      toast(
        "Gemini AI daily quota (RPD) reached across models. Switched to SalesIQ Local Engine.",
        "err",
      );
    }

    if (modelNameEl) {
      modelNameEl.textContent = "SalesIQ Local Engine (Offline)";
    }

    const fallbackAnalysis = generateLocalInsights(question, storeAnalytics);
    currentInsightText = fallbackAnalysis;

    answerEl.innerHTML = `
      <div class="mb-3 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
        <span>⚡ SalesIQ Deterministic Intelligence Engine (Offline Fallback)</span>
      </div>
      <div class="prose prose-invert max-w-none text-slate-200">
        ${formatMarkdown(fallbackAnalysis)}
      </div>
    `;

    if (isExecutiveBriefing) {
      setCachedBriefing({
        text: fallbackAnalysis,
        modelUsed: "SalesIQ Local Engine",
        timeString: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    recordSessionHistory(
      question || "Executive Business Briefing",
      fallbackAnalysis,
      "SalesIQ Local Engine",
    );
    toast("Insights generated from your live business data.", "ok");
  } finally {
    if (btn) setBusy(btn, false);
  }
}

// Keep in-memory session history for instant recall without re-querying
function recordSessionHistory(query, answer, model) {
  sessionHistory.unshift({
    query,
    answer,
    model,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  if (sessionHistory.length > 8) sessionHistory.pop();
  renderSessionHistory();
}

function renderSessionHistory() {
  const container = $("#inquiryHistoryList");
  if (!container) return;

  if (!sessionHistory.length) {
    container.innerHTML =
      '<p class="text-slate-500 italic">No previous questions in this session yet.</p>';
    return;
  }

  container.innerHTML = sessionHistory
    .map(
      (item, idx) => `
      <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group" data-history-idx="${idx}">
        <div class="flex items-center justify-between gap-1 text-[11px] text-slate-400 mb-1">
          <span class="font-bold text-sky-400 truncate">${item.model}</span>
          <span class="text-slate-500 shrink-0">${item.time}</span>
        </div>
        <div class="text-slate-200 font-medium line-clamp-1 group-hover:text-white transition-colors">${item.query}</div>
      </div>
    `,
    )
    .join("");

  container.querySelectorAll("[data-history-idx]").forEach((card) => {
    card.onclick = () => {
      const idx = Number(card.dataset.historyIdx);
      const item = sessionHistory[idx];
      if (!item) return;

      currentInsightText = item.answer;
      currentInsightTitle = item.query;

      const headingEl = $("#aiReportHeading");
      const subtitleEl = $("#aiReportSubtitle");
      const modelNameEl = $("#aiModelName");
      const answerEl = $("#aiAnswer");

      if (headingEl) headingEl.textContent = item.query;
      if (subtitleEl)
        subtitleEl.textContent = `Restored from session history (${item.time})`;
      if (modelNameEl) modelNameEl.textContent = item.model;
      if (answerEl) {
        answerEl.innerHTML = `
          <div class="prose prose-invert max-w-none text-slate-200">
            ${formatMarkdown(item.answer)}
          </div>
        `;
      }
      toast("Restored previous inquiry from session history.", "ok");
    };
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Categorized Quick Prompt Chips
  const promptMap = {
    summary:
      "Give an executive business summary with sales velocity, stock health, and top recommendations.",
    restock:
      "Which products should I restock first and why? Detail critical out-of-stock vs low-stock items.",
    margin:
      "Give profit and margin optimization tips based on prices, cost prices, and category performance.",
    deadstock:
      "Identify slow-moving and dead stock products with tied up capital, and give liquidation strategies.",
    customer:
      "Analyze customer purchase behavior, repeat rate, and recommend retention strategies.",
    staff:
      "Analyze sales velocity and staff performance breakdown to optimize store operations.",
  };

  document.querySelectorAll("[data-prompt-category]").forEach((btn) => {
    btn.onclick = () => {
      const cat = btn.dataset.promptCategory;
      const q = promptMap[cat] || "Give me a business summary.";
      const input = $("#aiQuestion");
      if (input) input.value = q;
      askCopilot(q, btn);
    };
  });

  // Ask Copilot Button & Textarea
  const askBtn = $("#askAiBtn");
  if (askBtn) {
    askBtn.onclick = () => {
      const q =
        $("#aiQuestion")?.value.trim() || "Give an executive business summary.";
      askCopilot(q, askBtn);
    };
  }

  const aiInput = $("#aiQuestion");
  if (aiInput) {
    aiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const q = aiInput.value.trim() || "Give an executive business summary.";
        askCopilot(q, askBtn);
      }
    });
  }

  // Clear Input Button
  const clearBtn = $("#clearAiBtn");
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (aiInput) {
        aiInput.value = "";
        aiInput.focus();
      }
    };
  }

  // Clear History Button
  const clearHistBtn = $("#clearHistoryBtn");
  if (clearHistBtn) {
    clearHistBtn.onclick = () => {
      sessionHistory.length = 0;
      renderSessionHistory();
      toast("Session history cleared.", "ok");
    };
  }

  // Copy Report Button
  const copyBtn = $("#copyAiReportBtn");
  if (copyBtn) {
    copyBtn.onclick = async () => {
      if (!currentInsightText) {
        return toast("No report available to copy.", "warn");
      }
      try {
        await navigator.clipboard.writeText(
          `SalesIQ Executive AI Report: ${currentInsightTitle}\n\n${currentInsightText}`,
        );
        toast("Copied AI report to clipboard!", "ok");
      } catch (_) {
        toast("Could not access clipboard.", "err");
      }
    };
  }

  // Print Report Button
  const printBtn = $("#printAiReportBtn");
  if (printBtn) {
    printBtn.onclick = () => {
      if (!currentInsightText) {
        return toast("No report available to export.", "warn");
      }
      const w = window.open("", "_blank");
      w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SalesIQ Executive AI Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
            h1 { font-size: 24px; margin-bottom: 4px; color: #0284c7; }
            .date { font-size: 13px; color: #64748b; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
            .content { font-size: 14px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>SalesIQ — ${currentInsightTitle}</h1>
          <div class="date">Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} • Powered by Gemini AI</div>
          <div class="content">${currentInsightText}</div>
        </body>
        </html>
      `);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    };
  }

  // Refresh Data Button (Force-clears cached briefing & re-queries Gemini)
  const refreshBtn = $("#refreshAiBtn");
  if (refreshBtn) {
    refreshBtn.onclick = async () => {
      setBusy(refreshBtn, true, "Syncing...");
      toast("Re-syncing business records & re-running Gemini AI...", "info");
      clearCachedBriefing();
      await loadStoreData();
      renderDiagnosticKPIs();
      await askCopilot(
        "Give an executive business summary with sales velocity, stock health, and top recommendations.",
        refreshBtn,
      );
      setBusy(refreshBtn, false);
      toast("AI Briefing refreshed with latest live data.", "ok");
    };
  }
}

// Initial Bootstrap
renderPromptLibrary();
setupEventListeners();
await loadStoreData();
renderDiagnosticKPIs();
hideSkeletonLoader();

// Check if a saved briefing exists from this login session (saves time & token quota)
const cachedBriefing = getCachedBriefing();
if (cachedBriefing && cachedBriefing.text) {
  renderCachedBriefing(cachedBriefing);
} else {
  // Generate fresh briefing via Gemini and save to session cache
  await askCopilot(
    "Give an executive business summary with sales velocity, stock health, and top recommendations.",
  );
}
