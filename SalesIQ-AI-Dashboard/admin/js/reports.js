import {
  requireAuth,
  initAppShell,
  fetchAll,
  getCachedCollection,
  hideSkeletonLoader,
  $,
  money,
  dateText,
  toDate,
  toCSV,
  downloadJSON,
  emptyState,
} from "../../js/shared.js";
const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "reports", profile);
let products = [],
  sales = [],
  purchases = [],
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
];

// 1. Instant 0ms Synchronous Render for Report Cards
const cardsContainer = $("#reportCards");
if (cardsContainer) {
  cardsContainer.innerHTML = cards
    .map(
      (c) =>
        `<div class="glass p-5 glass-card-hover"><h3 class="font-black text-xl">${c[0]}</h3><p class="text-slate-400 my-3">Download ${c[0].toLowerCase()} report.</p><div class="flex gap-2 flex-wrap"><button class="btn btn-primary btn-sm" onclick="downloadReport('${c[1]}','pdf')">PDF</button><button class="btn btn-success btn-sm" onclick="downloadReport('${c[1]}','csv')">CSV</button><button class="btn btn-ghost btn-sm" onclick="downloadReport('${c[1]}','excel')">Excel</button></div></div>`,
    )
    .join("");
}

// 2. Instant 0ms Cached Preview
function renderPreview() {
  const preview = $("#reportPreview");
  if (!preview) return;
  preview.innerHTML = sales.length || products.length
    ? `<p>Total sales records: <b>${sales.length}</b></p><p>Total inventory items: <b>${products.length}</b></p><p>Admin accounts: <b>${admins.length}</b> | Staff accounts: <b>${staff.length}</b></p>`
    : emptyState(
        "No report data",
        "Add sales/products to download detailed reports.",
      );
}

const cSales = getCachedCollection(`salesiq_cache_sales_${profile.id}_true`);
const cProds = getCachedCollection(`salesiq_cache_products_${profile.id}_false`);
if (cSales?.data || cProds?.data) {
  sales = cSales?.data || [];
  products = cProds?.data || [];
  renderPreview();
  hideSkeletonLoader();
}

async function load() {
  try {
    [products, sales, purchases, admins, staff] = await Promise.all([
      fetchAll("products", false, profile.id),
      fetchAll("sales", true, profile.id),
      fetchAll("purchases", false, profile.id),
      fetchAll("admins", false),
      fetchAll("staff", false),
    ]);
    accounts = [
      ...admins.map((a) => ({ ...a, accountCollection: "admins" })),
      ...staff.map((s) => ({ ...s, accountCollection: "staff" })),
    ];
    renderPreview();
  } finally {
    hideSkeletonLoader();
  }
}
function saleDay(s) {
  const d = toDate(s.createdAt);
  return d ? d.toISOString().slice(0, 10) : "";
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

  function getReportSalesperson(s) {
    if (!s) return "Unknown";
    if (
      s.salespersonName &&
      !["System Demo", "Dummy Generator", "demo", "Unknown"].includes(s.salespersonName)
    ) {
      return s.salespersonName;
    }
    if (s.salespersonId && Array.isArray(accounts)) {
      const acc = accounts.find((a) => a.id === s.salespersonId);
      if (acc?.name) return acc.name;
      if (acc?.email) return acc.email;
    }
    return profile?.name || profile?.email || "Admin";
  }

  if (type === "performance") {
    const m = {};
    sales.forEach((s) => {
      const k = getReportSalesperson(s);
      m[k] = m[k] || { salesperson: k, orders: 0, revenue: 0 };
      m[k].orders++;
      m[k].revenue += Number(s.totalAmount || 0);
    });
    return Object.values(m);
  }
  let list = sales;
  if (type === "sales") list = sales.filter((s) => saleDay(s) === today);
  if (type === "monthly")
    list = sales.filter((s) => saleDay(s).slice(0, 7) === month);
  return list.map((s) => ({
    invoice: s.invoiceNumber,
    product: s.productName,
    quantity: s.quantity,
    total: s.totalAmount,
    payment: s.paymentMethod,
    salesperson: getReportSalesperson(s),
    date: dateText(s.createdAt),
  }));
}
window.downloadReport = (type, fmt) => {
  const rows = rowsFor(type);
  if (!rows.length) return alert("No data for this report.");
  if (fmt === "csv") return toCSV(rows, `${type}-report.csv`);
  if (fmt === "excel") {
    if (!window.XLSX)
      return alert(
        "Excel exporter (SheetJS) failed to load. Check connection and reload.",
      );
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
  } else {
    alert("PDF exporter (jsPDF) failed to load. Check connection and reload.");
  }
};
const exportJsonBtn = $("#exportAllJson");
if (exportJsonBtn)
  exportJsonBtn.onclick = () =>
    downloadJSON(
      { products, sales, purchases, admins, staff, accounts },
      "salesiq-backup.json",
    );
load();
