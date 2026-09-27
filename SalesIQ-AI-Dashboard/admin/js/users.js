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
const modal = $('#userModal');

function safeArg(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

function renderSection(containerId, users, emptyMsg, isStaff = false) {
  const container = $(containerId);
  if (!container) return;
  
  container.innerHTML = users.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              ${isStaff ? '<th>Admin Connection</th>' : ''}
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              let connectionHTML = '';
              if (isStaff) {
                if (u.adminId === profile.id) {
                   connectionHTML = `
                     <span class="badge badge-ok">Connected to you</span><br>
                     <button class="btn btn-ghost btn-sm text-red-400 mt-1 p-0 h-auto" onclick="disconnectStaff('${safeArg(u.id)}')">Disconnect</button>
                   `;
                } else if (u.pendingRequest && u.pendingRequest.adminId === profile.id) {
                   connectionHTML = `
                     <span class="badge badge-warn">Invitation Pending</span><br>
                     <button class="btn btn-ghost btn-sm text-red-400 mt-1 p-0 h-auto" onclick="cancelStaffRequest('${safeArg(u.id)}')">Cancel</button>
                   `;
                } else if (u.adminId) {
                   connectionHTML = `<span class="badge bg-slate-700">Connected to Other Admin</span>`;
                } else {
                   connectionHTML = `<span class="text-slate-500 text-xs">Not Connected</span>`;
                }
              }

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
                ${isStaff ? `<td>${connectionHTML}</td>` : ''}
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
            `}).join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyState('No accounts', emptyMsg);
}

function renderAll() {
  const admins = allUsers.filter(u => u.role === 'Admin' && u.accountCollection === 'admins');
  const staff = allUsers.filter(u => u.role === 'Sales Staff' && u.accountCollection === 'staff');
  const unassigned = allUsers.filter(u => 
    (u.role === 'Sales Staff' && u.accountCollection === 'admins') ||
    (u.role !== 'Sales Staff' && u.accountCollection === 'staff') ||
    !['Admin', 'Sales Staff'].includes(u.role)
  );

  $('#adminCount').textContent = admins.length;
  $('#staffCount').textContent = staff.length;
  $('#unassignedCount').textContent = unassigned.length;

  renderSection('#adminsTable', admins, 'No admins yet. Create an Admin account above.');
  renderSection('#staffTable', staff, 'No sales staff yet. Create a Sales Staff account above.', true);
  renderSection('#unassignedTable', unassigned, 'No unassigned accounts. Accounts with mismatched role/collection appear here.');
}

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

window.sendStaffRequest = async (staffId) => {
  try {
    await updateDoc(doc(db, 'staff', staffId), {
      pendingRequest: {
        adminId: profile.id,
        adminName: profile.name || profile.email,
        adminEmail: profile.email,
        status: 'pending',
        sentAt: Date.now()
      }
    });
    toast('Invitation sent');
    await load();
    if ($('#searchStaffBtn')) $('#searchStaffBtn').click();
  } catch (err) {
    toast('Error sending request: ' + err.message, 'err');
  }
};

window.cancelStaffRequest = async (staffId) => {
  try {
    await updateDoc(doc(db, 'staff', staffId), {
      pendingRequest: null
    });
    toast('Invitation cancelled');
    await load();
    if ($('#searchStaffBtn')) $('#searchStaffBtn').click();
  } catch (err) {
    toast('Error cancelling request: ' + err.message, 'err');
  }
};

window.disconnectStaff = async (staffId) => {
  try {
    if(!confirm('Are you sure you want to disconnect this staff member?')) return;
    await updateDoc(doc(db, 'staff', staffId), {
      adminId: null,
      adminName: null,
      adminEmail: null,
      adminStatus: null
    });
    toast('Staff disconnected');
    await load();
    if ($('#searchStaffBtn')) $('#searchStaffBtn').click();
  } catch (err) {
    toast('Error disconnecting staff: ' + err.message, 'err');
  }
};

if ($('#searchStaffBtn')) {
  $('#searchStaffBtn').onclick = () => {
    const q = $('#staffSearchInput').value.trim().toLowerCase();
    const resultsContainer = $('#staffSearchResults');
    if (!q) {
      resultsContainer.classList.add('hidden');
      return;
    }
    
    const staff = allUsers.filter(u => u.accountCollection === 'staff' && u.id !== profile.id);
    const matches = staff.filter(u => 
      (u.email || '').toLowerCase().includes(q) || 
      (u.name || '').toLowerCase().includes(q)
    );
    
    resultsContainer.classList.remove('hidden');
    if (!matches.length) {
      resultsContainer.innerHTML = `<p class="text-sm text-slate-400">No staff members found matching "${q}"</p>`;
      return;
    }

    resultsContainer.innerHTML = matches.map(u => {
      let actionBtn = `<button class="btn btn-primary btn-sm" onclick="sendStaffRequest('${safeArg(u.id)}')">Send Request</button>`;
      if (u.adminId === profile.id) {
         actionBtn = `
           <div class="flex gap-2 items-center">
             <span class="badge badge-ok">Connected</span>
             <button class="btn btn-ghost btn-sm text-red-400" onclick="disconnectStaff('${safeArg(u.id)}')">Disconnect</button>
           </div>
         `;
      } else if (u.pendingRequest && u.pendingRequest.adminId === profile.id) {
         actionBtn = `
           <div class="flex gap-2 items-center">
             <span class="badge badge-warn">Invitation Pending</span>
             <button class="btn btn-ghost btn-sm text-red-400" onclick="cancelStaffRequest('${safeArg(u.id)}')">Cancel</button>
           </div>
         `;
      } else if (u.adminId) {
         actionBtn = `<span class="badge bg-slate-700">Connected to Other Admin</span>`;
      }

      return `
        <div class="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700/50">
          <div>
            <p class="font-bold text-slate-200">${u.name || 'Unnamed'}</p>
            <p class="text-xs text-slate-400">${u.email}</p>
          </div>
          <div>
            ${actionBtn}
          </div>
        </div>
      `;
    }).join('');
  };

  $('#staffSearchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#searchStaffBtn').click();
    }
  });
}

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