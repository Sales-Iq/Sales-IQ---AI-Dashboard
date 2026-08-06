import {
  requireAuth,
  initAppShell,
  $,
  money,
  dateText,
  emptyState,
  makeChart,
  watchCollection,
  toast,
  setBusy,
  getBatchStatus,
  badgeForBatchStatus,
  formatDate,
  fetchByAdminId,
  statusFor,
} from '../../js/shared.js';

import {
  createDummySale,
  seedDemoProducts,
  restockRandomProducts,
  createRandomBatches,
  startDemoLiveSales,
  isDemoLiveEnabled,
  setDemoLiveEnabled,
  getDemoInterval
} from '../../js/demo-live-data.js';

import {
  db,
  collection,
  query,
  where,
  onSnapshot,
} from '../../js/firebase-config.js';

const { profile } = await requireAuth(['Admin']);
initAppShell('admin', 'dashboard', profile);

let products = [];
let sales = [];
let customers = [];
let batches = [];
let stopDemoRunner = null;

// Helper to watch with adminId filter
function watchByAdminId(name, callback) {
  if (!profile.id) {
    console.warn(`watchByAdminId skipped for ${name}: profile.id is undefined`);
    return () => {};
  }
  const ref = query(collection(db, name), where("adminId", "==", profile.id));
  const mapDocs = (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tb - ta;
    });
    return rows;
  };

  try {
    return onSnapshot(
      ref,
      (snap) => callback(mapDocs(snap)),
      (err) => {
        console.warn(`Realtime listener failed for ${name}:`, err);
        fetchByAdminId(name, profile.id).then(callback);
        setTimeout(
          () =>
            toast(
              `Live update failed for ${name}. Showing latest loaded data.`,
              "err",
            ),
          700,
        );
      },
    );
  } catch (err) {
    console.warn(`Could not start realtime listener for ${name}:`, err);
    fetchByAdminId(name, profile.id).then(callback);
    return () => {};
  }
}

function saleDate(sale) {
  if (!sale?.createdAt) return null;

  const d = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sourceBadge(source) {
  if (source === 'dummy') return '<span class="badge badge-warn">Dummy</span>';
  if (source === 'admin') return '<span class="badge badge-ok">Admin</span>';
  return '<span class="badge badge-ok">Staff</span>';
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
      <div class="text-sm text-slate-400 mt-1">These batches cannot be sold and should be disposed.</div>
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
      <div class="text-sm text-slate-400 mt-1">Urgent action needed - sell or dispose immediately.</div>
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
      <div class="text-sm text-slate-400 mt-1">Consider discounting or prioritizing these in sales.</div>
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
      <div class="text-sm text-slate-400 mt-1">Plan restocking and sales strategies.</div>
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
  $("#batchAlerts").innerHTML = alertsHtml;
}

function renderDemoControls() {
  const status = $('#demoLiveStatus');
  const toggle = $('#toggleDemoLive');
  const interval = Math.round(getDemoInterval() / 1000);
  const enabled = isDemoLiveEnabled();

  if (status) {
    status.innerHTML = enabled
      ? `<span class="badge badge-ok">ON</span> Auto dummy sales every ${interval}s. Data source: <b>dummy</b>.`
      : '<span class="badge badge-danger">OFF</span> Use this to start fake live sales for demo.';
  }

  if (toggle) {
    toggle.textContent = enabled ? 'Stop Dummy Live Data' : 'Start Dummy Live Data';
    toggle.className = enabled ? 'btn btn-danger' : 'btn btn-primary';
  }
}

function startRunnerIfNeeded() {
  if (stopDemoRunner) {
    stopDemoRunner();
    stopDemoRunner = null;
  }

  if (!isDemoLiveEnabled()) return;

  stopDemoRunner = startDemoLiveSales({
    profile: { ...profile, adminId: profile.id, adminName: profile.name || profile.email },
    onSale: sale => toast(`Dummy sale added: ${sale.productName} x ${sale.quantity}`),
    onError: err => toast(err.message || 'Dummy live data failed.', 'err')
  });
}

function renderStats({ salesToday, monthSales, low, out }) {
  const dummyToday = salesToday.filter(s => s.source === 'dummy').length;
  const staffToday = salesToday.filter(s => s.source !== 'dummy').length;

  $('#adminStats').innerHTML = [
    [
      'Total sales today',
      money(salesToday.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)),
      `${salesToday.length} orders • ${dummyToday} dummy • ${staffToday} staff/admin`
    ],
    [
      'Monthly revenue',
      money(monthSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0)),
      `${monthSales.length} monthly orders`
    ],
    ['Total products', products.length, `${low} low stock`],
    ['Out of stock', out, `${customers.length} customers`]
  ].map(item => `
    <div class="glass stat-card glass-card-hover">
      <div class="stat-label">${item[0]}</div>
      <div class="stat-value">${item[1]}</div>
      <div class="stat-hint">${item[2]}</div>
    </div>
  `).join('');
}

