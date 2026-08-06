import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  toast,
  setBusy,
  statusFor,
  badgeForStatus,
  money,
  emptyState,
  createNotification,
  getBatchStatus,
  badgeForBatchStatus,
  formatDate,
  getProductBatchInfo,
  fetchByAdminId,
} from "../../js/shared.js";

import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  getDocs,
} from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "products", profile);

let products = [];
let batches = [];

const modal = $("#productModal");
const form = $("#productForm");
const batchDetailModal = $("#batchDetailModal");

function watchByAdminId(name, callback) {
  if (!profile.id) {
    console.warn(`watchByAdminId skipped for ${name}: profile.id is undefined`);
    return () => {};
  }
  const ref = query(collection(db, name), where("adminId", "==", profile.id));
  const mapDocs = (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tb - ta;
    });
    return rows;
  };

  try {
    return onSnapshot(
      ref,
      (snap) => callback(mapDocs(snap)),
      (err) => {
        console.warn(`Realtime listener failed for ${name}:`, err);
        fetchByAdminId(name, profile.id).then(callback);
        setTimeout(
          () =>
            toast(
              `Live update failed for ${name}. Showing latest loaded data.`,
              "err",
            ),
          700,
        );
      },
    );
  } catch (err) {
    console.warn(`Could not start realtime listener for ${name}:`, err);
    fetchByAdminId(name, profile.id).then(callback);
    return () => {};
  }
}

function ensureCategoryOption(category) {
  if (!category) return;

  const categorySelect = $("#productCategory");

  const alreadyExists = [...categorySelect.options].some(
    (option) => option.value === category,
  );

  if (!alreadyExists) {
    categorySelect.add(new Option(category, category));
  }
}

function openModal(product = null) {
  form.reset();

  $("#productModalTitle").textContent = product
    ? "Edit Product"
    : "Add Product";

  $("#productId").value = product?.id || "";
  $("#productName").value = product?.name || "";

  ensureCategoryOption(product?.category);
  $("#productCategory").value = product?.category || "";

  $("#productPrice").value = product?.price ?? "";
  $("#productCost").value = product?.costPrice ?? "";
  $("#productStock").value = product?.stock ?? "";
  $("#productMinStock").value = product?.minStock ?? "";
  $("#productSupplier").value = product?.supplierName || "";
  $("#productImage").value = product?.imageUrl || "";
  $("#productDescription").value = product?.description || "";
  $("#productMfgDate").value = product?.manufactureDate || "";
  $("#productExpiryDate").value = product?.expiryDate || "";

  toggleExpiryFields($("#productCategory").value);

  modal.classList.add("show");
}

function toggleExpiryFields(category) {
  const expiryFields = $("#expiryFields");
  const mfgInput = $("#productMfgDate");
  const expiryInput = $("#productExpiryDate");
  const isPerishable = category === "Food" || category === "Medicine";

  if (isPerishable) {
    expiryFields.style.display = "grid";
    mfgInput.required = true;
    expiryInput.required = true;
  } else {
    expiryFields.style.display = "none";
    mfgInput.required = false;
    expiryInput.required = false;
    mfgInput.value = "";
    expiryInput.value = "";
  }
}

function closeModal() {
  modal.classList.remove("show");
  form.reset();
}

window.editProduct = (id) => {
  const product = products.find((item) => item.id === id);
  openModal(product);
};

window.deleteProduct = async (id) => {
  if (!confirm("Delete this product and its batches?")) return;

  try {
    // Delete associated batches first
    const batchQuery = query(collection(db, "productBatches"), where("productId", "==", id));
    const batchSnap = await getDocs(batchQuery);
    const batchDeletePromises = batchSnap.docs.map(d => deleteDoc(doc(db, "productBatches", d.id)));
    await Promise.all(batchDeletePromises);

    // Delete the product
    await deleteDoc(doc(db, "products", id));
    toast("Product and batches deleted.");
    await load();
  } catch (error) {
    toast(error.message, "err");
  }
};

