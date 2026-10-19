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
        ? "border-l-4 border-l-rose-500"
        : "border-l-4 border-l-amber-500",
      iconBg: isOutOfStock
        ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
        : "bg-amber-500/15 border-amber-500/30 text-amber-400",
    };
  }

  if (t === "sale" || msg.includes("sale") || msg.includes("invoice")) {
    return {
      icon: "🧾",
      badgeLabel: "Sale Recorded",
      badgeClass: "badge badge-ok text-xs font-bold",
      cardBorder: "border-l-4 border-l-emerald-500",
      iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
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
      cardBorder: "border-l-4 border-l-purple-500",
      iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400",
    };
  }

  return {
    icon: "🔔",
    badgeLabel: "System Alert",
    badgeClass: "badge badge-info text-xs font-bold",
    cardBorder: "border-l-4 border-l-sky-500",
    iconBg: "bg-sky-500/15 border-sky-500/30 text-sky-400",
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

  container.innerHTML = `
    <div class="table-wrap">
      <table id="notificationsTable">
        <thead>
          <tr>
            <th>Type</th>
            <th>Alert & Details</th>
            <th>Category</th>
            <th>Date & Time</th>
            <th>Status</th>
            <th class="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((n) => {
              const cfg = getTypeConfig(n);
              const isUnread = !n.read;
              const timeStr = formatRelativeTime(n.createdAt);
              const fullDateStr = dateText(n.createdAt);

              let categoryBadge = '<span class="badge badge-info">System</span>';
              const t = String(n.type || "").toLowerCase();
              const msg = String(n.message || "").toLowerCase();
              if (t === "stock" || msg.includes("stock")) {
                categoryBadge = '<span class="badge badge-warn">Inventory</span>';
              } else if (t === "sale" || msg.includes("sale") || msg.includes("invoice")) {
                categoryBadge = '<span class="badge badge-ok">Sales</span>';
              } else if (t === "purchase" || msg.includes("restock") || msg.includes("purchase")) {
                categoryBadge = '<span class="badge badge-purple">Restock</span>';
              }

              return `
                <tr class="${isUnread ? "is-unread" : "opacity-90"}">
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="text-lg">${cfg.icon}</span>
                      <span class="${cfg.badgeClass}">${cfg.badgeLabel}</span>
                    </div>
                  </td>
                  <td>
                    <div class="font-medium text-slate-100 ${isUnread ? "font-bold text-white" : ""}">
                      ${n.message || "-"}
                    </div>
                  </td>
                  <td>
                    ${categoryBadge}
                  </td>
                  <td>
                    <div>
                      <div class="font-medium text-slate-200" title="${fullDateStr}">🕒 ${timeStr}</div>
                      <div class="text-xs text-slate-400 font-mono">${fullDateStr}</div>
                    </div>
                  </td>
                  <td>
                    ${
                      isUnread
                        ? '<span class="badge badge-info"><span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping mr-1"></span>Unread</span>'
                        : '<span class="badge badge-ghost text-slate-400">Read</span>'
                    }
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        class="btn btn-ghost btn-sm ${isUnread ? "text-sky-400 hover:text-sky-300" : "text-slate-400 hover:text-slate-300"}"
                        onclick="toggleRead('${n.id}')"
                        title="${isUnread ? "Mark as Read" : "Mark as Unread"}"
                      >
                        ${isUnread ? "✓ Mark Read" : "↩ Unread"}
                      </button>
                      <button
                        class="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 px-2 py-1 rounded-lg"
                        onclick="deleteNotice('${n.id}')"
                        title="Delete Notification"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
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
