import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  toast,
  statusFor,
  badgeForStatus,
  money,
  emptyState,
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
initAppShell("admin", "inventory", profile);
let products = [],
  sales = [],
  batches = [];
const stockModal = $("#stockModal");
const batchDetailModal = $("#batchDetailModal");
const disposeModal = $("#disposeModal");
function renderStats() {
  const low = products.filter(
      (p) => statusFor(p.stock, p.minStock) === "Low Stock",
    ),
    out = products.filter(
      (p) => statusFor(p.stock, p.minStock) === "Out of Stock",
    );
  const totalBatches = batches.length;
  const expiredBatches = batches.filter(b => getBatchStatus(b) === "Expired").length;
  const nearExpiryBatches = batches.filter(b => {
    const s = getBatchStatus(b);
    return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
  }).length;
  $("#inventoryStats").innerHTML = [
    ["Current Products", products.length, "Total SKUs"],
    ["Total Batches", totalBatches, "Across all products"],
    ["Low Stock Products", low.length, "Needs reorder"],
    ["Out of Stock Products", out.length, "Unavailable"],
    ["Expired Batches", expiredBatches, "Cannot be sold"],
    ["Near Expiry Batches", nearExpiryBatches, "≤90 days"],
    [
      "Stock Value",
      money(
        products.reduce(
          (a, p) => a + Number(p.stock || 0) * Number(p.costPrice || 0),
          0,
        ),
      ),
      "At cost price",
    ],
  ]
    .map(
      (x) =>
        `<div class="glass stat-card"><div class="stat-label">${x[0]}</div><div class="stat-value">${x[1]}</div><div class="stat-hint">${x[2]}</div></div>`,
    )
    .join("");
}
function renderTable() {
  const q = $("#inventorySearch").value.toLowerCase(),
    cat = $("#inventoryCategory").value,
    st = $("#inventoryStatus").value,
    batchSt = $("#inventoryBatchStatus").value;
  const rows = products.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(q) &&
      (!cat || p.category === cat) &&
      (!st || statusFor(p.stock, p.minStock) === st),
  );
  $("#inventoryTable").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Total Stock</th><th>Batches</th><th>Min Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((p) => {
      const productBatches = batches.filter((b) => b.productId === p.id);
      const activeBatches = productBatches.filter((b) => {
        const s = getBatchStatus(b);
        return s !== "Disposed" && s !== "Empty";
      });
      const batchStatuses = [...new Set(activeBatches.map(b => getBatchStatus(b)))];
      const hasBatchStatusMatch = !batchSt || batchStatuses.includes(batchSt);
      if (!hasBatchStatusMatch) return "";
      return `<tr class="${statusFor(p.stock, p.minStock) !== "Available" ? "warning-row" : ""}"><td class="font-black">${p.name}</td><td>${p.category || "-"}</td><td>${p.stock || 0}</td><td>${activeBatches.length} batch${activeBatches.length !== 1 ? "es" : ""}</td><td>${p.minStock || 0}</td><td>${badgeForStatus(statusFor(p.stock, p.minStock))}</td><td><div class="flex gap-2"><button class="btn btn-ghost btn-sm" onclick="openStock('${p.id}')">Update Stock</button><button class="btn btn-info btn-sm" onclick="viewBatchDetails('${p.id}')">View Batches</button></div></td></tr>`;
    }).join("")}</tbody></table></div>`
    : emptyState("No stock records", "Add products first.");
}
function renderMovement() {
  const map = new Map();
  sales.forEach((s) =>
    map.set(
      s.productName,
      (map.get(s.productName) || 0) + Number(s.quantity || 0),
    ),
  );
  const sorted = [...map].sort((a, b) => b[1] - a[1]);
  $("#movementList").innerHTML = sorted.length
    ? `<div class="space-y-3"><div><b>Fast-moving</b>${sorted
        .slice(0, 5)
        .map(
          (x) =>
            `<div class="flex justify-between border-b border-slate-700/50 py-2"><span>${x[0]}</span><span class="badge badge-ok">${x[1]}</span></div>`,
        )
        .join("")}</div><div class="pt-4"><b>Slow-moving</b>${sorted
        .slice(-5)
        .reverse()
        .map(
          (x) =>
            `<div class="flex justify-between border-b border-slate-700/50 py-2"><span>${x[0]}</span><span class="badge badge-warn">${x[1]}</span></div>`,
        )
        .join("")}</div></div>`
    : emptyState("No movement data", "Sales will appear here.");
}
window.openStock = (id) => {
  const p = products.find((x) => x.id === id);
  $("#stockProductId").value = id;
  $("#stockProductName").value = p.name;
  $("#stockNewQty").value = p.stock || 0;
  stockModal.classList.add("show");
};
window.viewBatchDetails = (productId) => {
  const p = products.find((x) => x.id === productId);
  const productBatches = batches.filter((b) => b.productId === productId);
  $("#batchDetailTitle").textContent = `Batches: ${p.name}`;
  $("#batchDetailContent").innerHTML = productBatches.length
    ? `<div class="table-wrap"><table><thead><tr><th>Batch #</th><th>MFG Date</th><th>Expiry Date</th><th>Purchased</th><th>Remaining</th><th>Supplier</th><th>Purchase Price</th><th>Status</th><th>Action</th></tr></thead><tbody>${productBatches
        .sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || ""))
        .map((b) => {
          const status = getBatchStatus(b);
          return `<tr class="${status === "Expired" ? "warning-row" : ""}"><td class="font-mono">${b.batchNumber}</td><td>${formatDate(b.manufactureDate)}</td><td>${formatDate(b.expiryDate)}</td><td>${b.purchasedQuantity || 0}</td><td class="font-bold">${b.remainingQuantity || 0}</td><td>${b.supplierName || "-"}</td><td>${money(b.purchasePrice || 0)}</td><td>${badgeForBatchStatus(status)}</td><td><button class="btn btn-danger btn-sm" onclick="openDispose('${b.id}')">Dispose</button></td></tr>`;
        })
        .join("")}</tbody></table></div>`
    : emptyState("No batches", "This product has no batches yet.");
  batchDetailModal.classList.add("show");
};
window.openDispose = (batchId) => {
  const b = batches.find((x) => x.id === batchId);
  const p = products.find((x) => x.id === b?.productId);
  $("#disposeBatchId").value = batchId;
  $("#disposeBatchInfo").value = `${p?.name || "Product"} - Batch: ${b?.batchNumber} (Remaining: ${b?.remainingQuantity || 0})`;
  $("#disposeQty").max = b?.remainingQuantity || 0;
  disposeModal.classList.add("show");
};
$$("[data-close-modal]").forEach(
  (b) => (b.onclick = () => {
    stockModal.classList.remove("show");
    batchDetailModal.classList.remove("show");
    disposeModal.classList.remove("show");
  }),
);
$("#stockForm").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("#stockProductId").value,
    qty = Number($("#stockNewQty").value);
  const p = products.find((x) => x.id === id);
  await updateDoc(doc(db, "products", id), {
    stock: qty,
    status: statusFor(qty, p.minStock),
    updatedAt: serverTimestamp(),
  });
  toast("Stock updated.");
  stockModal.classList.remove("show");
  load();
};
$("#disposeForm").onsubmit = async (e) => {
  e.preventDefault();
  const batchId = $("#disposeBatchId").value;
  const qty = Number($("#disposeQty").value);
  const reason = $("#disposeReason").value;
  const notes = $("#disposeNotes").value.trim();
  const batch = batches.find((x) => x.id === batchId);
  if (!batch) return toast("Batch not found", "err");
  if (qty > (batch.remainingQuantity || 0)) return toast("Cannot dispose more than remaining quantity", "err");
  const product = products.find((x) => x.id === batch.productId);
  if (!product) return toast("Product not found", "err");
  try {
    await runTransaction(db, async (tx) => {
      const batchRef = doc(db, "productBatches", batchId);
      const batchSnap = await tx.get(batchRef);
      if (!batchSnap.exists()) throw new Error("Batch not found");
      const batchData = batchSnap.data();
      const newRemaining = Number(batchData.remainingQuantity || 0) - qty;
      const newStatus = newRemaining <= 0 ? "Disposed" : "Disposed";
      tx.update(batchRef, {
        remainingQuantity: newRemaining,
        status: newStatus,
        disposedAt: serverTimestamp(),
        disposedBy: profile.id,
        disposalReason: reason,
        disposalNotes: notes,
        updatedAt: serverTimestamp(),
      });
      const productRef = doc(db, "products", batch.productId);
      const productSnap = await tx.get(productRef);
      if (productSnap.exists()) {
        const newProductStock = Math.max(0, Number(productSnap.data().stock || 0) - qty);
        tx.update(productRef, {
          stock: newProductStock,
          status: statusFor(newProductStock, productSnap.data().minStock),
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
      notes,
      disposedAt: serverTimestamp(),
      disposedBy: profile.id,
    });
    await createNotification(
      `Stock disposed: ${product.name} (Batch: ${batch.batchNumber}) -${qty}. Reason: ${reason}.`,
      "stock",
    );
    toast("Stock disposed successfully.");
    disposeModal.classList.remove("show");
    load();
  } catch (err) {
    toast(err.message, "err");
  }
};
$("#generateStockAlerts").onclick = async () => {
  let count = 0;
  for (const p of products) {
    const st = statusFor(p.stock, p.minStock);
    if (st !== "Available") {
      count++;
      await createNotification(
        `${p.name} stock is ${st}. Current stock: ${p.stock}. Minimum: ${p.minStock}.`,
        "stock",
      );
    }
  }
  for (const b of batches) {
    const batchSt = getBatchStatus(b);
    if (batchSt === "Expired" || batchSt === "Critical Expiry" || batchSt === "Near Expiry") {
      count++;
      const p = products.find((x) => x.id === b.productId);
      await createNotification(
        `${p?.name || "Product"} (Batch: ${b.batchNumber}) is ${batchSt}. Expiry: ${formatDate(b.expiryDate)}.`,
        "stock",
      );
    }
  }
  toast(count ? `${count} alerts generated.` : "No alerts needed.");
};
async function load() {
  products = await fetchAll("products");
  sales = await fetchAll("sales");
  batches = await fetchAll("productBatches");
  $("#inventoryCategory").innerHTML =
    '<option value="">All categories</option>' +
    [...new Set(products.map((p) => p.category).filter(Boolean))]
      .map((c) => `<option>${c}</option>`)
      .join("");
  renderStats();
  renderTable();
  renderMovement();
}
["inventorySearch", "inventoryCategory", "inventoryStatus", "inventoryBatchStatus"].forEach((id) =>
  $("#" + id).addEventListener("input", renderTable),
);
$("#refreshInventory").onclick = load;
load();