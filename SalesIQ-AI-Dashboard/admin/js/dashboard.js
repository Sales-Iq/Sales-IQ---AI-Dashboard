import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  money,
  dateText,
  toDate,
  getCachedCollection,
  emptyState,
  makeChart,
  statusFor,
  watchCollection,
  toast,
  setBusy,
} from "../../js/shared.js";
import {
  db,
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "../../js/firebase-config.js";

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
let staffUsers = [];
let recentSalesFilter = "all";

try {
  const [pRows, sRows, cRows, stRows] = await Promise.all([
    fetchAll("products", false, profile.id).catch(() => []),
    fetchAll("sales", true, profile.id).catch(() => []),
    fetchAll("customers", false, profile.id).catch(() => []),
    fetchAll("staff", false).catch(() => []),
  ]);
  products = pRows || [];
  sales = sRows || [];
  customers = cRows || [];
  staffUsers = (stRows || []).filter(
    (u) =>
      u.adminId === profile.id ||
      u.createdBy === profile.id ||
      u.pendingRequest?.adminId === profile.id,
  );
  renderDashboard();
} catch (err) {
  console.warn("Initial dashboard fetch fallback:", err);
}

let stopDemoRunner = null;
let chartStartDate = localStorage.getItem("salesiq_chart_start") || "";
let chartEndDate = localStorage.getItem("salesiq_chart_end") || "";
let lastStartVal = "";
let lastEndVal = "";

function isDummySale(sale) {
  if (!sale) return false;
  return (
    sale.source === "dummy" || sale.source === "demo" || Boolean(sale.isDemo)
  );
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

function getSalespersonDisplay(s) {
  if (!s) return "-";
  if (s.salespersonName) return s.salespersonName;
  if (s.salespersonEmail) return s.salespersonEmail;
  if (s.salespersonId) {
    const matched = staffUsers.find((u) => u.id === s.salespersonId);
    if (matched?.name) return matched.name;
    if (matched?.email) return matched.email;
  }
  if (isDummySale(s)) return "System Demo";
  if (isStaffSale(s)) return "Sales Staff";
  return profile.name || profile.email || "Admin";
}

function saleDate(sale) {
  if (!sale?.createdAt) return null;
  const d = toDate(sale.createdAt);
  if (d) return d;
  if (typeof sale.createdAt === "object") return new Date();
  return null;
}

function sourceBadge(source, sale) {
  if (isDummySale(sale) || source === "dummy" || source === "demo") {
    return '<span class="badge badge-warn font-semibold">Dummy</span>';
  }
  if (isStaffSale(sale) || source === "staff") {
    return '<span class="badge badge-ok font-semibold">Staff</span>';
  }
  return '<span class="badge badge-purple font-semibold">Admin</span>';
}

function renderDemoControls() {
  const status = $("#demoLiveStatus");
  const toggle = $("#toggleDemoLive");
  const interval = 5;
  const enabled = isDemoLiveEnabled(profile.id);

  if (status) {
    status.innerHTML = enabled
      ? `<span class="badge badge-ok animate-pulse inline-flex items-center gap-1.5"><span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>LIVE</span> Auto dummy sales active (~every ${interval}s). Source: <b>dummy</b>.`
      : '<span class="badge badge-danger">IDLE</span> Live demo generator is off. Click "Live Demo" to simulate real-time sales.';
  }

  if (toggle) {
    toggle.innerHTML = enabled
      ? '<span class="inline-block w-2 h-2 rounded-full bg-rose-200 animate-ping mr-1.5"></span>Stop Live Demo'
      : "Live Demo";
    toggle.className = enabled ? "btn btn-danger" : "btn btn-primary";
  }
}

let isRunningTick = false;

async function runDemoTick() {
  if (isRunningTick) return;
  if (!isDemoLiveEnabled(profile.id)) return;
  isRunningTick = true;

  try {
    const sale = await generateDummySale(profile);
    if (sale) {
      toast(
        `Live demo sale: ${sale.productName || "Product"} x ${sale.quantity || 1}`,
        "ok",
      );
    }
  } catch (err) {
    console.error("Live dummy sale error:", err);
    toast(`Live demo: ${err.message}`, "err");
  } finally {
    isRunningTick = false;
  }
}

function startRunnerIfNeeded() {
  if (stopDemoRunner) {
    clearInterval(stopDemoRunner);
    stopDemoRunner = null;
  }

  if (!isDemoLiveEnabled(profile.id)) return;

  const interval = 5000;

  // Run the first sale immediately so the user sees it working right away
  runDemoTick();

  stopDemoRunner = setInterval(() => {
    if (!isDemoLiveEnabled(profile.id)) {
      if (stopDemoRunner) clearInterval(stopDemoRunner);
      stopDemoRunner = null;
      return;
    }
    runDemoTick();
  }, interval);
}

function renderStats({ salesToday, monthSales, low, out }) {
  const dummyToday = salesToday.filter(isDummySale).length;
  const staffToday = salesToday.length - dummyToday;

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
      `${salesToday.length} orders • ${dummyToday} dummy • ${staffToday} staff`,
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

function toLocalYMD(d) {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayStr() {
  return toLocalYMD(new Date());
}

function getPastMonthStr(daysAgo = 29) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toLocalYMD(d);
}

function getDaysArray(startStr, endStr) {
  const dates = [];
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);

  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  if (cur > end) return [startStr];

  let count = 0;
  while (cur <= end && count < 1000) {
    dates.push(toLocalYMD(cur));
    cur.setDate(cur.getDate() + 1);
    count++;
  }
  return dates;
}

function formatShortDate(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getFirstSaleDateStr() {
  if (!sales || !sales.length) return null;
  let earliest = null;
  for (const s of sales) {
    const d = saleDate(s);
    if (!d) continue;
    if (!earliest || d < earliest) {
      earliest = d;
    }
  }
  return earliest ? toLocalYMD(earliest) : null;
}

function getLastSaleDateStr() {
  if (!sales || !sales.length) return null;
  let latest = null;
  for (const s of sales) {
    const d = saleDate(s);
    if (!d) continue;
    if (!latest || d > latest) {
      latest = d;
    }
  }
  return latest ? toLocalYMD(latest) : null;
}

function getDefaultChartRange() {
  const today = getTodayStr();
  const firstSale = getFirstSaleDateStr();
  const lastSale = getLastSaleDateStr();

  let defaultStart = firstSale || getPastMonthStr(29);
  let defaultEnd = today;

  if (lastSale && lastSale > defaultEnd) {
    defaultEnd = lastSale;
  }
  if (defaultStart > defaultEnd) {
    defaultStart = defaultEnd;
  }
  return { defaultStart, defaultEnd };
}

function getEffectiveChartRange() {
  const { defaultStart, defaultEnd } = getDefaultChartRange();
  let start = (chartStartDate || "").trim();
  let end = (chartEndDate || "").trim();

  const hasCustomFilter = Boolean(start || end);

  if (start) {
    // If end date is not selected, default to defaultEnd
    if (!end) {
      end = defaultEnd;
    }
    // Swap if end is earlier than start
    if (end < start) {
      const temp = start;
      start = end;
      end = temp;
    }
  } else if (end) {
    let s = defaultStart;
    if (s > end) {
      s = end;
    }
    start = s;
  } else {
    start = defaultStart;
    end = defaultEnd;
  }

  const isCustom =
    hasCustomFilter && (start !== defaultStart || end !== defaultEnd);

  return { start, end, defaultStart, defaultEnd, isCustom };
}

function renderSalesChart() {
  const range = getEffectiveChartRange();
  const dateKeys = getDaysArray(range.start, range.end);

  // Synchronize date picker inputs to reflect the actual start & end dates in the graph (even in default mode!)
  const startEl = $("#chartStartDate");
  const endEl = $("#chartEndDate");
  if (startEl) {
    if (startEl.value !== range.start) {
      startEl.value = range.start;
    }
    lastStartVal = range.start;
  }
  if (endEl) {
    if (endEl.value !== range.end) {
      endEl.value = range.end;
    }
    if (range.start) {
      endEl.min = range.start;
    }
    lastEndVal = range.end;
  }

  const resetBtn = $("#resetChartDate");
  if (resetBtn) {
    if (range.isCustom) {
      resetBtn.classList.remove("hidden");
      resetBtn.style.display = "inline-flex";
    } else {
      resetBtn.classList.add("hidden");
      resetBtn.style.display = "none";
    }
  }

  const byDay = {};
  sales.forEach((sale) => {
    const d = saleDate(sale);
    if (!d) return;
    const key = toLocalYMD(d);
    byDay[key] = (byDay[key] || 0) + Number(sale.totalAmount || 0);
  });

  const chartData = dateKeys.map((k) => byDay[k] || 0);
  const chartLabels = dateKeys.map(formatShortDate);

  const totalPeriodSales = chartData.reduce((sum, val) => sum + val, 0);
  const totalPeriodOrders = sales.filter((s) => {
    const d = saleDate(s);
    if (!d) return false;
    const k = toLocalYMD(d);
    return k >= range.start && k <= range.end;
  }).length;

  const rangeTextEl = $("#salesChartRangeText");
  if (rangeTextEl) {
    const startTxt = formatFullDate(range.start);
    const endTxt = formatFullDate(range.end);
    const labelPrefix = range.isCustom ? "Custom range" : "Default";
    rangeTextEl.innerHTML = `${labelPrefix}: <b>${startTxt}</b> to <b>${endTxt}</b> • Total: <b class="text-sky-400">${money(totalPeriodSales)}</b> (${totalPeriodOrders} ${totalPeriodOrders === 1 ? "order" : "orders"})`;
  }

  makeChart(
    $("#salesTrendChart"),
    "line",
    {
      labels: chartLabels,
      datasets: [
        {
          label: "Sales",
          data: chartData,
          tension: 0.35,
          fill: true,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,.20)",
          pointBackgroundColor: "#38bdf8",
        },
      ],
    },
    {
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              return dateKeys[idx] ? formatFullDate(dateKeys[idx]) : "";
            },
            label: (item) => ` Sales: ${money(item.raw)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 12,
            maxRotation: 0,
          },
        },
      },
    },
  );
}

function renderInventoryChart() {
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

function renderCharts() {
  renderSalesChart();
  renderInventoryChart();
}

function renderRecentSales() {
  const recentEl = $("#recentSales");
  if (!recentEl) return;

  // Always sort sales by creation date descending so recent staff & admin sales appear at the top!
  const sortedSales = [...sales].sort((a, b) => {
    const da = toDate(a.createdAt);
    const db = toDate(b.createdAt);
    const ta = da ? da.getTime() : Date.now();
    const tb = db ? db.getTime() : Date.now();
    return tb - ta;
  });

  const staffCount = sortedSales.filter(isStaffSale).length;

  const countBadge = $("#recentSalesCountBadge");
  if (countBadge) {
    countBadge.textContent = `${sortedSales.length} total • ${staffCount} staff`;
  }

  const filteredSales = sortedSales.filter((s) => {
    if (recentSalesFilter === "staff") return isStaffSale(s);
    if (recentSalesFilter === "admin") return isAdminSale(s);
    if (recentSalesFilter === "dummy") return isDummySale(s);
    return true;
  });

  const displayList = filteredSales.slice(0, 8);

  recentEl.innerHTML = displayList.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Salesperson</th>
              <th>Source</th>
              <th>Date</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${displayList
              .map((sale) => {
                const spTitle = getSalespersonDisplay(sale);
                let spEmail = sale.salespersonEmail || "";
                if (!spEmail && sale.salespersonId) {
                  const matched = staffUsers.find((u) => u.id === sale.salespersonId);
                  if (matched?.email) spEmail = matched.email;
                }
                const hasSeparateEmail = spEmail && spEmail !== spTitle;
                const staff = isStaffSale(sale);

                return `
              <tr class="${staff ? "is-staff-sale" : ""}">
                <td class="font-medium">${sale.invoiceNumber || sale.invoice || "-"}</td>
                <td>${sale.productName || "-"}</td>
                <td>${sale.quantity || 0}</td>
                <td class="font-mono font-bold text-emerald-400">${money(sale.totalAmount)}</td>
                <td>
                  <div class="font-medium ${staff ? "text-emerald-400 font-semibold" : "text-slate-200"}">
                    ${spTitle}
                  </div>
                  ${
                    hasSeparateEmail
                      ? `<div class="text-xs text-slate-400">${spEmail}</div>`
                      : ""
                  }
                </td>
                <td>${sourceBadge(sale.source, sale)}</td>
                <td>${dateText(sale.createdAt)}</td>
                <td class="text-right">
                  <button
                    class="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 px-2 py-1 rounded-lg"
                    onclick="window.deleteSaleRecord('${sale.id}')"
                    title="Delete this sale record"
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
      </div>
    `
    : emptyState(
        recentSalesFilter === "staff"
          ? "No staff sales yet"
          : recentSalesFilter === "admin"
            ? "No admin sales yet"
            : recentSalesFilter === "dummy"
              ? "No dummy sales"
              : "No recent sales",
        recentSalesFilter === "staff"
          ? "Sales recorded by staff members will appear here."
          : "Start dummy live data, record a sale from Billing, or have staff create sales.",
      );
}

window.deleteSaleRecord = async (id) => {
  if (!id) return;
  const sale = sales.find((s) => s.id === id);
  const name = sale
    ? `${sale.productName || "Sale"} (${sale.invoiceNumber || sale.invoice || id})`
    : "this sale";
  if (!confirm(`Are you sure you want to delete ${name}?`)) return;

  try {
    await deleteDoc(doc(db, "sales", id));
    toast("Sale record deleted successfully.", "ok");
    sales = sales.filter((s) => s.id !== id);
    renderDashboard();
  } catch (err) {
    console.error("Error deleting sale:", err);
    toast(`Failed to delete sale: ${err.message}`, "err");
  }
};

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

  const dummyCount = sales.filter(isDummySale).length;
  const staffSales = sales.filter(isStaffSale).length;
  const adminSales = sales.filter(isAdminSale).length;
  const staffCount = staffSales;

  const myStaff = staffUsers.filter((u) => u.adminId === profile.id);
  const myStaffCount = myStaff.length;

  const staffText =
    myStaffCount > 0 ? `, and <b>${myStaffCount}</b> sales staff` : "";

  aiEl.innerHTML =
    products.length || sales.length || staffUsers.length
      ? `
      Your dashboard has <b>${products.length}</b> products and <b>${sales.length}</b> sales records${staffText}.<br><br>
      <span class="badge badge-warn">${dummyCount} dummy</span>
      <span class="badge badge-ok" title="Staff sales">${staffCount} staff</span>
      ${adminSales > 0 && staffSales > 0 ? `<span class="badge badge-purple" title="Admin sales">${adminSales} admin</span>` : ""}
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
    const result = await seedDemoProducts({ restock: true, profile });
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
    const res = await seedDemoCustomers(profile);
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
    const res = await seedDemoSuppliers(profile);
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
  const newState = !isDemoLiveEnabled(profile.id);
  setDemoLiveEnabled(newState, profile.id);
  renderDemoControls();
  startRunnerIfNeeded();
  toast(newState ? "Dummy live sales started." : "Dummy live sales stopped.");
});

const unsubs = [
  watchCollection(
    "products",
    (rows) => {
      products = rows;
      renderDashboard();
    },
    false,
    profile.id,
  ),
  watchCollection(
    "sales",
    (rows) => {
      sales = rows;
      renderDashboard();
    },
    true,
    profile.id,
  ),
  watchCollection(
    "customers",
    (rows) => {
      customers = rows;
      renderDashboard();
    },
    false,
    profile.id,
  ),
  watchCollection(
    "staff",
    (rows) => {
      staffUsers = rows.filter(
        (u) =>
          u.adminId === profile.id ||
          u.createdBy === profile.id ||
          u.pendingRequest?.adminId === profile.id,
      );
      renderDashboard();
    },
    false,
  ),
];

window.addEventListener("salesiq:cache-updated", (e) => {
  if (e.detail?.name === "sales" && Array.isArray(e.detail.data)) {
    sales = e.detail.data;
    renderDashboard();
  }
});

function initChartDateControls() {
  const startEl = $("#chartStartDate");
  const endEl = $("#chartEndDate");
  const resetBtn = $("#resetChartDate");

  function getDaysInMonth(year, month1Indexed) {
    return new Date(year, month1Indexed, 0).getDate();
  }

  // Intercept Chromium month-wrap (e.g., 30-09 wrapped to 01-09, or 01-10 wrapped to 31-10)
  function handleMonthWrapCorrection(inputEl, prevVal) {
    const curVal = inputEl?.value;
    if (!curVal || !prevVal) return curVal;

    const [prevY, prevM, prevD] = prevVal.split("-").map(Number);
    const [curY, curM, curD] = curVal.split("-").map(Number);

    // If day was on the last day of the month, and now wrapped to 1 in the same month & year:
    if (
      prevY === curY &&
      prevM === curM &&
      curD === 1 &&
      prevD === getDaysInMonth(prevY, prevM)
    ) {
      const dt = new Date(prevY, prevM - 1, prevD);
      dt.setDate(dt.getDate() + 1); // Advances to next month's 1st day!
      const corrected = toLocalYMD(dt);
      inputEl.value = corrected;
      return corrected;
    }

    // If day was on 1st of the month, and now wrapped backwards to last day in the same month & year:
    if (
      prevY === curY &&
      prevM === curM &&
      prevD === 1 &&
      curD === getDaysInMonth(prevY, prevM)
    ) {
      const dt = new Date(prevY, prevM - 1, 1);
      dt.setDate(dt.getDate() - 1); // Moves back to previous month's last day!
      const corrected = toLocalYMD(dt);
      inputEl.value = corrected;
      return corrected;
    }

    return curVal;
  }

  // Keyboard ArrowUp / ArrowDown stepper
  function attachKeyboardDateStepper(inputEl, onStep) {
    if (!inputEl) return;
    inputEl.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (!inputEl.value) return;

      e.preventDefault();
      const delta = e.key === "ArrowUp" ? 1 : -1;
      const [y, m, d] = inputEl.value.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + delta);
      const nextStr = toLocalYMD(dt);
      inputEl.value = nextStr;
      onStep(nextStr);
    });
  }

  // Restore saved dates from localStorage into inputs
  if (chartStartDate && startEl) {
    startEl.value = chartStartDate;
    lastStartVal = chartStartDate;
    if (endEl) endEl.min = chartStartDate;
  }
  if (chartEndDate && endEl) {
    endEl.value = chartEndDate;
    lastEndVal = chartEndDate;
  }

  if (startEl) {
    const handleStartChange = (val) => {
      const correctedVal = handleMonthWrapCorrection(startEl, lastStartVal);
      const finalVal = val || correctedVal || startEl.value;
      lastStartVal = finalVal;
      chartStartDate = finalVal;

      const { defaultStart, defaultEnd } = getDefaultChartRange();
      const currentEnd = chartEndDate || endEl?.value || defaultEnd;

      // If user selected the default range, reset to default mode
      if (chartStartDate === defaultStart && currentEnd === defaultEnd) {
        chartStartDate = "";
        chartEndDate = "";
        localStorage.removeItem("salesiq_chart_start");
        localStorage.removeItem("salesiq_chart_end");
      } else if (chartStartDate) {
        localStorage.setItem("salesiq_chart_start", chartStartDate);
      } else {
        localStorage.removeItem("salesiq_chart_start");
      }

      if (endEl && chartStartDate) {
        endEl.min = chartStartDate;
      }
      renderSalesChart();
    };

    startEl.addEventListener("change", () => handleStartChange());
    startEl.addEventListener("input", () => handleStartChange());
    attachKeyboardDateStepper(startEl, (newVal) => handleStartChange(newVal));
  }

  if (endEl) {
    const handleEndChange = (val) => {
      const correctedVal = handleMonthWrapCorrection(endEl, lastEndVal);
      const finalVal = val || correctedVal || endEl.value;
      lastEndVal = finalVal;
      chartEndDate = finalVal;

      const { defaultStart, defaultEnd } = getDefaultChartRange();
      const currentStart = chartStartDate || startEl?.value || defaultStart;

      // If user selected the default range, reset to default mode
      if (currentStart === defaultStart && chartEndDate === defaultEnd) {
        chartStartDate = "";
        chartEndDate = "";
        localStorage.removeItem("salesiq_chart_start");
        localStorage.removeItem("salesiq_chart_end");
      } else if (chartEndDate) {
        localStorage.setItem("salesiq_chart_end", chartEndDate);
      } else {
        localStorage.removeItem("salesiq_chart_end");
      }

      renderSalesChart();
    };

    endEl.addEventListener("change", () => handleEndChange());
    endEl.addEventListener("input", () => handleEndChange());
    attachKeyboardDateStepper(endEl, (newVal) => handleEndChange(newVal));
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      chartStartDate = "";
      chartEndDate = "";
      localStorage.removeItem("salesiq_chart_start");
      localStorage.removeItem("salesiq_chart_end");
      renderSalesChart();
      toast("Sales chart reset to default range");
    });
  }
}

