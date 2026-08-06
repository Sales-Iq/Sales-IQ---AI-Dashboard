import {
  requireAuth,
  initAppShell,
  fetchAll,
  fetchByAdminId,
  $,
  money,
  dateText,
  emptyState,
  toCSV,
} from "../../js/shared.js";

import {
  db,
  collection,
  query,
  where,
  onSnapshot,
} from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "sales", profile);

let sales = [];

function watchByAdminId(name, callback) {
  if (!profile.id) {
    console.warn(`watchByAdminId skipped for ${name}: profile.id is undefined`);
    return () => {};
  }
  const ref = query(collection(db, name), where("adminId", "==", profile.id));
  const mapDocs = (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tb - ta;
    });
    return rows;
  };

  try {
    return onSnapshot(
      ref,
      (snap) => callback(mapDocs(snap)),
      (err) => {
        console.warn(`Realtime listener failed for ${name}:`, err);
        fetchByAdminId(name, profile.id).then(callback);
        setTimeout(
          () =>
            toast(
              `Live update failed for ${name}. Showing latest loaded data.`,
              "err",
            ),
          700,
        );
      },
    );
  } catch (err) {
    console.warn(`Could not start realtime listener for ${name}:`, err);
    fetchByAdminId(name, profile.id).then(callback);
    return () => {};
  }
}

function sourceLabel(source) {
  return source === "dummy" ? "Dummy" : source === "admin" ? "Admin" : "Staff";
}

function filtered() {
  const d = $("#dateFilter").value,
    sp = $("#salespersonFilter").value.toLowerCase(),
    pm = $("#paymentFilter").value;
  return sales.filter(
    (s) =>
      (!d ||
        (s.createdAt?.toDate &&
          s.createdAt.toDate().toISOString().slice(0, 10) === d)) &&
      (!sp ||
        (s.salespersonName || "").toLowerCase().includes(sp) ||
        (s.source || "").toLowerCase().includes(sp)) &&
      (!pm || s.paymentMethod === pm),
  );
}

function render() {
  const rows = filtered();
  $("#salesTable").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Product</th><th>Qty</th><th>Total</th><th>Date & Time</th><th>Salesperson</th><th>Source</th><th>Payment</th><th>Batches</th></tr></thead><tbody>${rows.map((s) => `<tr><td class="font-black">${s.invoiceNumber || "-"}</td><td>${s.productName || "-"}</td><td>${s.quantity || 0}</td><td>${money(s.totalAmount)}</td><td>${dateText(s.createdAt)}</td><td>${s.salespersonName || "-"}</td><td>${sourceLabel(s.source)}</td><td>${s.paymentMethod || "-"}</td><td>${s.batchesUsed?.map(b=>`${b.batchNumber} (${b.quantity})`).join(', ') || '-'}</td></tr>`).join("")}</tbody></table></div>`
    : emptyState(
        "No sales records",
        "Start dummy live data or create sales from Billing.",
      );
}

async function load() {
  sales = await fetchByAdminId("sales", profile.id);
  render();
}

const unsubs = [
  watchByAdminId('sales', rows => {
    sales = rows;
    render();
  })
];

["dateFilter", "salespersonFilter", "paymentFilter"].forEach((id) =>
  $("#" + id).addEventListener("input", render),
);

$("#clearSalesFilters").onclick = () => {
  $("#dateFilter").value = "";
  $("#salespersonFilter").value = "";
  $("#paymentFilter").value = "";
  render();
};

$("#exportSalesCsv").onclick = () =>
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
      batches: s.batchesUsed?.map(b=>b.batchNumber).join(', '),
    })),
    "sales-report.csv",
  );

window.addEventListener('beforeunload', () => {
  unsubs.forEach(unsub => unsub?.());
});

load();