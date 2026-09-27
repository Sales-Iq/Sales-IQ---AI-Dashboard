import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "./firebase-config.js";

export function accountCollectionForRole(role = "Sales Staff") {
  return role === "Sales Staff" ? "staff" : "admins";
}

export const SUPER_ADMIN_EMAIL = "Boss@gmail.com";

export function isSuperAdmin(user) {
  return (
    user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );
}

export async function getAccountProfile(user) {
  if (!user) return null;

  // Hardcoded Super Admin — no Firestore document required.
  if (isSuperAdmin(user)) {
    return {
      id: user.uid,
      accountCollection: "superadmin",
      role: "Super Admin",
      name: "Super Admin",
      email: user.email,
      status: "active",
      photoURL: user.photoURL || "",
    };
  }

  // Parallel reads: halves login latency vs sequential getDoc calls.
  const [adminSnap, staffSnap] = await Promise.all([
    getDoc(doc(db, "admins", user.uid)),
    getDoc(doc(db, "staff", user.uid)),
  ]);

  if (adminSnap.exists()) {
    return {
      id: user.uid,
      accountCollection: "admins",
      ...adminSnap.data(),
    };
  }

  if (staffSnap.exists()) {
    return {
      id: user.uid,
      accountCollection: "staff",
      ...staffSnap.data(),
    };
  }

  return null;
}

export async function createAccountProfile(user, data = {}) {
  const role = data.role || "Sales Staff";
  const accountCollection = accountCollectionForRole(role);

  const payload = {
    name: data.name || user?.displayName || "User",
    email: data.email || user?.email || "",
    role,
    status: data.status || "active",
    photoURL: data.photoURL || user?.photoURL || "",
    createdAt: data.createdAt || serverTimestamp(),
    lastLoginAt: data.lastLoginAt || serverTimestamp(),
    ...data,
  };

  await setDoc(doc(db, accountCollection, user.uid), payload, { merge: true });

  return {
    id: user.uid,
    accountCollection,
    ...payload,
  };
}

export async function touchLastLogin(profileOrUser) {
  if (!profileOrUser?.id) return;

  const accountCollection =
    profileOrUser.accountCollection ||
    accountCollectionForRole(profileOrUser.role);

  await updateDoc(doc(db, accountCollection, profileOrUser.id), {
    lastLoginAt: serverTimestamp(),
  });
}
