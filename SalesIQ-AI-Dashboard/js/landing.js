/**
 * SalesIQ 2.0 — Authentic Retail Suite Landing Page Engine
 * Handles the Dual-Engine POS-to-Admin Realtime Simulator, Gemini 1.5 Copilot,
 * Chart.js Visualizers, Retail ROI Calculator, and Theme Sync.
 */

// ── 1. Audio Synthesizer (Zero External Audio Dependencies) ─────────────────
function playTone(freq = 880, duration = 0.12, type = 'sine') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // AudioContext blocked by user autoplay policy before user gesture
  }
}

function playCashRegisterChime() {
  playTone(784, 0.08, 'triangle'); // G5
  setTimeout(() => playTone(1046.5, 0.16, 'sine'), 80); // C6
}

// ── 2. Dual-Engine POS-to-Admin Realtime Simulator ──────────────────────────
let simState = {
  currentTotal: 0,
  revenue: 42850,
  orders: 38,
  heroChart: null
};

export function initDualEngineSimulator() {
  const heroCanvas = document.getElementById('simHeroChart');
  if (!heroCanvas || !window.Chart) return;

  const isLight = document.body.classList.contains('light');
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';

  const ctx = heroCanvas.getContext('2d');
  simState.heroChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'],
      datasets: [{
        label: 'Sales Velocity (₹)',
        data: [3200, 5400, 8900, 14200, 19800, 31000, 42850],
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#38bdf8',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Sales: ₹${Number(ctx.raw).toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: (val) => `₹${val / 1000}k`
          }
        }
      }
    }
  });

  // Attach POS button listeners
  const posButtons = document.querySelectorAll('.pos-catalog-item');
  posButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.itemName;
      const price = parseInt(btn.dataset.itemPrice, 10);
      ringUpItem(name, price);
    });
  });

  // Attach Complete & Sync button
  const completeBtn = document.getElementById('completePosSaleBtn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      confirmAndSyncSale();
    });
  }
}

function ringUpItem(name, price) {
  playTone(880, 0.08, 'sine');
  const tax = Math.round(price * 0.05);
  simState.currentTotal = price + tax;

  const itemEl = document.getElementById('cartItemLabel');
  const priceEl = document.getElementById('cartItemPrice');
  const taxEl = document.getElementById('cartTaxPrice');
  const totalEl = document.getElementById('cartTotalPrice');

  if (itemEl) itemEl.textContent = name;
  if (priceEl) priceEl.textContent = `₹${price.toLocaleString('en-IN')}`;
  if (taxEl) taxEl.textContent = `₹${tax.toLocaleString('en-IN')}`;
  if (totalEl) totalEl.textContent = `₹${simState.currentTotal.toLocaleString('en-IN')}`;
}

function confirmAndSyncSale() {
  if (simState.currentTotal === 0) {
    ringUpItem('☕ Espresso Roast 1kg', 850);
  }

  playCashRegisterChime();
  simState.revenue += simState.currentTotal;
  simState.orders += 1;

  // Spring animation for admin counters
  const revEl = document.getElementById('simAdminRevenue');
  const ordEl = document.getElementById('simAdminOrders');

  if (revEl) {
    revEl.textContent = `₹${simState.revenue.toLocaleString('en-IN')}`;
    revEl.style.transform = 'scale(1.1)';
    revEl.style.color = '#38bdf8';
    setTimeout(() => {
      revEl.style.transform = 'scale(1)';
      revEl.style.color = '';
    }, 280);
  }

  if (ordEl) {
    ordEl.textContent = simState.orders;
    ordEl.style.transform = 'scale(1.15)';
    setTimeout(() => { ordEl.style.transform = 'scale(1)'; }, 280);
  }

  // Flash sync beam
  const beamPulse = document.getElementById('simSyncPulse');
  if (beamPulse) {
    beamPulse.style.transform = 'scale(1.35)';
    beamPulse.style.boxShadow = '0 0 40px #38bdf8, 0 0 60px #8b5cf6';
    setTimeout(() => {
      beamPulse.style.transform = '';
      beamPulse.style.boxShadow = '';
    }, 400);
  }

  // Update Chart
  if (simState.heroChart) {
    const dataset = simState.heroChart.data.datasets[0];
    dataset.data[dataset.data.length - 1] = simState.revenue;
    simState.heroChart.update('active');
  }

  // Flash Firestore status badge
  const feed = document.getElementById('simFirestoreFeed');
  const feedTime = document.getElementById('simFeedTime');
  if (feed && feedTime) {
    const now = new Date();
    feedTime.textContent = now.toTimeString().split(' ')[0];
    feed.style.backgroundColor = 'rgba(56, 189, 248, 0.3)';
    feed.style.borderColor = 'rgba(56, 189, 248, 0.8)';
    setTimeout(() => {
      feed.style.backgroundColor = '';
      feed.style.borderColor = '';
    }, 600);
  }
}

