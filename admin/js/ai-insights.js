import {
  requireAuth,
  initAppShell,
  fetchAll,
  $,
  toast,
  setBusy,
  getBatchStatus,
  formatDate,
  badgeForBatchStatus,
} from "../../js/shared.js";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin", "Manager"]);
initAppShell("admin", "ai-insights", profile);
const examples = [
  "Which batch should I discount first?",
  "Which products have expiring batches?",
  "What's my batch turnover rate?",
  "Which supplier has most expired stock?",
  "How can I reduce expiry losses?",
  "Which product should I restock first?",
  "Why are sales low this week?",
  "Which category is performing best?",
  "How can I increase profit?",
  "Which product is slow-moving?",
];
$("#exampleQuestions").innerHTML = examples
  .map(
    (q) =>
      `<button class="btn btn-ghost w-full justify-start" data-question="${q}">${q}</button>`,
  )
  .join("");
document.querySelectorAll("[data-question]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#aiQuestion").value = b.dataset.question;
    }),
);
async function buildContext() {
  const [products, sales, batches, disposals] = await Promise.all([
    fetchAll("products"),
    fetchAll("sales"),
    fetchAll("productBatches"),
    fetchAll("disposals"),
  ]);
  const batchSummary = {
    total: batches.length,
    active: batches.filter(b => getBatchStatus(b) === "Active").length,
    expired: batches.filter(b => getBatchStatus(b) === "Expired").length,
    critical: batches.filter(b => getBatchStatus(b) === "Critical Expiry").length,
    near: batches.filter(b => getBatchStatus(b) === "Near Expiry").length,
    upcoming: batches.filter(b => getBatchStatus(b) === "Upcoming Expiry").length,
    disposed: batches.filter(b => getBatchStatus(b) === "Disposed").length,
    empty: batches.filter(b => getBatchStatus(b) === "Empty").length,
  };
  const nearExpiryBatches = batches.filter(b => {
    const s = getBatchStatus(b);
    return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
  }).slice(0, 20).map(b => {
    const p = products.find(x => x.id === b.productId);
    return {
      product: p?.name || "Unknown",
      batchNumber: b.batchNumber,
      expiryDate: formatDate(b.expiryDate),
      remaining: b.remainingQuantity,
      status: getBatchStatus(b),
      supplier: b.supplierName,
    };
  });
  const expiredBatches = batches.filter(b => getBatchStatus(b) === "Expired").slice(0, 10).map(b => {
    const p = products.find(x => x.id === b.productId);
    return {
      product: p?.name || "Unknown",
      batchNumber: b.batchNumber,
      expiryDate: formatDate(b.expiryDate),
      remaining: b.remainingQuantity,
      supplier: b.supplierName,
    };
  });
  const disposalSummary = {};
  disposals.forEach(d => { disposalSummary[d.reason] = (disposalSummary[d.reason] || 0) + Number(d.quantity || 0); });
  return JSON.stringify(
    {
      products: products.slice(0, 50).map(p => {
        const pb = batches.filter(b => b.productId === p.id);
        const activeBatches = pb.filter(b => getBatchStatus(b) === "Active");
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          costPrice: p.costPrice,
          stock: p.stock,
          minStock: p.minStock,
          totalBatches: pb.length,
          activeBatches: activeBatches.length,
          expiredBatches: pb.filter(b => getBatchStatus(b) === "Expired").length,
          nearExpiryBatches: pb.filter(b => {
            const s = getBatchStatus(b);
            return s === "Critical Expiry" || s === "Near Expiry" || s === "Upcoming Expiry";
          }).length,
          oldestExpiry: activeBatches.length ? activeBatches.sort((a,b) => a.expiryDate.localeCompare(b.expiryDate))[0]?.expiryDate : null,
        };
      }),
      sales: sales.slice(0, 80),
      disposals: disposals.slice(0, 30),
      batchSummary,
      nearExpiryBatches,
      expiredBatches,
      disposalSummary,
    },
    null,
    2,
  );
}
async function askGemini(question, btn) {
  setBusy(btn, true, "Thinking...");
  $("#aiAnswer").textContent = "Analyzing your Firestore data with batch details...";
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("PASTE"))
      throw new Error("Gemini API key missing in js/firebase-config.js");
    const context = await buildContext();
    const prompt = `You are an AI business analyst for SalesIQ, a batch-based inventory management system. 
Use the provided JSON data which includes product details, sales, batch information, and disposal records.
Pay special attention to:
- Batch expiry statuses (Critical Expiry ≤7 days, Near Expiry ≤30 days, Upcoming Expiry ≤90 days)
- Expired batches that cannot be sold
- Near-expiry batches that need discounting or priority selling
- Disposal reasons and quantities (Expired, Damaged, Recalled, Lost, Returned)
- FEFO (First Expired First Out) selling logic

If data is empty, say what data is needed. Provide concise practical advice with specific batch numbers where relevant.

DATA:
${context}

QUESTION:
${question}`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error?.message || "Gemini request failed");
    $("#aiAnswer").textContent =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No answer returned.";
  } catch (err) {
    $("#aiAnswer").textContent =
      `AI error: ${err.message}\n\nCheck API key, API restrictions, billing/API enablement, and browser console.`;
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
}
$("#askAiBtn").onclick = (e) =>
  askGemini(
    $("#aiQuestion").value.trim() || "Give me a business summary with batch insights.",
    e.currentTarget,
  );
document.querySelectorAll("[data-ai-question]").forEach(
  (b) =>
    (b.onclick = () => {
      const type = b.dataset.aiQuestion;
      const q =
        type === "summary"
          ? "Give AI sales summary, batch inventory analysis, expiry risk assessment, and disposal loss analysis."
          : type === "restock"
            ? "Which products should I restock first and why? Consider batch expiry and FEFO selling."
            : type === "expiry"
              ? "Which batches are expiring soon and what actions should I take (discount, prioritize, dispose)?"
              : type === "loss"
                ? "Analyze my expiry losses and disposal data. How can I reduce waste?"
                : "Give profit improvement tips based on price, cost, sales, and batch margins.";
      $("#aiQuestion").value = q;
      askGemini(q, b);
    }),
);