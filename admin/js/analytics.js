import {
  requireAuth,
  initAppShell,
  $,
  makeChart,
  emptyState,
  watchCollection,
  getBatchStatus,
  formatDate,
  money,
} from '../../js/shared.js';

const { profile } = await requireAuth(['Admin', 'Manager']);
initAppShell('admin', 'analytics', profile);

let sales = [];
let products = [];
let batches = [];
let disposals = [];

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

  // Batch analytics charts
  const batchStatusCounts = {};
  batches.forEach(b => {
    const status = getBatchStatus(b);
    batchStatusCounts[status] = (batchStatusCounts[status] || 0) + 1;
  });

  makeChart($('#batchStatusChart'), 'pie', {
    labels: Object.keys(batchStatusCounts),
    datasets: [{
      label: 'Batch Status',
      data: Object.values(batchStatusCounts)
    }]
  });

  const expiryTimeline = {};
  batches.filter(b => b.expiryDate).forEach(b => {
    const month = b.expiryDate.slice(0, 7);
    expiryTimeline[month] = (expiryTimeline[month] || 0) + (b.remainingQuantity || 0);
  });

  const expiryLabels = sortObjectKeys(expiryTimeline).slice(0, 12);
  makeChart($('#expiryTimelineChart'), 'bar', {
    labels: expiryLabels,
    datasets: [{
      label: 'Units Expiring',
      data: expiryLabels.map(key => expiryTimeline[key])
    }]
  });

  // Batch turnover - batches sold per month
  const batchTurnover = {};
  sales.forEach(sale => {
    if (sale.batchesUsed) {
      sale.batchesUsed.forEach(bu => {
        const month = saleDate(sale)?.toISOString().slice(0, 7) || 'Unknown';
        batchTurnover[month] = (batchTurnover[month] || 0) + Number(bu.quantity || 0);
      });
    }
  });
  const turnoverLabels = sortObjectKeys(batchTurnover).slice(-12);
  makeChart($('#batchTurnoverChart'), 'line', {
    labels: turnoverLabels,
    datasets: [{
      label: 'Batch Units Sold',
      data: turnoverLabels.map(key => batchTurnover[key]),
      tension: 0.4,
      fill: true,
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
    }]
  });

  // Expiry loss - value of expired/disposed stock
  const expiryLoss = {};
  disposals.forEach(d => {
    if (d.reason === 'Expired' && d.disposedAt) {
      const month = d.disposedAt.toDate ? d.disposedAt.toDate().toISOString().slice(0, 7) : d.disposedAt.slice(0, 7);
      const product = products.find(p => p.id === d.productId);
      const batch = batches.find(b => b.batchNumber === d.batchNumber && b.productId === d.productId);
      const unitCost = batch?.purchasePrice || product?.costPrice || 0;
      expiryLoss[month] = (expiryLoss[month] || 0) + Number(d.quantity || 0) * unitCost;
    }
  });
  const lossLabels = sortObjectKeys(expiryLoss).slice(-12);
  makeChart($('#expiryLossChart'), 'bar', {
    labels: lossLabels,
    datasets: [{
      label: 'Expired Stock Value',
      data: lossLabels.map(key => expiryLoss[key]),
      backgroundColor: 'rgba(239, 68, 68, 0.6)',
      borderColor: '#ef4444',
      borderWidth: 1,
    }]
  });

  // Inventory aging - how long batches have been in stock
  const agingBuckets = { '0-30d': 0, '31-60d': 0, '61-90d': 0, '91-180d': 0, '180d+': 0 };
  const now = new Date();
  batches.forEach(b => {
    if (b.createdAt && b.remainingQuantity > 0) {
      const created = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      const daysInStock = Math.floor((now - created) / 86400000);
      if (daysInStock <= 30) agingBuckets['0-30d'] += b.remainingQuantity;
      else if (daysInStock <= 60) agingBuckets['31-60d'] += b.remainingQuantity;
      else if (daysInStock <= 90) agingBuckets['61-90d'] += b.remainingQuantity;
      else if (daysInStock <= 180) agingBuckets['91-180d'] += b.remainingQuantity;
      else agingBuckets['180d+'] += b.remainingQuantity;
    }
  });
  makeChart($('#inventoryAgingChart'), 'bar', {
    labels: Object.keys(agingBuckets),
    datasets: [{
      label: 'Units in Stock by Age',
      data: Object.values(agingBuckets),
      backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(56, 189, 248, 0.6)', 'rgba(245, 158, 11, 0.6)', 'rgba(249, 115, 22, 0.6)', 'rgba(239, 68, 68, 0.6)'],
      borderColor: ['#22c55e', '#38bdf8', '#f59e0b', '#f97316', '#ef4444'],
      borderWidth: 1,
    }]
  });

  // Supplier performance
  const supplierPerf = {};
  batches.forEach(b => {
    const supplier = b.supplierName || 'Unknown';
    if (!supplierPerf[supplier]) supplierPerf[supplier] = { batches: 0, units: 0, expired: 0, disposed: 0, totalCost: 0 };
    supplierPerf[supplier].batches++;
    supplierPerf[supplier].units += b.purchasedQuantity || 0;
    supplierPerf[supplier].totalCost += (b.purchasedQuantity || 0) * (b.purchasePrice || 0);
    const status = getBatchStatus(b);
    if (status === 'Expired') supplierPerf[supplier].expired++;
    if (status === 'Disposed') supplierPerf[supplier].disposed++;
  });
  const topSuppliers = Object.entries(supplierPerf).sort((a, b) => b[1].units - a[1].units).slice(0, 8);
  makeChart($('#supplierPerformanceChart'), 'bar', {
    labels: topSuppliers.map(s => s[0]),
    datasets: [
      { label: 'Total Units', data: topSuppliers.map(s => s[1].units), backgroundColor: 'rgba(56, 189, 248, 0.6)', borderColor: '#38bdf8', borderWidth: 1 },
      { label: 'Expired', data: topSuppliers.map(s => s[1].expired), backgroundColor: 'rgba(239, 68, 68, 0.6)', borderColor: '#ef4444', borderWidth: 1 },
      { label: 'Disposed', data: topSuppliers.map(s => s[1].disposed), backgroundColor: 'rgba(245, 158, 11, 0.6)', borderColor: '#f59e0b', borderWidth: 1 },
    ]
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
  }),
  watchCollection('productBatches', rows => {
    batches = rows;
    renderCharts();
  }),
  watchCollection('disposals', rows => {
    disposals = rows;
    renderCharts();
  })
];

renderCharts();

window.addEventListener('beforeunload', () => {
  unsubs.forEach(unsub => unsub?.());
});