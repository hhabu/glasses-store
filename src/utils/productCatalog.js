import { normalizeProductPricing } from "./pricing";
import { createGlasses, deleteGlasses, fetchGlasses, updateGlasses } from "../services/glassesApi";

const ADMIN_PRODUCTS_KEY = "admin_products";
const SOURCE_CACHE_KEY = "source_products_cache";

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function ensureProductId(item) {
  if (!item || item.product_id !== undefined) {
    return item;
  }
  if (item.id === undefined) {
    return item;
  }
  return { ...item, product_id: item.id };
}

function getProductId(item) {
  const raw = item?.product_id ?? item?.id;
  return raw === null || raw === undefined ? "" : String(raw);
}

function mergeProductsWithSource(sourceProducts, storedProducts) {
  const sourceArray = Array.isArray(sourceProducts)
    ? sourceProducts.map((item) => ensureProductId(item))
    : [];
  const storedArray = Array.isArray(storedProducts)
    ? storedProducts.map((item) => ensureProductId(item))
    : [];
  const storedMap = new Map(storedArray.map((item) => [getProductId(item), item]));
  const sourceIds = new Set(sourceArray.map((item) => getProductId(item)));

  const mergedFromSource = sourceArray.map((sourceItem) => {
    const storedItem = storedMap.get(getProductId(sourceItem));
    const merged = storedItem ? { ...sourceItem, ...storedItem } : sourceItem;
    return normalizeProductPricing(ensureProductId(merged));
  });

  const customStoredProducts = storedArray
    .filter((item) => !sourceIds.has(getProductId(item)))
    .map((item) => normalizeProductPricing(item));

  return [...mergedFromSource, ...customStoredProducts];
}

function upsertByProductId(list, item) {
  const next = (Array.isArray(list) ? list : []).map((entry) =>
    ensureProductId(entry)
  );
  const normalizedItem = ensureProductId(item);
  const itemId = getProductId(normalizedItem);
  const index = next.findIndex((entry) => getProductId(entry) === itemId);
  if (index >= 0) {
    next[index] = normalizedItem;
  } else {
    next.push(normalizedItem);
  }
  return next;
}

function removeByProductId(list, productId) {
  return (Array.isArray(list) ? list : [])
    .map((item) => ensureProductId(item))
    .filter((item) => getProductId(item) !== productId);
}

export async function readCatalogProducts() {
  const stored = safeParseJson(localStorage.getItem(ADMIN_PRODUCTS_KEY));
  let sourceProducts = [];

  try {
    const data = await fetchGlasses();
    sourceProducts = Array.isArray(data)
      ? data.map((item) => ensureProductId(item))
      : [];
    localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(sourceProducts));
  } catch {
    const cached = safeParseJson(localStorage.getItem(SOURCE_CACHE_KEY));
    sourceProducts = Array.isArray(cached)
      ? cached.map((item) => ensureProductId(item))
      : [];
  }

  const mergedProducts = mergeProductsWithSource(sourceProducts, stored);
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(mergedProducts));
  return mergedProducts;
}

export function saveCatalogProducts(products) {
  const normalized = (Array.isArray(products) ? products : []).map((item) =>
    normalizeProductPricing(ensureProductId(item))
  );
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function createCatalogProduct(product) {
  const created = ensureProductId(await createGlasses(product));
  const cachedSource = safeParseJson(localStorage.getItem(SOURCE_CACHE_KEY));
  const updatedSource = upsertByProductId(cachedSource, created);
  localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(updatedSource));

  const stored = safeParseJson(localStorage.getItem(ADMIN_PRODUCTS_KEY));
  const updatedStored = upsertByProductId(stored, created).map((item) =>
    normalizeProductPricing(item)
  );
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(updatedStored));
  return normalizeProductPricing(created);
}

export async function updateCatalogProduct(product) {
  const productId = getProductId(product);
  const updated = ensureProductId(await updateGlasses(productId, product));
  const cachedSource = safeParseJson(localStorage.getItem(SOURCE_CACHE_KEY));
  const updatedSource = upsertByProductId(cachedSource, updated);
  localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(updatedSource));

  const stored = safeParseJson(localStorage.getItem(ADMIN_PRODUCTS_KEY));
  const updatedStored = upsertByProductId(stored, updated).map((item) =>
    normalizeProductPricing(item)
  );
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(updatedStored));
  return normalizeProductPricing(updated);
}

export async function deleteCatalogProduct(productId) {
  await deleteGlasses(productId);
  const cachedSource = safeParseJson(localStorage.getItem(SOURCE_CACHE_KEY));
  const updatedSource = removeByProductId(cachedSource, productId);
  localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(updatedSource));

  const stored = safeParseJson(localStorage.getItem(ADMIN_PRODUCTS_KEY));
  const updatedStored = removeByProductId(stored, productId);
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(updatedStored));
  return productId;
}
