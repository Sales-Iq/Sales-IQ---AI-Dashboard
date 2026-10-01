import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  money,
  emptyState,
  makeChart,
  toast,
  toDate,
  dateText,
  setBusy,
} from "../../js/shared.js";

import {
  db,
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
} from "../../js/firebase-config.js";

import { callGemini } from "../../js/gemini-service.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "forecasting", profile);

let products = [];
let sales = [];
let batches = [];
let savedForecasts = [];
let currentForecast = null;

function daysBetween(a, b) {
  return Math.max(1, Math.ceil((b - a) / 86400000));
}

function getProductBatches(productId) {
  return batches.filter(
    (b) => b.productId === productId && Number(b.remainingQuantity) > 0,
  );
}

function getNearestExpiry(productId) {
  const list = getProductBatches(productId)
    .filter((b) => b.expiryDate)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  if (!list.length) return null;
  return list[0].expiryDate;
}

async function load() {
  products = await fetchAll("products");
  sales = await fetchAll("sales");
  batches = await fetchAll("productBatches").catch(() => []);

  const sel = $("#forecastProduct");
  if (sel) {
    sel.innerHTML =
      '<option value="">Select product to forecast</option>' +
      products
        .map(
          (p) =>
            `<option value="${p.id}">${p.name} — Current Stock: ${p.stock || 0}</option>`,
        )
        .join("");
  }

  // Check URL param if redirected from another page (e.g. products or inventory)
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("productId");
  if (targetId && sel) {
    sel.value = targetId;
    runForecast();
  } else {
    renderEmpty();
  }

  loadSavedForecasts();
}

function renderEmpty() {
  const st = $("#forecastStats");
  if (st) {
    st.innerHTML = [
      ["Current Stock", "0", "Select a product"],
      ["Daily Velocity", "0 / day", "Past sales pace"],
      ["Estimated Stock Finish", "—", "Depletion timeline"],
      ["Suggested Reorder", "0 units", "Restock target"],
    ]
      .map(
        ([label, val, hint]) => `
      <div class="glass stat-card">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${val}</div>
        <div class="stat-hint">${hint}</div>
      </div>
    `,
      )
      .join("");
  }

  const out = $("#forecastOutput");
  if (out) {
    out.innerHTML = emptyState(
      "No forecast generated yet",
      "Select a product from the dropdown above and click 'Run AI Forecast'.",
    );
  }

  $("#reorderActionWrap")?.classList.add("hidden");
  $("#forecastProductBadge")?.classList.add("hidden");

  makeChart($("#forecastChart"), "line", {
    labels: ["Past 14d", "Past 7d", "Today", "Next 7d", "Next 14d", "Next 30d"],
    datasets: [
      {
        label: "Demand Baseline",
        data: [0, 0, 0, 0, 0, 0],
        borderColor: "rgba(148, 163, 184, 0.4)",
        borderDash: [5, 5],
      },
    ],
  });
}

/**
 * Computes deep mathematical forecasting metrics from historical sales data.
 */
