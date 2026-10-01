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
  toCSV,
} from "../../js/shared.js";

import {
  db,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
} from "../../js/firebase-config.js";

import { mapExcelHeadersWithAI } from "../../js/gemini-service.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "products", profile);

let products = [];
let batches = [];

// State for Excel / CSV Import
let parsedImportData = {
  fileName: "",
  headers: [],
  rows: [],
  currentMapping: {},
};

function getProductBatches(productId) {
  return batches.filter(
    (b) => b.productId === productId && Number(b.remainingQuantity) > 0,
  );
}

function nearestExpiry(product) {
  if (!product) return "-";
  const list = getProductBatches(product.id)
    .filter((b) => b.expiryDate)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  if (list.length > 0) {
    try {
      return new Date(list[0].expiryDate).toLocaleDateString("en-IN");
    } catch (_) {
      return list[0].expiryDate;
    }
  }

  if (product.expiryDate) {
    try {
      return new Date(product.expiryDate).toLocaleDateString("en-IN");
    } catch (_) {
      return product.expiryDate;
    }
  }

  return "-";
}

const modal = $("#productModal");
const form = $("#productForm");
const importModal = $("#importModal");

const PERISHABLE_CATEGORIES = new Set(["food", "medicine"]);

function isPerishable(category) {
  return PERISHABLE_CATEGORIES.has(
    String(category || "")
      .trim()
      .toLowerCase(),
  );
}

function ensureCategoryOption(category) {
  if (!category) return;

  const categorySelect = $("#productCategory");
  const alreadyExists = [...categorySelect.options].some(
    (option) => option.value.toLowerCase() === category.toLowerCase(),
  );

  if (!alreadyExists) {
    categorySelect.add(new Option(category, category));
  }
}

function updateDateFieldsVisibility() {
  const category = $("#productCategory")?.value || "";
  const dateFields = $("#productDateFields");
  if (dateFields) {
    if (isPerishable(category)) {
      dateFields.removeAttribute("hidden");
    } else {
      dateFields.setAttribute("hidden", "");
    }
  }
}

function openModal(product = null) {
  form.reset();

  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
  document.body.style.overflow = "hidden";

  $("#productModalTitle").textContent = product
    ? "Edit Product"
    : "Add Product";

  $("#productId").value = product?.id || "";
  $("#productName").value = product?.name || "";

  ensureCategoryOption(product?.category);
  $("#productCategory").value = product?.category || "";
  updateDateFieldsVisibility();

  if (isPerishable(product?.category)) {
    $("#productManufactureDate").value = product?.manufactureDate || "";
    $("#productExpiryDate").value = product?.expiryDate || "";
  } else {
    $("#productManufactureDate").value = "";
    $("#productExpiryDate").value = "";
  }

  $("#productPrice").value = product?.price ?? "";
  $("#productCost").value = product?.costPrice ?? "";
  $("#productStock").value = product?.stock ?? "";
  $("#productMinStock").value = product?.minStock ?? "";

  const batchesInput = $("#productBatches");
  if (batchesInput) {
    if (product) {
      const bCount =
        product.batchesCount !== undefined
          ? product.batchesCount
          : getProductBatches(product.id).length || "";
      batchesInput.value = bCount;
    } else {
      batchesInput.value = "";
    }
  }

  $("#productSupplier").value = product?.supplierName || "";
  $("#productImage").value = product?.imageUrl || "";

  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
  document.body.style.overflow = "";
  form.reset();
  updateDateFieldsVisibility();
}

window.editProduct = (id) => {
  const product = products.find((item) => item.id === id);
  openModal(product);
};

