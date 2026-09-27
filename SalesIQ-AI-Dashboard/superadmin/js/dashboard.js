import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  toast,
  dateText,
  badgeForStatus,
  emptyState,
} from "../../js/shared.js";

import {
  db,
  doc,
  deleteDoc,
} from "../../js/firebase-config.js";

// ── Auth gate: only Super Admin may enter ──────────────────────────────────
const { profile } = await requireAuth(["Super Admin"]);
initAppShell("superadmin", "dashboard", profile);

// ── State ──────────────────────────────────────────────────────────────────
let allAdmins = [];
let allStaff  = [];

// ── Confirm-delete modal helpers ───────────────────────────────────────────
let pendingDeleteId         = null;
let pendingDeleteCollection = null;

const backdrop    = $("#confirmModalBackdrop");
const cancelBtn   = $("#confirmCancelBtn");
const deleteBtn   = $("#confirmDeleteBtn");
const confirmText = $("#confirmModalText");

function openConfirm(id, col, name) {
  pendingDeleteId         = id;
  pendingDeleteCollection = col;
  confirmText.textContent =
    `Remove "${name}" from the ${col === "admins" ? "Admin" : "Sales Staff"} list? ` +
    "This deletes their Firestore profile only — their Firebase Auth account remains until removed via the Firebase Console.";
  backdrop.classList.add("show");
}

cancelBtn.onclick = () => {
  backdrop.classList.remove("show");
  pendingDeleteId         = null;
  pendingDeleteCollection = null;
};

deleteBtn.onclick = async () => {
  if (!pendingDeleteId || !pendingDeleteCollection) return;
  const id  = pendingDeleteId;
  const col = pendingDeleteCollection;
  backdrop.classList.remove("show");
  pendingDeleteId         = null;
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

// ── Helpers ────────────────────────────────────────────────────────────────
function safeArg(v) {
  return String(v || "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function adminNameFor(adminId) {
  if (!adminId) return null;
  const adm = allAdmins.find((a) => a.id === adminId);
  return adm ? (adm.name || adm.email || "Admin") : null;
}

// ── Render admins table ────────────────────────────────────────────────────
function renderAdmins() {
  const container = $("#adminsTable");
  if (!container) return;

  $("#adminBadge").textContent = allAdmins.length;
  $("#totalAdmins").textContent = allAdmins.length;

  if (!allAdmins.length) {
    container.innerHTML = emptyState("No admins yet", "No admin accounts have been created.");
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
            <th>Status</th>
            <th>Staff Under</th>
            <th>Created</th>
            <th>Last Login</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${allAdmins.map((u) => `
            <tr>
              <td class="font-black">${u.name || "—"}</td>
              <td>${u.email || "—"}</td>
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
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ── Render staff table ─────────────────────────────────────────────────────
function renderStaff() {
  const container = $("#staffTable");
  if (!container) return;

  const connected   = allStaff.filter((s) => s.adminId);
  const unconnected = allStaff.filter((s) => !s.adminId);

  $("#staffBadge").textContent        = allStaff.length;
  $("#totalStaff").textContent        = allStaff.length;
  $("#connectedStaff").textContent    = connected.length;
  $("#unconnectedStaff").textContent  = unconnected.length;

  if (!allStaff.length) {
    container.innerHTML = emptyState("No staff yet", "No sales staff accounts have been created.");
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
            <th>Status</th>
            <th>Assigned Admin</th>
            <th>Created</th>
            <th>Last Login</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((u) => {
            const adminName = adminNameFor(u.adminId);
            const connBadge = adminName
              ? `<span class="admin-pill">🔗 ${adminName}</span>`
              : `<span class="unconnected-pill">⚠️ Unconnected</span>`;
            return `
              <tr>
                <td class="font-black">${u.name || "—"}</td>
                <td>${u.email || "—"}</td>
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
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ── Load data ──────────────────────────────────────────────────────────────
async function load() {
  try {
    const [admins, staff] = await Promise.all([
      fetchAll("admins"),
      fetchAll("staff"),
    ]);

    allAdmins = admins;
    allStaff  = staff;

    renderAdmins();
    renderStaff();
  } catch (err) {
    console.error(err);
    toast("Could not load accounts. Check Firestore rules.", "err");
  }
}

load();

