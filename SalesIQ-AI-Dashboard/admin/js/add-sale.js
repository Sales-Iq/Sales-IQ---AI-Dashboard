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
  orderBy,
  getDoc,
} from "../../js/firebase-config.js";

const isStaff = document.body.dataset.role === "sales";
const { profile } = await requireAuth(
  isStaff ? ["Sales Staff"] : ["Admin", "Manager"],
);

initAppShell(isStaff ? "sales" : "admin", "add-sale", profile);

let products = [];
let batches = [];
let selected = null;

const PERISHABLE_CATEGORIES = new Set(["food", "medicine"]);

function isPerishable(category) {
  return PERISHABLE_CATEGORIES.has(
    String(category || "")
      .trim()
      .toLowerCase(),
  );
}

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

function isBlockedForSale(batch) {
  const status = getBatchStatus(batch);
  return status === "Expired" || status === "Disposed" || status === "Empty";
}

async function loadProducts() {
  products = await fetchAll("products");
  batches = await fetchAll("productBatches");
  
  const today = new Date().toISOString().slice(0, 10);
  
  const availableProducts = products.filter((product) => {
    const productBatches = batches.filter(
      (b) => b.productId === product.id && !isBlockedForSale(b)
    );
    
    const totalStock = productBatches.reduce(
      (sum, b) => sum + Number(b.remainingQuantity || 0),
      0,
    );
    
    return totalStock > 0;
  });
  
  $("#saleProduct").innerHTML =
    '<option value="">Choose product</option>' +
    availableProducts
      .map(
        (product) => {
          const productBatches = batches.filter(
            (b) => b.productId === product.id && !isBlockedForSale(b)
          );
          const totalStock = productBatches.reduce(
            (sum, b) => sum + Number(b.remainingQuantity || 0),
            0,
          );
          const earliestExpiry = productBatches
            .filter((b) => b.expiryDate)
            .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];
          const expiryInfo = earliestExpiry
            ? ` (Exp: ${earliestExpiry.expiryDate})`
            : "";
          return `
          <option value="${product.id}">${product.name} — ${totalStock} in stock${expiryInfo}</option>
        `;
        },
      )
      .join("");
  
  updatePreview();
}

