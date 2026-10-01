import {
  db,
  collection,
  addDoc,
  setDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  serverTimestamp,
} from "../../js/firebase-config.js";

import {
  fetchAll,
  statusFor,
  createNotification,
  getActiveTenantId,
  invalidateCache,
} from "../../js/shared.js";

const productsCollection = collection(db, "products");
const purchasesCollection = collection(db, "purchases");
const batchesCollection = collection(db, "productBatches");
const salesCollection = collection(db, "sales");
const customersCollection = collection(db, "customers");
const suppliersCollection = collection(db, "suppliers");

export const DEMO_PRODUCTS = [
  {
    name: "Milk",
    category: "Food",
    supplier: "Amul",
    cost: 28,
    price: 35,
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600",
  },
  {
    name: "Bread",
    category: "Food",
    supplier: "Britannia",
    cost: 18,
    price: 25,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
  },
  {
    name: "Paracetamol",
    category: "Medicine",
    supplier: "Cipla",
    cost: 22,
    price: 35,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600",
  },
  {
    name: "Vitamin C",
    category: "Medicine",
    supplier: "Sun Pharma",
    cost: 90,
    price: 130,
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600",
  },
  {
    name: "Laptop Stand Pro",
    category: "Accessories",
    supplier: "Demo Supplier",
    cost: 760,
    price: 1299,
    image:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Wireless Mouse",
    category: "Electronics",
    supplier: "Demo Supplier",
    cost: 380,
    price: 699,
    image:
      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Mechanical Keyboard",
    category: "Electronics",
    supplier: "Demo Supplier",
    cost: 1450,
    price: 2499,
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Bluetooth Headphones",
    category: "Audio",
    supplier: "Demo Supplier",
    cost: 980,
    price: 1899,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "USB-C Hub",
    category: "Accessories",
    supplier: "Demo Supplier",
    cost: 890,
    price: 1599,
    image:
      "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Smart Watch Lite",
    category: "Wearables",
    supplier: "Demo Supplier",
    cost: 2100,
    price: 3499,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "10000mAh Power Bank",
    category: "Electronics",
    supplier: "Demo Supplier",
    cost: 670,
    price: 1199,
    image:
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=300&q=80",
  },
  {
    name: "Office Backpack",
    category: "Bags",
    supplier: "Demo Supplier",
    cost: 1220,
    price: 2199,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80",
  },
];

export const DEMO_SUPPLIERS = [
  {
    name: "Amul India Ltd",
    contactNumber: "+91 98250 11223",
    email: "supplies@amul.coop",
    address: "Amul Dairy Road, Anand, Gujarat",
    productsSupplied: "Milk, Dairy Products",
    lastOrderDate: new Date(Date.now() - 2 * 86400000)
      .toISOString()
      .slice(0, 10),
    paymentStatus: "Paid",
  },
  {
    name: "Britannia Industries",
    contactNumber: "+91 98450 33445",
    email: "b2b@britannia.co.in",
    address: "Vimanapura, Bengaluru, Karnataka",
    productsSupplied: "Bread, Bakery Products",
    lastOrderDate: new Date(Date.now() - 5 * 86400000)
      .toISOString()
      .slice(0, 10),
    paymentStatus: "Paid",
  },
  {
    name: "Cipla Health Supplies",
    contactNumber: "+91 98110 55667",
    email: "distribution@cipla.com",
    address: "Mumbai Central, Mumbai, Maharashtra",
    productsSupplied: "Paracetamol, Essential Medicines",
    lastOrderDate: new Date(Date.now() - 3 * 86400000)
      .toISOString()
      .slice(0, 10),
    paymentStatus: "Paid",
  },
  {
    name: "Sun Pharma Distribution",
    contactNumber: "+91 98200 77889",
    email: "orders@sunpharma.com",
    address: "Goregaon East, Mumbai, Maharashtra",
    productsSupplied: "Vitamin C, Supplements",
    lastOrderDate: new Date(Date.now() - 8 * 86400000)
      .toISOString()
      .slice(0, 10),
    paymentStatus: "Pending",
  },
  {
    name: "Dell Technologies India",
    contactNumber: "+91 98400 99001",
    email: "commercial@dell.co.in",
    address: "Inner Ring Road, Bengaluru, Karnataka",
    productsSupplied: "Laptop, Computer Hardware",
    lastOrderDate: new Date(Date.now() - 12 * 86400000)
      .toISOString()
      .slice(0, 10),
    paymentStatus: "Paid",
  },
  {
    name: "Logitech Devices Hub",
    contactNumber: "+91 98300 22334",
    email: "sales@logitech-hub.in",
    address: "Bandra Kurla Complex, Mumbai, Maharashtra",
    productsSupplied: "Keyboard, Mouse, Peripherals",
    lastOrderDate: new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .slice(0, 10),
    paymentStatus: "Pending",
  },
  {
    name: "Levis Apparel Wholesale",
    contactNumber: "+91 98190 44556",
    email: "wholesale@levis.in",
    address: "Connaught Place, New Delhi",
    productsSupplied: "T-Shirt, Denim, Apparel",
    lastOrderDate: new Date(Date.now() - 14 * 86400000)
      .toISOString()
      .slice(0, 10),
    paymentStatus: "Paid",
  },
];

