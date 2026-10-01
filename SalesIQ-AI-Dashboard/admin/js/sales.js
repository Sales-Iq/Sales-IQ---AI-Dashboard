import {
  requireAuth,
  initAppShell,
  fetchAll,
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
function sourceLabel(source) {
  return source === "dummy" ? "Dummy" : source === "admin" ? "Admin" : "Staff";
}
function saleDay(s) {
  const d = toDate(s.createdAt);
  return d ? d.toISOString().slice(0, 10) : "";
}
function filtered() {
  const d = $("#dateFilter")?.value || "",
    sp = ($("#salespersonFilter")?.value || "").toLowerCase().trim(),
    pm = $("#paymentFilter")?.value || "";
  return sales.filter(
    (s) =>
      (!d || saleDay(s) === d) &&
      (!sp ||
        (s.salespersonName || "").toLowerCase().includes(sp) ||
        (s.salespersonEmail || "").toLowerCase().includes(sp) ||
        (s.salespersonId || "").toLowerCase().includes(sp) ||
        (s.source || "").toLowerCase().includes(sp)) &&
      (!pm || s.paymentMethod === pm),
  );
}
function render() {
  const rows = filtered();
  $("#salesTable").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Product</th><th>Qty</th><th>Total</th><th>Date & Time</th><th>Salesperson</th><th>Source</th><th>Payment</th><th class="text-right">Action</th></tr></thead><tbody>${rows
        .map(
          (s) =>
            `<tr><td class="font-black">${s.invoiceNumber || "-"}</td><td>${s.productName || "-"}</td><td>${s.quantity || 0}</td><td>${money(s.totalAmount)}</td><td>${dateText(s.createdAt)}</td><td>${s.salespersonName || "-"}</td><td>${sourceLabel(s.source)}</td><td>${s.paymentMethod || "-"}</td><td class="text-right"><button class="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 px-2 py-1 rounded-lg" onclick="window.deleteSale('${s.id}')" title="Delete sale">🗑️ Delete</button></td></tr>`,
        )
        .join("")}</tbody></table></div>`
    : emptyState(
        "No sales records",
        "Start dummy live data or create sales from Billing.",
      );
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

async function load() {
  sales = await fetchAll("sales", false, profile.id);
  render();
}
["dateFilter", "salespersonFilter", "paymentFilter"].forEach((id) =>
  $("#" + id)?.addEventListener("input", render),
);
const clearBtn = $("#clearSalesFilters");
if (clearBtn)
  clearBtn.onclick = () => {
    const d = $("#dateFilter"),
      sp = $("#salespersonFilter"),
      pm = $("#paymentFilter");
    if (d) d.value = "";
    if (sp) sp.value = "";
    if (pm) pm.value = "";
    render();
  };
const expBtn = $("#exportSalesCsv");
if (expBtn)
  expBtn.onclick = () =>
    toCSV(
      filtered().map((s) => ({
        invoice: s.invoiceNumber,
        product: s.productName,
        quantity: s.quantity,
        total: s.totalAmount,
        date: dateText(s.createdAt),
        salesperson: s.salespersonName,
        source: sourceLabel(s.source),
        payment: s.paymentMethod,
      })),
      "sales-report.csv",
    );
load();