function initManualSaleModal() {
  const modal = $("#manualSaleModal");
  const openBtn = $("#openManualSaleModal");
  const closeBtn = $("#closeManualSaleModal");
  const cancelBtn = $("#cancelManualSaleModal");
  const form = $("#manualSaleForm");
  const productSelect = $("#manualSaleProduct");
  const qtyInput = $("#manualSaleQty");
  const dateInput = $("#manualSaleDate");
  const priceInput = $("#manualSalePrice");
  const totalInput = $("#manualSaleTotal");
  const submitBtn = $("#saveManualSaleBtn");

  if (!modal || !openBtn) return;

  function updateModalCalc() {
    const pId = productSelect.value;
    const p = products.find((x) => x.id === pId);
    const qty = Number(qtyInput.value || 1);
    const price = Number(p?.price || 0);
    priceInput.value = price;
    totalInput.value = price * qty;
  }

  function openModal() {
    productSelect.innerHTML =
      '<option value="">Select product</option>' +
      products
        .map(
          (p) =>
            `<option value="${p.id}">${p.name} — ${money(p.price)} (${p.stock || 0} in stock)</option>`,
        )
        .join("");

    dateInput.value = getTodayStr();
    qtyInput.value = 1;
    priceInput.value = 0;
    totalInput.value = 0;
    $("#manualCustomerName").value = "";
    $("#manualPaymentMethod").value = "Cash";

    modal.classList.add("show");
  }

  function closeModal() {
    modal.classList.remove("show");
  }

  openBtn.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  productSelect.addEventListener("change", updateModalCalc);
  qtyInput.addEventListener("input", updateModalCalc);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pId = productSelect.value;
    const p = products.find((x) => x.id === pId);
    if (!p) return toast("Please select a product.", "err");

    const qty = Number(qtyInput.value || 1);
    if (qty <= 0) return toast("Quantity must be at least 1.", "err");

    const stock = Number(p.stock || 0);
    if (qty > stock) {
      if (
        !confirm(
          `Requested quantity (${qty}) exceeds available stock (${stock}). Proceed anyway?`,
        )
      ) {
        return;
      }
    }

    const pickedDate = dateInput.value;
    if (!pickedDate) return toast("Please select a sale date.", "err");

    const [py, pm, pd] = pickedDate.split("-").map(Number);
    const now = new Date();
    const saleDateObj = new Date(
      py,
      pm - 1,
      pd,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    );

    const price = Number(p.price || 0);
    const cost = Number(p.costPrice || 0);
    const total = price * qty;
    const customer =
      $("#manualCustomerName").value.trim() || "Walk-in Customer";
    const payment = $("#manualPaymentMethod").value || "Cash";
    const invoiceNumber = "INV-" + Date.now().toString().slice(-8);

    setBusy(submitBtn, true, "Saving...");

    try {
      const newStock = Math.max(0, stock - qty);
      await updateDoc(doc(db, "products", p.id), {
        stock: newStock,
        status: statusFor(newStock, p.minStock || 10),
        updatedAt: Timestamp.now(),
      }).catch((err) => console.warn("Stock update warning:", err));

      const saleData = {
        invoiceNumber,
        productId: p.id,
        productName: p.name,
        category: p.category || "General",
        quantity: qty,
        price,
        costPrice: cost,
        totalAmount: total,
        profit: (price - cost) * qty,
        customerName: customer,
        paymentMethod: payment,
        salespersonName: profile?.name || profile?.email || "Admin",
        salespersonId: profile?.id || "admin",
        source: "admin",
        isDemo: false,
        createdAt: Timestamp.fromDate(saleDateObj),
      };

      await addDoc(collection(db, "sales"), saleData);

      toast(
        `Sale recorded for ${pickedDate}: ${p.name} x${qty} (${money(total)})`,
        "ok",
      );
      closeModal();
    } catch (err) {
      console.error("Manual sale error:", err);
      toast(`Failed to record sale: ${err.message}`, "err");
    } finally {
      setBusy(submitBtn, false);
    }
  });
}