function computeForecastMetrics(product, horizonDays = 30) {
  const prodSales = sales.filter((s) => s.productId === product.id);

  // Group daily sales over the past 14 days
  const now = new Date();
  const pastDaysCount = 14;
  const pastSalesByDay = new Array(pastDaysCount).fill(0);
  const pastDayLabels = [];

  for (let i = pastDaysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    pastDayLabels.push(
      d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    );
  }

  // Populate actual units sold for each of the last 14 days
  prodSales.forEach((s) => {
    const saleDate = toDate(s.createdAt);
    if (!saleDate) return;
    const diffDays = Math.floor((now - saleDate) / 86400000);
    if (diffDays >= 0 && diffDays < pastDaysCount) {
      const idx = pastDaysCount - 1 - diffDays;
      pastSalesByDay[idx] += Number(s.quantity || 0);
    }
  });

  const pastTotal = pastSalesByDay.reduce((a, b) => a + b, 0);
  const recent7 = pastSalesByDay.slice(7);
  const earlier7 = pastSalesByDay.slice(0, 7);

  const recent7Sum = recent7.reduce((a, b) => a + b, 0);
  const earlier7Sum = earlier7.reduce((a, b) => a + b, 0);

  const recent7Avg = recent7Sum / 7;
  const earlier7Avg = earlier7Sum / 7;

  // Weighted moving average: Recent 7 days are weighted 2x vs earlier 7 days
  let weightedDailyAvg = (recent7Sum * 2 + earlier7Sum) / 21;

  // If no sales in the last 14 days, compute all-time velocity
  if (weightedDailyAvg === 0 && prodSales.length > 0) {
    const allTotal = prodSales.reduce((a, s) => a + Number(s.quantity || 0), 0);
    const sortedDates = prodSales
      .map((s) => toDate(s.createdAt))
      .filter(Boolean)
      .sort((a, b) => a - b);
    const totalDays = sortedDates.length
      ? daysBetween(sortedDates[0], now)
      : 30;
    weightedDailyAvg = allTotal / totalDays;
  }

  // Velocity Momentum
  let momentum = "Steady";
  let momentumColor = "text-sky-400";
  if (recent7Avg > earlier7Avg * 1.25) {
    momentum = "Accelerating (High Demand Surge)";
    momentumColor = "text-emerald-400";
  } else if (recent7Avg < earlier7Avg * 0.75 && earlier7Avg > 0) {
    momentum = "Decelerating (Slowing Down)";
    momentumColor = "text-amber-400";
  }

  const stock = Number(product.stock || 0);
  const minStock = Number(product.minStock || 5);

  const finishDays =
    weightedDailyAvg > 0 ? Math.ceil(stock / weightedDailyAvg) : Infinity;

  const expectedStockout = Number.isFinite(finishDays)
    ? new Date(now.getTime() + finishDays * 86400000)
    : null;

  // Suggested reorder: Demand over horizon + safety threshold buffer
  const reorderQty = Math.ceil(weightedDailyAvg * horizonDays + minStock);

  // Check Nearest Expiry Collision
  const nearestExpStr = getNearestExpiry(product.id) || product.expiryDate;
  let expiryRisk = null;

  if (nearestExpStr) {
    const expDate = new Date(nearestExpStr);
    const daysToExpiry = Math.ceil((expDate - now) / 86400000);

    if (daysToExpiry <= 0) {
      expiryRisk = {
        level: "CRITICAL",
        text: `Batch expired on ${expDate.toLocaleDateString("en-IN")}. Must be discarded or quarantined immediately.`,
        expiredUnits: stock,
      };
    } else if (Number.isFinite(finishDays) && daysToExpiry < finishDays) {
      const unitsSoldBeforeExpiry = Math.floor(daysToExpiry * weightedDailyAvg);
      const unitsWasted = Math.max(0, stock - unitsSoldBeforeExpiry);
      expiryRisk = {
        level: "WARNING",
        text: `Nearest batch expires in ${daysToExpiry} days (${expDate.toLocaleDateString("en-IN")}), but stock will take ${finishDays} days to sell out. Estimated ${unitsWasted} units at risk of spoilage!`,
        wastedUnits: unitsWasted,
      };
    }
  }

  return {
    product,
    pastDayLabels,
    pastSalesByDay,
    pastTotal,
    recent7Avg,
    earlier7Avg,
    weightedDailyAvg,
    momentum,
    momentumColor,
    stock,
    minStock,
    finishDays,
    expectedStockout,
    reorderQty,
    nearestExpStr,
    expiryRisk,
    horizonDays,
  };
}

/**
 * Plots the Dual-Trend Chart: Historical Daily Sales + Projected Stock Depletion
 */
function renderDualChart(metrics) {
  const {
    pastDayLabels,
    pastSalesByDay,
    stock,
    minStock,
    weightedDailyAvg,
    horizonDays,
  } = metrics;

  // Historical segment (14 days)
  const historicalLabels = [...pastDayLabels];
  const historicalSales = [...pastSalesByDay];
  const historicalStock = new Array(pastDayLabels.length - 1).fill(null);
  historicalStock.push(stock); // Connect point at "Today"

  // Future projection segment
  const futureLabels = [];
  const futureStock = [stock]; // Starts at today's stock
  const futureSafety = [minStock];

  const now = new Date();
  const step = Math.max(1, Math.round(horizonDays / 10)); // Sample every few days for clean labels

  for (let d = step; d <= horizonDays; d += step) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + d);
    futureLabels.push(
      `+${d}d (${futureDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })})`,
    );

    const projectedRemaining = Math.max(
      0,
      Math.round(stock - weightedDailyAvg * d),
    );
    futureStock.push(projectedRemaining);
    futureSafety.push(minStock);
  }

  // Combined labels & alignment
  const allLabels = [...historicalLabels, ...futureLabels];

  // Align datasets across all labels
  const pastSalesAligned = [
    ...historicalSales,
    ...new Array(futureLabels.length).fill(null),
  ];
  const futureStockAligned = [
    ...new Array(historicalLabels.length - 1).fill(null),
    ...futureStock,
  ];
  const safetyThresholdAligned = new Array(allLabels.length).fill(minStock);

  makeChart($("#forecastChart"), "line", {
    labels: allLabels,
    datasets: [
      {
        label: "Historical Daily Sales (Units)",
        data: pastSalesAligned,
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14, 165, 233, 0.15)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#0ea5e9",
      },
      {
        label: "Projected Remaining Stock",
        data: futureStockAligned,
        borderColor: "#a855f7",
        backgroundColor: "rgba(168, 85, 247, 0.08)",
        borderDash: [6, 4],
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        pointBackgroundColor: "#a855f7",
      },
      {
        label: `Safety Threshold (Min ${minStock})`,
        data: safetyThresholdAligned,
        borderColor: "rgba(239, 68, 68, 0.65)",
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  });

  $("#chartHorizonBadge").textContent = `Horizon: ${horizonDays} Days`;
}

