// components/admin/ProductConfigManagement.jsx
import { useState, useEffect } from "react";
import AdminProductCard from "./AdminProductCard";
import { readCatalogProducts, saveCatalogProducts } from "../../utils/productCatalog";

export default function ProductConfigManagement({
  title = "Product Configuration Management",
  mode = "basic",
}) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const catalog = readCatalogProducts();
    setProducts(catalog);
  }, []);

  const handleSaveProduct = (updatedProduct) => {
    const updatedList = products.map((p) =>
      p.id === updatedProduct.id ? updatedProduct : p
    );
    const normalized = saveCatalogProducts(updatedList);
    setProducts(normalized);
  };

  return (
    <>
      <h2>{title}</h2>

      <div className="glasses-grid">
        {products.map((product) => (
          <AdminProductCard
            key={product.id}
            product={product}
            onSave={handleSaveProduct}
            mode={mode}
          />
        ))}
      </div>
    </>
  );
}
