// src/pages/HomePage.jsx
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/HomePage.css";
import { readCatalogProducts } from "../utils/productCatalog";
import { computeProductDisplayPricing } from "../utils/pricing";
import { formatVND } from "../utils/currency";
import banner1 from "../assets/ultras/banner1.jpg";
import banner2 from "../assets/ultras/banner2.jpg";

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
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get("q") || "";
  const products = useMemo(() => readCatalogProducts(), []);

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

  const featuredGlasses = filteredGlasses.slice(0, 8);

  const handleDesignGlass = (glasses) => {
    localStorage.setItem("selectedDesignProduct", JSON.stringify(glasses));
    navigate("/design-glasses", { state: { selectedProduct: glasses } });
  };

  return (
    <div className="ultras-home">
      <section className="ultras-hero">
        <div className="hero-card hero-main" style={{ backgroundImage: `url(${banner1})` }}>
          <div className="hero-overlay">
            <p className="hero-eyebrow">Summer Collection</p>
            <h1 className="hero-title">New vision for everyday style.</h1>
            <p className="hero-subtitle">
              Premium eyewear crafted for comfort, clarity, and confidence.
            </p>
            <div className="hero-actions">
              <button className="hero-btn" onClick={() => navigate("/design-glasses")}>
                Shop now
              </button>
              <button
                className="hero-btn hero-btn-outline"
                onClick={() => navigate("/cart")}
              >
                View cart
              </button>
            </div>
          </div>
        </div>

        <div className="hero-card hero-side" style={{ backgroundImage: `url(${banner2})` }}>
          <div className="hero-overlay">
            <p className="hero-eyebrow">Casual Collection</p>
            <h2 className="hero-title">Lightweight frames for every day.</h2>
            <button
              className="hero-btn hero-btn-light"
              onClick={() => navigate("/design-glasses")}
            >
              Shop collection
            </button>
          </div>
        </div>
      </section>

      <section className="ultras-section">
        <div className="section-header">
          <div>
            <p className="section-kicker">Featured</p>
            <h2 className="section-title">Best sellers this week</h2>
            {searchKeyword ? (
              <p className="section-subtitle">
                Search results for "{searchKeyword}" ({filteredGlasses.length} items)
              </p>
            ) : (
              <p className="section-subtitle">
                Handpicked glasses with standout comfort and clarity.
              </p>
            )}
          </div>
          <button className="section-link" onClick={() => navigate("/products")}>
            View all
          </button>
        </div>

        {featuredGlasses.length === 0 ? (
          <p className="ultras-empty">No products found for "{searchKeyword}".</p>
        ) : (
          <div className="product-grid">
            {featuredGlasses.map((item) => (
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
                    <button
                      className="product-btn"
                      onClick={() => handleAddToCart(item)}
                    >
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
      </section>
    </div>
  );
}
