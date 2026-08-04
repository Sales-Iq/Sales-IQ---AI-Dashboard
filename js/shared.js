import {
  auth,
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  serverTimestamp,
  signOut,
  query,
  orderBy,
  onSnapshot,
} from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getAccountProfile, createAccountProfile } from "./account.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const num = (n) => Number(n || 0);
export const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export const money = (n, currency = getCurrency()) =>
  `${currency}${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export const dateText = (value) => {
  if (!value) return "-";

  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const onlyDate = (value) => {
  if (!value) return "-";

  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-IN", { dateStyle: "medium" });
};

export function toast(message, type = "ok") {
  const root = $("#toastRoot");
  if (!root) return alert(message);

  const box = document.createElement("div");
  box.className = `toast ${type === "err" ? "err" : "ok"}`;
  box.textContent = message;
  root.appendChild(box);

  setTimeout(() => box.remove(), 4200);
}

export function setBusy(btn, busy = true, text = "Saving...") {
  if (!btn) return;

  if (busy) {
    btn.dataset.oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-pulse">${text}</span>`;
    return;
  }

  btn.disabled = false;
  btn.innerHTML = btn.dataset.oldText || btn.innerHTML;
}

export function getCurrency() {
  return localStorage.getItem("salesiq_currency") || "₹";
}

export function getTheme() {
  return localStorage.getItem("salesiq_theme") || "dark";
}

export function applyTheme(theme = getTheme()) {
  document.body.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("light", theme === "light");
  localStorage.setItem("salesiq_theme", theme);
}

export function initSplash() {
  applyTheme();
  setTimeout(() => $("#splashScreen")?.classList.add("hidden"), 520);
}