// ============================================================
// Resizable 2-Column Dashboard & Edit Mode Logic
// ============================================================

const STORAGE_LAYOUT_KEY = "salesiq_dashboard_custom_layout";

const DEFAULT_DASHBOARD_LAYOUT = {
  columns: {
    leftPct: 60,
    rightPct: 40,
  },
  slots: {
    fullTop: [],
    leftCol: ["salesChartTile", "recentSalesTile"],
    rightCol: ["inventoryChartTile", "aiSummaryTile"],
    fullBottom: [],
  },
  tileHeights: {
    salesChartTile: null,
    inventoryChartTile: null,
    recentSalesTile: null,
    aiSummaryTile: null,
  },
};

let currentLayout = loadDashboardLayout();

function getTileName(id) {
  const names = {
    salesChartTile: "Sales Chart",
    inventoryChartTile: "Inventory Chart",
    recentSalesTile: "Recent Sales",
    aiSummaryTile: "AI Business Summary",
  };
  return names[id] || "Tile";
}

function loadDashboardLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_LAYOUT_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
    const parsed = JSON.parse(raw);
    const layout = JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));

    if (parsed.columns?.leftPct) {
      layout.columns.leftPct = Number(parsed.columns.leftPct);
      layout.columns.rightPct =
        Math.round((100 - layout.columns.leftPct) * 10) / 10;
    } else if (parsed.rowProportions?.chartsRow?.leftPct) {
      layout.columns.leftPct = Number(parsed.rowProportions.chartsRow.leftPct);
      layout.columns.rightPct =
        Math.round((100 - layout.columns.leftPct) * 10) / 10;
    }

    if (parsed.slots) {
      ["fullTop", "leftCol", "rightCol", "fullBottom"].forEach((slotKey) => {
        if (Array.isArray(parsed.slots[slotKey])) {
          layout.slots[slotKey] = [...parsed.slots[slotKey]];
        }
      });
    }

    if (parsed.tileHeights && typeof parsed.tileHeights === "object") {
      layout.tileHeights = { ...parsed.tileHeights };
    }

    return layout;
  } catch (err) {
    console.warn("Could not parse dashboard layout:", err);
    return JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
  }
}

