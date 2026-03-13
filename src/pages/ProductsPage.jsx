import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/ProductsPage.css";
import { readCatalogProducts } from "../utils/productCatalog";
import { computeProductDisplayPricing } from "../utils/pricing";
import { formatVND } from "../utils/currency";
import { useAuth } from "../context/AuthContext";

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
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get("q") || "";
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [sortOrder, setSortOrder] = useState(null);
  const filterRef = useRef(null);
  const sortRef = useRef(null);

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

  const handleAddToCart = (glasses) => {
    if (!user || user.role !== "CUSTOMER") {
      navigate("/login");
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
  };

  const brandOptions = useMemo(() => {
    const unique = new Set();
    products.forEach((item) => {
      if (item?.brand) {
        unique.add(item.brand);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredGlasses = useMemo(() => {
    const baseList = (Array.isArray(products) ? products : []).map((item) =>
      computeProductDisplayPricing(item)
    );
    const normalizedQuery = normalizeText(searchKeyword);
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    let nextList = baseList;

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
  }, [products, searchKeyword, selectedBrands, selectedPriceRange, sortOrder]);

  const handleDesignGlass = (glasses) => {
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
  };

  return (
    <div className="products-page">
      <div className="products-hero">
        <div>
          <p className="products-kicker">Catalog</p>
          <h1>All Products</h1>
          {searchKeyword ? (
            <p className="products-subtitle">
              Search results for "{searchKeyword}" ({filteredGlasses.length} items)
            </p>
          ) : (
            <p className="products-subtitle">
              Browse every item available in our store.
            </p>
          )}
        </div>
        <button className="products-back" onClick={() => navigate("/")}>
          Back to home
        </button>
      </div>

      <div className="products-controls">
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
            <span className="control-caret">▾</span>
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
            <span className="control-caret">▾</span>
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

      {isLoading ? (
        <p className="products-empty">Loading products...</p>
      ) : filteredGlasses.length === 0 ? (
        <p className="products-empty">No products found for "{searchKeyword}".</p>
      ) : (
        <div className="product-grid">
          {filteredGlasses.map((item) => (
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
                  <span className="product-badge">
                    -{item.pricingView.discountPercent}%
                  </span>
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
                <button
                  className="product-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart(item);
                  }}
                >
                  Add to cart
                </button>
                <button
                  className="product-btn product-btn-outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDesignGlass(item);
                  }}
                >
                  Design
                </button>
              </div>
            </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
