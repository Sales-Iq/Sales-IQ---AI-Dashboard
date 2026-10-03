import {
  requireAuth,
  initAppShell,
  fetchAll,
  getCachedCollection,
  hideSkeletonLoader,
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

const purchasesCollection = collection(db, "purchases");
const batchesCollection = collection(db, "productBatches");
const { profile } = await requireAuth(["Admin"]);

initAppShell("admin", "purchases", profile);
let products = [],
  purchases = [],
  batches = [];
async function load() {
  const adminId = profile.id;

  // 1. Instant 0ms cached render
  const cachedProds = getCachedCollection(
    `salesiq_cache_products_${adminId}_false`,
  );
  const cachedPurchases = getCachedCollection(
    `salesiq_cache_purchases_${adminId}_false`,
  );
  const cachedBatches = getCachedCollection(
    `salesiq_cache_productBatches_${adminId}_false`,
  );
  if (cachedProds?.data || cachedPurchases?.data) {
    if (cachedProds?.data) products = [...cachedProds.data];
    if (cachedPurchases?.data) purchases = [...cachedPurchases.data];
    if (cachedBatches?.data) batches = [...cachedBatches.data];
    products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    $("#purchaseProduct").innerHTML =
      '<option value="">Choose product</option>' +
      products.map(
        (p) =>
          `<option value="${p.id}">${p.name} — current ${p.stock || 0}</option>`,
      );
    render();
    hideSkeletonLoader();
  }

  // 2. Fresh parallel fetch
  try {
    const [freshProds, freshPurchases, freshBatches] = await Promise.all([
      fetchAll("products", false, adminId),
      fetchAll("purchases", false, adminId),
      fetchAll("productBatches", false, adminId).catch(() => []),
    ]);
    products = freshProds;
    purchases = freshPurchases;
    batches = freshBatches;
    products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    $("#purchaseProduct").innerHTML =
      '<option value="">Choose product</option>' +
      products.map(
        (p) =>
          `<option value="${p.id}">${p.name} — current ${p.stock || 0}</option>`,
      );
    render();
  } catch (err) {
    console.warn("Purchases load warning:", err);
  } finally {
    hideSkeletonLoader();
  }

  const params = new URLSearchParams(window.location.search);
  const pId = params.get("productId");
  const pQty = params.get("qty");
  if (pId && $("#purchaseProduct")) {
    $("#purchaseProduct").value = pId;
    const prod = products.find((p) => p.id === pId);
    if (prod && $("#purchaseSupplier")) {
      $("#purchaseSupplier").value = prod.supplierName || "";
    }
    if (prod && $("#purchasePrice")) {
      $("#purchasePrice").value = prod.costPrice || prod.price || "";
    }
    if (pQty && $("#purchaseQty")) {
      $("#purchaseQty").value = pQty;
    }
  }
}
function render() {
  $("#purchasesTable").innerHTML = purchases.length
    ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Supplier</th><th>Price</th><th>Purchase Date</th><th>Saved</th></tr></thead><tbody>${purchases.map((p) => `<tr><td class="font-black">${p.productName}</td><td>${p.quantity}</td><td>${p.supplierName || "-"}</td><td>${money(p.purchasePrice)}</td><td>${p.purchaseDate || "-"}</td><td>${dateText(p.createdAt)}</td></tr>`).join("")}</tbody></table></div>`
    : emptyState("No restock history", "Add stock to save purchase records.");
}
$("#purchaseDate").value = new Date().toISOString().slice(0, 10);
$("#purchaseForm").onsubmit = async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    const p = products.find((x) => x.id === $("#purchaseProduct").value);
    if (!p) throw new Error("Select product.");
    const qty = Number($("#purchaseQty").value);
    if (qty <= 0) {
      throw new Error("Quantity must be greater than 0.");
    }
    const batchNo = $("#purchaseBatch").value.trim();
    const manufactureDate = $("#purchaseManufacture").value;
    const expiryDate = $("#purchaseExpiry").value;

    const perishable = ["food", "medicine"].includes(
      String(p.category || "")
        .trim()
        .toLowerCase(),
    );

    if (perishable) {
      if (!batchNo) throw new Error("Batch number is required.");

      if (!manufactureDate) throw new Error("Manufacture date is required.");

      if (!expiryDate) throw new Error("Expiry date is required.");

      if (expiryDate <= manufactureDate)
        throw new Error("Expiry date must be after manufacture date.");

      // Validate BEFORE any write: batch numbers live in productBatches,
      // not in purchases. Check in-memory (loaded above).
      const duplicateBatch = batches.some(
        (x) =>
          x.productId === p.id &&
          String(x.batchNo || "")
            .trim()
            .toLowerCase() === batchNo.trim().toLowerCase(),
      );
      if (duplicateBatch) {
        throw new Error("Batch number already exists for this product.");
      }
    }
    let newStock = 0;
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "products", p.id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Product not found.");
      const cur = Number(snap.data().stock || 0);
      newStock = cur + qty;
      tx.update(ref, {
        stock: newStock,
        status: statusFor(newStock, snap.data().minStock),
        updatedAt: serverTimestamp(),
      });
    });
    await addDoc(purchasesCollection, {
      productId: p.id,
      productName: p.name,
      quantity: qty,
      supplierName: $("#purchaseSupplier").value.trim(),
      purchasePrice: Number($("#purchasePrice").value || 0),
      purchaseDate: $("#purchaseDate").value,
      adminId: profile.id,
      createdAt: serverTimestamp(),
      createdBy: profile.id,
    });
    if (perishable) {
      await addDoc(batchesCollection, {
        productId: p.id,
        productName: p.name,

        batchNo,

        supplierName: $("#purchaseSupplier").value.trim(),

        manufactureDate,

        expiryDate,

        quantity: qty,

        remainingQuantity: qty,

        purchasePrice: Number($("#purchasePrice").value || 0),

        adminId: profile.id,

        createdAt: serverTimestamp(),

        createdBy: profile.id,
      });
    }
    await createNotification(
      `Restock added: ${p.name} +${qty}. New stock: ${newStock}.`,
      "purchase",
    );
    toast("Stock increased successfully.");
    e.target.reset();
    $("#purchaseDate").value = new Date().toISOString().slice(0, 10);
    await load();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
};
load();
