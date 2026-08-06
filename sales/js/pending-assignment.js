import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  auth,
  db,
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  serverTimestamp,
  signOut,
} from "../../js/firebase-config.js";

import {
  $,
  toast,
  setBusy,
  initSplash,
  initClickSpark,
  applyTheme,
} from "../../js/shared.js";

import { getAccountProfile } from "../../js/account.js";

initSplash();
initClickSpark();
applyTheme();

let currentUser = null;
let currentProfile = null;
let unsubProfile = null;
let redirected = false;
let pollTimer = null;
let reloadTimer = null;

function redirectToDashboard() {
  if (redirected) return;
  redirected = true;
  toast("You have been assigned! Redirecting...");
  setTimeout(() => { location.href = "dashboard.html"; }, 1200);
}

async function checkAssignment() {
  if (!currentUser || redirected) return;
  try {
    const snap = await getDoc(doc(db, "staff", currentUser.uid));
    if (snap.exists() && snap.data().assignedAdminId) {
      redirectToDashboard();
    }
  } catch (err) {
    console.warn("Assignment check failed:", err);
  }
}

function startAssignmentWatch() {
  if (pollTimer) clearInterval(pollTimer);
  if (reloadTimer) clearTimeout(reloadTimer);

  checkAssignment();
  pollTimer = setInterval(checkAssignment, 3000);

  reloadTimer = setTimeout(() => {
    if (!redirected) location.reload();
  }, 15000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !redirected) checkAssignment();
  });
}

function renderProfile(profile) {
  currentProfile = profile;
  $("#profileInfo").innerHTML = `
    <p class="text-sm"><b>Name:</b> ${profile.name || "-"}</p>
    <p class="text-sm"><b>Email:</b> ${profile.email || "-"}</p>
    <p class="text-sm"><b>Username:</b> ${profile.username || "Not set"}</p>
    <p class="text-sm"><b>Role:</b> ${profile.role || "-"}</p>
    <p class="text-sm"><b>Status:</b> <span class="badge badge-warn">Pending Assignment</span></p>
    <p class="text-sm"><b>Registered:</b> ${profile.createdAt ? new Date(profile.createdAt?.toDate ? profile.createdAt.toDate() : profile.createdAt).toLocaleDateString("en-IN") : "-"}</p>
  `;
  $("#profileName").value = profile.name || "";
  $("#profilePhoto").value = profile.photoURL || "";
}

async function loadProfile(user) {
  try {
    const profile = await getAccountProfile(user);
    if (profile) {
      renderProfile(profile);
    } else {
      $("#profileInfo").innerHTML = '<p class="text-red-400 text-sm">Profile not found.</p>';
    }
  } catch (err) {
    console.warn("Could not load profile:", err);
    toast("Could not load profile. Check Firestore rules.", "err");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "../login.html";
    return;
  }

  currentUser = user;
  await loadProfile(user);

  if (unsubProfile) unsubProfile();
  unsubProfile = onSnapshot(doc(db, "staff", user.uid), (snap) => {
    if (!snap.exists()) return;
    if (snap.data().assignedAdminId) redirectToDashboard();
  });

  startAssignmentWatch();
});

$("#profileForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const btn = e.submitter;
  setBusy(btn, true, "Saving...");

  try {
    const name = $("#profileName").value.trim();
    const photoURL = $("#profilePhoto").value.trim();

    if (!name) throw new Error("Name is required.");

    await updateDoc(doc(db, "staff", currentUser.uid), {
      name,
      photoURL,
      updatedAt: serverTimestamp(),
    });

    toast("Profile updated.");
    await loadProfile(currentUser);
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

$("#refreshBtn")?.addEventListener("click", () => {
  if (currentUser) loadProfile(currentUser);
});

$("#logoutBtn")?.addEventListener("click", async () => {
  if (unsubProfile) unsubProfile();
  if (pollTimer) clearInterval(pollTimer);
  await signOut(auth);
  location.href = "../login.html";
});