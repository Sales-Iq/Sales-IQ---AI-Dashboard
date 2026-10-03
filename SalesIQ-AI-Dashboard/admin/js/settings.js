import {
  requireAuth,
  initAppShell,
  $,
  toast,
  applyTheme,
  hideSkeletonLoader,
} from "../../js/shared.js";
import {
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  auth,
  updatePassword,
  GEMINI_API_KEY,
} from "../../js/firebase-config.js";
import { clearGeminiQuotaCooldowns } from "../../js/gemini-service.js";
const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "settings", profile);
const ref = doc(db, "businessSettings", profile.id);
try {
  let snap = await getDoc(ref);
  if (!snap.exists()) {
    snap = await getDoc(doc(db, "businessSettings", "main"));
  }
  if (snap.exists()) {
    const s = snap.data();
    $("#businessName").value = s.businessName || "";
    $("#businessLogo").value = s.logoUrl || "";
    $("#currency").value = s.currency || "₹";
    $("#taxPercent").value = s.taxPercent || 0;
    $("#invoicePrefix").value = s.invoicePrefix || "SIQ";
    $("#themeMode").value =
      s.theme || localStorage.getItem("salesiq_theme") || "dark";
  }
} catch (err) {
  console.warn("Settings read failed:", err);
  toast("Could not read business settings. Check Firestore rules.", "err");
} finally {
  hideSkeletonLoader();
}
$("#businessSettingsForm").onsubmit = async (e) => {
  e.preventDefault();
  const data = {
    businessName: $("#businessName").value.trim(),
    logoUrl: $("#businessLogo").value.trim(),
    currency: $("#currency").value,
    taxPercent: Number($("#taxPercent").value || 0),
    invoicePrefix: $("#invoicePrefix").value.trim() || "SIQ",
    theme: $("#themeMode").value,
    adminId: profile.id,
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(ref, data, { merge: true });
    localStorage.setItem("salesiq_currency", data.currency);
    applyTheme(data.theme);
    toast("Settings saved.");
  } catch (err) {
    toast(err.message, "err");
  }
};
$("#passwordForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await updatePassword(auth.currentUser, $("#newPassword").value);
    toast("Password changed.");
    e.target.reset();
  } catch (err) {
    toast(err.message, "err");
  }
};

// --- Gemini AI Configuration ---

const geminiKeyInput = $("#geminiApiKey");
const geminiStatusEl = $("#geminiKeyStatus");
const currentStoredKey =
  localStorage.getItem("salesiq_gemini_api_key") || GEMINI_API_KEY || "";

if (geminiKeyInput) {
  geminiKeyInput.value = currentStoredKey;
  if (currentStoredKey) {
    geminiStatusEl.innerHTML = `<span class="text-emerald-400">● Active (${currentStoredKey.substring(0, 6)}...${currentStoredKey.slice(-4)})</span>`;
  } else {
    geminiStatusEl.innerHTML = `<span class="text-amber-400">○ No Key Configured</span>`;
  }
}

// Toggle key visibility
const toggleKeyBtn = $("#toggleGeminiKeyVis");
if (toggleKeyBtn && geminiKeyInput) {
  toggleKeyBtn.onclick = () => {
    geminiKeyInput.type =
      geminiKeyInput.type === "password" ? "text" : "password";
  };
}

// Save Key
const aiForm = $("#aiSettingsForm");
if (aiForm) {
  aiForm.onsubmit = (e) => {
    e.preventDefault();
    const newKey = geminiKeyInput.value.trim();
    if (newKey) {
      localStorage.setItem("salesiq_gemini_api_key", newKey);
      geminiStatusEl.innerHTML = `<span class="text-emerald-400">● Saved (${newKey.substring(0, 6)}...${newKey.slice(-4)})</span>`;
      toast("Gemini API Key saved successfully.");
    } else {
      localStorage.removeItem("salesiq_gemini_api_key");
      geminiStatusEl.innerHTML = `<span class="text-amber-400">○ Reverted to default</span>`;
      toast("Custom key cleared; using default configuration.", "info");
    }
    clearGeminiQuotaCooldowns();
  };
}

// Test Connection
const testKeyBtn = $("#testGeminiKeyBtn");
if (testKeyBtn) {
  testKeyBtn.onclick = async () => {
    const keyToTest = geminiKeyInput.value.trim() || GEMINI_API_KEY;
    if (!keyToTest) {
      toast("Please enter an API Key to test.", "warn");
      return;
    }

    testKeyBtn.disabled = true;
    const origText = testKeyBtn.textContent;
    testKeyBtn.textContent = "⏳ Testing...";

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(keyToTest)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping test" }] }],
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast(
          "Connection verified! Gemini 3.5 is active and ready.",
          "success",
        );
        geminiStatusEl.innerHTML = `<span class="text-emerald-400">✓ Connected (HTTP 200)</span>`;
      } else {
        const msg = data.error?.message || `HTTP ${res.status}`;
        toast(`Test failed (${res.status}): ${msg}`, "err");
        geminiStatusEl.innerHTML = `<span class="text-rose-400">✕ Error: HTTP ${res.status}</span>`;
      }
    } catch (netErr) {
      toast(`Network error: ${netErr.message}`, "err");
      geminiStatusEl.innerHTML = `<span class="text-rose-400">✕ Connection failed</span>`;
    } finally {
      testKeyBtn.disabled = false;
      testKeyBtn.textContent = origText;
    }
  };
}

// Reset Quota Cache
const clearCooldownBtn = $("#clearAiCooldownBtn");
if (clearCooldownBtn) {
  clearCooldownBtn.onclick = () => {
    clearGeminiQuotaCooldowns();
    toast("Quota rate-limit cache reset.", "info");
  };
}
