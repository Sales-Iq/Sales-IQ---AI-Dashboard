import { db, collection, doc, getDoc, setDoc, serverTimestamp, runTransaction } from './firebase-config.js';
import { fetchAll, statusFor, getFEFOBatches } from './shared.js';

const DEMO_ENABLED_KEY = 'salesiq_demo_live_enabled';
const DEMO_INTERVAL_KEY = 'salesiq_demo_live_interval_ms';
const DEMO_LOCK_KEY = 'salesiq_demo_live_lock';
const DEMO_OWNER_KEY = 'salesiq_demo_live_owner';
const DEFAULT_INTERVAL_MS = 8000;

const paymentModes = ['Cash', 'UPI', 'Card', 'Net Banking'];
const customerNames = ['Aarav Shah', 'Priya Patel', 'Rohan Mehta', 'Neha Sharma', 'Karan Joshi', 'Isha Verma', 'Rahul Singh', 'Mira Desai', 'Dev Patel', 'Anaya Rao'];

export const demoProducts = [
  { id:'demo-laptop-stand', name:'Laptop Stand Pro', category:'Accessories', price:1299, costPrice:760, minStock:8, supplierName:'Demo Supplier', imageUrl:'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=300&q=80' },
  { id:'demo-wireless-mouse', name:'Wireless Mouse', category:'Electronics', price:699, costPrice:380, minStock:12, supplierName:'Demo Supplier', imageUrl:'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=300&q=80' },
  { id:'demo-keyboard', name:'Mechanical Keyboard', category:'Electronics', price:2499, costPrice:1450, minStock:7, supplierName:'Demo Supplier', imageUrl:'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80' },
  { id:'demo-headphones', name:'Bluetooth Headphones', category:'Audio', price:1899, costPrice:980, minStock:10, supplierName:'Demo Supplier', imageUrl:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80' },
  { id:'demo-usb-hub', name:'USB-C Hub', category:'Accessories', price:1599, costPrice:890, minStock:8, supplierName:'Demo Supplier', imageUrl:'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=300&q=80' },
  { id:'demo-smartwatch', name:'Smart Watch Lite', category:'Wearables', price:3499, costPrice:2100, minStock:6, supplierName:'Demo Supplier', imageUrl:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80' },
  { id:'demo-powerbank', name:'10000mAh Power Bank', category:'Electronics', price:1199, costPrice:670, minStock:9, supplierName:'Demo Supplier', imageUrl:'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=300&q=80' },
  { id:'demo-backpack', name:'Office Backpack', category:'Bags', price:2199, costPrice:1220, minStock:5, supplierName:'Demo Supplier', imageUrl:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80' }
];

const demoBatches = [
  { productId: 'demo-laptop-stand', batchNumber: 'LS-2026-01', manufactureDate: '2026-01-15', expiryDate: '2028-01-15', purchasedQuantity: 50, remainingQuantity: 45, purchasePrice: 760 },
  { productId: 'demo-wireless-mouse', batchNumber: 'WM-2026-01', manufactureDate: '2026-02-01', expiryDate: '2028-02-01', purchasedQuantity: 100, remainingQuantity: 80, purchasePrice: 380 },
  { productId: 'demo-keyboard', batchNumber: 'KB-2026-01', manufactureDate: '2026-03-01', expiryDate: '2028-03-01', purchasedQuantity: 50, remainingQuantity: 35, purchasePrice: 1450 },
  { productId: 'demo-headphones', batchNumber: 'HP-2026-01', manufactureDate: '2026-01-20', expiryDate: '2028-01-20', purchasedQuantity: 70, remainingQuantity: 55, purchasePrice: 980 },
  { productId: 'demo-usb-hub', batchNumber: 'UH-2026-01', manufactureDate: '2026-02-10', expiryDate: '2028-02-10', purchasedQuantity: 50, remainingQuantity: 42, purchasePrice: 890 },
  { productId: 'demo-smartwatch', batchNumber: 'SW-2026-01', manufactureDate: '2026-03-15', expiryDate: '2028-03-15', purchasedQuantity: 30, remainingQuantity: 28, purchasePrice: 2100 },
  { productId: 'demo-powerbank', batchNumber: 'PB-2026-01', manufactureDate: '2026-01-10', expiryDate: '2028-01-10', purchasedQuantity: 70, remainingQuantity: 60, purchasePrice: 670 },
  { productId: 'demo-backpack', batchNumber: 'BP-2026-01', manufactureDate: '2026-02-20', expiryDate: '2028-02-20', purchasedQuantity: 30, remainingQuantity: 24, purchasePrice: 1220 },
];

function randomItem(items){
  return items[Math.floor(Math.random() * items.length)];
}

function getOwnerId(){
  let owner = sessionStorage.getItem(DEMO_OWNER_KEY);
  if (!owner) {
    owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(DEMO_OWNER_KEY, owner);
  }
  return owner;
}

function takeDemoLock(intervalMs){
  const owner = getOwnerId();
  const now = Date.now();
  try {
    const current = JSON.parse(localStorage.getItem(DEMO_LOCK_KEY) || 'null');
    if (current && current.owner !== owner && Number(current.expiresAt || 0) > now) return false;
    localStorage.setItem(DEMO_LOCK_KEY, JSON.stringify({ owner, expiresAt: now + Math.max(intervalMs * 2, 12000) }));
    return true;
  } catch {
    return true;
  }
}

function releaseDemoLock(){
  try {
    const owner = getOwnerId();
    const current = JSON.parse(localStorage.getItem(DEMO_LOCK_KEY) || 'null');
    if (!current || current.owner === owner) localStorage.removeItem(DEMO_LOCK_KEY);
  } catch {}
}

export function isDemoLiveEnabled(){
  return localStorage.getItem(DEMO_ENABLED_KEY) === 'true';
}

export function setDemoLiveEnabled(enabled){
  localStorage.setItem(DEMO_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) releaseDemoLock();
}

export function getDemoInterval(){
  const saved = Number(localStorage.getItem(DEMO_INTERVAL_KEY));
  return Number.isFinite(saved) && saved >= 3000 ? saved : DEFAULT_INTERVAL_MS;
}

export function setDemoInterval(ms){
  const safe = Math.max(3000, Number(ms || DEFAULT_INTERVAL_MS));
  localStorage.setItem(DEMO_INTERVAL_KEY, String(safe));
  return safe;
}

export async function seedDemoProducts({ restock=false } = {}){
  let created = 0;
  let updated = 0;
  for (const item of demoProducts) {
    const ref = doc(db, 'products', item.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...item,
        source: 'demo',
        isDemo: true,
        status: statusFor(item.stock || 0, item.minStock),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      created++;
    } else if (restock) {
      await setDoc(ref, {
        stock: item.stock,
        status: statusFor(item.stock || 0, item.minStock),
        source: 'demo',
        isDemo: true,
        updatedAt: serverTimestamp()
      }, { merge:true });
      updated++;
    }
  }
  
  // Create demo batches
  for (const batch of demoBatches) {
    const batchRef = doc(db, 'productBatches', `${batch.productId}-${batch.batchNumber}`);
    const batchSnap = await getDoc(batchRef);
    if (!batchSnap.exists()) {
      const product = demoProducts.find(p => p.id === batch.productId);
      await setDoc(batchRef, {
        ...batch,
        productName: product?.name || '',
        supplierName: product?.supplierName || 'Demo Supplier',
        status: 'Active',
        createdAt: serverTimestamp(),
        createdBy: 'demo-system',
      });
    } else if (restock) {
      await setDoc(batchRef, {
        remainingQuantity: batch.remainingQuantity,
        status: 'Active',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  }
  
  return { created, updated, total: demoProducts.length };
}

async function getDemoSaleProducts(){
  let products = await fetchAll('products');
  let demo = products.filter(p => p.source === 'demo' || p.isDemo === true || String(p.id || '').startsWith('demo-'));
  if (!demo.length) {
    await seedDemoProducts();
    products = await fetchAll('products');
    demo = products.filter(p => p.source === 'demo' || p.isDemo === true || String(p.id || '').startsWith('demo-'));
  }
  let available = demo.filter(p => Number(p.stock || 0) > 0);
  if (!available.length && demo.length) {
    await seedDemoProducts({ restock:true });
    products = await fetchAll('products');
    available = products.filter(p => (p.source === 'demo' || p.isDemo === true || String(p.id || '').startsWith('demo-')) && Number(p.stock || 0) > 0);
  }
  return available;
}

export async function createDummySale(profile={}){
  const products = await getDemoSaleProducts();
  if (!products.length) throw new Error('No demo products available. Seed demo products first.');

  const selected = randomItem(products);
  const batches = await fetchAll('productBatches');
  
  // Use FEFO logic to determine which batch to sell from
  const { selected: fefoBatches, remainingQty } = getFEFOBatches(selected.id, batches, 1);
  if (remainingQty > 0 || fefoBatches.length === 0) {
    throw new Error(`No sellable batches available for ${selected.name}`);
  }
  
  const batchToUse = fefoBatches[0].batch;
  const invoiceNumber = `DUMMY-${Date.now().toString().slice(-8)}`;
  const saleRef = doc(collection(db, 'sales'));
  let savedSale = null;

  await runTransaction(db, async tx => {
    const productRef = doc(db, 'products', selected.id);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists()) throw new Error('Selected demo product was not found.');

    const product = productSnap.data();
    const stock = Number(product.stock || 0);
    if (stock <= 0) throw new Error(`${product.name || selected.name} is out of stock.`);

    const batchRef = doc(db, 'productBatches', batchToUse.id);
    const batchSnap = await tx.get(batchRef);
    if (!batchSnap.exists()) throw new Error('Batch not found.');

    const batchData = batchSnap.data();
    const batchStock = Number(batchData.remainingQuantity || 0);
    if (batchStock <= 0) throw new Error('Batch is empty.');

    const quantity = 1; // Demo sells 1 unit at a time
    const price = Number(product.price || selected.price || 0);
    const costPrice = Number(batchData.purchasePrice || product.costPrice || 0);
    const totalAmount = price * quantity;
    const profit = (price - costPrice) * quantity;
    const newProductStock = stock - quantity;
    const newBatchStock = batchStock - quantity;
    const newBatchStatus = newBatchStock <= 0 ? 'Empty' : 'Active';

    savedSale = {
      invoiceNumber,
      productId: selected.id,
      productName: product.name || selected.name,
      quantity,
      price,
      costPrice,
      totalAmount,
      profit,
      customerName: randomItem(customerNames),
      paymentMethod: randomItem(paymentModes),
      salespersonId: 'system-demo',
      salespersonName: 'System Demo',
      source: 'dummy',
      isDemo: true,
      generatedBy: profile?.id || 'admin-demo-session',
      batchesUsed: [{ batchId: batchToUse.id, batchNumber: batchToUse.batchNumber, quantity }],
      createdAt: serverTimestamp()
    };

    tx.update(productRef, {
      stock: newProductStock,
      status: statusFor(newProductStock, product.minStock),
      updatedAt: serverTimestamp()
    });
    
    tx.update(batchRef, {
      remainingQuantity: newBatchStock,
      status: newBatchStatus,
      updatedAt: serverTimestamp()
    });
    
    tx.set(saleRef, savedSale);
  });

  return { id: saleRef.id, ...savedSale };
}

export function startDemoLiveSales({ profile={}, onSale=null, onError=null, intervalMs=getDemoInterval() } = {}){
  let stopped = false;
  let busy = false;
  let timer = null;

  const tick = async () => {
    if (stopped || !isDemoLiveEnabled() || busy) return;
    if (!takeDemoLock(intervalMs)) return;
    busy = true;
    try {
      const sale = await createDummySale(profile);
      if (typeof onSale === 'function') onSale(sale);
    } catch (err) {
      if (typeof onError === 'function') onError(err);
      else console.warn('Dummy sale generation failed:', err);
    } finally {
      busy = false;
    }
  };

  tick();
  timer = setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    clearInterval(timer);
    releaseDemoLock();
  };
}