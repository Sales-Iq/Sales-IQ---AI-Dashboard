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
} from "../../js/firebase-config.js";

const isStaff = document.body.dataset.role === "sales";
const { profile } = await requireAuth(
  isStaff ? ["Sales Staff"] : ["Admin", "Manager"],
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

function isBlockedForSale(product) {
  if (!isPerishable(product?.category)) {
    return false;
  }

  if (!product.expiryDate) {
    return true;
  }

  const today = new Date().toISOString().slice(0, 10);

  return product.expiryDate < today;
}

async function loadProducts() {
  products = (await fetchAll("products")).filter((product) => {
    const hasStock = Number(product.stock || 0) > 0;
    const allowedForSale = !isBlockedForSale(product);

    return hasStock && allowedForSale;
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
        <b>Manufacture Date:</b>
        ${selected.manufactureDate || "-"}
      </div>

      <div>
        <b>Expiry Date:</b>
        ${selected.expiryDate || "-"}
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

    await runTransaction(db, async (tx) => {
      const productRef = doc(db, "products", selected.id);
      const productSnap = await tx.get(productRef);

      if (!productSnap.exists()) throw new Error("Product not found.");

      const product = productSnap.data();
      const stock = Number(product.stock || 0);

      if (isBlockedForSale(product)) {
        throw new Error(
          `${product.name || selected.name} is expired or has no expiry date and cannot be sold.`,
        );
      }

      if (quantity > stock) throw new Error(`Only ${stock} units available.`);

      newStock = stock - quantity;

      tx.update(productRef, {
        stock: newStock,
        status: statusFor(newStock, product.minStock),
        updatedAt: serverTimestamp(),
      });
    });

    const sale = {
      category: selected.category || "",
      manufactureDate: selected.manufactureDate || "",
      expiryDate: selected.expiryDate || "",
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
      source: isStaff ? "staff" : "admin",
      isDemo: false,
      createdAt: serverTimestamp(),
    };

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
