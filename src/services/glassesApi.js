const API_BASE_URL = (import.meta.env.VITE_API_URL || "").trim();

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_API_URL. Add it to .env (or .env.local).");
  }

  return API_BASE_URL.replace(/\/+$/, "");
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const responseBody = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message = `API request failed: ${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = responseBody;
    throw error;
  }
  return responseBody;
}

function getCandidateIds(primaryId, payload) {
  const values = [primaryId, payload?.id, payload?.product_id];
  const ids = values
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map((value) => String(value));
  return [...new Set(ids)];
}

export async function fetchGlasses() {
  const baseUrl = getApiBaseUrl();
  return requestJson(baseUrl);
}

export async function createGlasses(payload) {
  const baseUrl = getApiBaseUrl();
  return requestJson(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

export async function updateGlasses(id, payload) {
  const baseUrl = getApiBaseUrl();
  const candidateIds = getCandidateIds(id, payload);
  if (candidateIds.length === 0) {
    throw new Error("updateGlasses requires a valid id.");
  }

  let lastError = null;
  for (const candidateId of candidateIds) {
    try {
      return await requestJson(`${baseUrl}/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });
    } catch (error) {
      lastError = error;
      if (error?.status !== 404) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error("Failed to update glasses.");
}

export async function deleteGlasses(id) {
  const baseUrl = getApiBaseUrl();
  if (id === undefined || id === null || id === "") {
    throw new Error("deleteGlasses requires a valid id.");
  }
  return requestJson(`${baseUrl}/${id}`, {
    method: "DELETE",
  });
}