window.viewBatchDetails = (productId) => {
  const p = products.find((x) => x.id === productId);
  const productBatches = batches.filter((b) => b.productId === productId);
  $("#batchDetailTitle").textContent = `Batches: ${p.name}`;
  $("#batchDetailContent").innerHTML = productBatches.length
    ? `<div class="table-wrap"><table><thead><tr><th>Batch #</th><th>MFG Date</th><th>Expiry Date</th><th>Purchased</th><th>Remaining</th><th>Supplier</th><th>Purchase Price</th><th>Status</th></tr></thead><tbody>${productBatches
        .sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || ""))
        .map((b) => {
          const status = getBatchStatus(b);
          return `<tr class="${status === "Expired" ? "warning-row" : ""}"><td class="font-mono">${b.batchNumber}</td><td>${formatDate(b.manufactureDate)}</td><td>${formatDate(b.expiryDate)}</td><td>${b.purchasedQuantity || 0}</td><td class="font-bold">${b.remainingQuantity || 0}</td><td>${b.supplierName || "-"}</td><td>${money(b.purchasePrice || 0)}</td><td>${badgeForBatchStatus(status)}</td></tr>`;
        })
        .join("")}</tbody></table></div>`
    : emptyState("No batches", "This product has no batches yet. Create batches via Restock page.");
  batchDetailModal.classList.add("show");
};

function getOldestExpiry(product, productBatches) {
  const activeBatches = productBatches.filter(b => {
    const s = getBatchStatus(b);
    return s !== "Disposed" && s !== "Empty" && b.expiryDate;
  });
  if (!activeBatches.length) return "-";
  activeBatches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  return formatDate(activeBatches[0].expiryDate);
}

function getLatestExpiry(product, productBatches) {
  const activeBatches = productBatches.filter(b => {
    const s = getBatchStatus(b);
    return s !== "Disposed" && s !== "Empty" && b.expiryDate;
  });
  if (!activeBatches.length) return "-";
  activeBatches.sort((a, b) => b.expiryDate.localeCompare(a.expiryDate));
  return formatDate(activeBatches[0].expiryDate);
}

