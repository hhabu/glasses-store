import { getOrderWorkflow } from "../utils/orderWorkflow";

const API_BASE_URL = (import.meta.env.VITE_ORDER_API_URL || "").trim();

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_ORDER_API_URL. Add it to .env (or .env.local).");
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

function normalizeItems(rawItems) {
  if (Array.isArray(rawItems)) {
    return rawItems;
  }

  if (typeof rawItems === "string" && rawItems.trim()) {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapApiOrderToView(order) {
  const rawItems = normalizeItems(order?.item ?? order?.items);
  const items = rawItems.map((item, index) => {
    const quantity = Math.max(1, toNumber(item?.quantity, 1));
    const unitPrice = toNumber(item?.unit_price ?? item?.price, 0);

    return {
      id:
        item?.id ??
        item?.item_id ??
        item?.product_id ??
        `${order?.id || "order"}-item-${index + 1}`,
      productId: item?.product_id ?? "",
      frameId: item?.frame_id ?? item?.frameId ?? "",
      lensId: item?.lens_id ?? item?.lensId ?? "",
      name: item?.name ?? "Item",
      quantity,
      price: unitPrice,
      lineTotal: toNumber(item?.line_total, unitPrice * quantity),
      brand: item?.brand ?? "",
      color: item?.color ?? "",
      prescription: item?.prescription ?? null,
      eyeProfileId: item?.eye_profile_id ?? item?.eyeProfileId ?? "",
      lensName: item?.lens_name ?? item?.lensName ?? "",
      eyeProfileName: item?.eye_profile_name ?? item?.eyeProfileName ?? "",
      eyeProfileSummary:
        item?.eye_profile_summary ?? item?.eyeProfileSummary ?? "",
    };
  });

  const totalFromItems = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return {
    id: String(order?.id ?? ""),
    orderCode: order?.order_code || `ORD-${order?.id ?? ""}`,
    createdAt: order?.createdAt ?? "",
    updatedAt: order?.updatedAt ?? "",
    paidAt: order?.paidAt ?? "",
    status: order?.status ?? "",
    payment: {
      method: order?.payment_method ?? "",
      status: order?.payment_status ?? "",
    },
    customer: {
      id: order?.account_id ?? "",
      fullName: order?.shipping_name ?? "",
      phone: order?.shipping_phone ?? "",
      address: order?.shipping_address ?? "",
      note: order?.note ?? "",
    },
    items,
    totalPrice: toNumber(order?.total_price, totalFromItems),
    workflow: getOrderWorkflow({
      ...order,
      items,
      status: order?.status ?? "",
      customer: {
        note: order?.note ?? "",
      },
      payment: {
        method: order?.payment_method ?? "",
        status: order?.payment_status ?? "",
      },
      raw: order ?? {},
    }),
    raw: order ?? {},
  };
}

export async function fetchOrdersByAccount(accountId) {
  if (accountId === undefined || accountId === null || accountId === "") {
    throw new Error("fetchOrdersByAccount requires a valid accountId.");
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

export async function fetchOrders() {
  const baseUrl = getApiBaseUrl();
  const data = await requestJson(baseUrl);
  return Array.isArray(data) ? data : [];
}

export async function fetchOrderById(id) {
  if (id === undefined || id === null || id === "") {
    throw new Error("fetchOrderById requires a valid id.");
  }

  const baseUrl = getApiBaseUrl();
  return requestJson(`${baseUrl}/${id}`);
}

export async function createOrder(payload) {
  const baseUrl = getApiBaseUrl();
  return requestJson(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

export async function updateOrder(id, payload) {
  if (id === undefined || id === null || id === "") {
    throw new Error("updateOrder requires a valid id.");
  }

  const baseUrl = getApiBaseUrl();
  return requestJson(`${baseUrl}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}