/**
 * Runs the Multi-Model Gemini Forecasting pipeline with structured reasoning
 */
async function generateAIPrediction(metrics) {
  const {
    product,
    pastTotal,
    weightedDailyAvg,
    recent7Avg,
    earlier7Avg,
    momentum,
    stock,
    minStock,
    finishDays,
    expectedStockout,
    reorderQty,
    nearestExpStr,
    expiryRisk,
    horizonDays,
  } = metrics;

  const prompt = `You are SalesIQ AI, an executive retail demand forecasting analyst.
Analyze the following inventory and sales velocity data for this product:

PRODUCT METRICS:
- Name: ${product.name}
- Category: ${product.category || "General"}
- Current Stock: ${stock} units
- Minimum Safety Threshold: ${minStock} units
- Supplier: ${product.supplierName || "Default Supplier"}
- Nearest Batch Expiry: ${nearestExpStr ? nearestExpStr : "None (Non-perishable)"}

HISTORICAL DEMAND VELOCITY (Past 14 Days):
- Total units sold in last 14 days: ${pastTotal} units
- Weighted daily sales velocity: ${weightedDailyAvg.toFixed(2)} units/day
- Recent 7-day velocity: ${recent7Avg.toFixed(2)} units/day vs Earlier 7-day: ${earlier7Avg.toFixed(2)} units/day
- Momentum: ${momentum}

PROJECTION (Next ${horizonDays} Days):
- Calculated stockout timeline: ${Number.isFinite(finishDays) ? finishDays + " days" : "Stock will not run out"}
- Estimated out-of-stock date: ${expectedStockout ? expectedStockout.toLocaleDateString("en-IN") : "N/A"}
- Recommended reorder quantity: ${reorderQty} units
${expiryRisk ? `- Spoilage Warning: ${expiryRisk.text}` : ""}

Provide a concise, high-value executive forecast structured with:
1. Demand Trend: (1-2 sentences explaining velocity and momentum)
2. Stockout Urgency: (CRITICAL, MODERATE, or HEALTHY with the reason)
3. Actionable Reorder Strategy: (Recommended purchase order timing and order size)
4. Perishable / Shelf-Life Note: (Mention expiry risk if any, or state inventory is shelf-stable)`;

  try {
    const aiResponse = await callGemini({
      prompt,
      task: "forecasting", // Routes to Gemini 3.5 Flash / 3 Flash / 2.5 Flash
      systemInstruction:
        "You are an expert inventory operations and demand forecasting AI. Deliver clear, high-impact bulleted business advice.",
      onModelSwitch: (fromModel, toModel) => {
        console.info(
          `[SalesIQ AI] Quota reached on ${fromModel}. Seamlessly switched to ${toModel}.`,
        );
      },
    });

    return {
      text: aiResponse.text,
      modelUsed: aiResponse.modelUsed,
      source: "cloud",
    };
  } catch (err) {
    console.warn("Cloud Gemini forecasting failover to local engine:", err);

    const isQuotaExhausted =
      String(err.message || "")
        .toLowerCase()
        .includes("exhausted") ||
      String(err.message || "")
        .toLowerCase()
        .includes("429");

    if (isQuotaExhausted) {
      toast(
        "All Gemini AI model daily quotas (RPD) are currently exhausted. Switched to local offline engine.",
        "err",
      );
    }

    // Fallback: Local rule-based intelligent analysis
    const urgency =
      stock <= 0
        ? "CRITICAL (Out of Stock)"
        : finishDays <= 7
          ? "CRITICAL (Stockout in < 7 Days)"
          : finishDays <= 15
            ? "MODERATE (Replenish within 2 Weeks)"
            : "HEALTHY (Stock levels sufficient)";

    const localSummary = `• Demand Trend: Product shows ${momentum.toLowerCase()} with a weighted velocity of ${weightedDailyAvg.toFixed(1)} units/day.
• Stockout Urgency: ${urgency}.
• Reorder Strategy: Plan a purchase order for ${reorderQty} units ${expectedStockout ? `before ${expectedStockout.toLocaleDateString("en-IN")}` : "to maintain stock buffers"}.
• Shelf-Life: ${expiryRisk ? expiryRisk.text : "Product stock is stable with no immediate batch expiry conflicts."}`;

    return {
      text: localSummary,
      modelUsed: "SalesIQ Local Heuristic Engine",
      source: "local",
    };
  }
}