function persistDashboardLayout() {
  try {
    localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(currentLayout));
  } catch (err) {
    console.warn("Could not save dashboard layout:", err);
  }
}

function applyDashboardLayout(layout) {
  const containerTop = document.getElementById("dashboardFullTop");
  const containerLeft = document.getElementById("dashboardColLeft");
  const containerRight = document.getElementById("dashboardColRight");
  const containerBottom = document.getElementById("dashboardFullBottom");

  const leftPct = layout.columns.leftPct ?? 60;
  const rightPct = layout.columns.rightPct ?? 100 - leftPct;

  if (containerLeft) containerLeft.style.width = `calc(${leftPct}% - 8px)`;
  if (containerRight) containerRight.style.width = `calc(${rightPct}% - 8px)`;

  // Place tiles in their respective DOM containers
  const slotMap = [
    { key: "fullTop", container: containerTop, badgeText: "Full Width • 100%" },
    {
      key: "leftCol",
      container: containerLeft,
      badgeText: `Left Col • ${Math.round(leftPct)}%`,
    },
    {
      key: "rightCol",
      container: containerRight,
      badgeText: `Right Col • ${Math.round(rightPct)}%`,
    },
    {
      key: "fullBottom",
      container: containerBottom,
      badgeText: "Full Width • 100%",
    },
  ];

  slotMap.forEach(({ key, container, badgeText }) => {
    if (!container) return;
    const tileIds = layout.slots[key] || [];
    tileIds.forEach((tileId) => {
      const tile = document.getElementById(tileId);
      if (tile) {
        container.appendChild(tile);
        const badge = document.getElementById(`${tileId}Badge`);
        if (badge) badge.textContent = badgeText;
      }
    });
  });

  // Apply column preset buttons active state
  document.querySelectorAll(".col-preset-btn").forEach((btn) => {
    const target = Number(btn.getAttribute("data-left"));
    if (Math.abs(target - leftPct) <= 2) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Apply independent heights
  const allTileIds = [
    "salesChartTile",
    "inventoryChartTile",
    "recentSalesTile",
    "aiSummaryTile",
  ];

  allTileIds.forEach((id) => {
    const tile = document.getElementById(id);
    if (!tile) return;
    const h = layout.tileHeights?.[id];
    if (h && typeof h === "number") {
      tile.style.height = `${h}px`;
      tile.style.minHeight = `${h}px`;
    } else {
      tile.style.height = "";
      tile.style.minHeight = "";
    }
  });

  // Re-render charts
  if (typeof renderCharts === "function") {
    try {
      renderCharts();
    } catch (e) {
      console.warn("Chart re-render:", e);
    }
  }
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

function findTileSlot(tileId) {
  for (const slotKey of ["fullTop", "leftCol", "rightCol", "fullBottom"]) {
    const idx = currentLayout.slots[slotKey].indexOf(tileId);
    if (idx !== -1) {
      return { slotKey, idx };
    }
  }
  return null;
}

function moveTileToSlot(tileId, targetSlotKey, targetIdx = -1) {
  const current = findTileSlot(tileId);
  if (!current) return;

  // Remove from current slot
  currentLayout.slots[current.slotKey].splice(current.idx, 1);

  // Insert into target slot
  if (
    targetIdx === -1 ||
    targetIdx >= currentLayout.slots[targetSlotKey].length
  ) {
    currentLayout.slots[targetSlotKey].push(tileId);
  } else {
    currentLayout.slots[targetSlotKey].splice(targetIdx, 0, tileId);
  }

  persistDashboardLayout();
  applyDashboardLayout(currentLayout);
}

function initDashboardEditMode() {
  const toggleBtn = document.getElementById("toggleEditDashboard");
  const banner = document.getElementById("dashboardEditBanner");
  const saveBtn = document.getElementById("saveDashboardLayout");
  const resetBtn = document.getElementById("resetDashboardLayout");
  const resetHeaderBtn = document.getElementById("resetLayoutHeaderBtn");
  const editIcon = document.getElementById("editDashboardIcon");
  const editText = document.getElementById("editDashboardText");
  const allTiles = document.querySelectorAll(".dashboard-tile");

  // Apply saved layout on startup
  applyDashboardLayout(currentLayout);

  function isEditMode() {
    return document.body.classList.contains("dashboard-edit-mode");
  }

  function setEditMode(active) {
    if (active) {
      document.body.classList.add("dashboard-edit-mode");
      allTiles.forEach((tile) => tile.setAttribute("draggable", "true"));
      if (banner) banner.classList.remove("hidden");
      if (resetHeaderBtn) resetHeaderBtn.classList.remove("hidden");
      if (toggleBtn) {
        toggleBtn.classList.remove("btn-ghost");
        toggleBtn.classList.add("btn-primary");
      }
      if (editIcon) editIcon.textContent = "✓";
      if (editText) editText.textContent = "Done Editing";
      toast(
        "Edit Mode: Drag tiles by ⠿ Move to rearrange anywhere, or drag divider ⋮⋮ to resize columns.",
        "ok",
      );
    } else {
      document.body.classList.remove("dashboard-edit-mode");
      allTiles.forEach((tile) => tile.setAttribute("draggable", "false"));
      if (banner) banner.classList.add("hidden");
      if (resetHeaderBtn) resetHeaderBtn.classList.add("hidden");
      if (toggleBtn) {
        toggleBtn.classList.remove("btn-primary");
        toggleBtn.classList.add("btn-ghost");
      }
      if (editIcon) editIcon.textContent = "✏️";
      if (editText) editText.textContent = "Edit Dashboard";
      persistDashboardLayout();
      toast("Dashboard layout saved!", "ok");
    }
    window.dispatchEvent(new Event("resize"));
  }

  function resetToDefaultLayout() {
    currentLayout = JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
    localStorage.removeItem(STORAGE_LAYOUT_KEY);

    // Clear inline custom heights and widths on all tiles
    document.querySelectorAll(".dashboard-tile").forEach((tile) => {
      tile.style.height = "";
      tile.style.minHeight = "";
      tile.style.width = "";
    });

    applyDashboardLayout(currentLayout);
    toast("Dashboard layout and sizes reset to default!", "ok");
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      setEditMode(!isEditMode());
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      setEditMode(false);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetToDefaultLayout);
  }

  if (resetHeaderBtn) {
    resetHeaderBtn.addEventListener("click", resetToDefaultLayout);
  }

  // Column Presets on banner (50/50, 60/40, 67/33, 75/25)
  document.querySelectorAll(".col-preset-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const leftVal = Number(btn.getAttribute("data-left"));
      if (!leftVal) return;
      currentLayout.columns.leftPct = leftVal;
      currentLayout.columns.rightPct = Math.round((100 - leftVal) * 10) / 10;
      persistDashboardLayout();
      applyDashboardLayout(currentLayout);
    });
  });

  // Switch Column Button
  document.querySelectorAll(".switch-col-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tileId = btn.getAttribute("data-tile");
      const current = findTileSlot(tileId);
      if (!current) return;
      const targetSlot = current.slotKey === "leftCol" ? "rightCol" : "leftCol";
      moveTileToSlot(tileId, targetSlot);
      toast(
        `Moved ${getTileName(tileId)} to ${targetSlot === "leftCol" ? "Left Column" : "Right Column"}!`,
        "ok",
      );
    });
  });

  // Move Up Button
  document.querySelectorAll(".move-up-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tileId = btn.getAttribute("data-tile");
      const current = findTileSlot(tileId);
      if (!current || current.idx === 0) return;
      moveTileToSlot(tileId, current.slotKey, current.idx - 1);
      toast(`Moved ${getTileName(tileId)} up!`, "ok");
    });
  });

  // Move Down Button
  document.querySelectorAll(".move-down-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tileId = btn.getAttribute("data-tile");
      const current = findTileSlot(tileId);
      if (
        !current ||
        current.idx >= currentLayout.slots[current.slotKey].length - 1
      )
        return;
      moveTileToSlot(tileId, current.slotKey, current.idx + 1);
      toast(`Moved ${getTileName(tileId)} down!`, "ok");
    });
  });

  // Toggle Full Width Button
  document.querySelectorAll(".toggle-full-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tileId = btn.getAttribute("data-tile");
      const current = findTileSlot(tileId);
      if (!current) return;

      if (current.slotKey === "fullTop" || current.slotKey === "fullBottom") {
        moveTileToSlot(tileId, "leftCol");
        toast(`Moved ${getTileName(tileId)} to Column view!`, "ok");
      } else {
        moveTileToSlot(tileId, "fullTop");
        toast(`Set ${getTileName(tileId)} to Full-Width!`, "ok");
      }
    });
  });

  // Drag and Drop
  initTileDragAndDrop();

  // Setup Column Resizer
  setupDashboardColumnResizer();

  // Setup Height / Corner Resizers for each tile
  allTiles.forEach((tile) => {
    setupHeightResizers(tile.id);
  });
}

