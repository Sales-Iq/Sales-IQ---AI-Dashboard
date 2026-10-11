import {
  requireAuth,
  initAppShell,
  $,
  $$,
  money,
  dateText,
  toDate,
  getCachedCollection,
  makeChart,
  emptyState,
  watchCollection,
  hideSkeletonLoader,
  fetchAll,
  convertFromINR,
  getCurrency,
} from "../../js/shared.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "analytics", profile);

let sales = [];
let products = [];
let currentTimeframe = "all";

// ── 1. Instant 0ms cached boot ─────────────────────────────────────────────
try {
  const cachedS =
    getCachedCollection(`salesiq_cache_sales_${profile.id}_true`) ||
    getCachedCollection(`salesiq_cache_sales_${profile.id}_false`);
  const cachedP = getCachedCollection(
    `salesiq_cache_products_${profile.id}_false`,
  );

  const sData = cachedS?.data || (Array.isArray(cachedS) ? cachedS : null);
  const pData = cachedP?.data || (Array.isArray(cachedP) ? cachedP : null);

  if (sData || pData) {
    if (sData) sales = sData;
    if (pData) products = pData;
    renderAnalytics();
    hideSkeletonLoader();
  }
} catch (e) {
  console.warn("Cached analytics restore:", e);
}

// ── 2. Network Fetch ───────────────────────────────────────────────────────
try {
  const [sRows, pRows] = await Promise.all([
    fetchAll("sales", true, profile.id).catch(() => []),
    fetchAll("products", false, profile.id).catch(() => []),
  ]);
  if (sRows) sales = sRows;
  if (pRows) products = pRows;
  renderAnalytics();
} catch (err) {
  console.warn("Initial analytics fetch error:", err);
} finally {
  hideSkeletonLoader();
}

// ── 3. Date & Timeframe Helpers ────────────────────────────────────────────
function saleDate(sale) {
  if (!sale?.createdAt) return null;
  const d = toDate(sale.createdAt);
  return d && !isNaN(d.getTime()) ? d : null;
}

function toLocalYMD(d) {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(ymd) {
  if (!ymd) return "";
  const parts = ymd.split("-").map(Number);
  if (parts.length < 3) return ymd;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatMonthLabel(ym) {
  if (!ym) return "";
  const parts = ym.split("-").map(Number);
  if (parts.length < 2) return ym;
  const d = new Date(parts[0], parts[1] - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function getFilteredSales() {
  if (currentTimeframe === "all") return sales;

  const now = new Date();
  const todayStr = toLocalYMD(now);
  const currentMonthStr = todayStr.slice(0, 7);

  if (currentTimeframe === "today") {
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && toLocalYMD(d) === todayStr;
    });
  }

  if (currentTimeframe === "month") {
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && toLocalYMD(d).startsWith(currentMonthStr);
    });
  }

  if (currentTimeframe === "7d") {
    const cut = new Date();
    cut.setDate(cut.getDate() - 7);
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && d >= cut;
    });
  }

  if (currentTimeframe === "30d") {
    const cut = new Date();
    cut.setDate(cut.getDate() - 30);
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && d >= cut;
    });
  }

  return sales;
}

// ── 4. Accurate Gross Profit Calculation ───────────────────────────────────
function getSaleProfit(sale) {
  if (
    sale.profit !== undefined &&
    sale.profit !== null &&
    !isNaN(Number(sale.profit))
  ) {
    return Number(sale.profit);
  }
  const product = products.find(
    (p) =>
      p.id === sale.productId ||
      (p.name &&
        sale.productName &&
        p.name.trim().toLowerCase() === sale.productName.trim().toLowerCase()),
  );
  const cost = Number(product?.costPrice || 0);
  const total = Number(sale.totalAmount || 0);
  const qty = Math.max(1, Number(sale.quantity || 1));
  const unitPrice = Number(sale.unitPrice || total / qty);

  if (cost > 0) {
    return (unitPrice - cost) * qty;
  }
  return total * 0.3; // Default estimated margin fallback
}

function sumBy(arr, keyFn, valueFn) {
  return arr.reduce((map, item) => {
    const key = keyFn(item);
    if (!key) return map;
    map[key] = (map[key] || 0) + valueFn(item);
    return map;
  }, {});
}

function sortObjectKeys(obj) {
  return Object.keys(obj).sort();
}

