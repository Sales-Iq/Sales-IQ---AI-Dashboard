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

export async function getAccountProfile(user) {
  if (!user) return null;

  const adminSnap = await getDoc(doc(db, "admins", user.uid));
  if (adminSnap.exists()) {
    return {
      id: user.uid,
      accountCollection: "admins",
      ...adminSnap.data(),
    };
  }

  const staffSnap = await getDoc(doc(db, "staff", user.uid));
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
  const isStaff = role === "Sales Staff";

  const payload = {
    name: data.name || user?.displayName || "User",
    email: data.email || user?.email || "",
    role,
    status: data.status || (isStaff ? "pending_assignment" : "active"),
    assignedAdminId: isStaff ? (data.assignedAdminId ?? null) : user.uid,
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
