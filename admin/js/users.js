import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  toast,
  dateText,
  badgeForStatus,
  emptyState,
  setBusy,
} from "../../js/shared.js";

import {
  firebaseConfig,
  initializeApp,
  deleteApp,
  getAuth,
  createUserWithEmailAndPassword,
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
} from "../../js/firebase-config.js";

import { accountCollectionForRole } from "../../js/account.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "users", profile);

let admins = [];
let staff = [];
let selectedStaffId = null;

function safeArg(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}

function renderStats() {
  const unassigned = staff.filter(s => s.status === "pending_assignment" && !s.assignedAdminId).length;
  const myStaff = staff.filter(s => s.assignedAdminId === profile.id).length;
  const otherStaff = staff.filter(s => s.assignedAdminId && s.assignedAdminId !== profile.id).length;

  $("#userStats").innerHTML = [
    ["Unassigned Staff", unassigned, "Awaiting assignment"],
    ["My Staff", myStaff, "Assigned to you"],
    ["Other Admins' Staff", otherStaff, "Assigned to other admins"],
    ["Admin Accounts", admins.length, "Admin & Manager"],
  ].map(x => `<div class="glass stat-card"><div class="stat-label">${x[0]}</div><div class="stat-value">${x[1]}</div><div class="stat-hint">${x[2]}</div></div>`).join("");
}

function renderUnassigned() {
  const unassigned = staff.filter(s => s.status === "pending_assignment" && !s.assignedAdminId);
  const hasSelected = unassigned.some(s => $(`#check_${s.id}`)?.checked);

  if (hasSelected) {
    $("#bulkAssignBtn").style.display = "";
  } else {
    $("#bulkAssignBtn").style.display = "none";
  }

  $("#unassignedTable").innerHTML = unassigned.length
    ? `<div class="table-wrap"><table><thead><tr><th><input type="checkbox" id="selectAllUnassigned" class="checkbox"></th><th>Name</th><th>Email</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>${unassigned.map(u => `
        <tr>
          <td><input type="checkbox" id="check_${u.id}" class="checkbox unassigned-check" value="${u.id}"></td>
          <td class="font-black">${u.name || "-"}</td>
          <td>${u.email || "-"}</td>
          <td><span class="badge badge-warn">Pending</span></td>
          <td>${dateText(u.createdAt)}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="assignToMe('${safeArg(u.id)}')">Assign to Me</button>
          </td>
        </tr>
      `).join("")}</tbody></table></div>`
    : emptyState("No unassigned staff", "Staff who self-register appear here waiting for assignment.");
}

function renderMyStaff() {
  const myStaff = staff.filter(s => s.assignedAdminId === profile.id);

  $("#myStaffTable").innerHTML = myStaff.length
    ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Assigned</th><th>Actions</th></tr></thead><tbody>${myStaff.map(u => `
        <tr>
          <td class="font-black">${u.name || "-"}</td>
          <td>${u.email || "-"}</td>
          <td>${badgeForStatus(u.status || "active")}</td>
          <td>${dateText(u.assignedAt)}</td>
          <td>
            <div class="flex gap-1">
              <button class="btn btn-warn btn-sm" onclick="toggleStatus('${safeArg(u.id)}', '${u.status === "inactive" ? "active" : "inactive"}')">
                ${u.status === "inactive" ? "Activate" : "Deactivate"}
              </button>
              <button class="btn btn-info btn-sm" onclick="openReassign('${safeArg(u.id)}')">
                Reassign
              </button>
              <button class="btn btn-danger btn-sm" onclick="unassign('${safeArg(u.id)}')">
                Unassign
              </button>
              <button class="btn btn-danger btn-sm" onclick="removeUser('${safeArg(u.id)}')">
                Remove
              </button>
            </div>
          </td>
        </tr>
      `).join("")}</tbody></table></div>`
    : emptyState("No staff assigned to you", "Assign unassigned staff from the list above.");
}

function renderOtherStaff() {
  const otherStaff = staff.filter(s => s.assignedAdminId && s.assignedAdminId !== profile.id);
  const adminMap = {};
  admins.forEach(a => { adminMap[a.id] = a.name || a.email; });

  $("#otherStaffTable").innerHTML = otherStaff.length
    ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Assigned To</th></tr></thead><tbody>${otherStaff.map(u => `
        <tr class="opacity-60">
          <td class="font-black">${u.name || "-"}</td>
          <td>${u.email || "-"}</td>
          <td>${badgeForStatus(u.status || "active")}</td>
          <td>${adminMap[u.assignedAdminId] || "Unknown Admin"}</td>
        </tr>
      `).join("")}</tbody></table></div>`
    : emptyState("No other staff", "No staff assigned to other admins.");
}

