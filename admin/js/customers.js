import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  toast,
  money,
  emptyState,
} from "../../js/shared.js";
import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin", "Manager"]);
initAppShell("admin", "customers", profile);
let rows = [];
const modal = $("#customerModal");
function open(c = {}) {
  $("#customerId").value = c.id || "";
  $("#custName").value = c.name || "";
  $("#custPhone").value = c.phone || "";
  $("#custEmail").value = c.email || "";
  $("#custSpent").value = c.totalSpent || c.totalAmountSpent || 0;
  $("#custLast").value = c.lastPurchaseDate || "";
  modal.classList.add("show");
}
window.editCustomer = (id) => open(rows.find((x) => x.id === id));
window.deleteCustomer = async (id) => {
  if (confirm("Delete customer?")) {
    await deleteDoc(doc(db, "customers", id));
    toast("Customer deleted");
    load();
  }
};
$$("[data-close-modal]").forEach(
  (b) => (b.onclick = () => modal.classList.remove("show")),
);
$("#openCustomerModal").onclick = () => open();
function render() {
  const q = $("#customerSearch").value.toLowerCase();
  const f = rows.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q),
  );
  $("#customersTable").innerHTML = f.length
    ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Total Spent</th><th>Last Purchase</th><th>Tag</th><th>Action</th></tr></thead><tbody>${f
        .map((c) => {
          const spent = Number(c.totalSpent || c.totalAmountSpent || 0);
          return `<tr><td class="font-black">${c.name || "-"}</td><td>${c.phone || "-"}</td><td>${c.email || "-"}</td><td>${money(spent)}</td><td>${c.lastPurchaseDate || "-"}</td><td>${spent >= 10000 ? '<span class="badge badge-purple">Valuable Customer</span>' : '<span class="badge badge-info">Regular</span>'}</td><td><button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Delete</button></td></tr>`;
        })
        .join("")}</tbody></table></div>`
    : emptyState("No customers", "Add or create sales to store customers.");
}
$("#customerForm").onsubmit = async (e) => {
  e.preventDefault();
  const data = {
    name: $("#custName").value.trim(),
    phone: $("#custPhone").value.trim(),
    email: $("#custEmail").value.trim(),
    totalSpent: Number($("#custSpent").value || 0),
    lastPurchaseDate: $("#custLast").value,
    updatedAt: serverTimestamp(),
  };
  const id = $("#customerId").value;
  if (id) await updateDoc(doc(db, "customers", id), data);
  else
    await addDoc(collection(db, "customers"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  toast("Customer saved");
  modal.classList.remove("show");
  load();
};
$("#customerSearch").oninput = render;
async function load() {
  rows = await fetchAll("customers");
  render();
}
load();
