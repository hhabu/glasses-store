import { formatVND } from "../../utils/currency";
import { computeProductDisplayPricing, normalizeProductPricing } from "../../utils/pricing";
import { getProductTypeConfig, inferProductType } from "../../utils/adminProductTypes";

function getCategoryLabel(product) {
  return getProductTypeConfig(inferProductType(product)).label;
}

export default function AdminProductCard({
  product,
  mode = "basic",
  onOpenEditor,
  onOpenPreview = onOpenEditor,
}) {
  const normalizedProduct = normalizeProductPricing(product);
  const display = computeProductDisplayPricing(normalizedProduct);
  const isPricingMode = mode === "pricing";

  return (
    <article className="admin-product-card">
      <button
        type="button"
        className="admin-product-card-media"
        onClick={() => onOpenPreview(normalizedProduct)}
        aria-label={`Open ${normalizedProduct.name} in the detail editor`}
      >
        {normalizedProduct.image ? (
          <img src={normalizedProduct.image} alt={normalizedProduct.name} />
        ) : (
          <div className="admin-product-card-placeholder">No image</div>
        )}
      </button>

      <div className="admin-product-card-body">
        <div className="admin-product-card-tags">
          <span>{getCategoryLabel(normalizedProduct)}</span>
          <span>{normalizedProduct.brand || "No brand"}</span>
        </div>

        <h3>{normalizedProduct.name}</h3>
        <p className="admin-product-card-meta">
          Color: {normalizedProduct.color || "-"} | Stock:{" "}
          {normalizedProduct.quantity ?? 0}
        </p>
        <p className="admin-product-card-price">
          {display.pricingView?.isOnSale ? (
            <>
              <strong>{formatVND(display.pricingView.finalPrice)}</strong>
              <span>{formatVND(display.pricingView.originalPrice)}</span>
            </>
          ) : (
            <strong>{formatVND(display.pricingView?.originalPrice ?? normalizedProduct.price ?? 0)}</strong>
          )}
        </p>

        <button
          type="button"
          className="admin-product-card-action"
          onClick={() => onOpenEditor(normalizedProduct)}
        >
          {isPricingMode ? "Edit Pricing" : "Edit Product"}
        </button>
      </div>
    </article>
  );
}
