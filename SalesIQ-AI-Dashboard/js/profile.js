import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  updateProfile,
  signOut,
} from "./firebase-config.js";

import { $, toast, applyTheme, getTheme } from "./shared.js";
import { getAccountProfile, accountCollectionForRole } from "./account.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

let currentProfile = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  currentProfile = {
    id: user.uid,
    name: user.displayName || "User",
    email: user.email,
    role: "Sales Staff",
    accountCollection: "staff",
    photoURL: user.photoURL || "",
  };

  try {
    const profile = await getAccountProfile(user);
    if (profile) currentProfile = { id: user.uid, ...profile };
  } catch (err) {
    console.warn("Profile read failed:", err);
    toast("Could not read Firestore profile. Check rules.", "err");
  }

  $("#profileName").value = currentProfile.name || "";
  $("#profileEmail").value = currentProfile.email || user.email;
  $("#profilePhoto").value = currentProfile.photoURL || user.photoURL || "";
  $("#profileNameTitle").textContent = currentProfile.name || "User";
  $("#profileRole").textContent = currentProfile.role || "Sales Staff";
  $("#profileImagePreview").src =
    currentProfile.photoURL ||
    user.photoURL ||
    `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(currentProfile.name || "User")}`;
});

$("#profileForm").onsubmit = async (e) => {
  e.preventDefault();

  const name = $("#profileName").value.trim();
  const photoURL = $("#profilePhoto").value.trim();
  const accountCollection =
    currentProfile?.accountCollection ||
    accountCollectionForRole(currentProfile?.role);

  try {
    await setDoc(
      doc(db, accountCollection, auth.currentUser.uid),
      {
        name,
        photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await updateProfile(auth.currentUser, {
      displayName: name,
      photoURL,
    }).catch(() => {});
    toast("Profile updated.");
  } catch (err) {
    toast(err.message, "err");
  }
};

$("#profileBack").onclick = () => {
  location.href =
    currentProfile?.role === "Sales Staff"
      ? "sales/dashboard.html"
      : "admin/dashboard.html";
};

$("#profileTheme").onclick = () => {
  applyTheme(getTheme() === "light" ? "dark" : "light");
};

$("#profileLogout").onclick = async () => {
  await signOut(auth);
  location.href = "login.html";
};
