import {
  requireAuth,
  initAppShell,
  $,
  money,
  dateText,
  emptyState,
  badgeForStatus,
  statusFor,
  makeChart,
  watchCollection,
  getBatchStatus,
  badgeForBatchStatus,
  formatDate,
} from '../../js/shared.js';

const { profile } = await requireAuth(['Sales Staff']);
initAppShell('sales', 'dashboard', profile);

let sales = [];
let products = [];
let batches = [];

function saleDate(sale) {
  if (!sale?.createdAt) return null;

  const d = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function renderBatchAlerts() {
  const expiredBatches = batches.filter(b => getBatchStatus(b) === "Expired");
  const criticalBatches = batches.filter(b => getBatchStatus(b) === "Critical Expiry");
  const nearExpiryBatches = batches.filter(b => getBatchStatus(b) === "Near Expiry");
  const upcomingBatches = batches.filter(b => getBatchStatus(b) === "Upcoming Expiry");

  let alertsHtml = "";
  if (expiredBatches.length > 0) {
    alertsHtml += `<div class="glass p-4 border-l-4 border-red-500 mb-3">
      <div class="font-bold text-red-400">⚠ ${expiredBatches.length} Expired Batch${expiredBatches.length > 1 ? "es" : ""}</div>
      <div class="text-sm text-slate-400 mt-1">These batches cannot be sold.</div>
      <div class="mt-2 flex flex-wrap gap-2">
        ${expiredBatches.slice(0, 5).map(b => {
          const p = products.find(x => x.id === b.productId);
          return `<span class="badge badge-danger">${p?.name || "Product"} - ${b.batchNumber} (${formatDate(b.expiryDate)})</span>`;
        }).join("")}
        ${expiredBatches.length > 5 ? `<span class="badge badge-info">+${expiredBatches.length - 5} more</span>` : ""}
      </div>
    </div>`;
  }
  if (criticalBatches.length > 0) {
    alertsHtml += `<div class="glass p-4 border-l-4 border-orange-500 mb-3">
      <div class="font-bold text-orange-400">🔥 ${criticalBatches.length} Critical Expiry Batch${criticalBatches.length > 1 ? "es" : ""} (≤7 days)</div>
      <div class="text-sm text-slate-400 mt-1">Prioritize selling these batches first (FEFO).</div>
      <div class="mt-2 flex flex-wrap gap-2">
        ${criticalBatches.slice(0, 5).map(b => {
          const p = products.find(x => x.id === b.productId);
          return `<span class="badge badge-danger">${p?.name || "Product"} - ${b.batchNumber} (${formatDate(b.expiryDate)})</span>`;
        }).join("")}
        ${criticalBatches.length > 5 ? `<span class="badge badge-info">+${criticalBatches.length - 5} more</span>` : ""}
      </div>
    </div>`;
  }
  if (nearExpiryBatches.length > 0) {
    alertsHtml += `<div class="glass p-4 border-l-4 border-amber-500 mb-3">
      <div class="font-bold text-amber-400">⚡ ${nearExpiryBatches.length} Near Expiry Batch${nearExpiryBatches.length > 1 ? "es" : ""} (≤30 days)</div>
      <div class="text-sm text-slate-400 mt-1">Consider prioritizing these in sales.</div>
      <div class="mt-2 flex flex-wrap gap-2">
        ${nearExpiryBatches.slice(0, 5).map(b => {
          const p = products.find(x => x.id === b.productId);
          return `<span class="badge badge-warn">${p?.name || "Product"} - ${b.batchNumber} (${formatDate(b.expiryDate)})</span>`;
        }).join("")}
        ${nearExpiryBatches.length > 5 ? `<span class="badge badge-info">+${nearExpiryBatches.length - 5} more</span>` : ""}
      </div>
    </div>`;
  }
  if (upcomingBatches.length > 0) {
    alertsHtml += `<div class="glass p-4 border-l-4 border-blue-500 mb-3">
      <div class="font-bold text-blue-400">📅 ${upcomingBatches.length} Upcoming Expiry Batch${upcomingBatches.length > 1 ? "es" : ""} (≤90 days)</div>
      <div class="text-sm text-slate-400 mt-1">Monitor these batches.</div>
      <div class="mt-2 flex flex-wrap gap-2">
        ${upcomingBatches.slice(0, 5).map(b => {
          const p = products.find(x => x.id === b.productId);
          return `<span class="badge badge-info">${p?.name || "Product"} - ${b.batchNumber} (${formatDate(b.expiryDate)})</span>`;
        }).join("")}
        ${upcomingBatches.length > 5 ? `<span class="badge badge-info">+${upcomingBatches.length - 5} more</span>` : ""}
      </div>
    </div>`;
  }
  if (!alertsHtml) {
    alertsHtml = '<div class="glass p-4 text-center text-slate-400">✅ All batches are within safe expiry range.</div>';
  }
  $("#staffBatchAlerts").innerHTML = alertsHtml;
}

function renderStats(mine) {
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = mine.filter(sale => saleDate(sale)?.toISOString().slice(0, 10) === today);

  $('#staffStats').innerHTML = [
    [
      'Today Sales',
      money(todaySales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)),
      `${todaySales.length} orders`
    ],
    ['Orders Created', mine.length, 'All time'],
    ['Assigned Products', products.length, 'View only'],
    [
      'Performance',
      money(mine.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)),
      'Total revenue'
    ]
  ].map(item => `
    <div class="glass stat-card glass-card-hover">
      <div class="stat-label">${item[0]}</div>
      <div class="stat-value">${item[1]}</div>
      <div class="stat-hint">${item[2]}</div>
    </div>
  `).join('');
}

function renderChart(mine) {
  const byDay = {};

  mine.forEach(sale => {
    const d = saleDate(sale);
    const key = d ? d.toISOString().slice(0, 10) : 'Unknown';
    byDay[key] = (byDay[key] || 0) + Number(sale.totalAmount || 0);
  });

  const labels = Object.keys(byDay).sort().slice(-10);

  makeChart($('#staffChart'), 'line', {
    labels,
    datasets: [{
      label: 'My Sales',
      data: labels.map(key => byDay[key]),
      fill: true,
      tension: 0.4
    }]
  });
}

function renderRecentSales(mine) {
  $('#staffRecentSales').innerHTML = mine.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Product</th>
              <th>Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${mine.slice(0, 6).map(sale => `
              <tr>
                <td>${sale.invoiceNumber || '-'}</td>
                <td>${sale.productName || '-'}</td>
                <td>${money(sale.totalAmount)}</td>
                <td>${dateText(sale.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyState('No sales yet', 'Create a sale from Add Sale.');
}

function renderStock() {
  $('#staffStock').innerHTML = products.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Available</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${products.slice(0, 8).map(product => `
              <tr>
                <td>${product.name}</td>
                <td>${money(product.price)}</td>
                <td>${product.stock || 0}</td>
                <td>${badgeForStatus(statusFor(product.stock, product.minStock))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyState('No products', 'Admin needs to add products.');
}

function renderDashboard() {
  const mine = sales.filter(sale => sale.salespersonId === profile.id);
  renderStats(mine);
  renderChart(mine);
  renderRecentSales(mine);
  renderStock();
  renderBatchAlerts();
}

const unsubs = [
  watchCollection('sales', rows => {
    sales = rows;
    renderDashboard();
  }),
  watchCollection('products', rows => {
    products = rows;
    renderDashboard();
  }),
  watchCollection('productBatches', rows => {
    batches = rows;
    renderDashboard();
  })
];

renderDashboard();

window.addEventListener('beforeunload', () => {
  unsubs.forEach(unsub => unsub?.());
});