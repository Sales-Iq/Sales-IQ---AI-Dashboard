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
} from "../../js/shared.js";

import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Admin", "Manager"]);
initAppShell("admin", "products", profile);

let products = [];
let batches = [];

const modal = $("#productModal");
const form = $("#productForm");
const batchDetailModal = $("#batchDetailModal");

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

  modal.classList.add("show");
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
  if (!confirm("Delete this product?")) return;

  try {
    await deleteDoc(doc(db, "products", id));
    toast("Product deleted.");
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
  products = await fetchAll("products");
  batches = await fetchAll("productBatches");
  render();
}

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

form.onsubmit = async (event) => {
  event.preventDefault();

  const button = event.submitter;
  setBusy(button, true);

  try {
    const category = $("#productCategory").value.trim();

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
      updatedAt: serverTimestamp(),
    };

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

load();