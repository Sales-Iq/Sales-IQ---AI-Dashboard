import {
  requireAuth,
  initAppShell,
  fetchAll,
  watchCollection,
  $,
  $$,
  money,
  emptyState,
  badgeForStatus,
  statusFor,
  toast,
} from "../../js/shared.js";

import {
  db,
  doc,
  collection,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
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

initAppShell("sales", "stock-view", profile);

let products = [];
let unwatchProducts = null;

function updateConnectionUI() {
  const alertEl = $("#staffNotConnectedAlert");
  const badgeEl = $("#adminConnectionBadge");
  const nameEl = $("#adminNameDisplay");

  if (profile.adminId) {
    if (alertEl) alertEl.classList.add("hidden");
    if (badgeEl) {
      badgeEl.classList.remove("hidden");
      badgeEl.classList.add("inline-flex");
    }
    if (nameEl) nameEl.textContent = profile.adminName || "Admin";
  } else {
    if (alertEl) alertEl.classList.remove("hidden");
    if (badgeEl) {
      badgeEl.classList.add("hidden");
      badgeEl.classList.remove("inline-flex");
    }
  }
}

function renderStats() {
  const statsContainer = $("#stockStats");
  if (!statsContainer) return;

  if (!profile.adminId) {
    statsContainer.innerHTML = [
      ["Total SKUs", 0, "No admin linked"],
      ["In Stock", 0, "Available"],
      ["Low Stock", 0, "Needs restock"],
      ["Out of Stock", 0, "Unavailable"],
    ]
      .map(
        ([label, value, hint]) => `
      <div class="glass stat-card">
        <div class="stat-label">${label}</div>
        <div class="stat-value text-slate-500">${value}</div>
        <div class="stat-hint text-slate-500">${hint}</div>
      </div>
    `,
      )
      .join("");
    return;
  }

  const total = products.length;
  const inStock = products.filter(
    (p) => statusFor(p.stock, p.minStock) === "Available",
  ).length;
  const lowStock = products.filter(
    (p) => statusFor(p.stock, p.minStock) === "Low Stock",
  ).length;
  const outOfStock = products.filter(
    (p) => statusFor(p.stock, p.minStock) === "Out of Stock",
  ).length;
  const totalUnits = products.reduce(
    (sum, p) => sum + Math.max(0, Number(p.stock || 0)),
    0,
  );

  statsContainer.innerHTML = [
    ["Total Products", total, `${totalUnits} total units in stock`],
    ["In Stock", inStock, "Ready to sell"],
    ["Low Stock", lowStock, "Running low"],
    ["Out of Stock", outOfStock, "Replenishment required"],
  ]
    .map(
      ([label, value, hint], idx) => `
    <div class="glass stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value ${
        idx === 1
          ? "text-emerald-400"
          : idx === 2
            ? "text-amber-400"
            : idx === 3
              ? "text-rose-400"
              : ""
      }">${value}</div>
      <div class="stat-hint">${hint}</div>
    </div>
  `,
    )
    .join("");
}

function populateCategories() {
  const categorySelect = $("#stockCategory");
  if (!categorySelect) return;

  const currentSelection = categorySelect.value;
  const categories = Array.from(
    new Set(products.map((p) => (p.category || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  categorySelect.innerHTML =
    '<option value="">All Categories</option>' +
    categories
      .map(
        (c) =>
          `<option value="${c}" ${c === currentSelection ? "selected" : ""}>${c}</option>`,
      )
      .join("");
}

function renderTable() {
  const table = $("#stockViewTable");
  const countBadge = $("#productCountBadge");
  if (!table) return;

  if (!profile.adminId) {
    if (countBadge) countBadge.textContent = "0 products";
    table.innerHTML = emptyState(
      "No Admin Connected",
      "You are not yet linked to an admin inventory. Ask your admin to connect your staff account from their Admin & Staff page.",
    );
    return;
  }

  const q = ($("#stockSearch")?.value || "").toLowerCase().trim();
  const c = ($("#stockCategory")?.value || "").trim();
  const s = ($("#stockStatus")?.value || "").trim();

  const rows = products.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    const category = (p.category || "").trim();
    const status = statusFor(p.stock, p.minStock);

    const matchesQuery =
      !q ||
      name.includes(q) ||
      sku.includes(q) ||
      category.toLowerCase().includes(q);
    const matchesCategory = !c || category.toLowerCase() === c.toLowerCase();
    const matchesStatus = !s || status === s;

    return matchesQuery && matchesCategory && matchesStatus;
  });

  if (countBadge) {
    countBadge.textContent = `Showing ${rows.length} of ${products.length} products`;
  }

  if (!products.length) {
    table.innerHTML = emptyState(
      "No Products in Inventory",
      "Your connected admin has not added any products yet.",
    );
    return;
  }

  if (!rows.length) {
    table.innerHTML = emptyState(
      "No Matching Products",
      "No products matched your search or filters. Try clearing filters.",
    );
    return;
  }

  table.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Selling Price</th>
            <th class="text-center">Available Stock</th>
            <th class="text-center">Min Level</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((p) => {
              const stock = Number(p.stock || 0);
              const minStock = Number(p.minStock || 0);
              const status = statusFor(stock, minStock);
              const isOut = stock <= 0;
              const isLow = status === "Low Stock";

              const stockColorClass = isOut
                ? "text-rose-400 font-black"
                : isLow
                  ? "text-amber-400 font-black"
                  : "text-emerald-400 font-bold";

              return `
              <tr class="${status !== "Available" ? "warning-row" : ""}">
                <td>
                  <div class="font-black text-white text-base">${p.name || "Unnamed Product"}</div>
                  ${p.sku ? `<div class="text-xs text-slate-400 font-mono">SKU: ${p.sku}</div>` : ""}
                </td>
                <td>
                  <span class="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60 font-semibold inline-block">
                    ${p.category || "General"}
                  </span>
                </td>
                <td class="font-bold text-white">${money(p.price || 0)}</td>
                <td class="text-center">
                  <span class="${stockColorClass} text-base">${stock}</span>
                </td>
                <td class="text-center text-slate-400">${minStock}</td>
                <td>${badgeForStatus(status)}</td>
                <td class="text-right">
                  ${
                    isOut
                      ? `<button class="btn btn-sm btn-ghost opacity-40 cursor-not-allowed text-xs py-1.5 px-3" disabled title="Product is out of stock">Out of Stock</button>`
                      : `<a href="add-sale.html?productId=${encodeURIComponent(p.id)}" class="btn btn-sm btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1 shadow-sm">💳 Sell</a>`
                  }
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

async function load() {
  updateConnectionUI();

  if (!profile.adminId) {
    products = [];
    populateCategories();
    renderStats();
    renderTable();
    return;
  }

  try {
    // Unsorted fetchAll ensures no products are dropped if createdAt timestamp is missing
    products = await fetchAll("products", false, profile.adminId);
  } catch (err) {
    console.error("Failed to fetch products:", err);
    toast(err?.message || "Could not load products.", "err");
    products = [];
  }

  populateCategories();
  renderStats();
  renderTable();
}

function startRealtimeWatcher() {
  if (unwatchProducts) {
    unwatchProducts();
    unwatchProducts = null;
  }

  if (!profile.adminId) return;

  unwatchProducts = watchCollection(
    "products",
    (updatedProducts) => {
      products = updatedProducts;
      populateCategories();
      renderStats();
      renderTable();
    },
    false,
    profile.adminId,
  );
}

// Watch for staff profile updates in real time (e.g. if admin connects staff while page is open)
if (profile.id) {
  onSnapshot(
    doc(db, "staff", profile.id),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const prevAdminId = profile.adminId;
        if (data.adminId && data.adminId !== prevAdminId) {
          profile.adminId = data.adminId;
          profile.adminName = data.adminName || profile.adminName;
          try {
            localStorage.setItem("salesiq_user", JSON.stringify(profile));
          } catch (_) {}
          load();
          startRealtimeWatcher();
        }
      }
    },
    (err) => console.warn("Staff profile watcher notice:", err),
  );
}

// Filter listeners
["stockSearch", "stockCategory", "stockStatus"].forEach((id) => {
  const el = $("#" + id);
  if (el) {
    el.addEventListener("input", renderTable);
    el.addEventListener("change", renderTable);
  }
});

// Clear Filters button
const clearBtn = $("#clearFilters");
if (clearBtn) {
  clearBtn.onclick = () => {
    if ($("#stockSearch")) $("#stockSearch").value = "";
    if ($("#stockCategory")) $("#stockCategory").value = "";
    if ($("#stockStatus")) $("#stockStatus").value = "";
    renderTable();
  };
}

// Refresh button
const refreshBtn = $("#refreshStock");
if (refreshBtn) {
  refreshBtn.onclick = async () => {
    toast("Refreshing stock data...", "info");
    await load();
  };
}

// Initial load & real-time watcher
await load();
startRealtimeWatcher();
