import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import lensList from "../data/LensList";
import { formatVND } from "../utils/currency";

export default function DesignGlasses() {
  const location = useLocation();
  const [selectedLensId, setSelectedLensId] = useState(lensList[0]?.id || "");

  const selectedProduct = useMemo(() => {
    if (location.state?.selectedProduct) {
      localStorage.setItem(
        "selectedDesignProduct",
        JSON.stringify(location.state.selectedProduct)
      );
      return location.state.selectedProduct;
    }

    try {
      return JSON.parse(localStorage.getItem("selectedDesignProduct"));
    } catch {
      return null;
    }
  }, [location.state]);

  const selectedLens = lensList.find((lens) => lens.id === selectedLensId);

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
          </div>
        </div>
      ) : (
        <p style={styles.warning}>
          Chua co san pham nao duoc chon. Hay chon "Design glass" tu modal san pham.
        </p>
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
    marginBottom: "20px",
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
};
