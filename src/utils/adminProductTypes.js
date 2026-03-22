import { normalizeProductPricing, SALE_OVERRIDE_TYPE } from "./pricing";

export const PRODUCT_TYPE_OPTIONS = [
  {
    value: "readymade_optical",
    label: "Ready made glass",
    category: "readymade_optical",
    databaseEntity: "ready_made_glasses",
    databaseSummary:
      "Best match for dbo.ready_made_glasses. Backend can join frame and lens to build one catalog DTO.",
    databaseColumns: ["name", "frame_id", "lens_id", "fixed_sph", "fixed_cyl", "price", "stock"],
    specFields: ["width", "size", "material", "fixed_sph", "fixed_cyl"],
  },
  {
    value: "sun_glasses",
    label: "Sun glasses",
    category: "sun_glasses",
    databaseEntity: "frame",
    databaseSummary:
      "Best match for dbo.frame with frame_type = SUNGLASSES or a backend catalog mapper.",
    databaseColumns: ["name", "brand", "material", "size", "rim_type", "color", "price", "stock"],
    specFields: ["width", "size", "material", "rim_type"],
  },
  {
    value: "lens",
    label: "Contact Lens",
    category: "lens",
    databaseEntity: "contact_lens",
    databaseSummary:
      "Best match for dbo.contact_lens. Useful for both the catalog tab and future prescription checks.",
    databaseColumns: [
      "name",
      "brand",
      "contact_type",
      "color",
      "min_sph",
      "max_sph",
      "min_cyl",
      "max_cyl",
      "price",
      "stock",
    ],
    specFields: ["contact_type", "min_sph", "max_sph", "min_cyl", "max_cyl"],
  },
  {
    value: "frame_for_design",
    label: "Frame for design",
    category: "frame_for_design",
    databaseEntity: "frame",
    databaseSummary:
      "Best match for dbo.frame with frame_type = EYEGLASSES and exposed to the design-glasses flow.",
    databaseColumns: ["name", "brand", "material", "size", "rim_type", "color", "price", "stock"],
    specFields: ["width", "size", "material", "rim_type"],
  },
];

export const COMMON_BASIC_FIELDS = [
  "name",
  "color",
  "quantity",
  "price",
  "rating",
  "description",
];

export const FIELD_DEFINITIONS = {
  name: {
    label: "Product name",
    type: "text",
    placeholder: "Example: Ray-Ban Everyday",
  },
  color: {
    label: "Color",
    type: "text",
    placeholder: "Black",
  },
  quantity: {
    label: "Stock quantity",
    type: "number",
    min: 0,
    step: 1,
  },
  price: {
    label: "Base price (VND)",
    type: "number",
    min: 0,
    step: 1000,
  },
  rating: {
    label: "Rating",
    type: "number",
    min: 0,
    max: 5,
    step: 1,
  },
  description: {
    label: "Description",
    type: "textarea",
    rows: 4,
    placeholder: "Short selling description shown on product detail.",
  },
  width: {
    label: "Width",
    type: "text",
    placeholder: "52mm",
  },
  size: {
    label: "Size",
    type: "text",
    placeholder: "M",
  },
  material: {
    label: "Material",
    type: "text",
    placeholder: "Titanium",
  },
  rim_type: {
    label: "Rim type",
    type: "select",
    options: ["FULL", "HALF", "RIMLESS"],
  },
  fixed_sph: {
    label: "Fixed SPH",
    type: "number",
    step: 0.25,
  },
  fixed_cyl: {
    label: "Fixed CYL",
    type: "number",
    step: 0.25,
  },
  contact_type: {
    label: "Contact type",
    type: "select",
    options: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
  },
  min_sph: {
    label: "Min SPH",
    type: "number",
    step: 0.25,
  },
  max_sph: {
    label: "Max SPH",
    type: "number",
    step: 0.25,
  },
  min_cyl: {
    label: "Min CYL",
    type: "number",
    step: 0.25,
  },
  max_cyl: {
    label: "Max CYL",
    type: "number",
    step: 0.25,
  },
};

function normalizeCategoryKey(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .trim();

  if (normalized === "optical" || normalized === "readymade_optical") {
    return "readymade_optical";
  }
  if (normalized === "sun_glasses" || normalized === "sunglasses") {
    return "sun_glasses";
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
    normalized === "design_frame" ||
    normalized === "framefordesign"
  ) {
    return "frame_for_design";
  }

  return normalized || PRODUCT_TYPE_OPTIONS[0].value;
}

function createPricingDraft(price = 0, pricing) {
  const basePrice = Number(pricing?.basePrice ?? price ?? 0) || 0;
  return {
    basePrice,
    saleOverride: {
      enabled: Boolean(pricing?.saleOverride?.enabled),
      type:
        pricing?.saleOverride?.type === SALE_OVERRIDE_TYPE.FIXED_PRICE
          ? SALE_OVERRIDE_TYPE.FIXED_PRICE
          : SALE_OVERRIDE_TYPE.PERCENT,
      percentOff: Number(pricing?.saleOverride?.percentOff ?? 0) || 0,
      salePrice: Number(pricing?.saleOverride?.salePrice ?? basePrice) || 0,
    },
  };
}

