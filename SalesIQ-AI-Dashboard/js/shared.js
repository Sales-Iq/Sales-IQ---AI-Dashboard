import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  signOut,
  query,
  where,
  orderBy,
  onSnapshot,
} from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getAccountProfile, createAccountProfile } from "./account.js";
import {
  idbGet,
  idbSet,
  idbMarkStale,
  idbDelete,
  idbClear,
} from "./idb-cache.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const num = (n) => Number(n || 0);
export const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Currency & Real-Time Exchange Rate Engine (Base Currency: INR ₹)
// ─────────────────────────────────────────────────────────────────────────────
export const CURRENCY_CONFIG = {
  INR: { code: "INR", symbol: "₹", locale: "en-IN", defaultRate: 1 },
  "₹": { code: "INR", symbol: "₹", locale: "en-IN", defaultRate: 1 },

  USD: { code: "USD", symbol: "$", locale: "en-US", defaultRate: 0.01032 },
  "$": { code: "USD", symbol: "$", locale: "en-US", defaultRate: 0.01032 },

  EUR: { code: "EUR", symbol: "€", locale: "en-IE", defaultRate: 0.00922 },
  "€": { code: "EUR", symbol: "€", locale: "en-IE", defaultRate: 0.00922 },

  GBP: { code: "GBP", symbol: "£", locale: "en-GB", defaultRate: 0.00781 },
  "£": { code: "GBP", symbol: "£", locale: "en-GB", defaultRate: 0.00781 },

  AED: { code: "AED", symbol: "AED ", locale: "en-AE", defaultRate: 0.0379 },

  CAD: { code: "CAD", symbol: "CA$ ", locale: "en-CA", defaultRate: 0.0147 },

  AUD: { code: "AUD", symbol: "A$ ", locale: "en-AU", defaultRate: 0.0148 },

  SGD: { code: "SGD", symbol: "SG$ ", locale: "en-SG", defaultRate: 0.0132 },
};

export const FALLBACK_INR_RATES = {
  INR: 1,
  "₹": 1,
  USD: 0.01032,
  "$": 0.01032,
  EUR: 0.00922,
  "€": 0.00922,
  GBP: 0.00781,
  "£": 0.00781,
  AED: 0.0379,
  CAD: 0.0147,
  AUD: 0.0148,
  SGD: 0.0132,
};

let _liveExchangeRates = null;
try {
  const cached = localStorage.getItem("salesiq_inr_exchange_rates");
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed && parsed.rates) {
      _liveExchangeRates = parsed.rates;
    }
  }
} catch (_) {}

export async function syncLiveExchangeRates() {
  try {
    const raw = localStorage.getItem("salesiq_inr_exchange_rates");
    if (raw) {
      const parsed = JSON.parse(raw);
      // Re-fetch every 6 hours (21,600,000 ms)
      if (parsed?.ts && Date.now() - parsed.ts < 21600000 && parsed?.rates) {
        _liveExchangeRates = parsed.rates;
        return _liveExchangeRates;
      }
    }

    const res = await fetch("https://open.er-api.com/v6/latest/INR");
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        _liveExchangeRates = data.rates;
        try {
          localStorage.setItem(
            "salesiq_inr_exchange_rates",
            JSON.stringify({ ts: Date.now(), rates: data.rates }),
          );
        } catch (_) {}
        return _liveExchangeRates;
      }
    }
  } catch (err) {
    console.warn("Could not sync live exchange rates, using fallback:", err);
  }
  return _liveExchangeRates;
}

export function getCurrency() {
  const now = Date.now();
  if (getCurrency._cached == null || now - (getCurrency._ts || 0) > 1000) {
    try {
      getCurrency._cached = localStorage.getItem("salesiq_currency") || "₹";
    } catch (_) {
      getCurrency._cached = "₹";
    }
    getCurrency._ts = now;
  }
  return getCurrency._cached;
}

try {
  window.addEventListener("storage", (e) => {
    if (e.key === "salesiq_currency") {
      getCurrency._cached = e.newValue || "₹";
      getCurrency._ts = Date.now();
    }
  });
  window.addEventListener("salesiq:currency-changed", (e) => {
    if (e.detail?.currency) {
      getCurrency._cached = e.detail.currency;
      getCurrency._ts = Date.now();
    }
  });
} catch (_) {}

export function getExchangeRate(targetCurrency = getCurrency()) {
  const clean = String(targetCurrency || "₹").trim();
  if (clean === "₹" || clean === "INR") return 1;

  const cfg = CURRENCY_CONFIG[clean];
  const code = cfg?.code || clean.toUpperCase();

  if (_liveExchangeRates && typeof _liveExchangeRates[code] === "number") {
    return _liveExchangeRates[code];
  }

  try {
    const stored = JSON.parse(
      localStorage.getItem("salesiq_inr_exchange_rates") || "null",
    );
    if (stored?.rates?.[code]) {
      if (!_liveExchangeRates) _liveExchangeRates = stored.rates;
      return stored.rates[code];
    }
  } catch (_) {}

  if (cfg?.defaultRate) return cfg.defaultRate;
  if (FALLBACK_INR_RATES[clean]) return FALLBACK_INR_RATES[clean];
  if (FALLBACK_INR_RATES[code]) return FALLBACK_INR_RATES[code];

  return 1;
}

export function convertFromINR(amountInRupees, targetCurrency = getCurrency()) {
  const clean = String(targetCurrency || "₹").trim();
  if (clean === "₹" || clean === "INR") return Number(amountInRupees || 0);
  const rate = getExchangeRate(clean);
  return Number(amountInRupees || 0) * rate;
}

