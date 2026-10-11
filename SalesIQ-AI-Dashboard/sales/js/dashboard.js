import {
  requireAuth,
  initAppShell,
  $,
  money,
  dateText,
  toDate,
  emptyState,
  badgeForStatus,
  statusFor,
  makeChart,
  toast,
  watchCollection,
  hideSkeletonLoader,
  convertFromINR,
  getCurrency,
} from "../../js/shared.js";
import {
  db,
  doc,
  updateDoc,
  onSnapshot,
  getDocs,
  collection,
} from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Sales Staff"]);
initAppShell("sales", "dashboard", profile);

let sales = [];
let products = [];
let currentAdminId = profile.adminId || null;

const STORAGE_LAYOUT_KEY = "salesiq_staff_dashboard_custom_layout";
const STORAGE_CHART_START_KEY = "salesiq_staff_chart_start";
const STORAGE_CHART_END_KEY = "salesiq_staff_chart_end";

let chartStartDate = localStorage.getItem(STORAGE_CHART_START_KEY) || "";
let chartEndDate = localStorage.getItem(STORAGE_CHART_END_KEY) || "";
let lastStartVal = "";
let lastEndVal = "";

function saleDate(sale) {
  if (!sale) return null;
  return toDate(sale.createdAt || sale.date || sale.timestamp);
}

function updateConnectionBadge() {
  const badge = $("#connectionBadge");
  if (!badge) return;
  if (currentAdminId) {
    badge.textContent = `Connected: ${profile.adminName || "Admin"}`;
    badge.className =
      "text-xs px-2 py-1 rounded-md bg-green-500/20 text-green-400";
  } else {
    badge.textContent = "Not Connected";
    badge.className =
      "text-xs px-2 py-1 rounded-md bg-slate-700 text-slate-300";
  }
}

