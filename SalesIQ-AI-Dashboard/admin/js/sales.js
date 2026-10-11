import {
  requireAuth,
  initAppShell,
  fetchAll,
  watchCollection,
  getCachedCollection,
  hideSkeletonLoader,
  tableSkeleton,
  $,
  money,
  dateText,
  toDate,
  emptyState,
  toCSV,
  toast,
} from "../../js/shared.js";
import { db, doc, deleteDoc } from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "sales", profile);

let sales = [];
let staffUsers = [];

function getActiveProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem("salesiq_user") || "null");
    return {
      ...(profile || {}),
      ...(stored || {}),
      name: stored?.name || profile?.name || "",
      email: stored?.email || profile?.email || "",
      id: stored?.id || profile?.id || "",
      role: stored?.role || profile?.role || "Admin",
    };
  } catch (_) {
    return profile || {};
  }
}

function isDummySale(sale) {
  if (!sale) return false;
  if (
    sale.source === "dummy" ||
    sale.source === "demo" ||
    Boolean(sale.isDemo)
  ) return true;
  if (sale.salespersonId === "demo" || sale.salespersonId === "system-demo") return true;
  if (
    typeof sale.invoiceNumber === "string" &&
    (sale.invoiceNumber.startsWith("DM-") || sale.invoiceNumber.startsWith("DUMMY-"))
  ) return true;
  return false;
}

function isStaffSale(sale) {
  if (!sale || isDummySale(sale)) return false;
  if (sale.source === "staff") return true;
  if (sale.salespersonRole === "Sales Staff" || sale.role === "Sales Staff") return true;
  if (sale.salespersonId && staffUsers.some((u) => u.id === sale.salespersonId)) return true;
  if (sale.salespersonId && sale.salespersonId !== profile.id && sale.source !== "admin") return true;
  return false;
}

function isAdminSale(sale) {
  if (!sale || isDummySale(sale)) return false;
  if (sale.source === "admin") return true;
  if (sale.salespersonId === profile.id || (!sale.source && !isStaffSale(sale))) return true;
  return false;
}

function sourceBadge(source, sale) {
  if ((sale && isDummySale(sale)) || source === "dummy" || source === "demo") {
    return '<span class="badge badge-warn font-semibold">Dummy</span>';
  }
  if ((sale && isStaffSale(sale)) || source === "staff") {
    return '<span class="badge badge-ok font-semibold">Staff</span>';
  }
  return '<span class="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">Admin</span>';
}

function sourceLabel(source, sale) {
  if ((sale && isDummySale(sale)) || source === "dummy" || source === "demo") return "Dummy";
  if ((sale && isStaffSale(sale)) || source === "staff") return "Staff";
  return "Admin";
}

