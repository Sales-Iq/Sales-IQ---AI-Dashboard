import { requireAuth, initAppShell, fetchAll, fetchByAdminId, $, $$, money, emptyState, badgeForStatus, statusFor, getBatchStatus, badgeForBatchStatus, formatDate } from '../../js/shared.js';

const { profile } = await requireAuth(['Sales Staff']);
initAppShell('sales', 'stock-view', profile);

const adminId = profile.adminId || profile.id;

let products = [];
let batches = [];

function render() {
  const q = $("#stockSearch").value.toLowerCase();
  const c = $("#stockCategory").value.toLowerCase();
  
  const rows = products.filter((p) => {
    const matchesName = (p.name || "").toLowerCase().includes(q);
    const matchesCategory = !c || (p.category || "").toLowerCase().includes(c);
    return matchesName && matchesCategory;
  });

  $("#stockViewTable").innerHTML = rows.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Total Stock</th>
              <th>Batches</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((p) => {
                const productBatches = batches.filter((b) => b.productId === p.id);
                const activeBatches = productBatches.filter((b) => {
                  const s = getBatchStatus(b);
                  return s !== "Disposed" && s !== "Empty";
                });
                
                const batchHtml = activeBatches.length
                  ? activeBatches
                      .sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || ""))
                      .map((b) => {
                        const status = getBatchStatus(b);
                        const bgClass = status === "Expired" ? "bg-red-500/20" : 
                                       status === "Critical Expiry" ? "bg-red-500/20" :
                                       status === "Near Expiry" ? "bg-amber-500/20" :
                                       status === "Upcoming Expiry" ? "bg-blue-500/20" : "bg-emerald-500/20";
                        return `
                          <div class="text-xs flex justify-between items-center py-1 px-2 rounded ${bgClass}">
                            <span>${b.batchNumber}</span>
                            <span class="flex items-center gap-2">
                              ${badgeForBatchStatus(status)}
                              <span class="font-mono">${b.remainingQuantity || 0}</span>
                              <span class="text-slate-400">(${formatDate(b.expiryDate)})</span>
                            </span>
                          </div>
                        `;
                      })
                      .join("")
                  : '<span class="text-slate-400 text-sm">No active batches</span>';

                return `
                  <tr class="${statusFor(p.stock, p.minStock) !== "Available" ? "warning-row" : ""}">
                    <td class="font-black">${p.name}</td>
                    <td>${p.category || "-"}</td>
                    <td class="font-bold">${p.stock || 0}</td>
                    <td>
                      <div class="max-h-32 overflow-y-auto space-y-1">
                        ${batchHtml}
                      </div>
                    </td>
                    <td>${money(p.price)}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : emptyState("No products", "Admin has not added products yet.");
}

async function load() {
  products = await fetchByAdminId("products", adminId);
  batches = await fetchByAdminId("productBatches", adminId);
  render();
}

["stockSearch", "stockCategory"].forEach((id) => $("#" + id).addEventListener("input", render));
$("#refreshStock").onclick = load;
load();