function renderCharts() {
  const byDay = {};

  sales.forEach(sale => {
    const d = saleDate(sale);
    const key = d ? d.toISOString().slice(0, 10) : 'Unknown';
    byDay[key] = (byDay[key] || 0) + Number(sale.totalAmount || 0);
  });

  const labels = Object.keys(byDay).sort().slice(-10);

  makeChart($('#salesTrendChart'), 'line', {
    labels,
    datasets: [{
      label: 'Sales',
      data: labels.map(key => byDay[key]),
      tension: 0.4,
      fill: true
    }]
  });

  const topInventory = [...products]
    .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
    .slice(0, 10);

  makeChart($('#inventoryChart'), 'bar', {
    labels: topInventory.map(product => product.name),
    datasets: [{
      label: 'Stock',
      data: topInventory.map(product => Number(product.stock || 0))
    }]
  });
}

function renderRecentSales() {
  $('#recentSales').innerHTML = sales.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Source</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${sales.slice(0, 8).map(sale => `
              <tr>
                <td>${sale.invoiceNumber || sale.invoice || '-'}</td>
                <td>${sale.productName || '-'}</td>
                <td>${sale.quantity || 0}</td>
                <td>${money(sale.totalAmount)}</td>
                <td>${sourceBadge(sale.source)}</td>
                <td>${dateText(sale.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
    : emptyState('No recent sales', 'Start dummy live data or create a sale from Billing.');
}

function renderAiSummary({ low, out }) {
  const fastest = [...sales.reduce((map, sale) => {
    if (!sale.productName) return map;
    map.set(sale.productName, (map.get(sale.productName) || 0) + Number(sale.quantity || 0));
    return map;
  }, new Map())].sort((a, b) => b[1] - a[1])[0];

  const dummyCount = sales.filter(s => s.source === 'dummy').length;
  const staffCount = sales.length - dummyCount;

  $('#aiSummary').innerHTML = products.length || sales.length
    ? `
      Your dashboard has <b>${products.length}</b> products and <b>${sales.length}</b> sales records.<br><br>
      <span class="badge badge-warn">${dummyCount} dummy</span>
      <span class="badge badge-ok">${staffCount} staff/admin</span>
      ${low ? `<br><br><span class="badge badge-warn">${low} products are low stock</span>` : ''}
      ${out ? `<br><br><span class="badge badge-danger">${out} products are out of stock</span>` : ''}
      ${fastest ? `<br><br>Fast-selling product: <b>${fastest[0]}</b> (${fastest[1]} units sold).` : ''}
    `
    : emptyState(
        'No AI summary yet',
        'Add products, start dummy live data, or create staff sales to generate a business summary.'
      );
}

function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const salesToday = sales.filter(s => saleDate(s)?.toISOString().slice(0, 10) === today);
  const monthSales = sales.filter(s => saleDate(s)?.toISOString().slice(0, 7) === month);
  const low = products.filter(p => statusFor(p.stock, p.minStock) === 'Low Stock').length;
  const out = products.filter(p => Number(p.stock || 0) <= 0).length;

  renderStats({ salesToday, monthSales, low, out });
  renderCharts();
  renderRecentSales();
  renderAiSummary({ low, out });
  renderDemoControls();
  renderBatchAlerts();
}

$('#restockRandomProducts')?.addEventListener('click', async e => {
  const btn = e.currentTarget;
  setBusy(btn, true, 'Restocking...');

  try {
    const result = await restockRandomProducts({ adminId: profile.id });
    toast(`Restocked ${result.count} products with random quantities.`);
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    setBusy(btn, false);
  }
});

$('#createRandomBatches')?.addEventListener('click', async e => {
  const btn = e.currentTarget;
  setBusy(btn, true, 'Creating batches...');

  try {
    const result = await createRandomBatches({ adminId: profile.id, adminName: profile.name || profile.email });
    toast(`Created ${result.count} new batches for random products.`);
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    setBusy(btn, false);
  }
});

$('#generateDemoSale')?.addEventListener('click', async e => {
  const btn = e.currentTarget;
  setBusy(btn, true, 'Generating...');

  try {
    const sale = await createDummySale({ ...profile, adminId: profile.id, adminName: profile.name || profile.email });
    toast(`Dummy sale added: ${sale.productName} x ${sale.quantity}`);
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    setBusy(btn, false);
  }
});

$('#toggleDemoLive')?.addEventListener('click', () => {
  setDemoLiveEnabled(!isDemoLiveEnabled());
  renderDemoControls();
  startRunnerIfNeeded();
  toast(isDemoLiveEnabled() ? 'Dummy live data started.' : 'Dummy live data stopped.');
});

const unsubs = [
  watchByAdminId('products', rows => {
    products = rows;
    renderDashboard();
  }),
  watchByAdminId('sales', rows => {
    sales = rows;
    renderDashboard();
  }),
  watchByAdminId('customers', rows => {
    customers = rows;
    renderDashboard();
  }),
  watchByAdminId('productBatches', rows => {
    batches = rows;
    renderDashboard();
  })
];

renderDemoControls();
startRunnerIfNeeded();

window.addEventListener('beforeunload', () => {
  stopDemoRunner?.();
  unsubs.forEach(unsub => unsub?.());
});