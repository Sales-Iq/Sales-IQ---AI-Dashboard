import {
  requireAuth,
  initAppShell,
  fetchAll,
  fetchByAdminId,
  $,
  toast,
  setBusy,
  money,
  uid,
  statusFor,
  createNotification,
  getFEFOBatches,
  getBatchStatus,
  isBlockedForSale,
} from "../../js/shared.js";

import {
  db,
  doc,
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
} from "../../js/firebase-config.js";

const isStaff = document.body.dataset.role === "sales";
const { profile } = await requireAuth(
  isStaff ? ["Sales Staff"] : ["Admin"],
);

initAppShell(isStaff ? "sales" : "admin", "add-sale", profile);

const adminId = isStaff ? (profile.adminId || profile.id) : profile.id;

let products = [];
let batches = [];
let selected = null;

async function loadProducts() {
  products = await fetchByAdminId("products", adminId);
  batches = await fetchByAdminId("productBatches", adminId);

  const sellableProducts = products.filter((product) => {
    const hasStock = Number(product.stock || 0) > 0;
    const allowedForSale = !isBlockedForSale(product, batches);

    return hasStock && allowedForSale;
  });

  $("#saleProduct").innerHTML =
    '<option value="">Choose product</option>' +
    sellableProducts
      .map(
        (product) => `
      <option value="${product.id}">${product.name} — ${product.stock} in stock</option>
    `,
      )
      .join("");

  updatePreview();
}

function updatePreview() {
  const qty = Number($("#saleQty").value || 1);
  selected = products.find((product) => product.id === $("#saleProduct").value);

  $("#salePrice").value = selected?.price || 0;
  $("#saleStock").value = selected?.stock || 0;

  const total = Number(selected?.price || 0) * qty;
  $("#saleTotal").value = total;

  let batchInfo = "";
  if (selected) {
    const { selected: fefoBatches, remainingQty, totalAvailable } = getFEFOBatches(selected.id, batches, qty);
    if (fefoBatches.length > 0) {
      batchInfo = `
        <div class="mt-3 p-3 bg-slate-800/50 rounded-lg">
          <b>FEFO Batches to be used:</b>
          <div class="mt-2 space-y-1">
            ${fefoBatches.map(({ batch, quantity }) => `
              <div class="text-sm flex justify-between">
                <span>${batch.batchNumber} (MFG: ${batch.manufactureDate || "-"}, EXP: ${batch.expiryDate || "-"})</span>
                <span class="font-mono">${quantity} units</span>
              </div>
            `).join('')}
            ${remainingQty > 0 ? `<div class="text-red-400 text-sm">⚠ Shortage: ${remainingQty} units cannot be fulfilled</div>` : ""}
          </div>
        </div>
      `;
    }
  }

  $("#invoicePreview").innerHTML = selected
    ? `
      <div><b>Invoice:</b> SIQ-${uid()}</div>
      <div><b>Product:</b> ${selected.name}</div>
      <div><b>Category:</b> ${selected.category || "-"}</div>
      <div><b>Available Stock:</b> ${selected.stock || 0}</div>
      ${batchInfo}
      <div><b>Quantity:</b> ${qty}</div>
      <div><b>Total:</b> ${money(total)}</div>
      <div><b>Customer:</b> ${$("#customerName").value || "-"}</div>
      <div><b>Payment:</b> ${$("#paymentMethod").value}</div>
    `
    : '<p class="text-slate-400">Select product to preview invoice.</p>';
}

$("#saleProduct").onchange = updatePreview;

["saleQty", "customerName", "paymentMethod"].forEach((id) => {
  $("#" + id).addEventListener("input", updatePreview);
});

