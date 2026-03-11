const API_BASE_URL = (import.meta.env.VITE_ACCOUNT_API_URL || "").trim();

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_ACCOUNT_API_URL. Add it to .env (or .env.local).");
  }

  return API_BASE_URL.replace(/\/+$/, "");
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = `API request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  return response.json();
}

export async function fetchAccounts() {
  const baseUrl = getApiBaseUrl();
  return requestJson(baseUrl);
}

export async function createAccount(payload) {
  const baseUrl = getApiBaseUrl();
  return requestJson(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

export async function updateAccount(id, payload) {
  const baseUrl = getApiBaseUrl();
  if (id === undefined || id === null || id === "") {
    throw new Error("updateAccount requires a valid id.");
  }
  return requestJson(`${baseUrl}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

export async function deleteAccount(id) {
  const baseUrl = getApiBaseUrl();
  if (id === undefined || id === null || id === "") {
    throw new Error("deleteAccount requires a valid id.");
  }
  return requestJson(`${baseUrl}/${id}`, {
    method: "DELETE",
  });
}
