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
  getDoc,
  updateDoc,
} from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Sales Staff"]);

// Refresh profile from Firestore to ensure adminId is strictly up-to-date
try {
  const staffSnap = await getDoc(doc(db, "staff", profile.id));
  if (staffSnap.exists()) {
    const data = staffSnap.data();
    if (data.adminId) {
      profile.adminId = data.adminId;
      profile.adminName = data.adminName || profile.adminName;
    } else if (data.pendingRequest?.adminId) {
      // Auto-connect to the inviting admin immediately
      profile.adminId = data.pendingRequest.adminId;
      profile.adminName = data.pendingRequest.adminName;
      await updateDoc(doc(db, "staff", profile.id), {
        adminId: data.pendingRequest.adminId,
        adminName: data.pendingRequest.adminName,
        adminEmail: data.pendingRequest.adminEmail || "",
        adminStatus: "connected",
        pendingRequest: null,
      }).catch(() => {});
    }
    try {
      localStorage.setItem("salesiq_user", JSON.stringify(profile));
    } catch (_) {}
  }
} catch (_) {}

// Fallback: If staff has no adminId, check if only one admin exists in the system
if (!profile.adminId) {
  try {
    const adminsSnap = await getDocs(collection(db, "admins"));
    if (adminsSnap.size === 1) {
      const singleAdmin = adminsSnap.docs[0];
      profile.adminId = singleAdmin.id;
      profile.adminName =
        singleAdmin.data().name || singleAdmin.data().email || "Admin";
      await updateDoc(doc(db, "staff", profile.id), {
        adminId: singleAdmin.id,
        adminName: profile.adminName,
        adminEmail: singleAdmin.data().email || "",
        adminStatus: "connected",
      }).catch(() => {});
      try {
        localStorage.setItem("salesiq_user", JSON.stringify(profile));
      } catch (_) {}
    }
  } catch (_) {}
}

initAppShell("sales", "add-sale", profile);

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
  const alertEl = $("#staffNotConnectedAlert");
  const submitBtn = $("#billingForm button[type='submit']");

  if (!profile.adminId) {
    if (alertEl) alertEl.classList.remove("hidden");
    if (submitBtn) submitBtn.disabled = true;
    $("#saleProduct").innerHTML =
      '<option value="">No admin connected. Ask your Admin to connect your account.</option>';
    updatePreview();
    hideSkeletonLoader();
    return;
  }

  if (alertEl) alertEl.classList.add("hidden");
  if (submitBtn) submitBtn.disabled = false;

  // Use unsorted fetchAll (sorted = false) so no products are dropped if createdAt is missing!
  products = await fetchAll("products", false, profile.adminId);

  if (!products.length) {
    $("#saleProduct").innerHTML =
      '<option value="">No products found in admin inventory</option>';
    updatePreview();
    hideSkeletonLoader();
    return;
  }

  $("#saleProduct").innerHTML =
    '<option value="">Choose product</option>' +
    products
      .map((product) => {
        const stock = Number(product.stock || 0);
        const isOutOfStock = stock <= 0;
        return `
          <option value="${product.id}" ${isOutOfStock ? "disabled" : ""}>
            ${product.name} — ${stock} in stock ${isOutOfStock ? "(Out of Stock)" : ""}
          </option>
        `;
      })
      .join("");

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedId = urlParams.get("productId");
  if (preselectedId && products.some((p) => p.id === preselectedId)) {
    $("#saleProduct").value = preselectedId;
  }

  updatePreview();
  hideSkeletonLoader();
}

window.addEventListener("salesiq:cache-updated", (e) => {
  if (e.detail?.name === "products") {
    loadProducts();
  }
});

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

  if (!profile.adminId) {
    return toast(
      "You must be connected to an admin inventory to make sales.",
      "err",
    );
  }

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

    const soldBatches = [];
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

      if (batches.length > 0 && remainingToSell > 0) {
        throw new Error("Not enough batch stock available.");
      }
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
      try {
        const batchWriter = writeBatch(db);
        batchDeductions.forEach((d) =>
          batchWriter.update(d.ref, { remainingQuantity: d.remaining }),
        );
        await batchWriter.commit();
      } catch (batchErr) {
        console.warn("Batch deductions non-critical error:", batchErr);
      }
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
      salespersonId: profile.id,
      salespersonName: profile.name || profile.email,
      salespersonEmail: profile.email || "",
      source: "staff",
      adminId: profile.adminId,
      isDemo: false,
      createdAt: serverTimestamp(),
    };

    if (soldBatches.length > 0) {
      sale.batchMethod = "FEFO";
    }

    await addDoc(collection(db, "sales"), sale);

    if (sale.customerName) {
      await addDoc(collection(db, "customers"), {
        name: sale.customerName,
        totalSpent: sale.totalAmount,
        lastPurchaseDate: new Date().toISOString().slice(0, 10),
        adminId: sale.adminId,
        createdAt: serverTimestamp(),
        source: sale.source,
      }).catch(() => {});
    }

    await createNotification(
      `New sale ${invoiceNumber}: ${selected.name} x ${quantity}. Stock left: ${newStock}.`,
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
    await loadProducts();
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
