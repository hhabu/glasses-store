import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/HomePage.css";
import { readCatalogProducts } from "../utils/productCatalog";
import { computeProductDisplayPricing } from "../utils/pricing";
import { formatVND } from "../utils/currency";
import {
  buildCategoryTabs,
  normalizeCategoryKey,
} from "../utils/catalogCategories";
import banner1 from "../assets/ultras/banner1.jpg";
import banner2 from "../assets/ultras/banner2.jpg";
import { useAuth } from "../context/AuthContext";
import ActionToast from "../components/common/ActionToast";
import useActionToast from "../hooks/useActionToast";

const SEARCH_ITEMS_PER_PAGE = 8;
const HOME_CATEGORY_LIMIT = 12;

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKeyword = searchParams.get("q") || "";
  const requestedCategoryKey = normalizeCategoryKey(searchParams.get("category") || "");
  const categorySectionRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const catalogProducts = useMemo(
    () =>
      (Array.isArray(products) ? products : []).map((item) =>
        computeProductDisplayPricing(item)
      ),
    [products]
  );

  const categoryTabs = useMemo(() => buildCategoryTabs(catalogProducts), [catalogProducts]);

  const filteredGlasses = useMemo(() => {
    const normalizedQuery = normalizeText(searchKeyword);
    if (!normalizedQuery) {
      return catalogProducts;
    }

    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return catalogProducts.filter((item) => {
      const searchableText = normalizeText(
        `${item.name} ${item.brand} ${item.color} ${item.category}`
      );

      return queryTokens.every((token) => searchableText.includes(token));
    });
  }, [catalogProducts, searchKeyword]);

  const activeCategory = useMemo(
    () => {
      if (categoryTabs.length === 0) {
        return null;
      }

      return (
        categoryTabs.find((category) => category.key === requestedCategoryKey) ??
        categoryTabs[0]
      );
    },
    [categoryTabs, requestedCategoryKey]
  );

  const activeCategorySourceProducts = useMemo(() => {
    if (!activeCategory?.key) {
      return [];
    }

    return catalogProducts.filter(
      (item) => normalizeCategoryKey(item.category) === activeCategory.key
    );
  }, [activeCategory, catalogProducts]);

  const featuredCategoryProducts = useMemo(
    () => activeCategorySourceProducts.slice(0, HOME_CATEGORY_LIMIT),
    [activeCategorySourceProducts]
  );

  const searchTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredGlasses.length / SEARCH_ITEMS_PER_PAGE)),
    [filteredGlasses.length]
  );

  const activeSearchPage = Math.min(currentPage, searchTotalPages);

  const pagedSearchProducts = useMemo(() => {
    const startIndex = (activeSearchPage - 1) * SEARCH_ITEMS_PER_PAGE;
    return filteredGlasses.slice(startIndex, startIndex + SEARCH_ITEMS_PER_PAGE);
  }, [activeSearchPage, filteredGlasses]);

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

  const handleViewAllProducts = () => {
    if (!activeCategory?.key) {
      return;
    }

    const nextSearch = new URLSearchParams({ category: activeCategory.key }).toString();
    navigate(`/products?${nextSearch}`);
  };

  const handleSelectCategory = (categoryKey) => {
    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.set("category", categoryKey);
    setSearchParams(nextSearch);
  };

  const pageNumbers = useMemo(
    () => Array.from({ length: searchTotalPages }, (_, index) => index + 1),
    [searchTotalPages]
  );

  const renderProductCard = (item) => {
    const categoryKey = normalizeCategoryKey(item?.category);
    const isFrameForDesign = categoryKey === "frame_for_design";
    const showAddToCartAction = !isFrameForDesign;
    const showDesignAction = isFrameForDesign;

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
          <div className="product-actions is-single">
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
                  disabled={activeSearchPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`home-pagination-btn${page === activeSearchPage ? " is-active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="home-pagination-btn"
                  disabled={activeSearchPage >= searchTotalPages}
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
              {categoryTabs.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory?.key === category.key}
                  className={`category-tab${activeCategory?.key === category.key ? " is-active" : ""}`}
                  onClick={() => handleSelectCategory(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="category-section">
              <div className="category-section-header">
                <div>
                  <h3 className="category-section-title">
                    {activeCategory?.title || "Category"}
                  </h3>
                  <p className="category-section-subtitle">
                    Showing {Math.min(activeCategorySourceProducts.length, HOME_CATEGORY_LIMIT)} of{" "}
                    {activeCategorySourceProducts.length} products
                  </p>
                </div>
                <button
                  type="button"
                  className="section-link"
                  onClick={handleViewAllProducts}
                >
                  View all
                </button>
              </div>

              {featuredCategoryProducts.length === 0 ? (
                <p className="ultras-empty">No products in this category yet.</p>
              ) : (
                <div className="product-grid">
                  {featuredCategoryProducts.map((item) => renderProductCard(item))}
                </div>
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