export function money(n, currency = getCurrency(), convert = true) {
  const clean = String(currency || "₹").trim();
  const cfg = CURRENCY_CONFIG[clean] || {
    symbol: clean,
    locale: "en-IN",
    defaultRate: 1,
  };

  const val = convert ? convertFromINR(n, clean) : Number(n || 0);

  const formatted = Math.abs(val).toLocaleString(cfg.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = val < 0 ? "-" : "";
  return `${sign}${cfg.symbol}${formatted}`;
}

export async function syncTenantCurrency(tenantId = null, force = false) {
  try {
    const tid = tenantId || getActiveTenantId();
    if (!tid || tid === "__ALL__") return;

    if (!force) {
      const rawStored = localStorage.getItem(
        `salesiq_business_settings_${tid}`,
      );
      if (rawStored) {
        try {
          const cached = JSON.parse(rawStored);
          const age = Date.now() - (cached._cachedAt || 0);
          if (age < 300000) {
            if (cached.currency) {
              getCurrency._cached = cached.currency;
              getCurrency._ts = Date.now();
            }
            return;
          }
        } catch (_) {}
      }
    }

    let sSnap = await getDoc(doc(db, "businessSettings", tid));
    if (!sSnap.exists()) {
      sSnap = await getDoc(doc(db, "businessSettings", "main"));
    }

    if (sSnap.exists()) {
      const data = sSnap.data() || {};
      const currency = data.currency;
      if (currency) {
        localStorage.setItem("salesiq_currency", currency);
        getCurrency._cached = currency;
        getCurrency._ts = Date.now();
      }
      if (data.businessName)
        localStorage.setItem("salesiq_business_name", data.businessName);
      if (data.logoUrl)
        localStorage.setItem("salesiq_business_logo", data.logoUrl);
      if (data.taxPercent !== undefined)
        localStorage.setItem("salesiq_tax_percent", data.taxPercent);
      if (data.invoicePrefix)
        localStorage.setItem("salesiq_invoice_prefix", data.invoicePrefix);
      localStorage.setItem(
        `salesiq_business_settings_${tid}`,
        JSON.stringify({ ...data, _cachedAt: Date.now() }),
      );
    }
  } catch (err) {
    console.warn("Could not sync tenant currency:", err);
  } finally {
    syncLiveExchangeRates().catch(() => {});
  }
}


// Accepts Firestore Timestamp, serialized Timestamp object {seconds, nanoseconds}, Date, ISO string or millis. Returns Date or null.
export const toDate = (value) => {
  if (!value) return null;
  try {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value?.toDate === "function") {
      const d = value.toDate();
      return d && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (typeof value === "object") {
      const sec =
        typeof value.seconds === "number"
          ? value.seconds
          : typeof value._seconds === "number"
            ? value._seconds
            : null;
      if (sec !== null) {
        const d = new Date(sec * 1000);
        return !Number.isNaN(d.getTime()) ? d : null;
      }
    }
    if (typeof value === "number") {
      const d = new Date(value);
      return !Number.isNaN(d.getTime()) ? d : null;
    }
    if (typeof value === "string") {
      const d = new Date(value);
      return !Number.isNaN(d.getTime()) ? d : null;
    }
    const d = new Date(value);
    return d && !Number.isNaN(d.getTime()) ? d : null;
  } catch (_) {
    return null;
  }
};

export const dateText = (value) => {
  if (!value) return "-";
  const d = toDate(value);
  if (!d) {
    if (typeof value === "object") return "Just now";
    return "-";
  }

  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const onlyDate = (value) => {
  if (!value) return "-";
  const d = toDate(value);
  if (!d) {
    if (typeof value === "object") {
      return new Date().toLocaleDateString("en-IN", { dateStyle: "medium" });
    }
    return "-";
  }

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


export function getTheme() {
  return localStorage.getItem("salesiq_theme") || "dark";
}

export function updateThemeToggleUI(theme = getTheme()) {
  const isLight = theme === "light";
  const icon = isLight ? "🌙" : "☀️";
  const label = isLight ? "Dark" : "Light";

  const mainBtn = document.getElementById("themeToggle");
  if (mainBtn) {
    mainBtn.innerHTML = `<span class="theme-toggle-spin">${icon}</span> ${label}`;
  }

  const fallbackBtn = document.getElementById("fallbackThemeToggle");
  if (fallbackBtn) {
    fallbackBtn.innerHTML = `<span class="theme-toggle-spin">${icon}</span> ${label}`;
  }

  const profileBtn = document.getElementById("profileTheme");
  if (profileBtn) {
    profileBtn.innerHTML = `<span class="theme-toggle-spin">${icon}</span> ${isLight ? "Switch to Dark" : "Switch to Light"}`;
  }
}

export function applyTheme(theme = getTheme(), dispatchEvent = true) {
  document.body.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("light", theme === "light");
  localStorage.setItem("salesiq_theme", theme);
  if (dispatchEvent) {
    window.dispatchEvent(
      new CustomEvent("salesiq:theme-changed", { detail: { theme } }),
    );
  }
}

/**
 * Ultra-fast zero-allocation theme color sync for active Chart.js instances.
 * Uses chart.update('none') to repaint canvas pixels in 0ms synchronously
 * with NO animation frames scheduled, ensuring the view transition snapshot
 * is captured with pristine light/dark colors while consuming 0 background CPU.
 */
export function syncChartThemeColors(isLight) {
  if (typeof window === "undefined" || !window.Chart) return;
  const textColor = isLight ? "#0f172a" : "#e2e8f0";
  const tickColor = isLight ? "#1e293b" : "#cbd5e1";
  const gridColor = isLight
    ? "rgba(15, 23, 42, 0.08)"
    : "rgba(148, 163, 184, 0.12)";

  const instances = window.Chart.instances;
  if (!instances) return;

  Object.values(instances).forEach((chart) => {
    try {
      if (!chart || chart.destroyed) return;

      if (chart.options?.scales) {
        Object.values(chart.options.scales).forEach((scale) => {
          if (scale?.ticks) scale.ticks.color = tickColor;
          if (scale?.grid) scale.grid.color = gridColor;
        });
      }

      if (chart.options?.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = textColor;
      }

      if (Array.isArray(chart.data?.datasets)) {
        chart.data.datasets.forEach((ds) => {
          if (ds._themeColor === "primary" || ds.label === "Sales") {
            ds.borderColor = isLight ? "#0284c7" : "#38bdf8";
            ds.backgroundColor = isLight
              ? "rgba(2, 132, 199, 0.20)"
              : "rgba(56, 189, 248, 0.20)";
            ds.pointBackgroundColor = ds.borderColor;
          } else if (ds._themeColor === "purple" || ds.label === "Stock") {
            ds.borderColor = isLight ? "#7c3aed" : "#a78bfa";
            ds.backgroundColor = isLight
              ? "rgba(124, 58, 237, 0.45)"
              : "rgba(167, 139, 250, 0.55)";
          }
        });
      }

      chart.update("none");
    } catch (_) {}
  });
}

/**
 * Kerfa-style Circular Expanding Wave Theme Transition
 * Uses the native View Transitions API to seamlessly expand the new theme
 * in a circular ripple originating directly from the user's cursor / button.
 */
export async function toggleThemeWithWave(event) {
  const current = getTheme();
  const next = current === "light" ? "dark" : "light";

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fallback if browser doesn't support View Transitions or prefers reduced motion
  if (
    typeof document === "undefined" ||
    !document.startViewTransition ||
    prefersReduced
  ) {
    applyTheme(next);
    updateThemeToggleUI(next);
    return;
  }

  // Anchor wave directly from the button center for a clean symmetric radial wave
  const btn =
    event?.currentTarget ||
    event?.target?.closest?.("button, a") ||
    document.getElementById("themeToggle") ||
    document.getElementById("profileTheme") ||
    document.getElementById("fallbackThemeToggle");

  let x = event?.clientX;
  let y = event?.clientY;

  if (btn && btn.getBoundingClientRect) {
    const rect = btn.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  } else if (x === undefined || y === undefined || (x === 0 && y === 0)) {
    x = window.innerWidth - 80;
    y = 35;
  }

  // Distance to the farthest corner of the viewport
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  // Set CSS variables for GPU compositor keyframe animation
  document.documentElement.style.setProperty("--vt-x", `${x.toFixed(1)}px`);
  document.documentElement.style.setProperty("--vt-y", `${y.toFixed(1)}px`);
  document.documentElement.style.setProperty("--vt-r", `${endRadius.toFixed(1)}px`);
  document.documentElement.classList.add("theme-transitioning");

  const transition = document.startViewTransition(() => {
    // 1. Instantly switch theme classes without dispatching heavy events
    applyTheme(next, false);
    // 2. Update button label/icon
    updateThemeToggleUI(next);
    // 3. Instantly update visible Chart.js canvas colors in 0ms without re-animating
    syncChartThemeColors(next === "light");
  });

  try {
    await transition.finished;
  } catch (_) {
  } finally {
    document.documentElement.classList.remove("theme-transitioning");
    // Fire theme changed events AFTER the visual wave has cleanly concluded
    window.dispatchEvent(
      new CustomEvent("salesiq:theme-changed", { detail: { theme: next } }),
    );
    window.dispatchEvent(
      new CustomEvent("themechanged", { detail: { theme: next } }),
    );
  }
}

export function initSplash() {
  applyTheme();
  showSkeletonLoader();
}

export function showSkeletonLoader() {
  const splash = $("#splashScreen");
  if (!splash) return;

  const isDashboardPage =
    location.pathname.includes("/admin/") ||
    location.pathname.includes("/sales/") ||
    location.pathname.includes("/superadmin/");
  const isLandingPage =
    location.pathname.endsWith("index.html") ||
    location.pathname === "/" ||
    location.pathname.endsWith("/");

  if (!isDashboardPage || isLandingPage) {
    splash.classList.add("hidden");
    splash.style.display = "none";
    return;
  }

  splash.classList.remove("fade-out", "hidden");
  splash.className = "skeleton-loader";
  splash.style.display = "flex";
  splash.innerHTML = `
    <header class="skeleton-card skeleton-header"></header>
    <div style="display:flex; gap:24px; flex:1; flex-wrap:wrap;">
      <aside class="skeleton-card skeleton-sidebar" style="flex:0 0 280px; max-width:280px;"></aside>
      <main style="flex:1; min-width:0; display:flex; flex-direction:column; gap:16px;">
        <div class="skeleton-row">
          <div class="skeleton-item skeleton-stat" style="flex:1; min-width:180px;"></div>
          <div class="skeleton-item skeleton-stat" style="flex:1; min-width:180px;"></div>
          <div class="skeleton-item skeleton-stat" style="flex:1; min-width:180px;"></div>
          <div class="skeleton-item skeleton-stat" style="flex:1; min-width:180px;"></div>
        </div>
        <div class="skeleton-card skeleton-chart"></div>
        <div class="skeleton-card skeleton-table"></div>
      </main>
    </div>
  `;
}

export function hideSkeletonLoader() {
  const splash = $("#splashScreen");
  if (!splash || splash.classList.contains("hidden")) return;
  splash.classList.add("fade-out");
  setTimeout(() => {
    splash.classList.add("hidden");
    splash.style.display = "none";
    splash.innerHTML = "";
    splash.className = "splash-screen hidden";
  }, 320);
}

export function tableSkeleton(cols = 8, rows = 5) {
  return `
    <div class="table-wrap animate-pulse">
      <table>
        <thead>
          <tr>
            ${Array.from({ length: cols }, () => `<th><div class="h-3.5 bg-sky-500/20 rounded w-20"></div></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from(
            { length: rows },
            () => `
            <tr>
              ${Array.from({ length: cols }, () => `<td><div class="h-4 bg-sky-500/10 rounded w-full max-w-[130px]"></div></td>`).join("")}
            </tr>
          `,
          ).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function initClickSpark() {
  const canvas = $("#clickSparkCanvas");
  if (!canvas || canvas._sparkInit) return;
  canvas._sparkInit = true;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const sparks = [];
  let animId = null;

  const clearCanvas = () => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clearCanvas();
  };

  resize();
  window.addEventListener("resize", resize);

  function draw(t) {
    animId = null;
    clearCanvas();

    if (sparks.length === 0) return;

    const now = typeof t === "number" ? t : performance.now();

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      const elapsed = now - s.start;

      // Hard safety timeout: sparks older than 450ms are purged immediately
      if (elapsed >= 450 || elapsed < 0 || Number.isNaN(elapsed)) {
        sparks.splice(i, 1);
        continue;
      }

      const p = Math.max(0, Math.min(elapsed / 400, 1));
      if (p >= 1) {
        sparks.splice(i, 1);
        continue;
      }

      const eased = p * (2 - p);
      const dist = eased * (s.distance || 32);
      const len = (s.length || 14) * (1 - eased);
      const x1 = s.x + dist * Math.cos(s.angle);
      const y1 = s.y + dist * Math.sin(s.angle) + p * 6; // subtle gravity
      const x2 = s.x + (dist + len) * Math.cos(s.angle);
      const y2 = s.y + (dist + len) * Math.sin(s.angle) + p * 6;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min((1 - p) * 1.2, 1));
      ctx.strokeStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 7;
      ctx.lineWidth = s.width || 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Glowing ember particle head
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x2, y2, Math.max(0.5, (1 - p) * 1.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (sparks.length > 0) {
      animId = requestAnimationFrame(draw);
    } else {
      clearCanvas();
    }
  }

  const darkPalette = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#60a5fa"];
  const lightPalette = ["#0284c7", "#7c3aed", "#059669", "#d97706", "#db2777", "#2563eb"];

  // Passive: click sparks never call preventDefault.
  document.addEventListener(
    "click",
    (e) => {
      // Do not spawn heavy spark physics when toggling themes to keep 120 FPS compositor throughput
      if (
        e.target?.closest?.("#themeToggle, #fallbackThemeToggle, #profileTheme") ||
        document.documentElement.classList.contains("theme-transitioning")
      ) {
        return;
      }

      const isLight = document.body.classList.contains("light");
      const palette = isLight ? lightPalette : darkPalette;
      const count = 12;
      const now = performance.now();

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          angle,
          color: palette[i % palette.length],
          distance: 26 + Math.random() * 20,
          length: 10 + Math.random() * 8,
          width: 1.8 + Math.random() * 1.2,
          start: now,
        });
      }

      if (!animId) {
        animId = requestAnimationFrame(draw);
      }
    },
    { passive: true },
  );
}


