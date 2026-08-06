import {
  auth,
  db,
  googleProvider,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  collection,
  query,
  where,
  getDocs,
} from "./firebase-config.js";

import { $, toast, setBusy } from "./shared.js";
import {
  accountCollectionForRole,
  getAccountProfile,
  createAccountProfile,
  touchLastLogin,
} from "./account.js";

async function redirectByRole(user) {
  let data = {
    id: user.uid,
    role: "Sales Staff",
    status: "active",
    name: user.displayName || "User",
    email: user.email,
    accountCollection: "staff",
  };

  try {
    const profile = await getAccountProfile(user);

    if (profile) {
      data = profile;
      await touchLastLogin(profile);
    } else {
      data = await createAccountProfile(user, data);
    }
  } catch (err) {
    console.warn(
      "Could not read/write account profile. Check Firestore rules.",
      err,
    );
    toast(
      "Login worked, but Firestore profile could not be read. Publish firestore-rules.txt if redirect/data fails.",
      "err",
    );
  }

  if (data.status === "inactive") {
    toast("Your account is inactive. Contact admin.", "err");
    return;
  }

  // Unassigned staff → pending page (regardless of status)
  if (data.role === "Sales Staff" && !data.assignedAdminId) {
    location.href = "sales/pending-assignment.html";
    return;
  }

  location.href =
    data.role === "Sales Staff"
      ? "sales/dashboard.html"
      : "admin/dashboard.html";
}

$("#loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = e.submitter;
  setBusy(btn, true, "Logging in...");

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      $("#loginEmail").value.trim(),
      $("#loginPassword").value,
    );

    await redirectByRole(cred.user);
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

$("#registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = e.submitter;
  setBusy(btn, true, "Creating...");

  try {
    const name = $("#regName").value.trim();
    const email = $("#regEmail").value.trim();
    const password = $("#regPassword").value;
    const role = $("#regRole").value;
    const username = $("#regUsername")?.value?.trim().toLowerCase() || "";
    const accountCollection = accountCollectionForRole(role);

    if (role === "Sales Staff") {
      if (!username) {
        toast("Username is required for staff.", "err");
        setBusy(btn, false);
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        toast("Username can only contain letters, numbers, and underscores.", "err");
        setBusy(btn, false);
        return;
      }

      const staffRef = collection(db, "staff");
      const q = query(staffRef, where("username", "==", username));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast("Username already taken. Choose another username.", "err");
        setBusy(btn, false);
        return;
      }
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    const isSelfReg = role === "Sales Staff";
    const isAdmin = role === "Admin";

    await setDoc(doc(db, accountCollection, cred.user.uid), {
      name,
      email,
      username: isSelfReg ? username : "",
      role,
      status: isSelfReg ? "pending_assignment" : "active",
      assignedAdminId: null,
      adminId: isAdmin ? cred.user.uid : null,
      adminName: isAdmin ? name : null,
      assignedAt: null,
      photoURL: "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });

    await redirectByRole(cred.user);
  } catch (err) {
    toast(err.message, "err");
  } finally {
    setBusy(btn, false);
  }
});

async function googleFlow(roleFromSelect = false) {
  try {
    const cred = await signInWithPopup(auth, googleProvider);

    try {
      const existingProfile = await getAccountProfile(cred.user);

      let selectedRole = "Sales Staff";

      if (roleFromSelect) {
        selectedRole = $("#regRole")?.value || "Sales Staff";
      } else if (existingProfile?.role) {
        selectedRole = existingProfile.role;
      }

      const newCollection = accountCollectionForRole(selectedRole);
      const oldCollection = existingProfile?.accountCollection;

      const isNewStaff = !existingProfile && selectedRole === "Sales Staff";
      const isAdmin = selectedRole === "Admin";

      const accountData = {
        name: existingProfile?.name || cred.user.displayName || "Google User",
        email: existingProfile?.email || cred.user.email || "",
        role: selectedRole,
        status: isNewStaff ? "pending_assignment" : (existingProfile?.status || "active"),
        assignedAdminId: existingProfile?.assignedAdminId || null,
        adminId: isAdmin ? cred.user.uid : (existingProfile?.adminId || null),
        adminName: isAdmin ? (existingProfile?.name || cred.user.displayName || "Google User") : (existingProfile?.adminName || null),
        assignedAt: existingProfile?.assignedAt || null,
        photoURL: cred.user.photoURL || existingProfile?.photoURL || "",
        createdAt: existingProfile?.createdAt || serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      await setDoc(doc(db, newCollection, cred.user.uid), accountData, {
        merge: true,
      });

      if (oldCollection && oldCollection !== newCollection) {
        await deleteDoc(doc(db, oldCollection, cred.user.uid));
      }
    } catch (err) {
      console.warn("Google profile save/read failed:", err);
      toast(
        "Google login worked, but profile save failed. Check Firestore rules.",
        "err",
      );
    }

    await redirectByRole(cred.user);
  } catch (err) {
    toast(err.message, "err");
  }
}

$("#googleLogin")?.addEventListener("click", () => googleFlow(false));
$("#googleRegister")?.addEventListener("click", () => googleFlow(true));

$("#forgotPassword")?.addEventListener("click", async () => {
  const email = prompt("Enter your email for password reset:");
  if (!email) return;

  try {
    await sendPasswordResetEmail(auth, email.trim());
    toast("Password reset email sent.");
  } catch (err) {
    toast(err.message, "err");
  }
});

if (new URLSearchParams(location.search).get("inactive")) {
  toast("Your account is inactive. Contact admin.", "err");
}
