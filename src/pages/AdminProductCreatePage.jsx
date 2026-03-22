import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminProductEditor from "../components/admin/AdminProductEditor";
import {
  createEmptyProductDraft,
  getBrandOptions,
  getProductTypeConfig,
  PRODUCT_TYPE_OPTIONS,
} from "../utils/adminProductTypes";
import { createCatalogProduct, readCatalogProducts } from "../utils/productCatalog";
import "../styles/AdminProductCreatePage.css";

function getValidType(value) {
  const matched = PRODUCT_TYPE_OPTIONS.find((option) => option.value === value);
  return matched?.value || "";
}

export default function AdminProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type") || "";
  const selectedType = getValidType(requestedType);
  const [products, setProducts] = useState([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingBrands(true);

    readCatalogProducts()
      .then((catalog) => {
        if (isMounted) {
          setProducts(Array.isArray(catalog) ? catalog : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProducts([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingBrands(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const brandOptions = useMemo(() => getBrandOptions(products), [products]);
  const typeConfig = useMemo(
    () => (selectedType ? getProductTypeConfig(selectedType) : null),
    [selectedType]
  );
  const draftProduct = useMemo(
    () => (selectedType ? createEmptyProductDraft(selectedType) : null),
    [selectedType]
  );

  const handleBackToCatalog = () => {
    navigate("/admin");
  };

  const handlePickType = (type) => {
    setFeedback(null);
    setSearchParams({ type });
  };

  const handleSubmit = async (payload) => {
    setFeedback(null);
    try {
      setIsSaving(true);
      const createdProduct = await createCatalogProduct(payload);
      navigate("/admin", {
        replace: true,
        state: {
          openProductId: String(createdProduct?.product_id ?? createdProduct?.id ?? ""),
          productMessage: `${createdProduct?.name || "Product"} was created successfully.`,
        },
      });
      return createdProduct;
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error?.body?.message ||
          error?.message ||
          "Failed to create product. Please review the form and try again.",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-create-page">
      <div className="admin-create-shell">
        <header className="admin-create-hero">
          <div>
            <p className="admin-create-kicker">Catalog Studio</p>
            <h1>Create Product</h1>
            <p className="admin-create-subtitle">
              Start with the product type, then complete a full-width form that matches the
              current frontend catalog and the backend database direction.
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

        <section className="admin-create-stage">
          <div className="admin-create-stage-head">
            <div>
              <p className="admin-create-step">Step 1</p>
              <h2>Choose the product type</h2>
            </div>
            {selectedType ? (
              <div className="admin-create-stage-badge">
                Selected: <strong>{typeConfig?.label}</strong>
              </div>
            ) : null}
          </div>

          <div className="admin-create-type-grid">
            {PRODUCT_TYPE_OPTIONS.map((option) => {
              const isActive = selectedType === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  className={`admin-create-type-card${isActive ? " is-active" : ""}`}
                  onClick={() => handlePickType(option.value)}
                >
                  <span className="admin-create-type-entity">{option.databaseEntity}</span>
                  <strong>{option.label}</strong>
                  <p>{option.databaseSummary}</p>
                </button>
              );
            })}
          </div>
        </section>

        {selectedType ? (
          <div className="admin-create-layout">
            <div className="admin-create-main">
              <section className="admin-create-stage">
                <div className="admin-create-stage-head">
                  <div>
                    <p className="admin-create-step">Step 2</p>
                    <h2>Fill product details</h2>
                  </div>
                </div>

                <AdminProductEditor
                  layout="page"
                  mode="basic"
                  product={draftProduct}
                  intent="create"
                  brandOptions={brandOptions}
                  onClose={handleBackToCatalog}
                  onSubmit={handleSubmit}
                  isSaving={isSaving}
                  feedback={feedback}
                  showTypeSection={false}
                  showMappingSection={false}
                  showCloseButton={false}
                />
              </section>
            </div>

            <aside className="admin-create-side">
              <section className="admin-create-side-card">
                <p className="admin-create-step">Current type</p>
                <h3>{typeConfig?.label}</h3>
                <p>{typeConfig?.databaseSummary}</p>
                <p>
                  <strong>Entity:</strong> {typeConfig?.databaseEntity}
                </p>
                <p>
                  <strong>Fields backend will care about:</strong>{" "}
                  {typeConfig?.databaseColumns.join(", ")}
                </p>
              </section>

              <section className="admin-create-side-card">
                <p className="admin-create-step">Brand library</p>
                <h3>{isLoadingBrands ? "Loading brands..." : `${brandOptions.length} known brands`}</h3>
                <p>
                  Search existing brands in the form or create a new one directly if it does not
                  exist yet.
                </p>
                {!isLoadingBrands && brandOptions.length > 0 ? (
                  <div className="admin-create-brand-list">
                    {brandOptions.slice(0, 10).map((brand) => (
                      <span key={brand}>{brand}</span>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="admin-create-side-card">
                <p className="admin-create-step">Image upload</p>
                <h3>Ready for direct device upload</h3>
                <p>
                  The form already accepts local files from your machine. Right now it stores a
                  preview-safe image payload, and the upload adapter is isolated so Firebase
                  Storage can replace it later without redesigning the screen.
                </p>
              </section>
            </aside>
          </div>
        ) : (
          <section className="admin-create-empty">
            <h2>Select one product type to continue</h2>
            <p>
              This screen is intentionally focused on creation only, so the first decision is the
              business type. After that the form will tailor itself to the fields that matter.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
