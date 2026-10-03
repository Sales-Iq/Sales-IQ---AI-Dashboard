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

function sourceBadge(source) {
  const s = String(source || "")
    .toLowerCase()
    .trim();
  if (s === "dummy" || s === "demo") {
    return '<span class="badge badge-warn">Dummy</span>';
  }
  if (s === "admin") {
    return '<span class="badge bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>';
  }
  return '<span class="badge badge-ok font-semibold">Staff</span>';
}

function sourceLabel(source) {
  const s = String(source || "")
    .toLowerCase()
    .trim();
  if (s === "dummy" || s === "demo") return "Dummy";
  if (s === "admin") return "Admin";
  return "Staff";
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
  if (s.salespersonName) return s.salespersonName;
  if (s.salespersonEmail) return s.salespersonEmail;
  if (s.source === "admin") return "Admin";
  if (s.source === "dummy" || s.source === "demo") return "Demo Live";
  return "Sales Staff";
}

function filtered() {
  const d = $("#dateFilter")?.value || "",
    sp = ($("#salespersonFilter")?.value || "").toLowerCase().trim(),
    pm = $("#paymentFilter")?.value || "";

  return sales.filter((s) => {
    const day = saleDay(s);
    const spName = (s.salespersonName || "").toLowerCase();
    const spEmail = (s.salespersonEmail || "").toLowerCase();
    const spId = (s.salespersonId || "").toLowerCase();
    const src = (s.source || "").toLowerCase();
    const pMethod = s.paymentMethod || "";
    const pName = (s.productName || "").toLowerCase();
    const inv = (s.invoiceNumber || s.invoice || "").toLowerCase();

    return (
      (!d || day === d) &&
      (!sp ||
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
                const hasSeparateEmail =
                  s.salespersonEmail && s.salespersonEmail !== spTitle;
                const salespersonCell = `
                  <div>
                    <div class="font-medium text-slate-100">${spTitle}</div>
                    ${
                      hasSeparateEmail
                        ? `<div class="text-xs text-slate-400">${s.salespersonEmail}</div>`
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
                    <td>${sourceBadge(s.source)}</td>
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
      filtered().map((s) => ({
        invoice: s.invoiceNumber || s.invoice || "",
        product: s.productName || "",
        quantity: s.quantity || 0,
        total: s.totalAmount || 0,
        date: dateText(s.createdAt),
        salesperson: getSalespersonDisplay(s),
        salespersonEmail: s.salespersonEmail || "",
        source: sourceLabel(s.source),
        payment: s.paymentMethod || "Cash",
      })),
      "sales-report.csv",
    );
  };
}

async function load() {
  const adminId = profile.id;

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