// ── 3. Gemini 1.5 AI Retail Copilot ─────────────────────────────────────────
const copilotKnowledge = {
  stockout: `<strong>Gemini 1.5 Diagnostic:</strong> Based on 30-day velocity, <span class="kpi-tag-danger">Espresso Roast 1kg</span> has <strong>3.2 days of runway remaining</strong>. Forecasted demand for the upcoming festival weekend is <strong>64 units</strong> against current on-hand stock of <strong>18 units</strong>.<br><br>👉 <strong>Action Plan:</strong> Submit purchase order for <strong>80 units</strong> with Roastery Co. immediately (lead time: 48h) to avoid estimated <span class="kpi-tag-danger">₹24,500</span> in lost sales.`,
  margin: `<strong>Gemini 1.5 Margin Breakdown:</strong> Highest gross margin category is <span class="kpi-tag-ok">Artisan Coffee Gear (46.2%)</span>, led by AeroPress Go Kits. Lowest margin is <span class="kpi-tag-danger">Alternative Dairy (19.4%)</span> due to a 6% supplier cost increase on Oct 12.<br><br>👉 <strong>Recommendation:</strong> Bundle AeroPress kits with high-margin beans for a +12% bump in Average Order Value (AOV).`,
  deadstock: `<strong>Dead Stock Audit:</strong> Identified <strong>3 SKUs</strong> with zero sales velocity over the past 45 days, locking up <span class="kpi-tag-danger">₹48,200</span> in idle warehouse capital.<br><br>👉 <strong>Liquidation Strategy:</strong> Run a 25% flash discount on slow-moving Cold Brew Tumblers at the POS counter to free working capital.`,
  po: `<strong>Automated Purchase Order Draft #PO-2026-089:</strong><br>• Espresso Roast 1kg — <strong>80 bags</strong> (Vendor: Artisan Roasters, Lead Time: 2 days)<br>• Oat Milk Barista 1L — <strong>120 cartons</strong> (Vendor: GreenDairy Dist, Lead Time: 3 days)<br><br>Total PO Value: <strong>₹68,400</strong>. Ready for 1-click export to WhatsApp / PDF.`
};

let streamTimer = null;

export function initCopilotTerminal() {
  const chips = document.querySelectorAll('.prompt-chip-btn');
  const outputBox = document.getElementById('copilotStreamOutput');
  if (!chips.length || !outputBox) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active-chip'));
      chip.classList.add('active-chip');
      const topic = chip.dataset.topic;
      streamCopilotResponse(topic);
    });
  });

  // Load first prompt by default
  streamCopilotResponse('stockout');
}

function streamCopilotResponse(topic) {
  const outputBox = document.getElementById('copilotStreamOutput');
  if (!outputBox) return;

  if (streamTimer) clearTimeout(streamTimer);

  outputBox.innerHTML = '<span style="color: var(--landing-brand);">Analyzing live Firestore sales velocity with Gemini 1.5 Flash...</span>';

  streamTimer = setTimeout(() => {
    outputBox.innerHTML = copilotKnowledge[topic] || copilotKnowledge.stockout;
    playTone(660, 0.08, 'sine');
  }, 220);
}

