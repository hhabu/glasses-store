import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/ProductsPage.css";
import { readCatalogProducts } from "../utils/productCatalog";
import { computeProductDisplayPricing } from "../utils/pricing";
import { formatVND } from "../utils/currency";

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get("q") || "";
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleAddToCart = (glasses) => {
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch {
      user = null;
    }

    if (!user || user.role !== "CUSTOMER") {
      navigate("/login");
      return;
    }

    const cartItem = {
      id: glasses.id,
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
    const existingIndex = currentCart.findIndex((item) => item.id === glasses.id);

    if (existingIndex >= 0) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(currentCart));
  };

  const filteredGlasses = useMemo(() => {
    const normalizedQuery = normalizeText(searchKeyword);
    if (!normalizedQuery) {
      return products.map((item) => computeProductDisplayPricing(item));
    }

    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return products
      .filter((item) => {
        const searchableText = normalizeText(
          `${item.name} ${item.brand} ${item.color} ${item.category}`
        );

        return queryTokens.every((token) => searchableText.includes(token));
      })
      .map((item) => computeProductDisplayPricing(item));
  }, [products, searchKeyword]);

  const handleDesignGlass = (glasses) => {
    localStorage.setItem("selectedDesignProduct", JSON.stringify(glasses));
    navigate("/design-glasses", { state: { selectedProduct: glasses } });
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

      {isLoading ? (
        <p className="products-empty">Loading products...</p>
      ) : filteredGlasses.length === 0 ? (
        <p className="products-empty">No products found for "{searchKeyword}".</p>
      ) : (
        <div className="product-grid">
          {filteredGlasses.map((item) => (
            <div className="product-card" key={item.id}>
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
                  <button className="product-btn" onClick={() => handleAddToCart(item)}>
                    Add to cart
                  </button>
                  <button
                    className="product-btn product-btn-outline"
                    onClick={() => handleDesignGlass(item)}
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