function renderAdmins() {
  $("#adminsTable").innerHTML = admins.length
    ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Last Login</th><th>Action</th></tr></thead><tbody>${admins.map(u => `
        <tr>
          <td class="font-black">${u.name || "-"}</td>
          <td>${u.email || "-"}</td>
          <td>${u.role || "-"}</td>
          <td>${badgeForStatus(u.status || "active")}</td>
          <td>${dateText(u.createdAt)}</td>
          <td>${dateText(u.lastLoginAt)}</td>
          <td>
            <button class="btn btn-warn btn-sm" onclick="toggleAdminStatus('${safeArg(u.id)}', '${u.status === "inactive" ? "active" : "inactive"}')">
              ${u.status === "inactive" ? "Activate" : "Deactivate"}
            </button>
          </td>
        </tr>
      `).join("")}</tbody></table></div>`
    : emptyState("No admin accounts", "Create an admin account first.");
}

function render() {
  renderStats();
  renderUnassigned();
  renderMyStaff();
  renderOtherStaff();
  renderAdmins();
}

window.assignToMe = async (staffId) => {
  try {
    await runTransaction(db, async (tx) => {
      const staffRef = doc(db, "staff", staffId);
      const staffSnap = await tx.get(staffRef);
      if (!staffSnap.exists()) throw new Error("Staff not found");
      if (staffSnap.data().assignedAdminId) throw new Error("Already assigned to another admin");

      tx.update(staffRef, {
        assignedAdminId: profile.id,
        status: "active",
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    toast("Staff assigned to you.");
    await load();
  } catch (err) {
    toast(err.message, "err");
  }
};

window.toggleStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, "staff", id), {
      status,
      updatedAt: serverTimestamp(),
    });
    toast("Status updated.");
    await load();
  } catch (err) {
    toast(err.message, "err");
  }
};

window.toggleAdminStatus = async (id, status) => {
  try {
    await updateDoc(doc(db, "admins", id), {
      status,
      updatedAt: serverTimestamp(),
    });
    toast("Status updated.");
    await load();
  } catch (err) {
    toast(err.message, "err");
  }
};

window.unassign = async (staffId) => {
  if (!confirm("Unassign this staff? They will go back to pending assignment.")) return;

  try {
    await runTransaction(db, async (tx) => {
      const staffRef = doc(db, "staff", staffId);
      const staffSnap = await tx.get(staffRef);
      if (!staffSnap.exists()) throw new Error("Staff not found");

      tx.update(staffRef, {
        assignedAdminId: null,
        status: "pending_assignment",
        assignedAt: null,
        updatedAt: serverTimestamp(),
      });
    });

    toast("Staff unassigned.");
    await load();
  } catch (err) {
    toast(err.message, "err");
  }
};

window.removeUser = async (id) => {
  if (!confirm("Remove this staff account? This cannot be undone.")) return;

  try {
    await deleteDoc(doc(db, "staff", id));
    toast("Account removed.");
    await load();
  } catch (err) {
    toast(err.message, "err");
  }
};

window.openReassign = (staffId) => {
  selectedStaffId = staffId;
  const otherAdmins = admins.filter(a => a.id !== profile.id);
  $("#reassignAdminSelect").innerHTML = otherAdmins.length
    ? otherAdmins.map(a => `<option value="${a.id}">${a.name || a.email}</option>`).join("")
    : '<option value="">No other admins available</option>';
  $("#reassignModal").classList.add("show");
};

$$("[data-close-modal]").forEach((btn) => {
  btn.onclick = () => {
    $("#userModal").classList.remove("show");
    $("#reassignModal").classList.remove("show");
  };
});

$("#reassignCancel")?.addEventListener("click", () => {
  $("#reassignModal").classList.remove("show");
  selectedStaffId = null;
});

$("#reassignConfirm")?.addEventListener("click", async () => {
  if (!selectedStaffId) return;
  const newAdminId = $("#reassignAdminSelect").value;
  if (!newAdminId) return toast("Select an admin.", "err");

  try {
    await runTransaction(db, async (tx) => {
      const staffRef = doc(db, "staff", selectedStaffId);
      const staffSnap = await tx.get(staffRef);
      if (!staffSnap.exists()) throw new Error("Staff not found");

      tx.update(staffRef, {
        assignedAdminId: newAdminId,
        updatedAt: serverTimestamp(),
      });
    });

    toast("Staff reassigned.");
    $("#reassignModal").classList.remove("show");
    selectedStaffId = null;
    await load();
  } catch (err) {
    toast(err.message, "err");
  }
});

$$("[data-close-modal]").forEach((btn) => {
  btn.onclick = () => {
    $("#reassignModal").classList.remove("show");
    selectedStaffId = null;
  };
});

$("#selectAllUnassigned")?.addEventListener("change", (e) => {
  $$(".unassigned-check").forEach(cb => { cb.checked = e.target.checked; });
  renderUnassigned();
});

$("#bulkAssignBtn")?.addEventListener("click", async () => {
  const selected = $$(".unassigned-check:checked").map(cb => cb.value);
  if (!selected.length) return toast("Select staff first.", "err");

  setBusy($("#bulkAssignBtn"), true, "Assigning...");

  try {
    for (const staffId of selected) {
      await runTransaction(db, async (tx) => {
        const staffRef = doc(db, "staff", staffId);
        const staffSnap = await tx.get(staffRef);
        if (!staffSnap.exists()) throw new Error("Staff not found");
        if (staffSnap.data().assignedAdminId) throw new Error(`${staffSnap.data().name} already assigned`);

        tx.update(staffRef, {
          assignedAdminId: profile.id,
          status: "active",
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    }

    toast(`${selected.length} staff assigned to you.`);
    await load();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy($("#bulkAssignBtn"), false, "Assign Selected to Me");
  }
});

$("#openUserModal").onclick = () => $("#userModal").classList.add("show");

$$("[data-close-modal]").forEach((btn) => {
  btn.onclick = () => {
    $("#userModal").classList.remove("show");
    $("#reassignModal").classList.remove("show");
  };
});

$("#userForm").onsubmit = async (e) => {
  e.preventDefault();

  let secondary = null;

  try {
    const name = $("#staffName").value.trim();
    const email = $("#staffEmail").value.trim();
    const password = $("#staffPassword").value;
    const role = $("#staffRole").value;
    const accountCollection = accountCollectionForRole(role);

    secondary = initializeApp(firebaseConfig, "secondary-" + Date.now());
    const secondaryAuth = getAuth(secondary);

    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    );

    // Admin-created staff get active status and assigned to this admin
    const isStaff = role === "Sales Staff";

    await setDoc(doc(db, accountCollection, cred.user.uid), {
      name,
      email,
      role,
      status: "active",
      assignedAdminId: isStaff ? profile.id : null,
      assignedAt: isStaff ? serverTimestamp() : null,
      photoURL: "",
      createdAt: serverTimestamp(),
      createdBy: profile.id,
    });

    toast("Account created");
    $("#userModal").classList.remove("show");
    e.target.reset();
    await load();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    if (secondary) await deleteApp(secondary).catch(() => {});
  }
};

$("#refreshMyStaff")?.addEventListener("click", load);

async function load() {
  try {
    const [fetchedAdmins, fetchedStaff] = await Promise.all([
      fetchAll("admins"),
      fetchAll("staff"),
    ]);

    admins = fetchedAdmins;
    staff = fetchedStaff;

    render();
  } catch (err) {
    console.error(err);
    toast("Could not load admin/staff accounts. Check Firestore rules.", "err");
  }
}

load();