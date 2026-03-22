import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/ProductsPage.css";
import { readCatalogProducts } from "../utils/productCatalog";
import { computeProductDisplayPricing } from "../utils/pricing";
import { formatVND } from "../utils/currency";
import {
  buildCategoryTabs,
  normalizeCategoryKey,
} from "../utils/catalogCategories";
import { useAuth } from "../context/AuthContext";
import ActionToast from "../components/common/ActionToast";
import useActionToast from "../hooks/useActionToast";

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PRICE_RANGES = [
  { id: "under-500", label: "Under 500.000" },
  { id: "500-1000", label: "500.000 to 1.000.000" },
  { id: "above-1000", label: "More than 1.000.000" },
];

export default function ProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKeyword = searchParams.get("q") || "";
  const requestedCategoryKey = normalizeCategoryKey(searchParams.get("category") || "");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [sortOrder, setSortOrder] = useState(null);
  const filterRef = useRef(null);
  const sortRef = useRef(null);
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
    if (!isFilterOpen && !isSortOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      const filterNode = filterRef.current;
      const sortNode = sortRef.current;
      const target = event.target;

      if (
        (filterNode && filterNode.contains(target)) ||
        (sortNode && sortNode.contains(target))
      ) {
        return;
      }

      setIsFilterOpen(false);
      setIsSortOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isFilterOpen, isSortOpen]);

  const catalogProducts = useMemo(
    () =>
      (Array.isArray(products) ? products : []).map((item) =>
        computeProductDisplayPricing(item)
      ),
    [products]
  );

  const categoryTabs = useMemo(() => buildCategoryTabs(catalogProducts), [catalogProducts]);

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

  const categoryProducts = useMemo(() => {
    if (!activeCategory?.key) {
      return [];
    }

    return catalogProducts.filter(
      (item) => normalizeCategoryKey(item.category) === activeCategory.key
    );
  }, [activeCategory, catalogProducts]);

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

  const brandOptions = useMemo(() => {
    const unique = new Set();
    categoryProducts.forEach((item) => {
      if (item?.brand) {
        unique.add(item.brand);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [categoryProducts]);

  const filteredGlasses = useMemo(() => {
    const normalizedQuery = normalizeText(searchKeyword);
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    let nextList = categoryProducts;

    if (queryTokens.length > 0) {
      nextList = nextList.filter((item) => {
        const searchableText = normalizeText(
          `${item.name} ${item.brand} ${item.color} ${item.category}`
        );

        return queryTokens.every((token) => searchableText.includes(token));
      });
    }

    if (selectedBrands.length > 0) {
      nextList = nextList.filter((item) => selectedBrands.includes(item.brand));
    }

    if (selectedPriceRange !== "all") {
      nextList = nextList.filter((item) => {
        const price = item.pricingView?.finalPrice ?? item.price ?? 0;
        if (selectedPriceRange === "under-500") {
          return price < 500000;
        }
        if (selectedPriceRange === "500-1000") {
          return price >= 500000 && price <= 1000000;
        }
        if (selectedPriceRange === "above-1000") {
          return price > 1000000;
        }
        return true;
      });
    }

    if (sortOrder) {
      nextList = [...nextList].sort((a, b) => {
        const priceA = a.pricingView?.finalPrice ?? a.price ?? 0;
        const priceB = b.pricingView?.finalPrice ?? b.price ?? 0;
        return sortOrder === "asc" ? priceA - priceB : priceB - priceA;
      });
    }

    return nextList;
  }, [categoryProducts, searchKeyword, selectedBrands, selectedPriceRange, sortOrder]);

  const handleDesignGlass = (glasses) => {
    if (!ensureCustomer()) {
      return;
    }
    localStorage.setItem("selectedDesignProduct", JSON.stringify(glasses));
    navigate("/design-glasses", { state: { selectedProduct: glasses } });
  };

  const handleOpenDetail = (glasses) => {
    navigate(`/products/${glasses.product_id}`, { state: { product: glasses } });
  };

  const handleToggleBrand = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((item) => item !== brand) : [...prev, brand]
    );
  };

  const handleResetFilters = () => {
    setSelectedBrands([]);
    setSelectedPriceRange("all");
    setSortOrder(null);
  };

  const handleSelectCategory = (categoryKey) => {
    setSelectedBrands([]);
    setSelectedPriceRange("all");
    setSortOrder(null);
    setIsFilterOpen(false);
    setIsSortOpen(false);

    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.set("category", categoryKey);
    setSearchParams(nextSearch);
  };

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
              <span className="price-old">
                {formatVND(item.pricingView.originalPrice)}
              </span>
            ) : null}
          </div>
          <div className="product-actions">
            {showAddToCartAction ? (
              <button
                className="product-btn"
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
                className="product-btn product-btn-outline"
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
    <div className="products-page">
      <div className="products-hero">
        <div>
          <p className="products-kicker">Catalog</p>
          <h1>All Products</h1>
          {searchKeyword ? (
            <p className="products-subtitle">
              Search results in {activeCategory?.label || "category"} for "{searchKeyword}" (
              {filteredGlasses.length} items)
            </p>
          ) : (
            <p className="products-subtitle">
              Browse every item in {activeCategory?.label || "this category"}.
            </p>
          )}
        </div>
        <button className="products-back" onClick={() => navigate("/")}>
          Back to home
        </button>
      </div>

      {categoryTabs.length > 0 ? (
        <div className="products-category-tabs" role="tablist" aria-label="All product categories">
          {categoryTabs.map((category) => (
            <button
              key={category.key}
              type="button"
              role="tab"
              aria-selected={activeCategory?.key === category.key}
              className={`products-category-tab${
                activeCategory?.key === category.key ? " is-active" : ""
              }`}
              onClick={() => handleSelectCategory(category.key)}
            >
              {category.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="products-controls">
        <div className="products-results-copy">
          <p className="products-results-label">Showing</p>
          <strong>
            {filteredGlasses.length} / {categoryProducts.length}
          </strong>
          <span>{activeCategory?.label || "Category"} products</span>
        </div>

        <div className="products-control-actions">
          <div className="controls-group" ref={filterRef}>
            <button
              className="control-btn"
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSortOpen(false);
              }}
            >
              Filter
              <span className="control-caret">v</span>
            </button>
            {isFilterOpen ? (
              <div className="control-menu">
                <div className="control-section">
                  <p className="control-title">Brand</p>
                  {brandOptions.length === 0 ? (
                    <p className="control-empty">No brands available.</p>
                  ) : (
                    <div className="control-brand-list">
                      {brandOptions.map((brand) => (
                        <label className="control-option" key={brand}>
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => handleToggleBrand(brand)}
                          />
                          <span>{brand}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="control-section">
                  <p className="control-title">Price range</p>
                  <label className="control-option">
                    <input
                      type="radio"
                      name="price-range"
                      checked={selectedPriceRange === "all"}
                      onChange={() => setSelectedPriceRange("all")}
                    />
                    <span>All</span>
                  </label>
                  {PRICE_RANGES.map((range) => (
                    <label className="control-option" key={range.id}>
                      <input
                        type="radio"
                        name="price-range"
                        checked={selectedPriceRange === range.id}
                        onChange={() => setSelectedPriceRange(range.id)}
                      />
                      <span>{range.label}</span>
                    </label>
                  ))}
                </div>
                <div className="control-actions">
                  <button className="control-clear" type="button" onClick={handleResetFilters}>
                    Clear filters
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="controls-group" ref={sortRef}>
            <button
              className="control-btn"
              type="button"
              onClick={() => {
                setIsSortOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
            >
              Sort by
              <span className="control-caret">v</span>
            </button>
            {isSortOpen ? (
              <div className="control-menu control-menu-sort">
                <button
                  className={`control-option-btn ${sortOrder === "asc" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => {
                    setSortOrder("asc");
                    setIsSortOpen(false);
                  }}
                >
                  Price: Low-High
                </button>
                <button
                  className={`control-option-btn ${sortOrder === "desc" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => {
                    setSortOrder("desc");
                    setIsSortOpen(false);
                  }}
                >
                  Price: High-Low
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="products-empty">Loading products...</p>
      ) : filteredGlasses.length === 0 ? (
        <p className="products-empty">
          {searchKeyword
            ? `No products found for "${searchKeyword}" in this category.`
            : "No products found in this category."}
        </p>
      ) : (
        <div className="product-grid">
          {filteredGlasses.map((item) => renderProductCard(item))}
        </div>
      )}
      {toast.message ? (
        <ActionToast key={toast.key} message={toast.message} />
      ) : null}
    </div>
  );
}