const adminLinks = [
  ["dashboard", "Dashboard", "dashboard.html", "📊"],
  ["products", "Products & Inventory", "products.html", "📦"],
  ["sales", "Sales Records", "sales.html", "🧾"],
  ["add-sale", "Billing", "add-sale.html", "💳"],
  ["forecasting", "Forecasting", "forecasting.html", "🔮"],
  ["ai-insights", "AI Insights", "ai-insights.html", "🤖"],
  ["analytics", "Analytics", "analytics.html", "📈"],
  ["contacts", "Contacts & Directory", "contacts.html", "👥"],
  ["purchases", "Restock", "purchases.html", "➕"],
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

const superAdminLinks = [["dashboard", "Overview", "dashboard.html", "👑"]];

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

export function avatarHTML(profile = {}) {
  const photo = String(profile.photoURL || "").trim();
  const label = initials(profile.name || profile.email);
  if (!photo) return `<span class="profile-avatar">${label}</span>`;
  const safe = photo.replace(/"/g, "&quot;");
  return `<img class="profile-avatar" src="${safe}" alt="${label}" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;profile-avatar&quot;>${label}</span>'" />`;
}

/**
 * Kerfa-style Liquid Stretchy Pill Navigation Indicator
 * Uses 100% hardware-accelerated GPU transforms (translate3d + scale)
 * for butter-smooth 120 FPS performance with zero layout reflow.
 */
export function initLiquidNavPill(navEl, activeKey) {
  if (!navEl) return;
  const pill = navEl.querySelector(".nav-liquid-pill");
  if (!pill) return;

  const links = Array.from(navEl.querySelectorAll(".nav-link"));
  if (!links.length) return;

  navEl.classList.add("has-liquid-pill");

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const activeLink =
    (activeKey && navEl.querySelector(`.nav-link[data-nav-key="${activeKey}"]`)) ||
    navEl.querySelector(".nav-link.active") ||
    links[0];

  let _animRafId = null;
  let currentY = 0;
  let _currentTargetEl = null;

  function measureElement(el) {
    if (!el) return { y: 0, height: 44, width: 250, left: 10 };
    return {
      y: el.offsetTop,
      height: el.offsetHeight || 44,
      width: el.offsetWidth || 250,
      left: el.offsetLeft || 10,
    };
  }

  function applyInstant(el) {
    if (!el) return;
    if (_animRafId) {
      cancelAnimationFrame(_animRafId);
      _animRafId = null;
    }
    _currentTargetEl = el;
    const m = measureElement(el);
    currentY = m.y;
    pill.style.transition = "none";
    pill.style.width = `${m.width}px`;
    pill.style.left = `${m.left}px`;
    pill.style.height = `${m.height}px`;
    pill.style.transform = `translate3d(0, ${m.y}px, 0) scale(1, 1)`;
    pill.style.opacity = "1";
  }

  function animateStretchTo(targetEl, fromYOverride = null) {
    if (!targetEl) return;
    _currentTargetEl = targetEl;
    const m = measureElement(targetEl);
    const toY = m.y;
    const baseH = m.height;
    const fromY = fromYOverride !== null ? fromYOverride : currentY;

    pill.style.width = `${m.width}px`;
    pill.style.left = `${m.left}px`;
    pill.style.height = `${baseH}px`;
    pill.style.opacity = "1";

    if (prefersReduced || Math.abs(toY - fromY) < 1) {
      if (_animRafId) {
        cancelAnimationFrame(_animRafId);
        _animRafId = null;
      }
      currentY = toY;
      pill.style.transform = `translate3d(0, ${toY}px, 0) scale(1, 1)`;
      return;
    }

    if (_animRafId) {
      cancelAnimationFrame(_animRafId);
      _animRafId = null;
    }

    const duration = 340; // ms
    const startTime = performance.now();

    function easeOutPower3(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function easeInOutPower2(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / duration));

      if (progress < 0.88) {
        // Fluid stretchy leap
        const sub = progress / 0.88;
        const pLead = easeOutPower3(sub);
        const pTrail = easeInOutPower2(sub);

        const curLead = fromY + (toY - fromY) * pLead;
        const curTrail = fromY + (toY - fromY) * pTrail;

        const curTop = Math.min(curLead, curTrail);
        const curBottom = Math.max(curLead, curTrail) + baseH;
        const curH = curBottom - curTop;

        const sy = Math.max(1, curH / baseH);
        const sx = Math.max(0.92, 1 - (sy - 1) * 0.035);

        pill.style.transform = `translate3d(0, ${curTop.toFixed(2)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
        currentY = curTop;
      } else {
        // Subtle organic jelly settle firmly locked at destination toY
        const settleP = (progress - 0.88) / 0.12;
        const bounce = Math.sin(settleP * Math.PI) * (1 - settleP) * 0.035;
        const sy = 1 - bounce;
        const sx = 1 + bounce * 0.6;

        pill.style.transform = `translate3d(0, ${toY}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
        currentY = toY;
      }

      if (progress < 1) {
        _animRafId = requestAnimationFrame(step);
      } else {
        _animRafId = null;
        currentY = toY;
        pill.style.transform = `translate3d(0, ${toY}px, 0) scale(1, 1)`;

        const icon = targetEl.querySelector(".nav-icon");
        if (icon) {
          icon.classList.remove("nav-icon-pop");
          void icon.offsetWidth;
          icon.classList.add("nav-icon-pop");
        }
      }
    }

    _animRafId = requestAnimationFrame(step);
  }

  // Cross-page restoration
  let restored = false;
  try {
    const raw = sessionStorage.getItem("salesiq_nav_transition");
    if (raw) {
      const data = JSON.parse(raw);
      const isFresh = data && Date.now() - Number(data.time || 0) < 3500;
      if (isFresh && data.fromKey && data.toKey === activeKey) {
        const fromEl = navEl.querySelector(`.nav-link[data-nav-key="${data.fromKey}"]`);
        if (fromEl) {
          const m = measureElement(fromEl);
          applyInstant(fromEl);
          restored = true;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              animateStretchTo(activeLink, m.y);
            });
          });
        }
      }
      sessionStorage.removeItem("salesiq_nav_transition");
    }
  } catch (_) {}

  if (!restored && activeLink) {
    applyInstant(activeLink);
    if (!prefersReduced) {
      pill.classList.add("nav-pill-entering");
      setTimeout(() => pill.classList.remove("nav-pill-entering"), 450);
    }
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        link.target === "_blank" ||
        e.button !== 0
      )
        return;

      const targetKey = link.dataset.navKey;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;

      e.preventDefault();
      if (_isNavigating) return;
      if (link.classList.contains("active")) return;

      const currentActive =
        navEl.querySelector(".nav-link.active") || _currentTargetEl;
      const fromY = _animRafId ? currentY : (currentActive ? currentActive.offsetTop : currentY);

      // Update active classes
      navEl.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      navEl.dataset.activeKey = targetKey || "";

      // Animate liquid stretch immediately on the persistent sidebar
      animateStretchTo(link, fromY);

      // Perform seamless SPA page navigation
      spaNavigate(href, targetKey);
    });
  });

  navEl._isAnimating = () => Boolean(_animRafId);

  navEl._animateTo = (targetEl, fromY = null) => {
    const startY = fromY !== null ? fromY : (_animRafId ? currentY : null);
    animateStretchTo(targetEl, startY);
  };

  navEl._syncLiquidPill = (force = false) => {
    // If currently animating and not forced, DO NOT interrupt or snap
    if (_animRafId && !force) return;
    const currentActive =
      navEl.querySelector(".nav-link.active") ||
      _currentTargetEl ||
      (navEl.dataset.activeKey
        ? navEl.querySelector(`.nav-link[data-nav-key="${navEl.dataset.activeKey}"]`)
        : null) ||
      links[0];
    if (currentActive) {
      applyInstant(currentActive);
    }
  };

  let resizeTimer;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        navEl._syncLiquidPill?.();
      }, 100);
    },
    { passive: true },
  );

  window.addEventListener(
    "pageshow",
    (e) => {
      if (e.persisted) {
        navEl._syncLiquidPill?.();
      }
    },
    { passive: true },
  );
}

// ── Persistent Page & SPA Routing Engine ──────────────────────────────────
let _activePageUnsubs = [];
export function registerPageUnsub(unsub) {
  if (typeof unsub === "function") {
    _activePageUnsubs.push(unsub);
  }
}

export function cleanupPageSubscriptions() {
  if (_activePageUnsubs.length) {
    _activePageUnsubs.forEach((fn) => {
      try {
        fn();
      } catch (_) {}
    });
    _activePageUnsubs = [];
  }
}

let _isNavigating = false;
export async function spaNavigate(href, targetKey, isPopState = false) {
  if (_isNavigating) return;
  _isNavigating = true;

  try {
    // 1. Parallelize network fetch while GPU pill animation glides cleanly
    const fetchPromise = fetch(href).then((r) => (r.ok ? r.text() : Promise.reject(r)));

    // Let the pill animation execute its energetic leap for 120ms with 0 main-thread interruptions
    const [htmlText] = await Promise.all([
      fetchPromise,
      new Promise((r) => setTimeout(r, 120)),
    ]);

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // 2. Update Title and History
    document.title = doc.title;
    if (!isPopState) {
      history.pushState({ href, targetKey }, doc.title, href);
    }

    // 3. Update Header Title
    const headerTitle = document.querySelector("#appHeader h1");
    if (headerTitle) {
      headerTitle.textContent = doc.title.replace("SalesIQ - ", "");
    }

    // 4. Update body dataset & sidebar state
    if (document.body) {
      document.body.dataset.active = targetKey || "";
    }
    const navEl = document.querySelector("#appSidebar .sidebar-nav");
    if (navEl && targetKey) {
      navEl.dataset.activeKey = targetKey;
      const targetLink = navEl.querySelector(`.nav-link[data-nav-key="${targetKey}"]`);
      if (targetLink) {
        navEl.querySelectorAll(".nav-link").forEach((l) => l.classList.toggle("active", l === targetLink));
      }
    }

    // 5. Clean up previous page subscriptions
    cleanupPageSubscriptions();

    // 6. Quick, smooth cross-fade for main content container
    const currentMain = document.querySelector("main.page-container");
    const newMain = doc.querySelector("main.page-container");

    if (!currentMain || !newMain) {
      // If either current page or target page lacks a SPA container, perform standard navigation
      location.href = href;
      return;
    }

    currentMain.style.opacity = "0";
    currentMain.style.transform = "translateY(6px)";
    currentMain.style.transition = "opacity 0.12s ease, transform 0.12s ease";

    await new Promise((r) => setTimeout(r, 110));

    currentMain.className = newMain.className;
    currentMain.innerHTML = newMain.innerHTML;

    // Swap any page modals that exist in the target page
    document.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());
    doc.querySelectorAll(".modal-backdrop").forEach((m) => {
      document.body.appendChild(m.cloneNode(true));
    });

    // Reveal new page content
    currentMain.style.opacity = "1";
    currentMain.style.transform = "translateY(0)";
    window.scrollTo({ top: 0, behavior: "instant" });

    // 7. Defer script execution to next idle frame so the pill has completely settled
    const scripts = Array.from(doc.querySelectorAll('script[type="module"]'));
    const pageScript = scripts.find((s) => {
      const src = s.getAttribute("src") || "";
      return (
        !src.includes("shared.js") &&
        !src.includes("fallback-ui.js") &&
        !src.includes("liquid-glass.js")
      );
    });

    if (pageScript) {
      const rawSrc = pageScript.getAttribute("src");
      const scriptUrl = new URL(rawSrc, window.location.href).href;
      requestAnimationFrame(() => {
        setTimeout(async () => {
          try {
            await import(scriptUrl + "?spa=" + Date.now());
          } catch (e) {
            console.warn("Module import error:", e);
          }
        }, 25);
      });
    }
  } catch (err) {
    console.warn("SPA navigation error, falling back to full reload:", err);
    location.href = href;
  } finally {
    _isNavigating = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const navEl = document.querySelector("#appSidebar .sidebar-nav");
    const currentMain = document.querySelector("main.page-container");
    if (!navEl || !currentMain) {
      location.reload();
      return;
    }
    const href = location.pathname.split("/").pop() || "dashboard.html";
    const targetLink = navEl.querySelector(`a[href="${href}"]`);
    if (!targetLink) {
      location.reload();
      return;
    }
    const targetKey = targetLink.dataset?.navKey;
    navEl.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
    targetLink.classList.add("active");
    navEl._animateTo?.(targetLink);
    spaNavigate(href, targetKey, true);
  });

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;
    if (link.closest("#appSidebar")) return;

    // Only intercept if we are currently inside an active dashboard shell
    const navEl = document.querySelector("#appSidebar .sidebar-nav");
    const currentMain = document.querySelector("main.page-container");
    if (!navEl || !currentMain) return;

    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("javascript:") ||
      href.startsWith("../") ||
      href.startsWith("/") ||
      href === "login.html" ||
      href === "register.html" ||
      href === "index.html" ||
      href === "profile.html" ||
      href.includes("login") ||
      href.includes("register")
    )
      return;

    if (
      link.target === "_blank" ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    )
      return;

    if (href.endsWith(".html")) {
      const targetLink = navEl.querySelector(`a[href="${href}"]`);
      if (!targetLink) {
        // Not a link in the current dashboard nav - let the browser navigate normally
        return;
      }
      e.preventDefault();
      const targetKey = targetLink.dataset?.navKey;
      navEl.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
      targetLink.classList.add("active");
      navEl._animateTo?.(targetLink);
      spaNavigate(href, targetKey);
    }
  });
}

