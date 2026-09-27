import {
  requireAuth,
  initAppShell,
  $,
  money,
  dateText,
  emptyState,
  makeChart,
  statusFor,
  watchCollection,
  toast,
  setBusy,
} from "../../js/shared.js";

import {
  seedDemoProducts,
  seedDemoSuppliers,
  seedDemoCustomers,
  generateDummySale,
  generateMultipleSales,
  populateEverything,
} from "./demoSeeder.js";

import {
  isDemoLiveEnabled,
  setDemoLiveEnabled,
  getDemoInterval,
} from "../../js/demo-live-data.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "dashboard", profile);

let products = [];
let sales = [];
let customers = [];
let stopDemoRunner = null;

function saleDate(sale) {
  if (!sale?.createdAt) return null;

  const d = sale.createdAt?.toDate
    ? sale.createdAt.toDate()
    : new Date(sale.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sourceBadge(source) {
  if (source === "dummy") return '<span class="badge badge-warn">Dummy</span>';
  if (source === "admin") return '<span class="badge badge-ok">Admin</span>';
  return '<span class="badge badge-ok">Staff</span>';
}

function renderDemoControls() {
  const status = $("#demoLiveStatus");
  const toggle = $("#toggleDemoLive");
  const interval = Math.round(getDemoInterval() / 1000);
  const enabled = isDemoLiveEnabled();

  if (status) {
    status.innerHTML = enabled
      ? `<span class="badge badge-ok">LIVE</span> Auto dummy sales active (~every ${interval}s). Source: <b>dummy</b>.`
      : '<span class="badge badge-danger">IDLE</span> Live demo generator is off. Click "Live Demo" to simulate real-time sales.';
  }

  if (toggle) {
    toggle.textContent = enabled ? "Stop Live Demo" : "Live Demo";
    toggle.className = enabled ? "btn btn-danger" : "btn btn-primary";
  }
}

function startRunnerIfNeeded() {
  if (stopDemoRunner) {
    clearInterval(stopDemoRunner);
    stopDemoRunner = null;
  }

  if (!isDemoLiveEnabled()) return;

  const interval = getDemoInterval();
  stopDemoRunner = setInterval(async () => {
    try {
      const sale = await generateDummySale(profile);
      toast(`Live demo sale: ${sale.productName} x ${sale.quantity}`);
    } catch (err) {
      console.warn("Live dummy sale error:", err);
    }
  }, interval);
}

function renderStats({ salesToday, monthSales, low, out }) {
  const dummyToday = salesToday.filter((s) => s.source === "dummy").length;
  const staffToday = salesToday.filter((s) => s.source !== "dummy").length;

  const statsEl = $("#adminStats");
  if (!statsEl) return;
  statsEl.innerHTML = [
    [
      "Total sales today",
      money(
        salesToday.reduce(
          (sum, sale) => sum + Number(sale.totalAmount || 0),
          0,
        ),
      ),
      `${salesToday.length} orders • ${dummyToday} dummy • ${staffToday} staff/admin`,
    ],
    [
      "Monthly revenue",
      money(
        monthSales.reduce(
          (sum, sale) => sum + Number(sale.totalAmount || 0),
          0,
        ),
      ),
      `${monthSales.length} monthly orders`,
    ],
    ["Total products", products.length, `${low} low stock`],
    ["Out of stock", out, `${customers.length} customers`],
  ]
    .map(
      (item) => `
    <div class="glass stat-card glass-card-hover">
      <div class="stat-label">${item[0]}</div>
      <div class="stat-value">${item[1]}</div>
      <div class="stat-hint">${item[2]}</div>
    </div>
  `,
    )
    .join("");
}

function last7DayKeys() {
  const keys = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function renderCharts() {
  const byDay = {};

  sales.forEach((sale) => {
    const d = saleDate(sale);
    const key = d ? d.toISOString().slice(0, 10) : "Unknown";
    if (key === "Unknown") return;
    byDay[key] = (byDay[key] || 0) + Number(sale.totalAmount || 0);
  });

  let labels = Object.keys(byDay).sort().slice(-10);
  // Always show a visible 7-day axis so the graph never looks missing
  // when the database is empty or has no recent sales.
  if (!labels.length) labels = last7DayKeys();

  makeChart($("#salesTrendChart"), "line", {
    labels,
    datasets: [
      {
        label: "Sales",
        data: labels.map((key) => byDay[key] || 0),
        tension: 0.4,
        fill: true,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,.22)",
        pointBackgroundColor: "#38bdf8",
      },
    ],
  });

  const topInventory = [...products]
    .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
    .slice(0, 10);

  const invLabels = topInventory.length
    ? topInventory.map((product) => product.name)
    : ["No products yet"];
  const invData = topInventory.length
    ? topInventory.map((product) => Number(product.stock || 0))
    : [0];

  makeChart($("#inventoryChart"), "bar", {
    labels: invLabels,
    datasets: [
      {
        label: "Stock",
        data: invData,
        borderColor: "#a78bfa",
        backgroundColor: "rgba(167,139,250,.55)",
      },
    ],
  });
}

function renderRecentSales() {
  const recentEl = $("#recentSales");
  if (!recentEl) return;
  recentEl.innerHTML = sales.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Source</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${sales
              .slice(0, 8)
              .map(
                (sale) => `
              <tr>
                <td>${sale.invoiceNumber || sale.invoice || "-"}</td>
                <td>${sale.productName || "-"}</td>
                <td>${sale.quantity || 0}</td>
                <td>${money(sale.totalAmount)}</td>
                <td>${sourceBadge(sale.source)}</td>
                <td>${dateText(sale.createdAt)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : emptyState(
        "No recent sales",
        "Start dummy live data or create a sale from Billing.",
      );
}

function renderAiSummary({ low, out }) {
  const aiEl = $("#aiSummary");
  if (!aiEl) return;

  const fastest = [
    ...sales.reduce((map, sale) => {
      if (!sale.productName) return map;
      map.set(
        sale.productName,
        (map.get(sale.productName) || 0) + Number(sale.quantity || 0),
      );
      return map;
    }, new Map()),
  ].sort((a, b) => b[1] - a[1])[0];

  const dummyCount = sales.filter((s) => s.source === "dummy").length;
  const staffCount = sales.length - dummyCount;

  aiEl.innerHTML =
    products.length || sales.length
      ? `
      Your dashboard has <b>${products.length}</b> products and <b>${sales.length}</b> sales records.<br><br>
      <span class="badge badge-warn">${dummyCount} dummy</span>
      <span class="badge badge-ok">${staffCount} staff/admin</span>
      ${low ? `<br><br><span class="badge badge-warn">${low} products are low stock</span>` : ""}
      ${out ? `<br><br><span class="badge badge-danger">${out} products are out of stock</span>` : ""}
      ${fastest ? `<br><br>Fast-selling product: <b>${fastest[0]}</b> (${fastest[1]} units sold).` : ""}
    `
      : emptyState(
          "No AI summary yet",
          "Add products, start dummy live data, or create staff sales to generate a business summary.",
        );
}

function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const salesToday = sales.filter(
    (s) => saleDate(s)?.toISOString().slice(0, 10) === today,
  );
  const monthSales = sales.filter(
    (s) => saleDate(s)?.toISOString().slice(0, 7) === month,
  );
  const low = products.filter(
    (p) => statusFor(p.stock, p.minStock) === "Low Stock",
  ).length;
  const out = products.filter((p) => Number(p.stock || 0) <= 0).length;

  renderStats({ salesToday, monthSales, low, out });
  renderCharts();
  renderRecentSales();
  renderAiSummary({ low, out });
  renderDemoControls();
}

$("#seedDemoProducts")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true, "Seeding...");

  try {
    const result = await seedDemoProducts({ restock: true });
    toast(
      `Demo products & inventory ready. Created: ${result.created}, restocked: ${result.restocked}.`,
    );
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

$("#generateDemoSale")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const countSelect = $("#salesCount");
  const count = countSelect ? parseInt(countSelect.value, 10) || 1 : 1;
  setBusy(btn, true, `Generating ${count}...`);

  try {
    if (count === 1) {
      const sale = await generateDummySale(profile);
      toast(`Dummy sale added: ${sale.productName} x ${sale.quantity}`);
    } else {
      const res = await generateMultipleSales(count, profile);
      toast(`${res.count} dummy sales generated successfully!`);
    }
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

$("#generateCustomers")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true, "Adding customers...");

  try {
    const res = await seedDemoCustomers();
    toast(`Customers seeded: ${res.created} added, ${res.updated} updated.`);
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

$("#generateSuppliers")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true, "Adding suppliers...");

  try {
    const res = await seedDemoSuppliers();
    toast(`Suppliers seeded: ${res.created} added, ${res.updated} updated.`);
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

$("#generateEverything")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true, "Populating DB...");

  try {
    await populateEverything(profile);
    toast(
      "Full demo database populated: products, suppliers, customers, and sales!",
    );
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

$("#toggleDemoLive")?.addEventListener("click", () => {
  const newState = !isDemoLiveEnabled();
  setDemoLiveEnabled(newState);
  renderDemoControls();
  startRunnerIfNeeded();
  toast(newState ? "Dummy live sales started." : "Dummy live sales stopped.");
});

const unsubs = [
  watchCollection("products", (rows) => {
    products = rows;
    renderDashboard();
  }),
  watchCollection("sales", (rows) => {
    sales = rows;
    renderDashboard();
  }),
  watchCollection("customers", (rows) => {
    customers = rows;
    renderDashboard();
  }),
];

renderDemoControls();
startRunnerIfNeeded();

window.addEventListener("beforeunload", () => {
  if (stopDemoRunner) clearInterval(stopDemoRunner);
  unsubs.forEach((unsub) => unsub?.());
});
