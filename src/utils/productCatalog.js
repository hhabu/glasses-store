import glassesList from "../data/GlassesList";
import { normalizeProductPricing } from "./pricing";

const ADMIN_PRODUCTS_KEY = "admin_products";

function mergeProductsWithSource(storedProducts) {
  const storedArray = Array.isArray(storedProducts) ? storedProducts : [];
  const storedMap = new Map(storedArray.map((item) => [item.id, item]));
  const sourceIds = new Set(glassesList.map((item) => item.id));

  const mergedFromSource = glassesList.map((sourceItem) => {
    const storedItem = storedMap.get(sourceItem.id);
    const merged = storedItem ? { ...sourceItem, ...storedItem } : sourceItem;
    return normalizeProductPricing(merged);
  });

  const customStoredProducts = storedArray
    .filter((item) => !sourceIds.has(item.id))
    .map((item) => normalizeProductPricing(item));

  return [...mergedFromSource, ...customStoredProducts];
}

export function readCatalogProducts() {
  try {
    const stored = JSON.parse(localStorage.getItem(ADMIN_PRODUCTS_KEY));
    const mergedProducts = mergeProductsWithSource(stored);
    localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(mergedProducts));
    return mergedProducts;
  } catch {
    const fallback = glassesList.map((item) => normalizeProductPricing(item));
    localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

export function saveCatalogProducts(products) {
  const normalized = (Array.isArray(products) ? products : []).map((item) =>
    normalizeProductPricing(item)
  );
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(normalized));
  return normalized;
}
