import {
  requireAuth,
  initAppShell,
  fetchAll,
  getCachedCollection,
  hideSkeletonLoader,
  $,
  $$,
  toast,
  money,
  emptyState,
  invalidateCache,
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

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "contacts", profile);

let customers = [];
let suppliers = [];
let activeTab = new URLSearchParams(window.location.search).get("tab") === "suppliers" ? "suppliers" : "customers";
let searchQuery = "";

// ── 1. Instant 0ms Cached Rendering ─────────────────────────────────────────
const cachedCust = getCachedCollection(`salesiq_cache_customers_${profile.id}_false`);
if (cachedCust?.data?.length) {
  customers = [...cachedCust.data];
}

const cachedSup = getCachedCollection(`salesiq_cache_suppliers_${profile.id}_false`);
if (cachedSup?.data?.length) {
  suppliers = [...cachedSup.data];
}

if (customers.length || suppliers.length) {
  render();
  hideSkeletonLoader();
}

// ── 2. Modals & Helpers ─────────────────────────────────────────────────────
const custModal = $("#customerModal");
const supModal = $("#supplierModal");

function openCustomerModal(c = {}) {
  $("#customerId").value = c.id || "";
  $("#custName").value = c.name || "";
  $("#custPhone").value = c.phone || "";
  $("#custEmail").value = c.email || "";
  $("#custSpent").value = c.totalSpent || c.totalAmountSpent || 0;
  $("#custLast").value = c.lastPurchaseDate || "";
  $("#customerTitle").textContent = c.id ? "Edit Customer" : "Add Customer";
  custModal?.classList.add("show");
}

function openSupplierModal(s = {}) {
  $("#supplierId").value = s.id || "";
  $("#supName").value = s.name || "";
  $("#supContact").value = s.contactNumber || "";
  $("#supEmail").value = s.email || "";
  $("#supAddress").value = s.address || "";
  $("#supProducts").value = s.productsSupplied || "";
  $("#supLast").value = s.lastOrderDate || "";
  $("#supPayment").value = s.paymentStatus || "Pending";
  $("#supplierTitle").textContent = s.id ? "Edit Supplier" : "Add Supplier";
  supModal?.classList.add("show");
}

window.editCustomer = (id) => openCustomerModal(customers.find((x) => x.id === id));
window.deleteCustomer = async (id) => {
  if (!confirm("Are you sure you want to delete this customer?")) return;
  try {
    await deleteDoc(doc(db, "customers", id));
    customers = customers.filter((x) => x.id !== id);
    invalidateCache("customers");
    toast("Customer deleted", "ok");
    render();
  } catch (err) {
    console.error("Delete customer error:", err);
    toast("Failed to delete customer: " + err.message, "err");
  }
};

window.editSupplier = (id) => openSupplierModal(suppliers.find((x) => x.id === id));
window.deleteSupplier = async (id) => {
  if (!confirm("Are you sure you want to delete this supplier?")) return;
  try {
    await deleteDoc(doc(db, "suppliers", id));
    suppliers = suppliers.filter((x) => x.id !== id);
    invalidateCache("suppliers");
    toast("Supplier deleted", "ok");
    render();
  } catch (err) {
    console.error("Delete supplier error:", err);
    toast("Failed to delete supplier: " + err.message, "err");
  }
};

$$("[data-close-modal]").forEach((b) => {
  b.onclick = () => {
    custModal?.classList.remove("show");
    supModal?.classList.remove("show");
  };
});

// Primary button dynamically adds customer or supplier depending on active tab
$("#openModalBtn")?.addEventListener("click", () => {
  if (activeTab === "customers") {
    openCustomerModal();
  } else {
    openSupplierModal();
  }
});

// ── 3. KPI Summaries ────────────────────────────────────────────────────────
function updateKPIs() {
  const totalCust = customers.length;
  const vipCust = customers.filter(
    (c) => Number(c.totalSpent || c.totalAmountSpent || 0) >= 10000,
  ).length;

  const totalSup = suppliers.length;
  const pendingSup = suppliers.filter(
    (s) => s.paymentStatus === "Pending" || s.paymentStatus === "Partial",
  ).length;

  $("#kpiTotalCustomers") && ($("#kpiTotalCustomers").textContent = totalCust);
  $("#kpiVipCustomers") && ($("#kpiVipCustomers").textContent = vipCust);
  $("#kpiTotalSuppliers") && ($("#kpiTotalSuppliers").textContent = totalSup);
  $("#kpiPendingSuppliers") && ($("#kpiPendingSuppliers").textContent = pendingSup);

  $("#tabCountCustomers") && ($("#tabCountCustomers").textContent = totalCust);
  $("#tabCountSuppliers") && ($("#tabCountSuppliers").textContent = totalSup);
}