// ── 5. KPI Stats Grid ──────────────────────────────────────────────────────
function renderKpis(filteredSales) {
  const statsEl = $("#analyticsStats");
  if (!statsEl) return;

  const totalRevenue = filteredSales.reduce(
    (sum, s) => sum + Number(s.totalAmount || 0),
    0,
  );
  const totalProfit = filteredSales.reduce(
    (sum, s) => sum + getSaleProfit(s),
    0,
  );
  const marginPercent =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
  const aov =
    filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const totalUnits = filteredSales.reduce(
    (sum, s) => sum + Math.max(1, Number(s.quantity || 1)),
    0,
  );

  statsEl.innerHTML = `
    <div class="glass stat-card glass-card-hover">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value text-sky-400 font-bold">${money(totalRevenue)}</div>
      <div class="stat-hint">${filteredSales.length} orders in selected timeframe</div>
    </div>
    <div class="glass stat-card glass-card-hover">
      <div class="stat-label">Estimated Gross Profit</div>
      <div class="stat-value text-emerald-400 font-bold">${money(totalProfit)}</div>
      <div class="stat-hint"><span class="text-emerald-400 font-bold">${marginPercent}%</span> blended profit margin</div>
    </div>
    <div class="glass stat-card glass-card-hover">
      <div class="stat-label">Average Order Value (AOV)</div>
      <div class="stat-value text-purple-400 font-bold">${money(aov)}</div>
      <div class="stat-hint">Revenue per order</div>
    </div>
    <div class="glass stat-card glass-card-hover">
      <div class="stat-label">Units Sold</div>
      <div class="stat-value text-amber-400 font-bold">${totalUnits}</div>
      <div class="stat-hint">Across ${products.length} products in catalog</div>
    </div>
  `;
}