async function runForecast() {
  const prodId = $("#forecastProduct").value;
  const product = products.find((p) => p.id === prodId);
  if (!product) return toast("Select a product to forecast.", "err");

  const horizonDays = parseInt($("#forecastHorizon").value, 10) || 30;
  const btn = $("#runForecast");
  setBusy(btn, true, "Forecasting...");

  try {
    const metrics = computeForecastMetrics(product, horizonDays);

    // Update Stats Cards
    const stEl = $("#forecastStats");
    if (stEl) {
      const finishText = Number.isFinite(metrics.finishDays)
        ? `${metrics.finishDays} Days`
        : "Stable / No Drain";

      stEl.innerHTML = [
        [
          "Current Stock",
          metrics.stock,
          metrics.stock <= metrics.minStock
            ? "⚠️ Below Safety Level"
            : "In Stock",
        ],
        [
          "Daily Velocity",
          `${metrics.weightedDailyAvg.toFixed(2)} / day`,
          metrics.momentum,
        ],
        [
          "Stockout Deadline",
          metrics.expectedStockout
            ? metrics.expectedStockout.toLocaleDateString("en-IN")
            : "No Stockout Risk",
          `Est. in ${finishText}`,
        ],
        [
          `Suggested Reorder (${horizonDays}d)`,
          `${metrics.reorderQty} units`,
          `Includes ${metrics.minStock} safety units`,
        ],
      ]
        .map(
          ([label, val, hint]) => `
        <div class="glass stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${val}</div>
          <div class="stat-hint">${hint}</div>
        </div>
      `,
        )
        .join("");
    }

    // Render Dual-Trend Chart
    renderDualChart(metrics);

    // Render AI Intelligence
    const outputEl = $("#forecastOutput");
    outputEl.innerHTML = `
      <div class="p-4 text-center text-sky-400 animate-pulse font-semibold text-sm">
        ✨ Generating predictive demand analysis with Gemini AI...
      </div>
    `;

    const aiResult = await generateAIPrediction(metrics);

    // Store state for saving
    currentForecast = {
      productId: product.id,
      productName: product.name,
      category: product.category || "General",
      currentStock: metrics.stock,
      minStock: metrics.minStock,
      averageDailySale: metrics.weightedDailyAvg,
      stockFinishDays: Number.isFinite(metrics.finishDays)
        ? metrics.finishDays
        : null,
      expectedOutOfStockDate: metrics.expectedStockout
        ? metrics.expectedStockout.toISOString().slice(0, 10)
        : null,
      suggestedReorderQuantity: metrics.reorderQty,
      timeHorizonDays: horizonDays,
      aiAnalysis: aiResult.text,
      aiModelUsed: aiResult.modelUsed,
      expiryRisk: metrics.expiryRisk?.text || null,
      supplierName: product.supplierName || "",
      createdAt: serverTimestamp(),
      savedBy: profile.id,
      savedByName: profile.name || profile.email,
    };

    // Render Output Card
    outputEl.innerHTML = `
      <div class="space-y-4">
        <!-- Spoilage Warning Alert if applicable -->
        ${
          metrics.expiryRisk
            ? `
          <div class="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5">
            <span class="text-base leading-none">⚠️</span>
            <div>
              <b class="font-bold">Perishable Spoilage Risk:</b> ${metrics.expiryRisk.text}
            </div>
          </div>
        `
            : ""
        }

        <!-- AI Insight Box -->
        <div class="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
          <div class="flex items-center justify-between text-xs text-sky-400 font-bold border-b border-sky-500/20 pb-2">
            <span>✨ Gemini AI Demand Forecast</span>
            <span class="text-[11px] text-slate-400">${aiResult.modelUsed}</span>
          </div>
          <div class="whitespace-pre-line text-xs sm:text-sm text-slate-200 leading-relaxed">
            ${aiResult.text}
          </div>
        </div>

        <!-- Quick Summary Details -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="p-2.5 glass rounded-lg">
            <span class="text-slate-400 block font-medium">Daily Velocity</span>
            <span class="text-base font-bold text-slate-100 font-mono">${metrics.weightedDailyAvg.toFixed(2)} units</span>
          </div>
          <div class="p-2.5 glass rounded-lg">
            <span class="text-slate-400 block font-medium">Reorder Target</span>
            <span class="text-base font-bold text-emerald-400 font-mono">${metrics.reorderQty} units</span>
          </div>
        </div>
      </div>
    `;

    // Show Reorder Action Button
    const reorderWrap = $("#reorderActionWrap");
    if (reorderWrap) {
      reorderWrap.classList.remove("hidden");
      const reorderBtn = $("#reorderNowBtn");
      reorderBtn.textContent = `🚚 Restock ${metrics.reorderQty} Units of ${product.name} Now`;
      reorderBtn.onclick = () => {
        window.location.href = `purchases.html?productId=${encodeURIComponent(product.id)}&qty=${metrics.reorderQty}`;
      };
    }

    $("#forecastProductBadge").textContent = product.name;
    $("#forecastProductBadge").classList.remove("hidden");

    toast(`Forecast completed for ${product.name}.`, "ok");
  } catch (err) {
    console.error("Forecasting error:", err);
    toast("Forecast failed: " + err.message, "err");
  } finally {
    setBusy(btn, false);
  }
}

