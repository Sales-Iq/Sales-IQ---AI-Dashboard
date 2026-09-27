import { requireAuth, initAppShell, fetchAll, $, money, emptyState, badgeForStatus, statusFor, toast } from '../../js/shared.js';
const { profile } = await requireAuth(['Sales Staff']);
initAppShell('sales', 'stock-view', profile);

let products = [];
function render() {
  const table = $('#stockViewTable');
  if (!table) return;
  const currentAdminId = profile.adminId || null;
  const q = ($('#stockSearch')?.value || '').toLowerCase().trim();
  const c = ($('#stockCategory')?.value || '').toLowerCase().trim();

  const connectedProducts = products.filter(p => !p.adminId || p.adminId === currentAdminId);
  const rows = connectedProducts.filter(p => (p.name || '').toLowerCase().includes(q) && (!c || (p.category || '').toLowerCase().includes(c)));

  table.innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Product Name</th><th>Price</th><th>Available Qty</th><th>Category</th><th>Badge</th></tr></thead><tbody>${rows.map(p => `<tr class="${statusFor(p.stock, p.minStock) !== 'Available' ? 'warning-row' : ''}"><td class="font-black">${p.name}</td><td>${money(p.price)}</td><td>${p.stock || 0}</td><td>${p.category || '-'}</td><td>${badgeForStatus(statusFor(p.stock, p.minStock))}</td></tr>`).join('')}</tbody></table></div>`
    : emptyState('No products found', currentAdminId ? 'Admin has not added products yet.' : 'Accept an admin invitation to view products.');
}

async function load() {
  try {
    products = await fetchAll('products');
  } catch (err) {
    toast(err?.message || 'Could not load products.', 'err');
    products = [];
  }
  render();
}
['stockSearch', 'stockCategory'].forEach(id => $('#' + id)?.addEventListener('input', render));
const refreshBtn = $('#refreshStock');
if (refreshBtn) refreshBtn.onclick = load;
load();
