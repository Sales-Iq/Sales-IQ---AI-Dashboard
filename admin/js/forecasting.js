import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  money,
  emptyState,
  makeChart,
  toast,
  getBatchStatus,
  formatDate,
} from "../../js/shared.js";
import {
  db,
  collection,
  addDoc,
  serverTimestamp,
} from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin", "Manager"]);
initAppShell("admin", "forecasting", profile);
let products = [],
  sales = [],
  batches = [],
  latest = null;
function daysBetween(a, b) {
  return Math.max(1, Math.ceil((b - a) / 86400000));
}
async function load() {
  products = await fetchAll("products");
  sales = await fetchAll("sales");
  batches = await fetchAll("productBatches");
  $("#forecastProduct").innerHTML =
    '<option value="">Select product</option>' +
    products.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  renderEmpty();
}
function renderEmpty() {
  $("#forecastStats").innerHTML = [
    "Current Stock",
    "Average Daily Sale",
    "Stock Finish",
    "Reorder Qty",
  ]
    .map(
      (x) =>
        `<div class="glass stat-card"><div class="stat-label">${x}</div><div class="stat-value">0</div><div class="stat-hint">Select product</div></div>`,
    )
    .join("");
  $("#forecastOutput").innerHTML = emptyState(
    "No forecast yet",
    "Select a product and run forecast.",
  );
  makeChart($("#forecastChart"), "line", {
    labels: [],
    datasets: [{ label: "Demand", data: [] }],
  });
}
function run() {
  const p = products.find((x) => x.id === $("#forecastProduct").value);
  if (!p) return toast("Select product.", "err");
  const ps = sales.filter((s) => s.productId === p.id);
  const total = ps.reduce((a, s) => a + Number(s.quantity || 0), 0);
  const dates = ps
    .map((s) => s.createdAt?.toDate?.())
    .filter(Boolean)
    .sort((a, b) => a - b);
  const days = dates.length ? daysBetween(dates[0], new Date()) : 1;
  const avg = total / days;
  
  // Get active batches for this product
  const productBatches = batches.filter(b => b.productId === p.id);
  const activeBatches = productBatches.filter(b => {
    const status = getBatchStatus(b);
    return status !== "Expired" && status !== "Disposed" && status !== "Empty" && (b.remainingQuantity || 0) > 0;
  });
  const activeStock = activeBatches.reduce((sum, b) => sum + Number(b.remainingQuantity || 0), 0);
  const expiredBatches = productBatches.filter(b => getBatchStatus(b) === "Expired");
  const nearExpiryBatches = productBatches.filter(b => {
    const s = getBatchStatus(b);
    return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
  });
  
  // Sort batches by expiry date (FEFO)
  activeBatches.sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });
  
  const finish = avg > 0 ? Math.ceil(activeStock / avg) : Infinity;
  const reorder = Math.ceil(avg * 30);
  const expected = Number.isFinite(finish)
    ? new Date(Date.now() + finish * 86400000)
    : null;
  
  // Calculate batch-wise finish dates
  let remainingAvg = avg;
  const batchFinishInfo = activeBatches.map(b => {
    const batchStock = Number(b.remainingQuantity || 0);
    const batchFinishDays = remainingAvg > 0 ? Math.ceil(batchStock / remainingAvg) : Infinity;
    const batchExpected = Number.isFinite(batchFinishDays) 
      ? new Date(Date.now() + batchFinishDays * 86400000) 
      : null;
    remainingAvg = avg; // Reset for next batch (simplified)
    return {
      batchNumber: b.batchNumber,
      stock: batchStock,
      expiryDate: b.expiryDate,
      finishDays: Number.isFinite(batchFinishDays) ? batchFinishDays : "No trend",
      expectedDate: batchExpected ? batchExpected.toISOString().slice(0, 10) : "No trend",
      willExpireBeforeFinish: b.expiryDate && batchExpected && new Date(b.expiryDate) < batchExpected,
    };
  });
  
  latest = {
    productId: p.id,
    productName: p.name,
    currentStock: activeStock,
    totalProductStock: Number(p.stock || 0),
    averageDailySale: avg,
    stockFinishDays: Number.isFinite(finish) ? finish : null,
    expectedOutOfStockDate: expected
      ? expected.toISOString().slice(0, 10)
      : "No sales trend yet",
    suggestedReorderQuantity: reorder,
    expiredBatches: expiredBatches.length,
    nearExpiryBatches: nearExpiryBatches.length,
    batchDetails: batchFinishInfo,
    createdAt: new Date().toISOString(),
  };
  
  $("#forecastStats").innerHTML = [
    ["Active Stock (sellable)", activeStock, `Total product stock: ${p.stock || 0}`],
    ["Average Daily Sale", avg.toFixed(2), "Total sold / days"],
    [
      "Stock Finish",
      Number.isFinite(finish) ? `${finish} days` : "No trend",
      "Estimated (active batches only)",
    ],
    ["Reorder Qty", reorder, "Avg × 30 days"],
    ["Expired Batches", expiredBatches.length, "Cannot be sold"],
    ["Near Expiry Batches", nearExpiryBatches.length, "≤90 days"],
  ]
    .map(
      (x) =>
        `<div class="glass stat-card"><div class="stat-label">${x[0]}</div><div class="stat-value">${x[1]}</div><div class="stat-hint">${x[2]}</div></div>`,
    )
    .join("");
  
  let batchDetailsHtml = "";
  if (activeBatches.length > 0) {
    batchDetailsHtml = `
      <div class="mt-4 p-4 bg-slate-800/50 rounded-lg">
        <h4 class="font-bold mb-2">Batch-wise Forecast (FEFO Order)</h4>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Stock</th>
                <th>Expiry Date</th>
                <th>Finish Days</th>
                <th>Expected Finish</th>
                <th>Warning</th>
              </tr>
            </thead>
            <tbody>
              ${batchFinishInfo.map(b => `
                <tr class="${b.willExpireBeforeFinish ? "warning-row" : ""}">
                  <td class="font-mono">${b.batchNumber}</td>
                  <td>${b.stock}</td>
                  <td>${formatDate(b.expiryDate)}</td>
                  <td>${b.finishDays}</td>
                  <td>${b.expectedDate}</td>
                  <td>${b.willExpireBeforeFinish ? '<span class="badge badge-danger">Expires before finish!</span>' : '<span class="badge badge-ok">OK</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  $("#forecastOutput").innerHTML =
    `<div class="space-y-3 leading-8">
      <p><b>Product:</b> ${p.name}</p>
      <p><b>Total Product Stock:</b> ${p.stock || 0}</p>
      <p><b>Active Stock (sellable):</b> ${activeStock}</p>
      <p><b>Average Daily Sale:</b> ${avg.toFixed(2)}</p>
      <p><b>Estimated Stock Finish Date:</b> ${expected ? expected.toLocaleDateString("en-IN") : "No sales trend yet"}</p>
      <p><b>Suggested Reorder Quantity:</b> ${reorder} units</p>
      <p><b>Expired Batches:</b> <span class="${expiredBatches.length > 0 ? "text-red-400" : "text-green-400"}">${expiredBatches.length}</span></p>
      <p><b>Near Expiry Batches:</b> <span class="${nearExpiryBatches.length > 0 ? "text-amber-400" : "text-green-400"}">${nearExpiryBatches.length}</span></p>
      ${batchDetailsHtml}
    </div>`;
  
  const labels = [...Array(30)].map((_, i) => `Day ${i + 1}`);
  const demand = labels.map((_, i) =>
    Math.max(0, activeStock - avg * (i + 1)),
  );
  makeChart($("#forecastChart"), "line", {
    labels,
    datasets: [
      { label: "Projected Active Stock", data: demand, tension: 0.35, fill: true },
      {
        label: "Cumulative Demand",
        data: labels.map((_, i) => avg * (i + 1)),
        tension: 0.35,
      },
    ],
  });
}
$("#runForecast").onclick = run;
$("#saveForecast").onclick = async () => {
  if (!latest) return toast("Run forecast first.", "err");
  await addDoc(collection(db, "forecasting"), {
    ...latest,
    createdAt: serverTimestamp(),
    savedBy: profile.id,
  });
  toast("Forecast saved.");
};
load();