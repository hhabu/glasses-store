import mockUsers from "../data/mockUsers";

export const USERS_KEY = "admin_users";
export const SESSION_USER_KEY = "user";

function normalizeUser(user) {
  return {
    ...user,
    status: user.status || "ACTIVE",
  };
}

export function seedUsers() {
  const seededUsers = mockUsers.map(normalizeUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(seededUsers));
  return seededUsers;
}

export function readUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(USERS_KEY));
    if (Array.isArray(stored) && stored.length > 0) {
      return stored.map(normalizeUser);
    }
  } catch {
    // Fall through to seed data
  }

  return seedUsers();
}

export function saveUsers(users) {
  const normalizedUsers = Array.isArray(users) ? users.map(normalizeUser) : [];
  localStorage.setItem(USERS_KEY, JSON.stringify(normalizedUsers));
  return normalizedUsers;
}

export function loginWithCredentials(username, password) {
  const users = readUsers();
  const user = users.find(
    (u) => u.username === username.trim() && u.password === password
  );

  if (!user) {
    return { ok: false, message: "Invalid username or password" };
  }

  if (user.status === "BLOCKED") {
    return { ok: false, message: "Your account is blocked" };
  }

  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  return { ok: true, user };
}