export function initLiquidTabs(container, options = {}) {
  if (!container) return;
  const itemSelector = options.itemSelector || ".timeframe-tab";
  const activeClass = options.activeClass || "btn-primary";

  let pill = container.querySelector(".tab-liquid-pill");
  if (!pill) {
    pill = document.createElement("div");
    pill.className = "tab-liquid-pill";
    pill.setAttribute("aria-hidden", "true");
    container.prepend(pill);
  }

  container.classList.add("has-liquid-tabs");
  container.style.position = "relative";
  container.style.isolation = "isolate";

  const tabs = Array.from(container.querySelectorAll(itemSelector));
  if (!tabs.length) return;

  function getCoords(el) {
    if (!el) return { top: 0, left: 0, width: 0, height: 0, right: 0 };
    const pRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const top = Math.round(eRect.top - pRect.top);
    const left = Math.round(eRect.left - pRect.left + container.scrollLeft);
    const width = Math.round(eRect.width);
    const height = Math.round(eRect.height);
    const containerWidth = container.scrollWidth;
    const right = Math.max(0, Math.round(containerWidth - (left + width)));
    return { top, left, width, height, right, containerWidth };
  }

  function applyInstantCoords(coords) {
    pill.style.transition = "none";
    pill.style.left = `${coords.left}px`;
    pill.style.right = "auto";
    pill.style.width = `${coords.width}px`;
    pill.style.top = `${coords.top}px`;
    pill.style.height = `${coords.height}px`;
    pill.style.opacity = "1";
    pill.style.transform = "scale(1, 1)";
  }

  function animateTo(targetEl, fromCoordsOverride = null) {
    if (!targetEl) return;
    const toCoords = getCoords(targetEl);
    const containerWidth = container.scrollWidth;

    const fromLeft =
      fromCoordsOverride?.left ??
      (parseFloat(pill.style.left) || toCoords.left);
    const fromWidth =
      fromCoordsOverride?.width ??
      (parseFloat(pill.style.width) || toCoords.width);
    const fromRight =
      fromCoordsOverride?.right ??
      Math.max(0, containerWidth - (fromLeft + fromWidth));

    const isRight = toCoords.left > fromLeft;
    const isLeft = toCoords.left < fromLeft;

    pill.style.transition = "none";
    pill.style.width = "auto";
    pill.style.left = `${fromLeft}px`;
    pill.style.right = `${fromRight}px`;
    pill.style.top = `${toCoords.top}px`;
    pill.style.height = `${toCoords.height}px`;
    pill.style.opacity = "1";
    pill.style.transform = "scale(1, 0.95)";
    void pill.offsetWidth;

    if (isRight) {
      pill.style.transition =
        "right 300ms cubic-bezier(0.16, 1, 0.3, 1), left 460ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms ease, opacity 200ms ease";
    } else if (isLeft) {
      pill.style.transition =
        "left 300ms cubic-bezier(0.16, 1, 0.3, 1), right 460ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms ease, opacity 200ms ease";
    } else {
      pill.style.transition =
        "left 320ms cubic-bezier(0.22, 1, 0.36, 1), right 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms ease, opacity 200ms ease";
    }

    pill.style.left = `${toCoords.left}px`;
    pill.style.right = `${toCoords.right}px`;
    pill.style.transform = "scale(1, 1)";

    clearTimeout(pill._dockTimer);
    pill._dockTimer = setTimeout(() => {
      pill.style.transition = "none";
      pill.style.width = `${toCoords.width}px`;
      pill.style.right = "auto";
      pill.classList.remove("is-docking");
      void pill.offsetWidth;
      pill.classList.add("is-docking");
    }, 470);
  }

  let activeTab = tabs.find((t) => t.classList.contains(activeClass)) || tabs[0];
  if (activeTab) {
    applyInstantCoords(getCoords(activeTab));
  }

  container.addEventListener("click", (e) => {
    const clickedTab = e.target.closest(itemSelector);
    if (!clickedTab || clickedTab === activeTab) return;
    const fromCoords = activeTab ? getCoords(activeTab) : null;
    activeTab = clickedTab;
    animateTo(clickedTab, fromCoords);
  });

  return {
    sync: () => {
      const cur = tabs.find((t) => t.classList.contains(activeClass)) || tabs[0];
      if (cur) {
        activeTab = cur;
        applyInstantCoords(getCoords(cur));
      }
    },
    animateTo: (tabEl) => {
      if (!tabEl) return;
      const fromCoords = activeTab ? getCoords(activeTab) : null;
      activeTab = tabEl;
      animateTo(tabEl, fromCoords);
    },
  };
}

