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
  invalidateCache,
  hideSkeletonLoader,
  onlyDate,
  convertFromINR,
} from "../../js/shared.js";

import {
  db,
  doc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  query,
  where,
  getDocs,
  writeBatch,
} from "../../js/firebase-config.js";

const isStaff = document.body.dataset.role === "sales";
const { profile } = await requireAuth(isStaff ? ["Sales Staff"] : ["Admin"]);

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
  products = (await fetchAll("products", false, profile.id)).filter(
    (product) => {
      const hasStock = Number(product.stock || 0) > 0;
      return hasStock;
    },
  );

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
  hideSkeletonLoader();
}

window.addEventListener("salesiq:cache-updated", (e) => {
  if (e.detail?.name === "products") {
    loadProducts();
  }
});

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initSaleDate() {
  const dateInput = $("#saleDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = getLocalDateString();
  }
}

function getFormattedSaleDate() {
  const val = $("#saleDate")?.value;
  if (!val) return onlyDate(new Date());
  const [py, pm, pd] = val.split("-").map(Number);
  if (py && pm && pd) {
    return onlyDate(new Date(py, pm - 1, pd));
  }
  return onlyDate(new Date());
}

function updatePreview() {
  const qty = Number($("#saleQty").value || 1);
  selected = products.find((product) => product.id === $("#saleProduct").value);

  $("#salePrice").value = selected ? convertFromINR(selected.price || 0).toFixed(2) : 0;
  $("#saleStock").value = selected?.stock || 0;

  const total = Number(selected?.price || 0) * qty;
  $("#saleTotal").value = selected ? convertFromINR(total).toFixed(2) : 0;

  const invoicePrefix = (
    localStorage.getItem("salesiq_invoice_prefix") || "SIQ"
  ).toUpperCase();

  $("#invoicePreview").innerHTML = selected
    ? `
      <div><b>Invoice:</b> ${invoicePrefix}-${uid()}</div>
      <div><b>Date:</b> ${getFormattedSaleDate()}</div>
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

["saleQty", "customerName", "paymentMethod", "saleDate"].forEach((id) => {
  const el = $("#" + id);
  if (el) {
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  }
});

const setTodayBtn = $("#setTodayBtn");
if (setTodayBtn) {
  setTodayBtn.onclick = () => {
    const saleDateInput = $("#saleDate");
    if (saleDateInput) {
      saleDateInput.value = getLocalDateString();
      updatePreview();
    }
  };
}

$("#billingForm").addEventListener("reset", () => {
  setTimeout(() => {
    initSaleDate();
    updatePreview();
  }, 0);
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

    const quantity = Math.floor(Number($("#saleQty")?.value || 0));
    if (!quantity || quantity <= 0) {
      throw new Error("Please enter a valid quantity of at least 1.");
    }

    const prefix = (
      localStorage.getItem("salesiq_invoice_prefix") || "SIQ"
    ).toUpperCase();
    const invoiceNumber = `${prefix}-${Date.now().toString().slice(-8)}`;
    let newStock = 0;

    // Stores every batch used in this sale
    const soldBatches = [];

    // Batch reads happen OUTSIDE the transaction: reads + a separate
    // batch commit inside a transaction callback are retried by Firestore
    // and would double-deduct stock. Non-perishable products have no
    // batches, so skip batch logic for them entirely.
    const perishableSale = isPerishable(selected.category);
    let batchDeductions = [];

    if (perishableSale) {
      const batchQuery = query(
        collection(db, "productBatches"),
        where("productId", "==", selected.id),
      );
      const batchSnapshot = await getDocs(batchQuery);

      const batches = batchSnapshot.docs
        .map((d) => ({
          id: d.id,
          ref: d.ref,
          ...d.data(),
        }))
        .filter((b) => Number(b.remainingQuantity) > 0)
        .sort((a, b) =>
          String(a.expiryDate || "").localeCompare(String(b.expiryDate || "")),
        );

      let remainingToSell = quantity;

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
        batchDeductions.push({
          ref: batch.ref,
          remaining: available - deduct,
        });
      }

      if (remainingToSell > 0)
        throw new Error("Not enough batch stock available.");
    }

    await runTransaction(db, async (tx) => {
      const productRef = doc(db, "products", selected.id);
      const productSnap = await tx.get(productRef);

      if (!productSnap.exists()) throw new Error("Product not found.");

      const product = productSnap.data();
      const stock = Number(product.stock || 0);

      if (quantity > stock) throw new Error(`Only ${stock} units available.`);

      newStock = stock - quantity;

      tx.update(productRef, {
        stock: newStock,
        status: statusFor(newStock, product.minStock),
        updatedAt: serverTimestamp(),
      });
    });

    if (batchDeductions.length) {
      const batchWriter = writeBatch(db);
      batchDeductions.forEach((d) =>
        batchWriter.update(d.ref, { remainingQuantity: d.remaining }),
      );
      await batchWriter.commit();
    }

    const activeProfile = (() => {
      try {
        const stored = JSON.parse(localStorage.getItem("salesiq_user") || "null");
        return {
          ...(profile || {}),
          ...(stored || {}),
          name: stored?.name || profile?.name || "",
          email: stored?.email || profile?.email || "",
          id: stored?.id || profile?.id || "",
          role: stored?.role || profile?.role || (isStaff ? "Sales Staff" : "Admin"),
        };
      } catch (_) {
        return profile || {};
      }
    })();

    const pickedDate = $("#saleDate")?.value || getLocalDateString();
    let saleDateObj;
    if (pickedDate) {
      const [py, pm, pd] = pickedDate.split("-").map(Number);
      const now = new Date();
      const isToday =
        now.getFullYear() === py &&
        now.getMonth() + 1 === pm &&
        now.getDate() === pd;

      if (isToday) {
        saleDateObj = now;
      } else {
        saleDateObj = new Date(
          py,
          pm - 1,
          pd,
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
        );
      }
    } else {
      saleDateObj = new Date();
    }

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
      saleDate: pickedDate,
      date: pickedDate,
      salespersonId: activeProfile.id || profile.id,
      salespersonName:
        activeProfile.name || activeProfile.email || (isStaff ? "Sales Staff" : "Admin"),
      salespersonEmail: activeProfile.email || "",
      salespersonRole:
        activeProfile.role || profile.role || (isStaff ? "Sales Staff" : "Admin"),
      source: isStaff ? "staff" : "admin",
      adminId: isStaff ? (activeProfile.adminId || profile.adminId || null) : (activeProfile.id || profile.id),
      isDemo: false,
      createdAt: Timestamp.fromDate(saleDateObj),
    };

    if (soldBatches.length > 0) {
      sale.batchMethod = "FEFO";
    }

    await addDoc(collection(db, "sales"), sale);

    if (sale.customerName) {
      await addDoc(collection(db, "customers"), {
        name: sale.customerName,
        totalSpent: sale.totalAmount,
        lastPurchaseDate: pickedDate,
        adminId: sale.adminId,
        createdAt: Timestamp.fromDate(saleDateObj),
        source: sale.source,
      }).catch(() => {});
    }

    const dateLabel =
      sale.saleDate && sale.saleDate !== getLocalDateString()
        ? ` (Date: ${sale.saleDate})`
        : "";
    await createNotification(
      `New sale ${invoiceNumber}${dateLabel}: ${selected.name} x ${quantity}. Stock left: ${newStock}.`,
      "sale",
      sale.adminId,
    );

    if (statusFor(newStock, selected.minStock) !== "Available") {
      await createNotification(
        `${selected.name} is ${statusFor(newStock, selected.minStock)}. Current stock: ${newStock}.`,
        "stock",
        sale.adminId,
      );
    }

    invalidateCache("sales");
    invalidateCache("products");
    invalidateCache("customers");
    toast(`Invoice ${invoiceNumber} generated.`);
    $("#billingForm").reset();
    initSaleDate();
    loadProducts();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
};

$("#printInvoice").onclick = () => {
  const html = $("#invoicePreview").innerHTML;
  const bizName = localStorage.getItem("salesiq_business_name") || "SalesIQ";
  const logoUrl = localStorage.getItem("salesiq_business_logo") || "";
  const w = window.open("", "_blank");

  w.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${bizName} - Invoice</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 32px; max-width: 600px; margin: 0 auto; color: #0f172a; }
          .header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
          .header img { height: 48px; max-width: 140px; object-fit: contain; }
          .header-title h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; }
          .header-title p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
          .invoice-body { font-size: 14px; line-height: 1.8; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : '<span style="font-size:32px">🏪</span>'}
          <div class="header-title">
            <h1>${bizName}</h1>
            <p>Official Retail Invoice</p>
          </div>
        </div>
        <div class="invoice-body">
          ${html}
        </div>
      </body>
    </html>
  `);

  w.print();
};

initSaleDate();
loadProducts();
