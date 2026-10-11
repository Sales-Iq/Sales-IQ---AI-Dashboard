import {
  requireAuth,
  initAppShell,
  watchCollection,
  hideSkeletonLoader,
  $,
  $$,
  toast,
  dateText,
  toDate,
  emptyState,
  setBusy,
  getCachedCollection,
} from "../../js/shared.js";
import {
  db,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "notifications", profile);

let rows = [];
let activeFilter = "all";
let searchQuery = "";

// ── 1. Relative Time Formatter ─────────────────────────────────────────────
function formatRelativeTime(value) {
  const d = toDate(value);
  if (!d) return "Just now";

  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    return `${hrs}h ago`;
  }
  if (diffSec < 172800) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

// ── 2. Type & Severity Styling ─────────────────────────────────────────────
function getTypeConfig(n) {
  const msg = String(n.message || "").toLowerCase();
  const t = String(n.type || "").toLowerCase();

  if (
    t === "stock" ||
    msg.includes("out of stock") ||
    msg.includes("low stock") ||
    msg.includes("stock left")
  ) {
    const isOutOfStock =
      msg.includes("out of stock") || msg.includes("0 units");
    return {
      icon: isOutOfStock ? "⛔" : "⚠️",
      badgeLabel: isOutOfStock ? "Out of Stock" : "Low Stock Warning",
      badgeClass: isOutOfStock
        ? "badge badge-danger text-xs font-bold"
        : "badge badge-warn text-xs font-bold",
      cardBorder: isOutOfStock
        ? "border-l-4 border-l-rose-500 bg-rose-500/5"
        : "border-l-4 border-l-amber-500 bg-amber-500/5",
    };
  }

  if (t === "sale" || msg.includes("sale") || msg.includes("invoice")) {
    return {
      icon: "🧾",
      badgeLabel: "Sale Recorded",
      badgeClass: "badge badge-ok text-xs font-bold",
      cardBorder: "border-l-4 border-l-emerald-500 bg-emerald-500/5",
    };
  }

  if (
    t === "purchase" ||
    msg.includes("restock") ||
    msg.includes("purchase")
  ) {
    return {
      icon: "➕",
      badgeLabel: "Inventory Restock",
      badgeClass: "badge badge-purple text-xs font-bold",
      cardBorder: "border-l-4 border-l-purple-500 bg-purple-500/5",
    };
  }

  return {
    icon: "🔔",
    badgeLabel: "System Alert",
    badgeClass: "badge badge-info text-xs font-bold",
    cardBorder: "border-l-4 border-l-sky-500 bg-sky-500/5",
  };
}

// ── 3. Update KPI Stat Cards & Filter Tab Badges ────────────────────────────
function updateStatsAndBadges() {
  const total = rows.length;
  const unread = rows.filter((r) => !r.read).length;
  const stock = rows.filter(
    (r) =>
      r.type === "stock" ||
      String(r.message).toLowerCase().includes("stock"),
  ).length;
  const sale = rows.filter(
    (r) =>
      r.type === "sale" ||
      String(r.message).toLowerCase().includes("sale"),
  ).length;
  const purchase = rows.filter(
    (r) =>
      r.type === "purchase" ||
      String(r.message).toLowerCase().includes("restock"),
  ).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = rows.filter((r) => {
    const d = toDate(r.createdAt);
    return d && d.toISOString().slice(0, 10) === todayStr;
  }).length;

  $("#statTotalCount") && ($("#statTotalCount").textContent = total);
  $("#statUnreadCount") && ($("#statUnreadCount").textContent = unread);
  $("#statStockCount") && ($("#statStockCount").textContent = stock);
  $("#statTodayCount") && ($("#statTodayCount").textContent = todayCount);

  $("#tabCountAll") && ($("#tabCountAll").textContent = total);
  $("#tabCountUnread") && ($("#tabCountUnread").textContent = unread);
  $("#tabCountStock") && ($("#tabCountStock").textContent = stock);
  $("#tabCountSale") && ($("#tabCountSale").textContent = sale);
  $("#tabCountPurchase") && ($("#tabCountPurchase").textContent = purchase);
}

