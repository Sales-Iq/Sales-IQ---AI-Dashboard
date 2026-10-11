import {
  requireAuth,
  initAppShell,
  $,
  $$,
  toast,
  applyTheme,
  hideSkeletonLoader,
  money,
  getCachedCollection,
  invalidateCache,
} from "../../js/shared.js";
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "../../js/firebase-config.js";

const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "settings", profile);

const ref = doc(db, "businessSettings", profile.id);

// ── 1. Live Invoice & Logo Preview Handlers ────────────────────────────────
function updateLogoPreview(url) {
  const logoBoxImg = $("#logoPreviewImg");
  const logoFallback = $("#logoFallbackIcon");
  const invoiceLogoImg = $("#invoicePreviewLogoImg");
  const invoiceFallback = $("#invoicePreviewFallback");

  const cleanUrl = (url || "").trim();

  if (!cleanUrl) {
    if (logoBoxImg) logoBoxImg.classList.add("hidden");
    if (logoFallback) logoFallback.classList.remove("hidden");
    if (invoiceLogoImg) invoiceLogoImg.classList.add("hidden");
    if (invoiceFallback) invoiceFallback.classList.remove("hidden");
    return;
  }

  const testImg = new Image();
  testImg.onload = () => {
    if (logoBoxImg) {
      logoBoxImg.src = cleanUrl;
      logoBoxImg.classList.remove("hidden");
    }
    if (logoFallback) logoFallback.classList.add("hidden");

    if (invoiceLogoImg) {
      invoiceLogoImg.src = cleanUrl;
      invoiceLogoImg.classList.remove("hidden");
    }
    if (invoiceFallback) invoiceFallback.classList.add("hidden");
  };
  testImg.onerror = () => {
    if (logoBoxImg) logoBoxImg.classList.add("hidden");
    if (logoFallback) logoFallback.classList.remove("hidden");
    if (invoiceLogoImg) invoiceLogoImg.classList.add("hidden");
    if (invoiceFallback) invoiceFallback.classList.remove("hidden");
  };
  testImg.src = cleanUrl;
}

function updateLiveInvoicePreview() {
  const name = $("#businessName")?.value.trim() || "SalesIQ Store";
  const currency = $("#currency")?.value || "₹";
  const tax = Number($("#taxPercent")?.value || 0);
  const prefix = ($("#invoicePrefix")?.value.trim() || "SIQ").toUpperCase();

  const bizEl = $("#invoicePreviewBizName");
  if (bizEl) bizEl.textContent = name;

  const numEl = $("#invoicePreviewSampleNumber");
  if (numEl) numEl.textContent = `${prefix}-74892011`;

  const subtotal = 1200;
  const taxAmount = (subtotal * tax) / 100;
  const grandTotal = subtotal + taxAmount;

  const subtotalEl = $("#invoicePreviewSampleSubtotal");
  if (subtotalEl) {
    subtotalEl.textContent = money(subtotal, currency);
  }

  const taxLabelEl = $("#invoicePreviewTaxLabel");
  if (taxLabelEl) {
    taxLabelEl.textContent = `Tax (${tax}%)`;
  }

  const taxEl = $("#invoicePreviewSampleTax");
  if (taxEl) {
    taxEl.textContent = money(taxAmount, currency);
  }

  const totalEl = $("#invoicePreviewSampleTotal");
  if (totalEl) {
    totalEl.textContent = money(grandTotal, currency);
  }
}

// ── 2. Populate Form ───────────────────────────────────────────────────────
function applySettingsToForm(s) {
  if (!s) return;
  if ($("#businessName")) $("#businessName").value = s.businessName || "";
  if ($("#businessLogo")) $("#businessLogo").value = s.logoUrl || "";
  if ($("#currency")) $("#currency").value = s.currency || "₹";
  if ($("#taxPercent")) $("#taxPercent").value = s.taxPercent || 0;
  if ($("#invoicePrefix")) $("#invoicePrefix").value = s.invoicePrefix || "SIQ";
  if ($("#themeMode")) {
    $("#themeMode").value =
      s.theme || localStorage.getItem("salesiq_theme") || "dark";
  }

  updateLogoPreview(s.logoUrl);
  updateLiveInvoicePreview();
}

