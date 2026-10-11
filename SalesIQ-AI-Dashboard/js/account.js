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

const _profileCache = new Map();

export function invalidateAccountProfileCache(uid = null) {
  if (uid) {
    _profileCache.delete(uid);
    try {
      sessionStorage.removeItem(`salesiq_prof_${uid}`);
      localStorage.removeItem(`salesiq_prof_${uid}`);
    } catch (_) {}
  } else {
    _profileCache.clear();
  }
}

export async function getAccountProfile(user, bypassCache = false) {
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

  const cacheKey = `salesiq_prof_${user.uid}`;

  // 1. Instant 0ms memory & sessionStorage cache
  if (!bypassCache) {
    if (_profileCache.has(user.uid)) {
      return _profileCache.get(user.uid);
    }

    try {
      const raw =
        sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id === user.uid) {
          _profileCache.set(user.uid, parsed);
          // Revalidate in background without blocking
          queueMicrotask(() => {
            fetchLiveProfile(user)
              .then((fresh) => {
                if (fresh) {
                  _profileCache.set(user.uid, fresh);
                  try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(fresh));
                  } catch (_) {}
                }
              })
              .catch(() => {});
          });
          return parsed;
        }
      }
    } catch (_) {}
  }

  // 2. Fetch live profile
  const fresh = await fetchLiveProfile(user);
  if (fresh) {
    _profileCache.set(user.uid, fresh);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(fresh));
    } catch (_) {}
  }
  return fresh;
}

async function fetchLiveProfile(user) {
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

  const result = {
    id: user.uid,
    accountCollection,
    ...payload,
  };

  _profileCache.set(user.uid, result);
  try {
    sessionStorage.setItem(`salesiq_prof_${user.uid}`, JSON.stringify(result));
  } catch (_) {}

  return result;
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
