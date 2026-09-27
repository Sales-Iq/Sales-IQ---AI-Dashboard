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
  toast,
  watchCollection
} from '../../js/shared.js';

const { profile } = await requireAuth(['Sales Staff']);
initAppShell('sales', 'dashboard', profile);

import {
  db,
  doc,
  updateDoc,
  onSnapshot
} from '../../js/firebase-config.js';

let sales = [];
let products = [];
let currentAdminId = profile.adminId || null;

function saleDate(sale) {
  if (!sale?.createdAt) return null;

  const d = sale.createdAt?.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function updateConnectionBadge() {
  const badge = $('#connectionBadge');
  if (!badge) return;
  if (currentAdminId) {
    badge.textContent = `Connected: ${profile.adminName || 'Admin'}`;
    badge.className = 'text-xs px-2 py-1 rounded-md bg-green-500/20 text-green-400';
  } else {
    badge.textContent = 'Not Connected';
    badge.className = 'text-xs px-2 py-1 rounded-md bg-slate-700 text-slate-300';
  }
}

function renderStats(mine) {
  const statsEl = $('#staffStats');
  if (!statsEl) return;
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = mine.filter(sale => saleDate(sale)?.toISOString().slice(0, 10) === today);

  statsEl.innerHTML = [
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
    if (!d) return;
    const key = d.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + Number(sale.totalAmount || 0);
  });

  let labels = Object.keys(byDay).sort().slice(-10);
  // Keep a visible 7-day axis when this staff member has no sales yet.
  if (!labels.length) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(0, 10));
    }
  }

  makeChart($('#staffChart'), 'line', {
    labels,
    datasets: [{
      label: 'My Sales',
      data: labels.map(key => byDay[key] || 0),
      fill: true,
      tension: 0.4,
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,.22)',
      pointBackgroundColor: '#22c55e'
    }]
  });
}

function renderRecentSales(mine) {
  const recentEl = $('#staffRecentSales');
  if (!recentEl) return;
  recentEl.innerHTML = mine.length
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
  const stockEl = $('#staffStock');
  if (!stockEl) return;
  
  const connectedProducts = products.filter(p => !p.adminId || p.adminId === currentAdminId);

  stockEl.innerHTML = connectedProducts.length
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
            ${connectedProducts.slice(0, 8).map(product => `
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
    : emptyState('No products', currentAdminId ? 'Admin needs to add products.' : 'Accept an admin invitation to view products.');
}

function renderDashboard() {
  updateConnectionBadge();
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
  }),
  onSnapshot(doc(db, 'staff', profile.id), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentAdminId = data.adminId || null;
      profile.adminId = currentAdminId;
      profile.adminName = data.adminName || null;
      
      const pendingReq = data.pendingRequest;
      const banner = $('#staffInvitationBanner');
      
      if (pendingReq && pendingReq.status === 'pending') {
         $('#staffInvitationText').textContent = `${pendingReq.adminName || 'Admin'} (${pendingReq.adminEmail}) has invited you to join their staff team.`;
         banner.classList.remove('hidden');
         
         $('#acceptInviteBtn').onclick = async () => {
           try {
             await updateDoc(doc(db, 'staff', profile.id), {
               adminId: pendingReq.adminId,
               adminName: pendingReq.adminName,
               adminEmail: pendingReq.adminEmail,
               adminStatus: "connected",
               pendingRequest: null
             });
             banner.classList.add('hidden');
             toast('Invitation accepted!');
           } catch(e) { toast(e.message, 'err'); }
         };
         
         $('#rejectInviteBtn').onclick = async () => {
           try {
             await updateDoc(doc(db, 'staff', profile.id), {
               pendingRequest: null
             });
             banner.classList.add('hidden');
             toast('Invitation rejected');
           } catch(e) { toast(e.message, 'err'); }
         };
      } else {
         banner.classList.add('hidden');
      }
      
      renderDashboard();
    }
  })
];

window.addEventListener('beforeunload', () => {
  unsubs.forEach(unsub => unsub?.());
});