function getFEFObatches(productId, quantityNeeded) {
  const productBatches = batches
    .filter(
      (b) =>
        b.productId === productId &&
        !isBlockedForSale(b) &&
        Number(b.remainingQuantity || 0) > 0,
    )
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });
  
  const allocation = [];
  let remaining = quantityNeeded;
  
  for (const batch of productBatches) {
    if (remaining <= 0) break;
    
    const available = Number(batch.remainingQuantity || 0);
    const take = Math.min(available, remaining);
    
    allocation.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantity: take,
      expiryDate: batch.expiryDate,
      manufactureDate: batch.manufactureDate,
      costPrice: batch.purchasePrice || 0,
    });
    
    remaining -= take;
  }
  
  return { allocation, remaining };
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function updatePreview() {
  const qty = Number($("#saleQty").value || 1);
  selected = products.find((product) => product.id === $("#saleProduct").value);
  
  if (!selected) {
    $("#salePrice").value = 0;
    $("#saleStock").value = 0;
    $("#saleTotal").value = 0;
    $("#invoicePreview").innerHTML =
      '<p class="text-slate-400">Select product to preview invoice.</p>';
    return;
  }
  
  const { allocation, remaining } = getFEFObatches(selected.id, qty);
  const totalAvailable = qty - remaining;
  
  $("#salePrice").value = selected.price || 0;
  $("#saleStock").value = totalAvailable;
  
  const total = Number(selected.price || 0) * totalAvailable;
  $("#saleTotal").value = total;
  
  let batchDetailsHtml = "";
  if (allocation.length > 0) {
    batchDetailsHtml = `
      <div class="mt-3 p-3 glass rounded-xl border border-sky-500/20">
        <p class="font-bold text-sky-400 mb-2">FEFO Allocation (First Expiry First Out):</p>
        <div class="space-y-1 text-sm">
          ${allocation
            .map(
              (a) => `
            <div class="flex justify-between">
              <span>Batch ${a.batchNumber}</span>
              <span class="font-medium">${a.quantity} units</span>
            </div>
            <div class="text-slate-400 ml-4">
              ${a.expiryDate ? `Expires: ${formatDate(a.expiryDate)}` : "No expiry"}
            </div>
          `,
            )
            .join("")}
        </div>
        ${remaining > 0 ? `<p class="text-red-400 text-sm mt-2">⚠ Only ${totalAvailable} units available (need ${qty})</p>` : ""}
      </div>
    `;
  }
  
  $("#invoicePreview").innerHTML = `
    <div><b>Invoice:</b> SIQ-${uid()}</div>
    <div><b>Product:</b> ${selected.name}</div>
    <div><b>Category:</b> ${selected.category || "-"}</div>
    ${
      isPerishable(selected.category)
        ? `
      <div>
        <b>Batch Allocation:</b> ${allocation.map(a => `${a.quantity} from ${a.batchNumber}`).join(", ")}
      </div>
    `
        : ""
    }
    <div><b>Quantity:</b> ${totalAvailable}</div>
    <div><b>Total:</b> ${money(total)}</div>
    <div><b>Customer:</b> ${$("#customerName").value || "-"}</div>
    <div><b>Payment:</b> ${$("#paymentMethod").value}</div>
    ${batchDetailsHtml}
  `;
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
    
    const { allocation, remaining } = getFEFObatches(selected.id, quantity);
    
    if (remaining > 0) {
      throw new Error(
        `Insufficient stock. Only ${quantity - remaining} units available across valid batches.`,
      );
    }
    
    if (allocation.length === 0) {
      throw new Error("No valid batches available for sale.");
    }
    
    const invoiceNumber = `SIQ-${Date.now().toString().slice(-8)}`;
    
    await runTransaction(db, async (tx) => {
      for (const alloc of allocation) {
        const batchRef = doc(db, "productBatches", alloc.batchId);
        const batchSnap = await tx.get(batchRef);
        
        if (!batchSnap.exists()) {
          throw new Error(`Batch ${alloc.batchNumber} not found.`);
        }
        
        const batch = batchSnap.data();
        const currentRemaining = Number(batch.remainingQuantity || 0);
        
        if (alloc.quantity > currentRemaining) {
          throw new Error(
            `Batch ${alloc.batchNumber} only has ${currentRemaining} units left.`,
          );
        }
        
        const newRemaining = currentRemaining - alloc.quantity;
        let newStatus = getBatchStatus({ ...batch, remainingQuantity: newRemaining });
        if (newRemaining <= 0) newStatus = "Empty";
        
        tx.update(batchRef, {
          remainingQuantity: newRemaining,
          soldQuantity: Number(batch.soldQuantity || 0) + alloc.quantity,
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      }
      
      const productRef = doc(db, "products", selected.id);
      const productSnap = await tx.get(productRef);
      
      if (!productSnap.exists()) throw new Error("Product not found.");
      
      const product = productSnap.data();
      const currentStock = Number(product.stock || 0);
      const newStock = currentStock - quantity;
      
      tx.update(productRef, {
        stock: newStock,
        status: statusFor(newStock, product.minStock),
        updatedAt: serverTimestamp(),
      });
    });
    
    const totalCost = allocation.reduce(
      (sum, a) => sum + a.costPrice * a.quantity,
      0,
    );
    const avgCostPrice = quantity > 0 ? totalCost / quantity : 0;
    
    const sale = {
      category: selected.category || "",
      manufactureDate: allocation[0]?.manufactureDate || "",
      expiryDate: allocation[0]?.expiryDate || "",
      invoiceNumber,
      productId: selected.id,
      productName: selected.name,
      quantity,
      price: Number(selected.price),
      costPrice: avgCostPrice,
      totalAmount: Number(selected.price) * quantity,
      profit: (Number(selected.price) - avgCostPrice) * quantity,
      customerName: $("#customerName").value.trim(),
      paymentMethod: $("#paymentMethod").value,
      salespersonId: profile.id,
      salespersonName: profile.name || profile.email,
      source: isStaff ? "staff" : "admin",
      isDemo: false,
      batchDetails: allocation.map((a) => ({
        batchId: a.batchId,
        batchNumber: a.batchNumber,
        quantity: a.quantity,
        expiryDate: a.expiryDate,
        costPrice: a.costPrice,
      })),
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
      `New sale ${invoiceNumber}: ${selected.name} x ${quantity}. Stock left: ${allocation.reduce((sum, a) => sum + a.quantity, 0) - quantity}.`,
      "sale",
    );
    
    const productSnap = await getDoc(doc(db, "products", selected.id));
    const productData = productSnap.data();
    if (productData && statusFor(productData.stock, productData.minStock) !== "Available") {
      await createNotification(
        `${selected.name} is ${statusFor(productData.stock, productData.minStock)}. Current stock: ${productData.stock}.`,
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