// ── 6. Charts Rendering ────────────────────────────────────────────────────
function renderCharts(filteredSales) {
  const dateKey = (sale) => {
    const d = saleDate(sale);
    return d ? toLocalYMD(d) : null;
  };

  const monthKey = (sale) => {
    const d = saleDate(sale);
    return d ? toLocalYMD(d).slice(0, 7) : null;
  };

  const daily = sumBy(filteredSales, dateKey, (sale) =>
    Number(sale.totalAmount || 0),
  );
  const monthly = sumBy(filteredSales, monthKey, (sale) =>
    Number(sale.totalAmount || 0),
  );
  const topProducts = sumBy(
    filteredSales,
    (sale) => sale.productName || "Unknown",
    (sale) => Math.max(1, Number(sale.quantity || 1)),
  );
  const profit = sumBy(filteredSales, dateKey, (sale) => getSaleProfit(sale));

  const categorySales = {};
  filteredSales.forEach((sale) => {
    const product = products.find(
      (p) =>
        p.id === sale.productId ||
        (p.name &&
          sale.productName &&
          p.name.trim().toLowerCase() === sale.productName.trim().toLowerCase()),
    );
    const category = product?.category || sale.category || "General";
    categorySales[category] =
      (categorySales[category] || 0) + Number(sale.totalAmount || 0);
  });

  const dailyLabels = sortObjectKeys(daily);
  const monthlyLabels = sortObjectKeys(monthly);
  const profitLabels = sortObjectKeys(profit);
  const sortedTopProducts = Object.entries(topProducts).sort(
    (a, b) => b[1] - a[1],
  );

  // Update chart header badges
  const totalPeriodRevenue = Object.values(daily).reduce((a, b) => a + b, 0);
  const totalPeriodProfit = Object.values(profit).reduce((a, b) => a + b, 0);

  const dBadge = $("#dailySalesBadge");
  if (dBadge) dBadge.textContent = `${dailyLabels.length} active days`;

  const mBadge = $("#monthlySalesBadge");
  if (mBadge) mBadge.textContent = `${monthlyLabels.length} months`;

  const tpBadge = $("#topProductsBadge");
  if (tpBadge) tpBadge.textContent = `${sortedTopProducts.length} items sold`;

  const cBadge = $("#categoryBadge");
  if (cBadge) cBadge.textContent = `${Object.keys(categorySales).length} categories`;

  const gBadge = $("#growthBadge");
  if (gBadge) gBadge.textContent = `${money(totalPeriodRevenue)} total`;

  const pBadge = $("#profitBadge");
  if (pBadge) pBadge.textContent = `${money(totalPeriodProfit)} net`;

  // 1. Daily Sales Trend
  makeChart(
    $("#dailySalesChart"),
    "line",
    {
      labels: dailyLabels.length ? dailyLabels.map(formatShortDate) : ["No data"],
      datasets: [
        {
          label: "Daily Sales",
          data: dailyLabels.length ? dailyLabels.map((k) => convertFromINR(daily[k])) : [0],
          tension: 0.35,
          fill: true,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,.18)",
          pointBackgroundColor: "#38bdf8",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              return dailyLabels[idx] || "";
            },
            label: (item) => ` Sales: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => money(val, getCurrency(), false),
          },
        },
      },
    },
  );

  // 2. Monthly Sales
  makeChart(
    $("#monthlySalesChart"),
    "bar",
    {
      labels: monthlyLabels.length
        ? monthlyLabels.map(formatMonthLabel)
        : ["No data"],
      datasets: [
        {
          label: "Monthly Revenue",
          data: monthlyLabels.length
            ? monthlyLabels.map((k) => convertFromINR(monthly[k]))
            : [0],
          borderColor: "#c084fc",
          backgroundColor: "rgba(192,132,252,.45)",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) => ` Revenue: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => money(val, getCurrency(), false),
          },
        },
      },
    },
  );

  // 3. Top Selling Products
  const top8 = sortedTopProducts.slice(0, 8);
  makeChart(
    $("#topProductsChart"),
    "bar",
    {
      labels: top8.length ? top8.map((item) => item[0]) : ["No products sold"],
      datasets: [
        {
          label: "Units Sold",
          data: top8.length ? top8.map((item) => item[1]) : [0],
          borderColor: "#34d399",
          backgroundColor: "rgba(52,211,153,.45)",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.raw} units sold`,
          },
        },
      },
    },
  );

  // 4. Category-wise Sales
  const catKeys = Object.keys(categorySales);
  makeChart(
    $("#categorySalesChart"),
    "doughnut",
    {
      labels: catKeys.length ? catKeys : ["No sales"],
      datasets: [
        {
          label: "Category Sales",
          data: catKeys.length
            ? Object.values(categorySales).map((v) => convertFromINR(v))
            : [1],
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) =>
              ` ${item.label}: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
    },
  );

  // 5. Cumulative Revenue Growth
  const cumulativeRevenue = [];
  dailyLabels.forEach((key, index) => {
    cumulativeRevenue.push(
      (cumulativeRevenue[index - 1] || 0) + convertFromINR(daily[key] || 0),
    );
  });

  makeChart(
    $("#revenueChart"),
    "line",
    {
      labels: dailyLabels.length
        ? dailyLabels.map(formatShortDate)
        : ["No data"],
      datasets: [
        {
          label: "Cumulative Revenue",
          data: cumulativeRevenue.length ? cumulativeRevenue : [0],
          fill: true,
          tension: 0.35,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,.22)",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              return dailyLabels[idx] || "";
            },
            label: (item) =>
              ` Cumulative: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => money(val, getCurrency(), false),
          },
        },
      },
    },
  );

  // 6. Gross Profit Trend
  makeChart(
    $("#profitChart"),
    "line",
    {
      labels: profitLabels.length
        ? profitLabels.map(formatShortDate)
        : ["No data"],
      datasets: [
        {
          label: "Gross Profit",
          data: profitLabels.length
            ? profitLabels.map((k) => convertFromINR(profit[k]))
            : [0],
          fill: true,
          tension: 0.35,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,.20)",
          pointBackgroundColor: "#10b981",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              return profitLabels[idx] || "";
            },
            label: (item) =>
              ` Profit: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => money(val, getCurrency(), false),
          },
        },
      },
    },
  );
}

