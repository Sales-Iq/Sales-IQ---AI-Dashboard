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
  convertFromINR,
  getCurrency,
  toCSV,
  toast,
  getTheme,
  animateCounters,
  initLiquidTabs,
  syncChartThemeColors,
} from "../../js/shared.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "analytics", profile);

// ── State & Config ─────────────────────────────────────────────────────────
let sales = [];
let products = [];
let currentTimeframe = "all";
let customStartDate = "";
let customEndDate = "";
let timelineGranularity = "daily";
let deadStockSearchTerm = "";
let deadStockCategory = "all";

const DEFAULT_CHART_PREFS = {
  dailySales: { type: "line", metric: "revenue" },
  monthlySales: { type: "bar", metric: "revenue" },
  topProducts: { type: "bar", metric: "units" },
  categorySales: { type: "doughnut", metric: "revenue" },
  revenueGrowth: { type: "area" },
  profitTrend: { type: "line", metric: "profit" },
  paymentMethod: { type: "doughnut", metric: "revenue" },
  dayOfWeek: { type: "bar", metric: "revenue" },
  aovTrend: { type: "line" },
  staffPerformance: { type: "bar", metric: "revenue" },
};

function loadChartPrefs() {
  try {
    const saved = localStorage.getItem("salesiq_analytics_chart_prefs");
    if (saved) return { ...DEFAULT_CHART_PREFS, ...JSON.parse(saved) };
  } catch (_) {}
  return { ...DEFAULT_CHART_PREFS };
}

function saveChartPrefs() {
  try {
    localStorage.setItem("salesiq_analytics_chart_prefs", JSON.stringify(chartPrefs));
  } catch (_) {}
}

let chartPrefs = loadChartPrefs();