// ── 4. Filter & Search Logic ───────────────────────────────────────────────
function getFilteredRows() {
  return rows.filter((n) => {
    // 1. Tab filter
    if (activeFilter === "unread" && n.read) return false;
    if (
      activeFilter === "stock" &&
      n.type !== "stock" &&
      !String(n.message).toLowerCase().includes("stock")
    ) {
      return false;
    }
    if (
      activeFilter === "sale" &&
      n.type !== "sale" &&
      !String(n.message).toLowerCase().includes("sale")
    ) {
      return false;
    }
    if (
      activeFilter === "purchase" &&
      n.type !== "purchase" &&
      !String(n.message).toLowerCase().includes("restock")
    ) {
      return false;
    }

    // 2. Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const msg = String(n.message || "").toLowerCase();
      const type = String(n.type || "").toLowerCase();
      if (!msg.includes(q) && !type.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

// ── 5. Render Notifications ────────────────────────────────────────────────
function render() {
  updateStatsAndBadges();
  const container = $("#notificationsList");
  if (!container) return;

  const filtered = getFilteredRows();

  if (!filtered.length) {
    if (searchQuery) {
      container.innerHTML = emptyState(
        "No matching alerts found",
        `No alerts matching "${searchQuery}". Try a different keyword or reset filters.`,
      );
      return;
    }
    if (activeFilter === "unread") {
      container.innerHTML = emptyState(
        "All caught up! 🎉",
        "You have zero unread notifications. Great job!",
      );
      return;
    }
    if (activeFilter === "stock") {
      container.innerHTML = emptyState(
        "No stock alerts",
        "All product inventory levels are currently in good standing.",
      );
      return;
    }
    container.innerHTML = emptyState(
      "No notifications yet",
      "Real-time alerts from sales transactions, inventory restocks, and low stock warnings will appear here.",
    );
    return;
  }

  container.innerHTML = filtered
    .map((n) => {
      const cfg = getTypeConfig(n);
      const isUnread = !n.read;
      const timeStr = formatRelativeTime(n.createdAt);
      const fullDateStr = dateText(n.createdAt);

      return `
        <div class="glass p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${
          cfg.cardBorder
        } ${isUnread ? "ring-1 ring-sky-400/40 shadow-lg shadow-sky-500/5" : "opacity-85 hover:opacity-100"}">
          
          <div class="flex items-start gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
              ${cfg.icon}
            </div>
            
            <div class="space-y-1.5 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="${cfg.badgeClass}">${cfg.badgeLabel}</span>
                ${
                  isUnread
                    ? '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400"><span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span> Unread</span>'
                    : '<span class="text-[11px] text-slate-500 font-medium">Read</span>'
                }
              </div>
              
              <div class="font-bold text-slate-100 text-sm md:text-base leading-snug break-words">
                ${n.message || "-"}
              </div>
              
              <div class="text-xs text-slate-400 flex items-center gap-2">
                <span title="${fullDateStr}">🕒 ${timeStr}</span>
                <span>•</span>
                <span class="text-slate-500">${fullDateStr}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end md:self-center flex-shrink-0">
            <button
              class="btn btn-sm ${isUnread ? "btn-ghost text-sky-400 hover:text-sky-300" : "btn-ghost text-slate-400 hover:text-slate-300"}"
              onclick="toggleRead('${n.id}')"
              title="${isUnread ? "Mark as Read" : "Mark as Unread"}"
            >
              ${isUnread ? "✓ Mark Read" : "↩ Mark Unread"}
            </button>
            
            <button
              class="btn btn-sm btn-ghost text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-2"
              onclick="deleteNotice('${n.id}')"
              title="Delete Notification"
            >
              🗑️
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ── 6. Optimistic Toggle Read / Unread ──────────────────────────────────────
window.toggleRead = async (id) => {
  const item = rows.find((r) => r.id === id);
  if (!item) return;

  const nextState = !item.read;
  // Optimistic 0ms local update
  item.read = nextState;
  item.readAt = nextState ? new Date() : null;
  render();

  try {
    await updateDoc(doc(db, "notifications", id), {
      read: nextState,
      readAt: nextState ? serverTimestamp() : null,
    });
  } catch (err) {
    console.error("Toggle notification read state failed:", err);
    // Revert optimistic update on failure
    item.read = !nextState;
    render();
    toast("Failed to update alert state", "err");
  }
};

// ── 7. Optimistic Delete Single Notification ───────────────────────────────
window.deleteNotice = async (id) => {
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return;

  const [removed] = rows.splice(idx, 1);
  render();

  try {
    await deleteDoc(doc(db, "notifications", id));
    toast("Alert removed", "ok");
  } catch (err) {
    console.error("Delete notification failed:", err);
    rows.splice(idx, 0, removed);
    render();
    toast("Could not delete alert", "err");
  }
};

// ── 8. High-Performance Atomic Batch "Mark All Read" ───────────────────────
$("#markAllRead")?.addEventListener("click", async () => {
  const unreadItems = rows.filter((r) => !r.read);
  if (!unreadItems.length) {
    return toast("All notifications are already marked as read.", "ok");
  }

  const btn = $("#markAllRead");
  setBusy(btn, true, "Marking...");

  // Optimistic 0ms local state update
  unreadItems.forEach((r) => {
    r.read = true;
    r.readAt = new Date();
  });
  render();

  try {
    const batchSize = 450;
    for (let i = 0; i < unreadItems.length; i += batchSize) {
      const chunk = unreadItems.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        batch.update(doc(db, "notifications", item.id), {
          read: true,
          readAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
    toast(
      `Marked ${unreadItems.length} alert${unreadItems.length === 1 ? "" : "s"} as read.`,
      "ok",
    );
  } catch (err) {
    console.error("Batch mark all read failed:", err);
    toast("Error marking all read: " + err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

// ── 9. High-Performance Atomic Batch "Clear Read" ──────────────────────────
$("#clearRead")?.addEventListener("click", async () => {
  const readItems = rows.filter((r) => r.read);
  if (!readItems.length) {
    return toast("No read notifications to clear.", "info");
  }

  if (
    !confirm(
      `Permanently clear ${readItems.length} read alert${readItems.length === 1 ? "" : "s"}?`,
    )
  ) {
    return;
  }

  const btn = $("#clearRead");
  setBusy(btn, true, "Clearing...");

  // Optimistic 0ms local removal
  const readIds = new Set(readItems.map((r) => r.id));
  rows = rows.filter((r) => !readIds.has(r.id));
  render();

  try {
    const batchSize = 450;
    for (let i = 0; i < readItems.length; i += batchSize) {
      const chunk = readItems.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        batch.delete(doc(db, "notifications", item.id));
      });
      await batch.commit();
    }
    toast(
      `Cleared ${readItems.length} read alert${readItems.length === 1 ? "" : "s"}.`,
      "ok",
    );
  } catch (err) {
    console.error("Batch clear read failed:", err);
    toast("Error clearing read alerts: " + err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

// ── 10. Filter Tabs & Search Listeners ─────────────────────────────────────
$$(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".filter-tab").forEach((t) => {
      t.classList.remove("btn-primary", "active");
      t.classList.add("btn-ghost");
    });
    tab.classList.remove("btn-ghost");
    tab.classList.add("btn-primary", "active");

    activeFilter = tab.dataset.filter || "all";
    render();
  });
});

const searchInput = $("#searchAlerts");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    render();
  });
}

// ── 11. Instant 0ms Cached Load & Real-Time Sync ───────────────────────────
const cacheKey = `salesiq_cache_notifications_${profile.id}_true`;
try {
  const cached = getCachedCollection(cacheKey);
  if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
    rows = cached.data;
    render();
    hideSkeletonLoader();
  }
} catch (_) {}

watchCollection(
  "notifications",
  (data) => {
    rows = data || [];
    render();
    hideSkeletonLoader();
  },
  true,
  profile.id,
);
