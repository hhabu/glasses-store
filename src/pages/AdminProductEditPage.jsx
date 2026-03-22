import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatVND } from "../utils/currency";
import {
  buildProductPayload,
  createProductDraft,
  getBrandOptions,
  getProductTypeConfig,
  inferProductType,
} from "../utils/adminProductTypes";
import { computeProductDisplayPricing } from "../utils/pricing";
import {
  readCatalogProducts,
  updateCatalogProduct,
} from "../utils/productCatalog";
import "../styles/AdminProductCreatePage.css";

export default function AdminProductEditPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isOverviewEditing, setIsOverviewEditing] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState(() => createProductDraft());
  const [overviewFeedback, setOverviewFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;

    readCatalogProducts()
      .then((catalog) => {
        if (!isMounted) {
          return;
        }

        const list = Array.isArray(catalog) ? catalog : [];
        setProducts(list);
        const matchedProduct = list.find(
          (item) => String(item?.product_id ?? item?.id ?? "") === String(productId || "")
        );

        if (!matchedProduct) {
          setCurrentProduct(null);
          setLoadError("Product not found.");
          return;
        }

        setCurrentProduct(matchedProduct);
        setLoadError("");
      })
      .catch(() => {
        if (isMounted) {
          setProducts([]);
          setCurrentProduct(null);
          setLoadError("Failed to load product details.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const brandOptions = useMemo(() => getBrandOptions(products), [products]);
  const displayProduct = useMemo(() => {
    if (!currentProduct) {
      return null;
    }
    return computeProductDisplayPricing(currentProduct);
  }, [currentProduct]);
  const typeConfig = useMemo(() => {
    if (!displayProduct) {
      return null;
    }
    return getProductTypeConfig(inferProductType(displayProduct));
  }, [displayProduct]);
  const spotlightMeta = useMemo(() => {
    if (!displayProduct) {
      return [];
    }

    return [
      { label: "Brand", value: displayProduct.brand || "No brand" },
      { label: "Color", value: displayProduct.color || "-" },
      { label: "Width", value: displayProduct.width || "-" },
      { label: "Stock", value: displayProduct.quantity ?? 0 },
      { label: "Product ID", value: displayProduct.product_id ?? displayProduct.id ?? "-" },
      { label: "Database entity", value: typeConfig?.databaseEntity || "-" },
    ];
  }, [displayProduct, typeConfig]);
  const overviewEditableMeta = useMemo(
    () => [
      { key: "brand", label: "Brand", type: "text", placeholder: "Brand name" },
      { key: "color", label: "Color", type: "text", placeholder: "Color" },
      { key: "width", label: "Width", type: "text", placeholder: "52mm" },
      { key: "quantity", label: "Stock", type: "number", min: 0, step: 1 },
    ],
    []
  );

  useEffect(() => {
    if (!currentProduct) {
      setOverviewDraft(createProductDraft());
      setIsOverviewEditing(false);
      setOverviewFeedback(null);
      return;
    }

    setOverviewDraft(createProductDraft(currentProduct));
    setIsOverviewEditing(false);
  }, [currentProduct]);

  const handleBackToCatalog = () => {
    navigate("/admin");
  };

  const handleOverviewFieldChange = (field, value) => {
    setOverviewFeedback(null);
    setOverviewDraft((prev) => {
      const nextDraft = {
        ...prev,
        [field]: value,
      };

      if (field === "price") {
        const parsedPrice = Number(value || 0) || 0;
        nextDraft.price = value === "" ? "" : parsedPrice;
        nextDraft.pricing = {
          ...prev.pricing,
          basePrice: parsedPrice,
          saleOverride: {
            ...prev.pricing.saleOverride,
            salePrice: Math.min(
              Number(prev.pricing?.saleOverride?.salePrice ?? parsedPrice),
              parsedPrice
            ),
          },
        };
      }

      return nextDraft;
    });
  };

  const handleCancelOverviewEdit = () => {
    setOverviewDraft(createProductDraft(currentProduct));
    setIsOverviewEditing(false);
    setOverviewFeedback(null);
  };

  const handleOverviewSave = async () => {
    const payload = buildProductPayload(overviewDraft);

    if (!String(payload?.name || "").trim()) {
      setOverviewFeedback({
        type: "error",
        message: "Product name is required.",
      });
      return;
    }

    if (!String(payload?.brand || "").trim()) {
      setOverviewFeedback({
        type: "error",
        message: "Brand is required.",
      });
      return;
    }

    if (!String(payload?.color || "").trim()) {
      setOverviewFeedback({
        type: "error",
        message: "Color is required.",
      });
      return;
    }

    try {
      setIsSaving(true);
      setOverviewFeedback(null);
      const savedProduct = await updateCatalogProduct(payload);
      setCurrentProduct(savedProduct);
      setProducts((prev) =>
        prev.map((item) =>
          String(item?.product_id ?? item?.id ?? "") ===
          String(savedProduct?.product_id ?? savedProduct?.id ?? "")
            ? savedProduct
            : item
        )
      );
      setOverviewFeedback({
        type: "success",
        message: "Overview updated successfully.",
      });
      setIsOverviewEditing(false);
    } catch (error) {
      setOverviewFeedback({
        type: "error",
        message:
          error?.body?.message ||
          error?.message ||
          "Failed to update the product overview.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-create-page">
        <div className="admin-create-shell">
          <section className="admin-create-empty">
            <h2>Loading product editor...</h2>
            <p>Please wait while we prepare the full edit studio.</p>
          </section>
        </div>
      </div>
    );
  }

  if (loadError || !currentProduct) {
    return (
      <div className="admin-create-page">
        <div className="admin-create-shell">
          <section className="admin-create-empty">
            <h2>{loadError || "Product not found."}</h2>
            <p>Return to Product Configuration and choose another item to edit.</p>
            <button
              type="button"
              className="admin-create-secondary-btn"
              onClick={handleBackToCatalog}
            >
              Back to Product Configuration
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-create-page">
      <div className="admin-create-shell">
        <header className="admin-create-hero">
          <div>
            <p className="admin-create-kicker">Catalog Studio</p>
            <h1>Product Detail Editor</h1>
            <p className="admin-create-subtitle">
              Clicking a product image from Product Configuration now lands here first, so the
              update flow feels closer to a product detail page before you move into the form.
            </p>
          </div>
          <div className="admin-create-hero-actions">
            <button
              type="button"
              className="admin-create-secondary-btn"
              onClick={handleBackToCatalog}
            >
              Back to Product Configuration
            </button>
          </div>
        </header>

        <section className="admin-create-stage admin-edit-spotlight">
          <div className="admin-edit-media">
            {displayProduct?.image ? (
              <img src={displayProduct.image} alt={displayProduct.name} />
            ) : (
              <div className="admin-edit-media-placeholder">No product image</div>
            )}
            {displayProduct?.pricingView?.isOnSale ? (
              <span className="admin-edit-sale-badge">
                -{displayProduct.pricingView.discountPercent}%
              </span>
            ) : null}
          </div>

          <div className="admin-edit-info">
            <div className="admin-edit-actions">
              {isOverviewEditing ? (
                <>
                  <button
                    type="button"
                    className="admin-edit-primary-btn"
                    onClick={handleOverviewSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Updating..." : "Update overview"}
                  </button>
                  <button
                    type="button"
                    className="admin-edit-secondary-btn"
                    onClick={handleCancelOverviewEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="admin-edit-primary-btn"
                  onClick={() => {
                    setOverviewFeedback(null);
                    setIsOverviewEditing(true);
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {overviewFeedback?.message ? (
              <div className={`admin-edit-feedback is-${overviewFeedback.type || "info"}`}>
                {overviewFeedback.message}
              </div>
            ) : null}

            <div className="admin-edit-type-row">
              <span className="admin-edit-chip">{typeConfig?.label || "Product"}</span>
              <span className="admin-edit-chip is-muted">
                {typeConfig?.databaseEntity || "Catalog mapping"}
              </span>
            </div>

            {isOverviewEditing ? (
              <label className="admin-edit-title-field">
                <span>Product name</span>
                <input
                  type="text"
                  value={overviewDraft.name || ""}
                  onChange={(event) => handleOverviewFieldChange("name", event.target.value)}
                  placeholder="Product name"
                />
              </label>
            ) : (
              <h2>{displayProduct?.name}</h2>
            )}

            {isOverviewEditing ? (
              <label className="admin-edit-price-field">
                <span>Base price (VND)</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={overviewDraft.price === "" ? "" : overviewDraft.price ?? ""}
                  onChange={(event) => handleOverviewFieldChange("price", event.target.value)}
                />
              </label>
            ) : (
              <div className="admin-edit-price">
                <strong>
                  {formatVND(displayProduct?.pricingView?.finalPrice ?? displayProduct?.price ?? 0)}
                </strong>
                {displayProduct?.pricingView?.isOnSale ? (
                  <span>{formatVND(displayProduct.pricingView.originalPrice)}</span>
                ) : null}
              </div>
            )}

            {isOverviewEditing ? (
              <label className="admin-edit-description-field">
                <span>Description</span>
                <textarea
                  rows={4}
                  value={overviewDraft.description || ""}
                  onChange={(event) =>
                    handleOverviewFieldChange("description", event.target.value)
                  }
                  placeholder="Short selling description shown on product detail."
                />
              </label>
            ) : (
              <p className="admin-edit-description">
                {displayProduct?.description ||
                  "Use the form below to complete or refine this product record before the backend API contract is finalized."}
              </p>
            )}

            <div className="admin-edit-meta-grid">
              {isOverviewEditing ? (
                <>
                  {overviewEditableMeta.map((item) => (
                    <label
                      key={item.key}
                      className="admin-edit-meta-card admin-edit-meta-card-editable"
                    >
                      <span>{item.label}</span>
                      <input
                        type={item.type}
                        min={item.min}
                        step={item.step}
                        list={item.key === "brand" ? "admin-edit-brand-options" : undefined}
                        value={overviewDraft[item.key] ?? ""}
                        onChange={(event) =>
                          handleOverviewFieldChange(item.key, event.target.value)
                        }
                        placeholder={item.placeholder}
                      />
                    </label>
                  ))}
                  <div className="admin-edit-meta-card">
                    <span>Product ID</span>
                    <strong>{displayProduct?.product_id ?? displayProduct?.id ?? "-"}</strong>
                  </div>
                  <div className="admin-edit-meta-card">
                    <span>Database entity</span>
                    <strong>{typeConfig?.databaseEntity || "-"}</strong>
                  </div>
                </>
              ) : (
                spotlightMeta.map((item) => (
                  <div key={item.label} className="admin-edit-meta-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))
              )}
            </div>

            {isOverviewEditing ? (
              <>
                <datalist id="admin-edit-brand-options">
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
                <p className="admin-edit-inline-note">
                  This screen now focuses on quick catalog updates for the core product overview:
                  name, price, description, brand, color, width, and stock.
                </p>
              </>
            ) : null}
          </div>
        </section>

        <section className="admin-edit-support-grid">
          <article className="admin-create-side-card admin-edit-support-card">
            <p className="admin-create-step">Current record</p>
            <h3>{displayProduct?.name}</h3>
            <p>
              <strong>Brand:</strong> {displayProduct?.brand || "-"}
            </p>
            <p>
              <strong>Color:</strong> {displayProduct?.color || "-"}
            </p>
            <p>
              <strong>Catalog type:</strong> {typeConfig?.label || "-"}
            </p>
          </article>

          <article className="admin-create-side-card admin-edit-support-card">
            <p className="admin-create-step">Database direction</p>
            <h3>{typeConfig?.databaseEntity || "Catalog mapping"}</h3>
            <p>{typeConfig?.databaseSummary}</p>
            <p>
              <strong>Key backend columns:</strong>{" "}
              {typeConfig?.databaseColumns?.join(", ") || "-"}
            </p>
          </article>

          <article className="admin-create-side-card admin-edit-support-card">
            <p className="admin-create-step">Edit scope</p>
            <h3>Focused quick updates</h3>
            <p>
              This page is intentionally lighter now. It keeps the edit flow centered on the
              storefront-facing overview instead of a second long form underneath.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}
