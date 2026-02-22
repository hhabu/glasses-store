// components/admin/ProductConfigManagement.jsx
import { useState, useEffect } from "react";
import glassesList from "../../data/GlassesList";
import AdminProductCard from "./AdminProductCard";

export default function ProductConfigManagement() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("admin_products");
    if (stored) {
      setProducts(JSON.parse(stored));
    } else {
      setProducts(glassesList);
      localStorage.setItem("admin_products", JSON.stringify(glassesList));
    }
  }, []);

  const handleSaveProduct = (updatedProduct) => {
    const updatedList = products.map((p) =>
      p.id === updatedProduct.id ? updatedProduct : p
    );

    setProducts(updatedList);
    localStorage.setItem("admin_products", JSON.stringify(updatedList));
  };

  return (
    <>
      <h2>Product Configuration Management</h2>

      <div className="glasses-grid">
        {products.map((product) => (
          <AdminProductCard
            key={product.id}
            product={product}
            onSave={handleSaveProduct}
          />
        ))}
      </div>
    </>
  );
}
