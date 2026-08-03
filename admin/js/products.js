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

const modal = $("#productModal");
const form = $("#productForm");

const PERISHABLE_CATEGORIES = new Set(["food", "medicine"]);

function isPerishable(category) {
  return PERISHABLE_CATEGORIES.has(
    String(category || "")
      .trim()
      .toLowerCase(),
  );
}

function formatProductDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN");
}

function expiryCell(product) {
  if (!isPerishable(product.category)) {
    return "-";
  }

  if (!product.expiryDate) {
    return '<span class="badge badge-warn">Missing date</span>';
  }

  const today = new Date().toISOString().slice(0, 10);

  if (product.expiryDate < today) {
    return `
      <span class="badge badge-danger">
        Expired · ${formatProductDate(product.expiryDate)}
      </span>
    `;
  }

  const todayDate = new Date(`${today}T00:00:00`);
  const expiryDate = new Date(`${product.expiryDate}T00:00:00`);

  const daysLeft = Math.ceil(
    (expiryDate.getTime() - todayDate.getTime()) / 86400000,
  );

  if (daysLeft <= 30) {
    return `
      <span class="badge badge-warn">
        ${formatProductDate(product.expiryDate)} · ${daysLeft} days
      </span>
    `;
  }

  return `
    <span class="badge badge-ok">
      ${formatProductDate(product.expiryDate)}
    </span>
  `;
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

function toggleProductDateFields(clearWhenHidden = true) {
  const category = $("#productCategory").value;
  const requiresDates = isPerishable(category);

  const wrapper = $("#productDateFields");
  const manufactureInput = $("#productManufactureDate");
  const expiryInput = $("#productExpiryDate");

  wrapper.hidden = !requiresDates;

  manufactureInput.required = requiresDates;
  expiryInput.required = requiresDates;

  if (!requiresDates && clearWhenHidden) {
    manufactureInput.value = "";
    expiryInput.value = "";
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

  $("#productManufactureDate").value = product?.manufactureDate || "";

  $("#productExpiryDate").value = product?.expiryDate || "";

  $("#productPrice").value = product?.price ?? "";
  $("#productCost").value = product?.costPrice ?? "";
  $("#productStock").value = product?.stock ?? "";
  $("#productMinStock").value = product?.minStock ?? "";
  $("#productSupplier").value = product?.supplierName || "";
  $("#productImage").value = product?.imageUrl || "";

  toggleProductDateFields(false);

  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
  form.reset();
  toggleProductDateFields();
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
              <th>MFG Date</th>
              <th>Expiry Date</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Stock</th>
              <th>Min</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map((product) => {
                const stockStatus = statusFor(product.stock, product.minStock);

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

                    <td>
                      ${
                        isPerishable(product.category)
                          ? formatProductDate(product.manufactureDate)
                          : "-"
                      }
                    </td>

                    <td>${expiryCell(product)}</td>

                    <td>${money(product.price)}</td>
                    <td>${money(product.costPrice)}</td>
                    <td>${product.stock || 0}</td>
                    <td>${product.minStock || 0}</td>
                    <td>${product.supplierName || "-"}</td>

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
  render();
}

$("#openProductModal").onclick = () => openModal();

$$("[data-close-modal]").forEach((button) => {
  button.onclick = closeModal;
});

$("#refreshProducts").onclick = load;
$("#productSearch").oninput = render;
$("#categoryFilter").oninput = render;

$("#productCategory").addEventListener("change", () => {
  toggleProductDateFields();
});

form.onsubmit = async (event) => {
  event.preventDefault();

  const button = event.submitter;
  setBusy(button, true);

  try {
    const category = $("#productCategory").value.trim();
    const perishable = isPerishable(category);

    const manufactureDate = perishable
      ? $("#productManufactureDate").value
      : "";

    const expiryDate = perishable ? $("#productExpiryDate").value : "";

    if (perishable && !manufactureDate) {
      throw new Error("Manufacture date is required for food and medicine.");
    }

    if (perishable && !expiryDate) {
      throw new Error("Expiry date is required for food and medicine.");
    }

    if (
      perishable &&
      manufactureDate &&
      expiryDate &&
      expiryDate <= manufactureDate
    ) {
      throw new Error("Expiry date must be after the manufacture date.");
    }

    const data = {
      name: $("#productName").value.trim(),
      category,
      manufactureDate,
      expiryDate,
      price: Number($("#productPrice").value),
      costPrice: Number($("#productCost").value),
      stock: Number($("#productStock").value),
      minStock: Number($("#productMinStock").value),
      supplierName: $("#productSupplier").value.trim(),
      imageUrl: $("#productImage").value.trim(),
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

toggleProductDateFields();
load();
