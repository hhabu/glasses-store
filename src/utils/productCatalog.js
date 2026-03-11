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

function mergeProductsWithSource(sourceProducts, storedProducts) {
  const sourceArray = Array.isArray(sourceProducts) ? sourceProducts : [];
  const storedArray = Array.isArray(storedProducts) ? storedProducts : [];
  const storedMap = new Map(storedArray.map((item) => [item.id, item]));
  const sourceIds = new Set(sourceArray.map((item) => item.id));

  const mergedFromSource = sourceArray.map((sourceItem) => {
    const storedItem = storedMap.get(sourceItem.id);
    const merged = storedItem ? { ...sourceItem, ...storedItem } : sourceItem;
    return normalizeProductPricing(merged);
  });

  const customStoredProducts = storedArray
    .filter((item) => !sourceIds.has(item.id))
    .map((item) => normalizeProductPricing(item));

  return [...mergedFromSource, ...customStoredProducts];
}

function upsertById(list, item) {
  const next = Array.isArray(list) ? [...list] : [];
  const index = next.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    next[index] = item;
  } else {
    next.push(item);
  }
  return next;
}

function removeById(list, id) {
  return (Array.isArray(list) ? list : []).filter((item) => item.id !== id);
}

export async function readCatalogProducts() {
  const stored = safeParseJson(localStorage.getItem(ADMIN_PRODUCTS_KEY));
  let sourceProducts = [];

  try {
    const data = await fetchGlasses();
    sourceProducts = Array.isArray(data) ? data : [];
    localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(sourceProducts));
  } catch {
    const cached = safeParseJson(localStorage.getItem(SOURCE_CACHE_KEY));
    sourceProducts = Array.isArray(cached) ? cached : [];
  }

  const mergedProducts = mergeProductsWithSource(sourceProducts, stored);
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(mergedProducts));
  return mergedProducts;
}

export function saveCatalogProducts(products) {
  const normalized = (Array.isArray(products) ? products : []).map((item) =>
    normalizeProductPricing(item)
  );
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function createCatalogProduct(product) {
  const created = await createGlasses(product);
  const cachedSource = safeParseJson(localStorage.getItem(SOURCE_CACHE_KEY));
  const updatedSource = upsertById(cachedSource, created);
  localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(updatedSource));

  const stored = safeParseJson(localStorage.getItem(ADMIN_PRODUCTS_KEY));
  const updatedStored = upsertById(stored, created).map((item) =>
    normalizeProductPricing(item)
  );
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(updatedStored));
  return normalizeProductPricing(created);
}

export async function updateCatalogProduct(product) {
  const updated = await updateGlasses(product.id, product);
  const cachedSource = safeParseJson(localStorage.getItem(SOURCE_CACHE_KEY));
  const updatedSource = upsertById(cachedSource, updated);
  localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(updatedSource));

  const stored = safeParseJson(localStorage.getItem(ADMIN_PRODUCTS_KEY));
  const updatedStored = upsertById(stored, updated).map((item) =>
    normalizeProductPricing(item)
  );
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(updatedStored));
  return normalizeProductPricing(updated);
}

export async function deleteCatalogProduct(id) {
  await deleteGlasses(id);
  const cachedSource = safeParseJson(localStorage.getItem(SOURCE_CACHE_KEY));
  const updatedSource = removeById(cachedSource, id);
  localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(updatedSource));

  const stored = safeParseJson(localStorage.getItem(ADMIN_PRODUCTS_KEY));
  const updatedStored = removeById(stored, id);
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(updatedStored));
  return id;
}
