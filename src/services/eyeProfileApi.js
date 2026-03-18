const API_BASE_URL = (import.meta.env.VITE_EYE_PROFILE_API_URL || "").trim();

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_EYE_PROFILE_API_URL. Add it to .env (or .env.local).");
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

export async function fetchEyeProfilesByAccount(accountId) {
  if (accountId === undefined || accountId === null || accountId === "") {
    throw new Error("fetchEyeProfilesByAccount requires a valid accountId.");
  }

  const normalizedAccountId = String(accountId);
  const baseUrl = getApiBaseUrl();
  const data = await requestJson(
    `${baseUrl}?account_id=${encodeURIComponent(normalizedAccountId)}`
  );
  const list = Array.isArray(data) ? data : [];

  return list.filter(
    (item) => String(item?.account_id ?? "") === normalizedAccountId
  );
}

export async function createEyeProfile(payload) {
  const baseUrl = getApiBaseUrl();
  return requestJson(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

export async function deleteEyeProfile(id) {
  if (id === undefined || id === null || id === "") {
    throw new Error("deleteEyeProfile requires a valid id.");
  }

  const baseUrl = getApiBaseUrl();
  return requestJson(`${baseUrl}/${id}`, {
    method: "DELETE",
  });
}
