import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  toast,
  dateText,
  badgeForStatus,
  emptyState
} from '../../js/shared.js';

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
  serverTimestamp
} from '../../js/firebase-config.js';

import { accountCollectionForRole } from '../../js/account.js';

const { profile } = await requireAuth(['Admin']);
initAppShell('admin', 'users', profile);

let allUsers = [];
let searchQueries = {
  admin: '',
  staff: '',
  unassigned: ''
};
const modal = $('#userModal');

function safeArg(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

function getStaffForAdmin(adminId) {
  return allUsers.filter(u => 
    u.role === 'Sales Staff' && 
    u.accountCollection === 'staff' && 
    u.createdBy === adminId
  );
}

function renderStaffDropdown(adminId) {
  const staff = getStaffForAdmin(adminId);
  if (!staff.length) return `
    <div class="staff-dropdown hidden" id="staff-dropdown-${adminId}">
      <div class="p-4 text-slate-400 text-sm italic border-t border-slate-700/50">
        No staff assigned to this admin yet.
      </div>
    </div>
  `;

  return `
    <div class="staff-dropdown hidden" id="staff-dropdown-${adminId}">
      <div class="table-wrap" style="margin: 0;">
        <table>
          <thead>
            <tr>
              <th style="padding-left: 48px;">Staff Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${staff.map(u => `
              <tr class="staff-row">
                <td style="padding-left: 48px;" class="font-medium">${u.name || '-'}</td>
                <td>${u.email || '-'}</td>
                <td>${badgeForStatus(u.status || 'active')}</td>
                <td>${dateText(u.createdAt)}</td>
                <td>${dateText(u.lastLoginAt)}</td>
                <td>
                  <button
                    class="btn btn-warn btn-sm"
                    onclick="toggleStatus('${safeArg(u.id)}', '${u.status === 'inactive' ? 'active' : 'inactive'}')"
                  >
                    ${u.status === 'inactive' ? 'Activate' : 'Deactivate'}
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="removeUser('${safeArg(u.id)}')">
                    Remove
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminsTable(admins) {
  const container = $('#adminsTable');
  if (!container) return;

  container.innerHTML = admins.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Staff</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${admins.map(admin => {
              const staffCount = getStaffForAdmin(admin.id).length;
              return `
                <tr class="admin-row" data-admin-id="${admin.id}">
                  <td class="font-black">${admin.name || '-'}</td>
                  <td>${admin.email || '-'}</td>
                  <td>
                    <select class="select" onchange="changeRole('${safeArg(admin.id)}', this.value)">
                      <option ${admin.role === 'Admin' ? 'selected' : ''}>Admin</option>
                      <option ${admin.role === 'Sales Staff' ? 'selected' : ''}>Sales Staff</option>
                    </select>
                  </td>
                  <td>${badgeForStatus(admin.status || 'active')}</td>
                  <td>${dateText(admin.createdAt)}</td>
                  <td>${dateText(admin.lastLoginAt)}</td>
                  <td>
                    <button 
                      class="btn btn-ghost btn-sm toggle-staff-btn" 
                      onclick="toggleStaffDropdown('${safeArg(admin.id)}')"
                      data-admin-id="${admin.id}"
                    >
                      ${staffCount} Staff ▼
                    </button>
                  </td>
                  <td>
                    <button
                      class="btn btn-warn btn-sm"
                      onclick="toggleStatus('${safeArg(admin.id)}', '${admin.status === 'inactive' ? 'active' : 'inactive'}')"
                    >
                      ${admin.status === 'inactive' ? 'Activate' : 'Deactivate'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="removeUser('${safeArg(admin.id)}')">
                      Remove
                    </button>
                  </td>
                </tr>
                <tr class="staff-dropdown-row" id="dropdown-row-${admin.id}" style="display: none;">
                  <td colspan="8" style="padding: 0;">
                    ${renderStaffDropdown(admin.id)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyState('No admins yet', 'Create an Admin account above.');
}

function renderStaffTable(staff) {
  const container = $('#staffTable');
  if (!container) return;

  container.innerHTML = staff.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Managed By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${staff.map(u => {
              const admin = allUsers.find(a => a.id === u.createdBy);
              return `
                <tr>
                  <td class="font-black">${u.name || '-'}</td>
                  <td>${u.email || '-'}</td>
                  <td>
                    <select class="select" onchange="changeRole('${safeArg(u.id)}', this.value)">
                      <option ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
                      <option ${u.role === 'Sales Staff' ? 'selected' : ''}>Sales Staff</option>
                    </select>
                  </td>
                  <td>${badgeForStatus(u.status || 'active')}</td>
                  <td>${dateText(u.createdAt)}</td>
                  <td>${dateText(u.lastLoginAt)}</td>
                  <td>
                    ${admin ? `
                      <span class="text-sky-300 font-medium">${admin.name}</span>
                      <br><span class="text-xs text-slate-400">${admin.email}</span>
                    ` : '<span class="text-slate-400">Unknown</span>'}
                  </td>
                  <td>
                    <button
                      class="btn btn-warn btn-sm"
                      onclick="toggleStatus('${safeArg(u.id)}', '${u.status === 'inactive' ? 'active' : 'inactive'}')"
                    >
                      ${u.status === 'inactive' ? 'Activate' : 'Deactivate'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="removeUser('${safeArg(u.id)}')">
                      Remove
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyState('No sales staff yet', 'Create a Sales Staff account above.');
}

function renderUnassignedTable(unassigned) {
  const container = $('#unassignedTable');
  if (!container) return;

  container.innerHTML = unassigned.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Collection</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${unassigned.map(u => `
              <tr>
                <td class="font-black">${u.name || '-'}</td>
                <td>${u.email || '-'}</td>
                <td>
                  <select class="select" onchange="changeRole('${safeArg(u.id)}', this.value)">
                    <option ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
                    <option ${u.role === 'Sales Staff' ? 'selected' : ''}>Sales Staff</option>
                  </select>
                </td>
                <td>${badgeForStatus(u.status || 'active')}</td>
                <td>${u.accountCollection || '-'}</td>
                <td>${dateText(u.createdAt)}</td>
                <td>${dateText(u.lastLoginAt)}</td>
                <td>
                  <button
                    class="btn btn-warn btn-sm"
                    onclick="toggleStatus('${safeArg(u.id)}', '${u.status === 'inactive' ? 'active' : 'inactive'}')"
                  >
                    ${u.status === 'inactive' ? 'Activate' : 'Deactivate'}
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="removeUser('${safeArg(u.id)}')">
                    Remove
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyState('No unassigned accounts', 'Accounts with mismatched role/collection appear here.');
}

function renderAll() {
  const admins = allUsers.filter(u => u.role === 'Admin' && u.accountCollection === 'admins');
  const staff = allUsers.filter(u => u.role === 'Sales Staff' && u.accountCollection === 'staff');
  const unassigned = allUsers.filter(u => 
    (u.role === 'Sales Staff' && u.accountCollection === 'admins') ||
    (u.role !== 'Sales Staff' && u.accountCollection === 'staff') ||
    !['Admin', 'Sales Staff'].includes(u.role)
  );

  renderAdminsTable(admins);
  renderStaffTable(staff);
  renderUnassignedTable(unassigned);
}

function renderAdmins() {
  const admins = allUsers.filter(u => u.role === 'Admin' && u.accountCollection === 'admins');
  const filteredAdmins = admins.filter(u => 
    (u.name || '').toLowerCase().includes(searchQueries.admin) ||
    (u.email || '').toLowerCase().includes(searchQueries.admin)
  );
  $('#adminCount').textContent = filteredAdmins.length;
  renderAdminsTable(filteredAdmins);
}

function renderStaff() {
  const staff = allUsers.filter(u => u.role === 'Sales Staff' && u.accountCollection === 'staff');
  const filteredStaff = staff.filter(u => 
    (u.name || '').toLowerCase().includes(searchQueries.staff) ||
    (u.email || '').toLowerCase().includes(searchQueries.staff)
  );
  $('#staffCount').textContent = filteredStaff.length;
  renderStaffTable(filteredStaff);
}

function renderUnassigned() {
  const unassigned = allUsers.filter(u => 
    (u.role === 'Sales Staff' && u.accountCollection === 'admins') ||
    (u.role !== 'Sales Staff' && u.accountCollection === 'staff') ||
    !['Admin', 'Sales Staff'].includes(u.role)
  );
  const filteredUnassigned = unassigned.filter(u => 
    (u.name || '').toLowerCase().includes(searchQueries.unassigned) ||
    (u.email || '').toLowerCase().includes(searchQueries.unassigned)
  );
  $('#unassignedCount').textContent = filteredUnassigned.length;
  renderUnassignedTable(filteredUnassigned);
}

window.toggleStaffDropdown = (adminId) => {
  const dropdownRow = $(`#dropdown-row-${adminId}`);
  const dropdown = $(`#staff-dropdown-${adminId}`);
  const btn = document.querySelector(`.toggle-staff-btn[data-admin-id="${adminId}"]`);
  
  if (dropdownRow && dropdown && btn) {
    const isHidden = dropdownRow.style.display === 'none';
    dropdownRow.style.display = isHidden ? 'table-row' : 'none';
    dropdown.classList.toggle('hidden', !isHidden);
    const count = getStaffForAdmin(adminId).length;
    btn.innerHTML = `${count} Staff ${isHidden ? '▲' : '▼'}`;
  }
};

window.changeRole = async (id, role) => {
  const user = allUsers.find(u => u.id === id);
  if (!user) return toast('Account not found', 'err');

  const nextCollection = accountCollectionForRole(role);
  const { id: _id, accountCollection: _collection, ...data } = user;

  try {
    if (user.accountCollection === nextCollection) {
      await updateDoc(doc(db, nextCollection, id), {
        role,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(doc(db, nextCollection, id), {
        ...data,
        role,
        updatedAt: serverTimestamp(),
        movedAt: serverTimestamp()
      }, { merge: true });

      await deleteDoc(doc(db, user.accountCollection, id));
    }

    toast('Role updated');
    load();
  } catch (err) {
    toast(err.message, 'err');
  }
};

window.toggleStatus = async (id, status) => {
  const user = allUsers.find(u => u.id === id);
  if (!user) return toast('Account not found', 'err');

  try {
    await updateDoc(doc(db, user.accountCollection, id), {
      status,
      updatedAt: serverTimestamp()
    });

    toast('Status updated');
    load();
  } catch (err) {
    toast(err.message, 'err');
  }
};

window.removeUser = async id => {
  const user = allUsers.find(u => u.id === id);
  if (!user) return toast('Account not found', 'err');

  try {
    if (confirm('Remove account profile? Auth account deletion requires Firebase Admin SDK.')) {
      await deleteDoc(doc(db, user.accountCollection, id));
      toast('Account profile removed');
      load();
    }
  } catch (err) {
    toast(err.message, 'err');
  }
};

$('#openUserModal').onclick = () => modal.classList.add('show');

$$('[data-close-modal]').forEach(btn => {
  btn.onclick = () => modal.classList.remove('show');
});

$('#adminSearch')?.addEventListener('input', (e) => {
  searchQueries.admin = e.target.value.toLowerCase();
  renderAdmins();
});

$('#staffSearch')?.addEventListener('input', (e) => {
  searchQueries.staff = e.target.value.toLowerCase();
  renderStaff();
});

$('#unassignedSearch')?.addEventListener('input', (e) => {
  searchQueries.unassigned = e.target.value.toLowerCase();
  renderUnassigned();
});

$('#userForm').onsubmit = async e => {
  e.preventDefault();

  let secondary = null;

  try {
    const name = $('#staffName').value.trim();
    const email = $('#staffEmail').value.trim();
    const password = $('#staffPassword').value;
    const role = $('#staffRole').value;
    const accountCollection = accountCollectionForRole(role);

    secondary = initializeApp(firebaseConfig, 'secondary-' + Date.now());
    const secondaryAuth = getAuth(secondary);

    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);

    await setDoc(doc(db, accountCollection, cred.user.uid), {
      name,
      email,
      role,
      status: 'active',
      photoURL: '',
      createdAt: serverTimestamp(),
      createdBy: profile.id
    });

    toast('Account created');
    modal.classList.remove('show');
    e.target.reset();
    load();
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    if (secondary) await deleteApp(secondary).catch(() => {});
  }
};

async function load() {
  try {
    const [admins, staff] = await Promise.all([
      fetchAll('admins'),
      fetchAll('staff')
    ]);

    allUsers = [
      ...admins.map(u => ({ ...u, accountCollection: 'admins' })),
      ...staff.map(u => ({ ...u, accountCollection: 'staff' }))
    ].sort((a, b) =>
      String(a.role || '').localeCompare(String(b.role || ''))
      || String(a.name || '').localeCompare(String(b.name || ''))
    );

    renderAll();
  } catch (err) {
    console.error(err);
    toast('Could not load admin/staff accounts. Check Firestore rules.', 'err');
  }
}

load();