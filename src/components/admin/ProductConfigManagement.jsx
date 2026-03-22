import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminProductCard from "./AdminProductCard";
import AdminProductEditor from "./AdminProductEditor";
import {
  readCatalogProducts,
  updateCatalogProduct,
} from "../../utils/productCatalog";
import {
  getBrandOptions,
  inferProductType,
  PRODUCT_TYPE_OPTIONS,
} from "../../utils/adminProductTypes";
import "../../styles/AdminProductManagement.css";

const ITEMS_PER_PAGE = 12;

function matchesSearch(product, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const searchable = [
    product?.name,
    product?.brand,
    product?.color,
    product?.category,
    product?.product_type,
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalizedQuery);
}

export default function ProductConfigManagement({
  title = "Product Configuration Management",
  mode = "basic",
}) {
  const isPricingMode = mode === "pricing";
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [editorProduct, setEditorProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const hasEditorOpen = isPricingMode && Boolean(editorProduct);

  useEffect(() => {
    let isMounted = true;
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
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const brandOptions = useMemo(() => getBrandOptions(products), [products]);

  const filteredProducts = useMemo(() => {
    return (Array.isArray(products) ? products : []).filter((product) => {
      const type = inferProductType(product);
      const matchesType = typeFilter === "ALL" ? true : type === typeFilter;
      return matchesType && matchesSearch(product, searchValue);
    });
  }, [products, searchValue, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    const productMessage = location.state?.productMessage;
    if (!productMessage) {
      return;
    }

    setFeedback({
      type: "success",
      message: productMessage,
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const openCreateStudio = (type = PRODUCT_TYPE_OPTIONS[0].value) => {
    const search = new URLSearchParams({ type }).toString();
    navigate(`/admin/products/new?${search}`);
  };

  const openEditEditor = (product) => {
    const productId = String(product?.product_id ?? product?.id ?? "");
    if (!productId) {
      return;
    }

    if (isPricingMode) {
      setFeedback(null);
      setEditorProduct(product);
      return;
    }

    navigate(`/admin/products/${productId}/edit`);
  };

  const openDetailEditor = (product) => {
    const productId = String(product?.product_id ?? product?.id ?? "");
    if (!productId) {
      return;
    }

    navigate(`/admin/products/${productId}/edit`);
  };

  const handleCloseEditor = () => {
    setFeedback(null);
    setEditorProduct(null);
  };

  const handleSubmitProduct = async (nextProduct) => {
    setFeedback(null);
    try {
      setIsSaving(true);

      const savedProduct = await updateCatalogProduct(nextProduct);
      setProducts((prev) =>
        prev.map((item) =>
          String(item.product_id ?? item.id) ===
          String(savedProduct.product_id ?? savedProduct.id)
            ? savedProduct
            : item
        )
      );
      setEditorProduct(savedProduct);
      setFeedback({
        type: "success",
        message: isPricingMode
          ? "Pricing updated successfully."
          : "Product updated successfully.",
      });
      return savedProduct;
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error?.body?.message ||
          error?.message ||
          "Failed to save product. Please try again.",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`admin-product-layout${hasEditorOpen ? " has-editor-open" : ""}`}>
      <div className="admin-product-main">
        <div className="admin-product-toolbar">
          <div>
            <h2>{title}</h2>
            <p className="admin-product-toolbar-copy">
              {isPricingMode
                ? "Adjust promotions in a dedicated side panel."
                : "Add products by business type, then keep frontend categories aligned with backend entities."}
            </p>
          </div>

          {!isPricingMode ? (
            <button
              type="button"
              className="admin-product-primary-btn"
              onClick={() => openCreateStudio()}
            >
              Add Product
            </button>
          ) : null}
        </div>

        {feedback?.message && !hasEditorOpen ? (
          <div className={`admin-product-feedback is-${feedback.type || "info"}`}>
            {feedback.message}
          </div>
        ) : null}

        {!isPricingMode ? (
          <div className="admin-product-quick-add">
            <span>Quick add by type</span>
            <div className="admin-product-quick-add-list">
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className="admin-product-quick-add-btn"
                  onClick={() => openCreateStudio(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="admin-product-controls">
          <label className="admin-product-search">
            <span>Search</span>
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by name, brand, color, category"
            />
          </label>

          <div className="admin-product-filter-group">
            <span>Filter type</span>
            <div className="admin-product-filter-list">
              <button
                type="button"
                className={`admin-product-filter-btn${typeFilter === "ALL" ? " is-active" : ""}`}
                onClick={() => setTypeFilter("ALL")}
              >
                All
              </button>
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`admin-product-filter-btn${
                    typeFilter === option.value ? " is-active" : ""
                  }`}
                  onClick={() => setTypeFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-product-summary">
          <div className="admin-product-summary-card">
            <span>Visible products</span>
            <strong>{filteredProducts.length}</strong>
          </div>
          <div className="admin-product-summary-card">
            <span>Known brands</span>
            <strong>{brandOptions.length}</strong>
          </div>
          <div className="admin-product-summary-card">
            <span>Editor mode</span>
            <strong>{isPricingMode ? "Pricing" : "Catalog"}</strong>
          </div>
        </div>

        {isLoading ? (
          <p className="admin-product-empty">Loading products...</p>
        ) : pageItems.length === 0 ? (
          <div className="admin-product-empty">
            <p>No products match the current filter.</p>
            {!isPricingMode ? (
              <button
                type="button"
                className="admin-product-primary-btn"
                onClick={() => openCreateStudio()}
              >
                Create the first product
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="admin-product-grid">
              {pageItems.map((product) => (
                <AdminProductCard
                  key={String(product.product_id ?? product.id)}
                  product={product}
                  mode={mode}
                  onOpenEditor={openEditEditor}
                  onOpenPreview={openDetailEditor}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="admin-pagination">
                <button
                  className="page-btn"
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>

                <div className="page-list">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        className={`page-btn ${page === currentPage ? "is-active" : ""}`}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="page-btn"
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {hasEditorOpen ? (
        <div className="admin-product-side">
          <AdminProductEditor
            mode={mode}
            product={editorProduct}
            intent="edit"
            brandOptions={brandOptions}
            onClose={handleCloseEditor}
            onSubmit={handleSubmitProduct}
            isSaving={isSaving}
            feedback={feedback}
          />
        </div>
      ) : null}
    </div>
  );
}