// Save Forecast to Firestore
$("#saveForecast").onclick = async () => {
  if (!currentForecast) {
    return toast("Please run a forecast first before saving.", "err");
  }

  const btn = $("#saveForecast");
  setBusy(btn, true, "Saving...");

  try {
    await addDoc(collection(db, "forecasting"), currentForecast);
    toast("Forecast saved successfully!", "ok");
    loadSavedForecasts();
  } catch (err) {
    console.error("Save forecast error:", err);
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
};

// Load Saved Forecasts History from Firestore
async function loadSavedForecasts() {
  const container = $("#savedForecastsTable");
  if (!container) return;

  try {
    const q = query(
      collection(db, "forecasting"),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    savedForecasts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!savedForecasts.length) {
      container.innerHTML = emptyState(
        "No saved forecasts yet",
        "Run and save a forecast to track historical predictions.",
      );
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-slate-400 border-b border-slate-700">
              <th>Product</th>
              <th>Date Saved</th>
              <th>Horizon</th>
              <th>Stock at Forecast</th>
              <th>Daily Velocity</th>
              <th>Estimated Stockout</th>
              <th>Suggested Reorder</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            ${savedForecasts
              .map((f) => {
                const dateSaved = f.createdAt
                  ? dateText(f.createdAt)
                  : "Recent";
                const outDate = f.expectedOutOfStockDate || "N/A";

                return `
                <tr class="hover:bg-slate-800/40 transition-colors">
                  <td class="font-bold text-slate-100">${f.productName || "Product"}</td>
                  <td class="text-xs text-slate-400">${dateSaved}</td>
                  <td><span class="badge badge-purple text-xs">${f.timeHorizonDays || 30} Days</span></td>
                  <td class="font-mono">${f.currentStock ?? "-"}</td>
                  <td class="font-mono text-sky-400">${Number(f.averageDailySale || 0).toFixed(2)}/d</td>
                  <td class="font-mono text-amber-300">${outDate}</td>
                  <td class="font-mono font-bold text-emerald-400">${f.suggestedReorderQuantity || 0}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <button class="btn btn-ghost btn-sm text-xs" onclick="window.loadSavedItem('${f.productId}')">
                        Re-run
                      </button>
                      <button class="btn btn-danger btn-sm text-xs" onclick="window.deleteSavedForecast('${f.id}')">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.warn("Could not load saved forecasts:", err);
    container.innerHTML = emptyState(
      "Unable to load saved history",
      "Check Firestore rules or permissions.",
    );
  }
}

window.loadSavedItem = (productId) => {
  if (productId && $("#forecastProduct")) {
    $("#forecastProduct").value = productId;
    runForecast();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

window.deleteSavedForecast = async (id) => {
  if (!confirm("Delete this saved forecast record?")) return;
  try {
    await deleteDoc(doc(db, "forecasting", id));
    toast("Forecast deleted.");
    loadSavedForecasts();
  } catch (err) {
    toast(err.message, "err");
  }
};

$("#runForecast").onclick = runForecast;
$("#forecastProduct").onchange = () => {
  if ($("#forecastProduct").value) runForecast();
};
$("#forecastHorizon").onchange = () => {
  if ($("#forecastProduct").value) runForecast();
};
$("#refreshForecastHistory").onclick = loadSavedForecasts;

load();