export function initAppShell(
  role = "admin",
  active = "dashboard",
  profile = {},
) {
  const links =
    role === "sales"
      ? staffLinks
      : role === "superadmin"
        ? superAdminLinks
        : adminLinks;
  const sidebar = $("#appSidebar");

  const workspaceLabel =
    role === "sales"
      ? "Sales Staff"
      : role === "superadmin"
        ? "Super Admin"
        : "Admin";

  if (sidebar) {
    if (sidebar.dataset.mounted === "true") {
      const navEl = sidebar.querySelector(".sidebar-nav");
      if (navEl) {
        navEl.dataset.activeKey = active;
        const targetLink = navEl.querySelector(`.nav-link[data-nav-key="${active}"]`);
        if (targetLink) {
          navEl.querySelectorAll(".nav-link").forEach((a) => {
            a.classList.toggle("active", a === targetLink);
          });
          // Do not interrupt an active in-flight stretch animation
          if (!navEl._isAnimating?.()) {
            navEl._syncLiquidPill?.();
          }
        }
      }
    } else {
      sidebar.dataset.mounted = "true";
      sidebar.innerHTML = `
        <div class="sidebar-logo">
          <div class="logo-mark">SIQ</div>
          <div>
            <div class="font-black text-xl tracking-tight">SalesIQ</div>
            <div class="text-xs text-slate-400 font-bold">
              ${workspaceLabel} Workspace
            </div>
          </div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-liquid-pill" aria-hidden="true"></div>
          ${links
            .map(
              ([key, label, href, icon]) => `
            <a class="nav-link ${active === key ? "active" : ""}" data-nav-key="${key}" href="${href}">
              <span class="nav-icon">${icon}</span>
              <span class="nav-label">${label}</span>
            </a>
          `,
            )
            .join("")}
        </nav>
        <div class="mt-4 p-3 glass rounded-2xl">
          <div class="text-xs text-slate-400 font-bold">Logged in</div>
          <div class="flex items-center gap-2 mt-1">
            ${avatarHTML(profile)}
            <div class="font-black truncate">${profile.name || profile.email || "User"}</div>
          </div>
          <a href="../profile.html" class="text-sky-300 text-sm font-bold hover:underline">Open Profile</a>
        </div>
      `;

      const navEl = sidebar.querySelector(".sidebar-nav");
      if (navEl) {
        navEl.dataset.activeKey = active;
        initLiquidNavPill(navEl, active);
      }
    }
  }

  const header = $("#appHeader");
  if (header) {
    if (header.dataset.mounted === "true") {
      const h1 = header.querySelector("h1");
      if (h1) h1.textContent = document.title.replace("SalesIQ - ", "");
    } else {
      header.dataset.mounted = "true";
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
              <span class="theme-toggle-spin">${getTheme() === "light" ? "🌙" : "☀️"}</span> ${getTheme() === "light" ? "Dark" : "Light"}
            </button>
            <a class="btn btn-ghost btn-sm hide-mobile" href="../profile.html">
              ${avatarHTML(profile)}
              Profile
            </a>
            <button id="logoutBtn" class="btn btn-danger btn-sm">Logout</button>
          </div>
        </div>
      `;

      $("#sidebarToggle")?.addEventListener("click", () => {
        const sb = $("#appSidebar");
        if (!sb) return;
        sb.classList.toggle("open");
        if (sb.classList.contains("open")) {
          const navEl = sb.querySelector(".sidebar-nav");
          requestAnimationFrame(() => navEl?._syncLiquidPill?.());
        }
      });

      $("#themeToggle")?.addEventListener("click", (e) => {
        toggleThemeWithWave(e);
      });

      $("#logoutBtn")?.addEventListener("click", async () => {
        try {
          sessionStorage.clear();
          localStorage.removeItem("salesiq_user");
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.startsWith("salesiq_cache_")) localStorage.removeItem(k);
          }
          idbClear().catch(() => {});
        } catch (_) {}
        await signOut(auth);
        location.href = "../login.html";
      });
    }
  }

  // 1. Ultra-Fast Link & Script Prefetching on Hover / Touch
  const _prefetchedHrefs = new Set();
  function prefetchTarget(href) {
    if (
      !href ||
      _prefetchedHrefs.has(href) ||
      href.startsWith("#") ||
      href.startsWith("http") ||
      href.startsWith("mailto:")
    )
      return;
    _prefetchedHrefs.add(href);

    try {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = href;
      document.head.appendChild(link);
    } catch (_) {}

    // Match module script path (e.g. "products.html" -> "js/products.js")
    const clean = href.split("?")[0].split("#")[0];
    if (clean.endsWith(".html")) {
      const scriptName = clean.replace(".html", ".js");
      const isSubdir =
        location.pathname.includes("/admin/") ||
        location.pathname.includes("/sales/") ||
        location.pathname.includes("/superadmin/");
      const scriptHref = isSubdir ? `js/${scriptName}` : scriptName;
      try {
        const jsLink = document.createElement("link");
        jsLink.rel = "modulepreload";
        jsLink.href = scriptHref;
        document.head.appendChild(jsLink);
      } catch (_) {}
    }
  }

  document.querySelectorAll("a[href]").forEach((el) => {
    const h = el.getAttribute("href");
    if (!h || h.startsWith("#") || h.startsWith("http") || h.startsWith("mailto:")) return;
    el.addEventListener("pointerenter", () => prefetchTarget(h), { passive: true, once: true });
    el.addEventListener("touchstart", () => prefetchTarget(h), { passive: true, once: true });
  });

  // 2. High-Capacity Background Cache Warming during browser idle
  if (profile && profile.id) {
    const runWarmup = () => {
      const preloadList =
        role === "sales"
          ? [
              ["products", false],
              ["productBatches", false],
              ["sales", false],
            ]
          : [
              ["products", false],
              ["productBatches", false],
              ["sales", false],
              ["customers", false],
              ["suppliers", false],
              ["staff", false],
            ];
      for (const [col, srt] of preloadList) {
        fetchAll(col, srt, profile.id).catch(() => {});
      }
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(runWarmup, { timeout: 1500 });
    } else {
      setTimeout(runWarmup, 200);
    }
  }

  // Automatically dismiss the full-screen skeleton loader once the page shell is mounted!
  requestAnimationFrame(() => {
    hideSkeletonLoader();
  });
  setTimeout(hideSkeletonLoader, 400);
}

export async function requireAuth(allowed = ["Admin", "Sales Staff"]) {
  const failSafeRole = () => {
    if (location.pathname.includes("/superadmin/")) return "Super Admin";
    if (location.pathname.includes("/sales/")) return "Sales Staff";
    return "Admin";
  };

  // FAST OPTIMISTIC PATH:
  // If the user already has a valid cached session in localStorage, resolve instantly (0ms)!
  // This completely eliminates the 500-1000ms delay on every internal page navigation.
  let cachedProfile = null;
  try {
    const raw = localStorage.getItem("salesiq_user");
    if (raw) cachedProfile = JSON.parse(raw);
  } catch (_) {}

  if (
    cachedProfile &&
    cachedProfile.id &&
    cachedProfile.status === "active" &&
    allowed.includes(cachedProfile.role)
  ) {
    const tenantId =
      cachedProfile.role === "Sales Staff"
        ? cachedProfile.adminId || cachedProfile.createdBy || cachedProfile.id
        : cachedProfile.id;
    if (tenantId) syncTenantCurrency(tenantId).catch(() => {});

    // Silently verify auth state and status in the background
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        localStorage.removeItem("salesiq_user");
        location.href =
          location.pathname.includes("/admin/") ||
          location.pathname.includes("/sales/") ||
          location.pathname.includes("/superadmin/")
            ? "../login.html"
            : "login.html";
        return;
      }
      try {
        const liveProfile = await getAccountProfile(user);
        if (liveProfile) {
          if (liveProfile.status === "inactive") {
            await signOut(auth);
            location.href =
              location.pathname.includes("/admin/") ||
              location.pathname.includes("/sales/") ||
              location.pathname.includes("/superadmin/")
                ? "../login.html?inactive=1"
                : "login.html?inactive=1";
            return;
          }
          const merged = { ...cachedProfile, ...liveProfile, id: user.uid };
          localStorage.setItem("salesiq_user", JSON.stringify(merged));
        }
      } catch (_) {}
    });

    return Promise.resolve({
      user: auth.currentUser || {
        uid: cachedProfile.id,
        email: cachedProfile.email,
        displayName: cachedProfile.name,
      },
      profile: cachedProfile,
    });
  }

  // COLD BOOT PATH: (No cached profile in localStorage)
  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      if (!settled) {
        settled = true;
      }
    };

    onAuthStateChanged(
      auth,
      async (user) => {
        if (settled) return;

        if (!user) {
          cleanup();
          location.href =
            location.pathname.includes("/admin/") ||
            location.pathname.includes("/sales/") ||
            location.pathname.includes("/superadmin/")
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

          // Super Admin has a hardcoded profile — never create a Firestore doc.
          if (!accountProfile && profile.role !== "Super Admin") {
            await createAccountProfile(user, profile).catch((err) =>
              console.warn("Could not create account profile:", err),
            );
          }
        } catch (err) {
          console.warn(
            "Could not read account profile. Check Firestore rules.",
            err,
          );
        }

        if (profile.status === "inactive") {
          cleanup();
          await signOut(auth);
          location.href =
            location.pathname.includes("/admin/") ||
            location.pathname.includes("/sales/") ||
            location.pathname.includes("/superadmin/")
              ? "../login.html?inactive=1"
              : "login.html?inactive=1";
          return;
        }

        if (!allowed.includes(profile.role)) {
          cleanup();
          location.href =
            profile.role === "Sales Staff"
              ? "../sales/dashboard.html"
              : "../admin/dashboard.html";
          return;
        }

        localStorage.setItem("salesiq_user", JSON.stringify(profile));
        const tenantId =
          profile.role === "Sales Staff"
            ? profile.adminId || profile.createdBy || profile.id
            : profile.id;
        if (tenantId) await syncTenantCurrency(tenantId).catch(() => {});
        cleanup();
        resolve({ user, profile });
      },
      (err) => {
        console.warn("Auth state error:", err);
        cleanup();
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
      },
    );

    setTimeout(() => {
      if (!settled && auth.currentUser) {
        cleanup();
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

export const TENANT_COLLECTIONS = new Set([
  "products",
  "productBatches",
  "sales",
  "customers",
  "suppliers",
  "purchases",
  "forecasting",
  "notifications",
  "ai-insights",
  "insights",
]);

let _cachedFirstAdminId = null;
try {
  _cachedFirstAdminId = localStorage.getItem("salesiq_first_admin_id") || null;
} catch (_) {}

export async function getFirstAdminId() {
  if (_cachedFirstAdminId) return _cachedFirstAdminId;
  try {
    const snap = await getDocs(collection(db, "admins"));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return ta - tb;
      });
      _cachedFirstAdminId = list[0].id;
      try {
        localStorage.setItem("salesiq_first_admin_id", _cachedFirstAdminId);
      } catch (_) {}
      return _cachedFirstAdminId;
    }
  } catch (_) {}
  return null;
}

export function getActiveTenantId(profile = null) {
  if (profile) {
    if (profile.role === "Admin") return profile.id;
    if (profile.role === "Sales Staff") return profile.adminId || null;
    if (profile.role === "Super Admin") return "__ALL__";
  }
  try {
    const raw = localStorage.getItem("salesiq_user");
    if (raw) {
      const p = JSON.parse(raw);
      if (p.role === "Admin") return p.id;
      if (p.role === "Sales Staff") return p.adminId || null;
      if (p.role === "Super Admin") return "__ALL__";
    }
  } catch (_) {}
  return auth?.currentUser?.uid || null;
}

// -----------------------------------------------------------------
// High-Speed Multi-Tier Client Storage Cache (IndexedDB + RAM Map)
// -----------------------------------------------------------------
const _inMemCache = new Map();
const CACHE_TTL_MS = 60000; // 60 seconds fresh window

// Cross-tab synchronization channel
let _syncChannel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    _syncChannel = new BroadcastChannel("salesiq_cache_sync");
    _syncChannel.onmessage = (e) => {
      const { type, cacheKey, data, collectionName } = e.data || {};
      if (type === "set" && cacheKey && data) {
        _inMemCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          stale: false,
        });
        window.dispatchEvent(
          new CustomEvent("salesiq:cache-updated", {
            detail: { cacheKey, data },
          }),
        );
      } else if (type === "invalidate") {
        for (const [k, v] of _inMemCache.entries()) {
          if (!collectionName || k.includes(`_${collectionName}_`)) {
            v.stale = true;
            v.timestamp = 0;
          }
        }
      }
    };
  }
} catch (_) {}

/**
 * Fast synchronous check: RAM first, localStorage fallback. (0ms)
 */
export function getCachedCollection(cacheKey) {
  // 1. In-memory Map (0ms)
  const mem = _inMemCache.get(cacheKey);
  if (mem && Array.isArray(mem.data)) return mem;

  // 2. Persistent client-side sessionStorage / localStorage (1-2ms)
  try {
    const raw =
      sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.data)) {
        _inMemCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Multi-tier asynchronous lookup: RAM (0ms) -> IndexedDB (1-3ms) -> null.
 */
export async function getCachedCollectionAsync(cacheKey) {
  // 1. RAM Map
  const mem = _inMemCache.get(cacheKey);
  if (mem && Array.isArray(mem.data)) return mem;

  // 2. High-Capacity IndexedDB
  try {
    const idbEntry = await idbGet(cacheKey);
    if (idbEntry && Array.isArray(idbEntry.data)) {
      _inMemCache.set(cacheKey, idbEntry);
      return idbEntry;
    }
  } catch (_) {}

  // 3. Fallback localStorage / sessionStorage
  return getCachedCollection(cacheKey);
}

/**
 * Write to RAM, IndexedDB, and broadcast across tabs.
 */
export function setCachedCollection(cacheKey, data) {
  const entry = { data, timestamp: Date.now(), stale: false };
  _inMemCache.set(cacheKey, entry);

  // Write to high-capacity IndexedDB asynchronously without blocking UI
  idbSet(cacheKey, data).catch(() => {});

  // For small entries (< 150 items), also mirror in sessionStorage for instant sync bootstrap
  try {
    if (Array.isArray(data) && data.length < 150) {
      sessionStorage.setItem(cacheKey, JSON.stringify(entry));
    }
  } catch (_) {}

  // Broadcast to other open tabs
  if (_syncChannel) {
    try {
      _syncChannel.postMessage({ type: "set", cacheKey, data });
    } catch (_) {}
  }
}

export function invalidateCache(collectionName = null) {
  // Smart invalidation: mark entries as stale so callers can STILL
  // render immediately from client-side cache while triggering background revalidation!
  for (const [key, entry] of _inMemCache.entries()) {
    if (!collectionName || key.includes(`_${collectionName}_`)) {
      entry.stale = true;
      entry.timestamp = 0;
    }
  }

  idbMarkStale((k) => !collectionName || k.includes(`_${collectionName}_`)).catch(
    () => {},
  );

  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("salesiq_cache_")) {
        if (!collectionName || k.includes(`_${collectionName}_`)) {
          sessionStorage.removeItem(k);
        }
      }
    }
  } catch (_) {}

  if (_syncChannel) {
    try {
      _syncChannel.postMessage({ type: "invalidate", collectionName });
    } catch (_) {}
  }
}

async function fetchFromFirestore(name, sorted, customAdminId) {
  const tenantId =
    customAdminId !== undefined ? customAdminId : getActiveTenantId();

  let docs = [];

  // Scoped collection: query only records belonging to this tenant to reduce network payload
  if (name === "sales") {
    try {
      const staffIds = new Set();
      try {
        const staffList = [
          ...(getCachedCollection(`salesiq_cache_staff_${tenantId}_false`)?.data || []),
          ...(getCachedCollection(`salesiq_cache_staff_${tenantId}_true`)?.data || []),
          ...(getCachedCollection("salesiq_cache_staff_all_false")?.data || []),
          ...(getCachedCollection("salesiq_cache_staff_all_true")?.data || []),
        ];
        staffList
          .filter(
            (u) =>
              u &&
              (u.adminId === tenantId ||
                u.createdBy === tenantId ||
                u.pendingRequest?.adminId === tenantId),
          )
          .forEach((u) => staffIds.add(u.id));
      } catch (_) {}

      if (staffIds.size === 0 && tenantId && tenantId !== "__ALL__") {
        try {
          const [s1, s2] = await Promise.all([
            getDocs(query(collection(db, "staff"), where("adminId", "==", tenantId))),
            getDocs(query(collection(db, "staff"), where("createdBy", "==", tenantId))),
          ]);
          s1.forEach((d) => staffIds.add(d.id));
          s2.forEach((d) => staffIds.add(d.id));
        } catch (_) {}
      }

      const q =
        tenantId && tenantId !== "__ALL__"
          ? query(collection(db, "sales"), where("adminId", "==", tenantId))
          : collection(db, "sales");
      const snap = await getDocs(q);
      const tenantSales = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
        docId: d.id,
      }));

      // In addition, if this admin has staff, check for any orphaned sales made by this admin's staff
      // that may have lacked adminId or had adminId set to staffId
      let orphanedSales = [];
      if (staffIds.size > 0 && tenantId && tenantId !== "__ALL__") {
        try {
          const staffArr = Array.from(staffIds).slice(0, 30);
          const staffSalesSnap = await getDocs(
            query(collection(db, "sales"), where("salespersonId", "in", staffArr)),
          );
          orphanedSales = staffSalesSnap.docs
            .map((d) => ({ ...d.data(), id: d.id, docId: d.id }))
            .filter(
              (s) =>
                s.adminId !== tenantId &&
                s.source !== "dummy" &&
                s.source !== "demo" &&
                !s.isDemo &&
                s.salespersonId !== "demo" &&
                s.salespersonId !== "system-demo",
            );
        } catch (_) {}
      }

      const salesMap = new Map();
      tenantSales.forEach((s) => salesMap.set(s.id, s));

      const isAdminUser = (() => {
        try {
          const raw = localStorage.getItem("salesiq_user");
          if (raw) return JSON.parse(raw).role === "Admin";
        } catch (_) {}
        return false;
      })();

      const toHeal = [];
      orphanedSales.forEach((s) => {
        if (
          s.source === "dummy" ||
          s.source === "demo" ||
          s.isDemo ||
          s.salespersonId === "demo" ||
          s.salespersonId === "system-demo"
        )
          return;
        if (!salesMap.has(s.id)) {
          salesMap.set(s.id, {
            ...s,
            adminId: tenantId,
            source: s.source || "staff",
          });
          if (isAdminUser) {
            toHeal.push({ id: s.id, source: s.source || "staff" });
          }
        }
      });

      if (toHeal.length > 0) {
        queueMicrotask(async () => {
          for (const item of toHeal) {
            try {
              await updateDoc(doc(db, "sales", item.id), {
                adminId: tenantId,
                source: item.source,
              });
            } catch (_) {}
          }
        });
      }

      docs = Array.from(salesMap.values());
    } catch (err) {
      console.warn(`Targeted sales fetch fell back:`, err);
      const snap = await getDocs(collection(db, "sales"));
      docs = snap.docs
        .map((d) => ({ ...d.data(), id: d.id, docId: d.id }))
        .filter(
          (d) => !tenantId || tenantId === "__ALL__" || d.adminId === tenantId,
        );
    }
  } else if (
    TENANT_COLLECTIONS.has(name) &&
    tenantId &&
    tenantId !== "__ALL__"
  ) {
    try {
      const q = query(collection(db, name), where("adminId", "==", tenantId));
      const snap = await getDocs(q);
      docs = snap.docs.map((d) => ({ ...d.data(), id: d.id, docId: d.id }));
    } catch (err) {
      console.warn(
        `Targeted where query on ${name} fell back to collection scan:`,
        err,
      );
      const snap = await getDocs(collection(db, name));
      docs = snap.docs
        .map((d) => ({ ...d.data(), id: d.id, docId: d.id }))
        .filter((d) => d.adminId === tenantId);
    }
  } else {
    const snap = await getDocs(collection(db, name));
    docs = snap.docs.map((d) => ({ ...d.data(), id: d.id, docId: d.id }));
    if (TENANT_COLLECTIONS.has(name) && tenantId && tenantId !== "__ALL__") {
      docs = docs.filter((d) => d.adminId === tenantId);
    }
  }

  // Sort in memory to avoid Firestore composite index errors
  if (sorted) {
    docs.sort((a, b) => {
      const da = toDate(a.createdAt);
      const db = toDate(b.createdAt);
      const ta = da ? da.getTime() : Date.now();
      const tb = db ? db.getTime() : Date.now();
      return tb - ta;
    });
  }

  return docs;
}

export async function fetchAll(
  name,
  sorted = true,
  customAdminId = undefined,
  bypassCache = false,
) {
  const tenantId =
    customAdminId !== undefined ? customAdminId : getActiveTenantId();
  const cacheKey = `salesiq_cache_${name}_${tenantId || "all"}_${Boolean(sorted)}`;

  // 1. FAST PATH (Tier 1): Check synchronous client storage (0ms instant response)
  if (!bypassCache) {
    const cached = getCachedCollection(cacheKey);
    if (cached && Array.isArray(cached.data)) {
      const age = Date.now() - (cached.timestamp || 0);

      // Revalidate in background if older than 30s or marked stale
      if (age > 30000 || cached.stale) {
        queueMicrotask(() => {
          fetchFromFirestore(name, sorted, customAdminId)
            .then((fresh) => {
              setCachedCollection(cacheKey, fresh);
              window.dispatchEvent(
                new CustomEvent("salesiq:cache-updated", {
                  detail: { name, cacheKey, data: fresh },
                }),
              );
            })
            .catch(() => {});
        });
      }

      // Return immediately in 0ms!
      return cached.data;
    }

    // 2. High-Capacity IndexedDB lookup (Tier 2, 2-3ms)
    try {
      const idbCached = await getCachedCollectionAsync(cacheKey);
      if (
        idbCached &&
        Array.isArray(idbCached.data) &&
        idbCached.data.length > 0
      ) {
        const age = Date.now() - (idbCached.timestamp || 0);
        if (age > 30000 || idbCached.stale) {
          queueMicrotask(() => {
            fetchFromFirestore(name, sorted, customAdminId)
              .then((fresh) => {
                setCachedCollection(cacheKey, fresh);
                window.dispatchEvent(
                  new CustomEvent("salesiq:cache-updated", {
                    detail: { name, cacheKey, data: fresh },
                  }),
                );
              })
              .catch(() => {});
          });
        }
        return idbCached.data;
      }
    } catch (_) {}
  }

  // 3. COLD BOOT: Fetch from Firestore, store in IndexedDB + RAM, and return
  try {
    const docs = await fetchFromFirestore(name, sorted, customAdminId);
    setCachedCollection(cacheKey, docs);
    return docs;
  } catch (e) {
    console.warn(`Primary fetch failed for ${name}:`, e);
    const fallback = await getCachedCollectionAsync(cacheKey);
    if (fallback && Array.isArray(fallback.data)) return fallback.data;
    return [];
  }
}

export function watchCollection(
  name,
  callback,
  sorted = true,
  customAdminId = undefined,
) {
  const tenantId =
    customAdminId !== undefined ? customAdminId : getActiveTenantId();
  const cacheKey = `salesiq_cache_${name}_${tenantId || "all"}_${Boolean(sorted)}`;

  // INSTANT RENDER (Tier 1): Emit synchronous memory/session cache immediately (0ms)!
  let emittedInitial = false;
  const cached = getCachedCollection(cacheKey);
  if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
    try {
      callback(cached.data);
      emittedInitial = true;
    } catch (err) {
      console.warn(`Error in cached callback for ${name}:`, err);
    }
  }

  // INSTANT RENDER (Tier 2): If not in memory, query IndexedDB (<3ms) and emit!
  if (!emittedInitial) {
    getCachedCollectionAsync(cacheKey)
      .then((idbCached) => {
        if (
          !emittedInitial &&
          idbCached &&
          Array.isArray(idbCached.data) &&
          idbCached.data.length > 0
        ) {
          try {
            callback(idbCached.data);
            emittedInitial = true;
          } catch (err) {
            console.warn(`Error in idb callback for ${name}:`, err);
          }
        }
      })
      .catch(() => {});
  }

  // Special Listener for sales: watches admin sales AND incoming staff sales in real time
  if (name === "sales" && tenantId && tenantId !== "__ALL__") {
    const salesMap = new Map();
    if (cached && Array.isArray(cached.data)) {
      cached.data.forEach((d) => salesMap.set(d.id, d));
    }

    const emit = () => {
      let combined = Array.from(salesMap.values());
      if (sorted) {
        combined.sort((a, b) => {
          const da = toDate(a.createdAt);
          const db = toDate(b.createdAt);
          const ta = da ? da.getTime() : Date.now();
          const tb = db ? db.getTime() : Date.now();
          return tb - ta;
        });
      }
      setCachedCollection(cacheKey, combined);
      callback(combined);
    };

    let staffIds = new Set();
    const refreshStaffIds = () => {
      try {
        const staffList = [
          ...(getCachedCollection(`salesiq_cache_staff_${tenantId}_false`)?.data || []),
          ...(getCachedCollection(`salesiq_cache_staff_${tenantId}_true`)?.data || []),
          ...(getCachedCollection("salesiq_cache_staff_all_false")?.data || []),
          ...(getCachedCollection("salesiq_cache_staff_all_true")?.data || []),
        ];
        staffList
          .filter(
            (u) =>
              u &&
              (u.adminId === tenantId ||
                u.createdBy === tenantId ||
                u.pendingRequest?.adminId === tenantId),
          )
          .forEach((u) => staffIds.add(u.id));
      } catch (_) {}
    };
    refreshStaffIds();

    const isAdminUser = (() => {
      try {
        const raw = localStorage.getItem("salesiq_user");
        if (raw) return JSON.parse(raw).role === "Admin";
      } catch (_) {}
      return false;
    })();

    if (isAdminUser && staffIds.size === 0 && tenantId && tenantId !== "__ALL__") {
      Promise.all([
        getDocs(query(collection(db, "staff"), where("adminId", "==", tenantId))),
        getDocs(query(collection(db, "staff"), where("createdBy", "==", tenantId))),
      ])
        .then(([s1, s2]) => {
          s1.forEach((d) => staffIds.add(d.id));
          s2.forEach((d) => staffIds.add(d.id));
        })
        .catch(() => {});
    }

    // Listen on this admin's sales (matches admin sales and all connected staff sales with adminId)
    const unsub = onSnapshot(
      query(collection(db, "sales"), where("adminId", "==", tenantId)),
      (snap) => {
        let changed = false;
        snap.docChanges().forEach((change) => {
          const docId = change.doc.id;
          if (change.type === "removed") {
            if (salesMap.has(docId)) {
              salesMap.delete(docId);
              changed = true;
            }
          } else {
            const data = change.doc.data();
            salesMap.set(docId, {
              ...data,
              id: docId,
              docId,
            });
            changed = true;
          }
        });
        if (changed || salesMap.size !== (cached?.data?.length || 0)) {
          emit();
        }
      },
      (err) => {
        console.warn("Realtime sales listener error:", err);
        fetchAll(name, sorted, customAdminId).then(callback);
      },
    );

    registerPageUnsub(unsub);
    return unsub;
  }

  const makeRef = () => {
    if (TENANT_COLLECTIONS.has(name) && tenantId && tenantId !== "__ALL__") {
      try {
        return query(collection(db, name), where("adminId", "==", tenantId));
      } catch (_) {}
    }
    return collection(db, name);
  };

  const filterDocs = (docs) => {
    if (TENANT_COLLECTIONS.has(name)) {
      const tid =
        customAdminId !== undefined ? customAdminId : getActiveTenantId();
      if (tid !== "__ALL__") {
        if (!tid) return [];
        return docs.filter((d) => d.adminId === tid);
      }
    }
    return docs;
  };

  try {
    const unsub = onSnapshot(
      makeRef(),
      (snap) => {
        let rawDocs = snap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          docId: d.id,
        }));
        let scopedDocs = filterDocs(rawDocs);
        if (sorted) {
          scopedDocs.sort((a, b) => {
            const da = toDate(a.createdAt);
            const db = toDate(b.createdAt);
            const ta = da ? da.getTime() : Date.now();
            const tb = db ? db.getTime() : Date.now();
            return tb - ta;
          });
        }
        setCachedCollection(cacheKey, scopedDocs);
        callback(scopedDocs);
      },
      (err) => {
        console.warn(`Realtime listener failed for ${name}:`, err);
        fetchAll(name, sorted, customAdminId).then(callback);
      },
    );
    registerPageUnsub(unsub);
    return unsub;
  } catch (err) {
    console.warn(`Could not start realtime listener for ${name}:`, err);
    fetchAll(name, sorted, customAdminId).then(callback);
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
  const isLight = getTheme() === "light";
  const textColor = isLight ? "#0f172a" : "#e2e8f0";
  const tickColor = isLight ? "#1e293b" : "#cbd5e1";
  const gridColor = isLight
    ? "rgba(15, 23, 42, 0.08)"
    : "rgba(148,163,184,.12)";
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
          font: { weight: "600" },
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: isLight
          ? "rgba(255,255,255,.96)"
          : "rgba(15,23,42,.94)",
        titleColor: isLight ? "#0f172a" : "#ffffff",
        bodyColor: isLight ? "#1e293b" : "#e2e8f0",
        borderColor: isLight ? "rgba(15,23,42,.15)" : "rgba(148,163,184,.22)",
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: isRoundChart
      ? {}
      : {
          x: {
            ticks: { color: tickColor, font: { weight: "600" } },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: tickColor, font: { weight: "600" } },
            grid: { color: gridColor },
          },
        },
  };

  const optScales = options.scales || {};

  return {
    ...base,
    ...options,
    plugins: {
      ...base.plugins,
      ...(options.plugins || {}),
      legend: {
        ...base.plugins.legend,
        ...(options.plugins?.legend || {}),
        labels: {
          ...base.plugins.legend.labels,
          ...(options.plugins?.legend?.labels || {}),
        },
      },
    },
    scales: isRoundChart
      ? {}
      : {
          x: {
            ...base.scales.x,
            ...optScales.x,
            ticks: {
              ...base.scales.x.ticks,
              ...(optScales.x?.ticks || {}),
            },
            grid: {
              ...base.scales.x.grid,
              ...(optScales.x?.grid || {}),
            },
          },
          y: {
            ...base.scales.y,
            ...optScales.y,
            ticks: {
              ...base.scales.y.ticks,
              ...(optScales.y?.ticks || {}),
            },
            grid: {
              ...base.scales.y.grid,
              ...(optScales.y?.grid || {}),
            },
          },
        },
  };
}

function normalizeDatasets(datasets = []) {
  const isLight =
    (typeof document !== "undefined" && document.body?.classList.contains("light")) ||
    getTheme() === "light";
  const palette = isLight
    ? [
        { border: "#0284c7", bg: "rgba(2,132,199,.22)" },
        { border: "#7c3aed", bg: "rgba(124,58,237,.22)" },
        { border: "#059669", bg: "rgba(5,150,105,.22)" },
        { border: "#d97706", bg: "rgba(217,119,6,.22)" },
        { border: "#db2777", bg: "rgba(219,39,119,.22)" },
        { border: "#0891b2", bg: "rgba(8,145,178,.22)" },
      ]
    : [
        { border: "#38bdf8", bg: "rgba(56,189,248,.22)" },
        { border: "#a78bfa", bg: "rgba(167,139,250,.22)" },
        { border: "#22c55e", bg: "rgba(34,197,94,.22)" },
        { border: "#f59e0b", bg: "rgba(245,158,11,.22)" },
        { border: "#f472b6", bg: "rgba(244,114,182,.22)" },
        { border: "#2dd4bf", bg: "rgba(45,212,191,.22)" },
      ];
  return datasets.map((dataset, i) => {
    const c = palette[i % palette.length];
    return {
      borderColor: c.border,
      backgroundColor: c.bg,
      pointBackgroundColor: c.border,
      ...dataset,
      borderWidth: dataset.borderWidth ?? 2,
      pointRadius: dataset.pointRadius ?? 3,
      pointHoverRadius: dataset.pointHoverRadius ?? 5,
    };
  });
}


/**
 * Metrics & Numbers Ticker Animation (Kerfa style)
 */
export function parseMetric(str) {
  const s = String(str || "").trim();
  const match = s.match(/^([^0-9.-]*)([-+]?[0-9,]+(?:\.[0-9]+)?)(.*)$/);
  if (!match) return null;
  const prefix = match[1];
  const numStr = match[2].replace(/,/g, "");
  const suffix = match[3];
  const num = parseFloat(numStr);
  if (isNaN(num)) return null;
  const decMatch = numStr.match(/\.([0-9]+)$/);
  const decimals = decMatch ? decMatch[1].length : 0;
  return { prefix, num, suffix, decimals };
}

export function animateCounter(el, targetStr, duration = 1000) {
  if (!el) return;
  const parsed = parseMetric(targetStr);
  if (!parsed) {
    el.textContent = targetStr;
    return;
  }

  const { prefix, num: targetVal, suffix, decimals } = parsed;
  const startVal =
    typeof el._currentCountVal === "number" ? el._currentCountVal : 0;

  if (startVal === targetVal && el._hasAnimatedOnce) {
    el.textContent = targetStr;
    return;
  }

  if (el._rafCountId) {
    cancelAnimationFrame(el._rafCountId);
    el._rafCountId = null;
  }

  el._hasAnimatedOnce = true;
  const startTime = performance.now();

  function formatVal(v) {
    const formattedNum = v.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${prefix}${formattedNum}${suffix}`;
  }

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / duration));
    // Expo out curve for smooth, punchy roll-up
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const currentVal = startVal + (targetVal - startVal) * eased;

    el.textContent = formatVal(currentVal);

    if (progress < 1) {
      el._rafCountId = requestAnimationFrame(step);
    } else {
      el.textContent = targetStr;
      el._currentCountVal = targetVal;
      el._rafCountId = null;
    }
  }

  el._rafCountId = requestAnimationFrame(step);
}

