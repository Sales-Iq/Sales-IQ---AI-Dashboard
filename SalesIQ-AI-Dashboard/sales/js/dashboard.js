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
  watchCollection
} from '../../js/shared.js';

const { profile } = await requireAuth(['Sales Staff']);
initAppShell('sales', 'dashboard', profile);

let sales = [];
let products = [];

function saleDate(sale) {
  if (!sale?.createdAt) return null;

  const d = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
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
}

const unsubs = [
  watchCollection('sales', rows => {
    sales = rows;
    renderDashboard();
  }),
  watchCollection('products', rows => {
    products = rows;
    renderDashboard();
  })
];

renderDashboard();

window.addEventListener('beforeunload', () => {
  unsubs.forEach(unsub => unsub?.());
});
