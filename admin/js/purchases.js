import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  toast,
  setBusy,
  money,
  dateText,
  emptyState,
  statusFor,
  createNotification,
} from "../../js/shared.js";
import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin", "Manager"]);
initAppShell("admin", "purchases", profile);
let products = [],
  purchases = [],
  batches = [];
async function load() {
  products = await fetchAll("products");
  purchases = await fetchAll("purchases");
  batches = await fetchAll("productBatches");
  $("#purchaseProduct").innerHTML =
    '<option value="">Choose product</option>' +
    products
      .map(
        (p) =>
          `<option value="${p.id}">${p.name} — current ${p.stock || 0}</option>`,
      )
      .join("");
  render();
}
function render() {
  $("#purchasesTable").innerHTML = purchases.length
    ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Batch #</th><th>Qty</th><th>MFG Date</th><th>Expiry Date</th><th>Supplier</th><th>Price</th><th>Purchase Date</th><th>Saved</th></tr></thead><tbody>${purchases.map((p) => `<tr><td class="font-black">${p.productName}</td><td>${p.batchNumber || "-"}</td><td>${p.quantity}</td><td>${p.manufactureDate || "-"}</td><td>${p.expiryDate || "-"}</td><td>${p.supplierName || "-"}</td><td>${money(p.purchasePrice)}</td><td>${p.purchaseDate || "-"}</td><td>${dateText(p.createdAt)}</td></tr>`).join("")}</tbody></table></div>`
    : emptyState("No restock history", "Add stock to save purchase records.");
}
$("#purchaseDate").value = new Date().toISOString().slice(0, 10);
$("#purchaseManufactureDate").value = new Date().toISOString().slice(0, 10);
$("#purchaseExpiryDate").value = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
$("#purchaseForm").onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    const p = products.find((x) => x.id === $("#purchaseProduct").value);
    if (!p) throw new Error("Select product.");
    const qty = Number($("#purchaseQty").value);
    const batchNumber = $("#purchaseBatchNumber").value.trim();
    const manufactureDate = $("#purchaseManufactureDate").value;
    const expiryDate = $("#purchaseExpiryDate").value;
    if (!batchNumber) throw new Error("Batch number is required.");
    if (!manufactureDate) throw new Error("Manufacture date is required.");
    if (!expiryDate) throw new Error("Expiry date is required.");
    if (expiryDate <= manufactureDate) throw new Error("Expiry date must be after manufacture date.");
    let newStock = 0;
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "products", p.id);
      const snap = await tx.get(ref);
      const cur = Number(snap.data().stock || 0);
      newStock = cur + qty;
      tx.update(ref, {
        stock: newStock,
        status: statusFor(newStock, snap.data().minStock),
        updatedAt: serverTimestamp(),
      });
    });
    const batchData = {
      productId: p.id,
      productName: p.name,
      batchNumber,
      manufactureDate,
      expiryDate,
      purchasedQuantity: qty,
      remainingQuantity: qty,
      supplierName: $("#purchaseSupplier").value.trim(),
      purchasePrice: Number($("#purchasePrice").value || 0),
      purchaseDate: $("#purchaseDate").value,
      status: "Active",
      createdAt: serverTimestamp(),
      createdBy: profile.id,
    };
    await addDoc(collection(db, "productBatches"), batchData);
    await addDoc(collection(db, "purchases"), {
      ...batchData,
      quantity: qty,
    });
    await createNotification(
      `Restock added: ${p.name} (Batch: ${batchNumber}) +${qty}. New stock: ${newStock}.`,
      "purchase",
    );
    toast("Stock increased successfully. New batch created.");
    e.target.reset();
    $("#purchaseDate").value = new Date().toISOString().slice(0, 10);
    $("#purchaseManufactureDate").value = new Date().toISOString().slice(0, 10);
    $("#purchaseExpiryDate").value = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    load();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
};
load();