// ── 4. Retail ROI & Working Capital Calculator ──────────────────────────────
export function initRoiCalculator() {
  const revRange = document.getElementById('roiRevRange');
  const skuRange = document.getElementById('roiSkuRange');
  if (!revRange || !skuRange) return;

  function update() {
    const rev = parseInt(revRange.value, 10);
    const skus = parseInt(skuRange.value, 10);

    const revReadout = document.getElementById('roiRevReadout');
    const skuReadout = document.getElementById('roiSkuReadout');
    if (revReadout) revReadout.textContent = `₹${rev.toLocaleString('en-IN')}`;
    if (skuReadout) skuReadout.textContent = `${skus.toLocaleString('en-IN')} SKUs`;

    const hours = Math.round((skus / 25) * 1.15);
    const unlocked = Math.round(rev * 0.15);
    const prevented = Math.round(rev * 0.08);

    const hoursEl = document.getElementById('roiHoursSaved');
    const unlockedEl = document.getElementById('roiCapitalUnlocked');
    const preventedEl = document.getElementById('roiLossPrevented');

    if (hoursEl) hoursEl.textContent = `${hours} hrs`;
    if (unlockedEl) unlockedEl.textContent = `₹${unlocked.toLocaleString('en-IN')}`;
    if (preventedEl) preventedEl.textContent = `₹${prevented.toLocaleString('en-IN')}`;
  }

  revRange.addEventListener('input', update);
  skuRange.addEventListener('input', update);
  update();
}

// ── 5. Main Chart.js Interactive Suite ──────────────────────────────────────
let suiteChart = null;

const suiteDatasets = {
  salesVelocity: {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Gross Sales (₹)',
        data: [42000, 56000, 49000, 68000, 84000, 112000, 98000],
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 3
      }]
    }
  },
  inventoryBurn: {
    type: 'bar',
    data: {
      labels: ['Espresso Beans', 'AeroPress Go', 'Oat Milk 1L', 'Cold Brew', 'Barista Mugs'],
      datasets: [{
        label: 'Days of Runway Remaining',
        data: [3.2, 14.5, 6.0, 22.0, 38.0],
        backgroundColor: ['#f43f5e', '#38bdf8', '#f59e0b', '#10b981', '#a855f7'],
        borderRadius: 8
      }]
    }
  },
  categoryMargin: {
    type: 'doughnut',
    data: {
      labels: ['Artisan Gear (46%)', 'Coffee Beans (38%)', 'Beverages (32%)', 'Dairy (19%)'],
      datasets: [{
        data: [46.2, 38.0, 32.5, 19.4],
        backgroundColor: ['#a855f7', '#38bdf8', '#10b981', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#020617'
      }]
    }
  },
  cashierLeaderboard: {
    type: 'bar',
    data: {
      labels: ['Priya S. (Shift A)', 'Rahul V. (Shift B)', 'Neha M. (Shift A)', 'Karan T. (Shift C)'],
      datasets: [{
        label: 'Today Ring-Ups (₹)',
        data: [28400, 22100, 18900, 14200],
        backgroundColor: '#38bdf8',
        borderRadius: 8
      }]
    }
  }
};

export function initMainChartSuite() {
  const canvas = document.getElementById('mainSuiteChart');
  if (!canvas || !window.Chart) return;

  const isLight = document.body.classList.contains('light');
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';

  const ctx = canvas.getContext('2d');
  suiteChart = new Chart(ctx, {
    ...suiteDatasets.salesVelocity,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    }
  });

  const tabBtns = document.querySelectorAll('.chart-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active-tab'));
      btn.classList.add('active-tab');

      const tab = btn.dataset.tab;
      const config = suiteDatasets[tab];
      if (config && suiteChart) {
        suiteChart.destroy();
        suiteChart = new Chart(ctx, {
          ...config,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: textColor } }
            },
            scales: config.type === 'doughnut' ? {} : {
              x: { grid: { color: gridColor }, ticks: { color: textColor } },
              y: { grid: { color: gridColor }, ticks: { color: textColor } }
            }
          }
        });
      }
    });
  });
}

