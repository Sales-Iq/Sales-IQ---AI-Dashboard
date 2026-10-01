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
  where,
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

// Accepts Firestore Timestamp, Date, ISO string or millis. Returns Date or null.
export const toDate = (value) => {
  if (!value) return null;
  try {
    const d = value?.toDate ? value.toDate() : new Date(value);
    return d && !Number.isNaN(d.getTime()) ? d : null;
  } catch (_) {
    return null;
  }
};

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
  // Cached with short TTL: fast inside render loops (100s of money()
  // calls per render) but still picks up same-tab settings saves.
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
// Keep cache in sync when settings change currency in another tab/page.
try {
  window.addEventListener("storage", (e) => {
    if (e.key === "salesiq_currency") getCurrency._cached = e.newValue || "₹";
  });
} catch (_) {}

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
            ${Array.from({ length: cols }, () => `<th><div class="h-3.5 bg-slate-700/60 rounded w-20"></div></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${Array.from(
            { length: rows },
            () => `
            <tr>
              ${Array.from({ length: cols }, () => `<td><div class="h-4 bg-slate-800/80 rounded w-full max-w-[130px]"></div></td>`).join("")}
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
      const dist = eased * 24;
      const len = 12 * (1 - eased);
      const x1 = s.x + dist * Math.cos(s.angle);
      const y1 = s.y + dist * Math.sin(s.angle);
      const x2 = s.x + (dist + len) * Math.cos(s.angle);
      const y2 = s.y + (dist + len) * Math.sin(s.angle);

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1 - p, 1));
      ctx.strokeStyle = document.body.classList.contains("light")
        ? "#0ea5e9"
        : "#ffffff";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    if (sparks.length > 0) {
      animId = requestAnimationFrame(draw);
    } else {
      clearCanvas();
    }
  }

  // Passive: click sparks never call preventDefault.
  document.addEventListener(
    "click",
    (e) => {
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

      if (!animId) {
        animId = requestAnimationFrame(draw);
      }
    },
    { passive: true },
  );
}

const adminLinks = [
  ["dashboard", "Dashboard", "dashboard.html", "📊"],
  ["products", "Products", "products.html", "📦"],
  ["inventory", "Inventory", "inventory.html", "🏬"],
  ["sales", "Sales Records", "sales.html", "🧾"],
  ["add-sale", "Billing", "add-sale.html", "💳"],
  ["forecasting", "Forecasting", "forecasting.html", "🔮"],
  ["ai-insights", "AI Insights", "ai-insights.html", "🤖"],
  ["analytics", "Analytics", "analytics.html", "📈"],
  ["customers", "Customers", "customers.html", "👥"],
  ["suppliers", "Suppliers", "suppliers.html", "🚚"],
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
        <div class="flex items-center gap-2 mt-1">
          ${avatarHTML(profile)}
          <div class="font-black truncate">${profile.name || profile.email || "User"}</div>
        </div>
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
            ${avatarHTML(profile)}
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
    try {
      sessionStorage.clear();
      localStorage.removeItem("salesiq_user");
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("salesiq_cache_")) localStorage.removeItem(k);
      }
    } catch (_) {}
    await signOut(auth);
    location.href = "../login.html";
  });

  // Proactively warm client-side cache for instant subsequent page navigations
  if (profile && profile.id) {
    setTimeout(() => {
      const preloadList =
        role === "sales"
          ? [["products", false]]
          : [
              ["products", false],
              ["sales", false],
              ["customers", false],
            ];
      for (const [col, srt] of preloadList) {
        fetchAll(col, srt, profile.id).catch(() => {});
      }
    }, 150);
  }

  // Failsafe safety net: ensure skeleton loader never stays stuck on unforeseen errors
  setTimeout(hideSkeletonLoader, 4000);
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
            profile.role === "Super Admin"
              ? "../superadmin/dashboard.html"
              : profile.role === "Sales Staff"
                ? "../sales/dashboard.html"
                : "../admin/dashboard.html";
          return;
        }

        localStorage.setItem("salesiq_user", JSON.stringify(profile));
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
// High-Speed Multi-Tier Client Storage Cache (Stale-While-Revalidate)
// -----------------------------------------------------------------
const _inMemCache = new Map();
const CACHE_TTL_MS = 60000; // 60 seconds fresh window

