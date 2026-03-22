import { useEffect, useMemo, useRef, useState } from "react";
import { formatVND } from "../../utils/currency";
import {
  buildProductPayload,
  createEmptyProductDraft,
  createProductDraft,
  FIELD_DEFINITIONS,
  getProductEditorFields,
  getProductTypeConfig,
  PRODUCT_TYPE_OPTIONS,
} from "../../utils/adminProductTypes";
import { getProductImageUploadMode, uploadProductImage } from "../../services/productImageUpload";
import { SALE_OVERRIDE_TYPE } from "../../utils/pricing";

function toNumberInputValue(value) {
  return value === null || value === undefined ? "" : value;
}

function validateDraft(draft) {
  if (!String(draft?.name || "").trim()) {
    return "Product name is required.";
  }
  if (!String(draft?.brand || "").trim()) {
    return "Please choose or create a brand.";
  }
  if (!String(draft?.color || "").trim()) {
    return "Color is required.";
  }
  if (Number(draft?.price ?? 0) < 0) {
    return "Price cannot be negative.";
  }
  if (Number(draft?.quantity ?? 0) < 0) {
    return "Stock quantity cannot be negative.";
  }

  if (draft?.product_type === "lens") {
    const minSph = Number(draft?.min_sph ?? 0);
    const maxSph = Number(draft?.max_sph ?? 0);
    const minCyl = Number(draft?.min_cyl ?? 0);
    const maxCyl = Number(draft?.max_cyl ?? 0);
    if (!Number.isNaN(minSph) && !Number.isNaN(maxSph) && minSph > maxSph) {
      return "Min SPH must be less than or equal to Max SPH.";
    }
    if (!Number.isNaN(minCyl) && !Number.isNaN(maxCyl) && minCyl > maxCyl) {
      return "Min CYL must be less than or equal to Max CYL.";
    }
  }

  return "";
}