export function initClickSpark() {
  const canvas = $("#clickSparkCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const sparks = [];

  const resize = () => {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  };

  resize();
  window.addEventListener("resize", resize);

  document.addEventListener("click", (e) => {
    const count = 10;
    const now = performance.now();

    for (let i = 0; i < count; i++) {
      sparks.push({
        x: e.clientX,
        y: e.clientY,
        angle: (Math.PI * 2 * i) / count,
        start: now,
      });
    }
  });

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      const p = Math.min((t - s.start) / 480, 1);

      if (p >= 1) {
        sparks.splice(i, 1);
        continue;
      }

      const eased = p * (2 - p);
      const dist = eased * 24;
      const len = 12 * (1 - eased);
      const x1 = s.x + dist * Math.cos(s.angle);
      const y1 = s.y + dist * Math.sin(s.angle);
      const x2 = s.x + (dist + len) * Math.cos(s.angle);
      const y2 = s.y + (dist + len) * Math.sin(s.angle);

      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = document.body.classList.contains("light")
        ? "#0ea5e9"
        : "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

const adminLinks = [
  ["dashboard", "Dashboard", "dashboard.html", "📊"],
  ["products", "Products", "products.html", "📦"],
  ["batches", "Batch Management", "batches.html", "📋"],
  ["inventory", "Inventory", "inventory.html", "🏬"],
  ["sales", "Sales Records", "sales.html", "🧾"],
  ["add-sale", "Billing", "add-sale.html", "💳"],
  ["forecasting", "Forecasting", "forecasting.html", "🔮"],
  ["ai-insights", "AI Insights", "ai-insights.html", "🤖"],
  ["analytics", "Analytics", "analytics.html", "📈"],
  ["customers", "Customers", "customers.html", "👥"],
  ["suppliers", "Suppliers", "suppliers.html", "🚚"],
  ["purchases", "Restock", "purchases.html", "➕"],
  ["disposals", "Disposals", "disposals.html", "🗑️"],
  ["reports", "Reports", "reports.html", "📄"],
  ["users", "Admin & Staff", "users.html", "🛡️"],
  ["notifications", "Notifications", "notifications.html", "🔔"],
  ["settings", "Settings", "settings.html", "⚙️"],
];

const staffLinks = [
  ["dashboard", "Dashboard", "dashboard.html", "📊"],
  ["add-sale", "Add Sale", "add-sale.html", "💳"],
  ["my-sales", "My Sales", "my-sales.html", "🧾"],
  ["stock-view", "Stock View", "stock-view.html", "📦"],
];

function initials(name = "User") {
  return (
    name
      .split(" ")
      .map((x) => x[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export function initAppShell(
  role = "admin",
  active = "dashboard",
  profile = {},
) {
  const links = role === "sales" ? staffLinks : adminLinks;
  const sidebar = $("#appSidebar");

  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-mark">SIQ</div>
        <div>
          <div class="font-black text-xl tracking-tight">SalesIQ</div>
          <div class="text-xs text-slate-400 font-bold">
            ${role === "sales" ? "Sales Staff" : "Admin"} Workspace
          </div>
        </div>
      </div>
      <nav>
        ${links
          .map(
            ([key, label, href, icon]) => `
          <a class="nav-link ${active === key ? "active" : ""}" href="${href}">
            <span>${icon}</span>
            <span>${label}</span>
          </a>
        `,
          )
          .join("")}
      </nav>
      <div class="mt-4 p-3 glass rounded-2xl">
        <div class="text-xs text-slate-400 font-bold">Logged in</div>
        <div class="font-black truncate">${profile.name || profile.email || "User"}</div>
        <a href="../profile.html" class="text-sky-300 text-sm font-bold hover:underline">Open Profile</a>
      </div>
    `;
  }

  const header = $("#appHeader");
  if (header) {
    header.innerHTML = `
      <div class="header-inner">
        <div class="flex items-center gap-3">
          <button id="sidebarToggle" class="mobile-menu-btn btn btn-ghost btn-sm">☰</button>
          <div>
            <div class="text-sm text-slate-400 font-bold">
              ${new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <h1 class="text-xl md:text-2xl font-black tracking-tight">
              ${document.title.replace("SalesIQ - ", "")}
            </h1>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="themeToggle" class="btn btn-ghost btn-sm">
            ${getTheme() === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <a class="btn btn-ghost btn-sm hide-mobile" href="../profile.html">
            <span class="w-7 h-7 rounded-full bg-sky-500/25 grid place-items-center">
              ${initials(profile.name || profile.email)}
            </span>
            Profile
          </a>
          <button id="logoutBtn" class="btn btn-danger btn-sm">Logout</button>
        </div>
      </div>
    `;
  }

  $("#sidebarToggle")?.addEventListener("click", () => {
    $("#appSidebar")?.classList.toggle("open");
  });

  $("#themeToggle")?.addEventListener("click", () => {
    const next = getTheme() === "light" ? "dark" : "light";
    applyTheme(next);
    $("#themeToggle").textContent = next === "light" ? "🌙 Dark" : "☀️ Light";
  });

  $("#logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth);
    location.href = "../login.html";
  });
}

export async function requireAuth(
  allowed = ["Admin", "Manager", "Sales Staff"],
) {
  return new Promise((resolve) => {
    let settled = false;
    const failSafeRole = () =>
      location.pathname.includes("/sales/") ? "Sales Staff" : "Admin";

    onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          location.href =
            location.pathname.includes("/admin/") ||
            location.pathname.includes("/sales/")
              ? "../login.html"
              : "login.html";
          return;
        }

        let profile = {
          id: user.uid,
          name: user.displayName || "User",
          email: user.email,
          role: failSafeRole(),
          status: "active",
          accountCollection:
            failSafeRole() === "Sales Staff" ? "staff" : "admins",
          photoURL: user.photoURL || "",
        };

        try {
          const accountProfile = await getAccountProfile(user);
          profile = accountProfile
            ? { id: user.uid, ...accountProfile }
            : { ...profile, role: "Sales Staff", accountCollection: "staff" };

          if (!accountProfile) {
            await createAccountProfile(user, profile).catch((err) =>
              console.warn("Could not create account profile:", err),
            );
          }
        } catch (err) {
          console.warn(
            "Could not read account profile. Check Firestore rules.",
            err,
          );
          setTimeout(() => {
            toast(
              "Firestore permission/config issue. Publish firestore-rules.txt in Firebase if data does not load.",
              "err",
            );
          }, 800);
        }

        if (profile.status === "inactive") {
          await signOut(auth);
          location.href =
            location.pathname.includes("/admin/") ||
            location.pathname.includes("/sales/")
              ? "../login.html?inactive=1"
              : "login.html?inactive=1";
          return;
        }

        if (!allowed.includes(profile.role)) {
          location.href =
            profile.role === "Sales Staff"
              ? "../sales/dashboard.html"
              : "../admin/dashboard.html";
          return;
        }

        localStorage.setItem("salesiq_user", JSON.stringify(profile));
        settled = true;
        resolve({ user, profile });
      },
      (err) => {
        console.warn("Auth state error:", err);
        if (!settled) {
          const profile = JSON.parse(
            localStorage.getItem("salesiq_user") || "{}",
          );
          resolve({
            user: null,
            profile: {
              name: "User",
              email: "",
              role: failSafeRole(),
              status: "active",
              ...profile,
            },
          });
        }
      },
    );

    setTimeout(() => {
      if (!settled && auth.currentUser) {
        const user = auth.currentUser;
        const profile = {
          id: user.uid,
          name: user.displayName || "User",
          email: user.email,
          role: failSafeRole(),
          status: "active",
          accountCollection:
            failSafeRole() === "Sales Staff" ? "staff" : "admins",
          photoURL: user.photoURL || "",
        };
        resolve({ user, profile });
      }
    }, 4500);
  });
}

export async function fetchAll(name, sorted = true) {
  try {
    const ref = sorted
      ? query(collection(db, name), orderBy("createdAt", "desc"))
      : collection(db, name);
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn(`Primary fetch failed for ${name}:`, e);

    try {
      const snap = await getDocs(collection(db, name));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn(
        `Firestore read failed for ${name}. Returning empty list.`,
        err,
      );
      setTimeout(
        () => toast(`Could not read ${name}. Check Firestore rules.`, "err"),
        700,
      );
      return [];
    }
  }
}

export function watchCollection(name, callback, sorted = true) {
  const makeRef = () =>
    sorted
      ? query(collection(db, name), orderBy("createdAt", "desc"))
      : collection(db, name);
  const mapDocs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  try {
    return onSnapshot(
      makeRef(),
      (snap) => callback(mapDocs(snap)),
      (err) => {
        console.warn(`Realtime listener failed for ${name}:`, err);
        fetchAll(name, sorted).then(callback);
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
    fetchAll(name, sorted).then(callback);
    return () => {};
  }
}

export function statusFor(stock, minStock) {
  stock = Number(stock || 0);
  minStock = Number(minStock || 0);

  if (stock <= 0) return "Out of Stock";
  if (stock <= minStock) return "Low Stock";
  return "Available";
}

export function badgeForStatus(status) {
  const s = status || "Available";

  if (s === "Out of Stock")
    return '<span class="badge badge-danger">● Out of Stock</span>';
  if (s === "Low Stock")
    return '<span class="badge badge-warn">● Low Stock</span>';
  if (s === "inactive")
    return '<span class="badge badge-danger">Inactive</span>';
  if (s === "active") return '<span class="badge badge-ok">Active</span>';

  return '<span class="badge badge-ok">● Available</span>';
}

export function getBatchStatus(batch) {
  const today = new Date().toISOString().slice(0, 10);
  
  if (batch.status === "Disposed" || batch.status === "Empty") {
    return batch.status;
  }
  
  if (!batch.expiryDate) {
    return "Active";
  }
  
  if (batch.expiryDate < today) {
    return "Expired";
  }
  
  const todayDate = new Date(`${today}T00:00:00`);
  const expiryDate = new Date(`${batch.expiryDate}T00:00:00`);
  const daysLeft = Math.ceil((expiryDate.getTime() - todayDate.getTime()) / 86400000);
  
  if (daysLeft <= 7) {
    return "Critical Expiry";
  }
  if (daysLeft <= 30) {
    return "Near Expiry";
  }
  if (daysLeft <= 90) {
    return "Upcoming Expiry";
  }
  
  return "Active";
}

export function badgeForBatchStatus(status) {
  switch (status) {
    case "Expired":
      return '<span class="badge badge-danger">Expired</span>';
    case "Critical Expiry":
      return '<span class="badge badge-danger">Critical Expiry (≤7 days)</span>';
    case "Near Expiry":
      return '<span class="badge badge-warn">Near Expiry (≤30 days)</span>';
    case "Upcoming Expiry":
      return '<span class="badge badge-info">Upcoming Expiry (≤90 days)</span>';
    case "Disposed":
      return '<span class="badge badge-danger">Disposed</span>';
    case "Empty":
      return '<span class="badge badge-warn">Empty</span>';
    default:
      return '<span class="badge badge-ok">Active</span>';
  }
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

export function getFEFOBatches(productId, batches, quantity) {
  const productBatches = batches
    .filter(b => b.productId === productId)
    .filter(b => {
      const status = getBatchStatus(b);
      return status !== "Expired" && status !== "Disposed" && status !== "Empty" && (b.remainingQuantity || 0) > 0;
    })
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return a.expiryDate.localeCompare(b.expiryDate);
    });
  
  const selected = [];
  let remainingQty = quantity;
  
  for (const batch of productBatches) {
    if (remainingQty <= 0) break;
    const available = Number(batch.remainingQuantity || 0);
    const take = Math.min(available, remainingQty);
    selected.push({ batch, quantity: take });
    remainingQty -= take;
  }
  
  return { selected, remainingQty, totalAvailable: productBatches.reduce((sum, b) => sum + Number(b.remainingQuantity || 0), 0) };
}

export function isBlockedForSale(product, batches) {
  if (!batches || !batches.length) return true;
  const productBatches = batches.filter(b => b.productId === product.id);
  const availableBatches = productBatches.filter(b => {
    const status = getBatchStatus(b);
    return status !== "Expired" && status !== "Disposed" && status !== "Empty" && (b.remainingQuantity || 0) > 0;
  });
  return availableBatches.length === 0;
}

export function getProductBatchInfo(product, batches) {
  const productBatches = batches.filter(b => b.productId === product.id);
  const activeBatches = productBatches.filter(b => {
    const status = getBatchStatus(b);
    return status !== "Disposed" && status !== "Empty";
  });
  
  const totalStock = activeBatches.reduce((sum, b) => sum + Number(b.remainingQuantity || 0), 0);
  const expiredCount = productBatches.filter(b => getBatchStatus(b) === "Expired").length;
  const nearExpiryCount = productBatches.filter(b => {
    const s = getBatchStatus(b);
    return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
  }).length;
  
  return { totalStock, expiredCount, nearExpiryCount, activeBatches, allBatches: productBatches };
}

export function emptyState(
  title = "No data yet",
  text = "Add data to see it here.",
) {
  return `<div class="empty-state"><strong>${title}</strong><span>${text}</span></div>`;
}

export function toCSV(rows, filename = "salesiq-report.csv") {
  if (!rows.length) return toast("No data available to export.", "err");

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => `"${String(r[h] ?? "").replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadJSON(obj, filename = "salesiq-data.json") {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function mergeChartOptions(type, options = {}) {
  const textColor = getTheme() === "light" ? "#0f172a" : "#e2e8f0";
  const tickColor = getTheme() === "light" ? "#334155" : "#cbd5e1";
  const gridColor = "rgba(148,163,184,.12)";
  const isRoundChart = type === "pie" || type === "doughnut";

  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 900,
      easing: "easeOutQuart",
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: {
        labels: {
          color: textColor,
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: "rgba(15,23,42,.94)",
        titleColor: "#ffffff",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(148,163,184,.22)",
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: isRoundChart
      ? {}
      : {
          x: {
            ticks: { color: tickColor },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: tickColor },
            grid: { color: gridColor },
          },
        },
  };

  return {
    ...base,
    ...options,
    plugins: {
      ...base.plugins,
      ...(options.plugins || {}),
    },
    scales: isRoundChart
      ? {}
      : {
          ...base.scales,
          ...(options.scales || {}),
        },
  };
}

function normalizeDatasets(datasets = []) {
  return datasets.map((dataset) => ({
    borderWidth: dataset.borderWidth ?? 2,
    pointRadius: dataset.pointRadius ?? 3,
    pointHoverRadius: dataset.pointHoverRadius ?? 5,
    ...dataset,
  }));
}

export function makeChart(canvas, type, data, options = {}) {
  if (!canvas || !window.Chart) return null;

  const nextData = {
    labels: data?.labels || [],
    datasets: normalizeDatasets(data?.datasets || []),
  };
  const nextOptions = mergeChartOptions(type, options);

  if (canvas._chart && canvas._chart.config.type === type) {
    canvas._chart.data.labels = nextData.labels;
    canvas._chart.data.datasets = nextData.datasets;
    canvas._chart.options = nextOptions;
    canvas._chart.update();
    return canvas._chart;
  }

  if (canvas._chart) canvas._chart.destroy();

  canvas._chart = new Chart(canvas, {
    type,
    data: nextData,
    options: nextOptions,
  });

  return canvas._chart;
}

export async function createNotification(message, type = "info") {
  await addDoc(collection(db, "notifications"), {
    message,
    type,
    read: false,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}

export async function checkAndCreateBatchAlerts() {
  try {
    const products = await fetchAll("products");
    const batches = await fetchAll("productBatches");
    
    for (const batch of batches) {
      const product = products.find(p => p.id === batch.productId);
      if (!product) continue;
      
      const status = getBatchStatus(batch);
      const lastAlertKey = `batchAlert_${batch.id}_${status}`;
      const lastAlert = localStorage.getItem(lastAlertKey);
      const now = Date.now();
      
      if (status === "Expired" && (!lastAlert || now - Number(lastAlert) > 86400000)) {
        await createNotification(
          `⚠ EXPIRED: ${product.name} (Batch: ${batch.batchNumber}) expired on ${formatDate(batch.expiryDate)}. Cannot be sold.`,
          "stock"
        );
        localStorage.setItem(lastAlertKey, now.toString());
      } else if (status === "Critical Expiry" && (!lastAlert || now - Number(lastAlert) > 86400000)) {
        await createNotification(
          `🔥 CRITICAL EXPIRY (≤7 days): ${product.name} (Batch: ${batch.batchNumber}) expires on ${formatDate(batch.expiryDate)}. Priority sell or dispose!`,
          "stock"
        );
        localStorage.setItem(lastAlertKey, now.toString());
      } else if (status === "Near Expiry" && (!lastAlert || now - Number(lastAlert) > 86400000)) {
        await createNotification(
          `⚡ NEAR EXPIRY (≤30 days): ${product.name} (Batch: ${batch.batchNumber}) expires on ${formatDate(batch.expiryDate)}. Consider discounting.`,
          "stock"
        );
        localStorage.setItem(lastAlertKey, now.toString());
      } else if (status === "Empty" && (!lastAlert || now - Number(lastAlert) > 86400000)) {
        await createNotification(
          `📦 EMPTY BATCH: ${product.name} (Batch: ${batch.batchNumber}) is now empty.`,
          "stock"
        );
        localStorage.setItem(lastAlertKey, now.toString());
      }
    }
    
    for (const product of products) {
      if (product.stock <= product.minStock) {
        const key = `productAlert_${product.id}_lowstock`;
        const lastAlert = localStorage.getItem(key);
        if (!lastAlert || now - Number(lastAlert) > 86400000) {
          await createNotification(
            `📉 LOW STOCK: ${product.name} has ${product.stock} units (min: ${product.minStock}).`,
            "stock"
          );
          localStorage.setItem(key, now.toString());
        }
      }
    }
  } catch (err) {
    console.warn("Batch alert check failed:", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initSplash();
  initClickSpark();
  
  setTimeout(() => {
    checkAndCreateBatchAlerts();
  }, 3000);
  
  setInterval(() => {
    checkAndCreateBatchAlerts();
  }, 300000);
});