export function getProductTypeConfig(type) {
  return (
    PRODUCT_TYPE_OPTIONS.find((item) => item.value === normalizeCategoryKey(type)) ||
    PRODUCT_TYPE_OPTIONS[0]
  );
}

export function inferProductType(product) {
  const directType = product?.product_type || product?.category;
  return getProductTypeConfig(directType).value;
}

export function createProductDraft(product = {}, preferredType) {
  const type = preferredType || inferProductType(product);
  const typeConfig = getProductTypeConfig(type);
  const draft = {
    id: product?.id ?? "",
    product_id: product?.product_id ?? product?.id ?? "",
    product_type: typeConfig.value,
    category: typeConfig.category,
    database_entity: typeConfig.databaseEntity,
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    color: product?.color ?? "",
    image: product?.image ?? product?.image_url ?? "",
    imageUploadName: "",
    width: product?.width ?? "",
    size: product?.size ?? "",
    material: product?.material ?? "",
    rim_type: product?.rim_type ?? "",
    quantity: Number(product?.quantity ?? product?.stock ?? 0) || 0,
    price: Number(product?.price ?? 0) || 0,
    rating: Number(product?.rating ?? 4) || 0,
    description: product?.description ?? "",
    fixed_sph: product?.fixed_sph ?? "",
    fixed_cyl: product?.fixed_cyl ?? "",
    contact_type: product?.contact_type ?? "MONTHLY",
    min_sph: product?.min_sph ?? "",
    max_sph: product?.max_sph ?? "",
    min_cyl: product?.min_cyl ?? "",
    max_cyl: product?.max_cyl ?? "",
    status: product?.status ?? "ACTIVE",
    pricing: createPricingDraft(product?.price, product?.pricing),
  };

  return normalizeProductPricing(draft);
}

export function createEmptyProductDraft(type = PRODUCT_TYPE_OPTIONS[0].value) {
  return createProductDraft({}, type);
}

export function getProductEditorFields(type) {
  const typeConfig = getProductTypeConfig(type);
  return {
    basic: COMMON_BASIC_FIELDS,
    specs: typeConfig.specFields,
  };
}

export function getBrandOptions(products) {
  const unique = new Set();
  (Array.isArray(products) ? products : []).forEach((product) => {
    const brand = String(product?.brand || "").trim();
    if (brand) {
      unique.add(brand);
    }
  });

  return [...unique].sort((a, b) => a.localeCompare(b));
}

export function buildProductPayload(draft) {
  const typeConfig = getProductTypeConfig(draft?.product_type || draft?.category);
  const payload = {
    ...draft,
    product_type: typeConfig.value,
    category: typeConfig.category,
    database_entity: typeConfig.databaseEntity,
    image: String(draft?.image || "").trim(),
    brand: String(draft?.brand || "").trim(),
    name: String(draft?.name || "").trim(),
    color: String(draft?.color || "").trim(),
    width: String(draft?.width || "").trim(),
    size: String(draft?.size || "").trim(),
    material: String(draft?.material || "").trim(),
    rim_type: String(draft?.rim_type || "").trim(),
    description: String(draft?.description || "").trim(),
    quantity: Math.max(0, Number(draft?.quantity ?? 0) || 0),
    price: Math.max(0, Number(draft?.price ?? 0) || 0),
    rating: Math.min(5, Math.max(0, Number(draft?.rating ?? 0) || 0)),
    fixed_sph: draft?.fixed_sph === "" ? "" : Number(draft?.fixed_sph ?? 0),
    fixed_cyl: draft?.fixed_cyl === "" ? "" : Number(draft?.fixed_cyl ?? 0),
    min_sph: draft?.min_sph === "" ? "" : Number(draft?.min_sph ?? 0),
    max_sph: draft?.max_sph === "" ? "" : Number(draft?.max_sph ?? 0),
    min_cyl: draft?.min_cyl === "" ? "" : Number(draft?.min_cyl ?? 0),
    max_cyl: draft?.max_cyl === "" ? "" : Number(draft?.max_cyl ?? 0),
    contact_type: String(draft?.contact_type || "").trim(),
    pricing: createPricingDraft(draft?.price, draft?.pricing),
  };

  if (!String(payload.id || "").trim()) {
    delete payload.id;
  }
  if (!String(payload.product_id || "").trim()) {
    delete payload.product_id;
  }
  if (!String(payload.imageUploadName || "").trim()) {
    delete payload.imageUploadName;
  }

  return normalizeProductPricing(payload);
}
