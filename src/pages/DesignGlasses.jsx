import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import lensList from "../data/LensList";
import { formatVND } from "../utils/currency";

function readSelectedProductFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("selectedDesignProduct"));
  } catch {
    return null;
  }
}

export default function DesignGlasses() {
  const location = useLocation();
  const navigate = useNavigate();
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

    const cartItemId = `${selectedProduct.id}-${selectedLens.id}`;
    const cartItem = {
      id: cartItemId,
      frameId: selectedProduct.id,
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
    <div style={styles.container}>
      <h1 style={styles.title}>Design Glasses</h1>
      <p style={styles.description}>
        Choose a frame and lens type that matches your vision needs.
      </p>

      {selectedProduct ? (
        <div style={styles.productCard}>
          <img
            src={selectedProduct.image}
            alt={selectedProduct.name}
            style={styles.productImage}
          />
          <div>
            <h3 style={styles.sectionTitle}>Selected frame</h3>
            <p style={styles.text}><strong>Name:</strong> {selectedProduct.name}</p>
            <p style={styles.text}><strong>Brand:</strong> {selectedProduct.brand}</p>
            <p style={styles.text}><strong>Color:</strong> {selectedProduct.color}</p>
            <p style={styles.text}><strong>Price:</strong> {formatVND(selectedProduct.price)}</p>
            <button style={styles.removeButton} onClick={handleRemoveSelectedProduct}>
              Remove selected frame
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.warningBox}>
          <p style={styles.warning}>
            No product selected yet. Please choose "Design glass" from a product modal.
          </p>
          <button style={styles.goHomeButton} onClick={() => navigate("/")}>
            Go to HomePage to choose frames
          </button>
        </div>
      )}

      <h3 style={styles.sectionTitle}>Choose lens</h3>
      <div style={styles.lensGrid}>
        {lensList.map((lens) => {
          const isActive = selectedLensId === lens.id;
          return (
            <button
              key={lens.id}
              onClick={() => setSelectedLensId(lens.id)}
              style={{
                ...styles.lensCard,
                ...(isActive ? styles.lensCardActive : {}),
              }}
            >
              <h4 style={styles.lensName}>{lens.name}</h4>
              <p style={styles.text}>{lens.description}</p>
              <p style={styles.text}><strong>Type:</strong> {lens.type}</p>
              <p style={styles.text}><strong>Material:</strong> {lens.material}</p>
              <p style={styles.text}><strong>Coating:</strong> {lens.coating}</p>
              <p style={styles.lensPrice}>+ {formatVND(lens.price)}</p>
            </button>
          );
        })}
      </div>

      {selectedProduct && selectedLens ? (
        <div style={styles.summary}>
          <h3 style={styles.sectionTitle}>Current selection</h3>
          <p style={styles.text}>
            {selectedProduct.name} + {selectedLens.name}
          </p>
          <p style={styles.totalPrice}>
            Estimated total: {formatVND(selectedProduct.price + selectedLens.price)}
          </p>
          <button style={styles.addToCartButton} onClick={handleAddDesignedToCart}>
            Add To Cart
          </button>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "40px auto",
    padding: "0 16px",
  },
  title: {
    marginBottom: "12px",
    color: "var(--pink-primary)",
  },
  description: {
    color: "var(--pink-primary)",
    lineHeight: 1.6,
    marginBottom: "20px",
  },
  productCard: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: "16px",
    alignItems: "center",
    border: "1px solid #f2d7dd",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "20px",
    backgroundColor: "#fff",
  },
  productImage: {
    width: "120px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "8px",
  },
  sectionTitle: {
    margin: "8px 0",
    color: "#8a2c4f",
  },
  text: {
    margin: "4px 0",
    color: "#5e3b4a",
    lineHeight: 1.5,
    textAlign: "left",
  },
  warning: {
    border: "1px dashed #d8a5b8",
    borderRadius: "10px",
    padding: "12px",
    color: "#8a2c4f",
    marginBottom: "10px",
  },
  warningBox: {
    marginBottom: "20px",
  },
  goHomeButton: {
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    backgroundColor: "var(--pink-primary)",
    color: "#fff",
    cursor: "pointer",
  },
  lensGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "12px",
  },
  lensCard: {
    border: "1px solid #f2d7dd",
    borderRadius: "10px",
    padding: "12px",
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  lensCardActive: {
    border: "2px solid #bf4b77",
    boxShadow: "0 0 0 2px rgba(191, 75, 119, 0.15)",
  },
  lensName: {
    margin: "0 0 8px 0",
    color: "#8a2c4f",
    textAlign: "left",
  },
  lensPrice: {
    margin: "8px 0 0 0",
    color: "#bf4b77",
    fontWeight: 700,
    textAlign: "left",
  },
  summary: {
    marginTop: "20px",
    borderTop: "1px solid #f2d7dd",
    paddingTop: "12px",
  },
  totalPrice: {
    marginTop: "8px",
    color: "#8a2c4f",
    fontWeight: 700,
  },
  removeButton: {
    marginTop: "10px",
    border: "none",
    borderRadius: "8px",
    padding: "8px 12px",
    backgroundColor: "#111827",
    color: "#fff",
    cursor: "pointer",
  },
  addToCartButton: {
    marginTop: "10px",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    backgroundColor: "var(--pink-primary)",
    color: "#fff",
    cursor: "pointer",
  },
};