function renderStats(mine) {
  const statsEl = $("#staffStats");
  if (!statsEl) return;
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = mine.filter(
    (sale) => saleDate(sale)?.toISOString().slice(0, 10) === today,
  );

  statsEl.innerHTML = [
    [
      "Today Sales",
      money(
        todaySales.reduce(
          (sum, sale) => sum + Number(sale.totalAmount || 0),
          0,
        ),
      ),
      `${todaySales.length} orders`,
    ],
    ["Orders Created", mine.length, "All time"],
    ["Assigned Products", products.length, "View only"],
    [
      "Performance",
      money(mine.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)),
      "Total revenue",
    ],
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

// ============================================================
// Date Range & Filtering Helpers
// ============================================================

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

function getFirstSaleDateStr(mine) {
  if (!mine || !mine.length) return null;
  let earliest = null;
  for (const s of mine) {
    const d = saleDate(s);
    if (!d) continue;
    if (!earliest || d < earliest) {
      earliest = d;
    }
  }
  return earliest ? toLocalYMD(earliest) : null;
}

function getLastSaleDateStr(mine) {
  if (!mine || !mine.length) return null;
  let latest = null;
  for (const s of mine) {
    const d = saleDate(s);
    if (!d) continue;
    if (!latest || d > latest) {
      latest = d;
    }
  }
  return latest ? toLocalYMD(latest) : null;
}

function getDefaultChartRange(mine) {
  const today = getTodayStr();
  const firstSale = getFirstSaleDateStr(mine);
  const lastSale = getLastSaleDateStr(mine);

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

function getEffectiveChartRange(mine) {
  const { defaultStart, defaultEnd } = getDefaultChartRange(mine);
  let start = (chartStartDate || "").trim();
  let end = (chartEndDate || "").trim();

  const hasCustomFilter = Boolean(start || end);

  if (start && end && end < start) {
    // Both explicitly set and end is earlier than start: normalize and sync memory/storage
    const temp = start;
    start = end;
    end = temp;
    chartStartDate = start;
    chartEndDate = end;
    try {
      localStorage.setItem(STORAGE_CHART_START_KEY, start);
      localStorage.setItem(STORAGE_CHART_END_KEY, end);
    } catch (_) {}
  } else if (start && !end) {
    // Only start set: avoid premature reverse swap if start is past defaultEnd
    end = start > defaultEnd ? start : defaultEnd;
  } else if (!start && end) {
    // Only end set: avoid premature forward swap if end is before defaultStart
    start = end < defaultStart ? end : defaultStart;
  } else if (!start && !end) {
    start = defaultStart;
    end = defaultEnd;
  }

  const isCustom =
    hasCustomFilter && (start !== defaultStart || end !== defaultEnd);

  return { start, end, defaultStart, defaultEnd, isCustom };
}

function renderChart(mine) {
  const range = getEffectiveChartRange(mine);
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
  mine.forEach((sale) => {
    const d = saleDate(sale);
    if (!d) return;
    const key = toLocalYMD(d);
    byDay[key] = (byDay[key] || 0) + Number(sale.totalAmount || 0);
  });

  const chartData = dateKeys.map((k) => convertFromINR(byDay[k] || 0));
  const chartLabels = dateKeys.map(formatShortDate);

  const totalPeriodSales = chartData.reduce((sum, val) => sum + val, 0);
  const totalPeriodOrders = mine.filter((s) => {
    const d = saleDate(s);
    if (!d) return false;
    const k = toLocalYMD(d);
    return k >= range.start && k <= range.end;
  }).length;

  const rangeTextEl = $("#staffChartRangeText");
  if (rangeTextEl) {
    const startTxt = formatFullDate(range.start);
    const endTxt = formatFullDate(range.end);
    const labelPrefix = range.isCustom ? "Custom range" : "Default";
    rangeTextEl.innerHTML = `${labelPrefix}: <b>${startTxt}</b> to <b>${endTxt}</b> • Total: <b class="text-emerald-400">${money(totalPeriodSales, getCurrency(), false)}</b> (${totalPeriodOrders} ${totalPeriodOrders === 1 ? "order" : "orders"})`;
  }

  makeChart(
    $("#staffChart"),
    "line",
    {
      labels: chartLabels,
      datasets: [
        {
          label: "My Sales",
          data: chartData,
          tension: 0.35,
          fill: true,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,.20)",
          pointBackgroundColor: "#22c55e",
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
            label: (item) => ` Sales: ${money(item.raw, getCurrency(), false)}`,
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
        y: {
          ticks: {
            callback: (val) => money(val, getCurrency(), false),
          },
        },
      },
    },
  );
}

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
      curD === 1 &&
      prevD === getDaysInMonth(prevY, prevM)
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

      const mine = sales.filter((sale) => sale.salespersonId === profile.id);
      const { defaultStart, defaultEnd } = getDefaultChartRange(mine);
      const currentEnd = chartEndDate || endEl?.value || defaultEnd;

      // If user selected the default range, reset to default mode
      if (chartStartDate === defaultStart && currentEnd === defaultEnd) {
        chartStartDate = "";
        chartEndDate = "";
        localStorage.removeItem(STORAGE_CHART_START_KEY);
        localStorage.removeItem(STORAGE_CHART_END_KEY);
      } else if (chartStartDate) {
        localStorage.setItem(STORAGE_CHART_START_KEY, chartStartDate);
      } else {
        localStorage.removeItem(STORAGE_CHART_START_KEY);
      }

      if (endEl && chartStartDate) {
        endEl.min = chartStartDate;
      }
      renderChart(mine);
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

      const mine = sales.filter((sale) => sale.salespersonId === profile.id);
      const { defaultStart, defaultEnd } = getDefaultChartRange(mine);
      const currentStart = chartStartDate || startEl?.value || defaultStart;

      // If user selected the default range, reset to default mode
      if (currentStart === defaultStart && chartEndDate === defaultEnd) {
        chartStartDate = "";
        chartEndDate = "";
        localStorage.removeItem(STORAGE_CHART_START_KEY);
        localStorage.removeItem(STORAGE_CHART_END_KEY);
      } else if (chartEndDate) {
        localStorage.setItem(STORAGE_CHART_END_KEY, chartEndDate);
      } else {
        localStorage.removeItem(STORAGE_CHART_END_KEY);
      }

      renderChart(mine);
    };

    endEl.addEventListener("change", () => handleEndChange());
    endEl.addEventListener("input", () => handleEndChange());
    attachKeyboardDateStepper(endEl, (newVal) => handleEndChange(newVal));
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      chartStartDate = "";
      chartEndDate = "";
      localStorage.removeItem(STORAGE_CHART_START_KEY);
      localStorage.removeItem(STORAGE_CHART_END_KEY);
      const mine = sales.filter((sale) => sale.salespersonId === profile.id);
      renderChart(mine);
      toast("Performance chart reset to default range");
    });
  }
}

