// Cleanup Duplicate Products Script (Sequential Version)
// Run in browser console on admin page (after login)

async function cleanupDuplicateProducts() {
  const { db, collection, getDocs, doc, updateDoc, deleteDoc, writeBatch } = await import('../js/firebase-config.js');
  
  // 1. Fetch all products
  const productsSnap = await getDocs(collection(db, 'products'));
  const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // 2. Group by name (case-insensitive)
  const groups = {};
  products.forEach(p => {
    const key = (p.name || '').toLowerCase().trim();
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  
  // 3. Find duplicates
  const duplicates = Object.entries(groups)
    .filter(([_, arr]) => arr.length > 1)
    .map(([name, arr]) => ({ name, products: arr }));
  
  console.log('Duplicate groups found:', duplicates.length);
  duplicates.forEach(d => console.log(`  ${d.name}: ${d.products.map(p => p.id).join(', ')}`));
  
  if (duplicates.length === 0) {
    console.log('No duplicates found!');
    return;
  }
  
  // 4. Fetch all batches
  const batchesSnap = await getDocs(collection(db, 'productBatches'));
  const batches = batchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // 5. Fetch all sales (to check references)
  const salesSnap = await getDocs(collection(db, 'sales'));
  const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // 6. Process each duplicate group sequentially
  let totalDeleted = 0;
  let totalBatchUpdated = 0;
  let totalSalesUpdated = 0;
  
  for (const { name, products: dupes } of duplicates) {
    // Keep the one with demo ID or most batches
    const demoProducts = dupes.filter(p => p.id.startsWith('demo-') || p.isDemo === true || p.source === 'demo');
    const keepProduct = demoProducts[0] || dupes.reduce((a, b) => 
      (batches.filter(b => b.productId === a.id).length >= batches.filter(b => b.productId === b.id).length) ? a : b
    );
    const deleteProducts = dupes.filter(p => p.id !== keepProduct.id);
    
    console.log(`\n${name}: Keeping ${keepProduct.id}, deleting ${deleteProducts.map(p => p.id).join(', ')}`);
    
    // Reassign batches to kept product
    for (const delProduct of deleteProducts) {
      const relatedBatches = batches.filter(b => b.productId === delProduct.id);
      for (const b of relatedBatches) {
        try {
          await updateDoc(doc(db, 'productBatches', b.id), { productId: keepProduct.id, productName: keepProduct.name });
          totalBatchUpdated++;
        } catch (e) {
          console.error(`Failed to update batch ${b.id}:`, e.message);
        }
      }
      
      // Reassign sales to kept product
      const relatedSales = sales.filter(s => s.productId === delProduct.id);
      for (const s of relatedSales) {
        try {
          await updateDoc(doc(db, 'sales', s.id), { productId: keepProduct.id, productName: keepProduct.name });
          totalSalesUpdated++;
        } catch (e) {
          console.error(`Failed to update sale ${s.id}:`, e.message);
        }
      }
      
      // Delete duplicate product
      try {
        await deleteDoc(doc(db, 'products', delProduct.id));
        totalDeleted++;
        console.log(`  Deleted ${delProduct.id}`);
      } catch (e) {
        console.error(`Failed to delete ${delProduct.id}:`, e.message);
      }
    }
  }
  
  console.log(`\n✅ Complete: ${totalDeleted} products deleted, ${totalBatchUpdated} batches updated, ${totalSalesUpdated} sales updated`);
  console.log('Refresh the page to see changes.');
}

// Export for import
export { cleanupDuplicateProducts };

// Also run immediately if loaded directly
if (typeof window !== 'undefined') {
  window.cleanupDuplicateProducts = cleanupDuplicateProducts;
}