$("#billingForm").onsubmit = async (e) => {
  e.preventDefault();

  const btn = e.submitter;
  setBusy(btn, true, "Generating...");

  try {
    selected = products.find(
      (product) => product.id === $("#saleProduct").value,
    );
    if (!selected) throw new Error("Select product.");

    const quantity = Number($("#saleQty").value);
    if (quantity <= 0) throw new Error("Quantity must be greater than 0.");

    const { selected: fefoBatches, remainingQty } = getFEFOBatches(selected.id, batches, quantity);
    if (remainingQty > 0) {
      throw new Error(`Insufficient stock. Only ${quantity - remainingQty} units available across valid batches.`);
    }

    const invoiceNumber = `SIQ-${Date.now().toString().slice(-8)}`;
    let newStock = 0;
    const batchUpdates = [];

    await runTransaction(db, async (tx) => {
      const productRef = doc(db, "products", selected.id);
      const productSnap = await tx.get(productRef);

      if (!productSnap.exists()) throw new Error("Product not found.");

      const product = productSnap.data();
      const stock = Number(product.stock || 0);

      if (quantity > stock) throw new Error(`Only ${stock} units available.`);

      newStock = stock - quantity;

      for (const { batch, quantity: batchQty } of fefoBatches) {
        const batchRef = doc(db, "productBatches", batch.id);
        const batchSnap = await tx.get(batchRef);
        if (!batchSnap.exists()) throw new Error(`Batch ${batch.batchNumber} not found.`);
        
        const batchData = batchSnap.data();
        const newRemaining = Number(batchData.remainingQuantity || 0) - batchQty;
        const newStatus = newRemaining <= 0 ? "Empty" : getBatchStatus({ ...batchData, remainingQuantity: newRemaining });
        
        tx.update(batchRef, {
          remainingQuantity: newRemaining,
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
        batchUpdates.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantity: batchQty });
      }

      tx.update(productRef, {
        stock: newStock,
        status: statusFor(newStock, product.minStock),
        updatedAt: serverTimestamp(),
      });
    });

    const sale = {
      category: selected.category || "",
      invoiceNumber,
      productId: selected.id,
      productName: selected.name,
      quantity,
      price: Number(selected.price),
      costPrice: Number(selected.costPrice || 0),
      totalAmount: Number(selected.price) * quantity,
      profit:
        (Number(selected.price) - Number(selected.costPrice || 0)) * quantity,
      customerName: $("#customerName").value.trim(),
      paymentMethod: $("#paymentMethod").value,
      salespersonId: profile.id,
      salespersonName: profile.name || profile.email,
      adminId: adminId,
      adminName: isStaff ? profile.adminName : (profile.name || profile.email),
      source: isStaff ? "staff" : "admin",
      isDemo: false,
      batchesUsed: batchUpdates,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "sales"), sale);

    if (sale.customerName) {
      await addDoc(collection(db, "customers"), {
        name: sale.customerName,
        totalSpent: sale.totalAmount,
        lastPurchaseDate: new Date().toISOString().slice(0, 10),
        adminId: adminId,
        adminName: sale.adminName,
        createdAt: serverTimestamp(),
        source: sale.source,
      }).catch(() => {});
    }

    await createNotification(
      `New sale ${invoiceNumber}: ${selected.name} x ${quantity}. Stock left: ${newStock}.`,
      "sale",
      adminId,
    );

    if (statusFor(newStock, selected.minStock) !== "Available") {
      await createNotification(
        `${selected.name} is ${statusFor(newStock, selected.minStock)}. Current stock: ${newStock}.`,
        "stock",
        adminId,
      );
    }

    toast(`Invoice ${invoiceNumber} generated.`);
    $("#billingForm").reset();
    loadProducts();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
};

$("#printInvoice").onclick = () => {
  const html = $("#invoicePreview").innerHTML;
  const w = window.open("", "_blank");

  w.document.write(`
    <title>Invoice</title>
    <body style="font-family:Arial;padding:30px">
      <h1>SalesIQ Invoice</h1>
      ${html}
    </body>
  `);

  w.print();
};

loadProducts();