function renderRecentSales(mine) {
  const recentEl = $("#staffRecentSales");
  if (!recentEl) return;

  const sortedMine = [...mine].sort((a, b) => {
    const da = toDate(a.createdAt);
    const db = toDate(b.createdAt);
    const ta = da ? da.getTime() : Date.now();
    const tb = db ? db.getTime() : Date.now();
    return tb - ta;
  });

  recentEl.innerHTML = sortedMine.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Product</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${sortedMine
              .slice(0, 6)
              .map(
                (sale) => `
              <tr>
                <td>${sale.invoiceNumber || "-"}</td>
                <td>${sale.productName || "-"}</td>
                <td>${money(sale.totalAmount)}</td>
                <td>${dateText(sale.createdAt)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : emptyState("No sales yet", "Create a sale from Add Sale.");
}

function renderStock() {
  const stockEl = $("#staffStock");
  if (!stockEl) return;

  const connectedProducts = currentAdminId ? products : [];

  stockEl.innerHTML = connectedProducts.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Available</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${connectedProducts
              .slice(0, 8)
              .map(
                (product) => `
              <tr>
                <td>${product.name}</td>
                <td>${money(product.price)}</td>
                <td>${product.stock || 0}</td>
                <td>${badgeForStatus(statusFor(product.stock, product.minStock))}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : emptyState(
        "No products",
        currentAdminId
          ? "Admin needs to add products."
          : "Accept an admin invitation to view products.",
      );
}

// ============================================================
// Resizable 2-Column Dashboard & Edit Mode Logic
// ============================================================

const DEFAULT_DASHBOARD_LAYOUT = {
  columns: {
    leftPct: 60,
    rightPct: 40,
  },
  slots: {
    fullTop: [],
    leftCol: ["staffChartTile"],
    rightCol: ["staffRecentSalesTile"],
    fullBottom: ["staffStockTile"],
  },
  tileHeights: {
    staffChartTile: null,
    staffRecentSalesTile: null,
    staffStockTile: null,
  },
};

let currentLayout = loadDashboardLayout();

function getTileName(id) {
  const names = {
    staffChartTile: "Performance Chart",
    staffRecentSalesTile: "Recent Sales",
    staffStockTile: "Basic Stock View",
  };
  return names[id] || "Tile";
}

function loadDashboardLayout() {
  const VALID_TILES = [
    "staffChartTile",
    "staffRecentSalesTile",
    "staffStockTile",
  ];
  try {
    const raw = localStorage.getItem(STORAGE_LAYOUT_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
    const parsed = JSON.parse(raw);
    const layout = JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));

    if (parsed.columns?.leftPct && !isNaN(parsed.columns.leftPct)) {
      const left = Math.max(20, Math.min(80, Number(parsed.columns.leftPct)));
      layout.columns.leftPct = left;
      layout.columns.rightPct = Math.round((100 - left) * 10) / 10;
    }

    if (parsed.slots && typeof parsed.slots === "object") {
      const seen = new Set();
      ["fullTop", "leftCol", "rightCol", "fullBottom"].forEach((slotKey) => {
        if (Array.isArray(parsed.slots[slotKey])) {
          layout.slots[slotKey] = parsed.slots[slotKey].filter((id) => {
            if (VALID_TILES.includes(id) && !seen.has(id)) {
              seen.add(id);
              return true;
            }
            return false;
          });
        } else {
          layout.slots[slotKey] = [];
        }
      });

      // Self-healing: if any valid tile was missing, place it in its default slot
      VALID_TILES.forEach((id) => {
        if (!seen.has(id)) {
          for (const defSlot of [
            "fullTop",
            "leftCol",
            "rightCol",
            "fullBottom",
          ]) {
            if (DEFAULT_DASHBOARD_LAYOUT.slots[defSlot].includes(id)) {
              layout.slots[defSlot].push(id);
              seen.add(id);
              break;
            }
          }
          if (!seen.has(id)) {
            layout.slots.leftCol.push(id);
          }
        }
      });
    }

    if (parsed.tileHeights && typeof parsed.tileHeights === "object") {
      layout.tileHeights = {};
      VALID_TILES.forEach((id) => {
        const h = Number(parsed.tileHeights[id]);
        if (h && h >= 200 && h <= 1200) {
          layout.tileHeights[id] = h;
        } else {
          layout.tileHeights[id] = null;
        }
      });
    }

    return layout;
  } catch (err) {
    console.warn("Could not parse staff dashboard layout:", err);
    return JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
  }
}

function persistDashboardLayout() {
  try {
    localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(currentLayout));
  } catch (err) {
    console.warn("Could not save staff dashboard layout:", err);
  }
}

