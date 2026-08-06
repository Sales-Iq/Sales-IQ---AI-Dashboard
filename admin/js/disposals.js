import {
  requireAuth,
  initAppShell,
  fetchAll,
  fetchByAdminId,
  $,
  $$,
  toast,
  money,
  dateText,
  emptyState,
  toCSV,
} from "../../js/shared.js";
const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "disposals", profile);
let disposals = [],
  products = [];
function getReasonBadge(reason) {
  const colors = {
    Expired: "badge-danger",
    Damaged: "badge-warn",
    Recalled: "badge-info",
    Lost: "badge-purple",
    Returned: "badge-ok",
    Other: "badge-ghost",
  };
  return `<span class="badge ${colors[reason] || "badge-ghost"}">${reason}</span>`;
}
function renderStats() {
  const total = disposals.length;
  const totalQty = disposals.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
  const byReason = {};
  disposals.forEach(d => { byReason[d.reason] = (byReason[d.reason] || 0) + Number(d.quantity || 0); });
  const today = new Date().toISOString().slice(0, 10);
  const todayDisposals = disposals.filter(d => d.disposedAt?.toDate?.().toISOString().slice(0, 10) === today).length;
  const month = today.slice(0, 7);
  const monthDisposals = disposals.filter(d => d.disposedAt?.toDate?.().toISOString().slice(0, 7) === month).length;
  $("#disposalStats").innerHTML = [
    ["Total Disposals", total, "Records"],
    ["Total Quantity", totalQty, "Units disposed"],
    ["Today", todayDisposals, "Today's disposals"],
    ["This Month", monthDisposals, "Monthly"],
    ...Object.entries(byReason).map(([reason, qty]) => [reason, qty, "Units"]),
  ].map(x => `<div class="glass stat-card"><div class="stat-label">${x[0]}</div><div class="stat-value">${x[1]}</div><div class="stat-hint">${x[2]}</div></div>`).join("");
}
function renderTable() {
  const q = $("#disposalSearch").value.toLowerCase();
  const rf = $("#disposalReasonFilter").value;
  const df = $("#disposalDateFilter").value;
  const rows = disposals.filter(d => {
    const p = products.find(x => x.id === d.productId);
    const matchesSearch = (d.batchNumber || "").toLowerCase().includes(q) || (p?.name || "").toLowerCase().includes(q) || (d.reason || "").toLowerCase().includes(q);
    const matchesReason = !rf || d.reason === rf;
    const matchesDate = !df || d.disposedAt?.toDate?.().toISOString().slice(0, 10) === df;
    return matchesSearch && matchesReason && matchesDate;
  });
  $("#disposalsTable").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Product</th><th>Batch #</th><th>Qty</th><th>Reason</th><th>Remarks</th><th>Disposed By</th></tr></thead><tbody>${rows.map(d => {
      const p = products.find(x => x.id === d.productId);
      return `<tr><td>${dateText(d.disposedAt)}</td><td class="font-black">${p?.name || "Unknown"}</td><td class="font-mono">${d.batchNumber}</td><td>${d.quantity}</td><td>${getReasonBadge(d.reason)}</td><td>${d.remarks || "-"}</td><td>${d.disposedByName || d.disposedBy || "-"}</td></tr>`;
    }).join("")}</tbody></table></div>`
    : emptyState("No disposals", "Dispose stock from Batch Management or Inventory pages.");
}
$("#exportDisposals").onclick = () => {
  const rows = disposals.map(d => {
    const p = products.find(x => x.id === d.productId);
    return {
      date: dateText(d.disposedAt),
      product: p?.name || "Unknown",
      batchNumber: d.batchNumber,
      quantity: d.quantity,
      reason: d.reason,
      remarks: d.remarks,
      disposedBy: d.disposedByName || d.disposedBy,
    };
  });
  toCSV(rows, "disposals-report.csv");
};
async function load() {
  products = await fetchByAdminId("products", profile.id);
  disposals = await fetchByAdminId("disposals", profile.id);
  renderStats();
  renderTable();
}
["disposalSearch", "disposalReasonFilter", "disposalDateFilter"].forEach(id => $("#" + id).addEventListener("input", renderTable));
$("#refreshDisposals").onclick = load;
load();