// ── 6. Dual-Persona Switcher ────────────────────────────────────────────────
const personaData = {
  staff: {
    title: 'Designed for High-Velocity Checkout',
    desc: 'Cashiers and floor staff need split-second responses, barcode scanner support, and immediate receipt generation without cognitive friction.',
    bullets: [
      'Touch-optimized keypad and universal barcode scanner support',
      'Split-tender billing (Cash, UPI QR, Credit Card, Customer Store Credit)',
      'Offline network resilience — ring up sales during outages, auto-sync when online',
      'Automated stock validation prevents cashier overselling at checkout'
    ]
  },
  admin: {
    title: 'Designed for Executive Control & Intelligence',
    desc: 'Business owners and store managers need real-time profit margin analysis, supplier lead-time buffers, and automated stock replenishment.',
    bullets: [
      'Live Cloud Firestore telemetry across all store counters in sub-50ms',
      'Google Gemini 1.5 Flash conversational queries and automated PO drafts',
      'Customizable drag & drop dashboard tiles tailored to your daily review routine',
      'Granular RBAC security preventing staff from modifying prices or deleting sales'
    ]
  }
};

export function initPersonaSwitcher() {
  const segmentBtns = document.querySelectorAll('.role-segment-btn');
  const titleEl = document.getElementById('roleContentTitle');
  const descEl = document.getElementById('roleContentDesc');
  const listEl = document.getElementById('roleContentList');

  if (!segmentBtns.length || !titleEl) return;

  function setPersona(role) {
    const data = personaData[role] || personaData.staff;
    titleEl.textContent = data.title;
    if (descEl) descEl.textContent = data.desc;

    if (listEl) {
      listEl.innerHTML = data.bullets.map(b => `
        <div class="role-feature-bullet">
          <div class="role-bullet-icon">✓</div>
          <div>${b}</div>
        </div>
      `).join('');
    }
  }

  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach(b => b.classList.remove('active-role'));
      btn.classList.add('active-role');
      const role = btn.dataset.role;
      setPersona(role);
    });
  });

  setPersona('staff');
}

// ── 7. FAQ Accordion ────────────────────────────────────────────────────────
export function initFaqAccordion() {
  const faqCards = document.querySelectorAll('.faq-item-card');
  faqCards.forEach(card => {
    const btn = card.querySelector('.faq-question-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = card.classList.contains('is-open');
      faqCards.forEach(c => c.classList.remove('is-open'));
      if (!isOpen) {
        card.classList.add('is-open');
      }
    });
  });
}

// ── 8. Theme Toggle & Persistence ───────────────────────────────────────────
export function initThemeToggle() {
  const toggleBtn = document.getElementById('landingThemeToggle');
  const stored = localStorage.getItem('salesiq_theme');

  if (stored === 'light') {
    document.body.classList.add('light');
    if (toggleBtn) toggleBtn.textContent = '🌙 Dark';
  } else {
    document.body.classList.remove('light');
    if (toggleBtn) toggleBtn.textContent = '☀️ Light';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light');
      const isLight = document.body.classList.contains('light');
      localStorage.setItem('salesiq_theme', isLight ? 'light' : 'dark');
      toggleBtn.textContent = isLight ? '🌙 Dark' : '☀️ Light';

      // Update Chart Colors if charts exist
      if (simState.heroChart) {
        simState.heroChart.destroy();
        initDualEngineSimulator();
      }
      if (suiteChart) {
        suiteChart.destroy();
        initMainChartSuite();
      }
    });
  }
}

// ── DOM Initialization ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initDualEngineSimulator();
  initCopilotTerminal();
  initRoiCalculator();
  initMainChartSuite();
  initPersonaSwitcher();
  initFaqAccordion();
});