function applyDashboardLayout(layout) {
  const containerTop = document.getElementById("dashboardFullTop");
  const containerLeft = document.getElementById("dashboardColLeft");
  const containerRight = document.getElementById("dashboardColRight");
  const containerBottom = document.getElementById("dashboardFullBottom");

  const leftPct = layout.columns?.leftPct ?? 60;
  const rightPct = layout.columns?.rightPct ?? 100 - leftPct;

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
    const tileIds = layout.slots?.[key] || [];
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
    "staffChartTile",
    "staffRecentSalesTile",
    "staffStockTile",
  ];

  allTileIds.forEach((id) => {
    const tile = document.getElementById(id);
    if (!tile) return;
    const h = layout.tileHeights?.[id];
    if (h && typeof h === "number") {
      tile.style.height = `${h}px`;
      tile.style.minHeight = `${h}px`;
      tile.style.flex = "0 0 auto";
    } else {
      tile.style.height = "";
      tile.style.minHeight = "";
      tile.style.flex = "";
    }
  });

  // Re-render chart
  try {
    const mine = sales.filter((sale) => sale.salespersonId === profile.id);
    renderChart(mine);
  } catch (e) {
    console.warn("Chart re-render:", e);
  }
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

function findTileSlot(tileId) {
  for (const slotKey of ["fullTop", "leftCol", "rightCol", "fullBottom"]) {
    const list = currentLayout.slots?.[slotKey];
    if (Array.isArray(list)) {
      const idx = list.indexOf(tileId);
      if (idx !== -1) {
        return { slotKey, idx };
      }
    }
  }
  return null;
}

function moveTileToSlot(tileId, targetSlotKey, targetIdx = -1) {
  const current = findTileSlot(tileId);
  if (!current) return;

  if (!Array.isArray(currentLayout.slots[targetSlotKey])) {
    currentLayout.slots[targetSlotKey] = [];
  }

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
      tile.style.flex = "";
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
    document.addEventListener("touchcancel", onPointerUp);

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX =
      e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    if (clientX === undefined || isNaN(clientX)) return;

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
    document.removeEventListener("touchcancel", onPointerUp);

    // Update column preset buttons active state
    document.querySelectorAll(".col-preset-btn").forEach((btn) => {
      const target = Number(btn.getAttribute("data-left"));
      if (Math.abs(target - currentLayout.columns.leftPct) <= 2) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

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
    if (handle._hasResizer) return;
    handle._hasResizer = true;

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    let animFrame = null;

    function onStart(e) {
      if (!document.body.classList.contains("dashboard-edit-mode")) return;
      isResizing = true;
      startY =
        e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
      startHeight = tile.getBoundingClientRect().height;
      tile.classList.add("is-dragging");
      document.body.classList.add("is-row-resizing");

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
      document.addEventListener("touchcancel", onEnd);

      e.preventDefault();
    }

    function onMove(e) {
      if (!isResizing) return;
      const currentY =
        e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
      if (currentY === undefined || isNaN(currentY)) return;
      const deltaY = currentY - startY;

      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        const newH = Math.max(
          240,
          Math.min(900, Math.round(startHeight + deltaY)),
        );
        tile.style.height = `${newH}px`;
        tile.style.minHeight = `${newH}px`;
        tile.style.flex = "0 0 auto";
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
      document.removeEventListener("touchcancel", onEnd);

      persistDashboardLayout();
      window.dispatchEvent(new Event("resize"));
    }

    handle.addEventListener("mousedown", onStart);
    handle.addEventListener("touchstart", onStart, { passive: false });
  });
}