// ── 3. 0ms Instant Cached Boot ─────────────────────────────────────────────
try {
  const cachedSettings = JSON.parse(
    localStorage.getItem(`salesiq_business_settings_${profile.id}`) || "null",
  );
  if (cachedSettings) {
    applySettingsToForm(cachedSettings);
    hideSkeletonLoader();
  }
} catch (_) {}

// ── 4. Network Fetch from Firestore ────────────────────────────────────────
try {
  let snap = await getDoc(ref);
  if (!snap.exists()) {
    snap = await getDoc(doc(db, "businessSettings", "main"));
  }
  if (snap.exists()) {
    const s = snap.data();
    applySettingsToForm(s);

    // Save mirror keys to localStorage so entire application has instant access
    localStorage.setItem(
      `salesiq_business_settings_${profile.id}`,
      JSON.stringify(s),
    );
    if (s.businessName) localStorage.setItem("salesiq_business_name", s.businessName);
    if (s.logoUrl) localStorage.setItem("salesiq_business_logo", s.logoUrl);
    if (s.currency) localStorage.setItem("salesiq_currency", s.currency);
    if (s.taxPercent !== undefined) localStorage.setItem("salesiq_tax_percent", s.taxPercent);
    if (s.invoicePrefix) localStorage.setItem("salesiq_invoice_prefix", s.invoicePrefix);
  }
} catch (err) {
  console.warn("Settings read failed:", err);
  toast("Could not read business settings. Check Firestore rules.", "err");
} finally {
  hideSkeletonLoader();
}

// ── 5. Save Business Settings ──────────────────────────────────────────────
$("#businessSettingsForm").onsubmit = async (e) => {
  e.preventDefault();
  const btn = $("#saveBusinessSettingsBtn");
  if (btn) btn.disabled = true;

  const data = {
    businessName: $("#businessName").value.trim(),
    logoUrl: $("#businessLogo").value.trim(),
    currency: $("#currency").value,
    taxPercent: Number($("#taxPercent").value || 0),
    invoicePrefix: ($("#invoicePrefix").value.trim() || "SIQ").toUpperCase(),
    theme: $("#themeMode").value,
    adminId: profile.id,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, data, { merge: true });

    // Store in localStorage for instant offline access in billing, invoices & reports
    localStorage.setItem(`salesiq_business_settings_${profile.id}`, JSON.stringify(data));
    localStorage.setItem("salesiq_business_name", data.businessName);
    localStorage.setItem("salesiq_business_logo", data.logoUrl);
    localStorage.setItem("salesiq_currency", data.currency);
    localStorage.setItem("salesiq_tax_percent", data.taxPercent);
    localStorage.setItem("salesiq_invoice_prefix", data.invoicePrefix);

    window.dispatchEvent(
      new CustomEvent("salesiq:currency-changed", {
        detail: { currency: data.currency },
      }),
    );

    applyTheme(data.theme);
    updateLiveInvoicePreview();

    toast("Business settings saved successfully.", "ok");
  } catch (err) {
    console.error("Save settings error:", err);
    toast(err.message, "err");
  } finally {
    if (btn) btn.disabled = false;
  }
};

// ── 6. Live Interactive Form Listeners ─────────────────────────────────────
const logoInput = $("#businessLogo");
if (logoInput) {
  logoInput.addEventListener("input", (e) => {
    updateLogoPreview(e.target.value);
  });
}

["businessName", "currency", "taxPercent", "invoicePrefix"].forEach((id) => {
  const el = $("#" + id);
  if (el) {
    el.addEventListener("input", updateLiveInvoicePreview);
    el.addEventListener("change", updateLiveInvoicePreview);
  }
});

const themeSelect = $("#themeMode");
if (themeSelect) {
  themeSelect.addEventListener("change", (e) => {
    applyTheme(e.target.value);
  });
}

