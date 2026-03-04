// src/pages/HomePage.jsx
import GlassesCard from "../components/glasses/GlassesCard";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/Glasses.css";
import { readCatalogProducts } from "../utils/productCatalog";
import { computeProductDisplayPricing } from "../utils/pricing";

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

  return (
    <div className="glasses-container">
      <h2 className="title">Glasses Collection</h2>

      {filteredGlasses.length === 0 ? (
        <p className="glasses-empty">
          No products found for "{searchParams.get("q") || ""}".
        </p>
      ) : (
        <div className="glasses-grid">
          {filteredGlasses.map((g) => (
            <GlassesCard key={g.id} glasses={g} onAddToCart={handleAddToCart} />
          ))}
        </div>
      )}
    </div>
  );
}