function initTileDragAndDrop() {
  let draggedId = null;
  const allTiles = document.querySelectorAll(".dashboard-tile");
  const dropContainers = document.querySelectorAll(
    ".dashboard-col, .dashboard-full-slot",
  );

  allTiles.forEach((tile) => {
    tile.addEventListener("dragstart", (e) => {
      if (!document.body.classList.contains("dashboard-edit-mode")) {
        e.preventDefault();
        return;
      }
      draggedId = tile.id;
      e.dataTransfer.setData("text/plain", tile.id);
      e.dataTransfer.effectAllowed = "move";
      tile.classList.add("tile-is-moving");
    });

    tile.addEventListener("dragover", (e) => {
      if (!document.body.classList.contains("dashboard-edit-mode")) return;
      if (draggedId && draggedId !== tile.id) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        tile.classList.add("tile-drop-target");
      }
    });

    tile.addEventListener("dragleave", () => {
      tile.classList.remove("tile-drop-target");
    });

    tile.addEventListener("dragend", () => {
      allTiles.forEach((t) => {
        t.classList.remove("tile-is-moving");
        t.classList.remove("tile-drop-target");
      });
      dropContainers.forEach((c) => c.classList.remove("tile-drop-target"));
      draggedId = null;
    });

    tile.addEventListener("drop", (e) => {
      if (!document.body.classList.contains("dashboard-edit-mode")) return;
      e.preventDefault();
      e.stopPropagation();
      tile.classList.remove("tile-drop-target");

      const sourceId = e.dataTransfer.getData("text/plain") || draggedId;
      const targetId = tile.id;

      if (sourceId && targetId && sourceId !== targetId) {
        const targetSlot = findTileSlot(targetId);
        if (targetSlot) {
          moveTileToSlot(sourceId, targetSlot.slotKey, targetSlot.idx);
          toast(`Moved ${getTileName(sourceId)}!`, "ok");
        }
      }
    });
  });

  // Drop onto container areas (empty column space or full width slot)
  dropContainers.forEach((container) => {
    container.addEventListener("dragover", (e) => {
      if (!document.body.classList.contains("dashboard-edit-mode")) return;
      e.preventDefault();
      container.classList.add("tile-drop-target");
    });

    container.addEventListener("dragleave", (e) => {
      if (e.target === container) {
        container.classList.remove("tile-drop-target");
      }
    });

    container.addEventListener("drop", (e) => {
      if (!document.body.classList.contains("dashboard-edit-mode")) return;
      e.preventDefault();
      container.classList.remove("tile-drop-target");

      const sourceId = e.dataTransfer.getData("text/plain") || draggedId;
      if (!sourceId) return;

      let targetSlotKey = "leftCol";
      if (container.id === "dashboardColRight") targetSlotKey = "rightCol";
      else if (container.id === "dashboardFullTop") targetSlotKey = "fullTop";
      else if (container.id === "dashboardFullBottom")
        targetSlotKey = "fullBottom";

      moveTileToSlot(sourceId, targetSlotKey);
      toast(`Moved ${getTileName(sourceId)}!`, "ok");
    });
  });
}