export const DEMO_CUSTOMERS = [
  {
    name: "Rahul Patel",
    phone: "+91 98765 43210",
    email: "rahul.patel@gmail.com",
    totalSpent: 12500,
    lastPurchaseDate: new Date().toISOString().slice(0, 10),
  },
  {
    name: "Aarav Shah",
    phone: "+91 98123 45678",
    email: "aarav.shah@outlook.com",
    totalSpent: 54200,
    lastPurchaseDate: new Date().toISOString().slice(0, 10),
  },
  {
    name: "Priya Mehta",
    phone: "+91 98234 56789",
    email: "priya.mehta@yahoo.com",
    totalSpent: 8400,
    lastPurchaseDate: new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10),
  },
  {
    name: "Sneha Patel",
    phone: "+91 98345 67890",
    email: "sneha.p@gmail.com",
    totalSpent: 19800,
    lastPurchaseDate: new Date(Date.now() - 2 * 86400000)
      .toISOString()
      .slice(0, 10),
  },
  {
    name: "Vikram Joshi",
    phone: "+91 98456 78901",
    email: "vikram.j@gmail.com",
    totalSpent: 6200,
    lastPurchaseDate: new Date(Date.now() - 4 * 86400000)
      .toISOString()
      .slice(0, 10),
  },
  {
    name: "Neha Sharma",
    phone: "+91 98567 89012",
    email: "neha.sharma@gmail.com",
    totalSpent: 31000,
    lastPurchaseDate: new Date().toISOString().slice(0, 10),
  },
  {
    name: "Rohan Desai",
    phone: "+91 98678 90123",
    email: "rohan.desai@gmail.com",
    totalSpent: 15400,
    lastPurchaseDate: new Date(Date.now() - 3 * 86400000)
      .toISOString()
      .slice(0, 10),
  },
  {
    name: "Ananya Singh",
    phone: "+91 98789 01234",
    email: "ananya.s@gmail.com",
    totalSpent: 22000,
    lastPurchaseDate: new Date().toISOString().slice(0, 10),
  },
  {
    name: "Karan Verma",
    phone: "+91 98890 12345",
    email: "karan.verma@gmail.com",
    totalSpent: 9800,
    lastPurchaseDate: new Date(Date.now() - 5 * 86400000)
      .toISOString()
      .slice(0, 10),
  },
  {
    name: "Aisha Khan",
    phone: "+91 98901 23456",
    email: "aisha.khan@gmail.com",
    totalSpent: 45000,
    lastPurchaseDate: new Date().toISOString().slice(0, 10),
  },
];

const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Net Banking"];

function randomQty() {
  return Math.floor(Math.random() * 40) + 40;
}

function batchNumber() {
  return "B-" + Math.floor(100000 + Math.random() * 900000);
}

function manufactureDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - Math.floor(Math.random() * 4));
  return d.toISOString().slice(0, 10);
}

function expiryDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.floor(Math.random() * 18) + 6);
  return d.toISOString().slice(0, 10);
}

function isPerishable(category) {
  return ["food", "medicine"].includes(String(category || "").toLowerCase());
}