// ── 7. Least-Selling Products & Dead Stock Table ───────────────────────────
function renderLeastProducts(filteredSales) {
  const container = $("#leastProducts");
  if (!container) return;

  if (!products.length) {
    container.innerHTML = emptyState(
      "No products in catalog",
      "Add products in the Products page to view inventory movement.",
    );
    return;
  }

  // Count units sold and revenue per product in filtered period
  const salesByProduct = new Map();
  filteredSales.forEach((s) => {
    const key =
      s.productId || (s.productName ? s.productName.trim().toLowerCase() : "");
    if (!key) return;
    const cur = salesByProduct.get(key) || { units: 0, revenue: 0 };
    cur.units += Math.max(1, Number(s.quantity || 1));
    cur.revenue += Number(s.totalAmount || 0);
    salesByProduct.set(key, cur);
  });

  // Map ALL products in inventory (including 0-sales dead stock!)
  const movementList = products.map((p) => {
    const byId = salesByProduct.get(p.id);
    const byName = p.name ? salesByProduct.get(p.name.trim().toLowerCase()) : null;
    const stats = byId || byName || { units: 0, revenue: 0 };

    const stock = Number(p.stock || 0);
    const price = Number(p.price || 0);
    const lockedValue = stock * price;

    let movementStatus = "active";
    if (stats.units === 0) {
      movementStatus = "dead";
    } else if (stats.units <= 3) {
      movementStatus = "slow";
    }

    return {
      product: p,
      name: p.name || "Unnamed Product",
      category: p.category || "General",
      stock,
      minStock: Number(p.minStock || 5),
      unitsSold: stats.units,
      revenue: stats.revenue,
      lockedValue,
      movementStatus,
    };
  });

  // Sort: 0-sales dead stock first, then by highest locked stock value
  movementList.sort((a, b) => {
    if (a.unitsSold !== b.unitsSold) return a.unitsSold - b.unitsSold;
    return b.lockedValue - a.lockedValue;
  });

  const deadCount = movementList.filter((m) => m.movementStatus === "dead").length;
  const deadBadge = $("#deadStockCountBadge");
  if (deadBadge) {
    deadBadge.textContent = `${deadCount} dead stock item${deadCount === 1 ? "" : "s"} (0 units sold)`;
    deadBadge.className =
      deadCount > 0 ? "badge badge-warn text-xs" : "badge badge-ok text-xs";
  }

  const displayList = movementList.slice(0, 15);

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>In Stock</th>
            <th>Units Sold</th>
            <th>Locked Stock Value</th>
            <th>Movement Status</th>
          </tr>
        </thead>
        <tbody>
          ${displayList
            .map((item) => {
              let badgeHtml = "";
              if (item.movementStatus === "dead") {
                badgeHtml =
                  '<span class="badge badge-danger">⚠️ Dead Stock (0 sold)</span>';
              } else if (item.movementStatus === "slow") {
                badgeHtml = `<span class="badge badge-warn">⏳ Slow Mover (${item.unitsSold} sold)</span>`;
              } else {
                badgeHtml = `<span class="badge badge-ok">✅ Steady Mover (${item.unitsSold} sold)</span>`;
              }

              const stockColor =
                item.stock <= 0
                  ? "text-rose-400 font-bold"
                  : item.stock <= item.minStock
                    ? "text-amber-400 font-semibold"
                    : "text-slate-200";

              return `
              <tr>
                <td class="font-bold text-slate-100">${item.name}</td>
                <td><span class="badge badge-info">${item.category}</span></td>
                <td class="${stockColor}">${item.stock} units</td>
                <td class="font-mono font-bold ${item.unitsSold === 0 ? "text-rose-400" : "text-emerald-400"}">${item.unitsSold}</td>
                <td class="font-mono text-slate-300 font-semibold">${money(item.lockedValue)}</td>
                <td>${badgeHtml}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ── 8. Master Render Function & Debouncing ──────────────────────────────────
function renderAnalytics() {
  const filteredSales = getFilteredSales();
  renderKpis(filteredSales);
  renderCharts(filteredSales);
  renderLeastProducts(filteredSales);
  hideSkeletonLoader();
}

let renderPending = false;
function scheduleRenderCharts() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    renderAnalytics();
  });
}

// ── 9. Timeframe Control Handlers ──────────────────────────────────────────
function initTimeframeControls() {
  const container = $("#timeframeFilterGroup");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".timeframe-tab");
    if (!btn) return;

    currentTimeframe = btn.dataset.timeframe || "all";

    container.querySelectorAll(".timeframe-tab").forEach((b) => {
      if (b === btn) {
        b.className =
          "btn btn-xs px-3 py-1.5 rounded-lg timeframe-tab btn-primary font-medium";
      } else {
        b.className =
          "btn btn-xs px-3 py-1.5 rounded-lg timeframe-tab btn-ghost text-slate-300 hover:text-white";
      }
    });

    renderAnalytics();
  });
}

initTimeframeControls();

// ── 10. Realtime Firestore Watchers ────────────────────────────────────────
const unsubs = [
  watchCollection(
    "sales",
    (rows) => {
      sales = rows;
      scheduleRenderCharts();
    },
    true,
    profile.id,
  ),
  watchCollection(
    "products",
    (rows) => {
      products = rows;
      scheduleRenderCharts();
    },
    false,
    profile.id,
  ),
];

window.addEventListener("salesiq:cache-updated", (e) => {
  if (e.detail?.name === "sales" && Array.isArray(e.detail.data)) {
    sales = e.detail.data;
    scheduleRenderCharts();
  } else if (e.detail?.name === "products" && Array.isArray(e.detail.data)) {
    products = e.detail.data;
    scheduleRenderCharts();
  }
});

window.addEventListener("beforeunload", () => {
  unsubs.forEach((unsub) => unsub?.());
});