// ── 4. Render Table Based on Active Tab ─────────────────────────────────────
function render() {
  updateKPIs();
  const container = $("#contactsTableContainer");
  if (!container) return;

  const q = searchQuery.toLowerCase().trim();

  // Update button label & search placeholder according to active tab
  const addBtnLabel = $("#openModalLabel");
  const searchInput = $("#contactSearch");
  if (activeTab === "customers") {
    if (addBtnLabel) addBtnLabel.textContent = "Add Customer";
    if (searchInput) searchInput.placeholder = "Search customers by name, email, or phone...";
  } else {
    if (addBtnLabel) addBtnLabel.textContent = "Add Supplier";
    if (searchInput) searchInput.placeholder = "Search suppliers by name, products, or contact...";
  }

  // 1. Render Customers Tab
  if (activeTab === "customers") {
    const filtered = customers.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q),
    );

    if (!filtered.length) {
      container.innerHTML = emptyState(
        q ? "No matching customers" : "No customers yet",
        q
          ? `No customers found matching "${searchQuery}".`
          : "Add buyers or record sales to build your customer directory.",
      );
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Total Spent</th>
              <th>Last Purchase</th>
              <th>Status</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map((c) => {
                const spent = Number(c.totalSpent || c.totalAmountSpent || 0);
                const isVip = spent >= 10000;
                return `
                  <tr>
                    <td class="font-bold text-slate-100">
                      <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-full bg-sky-500/15 text-sky-400 grid place-items-center text-xs font-black">
                          ${(c.name || "C").charAt(0).toUpperCase()}
                        </span>
                        <span>${c.name || "-"}</span>
                      </div>
                    </td>
                    <td>${c.phone || '<span class="text-slate-500">-</span>'}</td>
                    <td>${c.email || '<span class="text-slate-500">-</span>'}</td>
                    <td class="font-mono font-bold text-emerald-400">${money(spent)}</td>
                    <td>${c.lastPurchaseDate || '<span class="text-slate-500">Never</span>'}</td>
                    <td>
                      ${
                        isVip
                          ? '<span class="badge badge-purple text-xs font-bold">⭐ VIP Buyer</span>'
                          : '<span class="badge badge-info text-xs font-semibold">Regular</span>'
                      }
                    </td>
                    <td class="text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button class="btn btn-ghost btn-sm text-sky-400 hover:text-sky-300" onclick="editCustomer('${c.id}')">Edit</button>
                        <button class="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/15" onclick="deleteCustomer('${c.id}')">Delete</button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  // 2. Render Suppliers Tab
  const filteredSuppliers = suppliers.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.contactNumber || "").includes(q) ||
      (s.productsSupplied || "").toLowerCase().includes(q),
  );

  if (!filteredSuppliers.length) {
    container.innerHTML = emptyState(
      q ? "No matching suppliers" : "No suppliers yet",
      q
        ? `No suppliers found matching "${searchQuery}".`
        : "Register product vendors to track inventory purchases and payment terms.",
    );
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Supplier Name</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Products Supplied</th>
            <th>Last Order</th>
            <th>Payment Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          ${filteredSuppliers
            .map((s) => {
              const isPaid = s.paymentStatus === "Paid";
              const isPartial = s.paymentStatus === "Partial";
              const statusBadge = isPaid
                ? '<span class="badge badge-ok font-bold">✓ Paid</span>'
                : isPartial
                  ? '<span class="badge badge-warn font-bold">⚡ Partial</span>'
                  : '<span class="badge badge-danger font-bold">⚠️ Pending</span>';

              return `
                <tr>
                  <td class="font-bold text-slate-100">
                    <div class="flex items-center gap-2">
                      <span class="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 grid place-items-center text-xs font-black">
                        ${(s.name || "S").charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div>${s.name || "-"}</div>
                        ${s.address ? `<div class="text-[11px] text-slate-400 truncate max-w-xs">${s.address}</div>` : ""}
                      </div>
                    </div>
                  </td>
                  <td>${s.contactNumber || '<span class="text-slate-500">-</span>'}</td>
                  <td>${s.email || '<span class="text-slate-500">-</span>'}</td>
                  <td>${s.productsSupplied || '<span class="text-slate-500">General</span>'}</td>
                  <td>${s.lastOrderDate || '<span class="text-slate-500">None</span>'}</td>
                  <td>${statusBadge}</td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button class="btn btn-ghost btn-sm text-sky-400 hover:text-sky-300" onclick="editSupplier('${s.id}')">Edit</button>
                      <button class="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/15" onclick="deleteSupplier('${s.id}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ── 5. Tab Listeners ────────────────────────────────────────────────────────
$$("#directoryTabs button").forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => {
    $$("#directoryTabs button").forEach((b) => {
      b.classList.remove("btn-primary", "active");
      b.classList.add("btn-ghost");
    });
    tabBtn.classList.remove("btn-ghost");
    tabBtn.classList.add("btn-primary", "active");

    activeTab = tabBtn.dataset.tab || "customers";
    searchQuery = "";
    if ($("#contactSearch")) $("#contactSearch").value = "";

    const url = new URL(window.location);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url);

    render();
  });
});

