import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  toast,
  setBusy,
  money,
  dateText,
  emptyState,
  toCSV,
  createNotification,
  getBatchStatus,
  badgeForBatchStatus,
  formatDate,
} from "../../js/shared.js";
import {
  db,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  runTransaction,
} from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin", "Manager"]);
initAppShell("admin", "batches", profile);
let products = [],
  batches = [];
const editModal = $("#batchEditModal");
const disposeModal = $("#batchDisposeModal");
const labelModal = $("#batchLabelModal");
function renderStats() {
  const total = batches.length;
  const active = batches.filter(b => getBatchStatus(b) === "Active").length;
  const expired = batches.filter(b => getBatchStatus(b) === "Expired").length;
  const critical = batches.filter(b => getBatchStatus(b) === "Critical Expiry").length;
  const near = batches.filter(b => getBatchStatus(b) === "Near Expiry").length;
  const upcoming = batches.filter(b => getBatchStatus(b) === "Upcoming Expiry").length;
  const disposed = batches.filter(b => getBatchStatus(b) === "Disposed").length;
  const empty = batches.filter(b => getBatchStatus(b) === "Empty").length;
  const totalValue = batches.reduce((sum, b) => sum + Number(b.remainingQuantity || 0) * Number(b.purchasePrice || 0), 0);
  $("#batchStats").innerHTML = [
    ["Total Batches", total, "All batches"],
    ["Active", active, "Sellable"],
    ["Critical Expiry (≤7d)", critical, "Urgent action"],
    ["Near Expiry (≤30d)", near, "Monitor"],
    ["Upcoming Expiry (≤90d)", upcoming, "Plan ahead"],
    ["Expired", expired, "Cannot sell"],
    ["Disposed", disposed, "Removed"],
    ["Empty", empty, "Used up"],
    ["Batch Stock Value", money(totalValue), "At purchase price"],
  ].map(x => `<div class="glass stat-card"><div class="stat-label">${x[0]}</div><div class="stat-value">${x[1]}</div><div class="stat-hint">${x[2]}</div></div>`).join("");
}
function renderTable() {
  const q = $("#batchSearch").value.toLowerCase();
  const pf = $("#batchProductFilter").value.toLowerCase();
  const st = $("#batchStatusFilter").value;
  const sf = $("#batchSupplierFilter").value;
  const rows = batches.filter(b => {
    const p = products.find(x => x.id === b.productId);
    const matchesSearch = (b.batchNumber || "").toLowerCase().includes(q) || (p?.name || "").toLowerCase().includes(q);
    const matchesProduct = !pf || (p?.name || "").toLowerCase().includes(pf);
    const matchesStatus = !st || getBatchStatus(b) === st;
    const matchesSupplier = !sf || b.supplierName === sf;
    return matchesSearch && matchesProduct && matchesStatus && matchesSupplier;
  });
  $("#batchesTable").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Batch #</th><th>Product</th><th>Supplier</th><th>MFG Date</th><th>Expiry Date</th><th>Days Left</th><th>Purchased</th><th>Remaining</th><th>Purchase Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(b => {
      const p = products.find(x => x.id === b.productId);
      const status = getBatchStatus(b);
      const daysLeft = b.expiryDate ? Math.ceil((new Date(b.expiryDate + "T00:00:00") - new Date()) / 86400000) : null;
      return `<tr class="${status === "Expired" || status === "Critical Expiry" ? "warning-row" : ""}"><td class="font-mono">${b.batchNumber}</td><td class="font-black">${p?.name || "Unknown"}</td><td>${b.supplierName || "-"}</td><td>${formatDate(b.manufactureDate)}</td><td>${formatDate(b.expiryDate)}</td><td class="${daysLeft !== null && daysLeft <= 7 ? "text-red-400" : daysLeft !== null && daysLeft <= 30 ? "text-amber-400" : ""} font-bold">${daysLeft !== null ? daysLeft + "d" : "—"}</td><td>${b.purchasedQuantity || 0}</td><td class="font-bold">${b.remainingQuantity || 0}</td><td>${money(b.purchasePrice || 0)}</td><td>${badgeForBatchStatus(status)}</td><td><div class="flex gap-1"><button class="btn btn-ghost btn-sm" onclick="editBatch('${b.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="openDispose('${b.id}')">Dispose</button><button class="btn btn-info btn-sm" onclick="printLabel('${b.id}')">Label</button></div></td></tr>`;
    }).join("")}</tbody></table></div>`
    : emptyState("No batches", "Create batches via Restock page.");
}
window.editBatch = (id) => {
  const b = batches.find(x => x.id === id);
  if (!b) return;
  $("#editBatchId").value = b.id;
  $("#editBatchNumber").value = b.batchNumber;
  $("#editManufactureDate").value = b.manufactureDate || "";
  $("#editExpiryDate").value = b.expiryDate || "";
  $("#editPurchasedQty").value = b.purchasedQuantity || 0;
  $("#editRemainingQty").value = b.remainingQuantity || 0;
  $("#editSupplier").value = b.supplierName || "";
  $("#editPurchasePrice").value = b.purchasePrice || 0;
  $("#editStatus").value = b.status || "Active";
  $("#editNotes").value = b.notes || "";
  editModal.classList.add("show");
};
window.openDispose = (id) => {
  const b = batches.find(x => x.id === id);
  const p = products.find(x => x.id === b?.productId);
  if (!b) return;
  $("#disposeBatchId").value = b.id;
  $("#disposeBatchInfo").value = `${p?.name || "Product"} - Batch: ${b.batchNumber} (Remaining: ${b.remainingQuantity || 0})`;
  $("#disposeQty").max = b.remainingQuantity || 0;
  disposeModal.classList.add("show");
};
window.printLabel = (id) => {
  const b = batches.find(x => x.id === id);
  const p = products.find(x => x.id === b?.productId);
  if (!b) return;
  const labelHtml = `
    <div class="border-4 border-black p-4">
      <div class="text-center mb-3">
        <div class="text-2xl font-black">SALESIQ</div>
        <div class="text-xs text-gray-600">Batch Label</div>
      </div>
      <hr class="border-black mb-3">
      <div class="space-y-2 text-sm">
        <div class="flex justify-between"><span>Product:</span><span class="font-bold">${p?.name || "Unknown"}</span></div>
        <div class="flex justify-between"><span>Batch #:</span><span class="font-bold font-mono">${b.batchNumber}</span></div>
        <div class="flex justify-between"><span>MFG:</span><span>${formatDate(b.manufactureDate)}</span></div>
        <div class="flex justify-between"><span>EXP:</span><span class="font-bold ${getBatchStatus(b) === "Expired" || getBatchStatus(b) === "Critical Expiry" ? "text-red-600" : ""}">${formatDate(b.expiryDate)}</span></div>
        <div class="flex justify-between"><span>Qty:</span><span class="font-bold">${b.remainingQuantity || 0} / ${b.purchasedQuantity || 0}</span></div>
        <div class="flex justify-between"><span>Supplier:</span><span>${b.supplierName || "-"}</span></div>
        <div class="flex justify-between"><span>Cost:</span><span>${money(b.purchasePrice || 0)}</span></div>
        <div class="flex justify-between"><span>Status:</span><span>${getBatchStatus(b)}</span></div>
      </div>
      <hr class="border-black my-3">
      <div class="text-center text-xs">Printed: ${new Date().toLocaleDateString("en-IN")}</div>
    </div>
  `;
  $("#batchLabelContent").innerHTML = labelHtml;
  labelModal.classList.add("show");
};
$("#batchEditForm").onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    const id = $("#editBatchId").value;
    const data = {
      batchNumber: $("#editBatchNumber").value.trim(),
      manufactureDate: $("#editManufactureDate").value,
      expiryDate: $("#editExpiryDate").value,
      purchasedQuantity: Number($("#editPurchasedQty").value),
      remainingQuantity: Number($("#editRemainingQty").value),
      supplierName: $("#editSupplier").value.trim(),
      purchasePrice: Number($("#editPurchasePrice").value || 0),
      status: $("#editStatus").value,
      notes: $("#editNotes").value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: profile.id,
    };
    if (data.expiryDate <= data.manufactureDate) throw new Error("Expiry date must be after manufacture date.");
    await updateDoc(doc(db, "productBatches", id), data);
    toast("Batch updated.");
    editModal.classList.remove("show");
    load();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
};
$("#disposeFromEdit").onclick = () => {
  const id = $("#editBatchId").value;
  editModal.classList.remove("show");
  setTimeout(() => openDispose(id), 100);
};
$("#batchDisposeForm").onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    const batchId = $("#disposeBatchId").value;
    const qty = Number($("#disposeQty").value);
    const reason = $("#disposeReason").value;
    const remarks = $("#disposeRemarks").value.trim();
    const batch = batches.find(x => x.id === batchId);
    if (!batch) return toast("Batch not found", "err");
    if (qty > (batch.remainingQuantity || 0)) return toast("Cannot dispose more than remaining quantity", "err");
    const product = products.find(x => x.id === batch.productId);
    if (!product) return toast("Product not found", "err");
    await runTransaction(db, async (tx) => {
      const batchRef = doc(db, "productBatches", batchId);
      const batchSnap = await tx.get(batchRef);
      if (!batchSnap.exists()) throw new Error("Batch not found");
      const batchData = batchSnap.data();
      const newRemaining = Number(batchData.remainingQuantity || 0) - qty;
      const newStatus = newRemaining <= 0 ? "Disposed" : batchData.status;
      tx.update(batchRef, {
        remainingQuantity: newRemaining,
        status: newStatus,
        disposedAt: serverTimestamp(),
        disposedBy: profile.id,
        disposalReason: reason,
        disposalRemarks: remarks,
        updatedAt: serverTimestamp(),
      });
      const productRef = doc(db, "products", batch.productId);
      const productSnap = await tx.get(productRef);
      if (productSnap.exists()) {
        const newProductStock = Math.max(0, Number(productSnap.data().stock || 0) - qty);
        tx.update(productRef, {
          stock: newProductStock,
          updatedAt: serverTimestamp(),
        });
      }
    });
    await addDoc(collection(db, "disposals"), {
      productId: batch.productId,
      productName: product.name,
      batchId,
      batchNumber: batch.batchNumber,
      quantity: qty,
      reason,
      remarks,
      disposedAt: serverTimestamp(),
      disposedBy: profile.id,
    });
    await createNotification(
      `Batch disposed: ${product.name} (Batch: ${batch.batchNumber}) -${qty}. Reason: ${reason}.`,
      "stock",
    );
    toast("Batch disposed successfully.");
    disposeModal.classList.remove("show");
    load();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
};
$("#printBatchLabel").onclick = () => {
  const content = $("#batchLabelContent").innerHTML;
  const w = window.open("", "_blank");
  w.document.write(`<title>Batch Label</title><body style="font-family:monospace;padding:20px">${content}</body>`);
  w.print();
};
$$("[data-close-modal]").forEach(b => b.onclick = () => {
  editModal.classList.remove("show");
  disposeModal.classList.remove("show");
  labelModal.classList.remove("show");
});
$("#exportBatches").onclick = () => {
  const rows = batches.map(b => {
    const p = products.find(x => x.id === b.productId);
    return {
      batchNumber: b.batchNumber,
      product: p?.name || "Unknown",
      supplier: b.supplierName,
      manufactureDate: formatDate(b.manufactureDate),
      expiryDate: formatDate(b.expiryDate),
      purchased: b.purchasedQuantity,
      remaining: b.remainingQuantity,
      purchasePrice: b.purchasePrice,
      status: getBatchStatus(b),
    };
  });
  toCSV(rows, "batches-report.csv");
};
async function load() {
  products = await fetchAll("products");
  batches = await fetchAll("productBatches");
  const suppliers = [...new Set(batches.map(b => b.supplierName).filter(Boolean))];
  $("#batchSupplierFilter").innerHTML = '<option value="">All suppliers</option>' + suppliers.map(s => `<option>${s}</option>`).join("");
  renderStats();
  renderTable();
}
["batchSearch", "batchProductFilter", "batchStatusFilter", "batchSupplierFilter"].forEach(id => $("#" + id).addEventListener("input", renderTable));
$("#refreshBatches").onclick = load;
load();