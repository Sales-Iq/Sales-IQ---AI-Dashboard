import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  toast,
  setBusy,
  money,
  uid,
  statusFor,
  createNotification,
} from "../../js/shared.js";

import {
  db,
  doc,
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
  query,
  where,
  getDocs,
  writeBatch,
} from "../../js/firebase-config.js";

const isStaff = document.body.dataset.role === "sales";
const { profile } = await requireAuth(
  isStaff ? ["Sales Staff"] : ["Admin"],
);

initAppShell(isStaff ? "sales" : "admin", "add-sale", profile);

let products = [];
let selected = null;

const PERISHABLE_CATEGORIES = new Set(["food", "medicine"]);

function isPerishable(category) {
  return PERISHABLE_CATEGORIES.has(
    String(category || "")
      .trim()
      .toLowerCase(),
  );
}

async function loadProducts() {
  products = (await fetchAll("products")).filter((product) => {
    const hasStock = Number(product.stock || 0) > 0;
    return hasStock;
  });

  $("#saleProduct").innerHTML =
    '<option value="">Choose product</option>' +
    products
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

  $("#invoicePreview").innerHTML = selected
    ? `
      <div><b>Invoice:</b> SIQ-${uid()}</div>
      <div><b>Product:</b> ${selected.name}</div>
<div><b>Category:</b> ${selected.category || "-"}</div>
${
  isPerishable(selected.category)
    ? `
    <div>
    <b>Batch:</b> FEFO Automatic
    </div>
    `
    : ""
}

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

    const invoiceNumber = `SIQ-${Date.now().toString().slice(-8)}`;
    let newStock = 0;

    // Stores every batch used in this sale
    const soldBatches = [];

    await runTransaction(db, async (tx) => {
      const productRef = doc(db, "products", selected.id);
      const productSnap = await tx.get(productRef);

      if (!productSnap.exists()) throw new Error("Product not found.");

      const product = productSnap.data();

      const batchQuery = query(
        collection(db, "productBatches"),
        where("productId", "==", selected.id),
      );

      const batchSnapshot = await getDocs(batchQuery);

      let batches = batchSnapshot.docs
        .map((d) => ({
          id: d.id,
          ref: d.ref,
          ...d.data(),
        }))
        .filter((b) => Number(b.remainingQuantity) > 0);

      if (isPerishable(selected.category)) {
        batches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
      }

      let remainingToSell = quantity;

      const batchWriter = writeBatch(db);

      for (const batch of batches) {
        if (remainingToSell <= 0) break;

        const available = Number(batch.remainingQuantity);

        const deduct = Math.min(available, remainingToSell);

        remainingToSell -= deduct;

        soldBatches.push({
          batchId: batch.id,
          batchNo: batch.batchNo,
          quantity: deduct,
          expiryDate: batch.expiryDate || "",
        });

        batchWriter.update(batch.ref, {
          remainingQuantity: available - deduct,
        });
      }

      if (remainingToSell > 0) throw new Error("Not enough stock available.");

      await batchWriter.commit();

      newStock = Number(product.stock) - quantity;

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
      soldBatches,
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
      source: isStaff ? "staff" : "admin",
      isDemo: false,
      createdAt: serverTimestamp(),
    };

    sale.batchMethod = "FEFO";

    await addDoc(collection(db, "sales"), sale);

    if (sale.customerName) {
      await addDoc(collection(db, "customers"), {
        name: sale.customerName,
        totalSpent: sale.totalAmount,
        lastPurchaseDate: new Date().toISOString().slice(0, 10),
        createdAt: serverTimestamp(),
        source: sale.source,
      }).catch(() => {});
    }

    await createNotification(
      `New sale ${invoiceNumber}: ${selected.name} x ${quantity}. Stock left: ${newStock}.`,
      "sale",
    );

    if (statusFor(newStock, selected.minStock) !== "Available") {
      await createNotification(
        `${selected.name} is ${statusFor(newStock, selected.minStock)}. Current stock: ${newStock}.`,
        "stock",
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