window.deleteProduct = async (id) => {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    // 1. Delete product document from Firestore
    await deleteDoc(doc(db, "products", id));

    // 2. Delete any related batches for this product
    try {
      const q = query(
        collection(db, "productBatches"),
        where("productId", "==", id),
      );
      const bSnap = await getDocs(q);
      if (!bSnap.empty) {
        const bBatch = writeBatch(db);
        bSnap.docs.forEach((d) => bBatch.delete(d.ref));
        await bBatch.commit();
      }
    } catch (_) {}

    toast("Product deleted from database.", "ok");

    // 3. Remove locally and re-render
    products = products.filter((p) => p.id !== id);
    updateCategoryDropdown();
    render();

    // 4. Reload from Firestore
    await load();
  } catch (error) {
    console.error("Error deleting product:", error);
    toast(`Failed to delete product: ${error.message}`, "err");
  }
};

function renderStats() {
  const statsEl = $("#productStats");
  if (!statsEl) return;

  const totalSKUs = products.length;
  const totalUnits = products.reduce(
    (sum, p) => sum + (Number(p.stock) || 0),
    0,
  );
  const totalValuation = products.reduce(
    (sum, p) => sum + (Number(p.costPrice) || 0) * (Number(p.stock) || 0),
    0,
  );

  let lowStockCount = 0;
  let outOfStockCount = 0;
  products.forEach((p) => {
    const st = statusFor(p.stock, p.minStock);
    if (st === "Low Stock") lowStockCount++;
    else if (st === "Out of Stock") outOfStockCount++;
  });
  const totalAlerts = lowStockCount + outOfStockCount;

  statsEl.innerHTML = `
    <div class="glass stat-card">
      <div class="stat-label">Total SKUs</div>
      <div class="stat-value text-sky-400">${totalSKUs.toLocaleString()}</div>
      <div class="stat-hint">Active products in catalog</div>
    </div>
    <div class="glass stat-card">
      <div class="stat-label">Total Inventory Units</div>
      <div class="stat-value text-emerald-400">${totalUnits.toLocaleString()}</div>
      <div class="stat-hint">Physical stock available</div>
    </div>
    <div class="glass stat-card">
      <div class="stat-label">Inventory Valuation (Cost)</div>
      <div class="stat-value text-purple-400">${money(totalValuation)}</div>
      <div class="stat-hint">Total cost basis of items</div>
    </div>
    <div class="glass stat-card">
      <div class="stat-label">Stock Alerts</div>
      <div class="stat-value ${totalAlerts > 0 ? "text-amber-400" : "text-emerald-400"}">${totalAlerts}</div>
      <div class="stat-hint">${
        totalAlerts > 0
          ? `${lowStockCount} low stock · ${outOfStockCount} out of stock`
          : "All items adequately stocked"
      }</div>
    </div>
  `;
}

