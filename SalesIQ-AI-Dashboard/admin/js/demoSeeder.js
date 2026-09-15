import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  runTransaction,
  writeBatch,
  serverTimestamp,
} from "../../js/firebase-config.js";

import { fetchAll, statusFor, createNotification } from "../../js/shared.js";

const productsCollection = collection(db, "products");
const purchasesCollection = collection(db, "purchases");
const batchesCollection = collection(db, "productBatches");
const salesCollection = collection(db, "sales");
const customersCollection = collection(db, "customers");

const DEMO_PRODUCTS = [
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
    name: "Laptop",
    category: "Electronics",
    supplier: "Dell",
    cost: 45000,
    price: 52000,
    image: "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=600",
  },
  {
    name: "Keyboard",
    category: "Electronics",
    supplier: "Logitech",
    cost: 800,
    price: 1200,
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=600",
  },
  {
    name: "Mouse",
    category: "Electronics",
    supplier: "HP",
    cost: 300,
    price: 550,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600",
  },
  {
    name: "T-Shirt",
    category: "Clothing",
    supplier: "Levis",
    cost: 350,
    price: 650,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
  },
];

function randomQty() {
  return Math.floor(Math.random() * 50) + 30;
}

function batchNumber() {
  return "B-" + Math.floor(Math.random() * 1000000);
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
  return ["Food", "Medicine"].includes(category);
}
export async function seedDemoProducts() {
  const products = await fetchAll("products");

  for (const item of DEMO_PRODUCTS) {
    const existing = products.find(
      (p) => p.name.toLowerCase() === item.name.toLowerCase(),
    );

    const qty = randomQty();

    if (!existing) {
      // Create new product
      const productRef = await addDoc(productsCollection, {
        name: item.name,
        category: item.category,
        supplierName: item.supplier,

        price: item.price,
        costPrice: item.cost,

        stock: qty,
        minStock: 10,

        imageUrl: item.image,

        status: statusFor(qty, 10),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Purchase history
      await addDoc(purchasesCollection, {
        productId: productRef.id,
        productName: item.name,

        quantity: qty,

        supplierName: item.supplier,

        purchasePrice: item.cost,

        purchaseDate: new Date().toISOString().slice(0, 10),

        createdAt: serverTimestamp(),

        createdBy: "demo",
      });

      // Batch for Food & Medicine
      if (isPerishable(item.category)) {
        await addDoc(batchesCollection, {
          productId: productRef.id,
          productName: item.name,

          batchNo: batchNumber(),

          supplierName: item.supplier,

          manufactureDate: manufactureDate(),

          expiryDate: expiryDate(),

          quantity: qty,

          remainingQuantity: qty,

          purchasePrice: item.cost,

          createdAt: serverTimestamp(),

          createdBy: "demo",
        });
      }

      continue;
    }

    // Restock existing product
    const newStock = Number(existing.stock || 0) + qty;

    await updateDoc(doc(db, "products", existing.id), {
      stock: newStock,
      status: statusFor(newStock, existing.minStock || 10),
      updatedAt: serverTimestamp(),
    });

    await addDoc(purchasesCollection, {
      productId: existing.id,
      productName: existing.name,

      quantity: qty,

      supplierName: item.supplier,

      purchasePrice: item.cost,

      purchaseDate: new Date().toISOString().slice(0, 10),

      createdAt: serverTimestamp(),

      createdBy: "demo",
    });

    if (isPerishable(item.category)) {
      await addDoc(batchesCollection, {
        productId: existing.id,
        productName: existing.name,

        batchNo: batchNumber(),

        supplierName: item.supplier,

        manufactureDate: manufactureDate(),

        expiryDate: expiryDate(),

        quantity: qty,

        remainingQuantity: qty,

        purchasePrice: item.cost,

        createdAt: serverTimestamp(),

        createdBy: "demo",
      });
    }
  }

  await createNotification("Demo products seeded successfully.", "purchase");
}
const CUSTOMER_NAMES = [
  "Rahul Patel",
  "Aarav Shah",
  "Priya Mehta",
  "Sneha Patel",
  "Vikram Joshi",
  "Neha Sharma",
  "Rohan Desai",
  "Ananya Singh",
  "Karan Verma",
  "Aisha Khan",
];

const PAYMENT_METHODS = ["Cash", "Card", "UPI"];

function randomCustomer() {
  return CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
}

function randomPayment() {
  return PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
}

export async function generateDummySale() {
  const products = (await fetchAll("products")).filter(
    (p) => Number(p.stock || 0) > 0,
  );

  if (!products.length) throw new Error("No products in stock.");

  const product = products[Math.floor(Math.random() * products.length)];

  const quantity = Math.min(
    Math.floor(Math.random() * 5) + 1,
    Number(product.stock),
  );

  let manufactureDate = "";
  let expiryDate = "";

  if (isPerishable(product.category)) {
    const q = query(batchesCollection, where("productId", "==", product.id));

    const snap = await getDocs(q);

    const batches = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter((b) => Number(b.remainingQuantity) > 0)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    if (!batches.length)
      throw new Error(`No batch available for ${product.name}`);

    let need = quantity;

    const batch = writeBatch(db);

    manufactureDate = batches[0].manufactureDate || "";

    expiryDate = batches[0].expiryDate || "";

    for (const b of batches) {
      if (need <= 0) break;

      const consume = Math.min(need, Number(b.remainingQuantity));

      need -= consume;

      batch.update(doc(db, "productBatches", b.id), {
        remainingQuantity: Number(b.remainingQuantity) - consume,
      });
    }

    await batch.commit();
  }

  const newStock = Number(product.stock) - quantity;

  await updateDoc(doc(db, "products", product.id), {
    stock: newStock,
    status: statusFor(newStock, product.minStock),
    updatedAt: serverTimestamp(),
  });

  const invoice = "DM-" + Date.now();

  const total = Number(product.price) * quantity;

  const customer = randomCustomer();

  await addDoc(salesCollection, {
    invoiceNumber: invoice,

    productId: product.id,
    productName: product.name,

    category: product.category,

    manufactureDate,
    expiryDate,

    quantity,

    price: Number(product.price),

    costPrice: Number(product.costPrice || 0),

    totalAmount: total,

    profit: (Number(product.price) - Number(product.costPrice || 0)) * quantity,

    customerName: customer,

    paymentMethod: randomPayment(),

    salespersonName: "Dummy Generator",

    salespersonId: "demo",

    source: "dummy",

    isDemo: true,

    createdAt: serverTimestamp(),
  });

  await addDoc(customersCollection, {
    name: customer,

    totalSpent: total,

    lastPurchaseDate: new Date().toISOString().slice(0, 10),

    source: "dummy",

    createdAt: serverTimestamp(),
  });

  await createNotification(`Dummy sale: ${product.name} x${quantity}`, "sale");

  if (statusFor(newStock, product.minStock) !== "Available") {
    await createNotification(
      `${product.name} is ${statusFor(newStock, product.minStock)}`,
      "stock",
    );
  }
}
let demoInterval = null;

/* --------------------------
   Generate Multiple Sales
---------------------------*/

export async function generateMultipleSales(count = 10) {
  for (let i = 0; i < count; i++) {
    try {
      await generateDummySale();
    } catch (err) {
      console.error(err);
      break;
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  await createNotification(`${count} dummy sales generated.`, "sale");
}

/* --------------------------
   Live Demo
---------------------------*/

export function startDemoLive(interval = 8000) {
  if (demoInterval) return;

  demoInterval = setInterval(async () => {
    try {
      await generateDummySale();
    } catch (err) {
      console.error(err);
    }
  }, interval);
}

export function stopDemoLive() {
  if (!demoInterval) return;

  clearInterval(demoInterval);

  demoInterval = null;
}

// NOTE: Dashboard button wiring intentionally lives in js/dashboard.js only.
// This module exports pure demo-data helpers (no direct DOM access) so a
// single click can never trigger two competing sale-creation paths.
