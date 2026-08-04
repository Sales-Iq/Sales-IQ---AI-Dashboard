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

form.onsubmit = async (event) => {
  event.preventDefault();

  const button = event.submitter;
  setBusy(button, true);

  try {
    const data = {
      name: $("#productName").value.trim(),
      category: $("#productCategory").value.trim(),
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

load();