export function getCachedCollection(cacheKey) {
  // 1. In-memory Map (0ms)
  const mem = _inMemCache.get(cacheKey);
  if (mem && Array.isArray(mem.data)) return mem;

  // 2. Persistent client-side localStorage (1-2ms)
  try {
    const raw =
      localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
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

export function setCachedCollection(cacheKey, data) {
  const entry = { data, timestamp: Date.now(), stale: false };
  _inMemCache.set(cacheKey, entry);
  const serialized = JSON.stringify(entry);

  try {
    localStorage.setItem(cacheKey, serialized);
  } catch (_) {
    // If quota exceeded, prune older cache items and retry
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("salesiq_cache_")) localStorage.removeItem(k);
      }
      localStorage.setItem(cacheKey, serialized);
    } catch (_) {
      try {
        sessionStorage.setItem(cacheKey, serialized);
      } catch (_) {}
    }
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

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("salesiq_cache_")) {
        if (!collectionName || k.includes(`_${collectionName}_`)) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              parsed.stale = true;
              parsed.timestamp = 0;
              localStorage.setItem(k, JSON.stringify(parsed));
            }
          } catch (_) {
            localStorage.removeItem(k);
          }
        }
      }
    }
  } catch (_) {}
}

async function fetchFromFirestore(name, sorted, customAdminId) {
  const tenantId =
    customAdminId !== undefined ? customAdminId : getActiveTenantId();

  let docs = [];

  // Scoped collection: query only records belonging to this tenant to reduce network payload
  if (TENANT_COLLECTIONS.has(name) && tenantId && tenantId !== "__ALL__") {
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
      const ta = toDate(a.createdAt)?.getTime() || 0;
      const tb = toDate(b.createdAt)?.getTime() || 0;
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

  // 1. FAST PATH: Check client-side storage (0ms instant response)
  if (!bypassCache) {
    const cached = getCachedCollection(cacheKey);
    if (cached && Array.isArray(cached.data)) {
      const age = Date.now() - (cached.timestamp || 0);

      // Revalidate in background if older than 5s or marked stale
      if (age > 5000 || cached.stale) {
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
  }

  // 2. COLD BOOT: Fetch from Firestore, store in client cache, and return
  try {
    const docs = await fetchFromFirestore(name, sorted, customAdminId);
    setCachedCollection(cacheKey, docs);
    return docs;
  } catch (e) {
    console.warn(`Primary fetch failed for ${name}:`, e);
    const fallback = getCachedCollection(cacheKey);
    if (fallback) return fallback.data;
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

  // INSTANT RENDER: Emit cached client-side data immediately (0ms)!
  const cached = getCachedCollection(cacheKey);
  if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
    try {
      callback(cached.data);
    } catch (err) {
      console.warn(`Error in cached callback for ${name}:`, err);
    }
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
    return onSnapshot(
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
            const ta = toDate(a.createdAt)?.getTime() || 0;
            const tb = toDate(b.createdAt)?.getTime() || 0;
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
  const palette = [
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

  const nextData = {
    labels: data?.labels || [],
    datasets: normalizeDatasets(data?.datasets || []),
  };
  // Pie/doughnut need one color per slice; expand the palette automatically.
  if (type === "pie" || type === "doughnut") {
    const sliceBg = [
      "rgba(56,189,248,.75)",
      "rgba(167,139,250,.75)",
      "rgba(34,197,94,.75)",
      "rgba(245,158,11,.75)",
      "rgba(244,114,182,.75)",
      "rgba(45,212,191,.75)",
      "rgba(96,165,250,.75)",
      "rgba(251,113,133,.75)",
    ];
    const sliceBorder = [
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