function render() {
  const search = $("#productSearch").value.toLowerCase();
  const categoryFilter = $("#categoryFilter").value.toLowerCase();

  const rows = products.filter((product) => {
    const matchesName = String(product.name || "")
      .toLowerCase()
      .includes(search);

    const matchesCategory =
      !categoryFilter ||
      String(product.category || "")
        .toLowerCase()
        .includes(categoryFilter);

    return matchesName && matchesCategory;
  });

  $("#productsTable").innerHTML = rows.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Total Stock</th>
              <th>Min</th>
              <th>Default Supplier</th>
              <th>Batches</th>
              <th>Nearest Expiry</th>
              <th>Latest Expiry</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map((product) => {
                const stockStatus = statusFor(product.stock, product.minStock);
                const productBatches = batches.filter((b) => b.productId === product.id);
                const activeBatches = productBatches.filter(b => {
                  const s = getBatchStatus(b);
                  return s !== "Disposed" && s !== "Empty";
                });
                const oldestExpiry = getOldestExpiry(product, productBatches);
                const latestExpiry = getLatestExpiry(product, productBatches);

                return `
                  <tr class="${
                    stockStatus !== "Available" ? "warning-row" : ""
                  }">
                    <td>
                      ${
                        product.imageUrl
                          ? `
                            <img
                              src="${product.imageUrl}"
                              alt="${product.name || "Product"}"
                              class="w-12 h-12 rounded-xl object-cover"
                            >
                          `
                          : "📦"
                      }
                    </td>

                    <td class="font-black">
                      ${product.name || "-"}
                    </td>

                    <td>${product.category || "-"}</td>

                    <td>${money(product.price)}</td>
                    <td>${money(product.costPrice)}</td>
                    <td>${product.stock || 0}</td>
                    <td>${product.minStock || 0}</td>
                    <td>${product.supplierName || "-"}</td>

                    <td>
                      <span class="badge badge-info">${activeBatches.length}</span>
                    </td>

                    <td>
                      ${oldestExpiry !== "-" 
                        ? `<span class="${activeBatches.some(b => getBatchStatus(b) === "Critical Expiry") ? "text-red-400" : activeBatches.some(b => getBatchStatus(b) === "Near Expiry") ? "text-amber-400" : ""}">${oldestExpiry}</span>`
                        : '<span class="text-slate-400">—</span>'}
                    </td>

                    <td>
                      ${latestExpiry !== "-" ? latestExpiry : '<span class="text-slate-400">—</span>'}
                    </td>

                    <td>
                      ${badgeForStatus(stockStatus)}
                    </td>

                    <td>
                      <div class="flex gap-2">
                        <button
                          class="btn btn-ghost btn-sm"
                          onclick="editProduct('${product.id}')"
                        >
                          Edit
                        </button>

                        <button
                          class="btn btn-info btn-sm"
                          onclick="viewBatchDetails('${product.id}')"
                        >
                          View Batches
                        </button>

                        <button
                          class="btn btn-danger btn-sm"
                          onclick="deleteProduct('${product.id}')"
                        >
                          Delete
                        </button>
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
    : emptyState("No products found", "Add products to manage inventory.");
}

async function load() {
  products = await fetchByAdminId("products", profile.id);
  batches = await fetchByAdminId("productBatches", profile.id);
  render();
}

const unsubs = [
  watchByAdminId('products', rows => {
    products = rows;
    render();
  }),
  watchByAdminId('productBatches', rows => {
    batches = rows;
    render();
  })
];

$("#openProductModal").onclick = () => openModal();

$$("[data-close-modal]").forEach((button) => {
  button.onclick = () => {
    modal.classList.remove("show");
    batchDetailModal.classList.remove("show");
    form.reset();
  };
});

$("#refreshProducts").onclick = load;
$("#productSearch").oninput = render;
$("#categoryFilter").oninput = render;

$("#productCategory").onchange = (e) => toggleExpiryFields(e.target.value);

form.onsubmit = async (event) => {
  event.preventDefault();

  const button = event.submitter;
  setBusy(button, true);

  try {
    const category = $("#productCategory").value.trim();
    const isPerishable = category === "Food" || category === "Medicine";

    const data = {
      name: $("#productName").value.trim(),
      category,
      price: Number($("#productPrice").value),
      costPrice: Number($("#productCost").value),
      stock: Number($("#productStock").value),
      minStock: Number($("#productMinStock").value),
      supplierName: $("#productSupplier").value.trim(),
      imageUrl: $("#productImage").value.trim(),
      description: $("#productDescription").value.trim(),
      adminId: profile.id,
      adminName: profile.name || profile.email,
      updatedAt: serverTimestamp(),
    };

    if (isPerishable) {
      data.manufactureDate = $("#productMfgDate").value;
      data.expiryDate = $("#productExpiryDate").value;
    }

    data.status = statusFor(data.stock, data.minStock);

    const productId = $("#productId").value;

    if (productId) {
      await updateDoc(doc(db, "products", productId), data);
    } else {
      await addDoc(collection(db, "products"), {
        ...data,
        createdAt: serverTimestamp(),
      });
    }

    if (data.status !== "Available") {
      await createNotification(
        `${data.name} stock status is ${data.status}. Current stock: ${data.stock}.`,
        "stock",
      );
    }

    toast("Product saved.");
    closeModal();
    await load();
  } catch (error) {
    toast(error.message, "err");
  } finally {
    setBusy(button, false);
  }
};

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  unsubs.forEach(unsub => unsub?.());
});

load();