function setupDashboardColumnResizer() {
  const container = document.getElementById("dashboardColumns");
  const resizer = document.getElementById("dashboardColResizer");
  const colLeft = document.getElementById("dashboardColLeft");
  const colRight = document.getElementById("dashboardColRight");

  if (!container || !resizer || !colLeft || !colRight) return;

  let isDragging = false;
  let animFrameId = null;

  function onPointerDown(e) {
    if (!document.body.classList.contains("dashboard-edit-mode")) return;
    isDragging = true;
    resizer.classList.add("is-active");
    colLeft.classList.add("is-dragging");
    colRight.classList.add("is-dragging");
    document.body.classList.add("is-col-resizing");

    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
    document.addEventListener("touchmove", onPointerMove, { passive: false });
    document.addEventListener("touchend", onPointerUp);

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;

    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const totalWidth = rect.width;

      if (totalWidth <= 0) return;

      let pct = (relativeX / totalWidth) * 100;
      pct = Math.max(20, Math.min(80, pct));
      const leftPct = Math.round(pct * 10) / 10;
      const rightPct = Math.round((100 - leftPct) * 10) / 10;

      colLeft.style.width = `calc(${leftPct}% - 8px)`;
      colRight.style.width = `calc(${rightPct}% - 8px)`;

      currentLayout.columns.leftPct = leftPct;
      currentLayout.columns.rightPct = rightPct;

      // Update badges
      currentLayout.slots.leftCol.forEach((id) => {
        const badge = document.getElementById(`${id}Badge`);
        if (badge) badge.textContent = `Left Col • ${Math.round(leftPct)}%`;
      });
      currentLayout.slots.rightCol.forEach((id) => {
        const badge = document.getElementById(`${id}Badge`);
        if (badge) badge.textContent = `Right Col • ${Math.round(rightPct)}%`;
      });

      window.dispatchEvent(new Event("resize"));
    });

    if (e.cancelable) e.preventDefault();
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    resizer.classList.remove("is-active");
    colLeft.classList.remove("is-dragging");
    colRight.classList.remove("is-dragging");
    document.body.classList.remove("is-col-resizing");

    document.removeEventListener("mousemove", onPointerMove);
    document.removeEventListener("mouseup", onPointerUp);
    document.removeEventListener("touchmove", onPointerMove);
    document.removeEventListener("touchend", onPointerUp);

    persistDashboardLayout();
    window.dispatchEvent(new Event("resize"));
  }

  resizer.addEventListener("mousedown", onPointerDown);
  resizer.addEventListener("touchstart", onPointerDown, { passive: false });
}

