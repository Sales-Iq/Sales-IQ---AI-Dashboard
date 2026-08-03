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

let users = [];
const modal = $('#userModal');

function safeArg(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

function render() {
  $('#usersTable').innerHTML = users.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Collection</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td class="font-black">${u.name || '-'}</td>
                <td>${u.email || '-'}</td>
                <td>
                  <select class="select" onchange="changeRole('${safeArg(u.id)}', this.value)">
                    <option ${u.role === 'Admin' ? 'selected' : ''}>Admin</option>
                    <option ${u.role === 'Manager' ? 'selected' : ''}>Manager</option>
                    <option ${u.role === 'Sales Staff' ? 'selected' : ''}>Sales Staff</option>
                  </select>
                </td>
                <td><code>${u.accountCollection}</code></td>
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
    `
    : emptyState('No accounts', 'Admin and staff accounts appear here.');
}

window.changeRole = async (id, role) => {
  const user = users.find(u => u.id === id);
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
  const user = users.find(u => u.id === id);
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
  const user = users.find(u => u.id === id);
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

    users = [
      ...admins.map(u => ({ ...u, accountCollection: 'admins' })),
      ...staff.map(u => ({ ...u, accountCollection: 'staff' }))
    ].sort((a, b) =>
      String(a.role || '').localeCompare(String(b.role || ''))
      || String(a.name || '').localeCompare(String(b.name || ''))
    );

    render();
  } catch (err) {
    console.error(err);
    toast('Could not load admin/staff accounts. Check Firestore rules.', 'err');
  }
}

load();
