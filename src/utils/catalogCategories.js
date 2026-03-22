function capitalize(word) {
  if (!word) {
    return "";
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function normalizeCategoryKey(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .trim();

  if (normalized === "sunglasses" || normalized === "sun_glasses") {
    return "sun_glasses";
  }
  if (normalized === "optical" || normalized === "readymade_optical") {
    return "readymade_optical";
  }
  if (
    normalized === "lens" ||
    normalized === "lenses" ||
    normalized === "contact_lens" ||
    normalized === "contact_lenses"
  ) {
    return "lens";
  }
  if (
    normalized === "frame_for_design" ||
    normalized === "framefordesign" ||
    normalized === "design_frame"
  ) {
    return "frame_for_design";
  }

  return normalized;
}

export function formatCategoryLabel(value) {
  const raw = String(value || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .trim();

  if (raw === "contact_lens" || raw === "contact_lenses") {
    return "Contact Lens";
  }

  const key = normalizeCategoryKey(value);
  if (!key) {
    return "Uncategorized";
  }

  return key
    .split("_")
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(" ");
}

export function buildCategoryTabs(products) {
  const categoryMap = new Map();

  (Array.isArray(products) ? products : []).forEach((item) => {
    const key = normalizeCategoryKey(item?.category);
    if (!key || categoryMap.has(key)) {
      return;
    }

    const label = formatCategoryLabel(item?.category || key);
    categoryMap.set(key, {
      key,
      label,
      title: label,
    });
  });

  return Array.from(categoryMap.values());
}
