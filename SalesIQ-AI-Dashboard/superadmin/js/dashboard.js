import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  toast,
  dateText,
  badgeForStatus,
  emptyState,
  hideSkeletonLoader,
  invalidateCache,
  getCachedCollection,
} from "../../js/shared.js";

import {
  db,
  doc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "../../js/firebase-config.js";

// ── Auth gate: only Super Admin may enter ──────────────────────────────────
const { profile } = await requireAuth(["Super Admin"]);
initAppShell("superadmin", "dashboard", profile);

// ── State ──────────────────────────────────────────────────────────────────
let allAdmins = [];
let allStaff = [];

// ── Confirm-delete modal helpers ───────────────────────────────────────────
let pendingDeleteId = null;
let pendingDeleteCollection = null;

const backdrop = $("#confirmModalBackdrop");
const cancelBtn = $("#confirmCancelBtn");
const deleteBtn = $("#confirmDeleteBtn");
const confirmText = $("#confirmModalText");

function openConfirm(id, col, name) {
  pendingDeleteId = id;
  pendingDeleteCollection = col;
  confirmText.textContent =
    `Remove "${name}" from the ${col === "admins" ? "Admin" : "Sales Staff"} list? ` +
    "This deletes their Firestore profile only — their Firebase Auth account remains until removed via the Firebase Console.";
  backdrop.classList.add("show");
}

cancelBtn.onclick = () => {
  backdrop.classList.remove("show");
  pendingDeleteId = null;
  pendingDeleteCollection = null;
};

deleteBtn.onclick = async () => {
  if (!pendingDeleteId || !pendingDeleteCollection) return;
  const id = pendingDeleteId;
  const col = pendingDeleteCollection;
  backdrop.classList.remove("show");
  pendingDeleteId = null;
  pendingDeleteCollection = null;

  try {
    await deleteDoc(doc(db, col, id));
    toast("Account profile removed.", "ok");
    await load();
  } catch (err) {
    toast("Failed to remove: " + err.message, "err");
  }
};

// Expose for inline onclick
window.saRemoveAccount = (id, col, name) => openConfirm(id, col, name);

// ── Super Admin Role Changer ───────────────────────────────────────────────
window.saChangeRole = async (id, targetRole, currentCollection) => {
  const isTargetStaff = targetRole === "Sales Staff";
  const sourceUser =
    currentCollection === "admins"
      ? allAdmins.find((a) => a.id === id)
      : allStaff.find((s) => s.id === id);

  if (!sourceUser) {
    toast("User account not found.", "err");
    return;
  }

  const name = sourceUser.name || sourceUser.email || "this user";
  const msg = isTargetStaff
    ? `Demote / Convert "${name}" from Admin to Sales Staff?\nThey will lose Admin privileges and be moved to the Sales Staff directory.`
    : `Promote "${name}" from Sales Staff to Admin?\nThey will be granted full Admin privileges and moved to the Admins directory.`;

  if (!confirm(msg)) {
    await load();
    return;
  }

  try {
    const targetCollection = isTargetStaff ? "staff" : "admins";
    const { id: _id, ...userData } = sourceUser;

    const payload = {
      ...userData,
      role: targetRole,
      accountCollection: targetCollection,
      updatedAt: serverTimestamp(),
      movedAt: serverTimestamp(),
    };

    if (!isTargetStaff) {
      delete payload.adminId;
      delete payload.pendingRequest;
    }

    await setDoc(doc(db, targetCollection, id), payload, { merge: true });
    await deleteDoc(doc(db, currentCollection, id));

    invalidateCache("admins");
    invalidateCache("staff");

    toast(`Role successfully updated to "${targetRole}".`, "ok");
    await load();
  } catch (err) {
    console.error("Super Admin role change error:", err);
    toast("Failed to change role: " + err.message, "err");
    await load();
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────
function safeArg(v) {
  return String(v || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}

function adminNameFor(adminId) {
  if (!adminId) return null;
  const adm = allAdmins.find((a) => a.id === adminId);
  return adm ? adm.name || adm.email || "Admin" : null;
}

// ── Render admins table ────────────────────────────────────────────────────
function renderAdmins() {
  const container = $("#adminsTable");
  if (!container) return;

  $("#adminBadge").textContent = allAdmins.length;
  $("#totalAdmins").textContent = allAdmins.length;

  if (!allAdmins.length) {
    container.innerHTML = emptyState(
      "No admins yet",
      "No admin accounts have been created.",
    );
    return;
  }

  // Count staff per admin for display
  const staffCountFor = (adminId) =>
    allStaff.filter((s) => s.adminId === adminId).length;

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Staff Under</th>
            <th>Created</th>
            <th>Last Login</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${allAdmins
            .map(
              (u) => `
            <tr>
              <td class="font-black">${u.name || "—"}</td>
              <td>${u.email || "—"}</td>
              <td>
                <select
                  class="input input-sm py-1 px-2 text-xs font-semibold bg-slate-900 border border-amber-500/30 text-amber-300 rounded-lg cursor-pointer"
                  onchange="saChangeRole('${safeArg(u.id)}', this.value, 'admins')"
                  title="Change user role (Super Admin only)"
                >
                  <option value="Admin" selected>🛡️ Admin</option>
                  <option value="Sales Staff">👥 Sales Staff</option>
                </select>
              </td>
              <td>${badgeForStatus(u.status || "active")}</td>
              <td>
                <span class="admin-pill">👥 ${staffCountFor(u.id)} staff</span>
              </td>
              <td>${dateText(u.createdAt)}</td>
              <td>${dateText(u.lastLoginAt)}</td>
              <td>
                <button
                  class="btn btn-danger btn-sm"
                  onclick="saRemoveAccount('${safeArg(u.id)}', 'admins', '${safeArg(u.name || u.email)}')"
                >
                  Remove
                </button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ── Render staff table ─────────────────────────────────────────────────────
function renderStaff() {
  const container = $("#staffTable");
  if (!container) return;

  const connected = allStaff.filter((s) => s.adminId);
  const unconnected = allStaff.filter((s) => !s.adminId);

  $("#staffBadge").textContent = allStaff.length;
  $("#totalStaff").textContent = allStaff.length;
  $("#connectedStaff").textContent = connected.length;
  $("#unconnectedStaff").textContent = unconnected.length;

  if (!allStaff.length) {
    container.innerHTML = emptyState(
      "No staff yet",
      "No sales staff accounts have been created.",
    );
    return;
  }

  // Sort: connected first, then by admin name
  const sorted = [...allStaff].sort((a, b) => {
    const aN = adminNameFor(a.adminId) || "";
    const bN = adminNameFor(b.adminId) || "";
    if (!a.adminId && b.adminId) return 1;
    if (a.adminId && !b.adminId) return -1;
    return aN.localeCompare(bN) || (a.name || "").localeCompare(b.name || "");
  });

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Assigned Admin</th>
            <th>Created</th>
            <th>Last Login</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map((u) => {
              const adminName = adminNameFor(u.adminId);
              const connBadge = adminName
                ? `<span class="admin-pill">🔗 ${adminName}</span>`
                : `<span class="unconnected-pill">⚠️ Unconnected</span>`;
              return `
              <tr>
                <td class="font-black">${u.name || "—"}</td>
                <td>${u.email || "—"}</td>
                <td>
                  <select
                    class="input input-sm py-1 px-2 text-xs font-semibold bg-slate-900 border border-purple-500/30 text-purple-300 rounded-lg cursor-pointer"
                    onchange="saChangeRole('${safeArg(u.id)}', this.value, 'staff')"
                    title="Change user role (Super Admin only)"
                  >
                    <option value="Sales Staff" selected>👥 Sales Staff</option>
                    <option value="Admin">🛡️ Admin</option>
                  </select>
                </td>
                <td>${badgeForStatus(u.status || "active")}</td>
                <td>${connBadge}</td>
                <td>${dateText(u.createdAt)}</td>
                <td>${dateText(u.lastLoginAt)}</td>
                <td>
                  <button
                    class="btn btn-danger btn-sm"
                    onclick="saRemoveAccount('${safeArg(u.id)}', 'staff', '${safeArg(u.name || u.email)}')"
                  >
                    Remove
                  </button>
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

// ── Load data ──────────────────────────────────────────────────────────────
async function load() {
  // 0ms instant cached boot
  try {
    const cachedAdmins = getCachedCollection("salesiq_cache_admins_all_false");
    const cachedStaff = getCachedCollection("salesiq_cache_staff_all_false");
    const admData = cachedAdmins?.data || (Array.isArray(cachedAdmins) ? cachedAdmins : null);
    const stData = cachedStaff?.data || (Array.isArray(cachedStaff) ? cachedStaff : null);

    if (admData || stData) {
      if (admData) allAdmins = admData;
      if (stData) allStaff = stData;
      renderAdmins();
      renderStaff();
      hideSkeletonLoader();
    }
  } catch (e) {
    console.warn("Cached superadmin restore:", e);
  }

  try {
    const [admins, staff] = await Promise.all([
      fetchAll("admins"),
      fetchAll("staff"),
    ]);

    allAdmins = admins;
    allStaff = staff;

    renderAdmins();
    renderStaff();
  } catch (err) {
    console.error(err);
    toast("Could not load accounts. Check Firestore rules.", "err");
  } finally {
    hideSkeletonLoader();
  }
}

load();
