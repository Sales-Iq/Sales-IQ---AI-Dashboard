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
  createNotification,
} from "../../js/shared.js";

import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  query,
  where,
  orderBy,
} from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Admin", "Manager"]);
initAppShell("admin", "batches", profile);

let products = [];
let batches = [];

const modal = $("#batchModal");
const detailModal = $("#batchDetailModal");
const form = $("#batchForm");

function getBatchStatus(batch) {
  const today = new Date().toISOString().slice(0, 10);
  
  if (batch.status === "Disposed" || batch.status === "Empty") {
    return batch.status;
  }
  
  if (!batch.expiryDate) {
    return "Active";
  }
  
  if (batch.expiryDate < today) {
    return "Expired";
  }
  
  const todayDate = new Date(`${today}T00:00:00`);
  const expiryDate = new Date(`${batch.expiryDate}T00:00:00`);
  const daysLeft = Math.ceil((expiryDate.getTime() - todayDate.getTime()) / 86400000);
  
  if (daysLeft <= 30) {
    return "Near Expiry";
  }
  
  return "Active";
}

function badgeForBatchStatus(status) {
  switch (status) {
    case "Expired":
      return '<span class="badge badge-danger">Expired</span>';
    case "Near Expiry":
      return '<span class="badge badge-warn">Near Expiry</span>';
    case "Disposed":
      return '<span class="badge badge-danger">Disposed</span>';
    case "Empty":
      return '<span class="badge badge-warn">Empty</span>';
    default:
      return '<span class="badge badge-ok">Active</span>';
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

async function loadProducts() {
  products = await fetchAll("products");
  const select = $("#batchProductSelect");
  const filter = $("#batchProductFilter");
  
  const options = products
    .map((p) => `<option value="${p.id}">${p.name} (${p.category})</option>`)
    .join("");
  
  select.innerHTML = '<option value="">Select a product</option>' + options;
  filter.innerHTML = '<option value="">All Products</option>' + options;
}

function openModal(batch = null) {
  form.reset();
  
  $("#batchModalTitle").textContent = batch ? "Edit Batch" : "Add Batch";
  $("#batchId").value = batch?.id || "";
  $("#batchProductId").value = batch?.productId || "";
  
  if (batch) {
    $("#batchProductSelect").value = batch.productId || "";
    $("#batchProductSelect").disabled = true;
    $("#batchNumber").value = batch.batchNumber || "";
    $("#batchManufactureDate").value = batch.manufactureDate || "";
    $("#batchExpiryDate").value = batch.expiryDate || "";
    $("#batchPurchasedQty").value = batch.purchasedQuantity || "";
    $("#batchRemainingQty").value = batch.remainingQuantity || batch.purchasedQuantity || 0;
    $("#batchSupplier").value = batch.supplierName || "";
    $("#batchPurchasePrice").value = batch.purchasePrice || "";
    
    const status = getBatchStatus(batch);
    const isExpiredOrNear = status === "Expired" || status === "Near Expiry";
    const isDisposed = status === "Disposed";
    const isEmpty = status === "Empty";
    
    $("#disposeBatchBtn").hidden = isDisposed || isEmpty;
    $("#disposalSection").hidden = !(isExpiredOrNear || isDisposed || isEmpty);
    
    if (batch.disposalRecords && batch.disposalRecords.length > 0) {
      $("#disposalSection").hidden = false;
    }
    
    $("#saveBatchBtn").textContent = "Update Batch";
  } else {
    $("#batchProductSelect").disabled = false;
    $("#batchManufactureDate").value = new Date().toISOString().slice(0, 10);
    $("#disposeBatchBtn").hidden = true;
    $("#disposalSection").hidden = true;
    $("#saveBatchBtn").textContent = "Save Batch";
  }
  
  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
  form.reset();
  $("#batchProductSelect").disabled = false;
}

function openDetailModal(batch) {
  const status = getBatchStatus(batch);
  const product = products.find((p) => p.id === batch.productId);
  
  let disposalHtml = "";
  if (batch.disposalRecords && batch.disposalRecords.length > 0) {
    disposalHtml = `
      <div class="mt-4 border-t border-slate-700/50 pt-4">
        <h4 class="font-bold mb-3">Disposal Records</h4>
        <div class="space-y-2">
          ${batch.disposalRecords
            .map(
              (d) => `
            <div class="glass p-3 rounded-xl">
              <div class="flex justify-between">
                <span class="font-medium">${d.reason === "expired" ? "Expired" : d.reason === "damaged" ? "Damaged" : d.reason === "recalled" ? "Recalled" : "Other"}</span>
                <span class="badge badge-danger">${d.quantity} units</span>
              </div>
              <div class="text-sm text-slate-400">${formatDate(d.date)} ${d.notes ? "· " + d.notes : ""}</div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }
  
  const totalSold = batch.soldQuantity || 0;
  const totalDisposed = batch.disposalRecords?.reduce((sum, d) => sum + d.quantity, 0) || 0;
  const available = batch.remainingQuantity || 0;
  
  $("#batchDetailContent").innerHTML = `
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      <div>
        <p class="text-sm text-slate-400">Product</p>
        <p class="font-bold">${product?.name || "Unknown"}</p>
      </div>
      <div>
        <p class="text-sm text-slate-400">Category</p>
        <p>${product?.category || "-"}</p>
      </div>
      <div>
        <p class="text-sm text-slate-400">Batch Number</p>
        <p class="font-bold">${batch.batchNumber}</p>
      </div>
      <div>
        <p class="text-sm text-slate-400">Status</p>
        <p>${badgeForBatchStatus(status)}</p>
      </div>
      <div>
        <p class="text-sm text-slate-400">Manufacture Date</p>
        <p>${formatDate(batch.manufactureDate)}</p>
      </div>
      <div>
        <p class="text-sm text-slate-400">Expiry Date</p>
        <p>${formatDate(batch.expiryDate)}</p>
      </div>
      <div>
        <p class="text-sm text-slate-400">Supplier</p>
        <p>${batch.supplierName || "-"}</p>
      </div>
      <div>
        <p class="text-sm text-slate-400">Purchase Price</p>
        <p>${money(batch.purchasePrice)}</p>
      </div>
    </div>
    
    <div class="grid md:grid-cols-3 gap-4 mb-4 p-4 glass rounded-xl">
      <div class="text-center">
        <p class="text-sm text-slate-400">Purchased</p>
        <p class="text-2xl font-black">${batch.purchasedQuantity || 0}</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-400">Sold</p>
        <p class="text-2xl font-black text-sky-400">${totalSold}</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-slate-400">Disposed</p>
        <p class="text-2xl font-black text-amber-400">${totalDisposed}</p>
      </div>
      <div class="text-center md:col-span-3">
        <p class="text-sm text-slate-400">Available Stock</p>
        <p class="text-3xl font-black text-emerald-400">${available}</p>
      </div>
    </div>
    
    ${disposalHtml}
    
    <div class="flex gap-3 mt-4 pt-4 border-t border-slate-700/50">
      <button class="btn btn-ghost btn-sm flex-1" onclick="editBatch('${batch.id}'); closeDetailModal();">Edit</button>
      <button class="btn btn-danger btn-sm flex-1" onclick="deleteBatch('${batch.id}'); closeDetailModal();">Delete</button>
    </div>
  `;
  
  detailModal.classList.add("show");
}

window.closeDetailModal = () => {
  detailModal.classList.remove("show");
};

window.editBatch = (id) => {
  const batch = batches.find((b) => b.id === id);
  if (batch) openModal(batch);
};

window.deleteBatch = async (id) => {
  if (!confirm("Delete this batch? This cannot be undone.")) return;
  
  try {
    await deleteDoc(doc(db, "productBatches", id));
    toast("Batch deleted.");
    await load();
  } catch (error) {
    toast(error.message, "err");
  }
};

window.disposeBatch = async () => {
  const batchId = $("#batchId").value;
  const batch = batches.find((b) => b.id === batchId);
  
  if (!batch) return toast("Batch not found.", "err");
  
  const qty = Number($("#batchDisposalQty").value);
  const reason = $("#batchDisposalReason").value;
  const date = $("#batchDisposalDate").value;
  const notes = $("#batchDisposalNotes").value.trim();
  
  if (!qty || qty <= 0) return toast("Enter valid quantity.", "err");
  if (!reason) return toast("Select disposal reason.", "err");
  if (!date) return toast("Enter disposal date.", "err");
  
  const available = batch.remainingQuantity || 0;
  if (qty > available) return toast(`Only ${available} units available for disposal.`, "err");
  
  try {
    setBusy($("#disposeBatchBtn"), true);
    
    const disposalRecord = {
      quantity: qty,
      reason,
      date,
      notes,
      disposedBy: profile.id,
      disposedByName: profile.name || profile.email,
      createdAt: serverTimestamp(),
    };
    
    const newRemaining = available - qty;
    const newStatus = newRemaining <= 0 ? "Empty" : getBatchStatus({ ...batch, remainingQuantity: newRemaining });
    
    await updateDoc(doc(db, "productBatches", batchId), {
      remainingQuantity: newRemaining,
      disposalRecords: [...(batch.disposalRecords || []), disposalRecord],
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    
    await createNotification(
      `${qty} units of batch ${batch.batchNumber} (${product?.name}) disposed as ${reason}.`,
      "stock"
    );
    
    toast("Disposal recorded.");
    closeModal();
    await load();
  } catch (error) {
    toast(error.message, "err");
  } finally {
    setBusy($("#disposeBatchBtn"), false);
  }
};

async function load() {
  products = await fetchAll("products");
  batches = await fetchAll("productBatches");
  
  await loadProducts();
  render();
}

function render() {
  const search = $("#batchSearch").value.toLowerCase();
  const productFilter = $("#batchProductFilter").value;
  const statusFilter = $("#batchStatusFilter").value;
  
  const rows = batches.filter((batch) => {
    const product = products.find((p) => p.id === batch.productId);
    const matchesName = String(batch.batchNumber || "").toLowerCase().includes(search) ||
      String(product?.name || "").toLowerCase().includes(search);
    const matchesProduct = !productFilter || batch.productId === productFilter;
    const status = getBatchStatus(batch);
    const matchesStatus = !statusFilter || status === statusFilter;
    
    return matchesName && matchesProduct && matchesStatus;
  });
  
  $("#batchesTable").innerHTML = rows.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Batch Number</th>
              <th>Product</th>
              <th>Category</th>
              <th>MFG Date</th>
              <th>Expiry Date</th>
              <th>Purchased</th>
              <th>Remaining</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((batch) => {
                const product = products.find((p) => p.id === batch.productId);
                const status = getBatchStatus(batch);
                const rowClass = status === "Expired" || status === "Near Expiry" ? "warning-row" : "";
                
                return `
                  <tr class="${rowClass}">
                    <td class="font-bold">${batch.batchNumber}</td>
                    <td>${product?.name || "Unknown"}</td>
                    <td>${product?.category || "-"}</td>
                    <td>${formatDate(batch.manufactureDate)}</td>
                    <td>${formatDate(batch.expiryDate)}</td>
                    <td>${batch.purchasedQuantity || 0}</td>
                    <td class="font-bold ${batch.remainingQuantity <= 0 ? "text-red-400" : batch.remainingQuantity < 10 ? "text-amber-400" : ""}">${batch.remainingQuantity || 0}</td>
                    <td>${batch.supplierName || "-"}</td>
                    <td>${badgeForBatchStatus(status)}</td>
                    <td>
                      <div class="flex gap-2">
                        <button class="btn btn-ghost btn-sm" onclick="openDetailModal(batches.find(b => b.id === '${batch.id}'))">View</button>
                        <button class="btn btn-ghost btn-sm" onclick="editBatch('${batch.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteBatch('${batch.id}')">Delete</button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : emptyState("No batches found", "Add batches to track inventory with expiry dates.");
}

$("#openBatchModal").onclick = () => openModal();

$$("[data-close-modal]").forEach((button) => {
  button.onclick = closeModal;
});

$$("[data-close-detail]").forEach((button) => {
  button.onclick = () => detailModal.classList.remove("show");
});

$("#refreshBatches").onclick = load;
$("#batchSearch").oninput = render;
$("#batchProductFilter").onchange = render;
$("#batchStatusFilter").onchange = render;

$("#disposeBatchBtn").onclick = disposeBatch;

form.onsubmit = async (event) => {
  event.preventDefault();
  
  const button = event.submitter;
  setBusy(button, true);
  
  try {
    const batchId = $("#batchId").value;
    const productId = $("#batchProductSelect").value;
    const product = products.find((p) => p.id === productId);
    
    if (!productId) throw new Error("Select a product.");
    
    const manufactureDate = $("#batchManufactureDate").value;
    const expiryDate = $("#batchExpiryDate").value;
    
    if (!manufactureDate) throw new Error("Manufacture date is required.");
    if (!expiryDate) throw new Error("Expiry date is required.");
    if (expiryDate <= manufactureDate) throw new Error("Expiry date must be after manufacture date.");
    
    const purchasedQuantity = Number($("#batchPurchasedQty").value);
    if (purchasedQuantity <= 0) throw new Error("Purchased quantity must be greater than 0.");
    
    const isNew = !batchId;
    const remainingQuantity = isNew ? purchasedQuantity : Number($("#batchRemainingQty").value);
    
    const data = {
      productId,
      productName: product.name,
      batchNumber: $("#batchNumber").value.trim().toUpperCase(),
      manufactureDate,
      expiryDate,
      purchasedQuantity,
      remainingQuantity,
      supplierName: $("#batchSupplier").value.trim(),
      purchasePrice: Number($("#batchPurchasePrice").value || 0),
      updatedAt: serverTimestamp(),
    };
    
    if (isNew) {
      data.status = getBatchStatus(data);
      data.createdAt = serverTimestamp();
      data.createdBy = profile.id;
      data.soldQuantity = 0;
      data.disposalRecords = [];
      
      await addDoc(collection(db, "productBatches"), data);
      toast("Batch created.");
    } else {
      data.status = getBatchStatus(data);
      await updateDoc(doc(db, "productBatches", batchId), data);
      toast("Batch updated.");
    }
    
    closeModal();
    await load();
  } catch (error) {
    toast(error.message, "err");
  } finally {
    setBusy(button, false);
  }
};

load();