function updateCategoryDropdown() {
  const catSelect = $("#categoryFilter");
  if (!catSelect) return;

  const currentVal = catSelect.value || "";
  const categories = Array.from(
    new Set(products.map((p) => (p.category || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  catSelect.innerHTML =
    `<option value="">All Categories (${products.length})</option>` +
    categories
      .map((cat) => {
        const count = products.filter(
          (p) => (p.category || "").trim().toLowerCase() === cat.toLowerCase(),
        ).length;
        const selected =
          cat.toLowerCase() === currentVal.toLowerCase() ? "selected" : "";
        return `<option value="${cat}" ${selected}>${cat} (${count})</option>`;
      })
      .join("");
}

function render() {
  renderStats();

  const search = ($("#productSearch")?.value || "").toLowerCase().trim();
  const categoryFilter = ($("#categoryFilter")?.value || "")
    .toLowerCase()
    .trim();
  const statusFilter = $("#statusFilter")?.value || "";
  const sortFilter = $("#sortFilter")?.value || "name-asc";

  const rows = products.filter((product) => {
    const matchesName = String(product.name || "")
      .toLowerCase()
      .includes(search);
    const matchesSupplier = String(product.supplierName || "")
      .toLowerCase()
      .includes(search);
    const matchesSearch = !search || matchesName || matchesSupplier;

    const matchesCategory =
      !categoryFilter ||
      String(product.category || "").toLowerCase() === categoryFilter;

    const currentStatus = statusFor(product.stock, product.minStock);
    const matchesStatus = !statusFilter || currentStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort rows based on sortFilter
  rows.sort((a, b) => {
    switch (sortFilter) {
      case "name-desc":
        return String(b.name || "").localeCompare(String(a.name || ""));
      case "stock-asc":
        return (Number(a.stock) || 0) - (Number(b.stock) || 0);
      case "stock-desc":
        return (Number(b.stock) || 0) - (Number(a.stock) || 0);
      case "price-asc":
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      case "price-desc":
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      case "name-asc":
      default:
        return String(a.name || "").localeCompare(String(b.name || ""));
    }
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
              <th>Batches</th>
              <th>Nearest Expiry</th>
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
                      <div class="w-12 h-12 rounded-xl bg-slate-900/60 border border-slate-700/50 flex items-center justify-center overflow-hidden text-xl">
                        ${
                          product.imageUrl
                            ? `
                              <img
                                src="${product.imageUrl}"
                                alt="${product.name || "Product"}"
                                class="w-full h-full object-cover"
                                onerror="this.onerror=null; this.parentElement.innerHTML='📦';"
                              >
                            `
                            : "📦"
                        }
                      </div>
                    </td>

                    <td class="font-black">
                      ${product.name || "-"}
                    </td>

                    <td>${product.category || "-"}</td>

                    <td>${product.batchesCount !== undefined ? product.batchesCount : getProductBatches(product.id).length}</td>
                    <td>${nearestExpiry(product)}</td>

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
    : emptyState("No products found", "Adjust your filters or add products.");
}

export async function purgeProductsWithoutAdminId() {
  try {
    const snap = await getDocs(collection(db, "products"));
    const toDelete = snap.docs.filter((d) => {
      const data = d.data() || {};
      return (
        !data.adminId ||
        typeof data.adminId !== "string" ||
        data.adminId.trim() === ""
      );
    });

    if (toDelete.length > 0) {
      console.log(
        `[SalesIQ] Found ${toDelete.length} product(s) without adminId. Deleting...`,
      );
      for (const d of toDelete) {
        await deleteDoc(doc(db, "products", d.id));
        console.log(
          `[SalesIQ] Deleted product without adminId: ${d.id} (${d.data()?.name || "unnamed"})`,
        );
      }
      return toDelete.length;
    }
  } catch (err) {
    console.warn("Could not purge products without adminId:", err);
  }
  return 0;
}

window.purgeProductsWithoutAdminId = purgeProductsWithoutAdminId;
window.removeProductsWithoutAdminId = purgeProductsWithoutAdminId;

async function load() {
  const adminId = profile.id;

  // 1. Purge any legacy product documents without an adminId
  const purgedCount = await purgeProductsWithoutAdminId();
  if (purgedCount > 0) {
    toast(`Cleaned up ${purgedCount} product(s) without admin ID.`, "info");
  }

  // 2. Fetch ONLY products belonging strictly to this admin!
  products = await fetchAll("products", false, adminId);
  batches = await fetchAll("productBatches", false, adminId).catch(() => []);

  // 3. Sort alphabetically so rendering is clean and predictable
  products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // 4. Update dynamic category options
  updateCategoryDropdown();

  render();
}

const removeNoAdminIdBtn = $("#removeNoAdminIdBtn");
if (removeNoAdminIdBtn) {
  removeNoAdminIdBtn.onclick = async () => {
    if (
      !confirm(
        "Are you sure you want to remove all products without an admin ID from the database?",
      )
    )
      return;

    setBusy(removeNoAdminIdBtn, true, "Removing...");
    try {
      const removed = await purgeProductsWithoutAdminId();
      if (removed > 0) {
        toast(
          `Successfully removed ${removed} product(s) without admin ID.`,
          "ok",
        );
      } else {
        toast(
          "No products without admin ID found. All products have a valid admin ID!",
          "ok",
        );
      }
      await load();
    } catch (err) {
      toast(`Failed: ${err.message}`, "err");
    } finally {
      setBusy(removeNoAdminIdBtn, false);
    }
  };
}

// Export CSV handler
const exportProductsCsvBtn = $("#exportProductsCsv");
if (exportProductsCsvBtn) {
  exportProductsCsvBtn.onclick = () => {
    if (!products.length) {
      toast("No products available to export.", "err");
      return;
    }

    const exportRows = products.map((p) => ({
      "Product ID": p.id || "",
      Name: p.name || "",
      Category: p.category || "",
      "Selling Price": p.price ?? 0,
      "Cost Price": p.costPrice ?? 0,
      Stock: p.stock ?? 0,
      "Min Stock": p.minStock ?? 0,
      "Batches Count":
        p.batchesCount !== undefined
          ? p.batchesCount
          : getProductBatches(p.id).length,
      "Nearest Expiry": nearestExpiry(p),
      Supplier: p.supplierName || "",
      Status: statusFor(p.stock, p.minStock),
    }));

    toCSV(
      exportRows,
      `SalesIQ_Products_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast(`Exported ${products.length} product(s) to CSV.`, "ok");
  };
}

$("#openProductModal").onclick = () => openModal();

$$("[data-close-modal]").forEach((button) => {
  button.onclick = closeModal;
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modal.classList.contains("show")) closeModal();
    if (importModal.classList.contains("show")) closeImportModal();
  }
});

$("#refreshProducts").onclick = load;
$("#productSearch").oninput = render;

const categoryFilterEl = $("#categoryFilter");
if (categoryFilterEl) categoryFilterEl.onchange = render;

const statusFilterEl = $("#statusFilter");
if (statusFilterEl) statusFilterEl.onchange = render;

const sortFilterEl = $("#sortFilter");
if (sortFilterEl) sortFilterEl.onchange = render;

$("#productCategory").onchange = updateDateFieldsVisibility;

// Enforce numbers-only typing for Batches field
const batchesInput = $("#productBatches");
if (batchesInput) {
  batchesInput.addEventListener("keydown", (e) => {
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  });

  batchesInput.addEventListener("input", () => {
    batchesInput.value = batchesInput.value.replace(/[^0-9]/g, "");
  });

  batchesInput.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted =
      (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const cleanDigits = pasted.replace(/[^0-9]/g, "");
    if (cleanDigits) {
      const start = batchesInput.selectionStart ?? batchesInput.value.length;
      const end = batchesInput.selectionEnd ?? batchesInput.value.length;
      const current = batchesInput.value;
      batchesInput.value =
        current.slice(0, start) + cleanDigits + current.slice(end);
      const newPos = start + cleanDigits.length;
      batchesInput.setSelectionRange(newPos, newPos);
    }
  });
}

form.onsubmit = async (event) => {
  event.preventDefault();

  const button = event.submitter;
  setBusy(button, true);

  try {
    const category = $("#productCategory").value.trim();
    const batchesVal = $("#productBatches")?.value?.trim() || "";
    const batchesCount = batchesVal === "" ? 0 : parseInt(batchesVal, 10);

    const data = {
      name: $("#productName").value.trim(),
      category,
      price: Number($("#productPrice").value),
      costPrice: Number($("#productCost").value),
      stock: Number($("#productStock").value),
      minStock: Number($("#productMinStock").value),
      batchesCount: isNaN(batchesCount) ? 0 : batchesCount,
      supplierName: $("#productSupplier").value.trim(),
      imageUrl: $("#productImage").value.trim(),
      updatedAt: serverTimestamp(),
      adminId: profile.id,
    };

    if (isPerishable(category)) {
      data.manufactureDate = $("#productManufactureDate")?.value || null;
      data.expiryDate = $("#productExpiryDate")?.value || null;
    }

    data.status = statusFor(data.stock, data.minStock);

    const productId = $("#productId").value;

    if (productId) {
      await updateDoc(doc(db, "products", productId), data);
    } else {
      await addDoc(collection(db, "products"), {
        ...data,
        createdAt: serverTimestamp(),
        createdBy: profile.id,
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

/* ============================================================
   Smart Excel & CSV Bulk Import with Gemini AI Column Mapping
   ============================================================ */

function openImportModal() {
  if (importModal && importModal.parentElement !== document.body) {
    document.body.appendChild(importModal);
  }
  document.body.style.overflow = "hidden";
  importModal.classList.add("show");
}

function closeImportModal() {
  importModal.classList.remove("show");
  document.body.style.overflow = "";
  $("#importProductFileInput").value = "";
  $("#importProgressWrap").classList.add("hidden");
  $("#confirmImportBtn").disabled = false;
}

$$("[data-close-import-modal]").forEach((b) => {
  b.onclick = closeImportModal;
});

importModal.addEventListener("click", (e) => {
  if (e.target === importModal) closeImportModal();
});

// Trigger file input dialog
$("#triggerImportFile").onclick = () => {
  $("#importProductFileInput").click();
};

// Download Sample Template
$("#downloadSampleTemplate").onclick = () => {
  const sampleHeaders = [
    "Product Name",
    "Category",
    "Selling Price",
    "Cost Price",
    "Stock Quantity",
    "Minimum Stock",
    "Batches",
    "Supplier Name",
  ];
  const sampleRows = [
    ["Amul Butter 500g", "Food", 280, 240, 50, 10, 1, "Amul India"],
    ["Wireless Bluetooth Mouse", "Electronics", 599, 350, 30, 5, 0, "Logitech"],
    ["Paracetamol 500mg", "Medicine", 25, 12, 100, 20, 2, "Cipla Ltd"],
    ["Basmati Rice 5kg", "Food", 450, 380, 40, 10, 1, "India Gate"],
    ["USB-C Fast Cable", "Accessories", 199, 80, 60, 15, 0, "Boat"],
  ];

  if (window.XLSX) {
    const ws = window.XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Products");
    window.XLSX.writeFile(wb, "SalesIQ_Products_Template.xlsx");
  } else {
    // CSV fallback
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [sampleHeaders.join(","), ...sampleRows.map((e) => e.join(","))].join(
        "\n",
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SalesIQ_Products_Template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  toast("Sample template downloaded.");
};

// Handle file selection and parsing
$("#importProductFileInput").onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!window.XLSX) {
    return toast(
      "SheetJS XLSX library is still loading. Please try again.",
      "err",
    );
  }

  const reader = new FileReader();

  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = window.XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = window.XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      if (!rawRows.length) {
        return toast("The uploaded spreadsheet is empty.", "err");
      }

      // Collect all unique headers
      const headerSet = new Set();
      rawRows.forEach((row) => {
        Object.keys(row).forEach((k) => headerSet.add(k.trim()));
      });
      const headers = Array.from(headerSet).filter(Boolean);

      if (!headers.length) {
        return toast("No column headers detected in the file.", "err");
      }

      parsedImportData = {
        fileName: file.name,
        headers,
        rows: rawRows,
        currentMapping: {},
      };

      $("#importFileSubtitle").textContent =
        `File: ${file.name} — ${rawRows.length} total rows detected.`;
      $("#importTotalRowsBadge").textContent = `${rawRows.length} rows found`;

      openImportModal();

      // Show temporary loading in mapping table
      $("#mappingRows").innerHTML = `
        <tr>
          <td colspan="3" class="py-8 text-center text-slate-400 animate-pulse">
            ✨ Analyzing column headers and predicting field mapping with Gemini AI...
          </td>
        </tr>
      `;

      // Call AI Column Mapper (routes to Gemini 2.5 Flash Lite / 3.1 Flash Lite)
      const aiResult = await mapExcelHeadersWithAI(
        headers,
        rawRows.slice(0, 5),
      );

      $("#importAiBadge").textContent = `✨ ${aiResult.confidence}`;
      $("#importModelUsedText").textContent =
        `Mapped by: ${aiResult.modelUsed}`;

      parsedImportData.currentMapping = { ...aiResult.mapping };

      renderMappingUI(headers, rawRows, parsedImportData.currentMapping);
      updateLivePreview(rawRows);
    } catch (err) {
      console.error("File parsing error:", err);
      toast("Could not read spreadsheet: " + err.message, "err");
    }
  };

  reader.readAsArrayBuffer(file);
};

// Target Fields Configuration
const TARGET_FIELDS = [
  {
    key: "name",
    label: "Product Name",
    required: true,
    hint: "Title, item description",
  },
  {
    key: "price",
    label: "Selling Price",
    required: true,
    hint: "Retail price, MRP, rate",
  },
  {
    key: "costPrice",
    label: "Cost Price",
    required: false,
    hint: "Buy rate, purchase price, CP",
  },
  {
    key: "stock",
    label: "Current Stock",
    required: true,
    hint: "Quantity in hand, balance units",
  },
  {
    key: "minStock",
    label: "Minimum Stock",
    required: false,
    hint: "Alert limit, reorder point (default 5)",
  },
  {
    key: "category",
    label: "Category",
    required: false,
    hint: "Group, department, type",
  },
  {
    key: "batchesCount",
    label: "Batches Count",
    required: false,
    hint: "Number of batches (default 0)",
  },
  {
    key: "supplierName",
    label: "Supplier Name",
    required: false,
    hint: "Distributor, vendor",
  },
];

function renderMappingUI(headers, rawRows, activeMapping) {
  const tbody = $("#mappingRows");
  const firstRow = rawRows[0] || {};

  tbody.innerHTML = TARGET_FIELDS.map((field) => {
    const matchedCol = activeMapping[field.key] || "";
    const sampleVal = matchedCol
      ? firstRow[matchedCol] !== undefined
        ? firstRow[matchedCol]
        : "-"
      : "-";

    return `
      <tr class="py-2">
        <td class="py-2.5">
          <div class="font-bold flex items-center gap-1.5 text-slate-200">
            <span>${field.label}</span>
            ${field.required ? '<span class="text-rose-400 font-black">*</span>' : '<span class="text-slate-500 text-xs">(Optional)</span>'}
          </div>
          <div class="text-[11px] text-slate-400">${field.hint}</div>
        </td>

        <td class="py-2.5 pr-3">
          <select class="select mapping-select select-sm text-xs w-full" data-target-field="${field.key}">
            <option value="">🚫 Skip / Ignore</option>
            ${headers
              .map(
                (h) =>
                  `<option value="${h}" ${h === matchedCol ? "selected" : ""}>${h}</option>`,
              )
              .join("")}
          </select>
        </td>

        <td class="py-2.5 text-slate-300 font-mono text-xs truncate max-w-[200px]" id="sample_${field.key}">
          ${sampleVal}
        </td>
      </tr>
    `;
  }).join("");

  // Attach change listener to dropdowns
  $$(".mapping-select").forEach((select) => {
    select.onchange = () => {
      const fieldKey = select.dataset.targetField;
      const selectedCol = select.value;
      parsedImportData.currentMapping[fieldKey] = selectedCol;

      const previewCell = $(`#sample_${fieldKey}`);
      if (previewCell) {
        previewCell.textContent =
          selectedCol && firstRow[selectedCol] !== undefined
            ? String(firstRow[selectedCol])
            : "-";
      }

      updateLivePreview(parsedImportData.rows);
    };
  });
}

function updateLivePreview(rawRows) {
  const table = $("#importPreviewTable");
  const map = parsedImportData.currentMapping;
  const sample3 = rawRows.slice(0, 3);

  const cleanNum = (val, fallback = 0) => {
    if (val === undefined || val === null || val === "") return fallback;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? fallback : n;
  };

  table.innerHTML = `
    <thead>
      <tr class="text-slate-400 border-b border-slate-700">
        <th class="p-2">Name</th>
        <th class="p-2">Category</th>
        <th class="p-2">Price</th>
        <th class="p-2">Cost</th>
        <th class="p-2">Stock</th>
        <th class="p-2">Min</th>
        <th class="p-2">Supplier</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-800">
      ${sample3
        .map((r) => {
          const name = map.name ? String(r[map.name] || "").trim() : "—";
          const cat = map.category
            ? String(r[map.category] || "Other").trim()
            : "Other";
          const price = map.price ? cleanNum(r[map.price], 0) : 0;
          const cost = map.costPrice ? cleanNum(r[map.costPrice], 0) : 0;
          const stock = map.stock ? cleanNum(r[map.stock], 0) : 0;
          const min = map.minStock ? cleanNum(r[map.minStock], 5) : 5;
          const supplier = map.supplierName
            ? String(r[map.supplierName] || "-").trim()
            : "-";

          return `
            <tr class="text-slate-200">
              <td class="p-2 font-bold">${name}</td>
              <td class="p-2">${cat}</td>
              <td class="p-2 font-mono text-emerald-400">${money(price)}</td>
              <td class="p-2 font-mono text-slate-400">${money(cost)}</td>
              <td class="p-2 font-mono font-bold">${stock}</td>
              <td class="p-2 font-mono text-slate-400">${min}</td>
              <td class="p-2 text-slate-400">${supplier}</td>
            </tr>
          `;
        })
        .join("")}
    </tbody>
  `;
}

// Confirm and execute batch import to Firestore
$("#confirmImportBtn").onclick = async () => {
  const map = parsedImportData.currentMapping;

  if (!map.name) {
    return toast(
      "Please map the 'Product Name' column before importing.",
      "err",
    );
  }

  const rawRows = parsedImportData.rows;
  if (!rawRows.length) return;

  const btn = $("#confirmImportBtn");
  btn.disabled = true;

  const progressWrap = $("#importProgressWrap");
  const progressBar = $("#importProgressBar");
  const progressPercent = $("#importProgressPercent");
  const progressLabel = $("#importProgressLabel");

  progressWrap.classList.remove("hidden");

  const cleanNum = (val, fallback = 0) => {
    if (val === undefined || val === null || val === "") return fallback;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? fallback : n;
  };

  try {
    const productsToAdd = [];

    rawRows.forEach((r) => {
      const name = map.name ? String(r[map.name] || "").trim() : "";
      if (!name) return; // Skip empty rows

      const price = map.price ? cleanNum(r[map.price], 0) : 0;
      const costPrice = map.costPrice ? cleanNum(r[map.costPrice], 0) : 0;
      const stock = map.stock ? cleanNum(r[map.stock], 0) : 0;
      const minStock = map.minStock ? cleanNum(r[map.minStock], 5) : 5;
      const category = map.category
        ? String(r[map.category] || "Other").trim()
        : "Other";
      const batchesCount = map.batchesCount
        ? Math.max(0, parseInt(cleanNum(r[map.batchesCount], 0), 10))
        : 0;
      const supplierName = map.supplierName
        ? String(r[map.supplierName] || "").trim()
        : "";

      productsToAdd.push({
        name,
        price,
        costPrice,
        stock,
        minStock,
        category,
        batchesCount,
        supplierName,
        status: statusFor(stock, minStock),
        imageUrl: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile.id,
        adminId: profile.id,
      });
    });

    if (!productsToAdd.length) {
      throw new Error("No valid products found with a non-empty name.");
    }

    // Chunk in batches of 400 (Firestore limit is 500 ops)
    const BATCH_SIZE = 400;
    const total = productsToAdd.length;
    let written = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = productsToAdd.slice(i, i + BATCH_SIZE);
      const bWriter = writeBatch(db);

      chunk.forEach((prod) => {
        const newDocRef = doc(collection(db, "products"));
        bWriter.set(newDocRef, prod);
      });

      await bWriter.commit();
      written += chunk.length;

      const pct = Math.round((written / total) * 100);
      progressBar.style.width = `${pct}%`;
      progressPercent.textContent = `${pct}%`;
      progressLabel.textContent = `Imported ${written} / ${total} products...`;
    }

    await createNotification(
      `Successfully imported ${written} products from ${parsedImportData.fileName}.`,
      "stock",
    );

    toast(`Successfully imported ${written} products!`, "ok");
    closeImportModal();
    await load();
  } catch (err) {
    console.error("Import error:", err);
    toast("Import failed: " + err.message, "err");
  } finally {
    btn.disabled = false;
  }
};

load();