function saleDay(s) {
  const d = toDate(s.createdAt);
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSalespersonDisplay(s) {
  if (!s) return "-";

  const active = getActiveProfile();
  const adminName = active.name || active.email || "Admin";

  // 1. Demo / Dummy sale
  if (isDummySale(s)) {
    if (
      s.salespersonName &&
      !["System Demo", "Dummy Generator", "demo", "Admin"].includes(s.salespersonName)
    ) {
      return s.salespersonName;
    }
    if (adminName && adminName !== "Admin") return adminName;
    if (s.salespersonName) return s.salespersonName;
    if (s.salespersonEmail) return s.salespersonEmail;
    return adminName;
  }

  // 2. Admin sale
  if (isAdminSale(s) || s.source === "admin") {
    if (
      s.salespersonName &&
      !["System Demo", "Dummy Generator", "demo", "Admin"].includes(s.salespersonName)
    ) {
      return s.salespersonName;
    }
    if (adminName && adminName !== "Admin") return adminName;
    if (s.salespersonName) return s.salespersonName;
    if (s.salespersonEmail) return s.salespersonEmail;
    return adminName;
  }

  // 3. Staff sale
  if (isStaffSale(s) || s.source === "staff") {
    if (
      s.salespersonName &&
      !["System Demo", "Dummy Generator", "demo", "Sales Staff", "Admin"].includes(s.salespersonName)
    ) {
      return s.salespersonName;
    }
    if (s.salespersonId && Array.isArray(staffUsers)) {
      const matched = staffUsers.find((u) => u.id === s.salespersonId);
      if (matched?.name) return matched.name;
      if (matched?.email) return matched.email;
    }
    if (s.salespersonEmail) return s.salespersonEmail;
    if (s.salespersonName) return s.salespersonName;
    return "Sales Staff";
  }

  // Fallback
  if (s.salespersonName) return s.salespersonName;
  if (s.salespersonEmail) return s.salespersonEmail;
  return adminName;
}

function filtered() {
  const d = $("#dateFilter")?.value || "",
    sp = ($("#salespersonFilter")?.value || "").toLowerCase().trim(),
    pm = $("#paymentFilter")?.value || "";

  return sales.filter((s) => {
    const day = saleDay(s);
    const spDisplay = getSalespersonDisplay(s).toLowerCase();
    const spName = (s.salespersonName || "").toLowerCase();
    const spEmail = (s.salespersonEmail || "").toLowerCase();
    const spId = (s.salespersonId || "").toLowerCase();
    const src = sourceLabel(s.source, s).toLowerCase();
    const pMethod = s.paymentMethod || "";
    const pName = (s.productName || "").toLowerCase();
    const inv = (s.invoiceNumber || s.invoice || "").toLowerCase();

    return (
      (!d || day === d) &&
      (!sp ||
        spDisplay.includes(sp) ||
        spName.includes(sp) ||
        spEmail.includes(sp) ||
        spId.includes(sp) ||
        src.includes(sp) ||
        pName.includes(sp) ||
        inv.includes(sp)) &&
      (!pm || pMethod === pm)
    );
  });
}

function render() {
  const rows = filtered();
  const salesTable = $("#salesTable");
  if (!salesTable) return;

  salesTable.innerHTML = rows.length
    ? `<div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Date & Time</th>
              <th>Salesperson</th>
              <th>Source</th>
              <th>Payment</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((s) => {
                const spTitle = getSalespersonDisplay(s);
                let spEmail = s.salespersonEmail || "";
                if (!spEmail && s.salespersonId && Array.isArray(staffUsers)) {
                  const matched = staffUsers.find((u) => u.id === s.salespersonId);
                  if (matched?.email) spEmail = matched.email;
                }
                if (!spEmail && (isAdminSale(s) || isDummySale(s))) {
                  const active = getActiveProfile();
                  spEmail = active.email || "";
                }
                const hasSeparateEmail =
                  spEmail && spEmail !== spTitle;
                const salespersonCell = `
                  <div>
                    <div class="font-medium text-slate-100">${spTitle}</div>
                    ${
                      hasSeparateEmail
                        ? `<div class="text-xs text-slate-400">${spEmail}</div>`
                        : ""
                    }
                  </div>
                `;

                return `
                  <tr>
                    <td class="font-black">${s.invoiceNumber || s.invoice || "-"}</td>
                    <td>${s.productName || "-"}</td>
                    <td>${s.quantity || 0}</td>
                    <td class="font-mono font-bold text-emerald-400">${money(s.totalAmount)}</td>
                    <td>${dateText(s.createdAt)}</td>
                    <td>${salespersonCell}</td>
                    <td>${sourceBadge(s.source, s)}</td>
                    <td><span class="badge bg-slate-800 text-slate-300 border border-slate-700/60">${s.paymentMethod || "Cash"}</span></td>
                    <td class="text-right">
                      <button
                        class="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 px-2 py-1 rounded-lg"
                        onclick="window.deleteSale('${s.id}')"
                        title="Delete sale"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>`
    : emptyState(
        "No sales records",
        "Staff sales and dummy live data will automatically appear here in real time.",
      );

  hideSkeletonLoader();
}

window.deleteSale = async (id) => {
  if (!id) return;
  const s = sales.find((x) => x.id === id);
  const info = s
    ? `${s.productName || "Sale"} (${s.invoiceNumber || s.invoice || id})`
    : "this sale";
  if (!confirm(`Are you sure you want to delete ${info}?`)) return;
  try {
    await deleteDoc(doc(db, "sales", id));
    toast("Sale record deleted successfully.", "ok");
    sales = sales.filter((x) => x.id !== id);
    render();
  } catch (err) {
    console.error("Error deleting sale:", err);
    toast(`Failed to delete sale: ${err.message}`, "err");
  }
};

["dateFilter", "salespersonFilter", "paymentFilter"].forEach((id) =>
  $("#" + id)?.addEventListener("input", render),
);

const clearBtn = $("#clearSalesFilters");
if (clearBtn) {
  clearBtn.onclick = () => {
    const d = $("#dateFilter"),
      sp = $("#salespersonFilter"),
      pm = $("#paymentFilter");
    if (d) d.value = "";
    if (sp) sp.value = "";
    if (pm) pm.value = "";
    render();
  };
}

const expBtn = $("#exportSalesCsv");
if (expBtn) {
  expBtn.onclick = () => {
    toCSV(
      filtered().map((s) => {
        const spTitle = getSalespersonDisplay(s);
        let spEmail = s.salespersonEmail || "";
        if (!spEmail && s.salespersonId && Array.isArray(staffUsers)) {
          const matched = staffUsers.find((u) => u.id === s.salespersonId);
          if (matched?.email) spEmail = matched.email;
        }
        if (!spEmail && (isAdminSale(s) || isDummySale(s))) {
          const active = getActiveProfile();
          spEmail = active.email || "";
        }
        return {
          invoice: s.invoiceNumber || s.invoice || "",
          product: s.productName || "",
          quantity: s.quantity || 0,
          total: s.totalAmount || 0,
          date: dateText(s.createdAt),
          salesperson: spTitle,
          salespersonEmail: spEmail,
          source: sourceLabel(s.source, s),
          payment: s.paymentMethod || "Cash",
        };
      }),
      "sales-report.csv",
    );
  };
}

async function load() {
  const adminId = profile.id;

  try {
    const stRows = await fetchAll("staff", false).catch(() => []);
    staffUsers = (stRows || []).filter(
      (u) =>
        u.adminId === profile.id ||
        u.createdBy === profile.id ||
        u.pendingRequest?.adminId === profile.id,
    );
  } catch (_) {}

  // 1. Instant 0ms render from client-side cache
  const cachedTrue = getCachedCollection(`salesiq_cache_sales_${adminId}_true`);
  const cachedFalse = getCachedCollection(
    `salesiq_cache_sales_${adminId}_false`,
  );
  const cached = cachedTrue?.data?.length ? cachedTrue : cachedFalse;

  if (cached?.data && cached.data.length > 0) {
    sales = [...cached.data];
    sales.sort((a, b) => {
      const ta = toDate(a.createdAt)?.getTime() || 0;
      const tb = toDate(b.createdAt)?.getTime() || 0;
      return tb - ta;
    });
    render();
    hideSkeletonLoader();
  } else {
    const salesTable = $("#salesTable");
    if (salesTable) salesTable.innerHTML = tableSkeleton(9, 6);
  }

  // 2. Real-time watchCollection for instant live sync
  watchCollection(
    "sales",
    (rows) => {
      sales = rows || [];
      render();
      hideSkeletonLoader();
    },
    true,
    adminId,
  );
}

// 3. Fallback event listener for background cache updates
window.addEventListener("salesiq:cache-updated", (e) => {
  if (e.detail?.name === "staff" && Array.isArray(e.detail.data)) {
    staffUsers = e.detail.data.filter(
      (u) =>
        u.adminId === profile.id ||
        u.createdBy === profile.id ||
        u.pendingRequest?.adminId === profile.id,
    );
    render();
  }
  if (e.detail?.name === "sales" && Array.isArray(e.detail.data)) {
    sales = e.detail.data;
    sales.sort((a, b) => {
      const ta = toDate(a.createdAt)?.getTime() || 0;
      const tb = toDate(b.createdAt)?.getTime() || 0;
      return tb - ta;
    });
    render();
    hideSkeletonLoader();
  }
});

load();
