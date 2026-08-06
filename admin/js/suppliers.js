import {
  requireAuth,
  initAppShell,
  fetchAll,
  fetchByAdminId,
  $,
  $$,
  toast,
  emptyState,
  toCSV,
  money,
  formatDate,
  getBatchStatus,
  badgeForBatchStatus,
} from "../../js/shared.js";
import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "suppliers", profile);
let suppliers = [];
let batches = [];
let products = [];
const modal = $("#supplierModal");
const batchModal = $("#supplierBatchModal");
function open(s = {}) {
  $("#supplierId").value = s.id || "";
  $("#supName").value = s.name || "";
  $("#supContact").value = s.contactNumber || "";
  $("#supEmail").value = s.email || "";
  $("#supAddress").value = s.address || "";
  $("#supProducts").value = s.productsSupplied || "";
  $("#supLast").value = s.lastOrderDate || "";
  $("#supPayment").value = s.paymentStatus || "Pending";
  modal.classList.add("show");
}
window.editSupplier = (id) => open(suppliers.find((x) => x.id === id));
window.deleteSupplier = async (id) => {
  if (confirm("Delete supplier?")) {
    await deleteDoc(doc(db, "suppliers", id));
    toast("Supplier deleted");
    load();
  }
};
window.viewSupplierBatches = (supplierName) => {
  const supplierBatches = batches.filter(b => b.supplierName === supplierName);
  const totalBatches = supplierBatches.length;
  const totalUnits = supplierBatches.reduce((sum, b) => sum + Number(b.purchasedQuantity || 0), 0);
  const remainingUnits = supplierBatches.reduce((sum, b) => sum + Number(b.remainingQuantity || 0), 0);
  const expiredCount = supplierBatches.filter(b => getBatchStatus(b) === "Expired").length;
  const nearExpiryCount = supplierBatches.filter(b => {
    const s = getBatchStatus(b);
    return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
  }).length;
  const avgPrice = totalBatches > 0 ? supplierBatches.reduce((sum, b) => sum + Number(b.purchasePrice || 0), 0) / totalBatches : 0;
  const totalCost = supplierBatches.reduce((sum, b) => sum + Number(b.purchasedQuantity || 0) * Number(b.purchasePrice || 0), 0);
  $("#supplierBatchTitle").textContent = `Batches from ${supplierName}`;
  $("#supplierBatchContent").innerHTML = supplierBatches.length
    ? `<div class="mb-4 p-4 bg-slate-800/50 rounded-lg grid md:grid-cols-5 gap-4 text-sm">
      <div><span class="text-slate-400">Total Batches</span><div class="font-bold text-xl">${totalBatches}</div></div>
      <div><span class="text-slate-400">Total Units</span><div class="font-bold text-xl">${totalUnits}</div></div>
      <div><span class="text-slate-400">Remaining</span><div class="font-bold text-xl">${remainingUnits}</div></div>
      <div><span class="text-slate-400">Avg Price/Unit</span><div class="font-bold text-xl">${money(avgPrice)}</div></div>
      <div><span class="text-slate-400">Total Cost</span><div class="font-bold text-xl">${money(totalCost)}</div></div>
      <div><span class="text-slate-400 text-red-400">Expired</span><div class="font-bold text-xl text-red-400">${expiredCount}</div></div>
      <div><span class="text-slate-400 text-amber-400">Near Expiry</span><div class="font-bold text-xl text-amber-400">${nearExpiryCount}</div></div>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Batch #</th><th>Product</th><th>MFG Date</th><th>Expiry Date</th><th>Purchased</th><th>Remaining</th><th>Purchase Price</th><th>Status</th></tr></thead><tbody>${supplierBatches
      .sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || ""))
      .map(b => {
        const p = products.find(x => x.id === b.productId);
        const status = getBatchStatus(b);
        return `<tr class="${status === "Expired" || status === "Critical Expiry" ? "warning-row" : ""}"><td class="font-mono">${b.batchNumber}</td><td class="font-black">${p?.name || "Unknown"}</td><td>${formatDate(b.manufactureDate)}</td><td>${formatDate(b.expiryDate)}</td><td>${b.purchasedQuantity || 0}</td><td class="font-bold">${b.remainingQuantity || 0}</td><td>${money(b.purchasePrice || 0)}</td><td>${badgeForBatchStatus(status)}</td></tr>`;
      })
      .join("")}</tbody></table></div>`
    : emptyState("No batches", "This supplier has no batches yet.");
  batchModal.classList.add("show");
};
$$("[data-close-modal]").forEach(
  (b) => (b.onclick = () => {
    modal.classList.remove("show");
    batchModal.classList.remove("show");
  }),
);
$("#openSupplierModal").onclick = () => open();
function renderStats() {
  const total = suppliers.length;
  const withBatches = suppliers.filter(s => batches.some(b => b.supplierName === s.name)).length;
  const hasExpired = suppliers.filter(s => batches.some(b => b.supplierName === s.name && getBatchStatus(b) === "Expired")).length;
  const totalBatches = batches.length;
  const totalValue = batches.reduce((sum, b) => sum + Number(b.purchasedQuantity || 0) * Number(b.purchasePrice || 0), 0);
  $("#supplierStats").innerHTML = [
    ["Total Suppliers", total, "Registered"],
    ["With Active Batches", withBatches, "Supplying stock"],
    ["Has Expired Batches", hasExpired, "Needs attention"],
    ["Total Batches Supplied", totalBatches, "All time"],
    ["Total Purchase Value", money(totalValue), "At purchase price"],
  ].map(x => `<div class="glass stat-card"><div class="stat-label">${x[0]}</div><div class="stat-value">${x[1]}</div><div class="stat-hint">${x[2]}</div></div>`).join("");
}
function render() {
  const q = $("#supplierSearch").value.toLowerCase();
  const f = $("#supplierFilter").value;
  const rows = suppliers.filter(s => {
    const matchesSearch = (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q) || (s.contactNumber || "").includes(q);
    const supplierBatches = batches.filter(b => b.supplierName === s.name);
    const hasBatches = supplierBatches.length > 0;
    const hasExpired = supplierBatches.some(b => getBatchStatus(b) === "Expired");
    let matchesFilter = true;
    if (f === "with-batches") matchesFilter = hasBatches;
    else if (f === "no-batches") matchesFilter = !hasBatches;
    else if (f === "has-expired") matchesFilter = hasExpired;
    return matchesSearch && matchesFilter;
  });
  $("#suppliersTable").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Batches</th><th>Total Units</th><th>Remaining</th><th>Expired</th><th>Near Expiry</th><th>Avg Price</th><th>Last Order</th><th>Payment</th><th>Action</th></tr></thead><tbody>${rows.map(s => {
      const supplierBatches = batches.filter(b => b.supplierName === s.name);
      const totalUnits = supplierBatches.reduce((sum, b) => sum + Number(b.purchasedQuantity || 0), 0);
      const remainingUnits = supplierBatches.reduce((sum, b) => sum + Number(b.remainingQuantity || 0), 0);
      const expiredCount = supplierBatches.filter(b => getBatchStatus(b) === "Expired").length;
      const nearCount = supplierBatches.filter(b => {
        const s = getBatchStatus(b);
        return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
      }).length;
      const avgPrice = supplierBatches.length > 0 ? supplierBatches.reduce((sum, b) => sum + Number(b.purchasePrice || 0), 0) / supplierBatches.length : 0;
      return `<tr><td class="font-black">${s.name || "-"}</td><td>${s.contactNumber || "-"}</td><td>${s.email || "-"}</td><td><span class="badge badge-info">${supplierBatches.length}</span></td><td>${totalUnits}</td><td>${remainingUnits}</td><td>${expiredCount > 0 ? `<span class="badge badge-danger">${expiredCount}</span>` : `<span class="badge badge-ok">0</span>`}</td><td>${nearCount > 0 ? `<span class="badge badge-warn">${nearCount}</span>` : `<span class="badge badge-ok">0</span>`}</td><td>${money(avgPrice)}</td><td>${s.lastOrderDate || "-"}</td><td><span class="badge ${s.paymentStatus === "Paid" ? "badge-ok" : "badge-warn"}">${s.paymentStatus || "Pending"}</span></td><td><div class="flex gap-1"><button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button><button class="btn btn-info btn-sm" onclick="viewSupplierBatches('${s.name}')">Batches</button><button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">Delete</button></div></td></tr>`;
    }).join("")}</tbody></table></div>`
    : emptyState("No suppliers", "Add suppliers for restock tracking.");
}
$("#supplierForm").onsubmit = async (e) => {
  e.preventDefault();
  const data = {
    name: $("#supName").value.trim(),
    contactNumber: $("#supContact").value.trim(),
    email: $("#supEmail").value.trim(),
    address: $("#supAddress").value.trim(),
    productsSupplied: $("#supProducts").value.trim(),
    lastOrderDate: $("#supLast").value,
    paymentStatus: $("#supPayment").value,
    adminId: profile.id,
    adminName: profile.name || profile.email,
    updatedAt: serverTimestamp(),
  };
  const id = $("#supplierId").value;
  if (id) await updateDoc(doc(db, "suppliers", id), data);
  else
    await addDoc(collection(db, "suppliers"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  toast("Supplier saved");
  modal.classList.remove("show");
  load();
};
$("#exportSuppliers").onclick = () => {
  const rows = suppliers.map(s => {
    const supplierBatches = batches.filter(b => b.supplierName === s.name);
    const totalUnits = supplierBatches.reduce((sum, b) => sum + Number(b.purchasedQuantity || 0), 0);
    const remainingUnits = supplierBatches.reduce((sum, b) => sum + Number(b.remainingQuantity || 0), 0);
    const expiredCount = supplierBatches.filter(b => getBatchStatus(b) === "Expired").length;
    const nearCount = supplierBatches.filter(b => {
      const s = getBatchStatus(b);
      return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
    }).length;
    const avgPrice = supplierBatches.length > 0 ? supplierBatches.reduce((sum, b) => sum + Number(b.purchasePrice || 0), 0) / supplierBatches.length : 0;
    return {
      name: s.name,
      contact: s.contactNumber,
      email: s.email,
      batches: supplierBatches.length,
      totalUnits,
      remainingUnits,
      expired: expiredCount,
      nearExpiry: nearCount,
      avgPrice,
      lastOrder: s.lastOrderDate,
      payment: s.paymentStatus,
    };
  });
  toCSV(rows, "suppliers-report.csv");
};
$("#supplierSearch").oninput = render;
$("#supplierFilter").onchange = render;
async function load() {
  suppliers = await fetchByAdminId("suppliers", profile.id);
  batches = await fetchByAdminId("productBatches", profile.id);
  products = await fetchByAdminId("products", profile.id);
  renderStats();
  render();
}
$("#refreshSuppliers").onclick = load;
load();