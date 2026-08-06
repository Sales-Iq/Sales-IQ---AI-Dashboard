import {
  requireAuth,
  initAppShell,
  fetchAll,
  fetchByAdminId,
  $,
  toast,
  dateText,
  emptyState,
} from "../../js/shared.js";
import {
  db,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "notifications", profile);
let rows = [];
function icon(t) {
  return t === "stock"
    ? "⚠️"
    : t === "sale"
      ? "🧾"
      : t === "purchase"
        ? "➕"
        : "🔔";
}
function render() {
  $("#notificationsList").innerHTML = rows.length
    ? `<div class="space-y-3">${rows.map((n) => `<div class="glass p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${!n.read ? "ring-1 ring-sky-400/30" : ""}"><div><div class="font-black">${icon(n.type)} ${n.message}</div><div class="text-sm text-slate-400">${dateText(n.createdAt)} • ${n.read ? "Read" : "Unread"}</div></div><div class="flex gap-2"><button class="btn btn-success btn-sm" onclick="markRead('${n.id}')">Read</button><button class="btn btn-danger btn-sm" onclick="deleteNotice('${n.id}')">Delete</button></div></div>`).join("")}</div>`
    : emptyState(
        "No notifications",
        "Alerts from sales, stock and restock appear here.",
      );
}
window.markRead = async (id) => {
  await updateDoc(doc(db, "notifications", id), {
    read: true,
    readAt: serverTimestamp(),
  });
  load();
};
window.deleteNotice = async (id) => {
  await deleteDoc(doc(db, "notifications", id));
  load();
};
$("#markAllRead").onclick = async () => {
  for (const n of rows)
    await updateDoc(doc(db, "notifications", n.id), {
      read: true,
      readAt: serverTimestamp(),
    });
  toast("All marked read");
  load();
};
$("#clearRead").onclick = async () => {
  for (const n of rows.filter((n) => n.read))
    await deleteDoc(doc(db, "notifications", n.id));
  toast("Read notifications cleared");
  load();
};
async function load() {
  rows = await fetchByAdminId("notifications", profile.id);
  render();
}
load();