export function animateCounters(
  container = document,
  selector = ".stat-value",
  duration = 1050,
) {
  if (!container) return;
  const elements = container.querySelectorAll(selector);
  elements.forEach((el, idx) => {
    // 35ms stagger across cards for sequential roll-up wave
    const delay = idx * 35;
    const targetText = (el.dataset.counterTarget || el.textContent || "").trim();
    el.dataset.counterTarget = targetText;
    if (delay > 0) {
      setTimeout(() => animateCounter(el, targetText, duration), delay);
    } else {
      animateCounter(el, targetText, duration);
    }
  });
}

export const salesiqLeftToRightPlugin = {
  id: "salesiqLeftToRight",
  beforeDatasetsDraw(chart, args, pluginOptions) {
    if (!pluginOptions || pluginOptions.enabled === false) return;
    const { ctx, chartArea } = chart;
    if (!chartArea || !chartArea.width) return;

    const progress =
      typeof chart._revealProgress === "number" ? chart._revealProgress : 1;

    if (progress < 1) {
      ctx.save();
      ctx.beginPath();
      const currentWidth = Math.max(0, chartArea.width * progress);
      ctx.rect(
        chartArea.left,
        chartArea.top - 20,
        currentWidth,
        chartArea.height + 40,
      );
      ctx.clip();
      chart._revealClipped = true;
    }
  },
  afterDatasetsDraw(chart, args, pluginOptions) {
    if (!pluginOptions || pluginOptions.enabled === false) return;
    const { ctx, chartArea } = chart;
    if (chart._revealClipped) {
      ctx.restore();
      chart._revealClipped = false;
    }

    const progress =
      typeof chart._revealProgress === "number" ? chart._revealProgress : 1;

    // Draw vertical laser scanner beam & luminous spark head while actively sweeping
    if (progress > 0.005 && progress < 0.999 && chartArea) {
      const currentX = chartArea.left + chartArea.width * progress;
      const meta = chart.getDatasetMeta(0);
      const pts = meta?.data || [];

      const isLight =
        typeof document !== "undefined" &&
        document.body?.classList.contains("light");
      const accentColor = isLight ? "#0284c7" : "#38bdf8";

      // 1. Subtle vertical laser scanner beam
      ctx.save();
      const beamGrad = ctx.createLinearGradient(
        currentX,
        chartArea.top,
        currentX,
        chartArea.bottom,
      );
      beamGrad.addColorStop(0, "rgba(56,189,248,0)");
      beamGrad.addColorStop(
        0.5,
        isLight ? "rgba(2,132,199,0.22)" : "rgba(56,189,248,0.32)",
      );
      beamGrad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(currentX, chartArea.top);
      ctx.lineTo(currentX, chartArea.bottom);
      ctx.stroke();
      ctx.restore();

      if (pts.length > 0) {
        let currentY = null;
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          if (p1 && p2 && p1.x <= currentX && currentX <= p2.x) {
            const span = p2.x - p1.x;
            const ratio = span > 0 ? (currentX - p1.x) / span : 0;
            currentY = p1.y + (p2.y - p1.y) * ratio;
            break;
          }
        }
        if (currentY === null) {
          if (currentX <= pts[0].x) currentY = pts[0].y;
          else if (currentX >= pts[pts.length - 1].x)
            currentY = pts[pts.length - 1].y;
        }

        if (typeof currentY === "number" && !isNaN(currentY)) {
          const isLight =
            typeof document !== "undefined" &&
            document.body?.classList.contains("light");
          const accentColor = isLight ? "#0284c7" : "#38bdf8";

          ctx.save();
          // Soft luminous outer glow
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 14;
          ctx.fillStyle = accentColor;
          ctx.beginPath();
          ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
          ctx.fill();

          // Crisp white center core
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(currentX, currentY, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  },
};

let isLeftToRightRegistered = false;
function registerLeftToRightPlugin() {
  if (isLeftToRightRegistered || typeof window === "undefined" || !window.Chart) {
    return;
  }
  try {
    window.Chart.register(salesiqLeftToRightPlugin);
    isLeftToRightRegistered = true;
  } catch (err) {
    console.warn("Could not register salesiqLeftToRightPlugin:", err);
  }
}

export function startLeftToRightAnimation(chart, duration = 1500, delay = 0) {
  if (!chart || chart.destroyed) return;
  if (chart._rafRevealId) {
    cancelAnimationFrame(chart._rafRevealId);
    chart._rafRevealId = null;
  }

  chart._revealProgress = 0;
  chart._isAnimatingReveal = true;
  chart.render();

  const startTimestamp = performance.now() + (delay || 0);

  function step(now) {
    if (!chart || chart.destroyed) return;
    if (now < startTimestamp) {
      chart._rafRevealId = requestAnimationFrame(step);
      return;
    }

    const elapsed = now - startTimestamp;
    const t = Math.min(1, Math.max(0, elapsed / duration));
    // Ease-out cubic: energetic start, silky smooth deceleration as it settles on the right
    chart._revealProgress = 1 - Math.pow(1 - t, 3);
    chart.render();

    if (t < 1) {
      chart._rafRevealId = requestAnimationFrame(step);
    } else {
      chart._revealProgress = 1;
      chart._isAnimatingReveal = false;
      chart._rafRevealId = null;
      chart.render();
    }
  }

  chart._rafRevealId = requestAnimationFrame(step);
}

export function makeChart(canvas, type, data, options = {}) {
  if (!canvas) return null;
  // A previous fallback-ui placeholder must never block a real chart.
  try {
    delete canvas.dataset.fallbackDrawn;
  } catch (_) {}
  if (!window.Chart) {
    console.warn("Chart.js not loaded yet for", canvas.id || canvas);
    return null;
  }

  registerLeftToRightPlugin();

  const isLeftToRightTarget =
    Boolean(options.animateLeftToRight) ||
    Boolean(options.leftToRight) ||
    canvas.id === "salesTrendChart" ||
    canvas.id === "dailySalesChart" ||
    canvas.id === "revenueChart" ||
    canvas.id === "aovTrendChart" ||
    canvas.id === "staffChart";

  let animOptions = { ...options };

  if (isLeftToRightTarget && type === "line") {
    const existingPlugins = animOptions.plugins || {};
    animOptions.plugins = {
      ...existingPlugins,
      salesiqLeftToRight: {
        enabled: true,
        ...(existingPlugins.salesiqLeftToRight || {}),
      },
    };
    animOptions.animation = false;
  }

  const isInitialMount = !canvas._chart;
  const shouldReplay =
    Boolean(options.replayAnimation) ||
    Boolean(options.forceReplay) ||
    Boolean(options.replayLeftToRight) ||
    Boolean(options.forceLeftToRight);

  // Kerfa-style staggered bar growth wave entrance animation (vertical & horizontal)
  // Only applied on initial mount or when explicit replay is requested — NEVER resets bars on updates or theme switches!
  if (type === "bar") {
    if (isInitialMount || shouldReplay) {
      const isHorizontal = animOptions.indexAxis === "y";
      const animAxis = isHorizontal ? "x" : "y";
      animOptions.animations = {
        ...(animOptions.animations || {}),
        [animAxis]: {
          duration: 950,
          easing: "easeOutQuart",
          from: (ctx) => {
            if (ctx.type === "data" && ctx.chart?.scales?.[animAxis]) {
              return ctx.chart.scales[animAxis].getPixelForValue(0);
            }
          },
          delay(ctx) {
            if (ctx.type !== "data" || ctx.mode !== "default") return 0;
            return 120 + ctx.dataIndex * 40; // 40ms stagger per bar column
          },
        },
      };
    } else {
      if (animOptions.animations) {
        delete animOptions.animations.x;
        delete animOptions.animations.y;
      }
    }
  }

  // Kerfa-style circular scale & spin entrance for doughnut and pie charts
  if (type === "doughnut" || type === "pie") {
    if (isInitialMount || shouldReplay) {
      animOptions.animation = {
        animateRotate: true,
        animateScale: true,
        duration: 1050,
        easing: "easeOutQuart",
        ...(animOptions.animation || {}),
      };
    } else {
      animOptions.animation = false;
    }
  }

  const nextData = {
    labels: data?.labels || [],
    datasets: normalizeDatasets(data?.datasets || []),
  };
  // Pie/doughnut need one color per slice; expand the palette automatically.
  if (type === "pie" || type === "doughnut") {
    const isLight =
      (typeof document !== "undefined" && document.body?.classList.contains("light")) ||
      getTheme() === "light";
    const sliceBg = isLight
      ? [
          "rgba(2,132,199,.85)",
          "rgba(124,58,237,.85)",
          "rgba(5,150,105,.85)",
          "rgba(217,119,6,.85)",
          "rgba(219,39,119,.85)",
          "rgba(8,145,178,.85)",
          "rgba(79,70,229,.85)",
          "rgba(225,29,72,.85)",
        ]
      : [
          "rgba(56,189,248,.75)",
          "rgba(167,139,250,.75)",
          "rgba(34,197,94,.75)",
          "rgba(245,158,11,.75)",
          "rgba(244,114,182,.75)",
          "rgba(45,212,191,.75)",
          "rgba(96,165,250,.75)",
          "rgba(251,113,133,.75)",
        ];
    const sliceBorder = isLight
      ? [
          "#0284c7",
          "#7c3aed",
          "#059669",
          "#d97706",
          "#db2777",
          "#0891b2",
          "#4f46e5",
          "#e11d48",
        ]
      : [
          "#38bdf8",
          "#a78bfa",
          "#22c55e",
          "#f59e0b",
          "#f472b6",
          "#2dd4bf",
          "#60a5fa",
          "#fb7185",
        ];
    nextData.datasets = nextData.datasets.map((ds) => {
      const n = ds.data?.length || 0;
      if (n > 1 && !Array.isArray(ds.backgroundColor)) {
        return {
          ...ds,
          backgroundColor: Array.from(
            { length: n },
            (_, k) => sliceBg[k % sliceBg.length],
          ),
          borderColor: Array.from(
            { length: n },
            (_, k) => sliceBorder[k % sliceBorder.length],
          ),
        };
      }
      return ds;
    });
  }
  const nextOptions = mergeChartOptions(type, animOptions);

  if (canvas._chart && canvas._chart.config.type === type) {
    canvas._chart.data.labels = nextData.labels;
    canvas._chart.data.datasets = nextData.datasets;
    canvas._chart.options = nextOptions;

    const shouldReplay =
      Boolean(options.replayLeftToRight) || Boolean(options.forceLeftToRight);

    if (shouldReplay && isLeftToRightTarget) {
      startLeftToRightAnimation(
        canvas._chart,
        options.animationDuration || 1400,
        options.animationDelay || 0,
      );
    } else if (options.skipAnimation || options.animation === false) {
      canvas._chart.update("none");
    } else {
      canvas._chart.update();
    }
    return canvas._chart;
  }

  if (canvas._chart) canvas._chart.destroy();

  canvas._chart = new Chart(canvas, {
    type,
    data: nextData,
    options: nextOptions,
  });

  if (isLeftToRightTarget) {
    // 420ms delay (includes +0.3s delay) after page load so app shell and cards settle first
    startLeftToRightAnimation(
      canvas._chart,
      options.animationDuration || 1500,
      options.animationDelay ?? 420,
    );
  }

  return canvas._chart;
}

export async function createNotification(
  message,
  type = "info",
  adminId = null,
) {
  const targetAdminId = adminId || getActiveTenantId();
  await addDoc(collection(db, "notifications"), {
    message,
    type,
    read: false,
    adminId: targetAdminId !== "__ALL__" ? targetAdminId : null,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => {
    initSplash();
    initClickSpark();
  });
} else {
  initSplash();
  initClickSpark();
}

window.addEventListener("error", () => {
  hideSkeletonLoader();
});

window.addEventListener("unhandledrejection", () => {
  hideSkeletonLoader();
});

// One-shot safety net: hide a stuck skeleton shortly after load
setTimeout(() => {
  const splash = $("#splashScreen");
  const shell = $("#appSidebar") || $("#appHeader");
  if (splash && shell && !splash.classList.contains("hidden")) {
    hideSkeletonLoader();
  }
}, 4000);