// Global export helper for chart PNGs
window.salesiqChartExport = function (canvasId, title = "chart") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    toast("Chart canvas not found", "warn");
    return;
  }
  try {
    const link = document.createElement("a");
    const dStr = new Date().toISOString().slice(0, 10);
    link.download = `salesiq-${title.toLowerCase()}-${dStr}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast(`Exported ${title} as PNG`, "ok");
  } catch (err) {
    console.error("Export chart error:", err);
    toast("Failed to export chart image", "danger");
  }
};

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
    populateCategoryFilter();
    renderAnalytics();
    hideSkeletonLoader();
  }
} catch (e) {
  console.warn("Cached analytics restore:", e);
}

// ── 2. Live Data streamed via watchCollection below ────────────────────────

// ── 3. Date & Timeframe Helpers ────────────────────────────────────────────
function saleDate(sale) {
  if (!sale) return null;
  const raw = sale.createdAt || sale.saleDate || sale.date;
  if (!raw) return null;
  const d = toDate(raw);
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

function getWeekKey(d) {
  if (!d) return "";
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7));
  const yearStart = new Date(dt.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
  return `${dt.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function formatWeekLabel(wKey) {
  if (!wKey) return "";
  return `Wk ${wKey.replace(/^[0-9]+-W0?/, "")}`;
}

function getFilteredSales() {
  const now = new Date();
  const todayStr = toLocalYMD(now);
  const currentMonthStr = todayStr.slice(0, 7);

  if (currentTimeframe === "today") {
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && toLocalYMD(d) === todayStr;
    });
  }

  if (currentTimeframe === "7d") {
    const cut = new Date();
    cut.setDate(cut.getDate() - 7);
    cut.setHours(0, 0, 0, 0);
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && d >= cut;
    });
  }

  if (currentTimeframe === "30d") {
    const cut = new Date();
    cut.setDate(cut.getDate() - 30);
    cut.setHours(0, 0, 0, 0);
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && d >= cut;
    });
  }

  if (currentTimeframe === "90d") {
    const cut = new Date();
    cut.setDate(cut.getDate() - 90);
    cut.setHours(0, 0, 0, 0);
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && d >= cut;
    });
  }

  if (currentTimeframe === "month") {
    return sales.filter((s) => {
      const d = saleDate(s);
      return d && toLocalYMD(d).startsWith(currentMonthStr);
    });
  }

  if (currentTimeframe === "custom") {
    const startObj = customStartDate ? new Date(customStartDate + "T00:00:00") : null;
    const endObj = customEndDate ? new Date(customEndDate + "T23:59:59") : null;
    return sales.filter((s) => {
      const d = saleDate(s);
      if (!d) return false;
      if (startObj && d < startObj) return false;
      if (endObj && d > endObj) return false;
      return true;
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

  const total = Number(sale.totalAmount || 0);
  const qty = Math.max(1, Number(sale.quantity || 1));
  const unitPrice = Number(sale.unitPrice || (qty > 0 ? total / qty : 0));

  if (
    product &&
    product.costPrice !== undefined &&
    product.costPrice !== null &&
    !isNaN(Number(product.costPrice))
  ) {
    return (unitPrice - Number(product.costPrice)) * qty;
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
      <div class="stat-hint">${filteredSales.length} orders in selected timeline</div>
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
  if (typeof window !== "undefined" && window.FramerMotion && typeof window.FramerMotion.staggerIn === "function") {
    window.FramerMotion.staggerIn(statsEl, ".stat-card", { stagger: 40, yOffset: 14, preset: "gentle" });
  }
  animateCounters(statsEl);
}

// ── 6. 10 Customizable Charts Rendering ────────────────────────────────────
let hasRenderedNonEmptyAnalytics = false;

function renderCharts(filteredSales, replayAnimation = false) {
  const isLight =
    document.body.classList.contains("light") || getTheme() === "light";

  const shouldReplay =
    replayAnimation ||
    (!hasRenderedNonEmptyAnalytics && filteredSales.length > 0);
  if (filteredSales.length > 0) {
    hasRenderedNonEmptyAnalytics = true;
  }

  // Timeline grouping key generator based on user granularity
  const dateKey = (sale) => {
    const d = saleDate(sale);
    if (!d) return null;
    if (timelineGranularity === "monthly") return toLocalYMD(d).slice(0, 7);
    if (timelineGranularity === "weekly") return getWeekKey(d);
    return toLocalYMD(d);
  };

  const monthKey = (sale) => {
    const d = saleDate(sale);
    return d ? toLocalYMD(d).slice(0, 7) : null;
  };

  // Base Aggregations
  const dailyRev = sumBy(filteredSales, dateKey, (s) => Number(s.totalAmount || 0));
  const dailyOrders = sumBy(filteredSales, dateKey, () => 1);
  const dailyUnits = sumBy(filteredSales, dateKey, (s) => Math.max(1, Number(s.quantity || 1)));

  const monthlyRev = sumBy(filteredSales, monthKey, (s) => Number(s.totalAmount || 0));
  const monthlyOrders = sumBy(filteredSales, monthKey, () => 1);

  const profitByDate = sumBy(filteredSales, dateKey, (s) => getSaleProfit(s));

  // Determine timeline keys with continuous dates for daily view (if timeframe <= 90d)
  let timelineLabels = sortObjectKeys(dailyRev);
  if (
    timelineGranularity === "daily" &&
    (currentTimeframe === "7d" || currentTimeframe === "30d" || currentTimeframe === "custom")
  ) {
    // Generate gap-filled daily keys
    const dates = [];
    let startD = null;
    let endD = null;

    if (currentTimeframe === "7d") {
      startD = new Date();
      startD.setDate(startD.getDate() - 7);
      endD = new Date();
    } else if (currentTimeframe === "30d") {
      startD = new Date();
      startD.setDate(startD.getDate() - 30);
      endD = new Date();
    } else if (currentTimeframe === "custom" && customStartDate && customEndDate) {
      startD = new Date(customStartDate + "T00:00:00");
      endD = new Date(customEndDate + "T23:59:59");
    }

    if (startD && endD && !isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
      const cur = new Date(startD);
      cur.setHours(0, 0, 0, 0);
      const endLimit = new Date(endD);
      while (cur <= endLimit && dates.length < 120) {
        dates.push(toLocalYMD(cur));
        cur.setDate(cur.getDate() + 1);
      }
      if (dates.length > 0) {
        timelineLabels = dates;
      }
    }
  }

  // ── 1. Daily / Timeline Sales Trend ──────────────────────────────────────
  const dailyMetric = chartPrefs.dailySales.metric || "revenue";
  const dailyType = chartPrefs.dailySales.type || "line";
  const isDailyArea = dailyType === "area";
  const actualDailyType = isDailyArea ? "line" : dailyType;

  let dailyData = [];
  let dailyLabelText = "Sales Revenue";

  if (dailyMetric === "orders") {
    dailyData = timelineLabels.map((k) => dailyOrders[k] || 0);
    dailyLabelText = "Orders";
  } else if (dailyMetric === "units") {
    dailyData = timelineLabels.map((k) => dailyUnits[k] || 0);
    dailyLabelText = "Units Sold";
  } else {
    dailyData = timelineLabels.map((k) => convertFromINR(dailyRev[k] || 0));
    dailyLabelText = "Revenue";
  }

  const dBadge = $("#dailySalesBadge");
  if (dBadge) {
    const totalCount = Object.values(dailyOrders).reduce((a, b) => a + b, 0);
    dBadge.textContent = `${timelineLabels.length} ${timelineGranularity === "monthly" ? "months" : timelineGranularity === "weekly" ? "weeks" : "days"} (${totalCount} orders)`;
  }

  const dTitle = $("#dailySalesTitle");
  if (dTitle) {
    dTitle.textContent = `${timelineGranularity === "monthly" ? "Monthly" : timelineGranularity === "weekly" ? "Weekly" : "Daily"} Sales Trend`;
  }

  const dTooltipTitle = $("#dailySalesTooltipTitle");
  if (dTooltipTitle) {
    dTooltipTitle.textContent = `${timelineGranularity === "monthly" ? "Monthly" : timelineGranularity === "weekly" ? "Weekly" : "Daily"} Sales Trend`;
  }

  makeChart(
    $("#dailySalesChart"),
    actualDailyType,
    {
      labels: timelineLabels.length
        ? timelineLabels.map(timelineGranularity === "monthly" ? formatMonthLabel : timelineGranularity === "weekly" ? formatWeekLabel : formatShortDate)
        : ["No data"],
      datasets: [
        {
          label: dailyLabelText,
          data: dailyData.length ? dailyData : [0],
          tension: 0.35,
          fill: isDailyArea || actualDailyType === "line",
          borderColor: isLight ? "#2563eb" : "#3b82f6",
          backgroundColor: isDailyArea
            ? (isLight ? "rgba(37,99,235,.25)" : "rgba(59,130,246,.30)")
            : (isLight ? "rgba(37,99,235,.12)" : "rgba(59,130,246,.16)"),
          pointBackgroundColor: isLight ? "#2563eb" : "#3b82f6",
        },
      ],
    },
    {
      replayLeftToRight: shouldReplay,
      animationDelay: 420,
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => timelineLabels[items[0]?.dataIndex] || "",
            label: (item) =>
              dailyMetric === "revenue"
                ? ` Revenue: ${money(item.raw, getCurrency(), false)}`
                : ` ${dailyLabelText}: ${item.raw}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) =>
              dailyMetric === "revenue"
                ? money(val, getCurrency(), false)
                : val,
          },
        },
      },
    },
  );

  // ── 2. Monthly Sales Comparison ──────────────────────────────────────────
  const monthlyMetric = chartPrefs.monthlySales.metric || "revenue";
  const monthlyType = chartPrefs.monthlySales.type || "bar";
  const monthlyLabels = sortObjectKeys(monthlyRev);

  const mData = monthlyLabels.map((k) =>
    monthlyMetric === "orders" ? monthlyOrders[k] || 0 : convertFromINR(monthlyRev[k] || 0),
  );

  const mBadge = $("#monthlySalesBadge");
  if (mBadge) mBadge.textContent = `${monthlyLabels.length} months`;

  makeChart(
    $("#monthlySalesChart"),
    monthlyType,
    {
      labels: monthlyLabels.length
        ? monthlyLabels.map(formatMonthLabel)
        : ["No data"],
      datasets: [
        {
          label: monthlyMetric === "orders" ? "Monthly Orders" : "Monthly Revenue",
          data: mData.length ? mData : [0],
          borderColor: isLight ? "#7c3aed" : "#c084fc",
          backgroundColor: isLight ? "rgba(124,58,237,.35)" : "rgba(192,132,252,.45)",
          pointBackgroundColor: isLight ? "#7c3aed" : "#c084fc",
          fill: monthlyType === "line",
          tension: 0.35,
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) =>
              monthlyMetric === "orders"
                ? ` Orders: ${item.raw}`
                : ` Revenue: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) =>
              monthlyMetric === "orders"
                ? val
                : money(val, getCurrency(), false),
          },
        },
      },
    },
  );

  // ── 3. Top Products Performance ──────────────────────────────────────────
  const topMetric = chartPrefs.topProducts.metric || "units";
  const topTypePref = chartPrefs.topProducts.type || "bar";
  const isHorizontalTop = topTypePref === "horizontal";
  const actualTopType = isHorizontalTop ? "bar" : topTypePref;

  const productAgg = {};
  filteredSales.forEach((s) => {
    const name = s.productName || "Unknown Product";
    if (!productAgg[name]) {
      productAgg[name] = { units: 0, revenue: 0, profit: 0 };
    }
    productAgg[name].units += Math.max(1, Number(s.quantity || 1));
    productAgg[name].revenue += Number(s.totalAmount || 0);
    productAgg[name].profit += getSaleProfit(s);
  });

  const sortedProducts = Object.entries(productAgg).sort((a, b) => {
    if (topMetric === "revenue") return b[1].revenue - a[1].revenue;
    if (topMetric === "profit") return b[1].profit - a[1].profit;
    return b[1].units - a[1].units;
  });

  const top8 = sortedProducts.slice(0, 8);
  const topLabels = top8.length ? top8.map((item) => item[0]) : ["No products sold"];
  const topDataValues = top8.length
    ? top8.map((item) =>
        topMetric === "revenue"
          ? convertFromINR(item[1].revenue)
          : topMetric === "profit"
            ? convertFromINR(item[1].profit)
            : item[1].units,
      )
    : [0];

  const tpBadge = $("#topProductsBadge");
  if (tpBadge) tpBadge.textContent = `${sortedProducts.length} items sold`;

  makeChart(
    $("#topProductsChart"),
    actualTopType,
    {
      labels: topLabels,
      datasets: [
        {
          label:
            topMetric === "revenue"
              ? "Gross Revenue"
              : topMetric === "profit"
                ? "Gross Profit"
                : "Units Sold",
          data: topDataValues,
          borderColor: isLight ? "#2563eb" : "#60a5fa",
          backgroundColor:
            actualTopType === "doughnut"
              ? undefined
              : isLight
                ? "rgba(37,99,235,.30)"
                : "rgba(96,165,250,.40)",
        },
      ],
    },
    {
      indexAxis: isHorizontalTop ? "y" : "x",
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) =>
              topMetric === "units"
                ? ` ${item.raw} units sold`
                : ` ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: actualTopType === "doughnut"
        ? {}
        : isHorizontalTop
          ? {
              x: {
                ticks: {
                  callback: (val) =>
                    topMetric === "units" ? val : money(val, getCurrency(), false),
                },
              },
            }
          : {
              y: {
                ticks: {
                  callback: (val) =>
                    topMetric === "units" ? val : money(val, getCurrency(), false),
                },
              },
            },
    },
  );

  // ── 4. Category-wise Sales ───────────────────────────────────────────────
  const catMetric = chartPrefs.categorySales.metric || "revenue";
  const catType = chartPrefs.categorySales.type || "doughnut";

  const categoryAgg = {};
  filteredSales.forEach((sale) => {
    const product = products.find(
      (p) =>
        p.id === sale.productId ||
        (p.name &&
          sale.productName &&
          p.name.trim().toLowerCase() === sale.productName.trim().toLowerCase()),
    );
    const category = product?.category || sale.category || "General";
    if (!categoryAgg[category]) {
      categoryAgg[category] = { revenue: 0, units: 0 };
    }
    categoryAgg[category].revenue += Number(sale.totalAmount || 0);
    categoryAgg[category].units += Math.max(1, Number(sale.quantity || 1));
  });

  const catKeys = Object.keys(categoryAgg);
  const catDataValues = catKeys.length
    ? catKeys.map((k) =>
        catMetric === "units"
          ? categoryAgg[k].units
          : convertFromINR(categoryAgg[k].revenue),
      )
    : [1];

  const cBadge = $("#categoryBadge");
  if (cBadge) cBadge.textContent = `${catKeys.length} categories`;

  makeChart(
    $("#categorySalesChart"),
    catType,
    {
      labels: catKeys.length ? catKeys : ["No sales"],
      datasets: [
        {
          label: catMetric === "units" ? "Units Sold" : "Revenue",
          data: catDataValues,
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) =>
              catMetric === "units"
                ? ` ${item.label}: ${item.raw} units`
                : ` ${item.label}: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
    },
  );

  // ── 5. Cumulative Revenue Growth ─────────────────────────────────────────
  const growthTypePref = chartPrefs.revenueGrowth.type || "area";
  const actualGrowthType = growthTypePref === "area" ? "line" : growthTypePref;

  const cumulativeRevenue = [];
  timelineLabels.forEach((key, index) => {
    cumulativeRevenue.push(
      (cumulativeRevenue[index - 1] || 0) + convertFromINR(dailyRev[key] || 0),
    );
  });

  const totalPeriodRevenue = Object.values(dailyRev).reduce((a, b) => a + b, 0);
  const gBadge = $("#growthBadge");
  if (gBadge) gBadge.textContent = `${money(totalPeriodRevenue)} total`;

  makeChart(
    $("#revenueChart"),
    actualGrowthType,
    {
      labels: timelineLabels.length
        ? timelineLabels.map(timelineGranularity === "monthly" ? formatMonthLabel : timelineGranularity === "weekly" ? formatWeekLabel : formatShortDate)
        : ["No data"],
      datasets: [
        {
          label: "Cumulative Revenue",
          data: cumulativeRevenue.length ? cumulativeRevenue : [0],
          fill: growthTypePref === "area" || actualGrowthType === "line",
          tension: 0.35,
          borderColor: isLight ? "#2563eb" : "#3b82f6",
          backgroundColor:
            growthTypePref === "area"
              ? isLight
                ? "rgba(37,99,235,.22)"
                : "rgba(59,130,246,.25)"
              : isLight
                ? "rgba(37,99,235,.10)"
                : "rgba(59,130,246,.12)",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => timelineLabels[items[0]?.dataIndex] || "",
            label: (item) => ` Cumulative: ${money(item.raw, getCurrency(), false)}`,
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

  // ── 6. Gross Profit Trend & Margins ──────────────────────────────────────
  const profitMetric = chartPrefs.profitTrend.metric || "profit";
  const profitTypePref = chartPrefs.profitTrend.type || "line";
  const isProfitArea = profitTypePref === "area";
  const actualProfitType = isProfitArea ? "line" : profitTypePref;

  const profitValues = timelineLabels.map((k) => {
    if (profitMetric === "margin") {
      const rev = dailyRev[k] || 0;
      const prof = profitByDate[k] || 0;
      return rev > 0 ? Number(((prof / rev) * 100).toFixed(1)) : 0;
    }
    return convertFromINR(profitByDate[k] || 0);
  });

  const totalPeriodProfit = Object.values(profitByDate).reduce((a, b) => a + b, 0);
  const pBadge = $("#profitBadge");
  if (pBadge) pBadge.textContent = `${money(totalPeriodProfit)} net`;

  makeChart(
    $("#profitChart"),
    actualProfitType,
    {
      labels: timelineLabels.length
        ? timelineLabels.map(timelineGranularity === "monthly" ? formatMonthLabel : timelineGranularity === "weekly" ? formatWeekLabel : formatShortDate)
        : ["No data"],
      datasets: [
        {
          label: profitMetric === "margin" ? "Profit Margin (%)" : "Gross Profit",
          data: profitValues.length ? profitValues : [0],
          fill: isProfitArea || actualProfitType === "line",
          tension: 0.35,
          borderColor: isLight ? "#2563eb" : "#3b82f6",
          backgroundColor: isProfitArea
            ? isLight
              ? "rgba(37,99,235,.25)"
              : "rgba(59,130,246,.28)"
            : isLight
              ? "rgba(37,99,235,.12)"
              : "rgba(59,130,246,.16)",
          pointBackgroundColor: isLight ? "#2563eb" : "#3b82f6",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => timelineLabels[items[0]?.dataIndex] || "",
            label: (item) =>
              profitMetric === "margin"
                ? ` Margin: ${item.raw}%`
                : ` Profit: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) =>
              profitMetric === "margin" ? `${val}%` : money(val, getCurrency(), false),
          },
        },
      },
    },
  );

  // ── 7. NEW: Payment Method Distribution ──────────────────────────────────
  const payMetric = chartPrefs.paymentMethod.metric || "revenue";
  const payType = chartPrefs.paymentMethod.type || "doughnut";

  const paymentAgg = {};
  filteredSales.forEach((s) => {
    const raw = (s.paymentMethod || "Cash").trim();
    const mode = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (!paymentAgg[mode]) paymentAgg[mode] = { revenue: 0, count: 0 };
    paymentAgg[mode].revenue += Number(s.totalAmount || 0);
    paymentAgg[mode].count += 1;
  });

  const payKeys = Object.keys(paymentAgg);
  const payDataValues = payKeys.length
    ? payKeys.map((k) =>
        payMetric === "transactions"
          ? paymentAgg[k].count
          : convertFromINR(paymentAgg[k].revenue),
      )
    : [1];

  const payBadge = $("#paymentMethodBadge");
  if (payBadge) {
    const topMode = Object.entries(paymentAgg).sort(
      (a, b) => b[1].revenue - a[1].revenue,
    )[0];
    payBadge.textContent = topMode ? `Top: ${topMode[0]}` : "No data";
  }

  makeChart(
    $("#paymentMethodChart"),
    payType,
    {
      labels: payKeys.length ? payKeys : ["No data"],
      datasets: [
        {
          label: payMetric === "transactions" ? "Transactions" : "Revenue",
          data: payDataValues,
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) =>
              payMetric === "transactions"
                ? ` ${item.label}: ${item.raw} orders`
                : ` ${item.label}: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
    },
  );

  // ── 8. NEW: Sales by Day of Week ─────────────────────────────────────────
  const dowMetric = chartPrefs.dayOfWeek.metric || "revenue";
  const dowType = chartPrefs.dayOfWeek.type || "bar";
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const dowAgg = { 0: { rev: 0, count: 0 }, 1: { rev: 0, count: 0 }, 2: { rev: 0, count: 0 }, 3: { rev: 0, count: 0 }, 4: { rev: 0, count: 0 }, 5: { rev: 0, count: 0 }, 6: { rev: 0, count: 0 } };

  filteredSales.forEach((s) => {
    const d = saleDate(s);
    if (!d) return;
    const jsDay = d.getDay(); // 0 is Sunday
    const mappedIndex = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon ... 6=Sun
    dowAgg[mappedIndex].rev += Number(s.totalAmount || 0);
    dowAgg[mappedIndex].count += 1;
  });

  const dowData = daysOfWeek.map((_, i) =>
    dowMetric === "orders" ? dowAgg[i].count : convertFromINR(dowAgg[i].rev),
  );

  const dowBadge = $("#dayOfWeekBadge");
  if (dowBadge) {
    let bestDayIdx = 0;
    let maxVal = -1;
    daysOfWeek.forEach((_, i) => {
      if (dowAgg[i].rev > maxVal) {
        maxVal = dowAgg[i].rev;
        bestDayIdx = i;
      }
    });
    dowBadge.textContent = maxVal > 0 ? `Peak: ${daysOfWeek[bestDayIdx]}` : "No data";
  }

  makeChart(
    $("#dayOfWeekChart"),
    dowType,
    {
      labels: daysOfWeek,
      datasets: [
        {
          label: dowMetric === "orders" ? "Orders" : "Revenue",
          data: dowData,
          borderColor: isLight ? "#0891b2" : "#06b6d4",
          backgroundColor:
            dowType === "line"
              ? isLight
                ? "rgba(8,145,178,.15)"
                : "rgba(6,182,212,.18)"
              : isLight
                ? "rgba(8,145,178,.35)"
                : "rgba(6,182,212,.45)",
          pointBackgroundColor: isLight ? "#0891b2" : "#06b6d4",
          fill: dowType === "line",
          tension: 0.35,
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) =>
              dowMetric === "orders"
                ? ` ${item.label}: ${item.raw} orders`
                : ` ${item.label}: ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) =>
              dowMetric === "orders" ? val : money(val, getCurrency(), false),
          },
        },
      },
    },
  );

  // ── 9. NEW: Average Order Value (AOV) Progression ────────────────────────
  const aovTypePref = chartPrefs.aovTrend.type || "line";
  const isAovArea = aovTypePref === "area";
  const actualAovType = isAovArea ? "line" : aovTypePref;

  const aovValues = timelineLabels.map((k) => {
    const rev = convertFromINR(dailyRev[k] || 0);
    const count = dailyOrders[k] || 0;
    return count > 0 ? Number((rev / count).toFixed(2)) : 0;
  });

  const aovBadge = $("#aovBadge");
  if (aovBadge) {
    const nonZero = aovValues.filter((v) => v > 0);
    const avgVal = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
    aovBadge.textContent = `Avg: ${money(avgVal, getCurrency(), false)}`;
  }

  makeChart(
    $("#aovTrendChart"),
    actualAovType,
    {
      labels: timelineLabels.length
        ? timelineLabels.map(timelineGranularity === "monthly" ? formatMonthLabel : timelineGranularity === "weekly" ? formatWeekLabel : formatShortDate)
        : ["No data"],
      datasets: [
        {
          label: "AOV per Order",
          data: aovValues.length ? aovValues : [0],
          fill: isAovArea || actualAovType === "line",
          tension: 0.35,
          borderColor: isLight ? "#db2777" : "#ec4899",
          backgroundColor:
            isAovArea
              ? isLight
                ? "rgba(219,39,119,.25)"
                : "rgba(236,72,153,.3)"
              : isLight
                ? "rgba(219,39,119,.12)"
                : "rgba(236,72,153,.15)",
          pointBackgroundColor: isLight ? "#db2777" : "#ec4899",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => timelineLabels[items[0]?.dataIndex] || "",
            label: (item) => ` AOV: ${money(item.raw, getCurrency(), false)}`,
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

  // ── 10. NEW: Sales Staff Contribution ────────────────────────────────────
  const staffMetric = chartPrefs.staffPerformance.metric || "revenue";
  const staffTypePref = chartPrefs.staffPerformance.type || "bar";
  const isHorizontalStaff = staffTypePref === "horizontal";
  const actualStaffType = isHorizontalStaff ? "bar" : staffTypePref;

  const staffAgg = {};
  filteredSales.forEach((s) => {
    const rep = s.salespersonName || s.salespersonRole || "Admin";
    if (!staffAgg[rep]) staffAgg[rep] = { revenue: 0, orders: 0 };
    staffAgg[rep].revenue += Number(s.totalAmount || 0);
    staffAgg[rep].orders += 1;
  });

  const sortedStaff = Object.entries(staffAgg).sort((a, b) =>
    staffMetric === "orders" ? b[1].orders - a[1].orders : b[1].revenue - a[1].revenue,
  );

  const staffLabels = sortedStaff.length ? sortedStaff.map((x) => x[0]) : ["No sales reps"];
  const staffDataValues = sortedStaff.length
    ? sortedStaff.map((x) =>
        staffMetric === "orders" ? x[1].orders : convertFromINR(x[1].revenue),
      )
    : [0];

  const staffBadge = $("#staffBadge");
  if (staffBadge) {
    staffBadge.textContent = sortedStaff[0] ? `Top: ${sortedStaff[0][0]}` : "No data";
  }

  makeChart(
    $("#staffPerformanceChart"),
    actualStaffType,
    {
      labels: staffLabels,
      datasets: [
        {
          label: staffMetric === "orders" ? "Orders Closed" : "Revenue Contributed",
          data: staffDataValues,
          borderColor: isLight ? "#e11d48" : "#f43f5e",
          backgroundColor:
            actualStaffType === "doughnut"
              ? undefined
              : isLight
                ? "rgba(225,29,72,.35)"
                : "rgba(244,63,94,.45)",
        },
      ],
    },
    {
      indexAxis: isHorizontalStaff ? "y" : "x",
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) =>
              staffMetric === "orders"
                ? ` ${item.raw} orders`
                : ` ${money(item.raw, getCurrency(), false)}`,
          },
        },
      },
      scales: actualStaffType === "doughnut"
        ? {}
        : isHorizontalStaff
          ? {
              x: {
                ticks: {
                  callback: (val) =>
                    staffMetric === "orders" ? val : money(val, getCurrency(), false),
                },
              },
            }
          : {
              y: {
                ticks: {
                  callback: (val) =>
                    staffMetric === "orders" ? val : money(val, getCurrency(), false),
                },
              },
            },
    },
  );
}

// ── 7. Least-Selling Products & Dead Stock Table ───────────────────────────
function populateCategoryFilter() {
  const select = $("#deadStockCategorySelect");
  if (!select) return;
  const cats = new Set(["all"]);
  products.forEach((p) => {
    if (p.category) cats.add(p.category.trim());
  });

  const curVal = select.value || "all";
  select.innerHTML = Array.from(cats)
    .map(
      (c) =>
        `<option value="${c}" ${c === curVal ? "selected" : ""}>${c === "all" ? "All Categories" : c}</option>`,
    )
    .join("");
}

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

  // Count units sold and revenue per product with canonical resolution
  const salesByProduct = new Map();
  filteredSales.forEach((s) => {
    const matched =
      products.find((p) => p.id === s.productId) ||
      products.find(
        (p) =>
          p.name &&
          s.productName &&
          p.name.trim().toLowerCase() === s.productName.trim().toLowerCase(),
      );
    const key = matched
      ? matched.id
      : (s.productId || s.productName || "").trim().toLowerCase();
    if (!key) return;

    const cur = salesByProduct.get(key) || { units: 0, revenue: 0 };
    cur.units += Math.max(1, Number(s.quantity || 1));
    cur.revenue += Number(s.totalAmount || 0);
    salesByProduct.set(key, cur);
  });

  // Map ALL products in inventory (including dead stock)
  let movementList = products.map((p) => {
    const stats = salesByProduct.get(p.id) || { units: 0, revenue: 0 };
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
      id: p.id,
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

  // Filter by category
  if (deadStockCategory && deadStockCategory !== "all") {
    movementList = movementList.filter(
      (m) => m.category.toLowerCase() === deadStockCategory.toLowerCase(),
    );
  }

  // Filter by search query
  if (deadStockSearchTerm) {
    const q = deadStockSearchTerm.toLowerCase();
    movementList = movementList.filter(
      (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q),
    );
  }

  // Sort: Dead stock first, then by locked value descending
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

  const displayList = movementList.slice(0, 25);

  if (!displayList.length) {
    container.innerHTML = emptyState(
      "No matching inventory",
      "No products match your search or category filter.",
    );
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>In Stock</th>
            <th>Units Sold</th>
            <th>Locked Shelf Value</th>
            <th>Movement Status</th>
            <th class="text-right">Action</th>
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
                <td class="font-bold text-slate-100">
                  <div>${item.name}</div>
                  <div class="text-xs text-slate-500 font-mono">ID: ${item.id.slice(0, 8)}</div>
                </td>
                <td><span class="badge badge-info">${item.category}</span></td>
                <td class="${stockColor}">${item.stock} units</td>
                <td class="font-mono font-bold ${item.unitsSold === 0 ? "text-rose-400" : "text-emerald-400"}">${item.unitsSold}</td>
                <td class="font-mono text-slate-300 font-semibold">${money(item.lockedValue)}</td>
                <td>${badgeHtml}</td>
                <td class="text-right">
                  <a href="products.html" class="btn btn-xs btn-ghost text-sky-400 hover:text-white" title="Manage product in catalog">Manage</a>
                </td>
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
function renderAnalytics(replayAnimation = false) {
  const filteredSales = getFilteredSales();
  renderKpis(filteredSales);
  renderCharts(filteredSales, replayAnimation);
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

// ── 9. Timeline & Interactive Controls Initialization ──────────────────────
function syncDateInputValues() {
  const startEl = $("#analyticsStartDate");
  const endEl = $("#analyticsEndDate");
  if (!startEl || !endEl) return;

  const now = new Date();
  const todayStr = toLocalYMD(now);

  if (currentTimeframe === "today") {
    startEl.value = todayStr;
    endEl.value = todayStr;
  } else if (currentTimeframe === "7d") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    startEl.value = toLocalYMD(d);
    endEl.value = todayStr;
  } else if (currentTimeframe === "30d") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    startEl.value = toLocalYMD(d);
    endEl.value = todayStr;
  } else if (currentTimeframe === "90d") {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    startEl.value = toLocalYMD(d);
    endEl.value = todayStr;
  } else if (currentTimeframe === "month") {
    startEl.value = `${todayStr.slice(0, 7)}-01`;
    endEl.value = todayStr;
  } else if (currentTimeframe === "all") {
    startEl.value = "";
    endEl.value = "";
  }
}

function initTimelineControls() {
  const container = $("#timeframeFilterGroup");
  const startEl = $("#analyticsStartDate");
  const endEl = $("#analyticsEndDate");
  const resetBtn = $("#resetAnalyticsDate");
  const granEl = $("#timelineGranularity");

  let timelinePill = null;
  if (container) {
    timelinePill = initLiquidTabs(container, {
      itemSelector: ".timeframe-tab",
      activeClass: "btn-primary",
    });

    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".timeframe-tab");
      if (!btn) return;

      currentTimeframe = btn.dataset.timeframe || "all";
      customStartDate = "";
      customEndDate = "";

      container.querySelectorAll(".timeframe-tab").forEach((b) => {
        if (b === btn) {
          b.className =
            "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-primary font-medium";
        } else {
          b.className =
            "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-ghost font-medium";
        }
      });

      timelinePill?.sync();
      syncDateInputValues();
      renderAnalytics(true);
    });
  }

  const handleCustomDateChange = () => {
    if (startEl?.value || endEl?.value) {
      currentTimeframe = "custom";
      customStartDate = startEl?.value || "";
      customEndDate = endEl?.value || "";

      // Clear active style from preset tabs
      container?.querySelectorAll(".timeframe-tab")?.forEach((b) => {
        b.className =
          "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-ghost font-medium";
      });

      timelinePill?.sync();
      renderAnalytics(true);
    }
  };

  if (startEl) startEl.addEventListener("change", handleCustomDateChange);
  if (endEl) endEl.addEventListener("change", handleCustomDateChange);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      currentTimeframe = "all";
      customStartDate = "";
      customEndDate = "";
      syncDateInputValues();

      container?.querySelectorAll(".timeframe-tab")?.forEach((b) => {
        if (b.dataset.timeframe === "all") {
          b.className =
            "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-primary font-medium";
        } else {
          b.className =
            "btn btn-xs px-2.5 py-1.5 rounded-lg timeframe-tab btn-ghost font-medium";
        }
      });

      timelinePill?.sync();
      renderAnalytics(true);
      toast("Timeline reset to All Time", "ok");
    });
  }

  if (granEl) {
    granEl.addEventListener("change", () => {
      timelineGranularity = granEl.value || "daily";
      renderAnalytics();
    });
  }
}

// ── 10. Chart Toolbars & Preferences Listeners ─────────────────────────────
function initChartControls() {
  const bindSelect = (id, key, prop) => {
    const el = $("#" + id);
    if (!el) return;
    if (chartPrefs[key] && chartPrefs[key][prop]) {
      el.value = chartPrefs[key][prop];
    }
    el.addEventListener("change", () => {
      if (!chartPrefs[key]) chartPrefs[key] = {};
      chartPrefs[key][prop] = el.value;
      saveChartPrefs();
      renderCharts(getFilteredSales());
    });
  };

  // 1. Daily Sales
  bindSelect("ctrl_dailySales_metric", "dailySales", "metric");
  bindSelect("ctrl_dailySales_type", "dailySales", "type");

  // 2. Monthly Sales
  bindSelect("ctrl_monthlySales_metric", "monthlySales", "metric");
  bindSelect("ctrl_monthlySales_type", "monthlySales", "type");

  // 3. Top Products
  bindSelect("ctrl_topProducts_metric", "topProducts", "metric");
  bindSelect("ctrl_topProducts_type", "topProducts", "type");

  // 4. Category Sales
  bindSelect("ctrl_categorySales_metric", "categorySales", "metric");
  bindSelect("ctrl_categorySales_type", "categorySales", "type");

  // 5. Revenue Growth
  bindSelect("ctrl_revenue_type", "revenueGrowth", "type");

  // 6. Profit Trend
  bindSelect("ctrl_profit_metric", "profitTrend", "metric");
  bindSelect("ctrl_profit_type", "profitTrend", "type");

  // 7. Payment Method
  bindSelect("ctrl_paymentMethod_metric", "paymentMethod", "metric");
  bindSelect("ctrl_paymentMethod_type", "paymentMethod", "type");

  // 8. Day of Week
  bindSelect("ctrl_dayOfWeek_metric", "dayOfWeek", "metric");
  bindSelect("ctrl_dayOfWeek_type", "dayOfWeek", "type");

  // 9. AOV Trend
  bindSelect("ctrl_aovTrend_type", "aovTrend", "type");

  // 10. Staff Performance
  bindSelect("ctrl_staffPerformance_metric", "staffPerformance", "metric");
  bindSelect("ctrl_staffPerformance_type", "staffPerformance", "type");

  // Reset all preferences
  $("#resetChartPrefsBtn")?.addEventListener("click", () => {
    chartPrefs = { ...DEFAULT_CHART_PREFS };
    saveChartPrefs();
    document.querySelectorAll(".chart-ctrl-select").forEach((sel) => {
      const match = sel.id.match(/^ctrl_([^_]+)_([^_]+)$/);
      if (match && chartPrefs[match[1]] && chartPrefs[match[1]][match[2]]) {
        sel.value = chartPrefs[match[1]][match[2]];
      }
    });
    renderCharts(getFilteredSales(), true);
    toast("Graph views reset to default", "ok");
  });

  // Mobile / touch support for chart info popovers
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".chart-info-btn");
    const popover = e.target.closest(".chart-info-popover");
    document.querySelectorAll(".chart-info-popover.active").forEach((p) => {
      if (p !== popover) p.classList.remove("active");
    });
    if (btn && popover) {
      e.stopPropagation();
      popover.classList.toggle("active");
    }
  });
}

// ── 11. Search, Filter & CSV Export Handlers ───────────────────────────────
function initDeadStockFilters() {
  const searchInput = $("#deadStockSearch");
  const catSelect = $("#deadStockCategorySelect");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      deadStockSearchTerm = searchInput.value.trim();
      renderLeastProducts(getFilteredSales());
    });
  }

  if (catSelect) {
    catSelect.addEventListener("change", () => {
      deadStockCategory = catSelect.value;
      renderLeastProducts(getFilteredSales());
    });
  }

  // Export Dead Stock CSV
  $("#exportDeadStockBtn")?.addEventListener("click", () => {
    const filtered = getFilteredSales();
    const salesByProduct = new Map();
    filtered.forEach((s) => {
      const k = (s.productId || s.productName || "").trim().toLowerCase();
      if (!k) return;
      const cur = salesByProduct.get(k) || 0;
      salesByProduct.set(k, cur + Math.max(1, Number(s.quantity || 1)));
    });

    const exportRows = products.map((p) => {
      const sold = salesByProduct.get(p.id) || salesByProduct.get((p.name || "").toLowerCase()) || 0;
      const stock = Number(p.stock || 0);
      const price = Number(p.price || 0);
      return {
        "Product Name": p.name || "",
        Category: p.category || "",
        "In Stock": stock,
        "Units Sold in Period": sold,
        "Selling Price": price,
        "Locked Stock Value": stock * price,
        Status: sold === 0 ? "Dead Stock" : sold <= 3 ? "Slow Mover" : "Steady",
      };
    });

    toCSV(exportRows, `salesiq-dead-stock-${new Date().toISOString().slice(0, 10)}.csv`);
    toast("Exported Dead Stock report to CSV", "ok");
  });

  // Export Complete Analytics CSV
  $("#exportAnalyticsBtn")?.addEventListener("click", () => {
    const filtered = getFilteredSales();
    if (!filtered.length) {
      toast("No sales data to export in selected timeline", "warn");
      return;
    }

    const exportRows = filtered.map((s) => {
      const d = saleDate(s);
      return {
        "Order Date": d ? toLocalYMD(d) : "",
        "Product Name": s.productName || "",
        Category: s.category || "",
        Quantity: Number(s.quantity || 1),
        "Unit Price": Number(s.price || s.unitPrice || 0),
        "Total Revenue": Number(s.totalAmount || 0),
        "Gross Profit": getSaleProfit(s),
        "Customer Name": s.customerName || "Walk-in",
        "Payment Method": s.paymentMethod || "Cash",
        Salesperson: s.salespersonName || "Admin",
      };
    });

    toCSV(exportRows, `salesiq-analytics-report-${currentTimeframe}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast("Exported Analytics Report to CSV", "ok");
  });
}

// Initialize all controls
initTimelineControls();
initChartControls();
initDeadStockFilters();

// ── 12. Realtime Firestore Watchers ────────────────────────────────────────
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
      populateCategoryFilter();
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
    populateCategoryFilter();
    scheduleRenderCharts();
  }
});

window.addEventListener("salesiq:theme-changed", () => {
  if (document.documentElement.classList.contains("theme-transitioning")) {
    return;
  }
  syncChartThemeColors(getTheme() === "light");
});

window.addEventListener("storage", (e) => {
  if (e.key === "salesiq_theme") {
    syncChartThemeColors(getTheme() === "light");
  }
});

window.addEventListener("beforeunload", () => {
  unsubs.forEach((unsub) => unsub?.());
});