// ── 7. Profile Section Handlers ────────────────────────────────────────────
function initProfileSection() {
  const storedUser = JSON.parse(localStorage.getItem("salesiq_user") || "null");
  const currentName = storedUser?.name || profile?.name || "Admin";
  const currentEmail = storedUser?.email || profile?.email || "admin@salesiq.app";
  const tenantId = profile?.id || "";

  const nameEl = $("#profileDisplayName");
  if (nameEl) nameEl.textContent = currentName;

  const emailEl = $("#profileEmail");
  if (emailEl) emailEl.textContent = currentEmail;

  const tenantInput = $("#adminTenantId");
  if (tenantInput) tenantInput.value = tenantId;

  const nameInput = $("#adminDisplayNameInput");
  if (nameInput) nameInput.value = currentName;

  const avatar = $("#profileAvatar");
  if (avatar) {
    const initial = (currentName.trim()[0] || "A").toUpperCase();
    avatar.textContent = initial;
  }

  // Copy Tenant ID
  const copyBtn = $("#copyTenantIdBtn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      if (!tenantId) return;
      navigator.clipboard.writeText(tenantId).then(
        () => toast("Store ID copied to clipboard!", "ok"),
        () => toast("Could not copy ID automatically.", "warn"),
      );
    };
  }

  // Update Display Name
  const saveNameBtn = $("#saveProfileNameBtn");
  if (saveNameBtn && nameInput) {
    saveNameBtn.onclick = async () => {
      const newName = nameInput.value.trim();
      if (!newName) {
        toast("Please enter a valid name.", "warn");
        return;
      }
      saveNameBtn.disabled = true;
      try {
        await updateDoc(doc(db, "admins", profile.id), {
          name: newName,
          updatedAt: serverTimestamp(),
        });

        // Update local session
        if (storedUser) {
          storedUser.name = newName;
          localStorage.setItem("salesiq_user", JSON.stringify(storedUser));
        }
        if (profile) profile.name = newName;

        if (nameEl) nameEl.textContent = newName;
        if (avatar) avatar.textContent = newName[0].toUpperCase();

        toast("Profile name updated.", "ok");
      } catch (err) {
        console.error("Profile update error:", err);
        toast("Failed to update profile: " + err.message, "err");
      } finally {
        saveNameBtn.disabled = false;
      }
    };
  }
}

initProfileSection();

// ── 8. System Storage Diagnostics & Cache Reset ────────────────────────────
function updateStorageDiagnostics() {
  try {
    const cachedP = getCachedCollection(`salesiq_cache_products_${profile.id}_false`);
    const cachedS =
      getCachedCollection(`salesiq_cache_sales_${profile.id}_true`) ||
      getCachedCollection(`salesiq_cache_sales_${profile.id}_false`);
    const cachedC = getCachedCollection(`salesiq_cache_customers_${profile.id}_false`);

    const pCount = cachedP?.data?.length || 0;
    const sCount = cachedS?.data?.length || 0;
    const cCount = cachedC?.data?.length || 0;

    const pEl = $("#cacheProductCount");
    if (pEl) pEl.textContent = pCount;

    const sEl = $("#cacheSaleCount");
    if (sEl) sEl.textContent = sCount;

    const cEl = $("#cacheCustCount");
    if (cEl) cEl.textContent = cCount;
  } catch (_) {}
}

updateStorageDiagnostics();

const clearCacheBtn = $("#clearLocalCacheBtn");
if (clearCacheBtn) {
  clearCacheBtn.onclick = () => {
    if (
      !confirm(
        "Clear all browser cache (IndexedDB and memory) and perform a hard data refresh from Firestore?",
      )
    ) {
      return;
    }

    try {
      invalidateCache();
      localStorage.removeItem(`salesiq_business_settings_${profile.id}`);
      toast("Cache cleared. Refreshing...", "ok");
      setTimeout(() => location.reload(), 300);
    } catch (err) {
      toast("Error clearing cache: " + err.message, "err");
    }
  };
}