function FieldInput({ fieldKey, value, onChange }) {
  const definition = FIELD_DEFINITIONS[fieldKey];
  if (!definition) {
    return null;
  }

  const sharedProps = {
    id: fieldKey,
    name: fieldKey,
    value:
      definition.type === "number" ? toNumberInputValue(value) : String(value ?? ""),
    onChange: (event) => {
      const nextValue =
        definition.type === "number" ? event.target.value : event.target.value;
      onChange(fieldKey, nextValue);
    },
    placeholder: definition.placeholder,
  };

  if (definition.type === "textarea") {
    return <textarea {...sharedProps} rows={definition.rows || 4} />;
  }

  if (definition.type === "select") {
    return (
      <select {...sharedProps}>
        {definition.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      {...sharedProps}
      type={definition.type}
      min={definition.min}
      max={definition.max}
      step={definition.step}
    />
  );
}

export default function AdminProductEditor({
  mode = "basic",
  product,
  intent = "edit",
  brandOptions = [],
  onClose,
  onSubmit,
  isSaving = false,
  feedback,
  layout = "panel",
  showTypeSection = true,
  showMappingSection = true,
  showCloseButton = true,
  closeLabel = "Close",
}) {
  const isPricingMode = mode === "pricing";
  const isPageLayout = layout === "page";
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState(() =>
    product ? createProductDraft(product) : createEmptyProductDraft()
  );
  const [brandQuery, setBrandQuery] = useState(draft.brand || "");
  const [isBrandMenuOpen, setIsBrandMenuOpen] = useState(false);
  const [localError, setLocalError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState("");

  useEffect(() => {
    const nextDraft = product
      ? createProductDraft(product)
      : createEmptyProductDraft();
    setDraft(nextDraft);
    setBrandQuery(nextDraft.brand || "");
    setLocalError("");
    setImageMessage("");
  }, [product]);

  const typeConfig = useMemo(
    () => getProductTypeConfig(draft?.product_type || draft?.category),
    [draft?.product_type, draft?.category]
  );
  const editorFields = useMemo(
    () => getProductEditorFields(typeConfig.value),
    [typeConfig.value]
  );
  const filteredBrands = useMemo(() => {
    const query = String(brandQuery || "").trim().toLowerCase();
    const source = Array.isArray(brandOptions) ? brandOptions : [];
    if (!query) {
      return source.slice(0, 8);
    }
    return source
      .filter((brand) => brand.toLowerCase().includes(query))
      .slice(0, 8);
  }, [brandOptions, brandQuery]);
  const canCreateBrand = useMemo(() => {
    const trimmed = String(brandQuery || "").trim();
    if (!trimmed) {
      return false;
    }
    return !brandOptions.some((brand) => brand.toLowerCase() === trimmed.toLowerCase());
  }, [brandOptions, brandQuery]);

  const handleFieldChange = (field, value) => {
    setLocalError("");
    setDraft((prev) => {
      const nextValue =
        FIELD_DEFINITIONS[field]?.type === "number" && value !== ""
          ? value
          : value;
      const nextDraft = {
        ...prev,
        [field]: nextValue,
      };

      if (field === "price") {
        const parsedPrice = Number(value || 0) || 0;
        nextDraft.price = parsedPrice;
        nextDraft.pricing = {
          ...prev.pricing,
          basePrice: parsedPrice,
          saleOverride: {
            ...prev.pricing.saleOverride,
            salePrice: Math.min(
              Number(prev.pricing.saleOverride?.salePrice ?? parsedPrice),
              parsedPrice
            ),
          },
        };
      }

      return nextDraft;
    });
  };

  const handleTypeChange = (nextType) => {
    setDraft((prev) => createProductDraft({ ...prev, product_type: nextType }, nextType));
  };

  const handleBrandInputChange = (event) => {
    const nextValue = event.target.value;
    setBrandQuery(nextValue);
    setDraft((prev) => ({ ...prev, brand: nextValue }));
    setIsBrandMenuOpen(true);
    setLocalError("");
  };

  const handlePickBrand = (brand) => {
    setBrandQuery(brand);
    setDraft((prev) => ({ ...prev, brand }));
    setIsBrandMenuOpen(false);
    setLocalError("");
  };

  const handleUploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploadingImage(true);
      setImageMessage("");
      const uploadedImage = await uploadProductImage(file);
      setDraft((prev) => ({
        ...prev,
        image: uploadedImage,
        imageUploadName: file.name,
      }));
      setImageMessage(`Selected file: ${file.name}`);
    } catch (error) {
      setImageMessage(error.message || "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handlePricingChange = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        saleOverride: {
          ...prev.pricing.saleOverride,
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const payload = buildProductPayload(draft);
    const validationError = validateDraft(payload);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    await onSubmit(payload);
  };

  if (!product) {
    return (
      <aside className="admin-product-editor is-empty">
        <div className="admin-product-editor-empty">
          <p className="admin-product-editor-kicker">
            {isPricingMode ? "Pricing Studio" : "Catalog Studio"}
          </p>
          <h3>
            {isPricingMode
              ? "Choose a product to edit its sale price."
              : "Open a product or create a new one."}
          </h3>
          <p>
            {isPricingMode
              ? "Pricing edits stay in one focused panel instead of popping a modal."
              : "Use the Add Product button to start a new catalog item, then fill only the fields that belong to that product type."}
          </p>
          {!isPricingMode ? (
            <div className="admin-product-type-preview">
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <div className="admin-product-type-chip" key={option.value}>
                  <strong>{option.label}</strong>
                  <span>{option.databaseEntity}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside className={`admin-product-editor${isPageLayout ? " is-page" : ""}`}>
      <div className="admin-product-editor-head">
        <div>
          <p className="admin-product-editor-kicker">
            {intent === "create" ? "Create Product" : isPricingMode ? "Update Pricing" : "Update Product"}
          </p>
          <h3>{intent === "create" ? "Add a new catalog item" : draft.name || "Product editor"}</h3>
        </div>
        {showCloseButton ? (
          <button type="button" className="admin-product-editor-close" onClick={onClose}>
            {closeLabel}
          </button>
        ) : null}
      </div>

      {feedback?.message ? (
        <div className={`admin-product-feedback is-${feedback.type || "info"}`}>
          {feedback.message}
        </div>
      ) : null}
      {localError ? (
        <div className="admin-product-feedback is-error">{localError}</div>
      ) : null}

      <form className="admin-product-form" onSubmit={handleSave}>
        {!isPricingMode ? (
          <>
            {showTypeSection ? (
              <section className="admin-product-section">
                <div className="admin-product-section-head">
                  <h4>Product type</h4>
                  <p>Pick the frontend category that best matches the backend entity.</p>
                </div>
                <div className="admin-product-type-grid">
                  {PRODUCT_TYPE_OPTIONS.map((option) => {
                    const isActive = typeConfig.value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`admin-product-type-card${isActive ? " is-active" : ""}`}
                        onClick={() => handleTypeChange(option.value)}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.databaseEntity}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {showMappingSection ? (
              <section className="admin-product-section">
                <div className="admin-product-section-head">
                  <h4>Database mapping</h4>
                  <p>This helps you and backend speak the same language before the API is finalized.</p>
                </div>
                <div className="admin-product-mapping-card">
                  <p>
                    <strong>Suggested entity:</strong> {typeConfig.databaseEntity}
                  </p>
                  <p>{typeConfig.databaseSummary}</p>
                  <p>
                    <strong>Key columns:</strong> {typeConfig.databaseColumns.join(", ")}
                  </p>
                </div>
              </section>
            ) : null}

            <section className="admin-product-section">
              <div className="admin-product-section-head">
                <h4>Basic details</h4>
                <p>Shared catalog fields used across the current frontend.</p>
              </div>

              <div className="admin-product-form-grid">
                <label className="admin-product-field admin-product-field-brand">
                  <span>Brand</span>
                  <div className="admin-brand-picker">
                    <input
                      type="text"
                      value={brandQuery}
                      placeholder="Search or create a brand"
                      onChange={handleBrandInputChange}
                      onFocus={() => setIsBrandMenuOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setIsBrandMenuOpen(false);
                        }, 120);
                      }}
                    />
                    {isBrandMenuOpen ? (
                      <div className="admin-brand-menu">
                        {filteredBrands.length > 0 ? (
                          filteredBrands.map((brand) => (
                            <button
                              type="button"
                              key={brand}
                              className="admin-brand-option"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handlePickBrand(brand)}
                            >
                              {brand}
                            </button>
                          ))
                        ) : (
                          <p className="admin-brand-empty">No saved brand matches this search.</p>
                        )}
                        {canCreateBrand ? (
                          <button
                            type="button"
                            className="admin-brand-create"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handlePickBrand(brandQuery.trim())}
                          >
                            Create brand "{brandQuery.trim()}"
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </label>

                {editorFields.basic.map((fieldKey) => (
                  <label className="admin-product-field" key={fieldKey}>
                    <span>{FIELD_DEFINITIONS[fieldKey].label}</span>
                    <FieldInput
                      fieldKey={fieldKey}
                      value={draft[fieldKey]}
                      onChange={handleFieldChange}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="admin-product-section">
              <div className="admin-product-section-head">
                <h4>Type-specific fields</h4>
                <p>These fields reflect how the current database entities are shaped.</p>
              </div>
              <div className="admin-product-form-grid">
                {editorFields.specs.map((fieldKey) => (
                  <label className="admin-product-field" key={fieldKey}>
                    <span>{FIELD_DEFINITIONS[fieldKey].label}</span>
                    <FieldInput
                      fieldKey={fieldKey}
                      value={draft[fieldKey]}
                      onChange={handleFieldChange}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="admin-product-section">
              <div className="admin-product-section-head">
                <h4>Product image</h4>
                <p>
                  Pick a file from your machine. Current upload mode: {getProductImageUploadMode()}.
                </p>
              </div>
              <div className="admin-product-image-block">
                <div className="admin-product-image-preview">
                  {draft.image ? (
                    <img src={draft.image} alt={draft.name || "Product preview"} />
                  ) : (
                    <div className="admin-product-image-placeholder">No image selected</div>
                  )}
                </div>
                <div className="admin-product-image-actions">
                  <button
                    type="button"
                    className="admin-product-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? "Uploading..." : "Upload from device"}
                  </button>
                  <button
                    type="button"
                    className="admin-product-upload-btn is-secondary"
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, image: "", imageUploadName: "" }));
                      setImageMessage("");
                    }}
                    disabled={!draft.image}
                  >
                    Remove image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleUploadImage}
                  />
                  {imageMessage ? <p className="admin-product-image-note">{imageMessage}</p> : null}
                  <label className="admin-product-field">
                    <span>Image URL (optional override)</span>
                    <input
                      type="text"
                      value={draft.image}
                      placeholder="Paste a URL if you still want to use one"
                      onChange={(event) => handleFieldChange("image", event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="admin-product-section">
            <div className="admin-product-section-head">
              <h4>Sale override</h4>
              <p>Use this side panel for promotions instead of the old modal.</p>
            </div>

            <div className="admin-product-summary-card">
              <p className="admin-product-summary-label">Product</p>
              <h4>{draft.name}</h4>
              <p>
                Base price:{" "}
                <strong>{formatVND(draft.pricing?.basePrice ?? draft.price ?? 0)}</strong>
              </p>
            </div>

            <label className="admin-product-checkbox">
              <input
                type="checkbox"
                checked={Boolean(draft.pricing?.saleOverride?.enabled)}
                onChange={(event) =>
                  handlePricingChange("enabled", event.target.checked)
                }
              />
              <span>Enable sale override for this product</span>
            </label>

            <div className="admin-product-form-grid">
              <label className="admin-product-field">
                <span>Sale type</span>
                <select
                  value={draft.pricing?.saleOverride?.type || SALE_OVERRIDE_TYPE.PERCENT}
                  onChange={(event) => handlePricingChange("type", event.target.value)}
                  disabled={!draft.pricing?.saleOverride?.enabled}
                >
                  <option value={SALE_OVERRIDE_TYPE.PERCENT}>Discount by percent</option>
                  <option value={SALE_OVERRIDE_TYPE.FIXED_PRICE}>Fixed sale price</option>
                </select>
              </label>

              {draft.pricing?.saleOverride?.type === SALE_OVERRIDE_TYPE.FIXED_PRICE ? (
                <label className="admin-product-field">
                  <span>Sale price</span>
                  <input
                    type="number"
                    min={0}
                    max={draft.pricing?.basePrice ?? draft.price ?? 0}
                    value={toNumberInputValue(draft.pricing?.saleOverride?.salePrice ?? 0)}
                    onChange={(event) =>
                      handlePricingChange("salePrice", Number(event.target.value) || 0)
                    }
                    disabled={!draft.pricing?.saleOverride?.enabled}
                  />
                </label>
              ) : (
                <label className="admin-product-field">
                  <span>Percent off</span>
                  <input
                    type="number"
                    min={0}
                    max={95}
                    value={toNumberInputValue(draft.pricing?.saleOverride?.percentOff ?? 0)}
                    onChange={(event) =>
                      handlePricingChange("percentOff", Number(event.target.value) || 0)
                    }
                    disabled={!draft.pricing?.saleOverride?.enabled}
                  />
                </label>
              )}
            </div>
          </section>
        )}

        <div className="admin-product-form-actions">
          <button type="button" className="admin-product-action is-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-product-action" disabled={isSaving || isUploadingImage}>
            {isSaving ? "Saving..." : intent === "create" ? "Create product" : "Save changes"}
          </button>
        </div>
      </form>
    </aside>
  );
}
