// src/pages/HomePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/HomePage.css";
import { readCatalogProducts } from "../utils/productCatalog";
import { computeProductDisplayPricing } from "../utils/pricing";
import { formatVND } from "../utils/currency";
import banner1 from "../assets/ultras/banner1.jpg";
import banner2 from "../assets/ultras/banner2.jpg";
import { useAuth } from "../context/AuthContext";
import ActionToast from "../components/common/ActionToast";
import useActionToast from "../hooks/useActionToast";

const ITEMS_PER_PAGE = 8;

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCategoryKey(value) {
  const normalized = (value || "").toLowerCase().replace(/[\s-]+/g, "_").trim();

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

function isLegacyLensCategory(value) {
  const normalized = (value || "").toLowerCase().replace(/[\s-]+/g, "_").trim();
  return normalized === "lens" || normalized === "lenses";
}

const CATEGORY_TABS = [
  {
    key: "readymade_optical",
    label: "Ready made glasses",
    title: "Readymade_Optical",
  },
  {
    key: "sun_glasses",
    label: "Sun glasses",
    title: "Sun glasses",
  },
  {
    key: "lens",
    label: "Contact lens",
    title: "Contact lens",
  },
  {
    key: "frame_for_design",
    label: "Frame for design",
    title: "Frame for design",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get("q") || "";
  const requestedCategoryKey = normalizeCategoryKey(searchParams.get("category") || "");
  const hasRequestedCategory = CATEGORY_TABS.some(
    (category) => category.key === requestedCategoryKey
  );
  const initialCategoryKey = hasRequestedCategory
    ? requestedCategoryKey
    : CATEGORY_TABS[0].key;
  const categorySectionRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryKey);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast, showToast } = useActionToast();

  const ensureCustomer = () => {
    if (!user) {
      navigate("/login");
      return false;
    }
    if (user.role !== "CUSTOMER") {
      navigate("/");
      return false;
    }
    return true;
  };

  useEffect(() => {
    let isMounted = true;
    readCatalogProducts()
      .then((data) => {
        if (isMounted) {
          setProducts(Array.isArray(data) ? data : []);
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

  useEffect(() => {
    if (!hasRequestedCategory) {
      return;
    }
    setSelectedCategory(requestedCategoryKey);
  }, [hasRequestedCategory, requestedCategoryKey]);

  const handleAddToCart = (glasses) => {
    if (!ensureCustomer()) {
      return;
    }

    const cartItem = {
      id: glasses.product_id,
      name: glasses.name,
      brand: glasses.brand,
      color: glasses.color,
      image: glasses.image,
      price: glasses.pricingView?.finalPrice ?? glasses.price,
      originalPrice: glasses.pricingView?.originalPrice ?? glasses.price,
      discountPercent: glasses.pricingView?.discountPercent ?? 0,
      quantity: 1,
    };

    const currentCart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingIndex = currentCart.findIndex(
      (item) => item.id === glasses.product_id
    );

    if (existingIndex >= 0) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(currentCart));
    showToast("Added to cart successfully");
  };

  const filteredGlasses = useMemo(() => {
    const visibleProducts = (Array.isArray(products) ? products : []).filter(
      (item) => !isLegacyLensCategory(item?.category)
    );
    const normalizedQuery = normalizeText(searchKeyword);
    if (!normalizedQuery) {
      return visibleProducts.map((item) => computeProductDisplayPricing(item));
    }

    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return visibleProducts
      .filter((item) => {
      const searchableText = normalizeText(
        `${item.name} ${item.brand} ${item.color} ${item.category}`
      );

      return queryTokens.every((token) => searchableText.includes(token));
      })
      .map((item) => computeProductDisplayPricing(item));
  }, [products, searchKeyword]);

  const activeCategory = useMemo(
    () =>
      CATEGORY_TABS.find((category) => category.key === selectedCategory) ??
      CATEGORY_TABS[0],
    [selectedCategory]
  );

  const activeCategorySourceProducts = useMemo(
    () =>
      filteredGlasses.filter(
        (item) => normalizeCategoryKey(item.category) === activeCategory.key
      ),
    [filteredGlasses, activeCategory]
  );

  const searchTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredGlasses.length / ITEMS_PER_PAGE)),
    [filteredGlasses.length]
  );

  const activeCategoryTotalPages = useMemo(
    () =>
      Math.max(1, Math.ceil(activeCategorySourceProducts.length / ITEMS_PER_PAGE)),
    [activeCategorySourceProducts.length]
  );

  const currentTotalPages = searchKeyword
    ? searchTotalPages
    : activeCategoryTotalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, selectedCategory]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, currentTotalPages));
  }, [currentTotalPages]);

  const pagedSearchProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGlasses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredGlasses, currentPage]);

  const activeCategoryProducts = useMemo(
    () => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return activeCategorySourceProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    },
    [activeCategorySourceProducts, currentPage]
  );

  const handleDesignGlass = (glasses) => {
    if (!ensureCustomer()) {
      return;
    }
    localStorage.setItem("selectedDesignProduct", JSON.stringify(glasses));
    navigate("/design-glasses", { state: { selectedProduct: glasses } });
  };

  const handleViewCart = () => {
    if (!ensureCustomer()) {
      return;
    }
    navigate("/cart");
  };

  const handleOpenDesignStudio = () => {
    if (!ensureCustomer()) {
      return;
    }
    navigate("/design-glasses");
  };

  const handleShopNow = () => {
    categorySectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleOpenDetail = (glasses) => {
    navigate(`/products/${glasses.product_id}`, { state: { product: glasses } });
  };

  const pageNumbers = useMemo(
    () => Array.from({ length: currentTotalPages }, (_, index) => index + 1),
    [currentTotalPages]
  );

  const renderProductCard = (item) => {
    const categoryKey = normalizeCategoryKey(item?.category);
    const isFrameForDesign = categoryKey === "frame_for_design";
    const showAddToCartAction = !isFrameForDesign;
    const showDesignAction = isFrameForDesign;
    const isSingleAction = true;

    return (
      <div
        className="product-card"
        key={item.product_id}
        onClick={() => handleOpenDetail(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpenDetail(item);
          }
        }}
      >
        <div className="product-image-wrap">
          <img src={item.image} alt={item.name} className="product-image" />
          {item.pricingView?.isOnSale ? (
            <span className="product-badge">-{item.pricingView.discountPercent}%</span>
          ) : null}
        </div>
        <div className="product-body">
          <div className="product-meta">
            <span>{item.brand}</span>
            <span>{item.color}</span>
          </div>
          <h3 className="product-title">{item.name}</h3>
          <div className="product-price">
            <span className="price-now">
              {formatVND(item.pricingView?.finalPrice ?? item.price)}
            </span>
            {item.pricingView?.isOnSale ? (
              <span className="price-old">{formatVND(item.pricingView.originalPrice)}</span>
            ) : null}
          </div>
          <div className={`product-actions${isSingleAction ? " is-single" : ""}`}>
            {showAddToCartAction ? (
              <button
                className="product-btn product-btn-single"
                onClick={(event) => {
                  event.stopPropagation();
                  handleAddToCart(item);
                }}
              >
                Add to cart
              </button>
            ) : null}
            {showDesignAction ? (
              <button
                className="product-btn product-btn-outline product-btn-design-single"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDesignGlass(item);
                }}
              >
                Design
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ultras-home">
      <section className="ultras-hero">
        <div className="hero-card hero-main" style={{ backgroundImage: `url(${banner1})` }}>
          <div className="hero-overlay">
            <h1 className="hero-title">Lightweight frames for everyday.</h1>
            <p className="hero-subtitle">
              Premium eyewear crafted for comfort, clarity, and confidence.
            </p>
            <div className="hero-actions">
              <button className="hero-btn" onClick={handleShopNow}>
                Shop now
              </button>
              <button className="hero-btn hero-btn-outline" onClick={handleViewCart}>
                View cart
              </button>
            </div>
          </div>
        </div>

        <div className="hero-card hero-side" style={{ backgroundImage: `url(${banner2})` }}>
          <div className="hero-overlay">
            <h2 className="hero-title">New vision for everyday style.</h2>
            <button className="hero-btn hero-btn-light" onClick={handleOpenDesignStudio}>
              Design Glasses
            </button>
          </div>
        </div>
      </section>

      <section className="ultras-section" ref={categorySectionRef}>
        <div className="section-header">
          <div>
            <p className="section-kicker">{searchKeyword ? "Search" : "Featured Categories"}</p>
            <h2 className="section-title">
              {searchKeyword ? "Best sellers this week" : "Shop by category"}
            </h2>
            {searchKeyword ? (
              <p className="section-subtitle">
                Search results for "{searchKeyword}" ({filteredGlasses.length} items)
              </p>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <p className="ultras-empty">Loading products...</p>
        ) : filteredGlasses.length === 0 ? (
          <p className="ultras-empty">
            {searchKeyword
              ? `No products found for "${searchKeyword}".`
              : "No products found."}
          </p>
        ) : searchKeyword ? (
          <>
            <div className="product-grid">
              {pagedSearchProducts.map((item) => renderProductCard(item))}
            </div>
            {searchTotalPages > 1 ? (
              <div className="home-pagination">
                <button
                  type="button"
                  className="home-pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`home-pagination-btn${
                      page === currentPage ? " is-active" : ""
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="home-pagination-btn"
                  disabled={currentPage >= searchTotalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(searchTotalPages, prev + 1))
                  }
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="category-browser">
            <div className="category-tabs" role="tablist" aria-label="Shop by category">
              {CATEGORY_TABS.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === category.key}
                  className={`category-tab${
                    selectedCategory === category.key ? " is-active" : ""
                  }`}
                  onClick={() => setSelectedCategory(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="category-section">
              <div className="category-section-header">
                <h3 className="category-section-title">{activeCategory.title}</h3>
              </div>

              {activeCategoryProducts.length === 0 ? (
                <p className="ultras-empty">No products in this category yet.</p>
              ) : (
                <>
                  <div className="product-grid">
                    {activeCategoryProducts.map((item) => renderProductCard(item))}
                  </div>
                  {activeCategoryTotalPages > 1 ? (
                    <div className="home-pagination">
                      <button
                        type="button"
                        className="home-pagination-btn"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      >
                        Previous
                      </button>
                      {pageNumbers.map((page) => (
                        <button
                          key={page}
                          type="button"
                          className={`home-pagination-btn${
                            page === currentPage ? " is-active" : ""
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="home-pagination-btn"
                        disabled={currentPage >= activeCategoryTotalPages}
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(activeCategoryTotalPages, prev + 1)
                          )
                        }
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </section>
      {toast.message ? (
        <ActionToast key={toast.key} message={toast.message} />
      ) : null}
    </div>
  );
}
