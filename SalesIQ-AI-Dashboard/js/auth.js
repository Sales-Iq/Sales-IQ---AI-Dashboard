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
} from "./firebase-config.js";

import { $, toast, setBusy } from "./shared.js";
import {
  accountCollectionForRole,
  getAccountProfile,
  createAccountProfile,
  touchLastLogin,
  isSuperAdmin,
  SUPER_ADMIN_EMAIL,
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
      // Super Admin has no Firestore document — skip the lastLogin write.
      if (profile.accountCollection !== "superadmin") {
        await touchLastLogin(profile);
      }
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

  location.href =
    data.role === "Super Admin"
      ? "superadmin/dashboard.html"
      : data.role === "Sales Staff"
        ? "sales/dashboard.html"
        : "admin/dashboard.html";
}

$("#loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = e.submitter;
  setBusy(btn, true, "Logging in...");

  try {
    const email    = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (loginErr) {
      // Firebase v10+ returns auth/invalid-credential for both "user not found"
      // and "wrong password". For the Super Admin we attempt auto-creation.
      const isBadCred =
        loginErr.code === "auth/user-not-found" ||
        loginErr.code === "auth/invalid-credential";

      if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && isBadCred) {
        try {
          // Try creating the account (first ever login).
          cred = await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr) {
          if (createErr.code === "auth/email-already-in-use") {
            // Account already exists (was auto-created before).
            // The sign-in failed because of a transient issue — retry once.
            cred = await signInWithEmailAndPassword(auth, email, password);
          } else {
            throw createErr;
          }
        }
      } else {
        throw loginErr;
      }
    }

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

    // Block Super Admin email from being registered.
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      toast("This email is reserved and cannot be registered.", "err");
      return;
    }

    const accountCollection = accountCollectionForRole(role);

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, accountCollection, cred.user.uid), {
      name,
      email,
      role,
      status: "active",
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

      const accountData = {
        name: existingProfile?.name || cred.user.displayName || "Google User",
        email: existingProfile?.email || cred.user.email || "",
        role: selectedRole,
        status: existingProfile?.status || "active",
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
