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

const purchasesCollection = collection(db, "purchases");
const batchesCollection = collection(db, "productBatches");
const { profile } = await requireAuth(["Admin"]);

initAppShell("admin", "purchases", profile);
let products = [],
  purchases = [];
async function load() {
  products = await fetchAll("products");
  purchases = await fetchAll("purchases");
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

    const perishable = ["Food", "Medicine"].includes(p.category);

    if (perishable) {
      if (!batchNo) throw new Error("Batch number is required.");

      if (!manufactureDate) throw new Error("Manufacture date is required.");

      if (!expiryDate) throw new Error("Expiry date is required.");

      if (expiryDate <= manufactureDate)
        throw new Error("Expiry date must be after manufacture date.");
    }
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
    await addDoc(purchasesCollection, {
      productId: p.id,
      productName: p.name,
      quantity: qty,
      supplierName: $("#purchaseSupplier").value.trim(),
      purchasePrice: Number($("#purchasePrice").value || 0),
      purchaseDate: $("#purchaseDate").value,
      createdAt: serverTimestamp(),
      createdBy: profile.id,
    });
    if (perishable) {
      const existingBatch = purchases.find(
        (x) => x.batchNo === batchNo && x.productId === p.id,
      );

      if (perishable && existingBatch) {
        throw new Error("Batch number already exists for this product.");
      }
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