function setupHeightResizers(tileId) {
  const tile = document.getElementById(tileId);
  if (!tile) return;

  const handles = tile.querySelectorAll(
    ".dashboard-row-resizer, .dashboard-corner-resizer",
  );

  handles.forEach((handle) => {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    let animFrame = null;

    function onStart(e) {
      if (!document.body.classList.contains("dashboard-edit-mode")) return;
      isResizing = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startHeight = tile.getBoundingClientRect().height;
      tile.classList.add("is-dragging");
      document.body.classList.add("is-row-resizing");

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);

      e.preventDefault();
    }

    function onMove(e) {
      if (!isResizing) return;
      const currentY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaY = currentY - startY;

      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        const newH = Math.max(
          240,
          Math.min(900, Math.round(startHeight + deltaY)),
        );
        tile.style.height = `${newH}px`;
        tile.style.minHeight = `${newH}px`;
        currentLayout.tileHeights[tileId] = newH;
        window.dispatchEvent(new Event("resize"));
      });

      if (e.cancelable) e.preventDefault();
    }

    function onEnd() {
      if (!isResizing) return;
      isResizing = false;
      tile.classList.remove("is-dragging");
      document.body.classList.remove("is-row-resizing");

      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);

      persistDashboardLayout();
      window.dispatchEvent(new Event("resize"));
    }

    handle.addEventListener("mousedown", onStart);
    handle.addEventListener("touchstart", onStart, { passive: false });
  });
}

function initRecentSalesFilters() {
  const container = $("#recentSalesFilterGroup");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".recent-sales-tab");
    if (!btn) return;
    recentSalesFilter = btn.dataset.filter || "all";

    container.querySelectorAll(".recent-sales-tab").forEach((b) => {
      if (b === btn) {
        b.className =
          "btn btn-xs px-2.5 py-1 text-xs rounded-lg recent-sales-tab btn-primary font-medium";
      } else {
        b.className =
          "btn btn-xs px-2.5 py-1 text-xs rounded-lg recent-sales-tab btn-ghost text-slate-300 hover:text-white";
      }
    });

    renderRecentSales();
  });
}

initChartDateControls();
initRecentSalesFilters();
initManualSaleModal();
initDashboardEditMode();
renderDemoControls();
startRunnerIfNeeded();

window.addEventListener("themechanged", () => {
  try {
    renderCharts();
  } catch (err) {
    console.warn("Theme chart refresh error:", err);
  }
});

window.addEventListener("beforeunload", () => {
  if (stopDemoRunner) clearInterval(stopDemoRunner);
  unsubs.forEach((unsub) => unsub?.());
});
