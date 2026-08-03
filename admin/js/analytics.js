import {
  requireAuth,
  initAppShell,
  $,
  makeChart,
  emptyState,
  watchCollection
} from '../../js/shared.js';

const { profile } = await requireAuth(['Admin', 'Manager']);
initAppShell('admin', 'analytics', profile);

let sales = [];
let products = [];

function saleDate(sale) {
  if (!sale?.createdAt) return null;

  const d = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sumBy(arr, keyFn, valueFn) {
  return arr.reduce((map, item) => {
    const key = keyFn(item);
    map[key] = (map[key] || 0) + valueFn(item);
    return map;
  }, {});
}

function dateKey(sale) {
  const d = saleDate(sale);
  return d ? d.toISOString().slice(0, 10) : 'Unknown';
}

function monthKey(sale) {
  const d = saleDate(sale);
  return d ? d.toISOString().slice(0, 7) : 'Unknown';
}

function sortObjectKeys(obj) {
  return Object.keys(obj).sort();
}

function renderCharts() {
  const daily = sumBy(sales, dateKey, sale => Number(sale.totalAmount || 0));
  const monthly = sumBy(sales, monthKey, sale => Number(sale.totalAmount || 0));
  const topProducts = sumBy(sales, sale => sale.productName || 'Unknown', sale => Number(sale.quantity || 0));
  const profit = sumBy(sales, dateKey, sale => Number(sale.profit || 0));

  const categorySales = {};
  sales.forEach(sale => {
    const product = products.find(p => p.id === sale.productId);
    const category = product?.category || 'Unknown';
    categorySales[category] = (categorySales[category] || 0) + Number(sale.totalAmount || 0);
  });

  const dailyLabels = sortObjectKeys(daily);
  const monthlyLabels = sortObjectKeys(monthly);
  const profitLabels = sortObjectKeys(profit);
  const sortedTopProducts = Object.entries(topProducts).sort((a, b) => b[1] - a[1]);

  makeChart($('#dailySalesChart'), 'line', {
    labels: dailyLabels,
    datasets: [{
      label: 'Daily Sales',
      data: dailyLabels.map(key => daily[key]),
      tension: 0.4,
      fill: true
    }]
  });

  makeChart($('#monthlySalesChart'), 'bar', {
    labels: monthlyLabels,
    datasets: [{
      label: 'Monthly Revenue',
      data: monthlyLabels.map(key => monthly[key])
    }]
  });

  makeChart($('#topProductsChart'), 'bar', {
    labels: sortedTopProducts.slice(0, 8).map(item => item[0]),
    datasets: [{
      label: 'Units Sold',
      data: sortedTopProducts.slice(0, 8).map(item => item[1])
    }]
  });

  makeChart($('#categorySalesChart'), 'pie', {
    labels: Object.keys(categorySales),
    datasets: [{
      label: 'Category Sales',
      data: Object.values(categorySales)
    }]
  });

  const cumulativeRevenue = [];
  dailyLabels.forEach((key, index) => {
    cumulativeRevenue.push((cumulativeRevenue[index - 1] || 0) + daily[key]);
  });

  makeChart($('#revenueChart'), 'line', {
    labels: dailyLabels,
    datasets: [{
      label: 'Revenue Growth',
      data: cumulativeRevenue,
      fill: true,
      tension: 0.4
    }]
  });

  makeChart($('#profitChart'), 'line', {
    labels: profitLabels,
    datasets: [{
      label: 'Profit',
      data: profitLabels.map(key => profit[key]),
      fill: true,
      tension: 0.4
    }]
  });

  $('#leastProducts').innerHTML = sortedTopProducts.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Units Sold</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            ${sortedTopProducts.slice(-10).map(item => `
              <tr>
                <td>${item[0]}</td>
                <td>${item[1]}</td>
                <td><span class="badge badge-warn">Least-selling</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyState('No analytics yet', 'Add sales or start dummy live data to generate charts.');
}

const unsubs = [
  watchCollection('sales', rows => {
    sales = rows;
    renderCharts();
  }),
  watchCollection('products', rows => {
    products = rows;
    renderCharts();
  })
];

renderCharts();

window.addEventListener('beforeunload', () => {
  unsubs.forEach(unsub => unsub?.());
});
