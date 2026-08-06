import {
  requireAuth,
  initAppShell,
  $,
  toast,
  applyTheme,
} from "../../js/shared.js";
import {
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  auth,
  updatePassword,
} from "../../js/firebase-config.js";
const { profile } = await requireAuth(["Admin"]);
initAppShell("admin", "settings", profile);
const ref = doc(db, "businessSettings", profile.id);
try {
  const snap = await getDoc(ref);
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