function renderDashboard() {
  updateConnectionBadge();
  const mine = sales.filter((sale) => sale.salespersonId === profile.id);
  renderStats(mine);
  renderChart(mine);
  renderRecentSales(mine);
  renderStock();
  hideSkeletonLoader();
}

initChartDateControls();
initDashboardEditMode();

const unsubs = [
  watchCollection("sales", (rows) => {
    sales = rows;
    renderDashboard();
  }),
  watchCollection("products", (rows) => {
    products = rows;
    renderDashboard();
  }),
  onSnapshot(doc(db, "staff", profile.id), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentAdminId = data.adminId || null;
      profile.adminId = currentAdminId;
      profile.adminName = data.adminName || null;

      try {
        const local = JSON.parse(localStorage.getItem("salesiq_user") || "{}");
        if (local.adminId !== currentAdminId) {
          local.adminId = currentAdminId;
          local.adminName = profile.adminName;
          localStorage.setItem("salesiq_user", JSON.stringify(local));
        }
      } catch (_) {}

      if (!currentAdminId) {
        getDocs(collection(db, "admins"))
          .then((adminsSnap) => {
            if (adminsSnap.size === 1) {
              const singleAdmin = adminsSnap.docs[0];
              currentAdminId = singleAdmin.id;
              profile.adminId = singleAdmin.id;
              profile.adminName =
                singleAdmin.data().name || singleAdmin.data().email || "Admin";
              updateDoc(doc(db, "staff", profile.id), {
                adminId: singleAdmin.id,
                adminName: profile.adminName,
                adminEmail: singleAdmin.data().email || "",
                adminStatus: "connected",
              }).catch(() => {});
              try {
                const local = JSON.parse(
                  localStorage.getItem("salesiq_user") || "{}",
                );
                local.adminId = currentAdminId;
                local.adminName = profile.adminName;
                localStorage.setItem("salesiq_user", JSON.stringify(local));
              } catch (_) {}
              renderDashboard();
            }
          })
          .catch(() => {});
      }

      const pendingReq = data.pendingRequest;
      const banner = $("#staffInvitationBanner");

      if (pendingReq && pendingReq.status === "pending") {
        $("#staffInvitationText").textContent =
          `${pendingReq.adminName || "Admin"} (${pendingReq.adminEmail}) has invited you to join their staff team.`;
        banner.classList.remove("hidden");

        $("#acceptInviteBtn").onclick = async () => {
          try {
            await updateDoc(doc(db, "staff", profile.id), {
              adminId: pendingReq.adminId,
              adminName: pendingReq.adminName,
              adminEmail: pendingReq.adminEmail,
              adminStatus: "connected",
              pendingRequest: null,
            });
            profile.adminId = pendingReq.adminId;
            profile.adminName = pendingReq.adminName;
            try {
              const local = JSON.parse(
                localStorage.getItem("salesiq_user") || "{}",
              );
              local.adminId = pendingReq.adminId;
              local.adminName = profile.adminName;
              localStorage.setItem("salesiq_user", JSON.stringify(local));
            } catch (_) {}
            banner.classList.add("hidden");
            toast("Invitation accepted!");
            setTimeout(() => location.reload(), 400);
          } catch (e) {
            toast(e.message, "err");
          }
        };

        $("#rejectInviteBtn").onclick = async () => {
          try {
            await updateDoc(doc(db, "staff", profile.id), {
              pendingRequest: null,
            });
            banner.classList.add("hidden");
            toast("Invitation rejected");
          } catch (e) {
            toast(e.message, "err");
          }
        };
      } else {
        banner.classList.add("hidden");
      }

      renderDashboard();
    }
  }),
];

window.addEventListener("salesiq:cache-updated", (e) => {
  if (e.detail?.name === "sales" && Array.isArray(e.detail.data)) {
    sales = e.detail.data;
    renderDashboard();
  }
});

window.addEventListener("themechanged", () => {
  try {
    const mine = sales.filter((sale) => sale.salespersonId === profile.id);
    renderChart(mine);
  } catch (err) {
    console.warn("Theme chart refresh error:", err);
  }
});

window.addEventListener("beforeunload", () => {
  unsubs.forEach((unsub) => unsub?.());
});