// Set active tab on load if query param set
if (activeTab === "suppliers") {
  const supTabBtn = $('[data-tab="suppliers"]');
  const custTabBtn = $('[data-tab="customers"]');
  if (supTabBtn && custTabBtn) {
    custTabBtn.classList.remove("btn-primary", "active");
    custTabBtn.classList.add("btn-ghost");
    supTabBtn.classList.remove("btn-ghost");
    supTabBtn.classList.add("btn-primary", "active");
  }
}

// ── 6. Search Input Listener ────────────────────────────────────────────────
$("#contactSearch")?.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  render();
});

// ── 7. Form Handlers ────────────────────────────────────────────────────────
$("#customerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: $("#custName").value.trim(),
    phone: $("#custPhone").value.trim(),
    email: $("#custEmail").value.trim(),
    totalSpent: Number($("#custSpent").value || 0),
    lastPurchaseDate: $("#custLast").value,
    adminId: profile.id,
    updatedAt: serverTimestamp(),
  };

  const id = $("#customerId").value;
  try {
    if (id) {
      await updateDoc(doc(db, "customers", id), data);
      const idx = customers.findIndex((c) => c.id === id);
      if (idx !== -1) customers[idx] = { ...customers[idx], ...data };
    } else {
      const docRef = await addDoc(collection(db, "customers"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      customers.unshift({ id: docRef.id, ...data });
    }

    invalidateCache("customers");
    toast(id ? "Customer updated" : "Customer registered", "ok");
    custModal?.classList.remove("show");
    render();
  } catch (err) {
    console.error("Save customer failed:", err);
    toast("Error saving customer: " + err.message, "err");
  }
});

$("#supplierForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: $("#supName").value.trim(),
    contactNumber: $("#supContact").value.trim(),
    email: $("#supEmail").value.trim(),
    address: $("#supAddress").value.trim(),
    productsSupplied: $("#supProducts").value.trim(),
    lastOrderDate: $("#supLast").value,
    paymentStatus: $("#supPayment").value,
    adminId: profile.id,
    updatedAt: serverTimestamp(),
  };

  const id = $("#supplierId").value;
  try {
    if (id) {
      await updateDoc(doc(db, "suppliers", id), data);
      const idx = suppliers.findIndex((s) => s.id === id);
      if (idx !== -1) suppliers[idx] = { ...suppliers[idx], ...data };
    } else {
      const docRef = await addDoc(collection(db, "suppliers"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      suppliers.unshift({ id: docRef.id, ...data });
    }

    invalidateCache("suppliers");
    toast(id ? "Supplier updated" : "Supplier registered", "ok");
    supModal?.classList.remove("show");
    render();
  } catch (err) {
    console.error("Save supplier failed:", err);
    toast("Error saving supplier: " + err.message, "err");
  }
});

// ── 8. Live Database Fetch ──────────────────────────────────────────────────
async function load() {
  try {
    const [freshCust, freshSup] = await Promise.all([
      fetchAll("customers", false, profile.id),
      fetchAll("suppliers", false, profile.id),
    ]);
    customers = freshCust || [];
    suppliers = freshSup || [];
    render();
  } catch (err) {
    console.error("Load directory data failed:", err);
    toast("Could not sync directory data", "err");
  } finally {
    hideSkeletonLoader();
  }
}

load();

