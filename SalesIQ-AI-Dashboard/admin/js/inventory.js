import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  $$,
  toast,
  statusFor,
  badgeForStatus,
  money,
  emptyState,
  createNotification,
} from "../../js/shared.js";
import {
  db,
  doc,
  updateDoc,
  serverTimestamp,
} from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "inventory", profile);
let products = [],
  sales = [],
  batches = [];
const modal = $("#stockModal");
function getProductBatches(productId) {
  return batches.filter(
    (b) => b.productId === productId && Number(b.remainingQuantity) > 0,
  );
}

function nearestExpiry(productId) {
  const list = getProductBatches(productId)
    .filter((b) => b.expiryDate)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  if (!list.length) return "-";

  return new Date(list[0].expiryDate).toLocaleDateString("en-IN");
}

function batchStatus(productId) {
  const list = getProductBatches(productId);

  if (!list.length) return "";

  const nearest = list
    .filter((b) => b.expiryDate)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];

  if (!nearest) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(nearest.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const days = Math.ceil((expiry - today) / 86400000);

  if (days < 0) return `<span class="badge badge-danger">Expired</span>`;

  if (days <= 30)
    return `<span class="badge badge-warn">Expires in ${days} days</span>`;

  return `<span class="badge badge-ok">Fresh</span>`;
}
function renderStats() {
  const low = products.filter(
    (p) => statusFor(p.stock, p.minStock) === "Low Stock",
  );

  const out = products.filter(
    (p) => statusFor(p.stock, p.minStock) === "Out of Stock",
  );

  const expiring = batches.filter((b) => {
    if (!b.expiryDate) return false;

    const days = Math.ceil((new Date(b.expiryDate) - new Date()) / 86400000);

    return days >= 0 && days <= 30;
  });

  $("#inventoryStats").innerHTML = [
    ["Current Products", products.length, "Total SKUs"],
    ["Low Stock", low.length, "Needs reorder"],
    ["Out of Stock", out.length, "Unavailable"],
    ["Expiring Soon", expiring.length, "Within 30 days"],
    [
      "Stock Value",
      money(
        products.reduce(
          (a, p) => a + Number(p.stock || 0) * Number(p.costPrice || 0),
          0,
        ),
      ),
      "At cost price",
    ],
  ]
    .map(
      (x) => `
      <div class="glass stat-card">
        <div class="stat-label">${x[0]}</div>
        <div class="stat-value">${x[1]}</div>
        <div class="stat-hint">${x[2]}</div>
      </div>
    `,
    )
    .join("");
}
function renderTable() {
  const q = $("#inventorySearch").value.toLowerCase(),
    cat = $("#inventoryCategory").value,
    st = $("#inventoryStatus").value;
  const rows = products.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(q) &&
      (!cat || p.category === cat) &&
      (!st || statusFor(p.stock, p.minStock) === st),
  );
  $("#inventoryTable").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead>
        <tr>
        <th>Product</th>
        <th>Category</th>
        <th>Current</th>
        <th>Minimum</th>
        <th>Batches</th>
        <th>Nearest Expiry</th>
        <th>Status</th>
        <th>Stock Update</th>
        </tr>
        </thead><tbody>${rows
          .map((p) => {
            const status = statusFor(p.stock, p.minStock);

            return `
          <tr class="${status !== "Available" ? "warning-row" : ""}">

            <td class="font-black">
              ${p.name}
            </td>

            <td>
              ${p.category || "-"}
            </td>

            <td>
              ${p.stock || 0}
            </td>

            <td>
              ${p.minStock || 0}
            </td>

            <td>
              ${getProductBatches(p.id).length}
            </td>

            <td>
              ${nearestExpiry(p.id)}
              <br>
              ${batchStatus(p.id)}
            </td>

            <td>
              ${badgeForStatus(status)}
            </td>

            <td>
              <button
                class="btn btn-ghost btn-sm"
                onclick="openStock('${p.id}')"
              >
                Update
              </button>
            </td>

          </tr>
        `;
          })
          .join("")}</tbody></table></div>`
    : emptyState("No stock records", "Add products first.");
}
function renderMovement() {
  const map = new Map();
  sales.forEach((s) =>
    map.set(
      s.productName,
      (map.get(s.productName) || 0) + Number(s.quantity || 0),
    ),
  );
  const sorted = [...map].sort((a, b) => b[1] - a[1]);
  $("#movementList").innerHTML = sorted.length
    ? `<div class="space-y-3"><div><b>Fast-moving</b>${sorted
        .slice(0, 5)
        .map(
          (x) =>
            `<div class="flex justify-between border-b border-slate-700/50 py-2"><span>${x[0]}</span><span class="badge badge-ok">${x[1]}</span></div>`,
        )
        .join("")}</div><div class="pt-4"><b>Slow-moving</b>${sorted
        .slice(-5)
        .reverse()
        .map(
          (x) =>
            `<div class="flex justify-between border-b border-slate-700/50 py-2"><span>${x[0]}</span><span class="badge badge-warn">${x[1]}</span></div>`,
        )
        .join("")}</div></div>`
    : emptyState("No movement data", "Sales will appear here.");
}
window.openStock = (id) => {
  const p = products.find((x) => x.id === id);
  $("#stockProductId").value = id;
  $("#stockProductName").value = p.name;
  $("#stockNewQty").value = p.stock || 0;
  modal.classList.add("show");
};
$$("[data-close-modal]").forEach(
  (b) => (b.onclick = () => modal.classList.remove("show")),
);
$("#stockForm").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("#stockProductId").value,
    qty = Number($("#stockNewQty").value);
  const p = products.find((x) => x.id === id);
  await updateDoc(doc(db, "products", id), {
    stock: qty,
    status: statusFor(qty, p.minStock),
    updatedAt: serverTimestamp(),
  });
  toast("Stock updated.");
  modal.classList.remove("show");
  load();
};
$("#generateStockAlerts").onclick = async () => {
  let count = 0;
  for (const p of products) {
    const st = statusFor(p.stock, p.minStock);
    if (st !== "Available") {
      count++;
      await createNotification(
        `${p.name} stock is ${st}. Current stock: ${p.stock}. Minimum: ${p.minStock}.`,
        "stock",
      );
    }
  }
  toast(count ? `${count} alerts generated.` : "No low stock alerts.");
};
async function load() {
  products = await fetchAll("products");
  sales = await fetchAll("sales");
  batches = await fetchAll("productBatches");
  $("#inventoryCategory").innerHTML =
    '<option value="">All categories</option>' +
    [...new Set(products.map((p) => p.category).filter(Boolean))]
      .map((c) => `<option>${c}</option>`)
      .join("");
  renderStats();
  renderTable();
  renderMovement();
}
["inventorySearch", "inventoryCategory", "inventoryStatus"].forEach((id) =>
  $("#" + id).addEventListener("input", renderTable),
);
$("#refreshInventory").onclick = load;
load();
