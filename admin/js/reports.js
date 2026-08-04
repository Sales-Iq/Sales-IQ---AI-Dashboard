import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  money,
  dateText,
  toCSV,
  downloadJSON,
  emptyState,
  getBatchStatus,
  formatDate,
} from "../../js/shared.js";
const { profile } = await requireAuth(["Admin", "Manager"]);
initAppShell("admin", "reports", profile);
let products = [],
  sales = [],
  purchases = [],
  batches = [],
  disposals = [],
  admins = [],
  staff = [],
  accounts = [];
const cards = [
  ["Daily Sales", "sales"],
  ["Monthly Sales", "monthly"],
  ["Inventory", "inventory"],
  ["Low Stock", "low"],
  ["Profit", "profit"],
  ["Salesperson Performance", "performance"],
  ["Batches", "batches"],
  ["Near Expiry", "nearExpiry"],
  ["Expired Batches", "expired"],
  ["Disposals", "disposals"],
];
async function load() {
  [products, sales, purchases, batches, disposals, admins, staff] = await Promise.all([
    fetchAll("products"),
    fetchAll("sales"),
    fetchAll("purchases"),
    fetchAll("productBatches"),
    fetchAll("disposals"),
    fetchAll("admins"),
    fetchAll("staff"),
  ]);
  accounts = [
    ...admins.map((a) => ({ ...a, accountCollection: "admins" })),
    ...staff.map((s) => ({ ...s, accountCollection: "staff" })),
  ];
  $("#reportCards").innerHTML = cards
    .map(
      (c) =>
        `<div class="glass p-5 glass-card-hover"><h3 class="font-black text-xl">${c[0]}</h3><p class="text-slate-400 my-3">Download ${c[0].toLowerCase()} report.</p><div class="flex gap-2 flex-wrap"><button class="btn btn-primary btn-sm" onclick="downloadReport('${c[1]}','pdf')">PDF</button><button class="btn btn-success btn-sm" onclick="downloadReport('${c[1]}','csv')">CSV</button><button class="btn btn-ghost btn-sm" onclick="downloadReport('${c[1]}','excel')">Excel</button></div></div>`,
    )
    .join("");
  $("#reportPreview").innerHTML = sales.length
    ? `<p>Total sales records: <b>${sales.length}</b></p><p>Total inventory items: <b>${products.length}</b></p><p>Total batches: <b>${batches.length}</b></p><p>Admin accounts: <b>${admins.length}</b> | Staff accounts: <b>${staff.length}</b></p>`
    : emptyState(
        "No report data",
        "Add sales/products to download detailed reports.",
      );
}
function rowsFor(type) {
  const today = new Date().toISOString().slice(0, 10),
    month = today.slice(0, 7);
  if (type === "inventory")
    return products.map((p) => ({
      name: p.name,
      category: p.category,
      price: p.price,
      costPrice: p.costPrice,
      stock: p.stock,
      minStock: p.minStock,
      status: p.status,
    }));
  if (type === "low")
    return products
      .filter((p) => Number(p.stock || 0) <= Number(p.minStock || 0))
      .map((p) => ({
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        status: p.status,
      }));
  if (type === "profit")
    return sales.map((s) => ({
      invoice: s.invoiceNumber,
      product: s.productName,
      revenue: s.totalAmount,
      profit: s.profit,
      date: dateText(s.createdAt),
    }));
  if (type === "performance") {
    const m = {};
    sales.forEach((s) => {
      const k = s.salespersonName || "Unknown";
      m[k] = m[k] || { salesperson: k, orders: 0, revenue: 0 };
      m[k].orders++;
      m[k].revenue += Number(s.totalAmount || 0);
    });
    return Object.values(m);
  }
  if (type === "batches")
    return batches.map((b) => {
      const p = products.find((x) => x.id === b.productId);
      return {
        product: p?.name || "Unknown",
        batchNumber: b.batchNumber,
        manufactureDate: formatDate(b.manufactureDate),
        expiryDate: formatDate(b.expiryDate),
        purchased: b.purchasedQuantity,
        remaining: b.remainingQuantity,
        supplier: b.supplierName,
        purchasePrice: b.purchasePrice,
        status: getBatchStatus(b),
      };
    });
  if (type === "nearExpiry") {
    const nearBatches = batches.filter(b => {
      const s = getBatchStatus(b);
      return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
    });
    return nearBatches.map((b) => {
      const p = products.find((x) => x.id === b.productId);
      return {
        product: p?.name || "Unknown",
        batchNumber: b.batchNumber,
        manufactureDate: formatDate(b.manufactureDate),
        expiryDate: formatDate(b.expiryDate),
        remaining: b.remainingQuantity,
        status: getBatchStatus(b),
        supplier: b.supplierName,
      };
    });
  }
  if (type === "expired") {
    const expiredBatches = batches.filter(b => getBatchStatus(b) === "Expired");
    return expiredBatches.map((b) => {
      const p = products.find((x) => x.id === b.productId);
      return {
        product: p?.name || "Unknown",
        batchNumber: b.batchNumber,
        manufactureDate: formatDate(b.manufactureDate),
        expiryDate: formatDate(b.expiryDate),
        remaining: b.remainingQuantity,
        supplier: b.supplierName,
      };
    });
  }
  if (type === "disposals")
    return disposals.map((d) => ({
      product: d.productName,
      batchNumber: d.batchNumber,
      quantity: d.quantity,
      reason: d.reason,
      notes: d.notes,
      disposedAt: dateText(d.disposedAt),
      disposedBy: d.disposedBy,
    }));
  let list = sales;
  if (type === "sales")
    list = sales.filter(
      (s) =>
        s.createdAt?.toDate &&
        s.createdAt.toDate().toISOString().slice(0, 10) === today,
    );
  if (type === "monthly")
    list = sales.filter(
      (s) =>
        s.createdAt?.toDate &&
        s.createdAt.toDate().toISOString().slice(0, 7) === month,
    );
  return list.map((s) => ({
    invoice: s.invoiceNumber,
    product: s.productName,
    quantity: s.quantity,
    total: s.totalAmount,
    payment: s.paymentMethod,
    salesperson: s.salespersonName,
    date: dateText(s.createdAt),
  }));
}
window.downloadReport = (type, fmt) => {
  const rows = rowsFor(type);
  if (!rows.length) return alert("No data for this report.");
  if (fmt === "csv") return toCSV(rows, `${type}-report.csv`);
  if (fmt === "excel" && window.XLSX) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Report");
    XLSX.writeFile(wb, `${type}-report.xlsx`);
    return;
  }
  if (window.jspdf) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text(`SalesIQ ${type} Report`, 14, 16);
    let y = 28;
    rows.slice(0, 35).forEach((r, i) => {
      pdf.setFontSize(9);
      pdf.text(
        `${i + 1}. ` +
          Object.entries(r)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ")
            .slice(0, 110),
        14,
        y,
      );
      y += 7;
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
    });
    pdf.save(`${type}-report.pdf`);
  }
};
$("#exportAllJson").onclick = () =>
  downloadJSON(
    { products, sales, purchases, batches, disposals, admins, staff, accounts },
    "salesiq-backup.json",
  );
load();