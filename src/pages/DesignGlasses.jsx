import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import lensList from "../data/LensList";
import "../styles/DesignGlasses.css";
import { formatVND } from "../utils/currency";
import { useAuth } from "../context/AuthContext";

function readSelectedProductFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem("selectedDesignProduct"));
    if (stored && stored.product_id === undefined && stored.id !== undefined) {
      return { ...stored, product_id: stored.id };
    }
    return stored;
  } catch {
    return null;
  }
}

export default function DesignGlasses() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedLensId, setSelectedLensId] = useState(lensList[0]?.id || "");
  const [selectedProduct, setSelectedProduct] = useState(() =>
    location.state?.selectedProduct || readSelectedProductFromStorage()
  );

  useEffect(() => {
    if (location.state?.selectedProduct) {
      setSelectedProduct(location.state.selectedProduct);
      localStorage.setItem(
        "selectedDesignProduct",
        JSON.stringify(location.state.selectedProduct)
      );
    }
  }, [location.state]);

  const selectedLens = lensList.find((lens) => lens.id === selectedLensId);

  const handleRemoveSelectedProduct = () => {
    localStorage.removeItem("selectedDesignProduct");
    setSelectedProduct(null);
  };

  const handleAddDesignedToCart = () => {
    if (!selectedProduct || !selectedLens) {
      return;
    }

    if (!user || user.role !== "CUSTOMER") {
      navigate("/login");
      return;
    }

    const cartItemId = `${selectedProduct.product_id}-${selectedLens.id}`;
    const cartItem = {
      id: cartItemId,
      frameId: selectedProduct.product_id,
      lensId: selectedLens.id,
      name: `${selectedProduct.name} + ${selectedLens.name}`,
      brand: selectedProduct.brand,
      color: selectedProduct.color,
      image: selectedProduct.image,
      price: selectedProduct.price + selectedLens.price,
      quantity: 1,
      lensName: selectedLens.name,
    };

    let currentCart = [];
    try {
      const stored = JSON.parse(localStorage.getItem("cart"));
      currentCart = Array.isArray(stored) ? stored : [];
    } catch {
      currentCart = [];
    }

    const existingIndex = currentCart.findIndex((item) => item.id === cartItemId);
    if (existingIndex >= 0) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(currentCart));
    alert("Added designed glasses to cart.");
  };

  return (
    <div className="design-page">
      <div className="design-hero">
        <p className="design-kicker">Studio</p>
        <h1 className="design-title">Design Glasses</h1>
        <p className="design-subtitle">
          Choose a frame and lens type that matches your vision needs.
        </p>
      </div>

      <div className="design-section">
        <h3 className="design-section-title">Selected frame</h3>
        <p className="design-section-note">
          Pick a frame and then select a lens package to build your custom pair.
        </p>
      </div>

      {selectedProduct ? (
        <div className="design-card">
          <img
            src={selectedProduct.image}
            alt={selectedProduct.name}
            className="design-card-image"
          />
          <div className="design-card-info">
            <h3 className="design-card-title">{selectedProduct.name}</h3>
            <p><strong>Brand:</strong> {selectedProduct.brand}</p>
            <p><strong>Color:</strong> {selectedProduct.color}</p>
            <p><strong>Price:</strong> {formatVND(selectedProduct.price)}</p>
            <button className="design-btn design-btn-dark" onClick={handleRemoveSelectedProduct}>
              Remove selected frame
            </button>
          </div>
        </div>
      ) : (
        <div className="design-empty">
          <p className="design-empty-text">
            No product selected yet. Please choose "Design" from a product detail page.
          </p>
          <button className="design-btn" onClick={() => navigate("/")}>
            Go to HomePage to choose frames
          </button>
        </div>
      )}

      <div className="design-section">
        <h3 className="design-section-title">Choose lens</h3>
      </div>

      <div className="design-lens-grid">
        {lensList.map((lens) => {
          const isActive = selectedLensId === lens.id;
          return (
            <button
              key={lens.id}
              onClick={() => setSelectedLensId(lens.id)}
              className={`design-lens-card ${isActive ? "is-active" : ""}`}
            >
              <h4 className="design-lens-name">{lens.name}</h4>
              <p>{lens.description}</p>
              <p><strong>Type:</strong> {lens.type}</p>
              <p><strong>Material:</strong> {lens.material}</p>
              <p><strong>Coating:</strong> {lens.coating}</p>
              <p className="design-lens-price">+ {formatVND(lens.price)}</p>
            </button>
          );
        })}
      </div>

      {selectedProduct && selectedLens ? (
        <div className="design-summary">
          <h3 className="design-section-title">Current selection</h3>
          <p>
            {selectedProduct.name} + {selectedLens.name}
          </p>
          <p className="design-summary-total">
            Estimated total: {formatVND(selectedProduct.price + selectedLens.price)}
          </p>
          <button className="design-btn" onClick={handleAddDesignedToCart}>
            Add To Cart
          </button>
        </div>
      ) : null}
    </div>
  );
}