function randomCustomer() {
  return DEMO_CUSTOMERS[Math.floor(Math.random() * DEMO_CUSTOMERS.length)].name;
}

function randomPayment() {
  return PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
}

/* --------------------------
   Seed / Restock Products
---------------------------*/
export async function seedDemoProducts({
  restock = true,
  profile = null,
} = {}) {
  const adminId = profile?.id || getActiveTenantId(profile);
  if (!adminId) {
    throw new Error("No active admin account found to seed products.");
  }

  const products = await fetchAll("products", false, adminId);
  let created = 0;
  let restocked = 0;

  for (const item of DEMO_PRODUCTS) {
    const existing = products.find(
      (p) =>
        (p.name || "").toLowerCase().trim() === item.name.toLowerCase().trim(),
    );

    const qty = randomQty();

    if (!existing) {
      // Create new product strictly for this admin
      const mfg = manufactureDate();
      const exp = expiryDate();
      const productData = {
        name: item.name,
        category: item.category,
        supplierName: item.supplier,
        price: Number(item.price),
        costPrice: Number(item.cost),
        stock: qty,
        minStock: 10,
        imageUrl: item.image,
        status: statusFor(qty, 10),
        source: "demo",
        isDemo: true,
        adminId: adminId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (isPerishable(item.category)) {
        productData.manufactureDate = mfg;
        productData.expiryDate = exp;
      }

      const productRef = await addDoc(productsCollection, productData);

      // Add purchase history
      await addDoc(purchasesCollection, {
        productId: productRef.id,
        productName: item.name,
        quantity: qty,
        supplierName: item.supplier,
        purchasePrice: Number(item.cost),
        purchaseDate: new Date().toISOString().slice(0, 10),
        adminId: adminId,
        createdAt: serverTimestamp(),
        createdBy: profile?.name || "demo",
      });

      // Batch for Food & Medicine
      if (isPerishable(item.category)) {
        await addDoc(batchesCollection, {
          productId: productRef.id,
          productName: item.name,
          batchNo: batchNumber(),
          supplierName: item.supplier,
          manufactureDate: mfg,
          expiryDate: exp,
          quantity: qty,
          remainingQuantity: qty,
          purchasePrice: Number(item.cost),
          adminId: adminId,
          createdAt: serverTimestamp(),
          createdBy: profile?.name || "demo",
        });
      }

      created++;
      continue;
    }

    if (restock) {
      // Restock existing product for this admin
      const newStock = Number(existing.stock || 0) + qty;
      const mfg = manufactureDate();
      const exp = expiryDate();

      const productUpdate = {
        stock: newStock,
        status: statusFor(newStock, existing.minStock || 10),
        source: "demo",
        isDemo: true,
        adminId: adminId,
        updatedAt: serverTimestamp(),
      };

      if (isPerishable(item.category)) {
        productUpdate.manufactureDate = mfg;
        productUpdate.expiryDate = exp;

        await addDoc(batchesCollection, {
          productId: existing.id,
          productName: existing.name,
          batchNo: batchNumber(),
          supplierName: item.supplier,
          manufactureDate: mfg,
          expiryDate: exp,
          quantity: qty,
          remainingQuantity: qty,
          purchasePrice: Number(item.cost),
          adminId: adminId,
          createdAt: serverTimestamp(),
          createdBy: profile?.name || "demo",
        });
      }

      await updateDoc(doc(db, "products", existing.id), productUpdate);

      await addDoc(purchasesCollection, {
        productId: existing.id,
        productName: existing.name,
        quantity: qty,
        supplierName: item.supplier,
        purchasePrice: Number(item.cost),
        purchaseDate: new Date().toISOString().slice(0, 10),
        adminId: adminId,
        createdAt: serverTimestamp(),
        createdBy: profile?.name || "demo",
      });

      restocked++;
    }
  }

  invalidateCache("products");
  invalidateCache("productBatches");
  invalidateCache("purchases");
  await createNotification(
    "Demo products seeded/restocked successfully.",
    "purchase",
    adminId,
  );
  return { created, restocked, total: DEMO_PRODUCTS.length };
}

/* --------------------------
   Seed Suppliers
---------------------------*/
export async function seedDemoSuppliers(profile = null) {
  const adminId = profile?.id || getActiveTenantId(profile);
  if (!adminId) {
    throw new Error("No active admin account found to seed suppliers.");
  }

  const existingSuppliers = await fetchAll("suppliers", false, adminId);
  let created = 0;
  let updated = 0;

  for (const s of DEMO_SUPPLIERS) {
    const existing = existingSuppliers.find(
      (x) =>
        (x.name || "").toLowerCase().trim() === s.name.toLowerCase().trim(),
    );

    if (!existing) {
      await addDoc(suppliersCollection, {
        ...s,
        source: "demo",
        adminId: adminId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created++;
    } else {
      await updateDoc(doc(db, "suppliers", existing.id), {
        ...s,
        adminId: adminId,
        updatedAt: serverTimestamp(),
      });
      updated++;
    }
  }
  invalidateCache("suppliers");
  await createNotification(
    `Demo suppliers ready (${created} added, ${updated} updated).`,
    "general",
    adminId,
  );
  return { created, updated, total: DEMO_SUPPLIERS.length };
}

/* --------------------------
   Seed Customers
---------------------------*/
export async function seedDemoCustomers(profile = null) {
  const adminId = profile?.id || getActiveTenantId(profile);
  if (!adminId) {
    throw new Error("No active admin account found to seed customers.");
  }

  const existingCustomers = await fetchAll("customers", false, adminId);
  let created = 0;
  let updated = 0;

  for (const c of DEMO_CUSTOMERS) {
    const existing = existingCustomers.find(
      (x) =>
        (x.name || "").toLowerCase().trim() === c.name.toLowerCase().trim() ||
        (x.email && x.email.toLowerCase() === c.email.toLowerCase()),
    );

    if (!existing) {
      await addDoc(customersCollection, {
        ...c,
        source: "demo",
        adminId: adminId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created++;
    } else {
      await updateDoc(doc(db, "customers", existing.id), {
        totalSpent:
          Number(existing.totalSpent || 0) + Number(c.totalSpent || 0),
        lastPurchaseDate: c.lastPurchaseDate,
        adminId: adminId,
        updatedAt: serverTimestamp(),
      });
      updated++;
    }
  }

  invalidateCache("customers");
  await createNotification(
    `Demo customers ready (${created} added, ${updated} updated).`,
    "general",
    adminId,
  );
  return { created, updated, total: DEMO_CUSTOMERS.length };
}

/* --------------------------
   Generate 1 Dummy Sale
---------------------------*/
export async function generateDummySale(profile = {}) {
  const adminId = profile?.id || getActiveTenantId(profile);
  if (!adminId) {
    throw new Error("No active admin account found to generate sale.");
  }

  let products = (await fetchAll("products", false, adminId)).filter(
    (p) => Number(p.stock || 0) > 0,
  );

  if (!products.length) {
    await seedDemoProducts({ restock: true, profile });
    products = (await fetchAll("products", false, adminId)).filter(
      (p) => Number(p.stock || 0) > 0,
    );
  }

  if (!products.length) {
    throw new Error("No products in stock to generate sale.");
  }

  const product = products[Math.floor(Math.random() * products.length)];
  if (!product || !product.id) {
    throw new Error("No valid product selected to generate sale.");
  }

  const quantity = Math.min(
    Math.floor(Math.random() * 3) + 1,
    Math.max(1, Number(product.stock || 1)),
  );

  let manufactureDate = product.manufactureDate || "";
  let expiryDate = product.expiryDate || "";

  if (isPerishable(product.category)) {
    try {
      const q = query(batchesCollection, where("productId", "==", product.id));
      const snap = await getDocs(q);

      const batches = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter(
          (b) =>
            Number(b.remainingQuantity || 0) > 0 &&
            (b.adminId === adminId || !b.adminId),
        )
        .sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || ""));

      if (batches.length > 0) {
        let need = quantity;
        const bBatch = writeBatch(db);
        manufactureDate = batches[0].manufactureDate || manufactureDate;
        expiryDate = batches[0].expiryDate || expiryDate;

        for (const b of batches) {
          if (need <= 0) break;
          const consume = Math.min(need, Number(b.remainingQuantity));
          need -= consume;
          bBatch.update(doc(db, "productBatches", b.id), {
            remainingQuantity: Number(b.remainingQuantity) - consume,
          });
        }
        await bBatch.commit();
      }
    } catch (batchErr) {
      console.warn("Could not deduct from product batch:", batchErr);
    }
  }

  const currentStock = Number(product.stock || 0);
  const newStock = Math.max(0, currentStock - quantity);

  const targetDocId = product.docId || product._docId || product.id;
  await setDoc(
    doc(db, "products", targetDocId),
    {
      stock: newStock,
      status: statusFor(newStock, product.minStock || 10),
      adminId: adminId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const invoice = "DM-" + Math.floor(10000000 + Math.random() * 90000000);
  const price = Number(product.price || 0);
  const cost = Number(product.costPrice || 0);
  const total = price * quantity;
  const customer = randomCustomer() || "Aarav Shah";
  const productName = product.name || "Demo Product";

  const saleData = {
    invoiceNumber: invoice,
    productId: targetDocId,
    productName: productName,
    category: product.category || "General",
    manufactureDate: manufactureDate || "",
    expiryDate: expiryDate || "",
    quantity,
    price,
    costPrice: cost,
    totalAmount: total,
    profit: (price - cost) * quantity,
    customerName: customer,
    paymentMethod: randomPayment(),
    salespersonName: profile?.name || "Dummy Generator",
    salespersonId: profile?.id || "demo",
    source: "dummy",
    isDemo: true,
    adminId: adminId,
    createdAt: serverTimestamp(),
  };

  const saleRef = await addDoc(salesCollection, saleData);

  try {
    const existingCustomers = await fetchAll("customers", false, adminId);
    const existingCust = existingCustomers.find(
      (c) =>
        (c.name || "").toLowerCase().trim() === customer.toLowerCase().trim(),
    );

    if (existingCust) {
      await updateDoc(doc(db, "customers", existingCust.id), {
        totalSpent: Number(existingCust.totalSpent || 0) + total,
        lastPurchaseDate: new Date().toISOString().slice(0, 10),
        adminId: adminId,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(customersCollection, {
        name: customer,
        phone: "+91 98" + Math.floor(10000000 + Math.random() * 90000000),
        email: `${customer.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        totalSpent: total,
        lastPurchaseDate: new Date().toISOString().slice(0, 10),
        source: "dummy",
        adminId: adminId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.warn("Could not save customer for dummy sale:", e);
  }

  try {
    await createNotification(
      `Dummy sale: ${productName} x${quantity} (Invoice: ${invoice})`,
      "sale",
      adminId,
    );

    if (statusFor(newStock, product.minStock || 10) !== "Available") {
      await createNotification(
        `${productName} is now ${statusFor(newStock, product.minStock || 10)}`,
        "stock",
        adminId,
      );
    }
  } catch (notifErr) {
    console.warn("Could not create dummy sale notification:", notifErr);
  }

  invalidateCache("sales");
  invalidateCache("products");
  return { id: saleRef.id, ...saleData };
}

/* --------------------------
   Generate Multiple Sales (Batched)
---------------------------*/
export async function generateMultipleSales(count = 10, profile = {}) {
  const adminId = profile?.id || getActiveTenantId(profile);
  if (!adminId) {
    throw new Error("No active admin account found to generate sales.");
  }

  let products = (await fetchAll("products", false, adminId)).filter(
    (p) => Number(p.stock || 0) > 0,
  );

  if (!products.length) {
    await seedDemoProducts({ restock: true, profile });
    products = (await fetchAll("products", false, adminId)).filter(
      (p) => Number(p.stock || 0) > 0,
    );
  }

  if (!products.length) {
    throw new Error("No products available to generate sales.");
  }

  if (count <= 1) {
    const sale = await generateDummySale(profile);
    return { count: 1, lastSale: sale };
  }

  const stockTracker = {};
  products.forEach((p) => {
    stockTracker[p.id] = {
      stock: Number(p.stock || 0),
      minStock: Number(p.minStock || 10),
      ref: p,
    };
  });

  const CHUNK_SIZE = 150;
  let totalCreated = 0;

  for (let offset = 0; offset < count; offset += CHUNK_SIZE) {
    const currentChunkSize = Math.min(CHUNK_SIZE, count - offset);
    const batch = writeBatch(db);
    const modifiedProducts = new Set();

    for (let i = 0; i < currentChunkSize; i++) {
      let available = products.filter((p) => stockTracker[p.id].stock > 0);
      if (!available.length) {
        products.forEach((p) => {
          stockTracker[p.id].stock += 50;
        });
        available = products;
      }

      const product = available[Math.floor(Math.random() * available.length)];
      const tracker = stockTracker[product.id];
      const quantity = Math.min(
        Math.floor(Math.random() * 3) + 1,
        Math.max(1, tracker.stock),
      );

      tracker.stock = Math.max(0, tracker.stock - quantity);
      modifiedProducts.add(product.id);

      const price = Number(product.price || 50);
      const cost = Number(product.costPrice || 30);
      const totalAmount = price * quantity;
      const customer = randomCustomer();
      const invoiceNumber =
        "DM-" + Math.floor(10000000 + Math.random() * 90000000);

      const saleRef = doc(salesCollection);
      batch.set(saleRef, {
        invoiceNumber,
        productId: product.id,
        productName: product.name,
        category: product.category || "General",
        quantity,
        price,
        costPrice: cost,
        totalAmount,
        profit: (price - cost) * quantity,
        customerName: customer,
        paymentMethod: randomPayment(),
        salespersonName: profile?.name || "Dummy Generator",
        salespersonId: profile?.id || "demo",
        source: "dummy",
        isDemo: true,
        adminId: adminId,
        createdAt: serverTimestamp(),
      });
    }

    for (const pId of modifiedProducts) {
      const tracker = stockTracker[pId];
      const targetDocId = tracker.ref?.docId || tracker.ref?._docId || pId;
      const pRef = doc(db, "products", targetDocId);
      batch.set(
        pRef,
        {
          stock: tracker.stock,
          status: statusFor(tracker.stock, tracker.minStock),
          adminId: adminId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();
    totalCreated += currentChunkSize;
  }

  invalidateCache("sales");
  invalidateCache("products");
  await createNotification(
    `${totalCreated} dummy sales generated successfully.`,
    "sale",
    adminId,
  );
  return { count: totalCreated };
}

/* --------------------------
   Populate Everything
---------------------------*/
export async function populateEverything(profile = {}) {
  const adminId = profile?.id || getActiveTenantId(profile);
  if (!adminId) {
    throw new Error("No active admin account found to populate database.");
  }

  const products = await seedDemoProducts({ restock: true, profile });
  const suppliers = await seedDemoSuppliers(profile);
  const customers = await seedDemoCustomers(profile);
  const sales = await generateMultipleSales(15, profile);

  invalidateCache();
  await createNotification(
    "Demo database populated with products, suppliers, customers, and sales.",
    "general",
    adminId,
  );
  return { products, suppliers, customers, sales };
}

/* --------------------------
   Live Demo
---------------------------*/
let demoInterval = null;

export function startDemoLive(interval = 5000, profile = {}) {
  if (demoInterval) return;

  demoInterval = setInterval(async () => {
    try {
      await generateDummySale(profile);
    } catch (err) {
      console.error("Demo live error:", err);
    }
  }, interval);
}

export function stopDemoLive() {
  if (!demoInterval) return;
  clearInterval(demoInterval);
  demoInterval = null;
}

export function isDemoLiveRunning() {
  return demoInterval !== null;
}

/* --------------------------
   Window helpers for console/backward-compat
---------------------------*/
if (typeof window !== "undefined") {
  window.seedDemoProducts = seedDemoProducts;
  window.seedDemoSuppliers = seedDemoSuppliers;
  window.seedDemoCustomers = seedDemoCustomers;
  window.generateDummySale = generateDummySale;
  window.generateMultipleSales = generateMultipleSales;
  window.populateEverything = populateEverything;
  window.generate10Sales = (profile) => generateMultipleSales(10, profile);
  window.generate50Sales = (profile) => generateMultipleSales(50, profile);
  window.generate100Sales = (profile) => generateMultipleSales(100, profile);
  window.generate1000Sales = (profile) => generateMultipleSales(1000, profile);
}
