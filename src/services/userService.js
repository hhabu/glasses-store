import { createAccount, fetchAccounts, updateAccount } from "./accountApi";

function sanitizePayload(payload) {
  const result = { ...(payload || {}) };
  Object.keys(result).forEach((key) => {
    const value = result[key];
    if (value === undefined || value === null || value === "") {
      delete result[key];
    }
  });
  return result;
}

function buildExplicitBlankFields() {
  return {
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "",
    avatar: "",
  };
}

export async function readUsers() {
  const users = await fetchAccounts();
  return Array.isArray(users) ? users : [];
}

export async function createUser(user) {
  const payload = { ...buildExplicitBlankFields(), ...(user || {}) };
  const created = await createAccount(payload);
  return created;
}

export async function updateUser(user) {
  const payload = { ...buildExplicitBlankFields(), ...(user || {}) };
  const updated = await updateAccount(user.id, payload);
  return updated;
}


export async function loginWithCredentials(username, password) {
  const users = await readUsers();
  const user = users.find(
    (u) => u.username === username.trim() && u.password === password
  );

  if (!user) {
    return { ok: false, message: "Invalid username or password" };
  }

  const status = user.status || "ACTIVE";
  if (status === "BLOCKED") {
    return { ok: false, message: "Your account is blocked" };
  }

  return { ok: true, user };
}

export async function registerCustomer({ username, password }) {
  const trimmedUsername = username?.trim() || "";
  const trimmedPassword = password?.trim() || "";

  if (!trimmedUsername || !trimmedPassword) {
    return { ok: false, message: "Username and password are required" };
  }

  const users = await readUsers();
  const exists = users.some(
    (u) => u.username?.toLowerCase() === trimmedUsername.toLowerCase()
  );

  if (exists) {
    return { ok: false, message: "Username already exists" };
  }

  const newUser = {
    ...buildExplicitBlankFields(),
    username: trimmedUsername,
    password: trimmedPassword,
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const created = await createAccount(newUser);
  return { ok: true, user: created };
}
