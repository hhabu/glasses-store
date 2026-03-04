export const SALE_OVERRIDE_TYPE = {
  PERCENT: "PERCENT",
  FIXED_PRICE: "FIXED_PRICE",
};

function clampNumber(value, min, max) {
  const safe = Number(value);
  if (Number.isNaN(safe)) {
    return min;
  }
  return Math.min(max, Math.max(min, safe));
}

export function normalizeProductPricing(product) {
  const basePrice = clampNumber(
    product?.pricing?.basePrice ?? product?.price ?? 0,
    0,
    Number.MAX_SAFE_INTEGER
  );

  const saleType =
    product?.pricing?.saleOverride?.type === SALE_OVERRIDE_TYPE.FIXED_PRICE
      ? SALE_OVERRIDE_TYPE.FIXED_PRICE
      : SALE_OVERRIDE_TYPE.PERCENT;

  const percentOff = clampNumber(
    product?.pricing?.saleOverride?.percentOff ?? 0,
    0,
    95
  );
  const salePrice = clampNumber(
    product?.pricing?.saleOverride?.salePrice ?? basePrice,
    0,
    basePrice
  );

  return {
    ...product,
    price: basePrice,
    pricing: {
      basePrice,
      saleOverride: {
        enabled: Boolean(product?.pricing?.saleOverride?.enabled),
        type: saleType,
        percentOff,
        salePrice,
      },
    },
  };
}

export function computeProductDisplayPricing(product) {
  const normalized = normalizeProductPricing(product);
  const basePrice = normalized.pricing.basePrice;
  const saleOverride = normalized.pricing.saleOverride;

  if (!saleOverride.enabled || basePrice <= 0) {
    return {
      ...normalized,
      pricingView: {
        isOnSale: false,
        finalPrice: basePrice,
        originalPrice: basePrice,
        discountPercent: 0,
      },
    };
  }

  const finalPrice =
    saleOverride.type === SALE_OVERRIDE_TYPE.PERCENT
      ? Math.round(basePrice * (1 - saleOverride.percentOff / 100))
      : Math.round(saleOverride.salePrice);

  const safeFinalPrice = clampNumber(finalPrice, 0, basePrice);
  const discountPercent =
    basePrice > 0 ? Math.round(((basePrice - safeFinalPrice) / basePrice) * 100) : 0;

  return {
    ...normalized,
    pricingView: {
      isOnSale: safeFinalPrice < basePrice,
      finalPrice: safeFinalPrice,
      originalPrice: basePrice,
      discountPercent,
    },
  };
}
