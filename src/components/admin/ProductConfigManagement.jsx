// components/admin/ProductConfigManagement.jsx
import { useState, useEffect } from "react";
import AdminProductCard from "./AdminProductCard";
import { readCatalogProducts, updateCatalogProduct } from "../../utils/productCatalog";

export default function ProductConfigManagement({
  title = "Product Configuration Management",
  mode = "basic",
}) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    readCatalogProducts()
      .then((catalog) => {
        if (isMounted) {
          setProducts(Array.isArray(catalog) ? catalog : []);
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

  const handleSaveProduct = (updatedProduct) => {
    updateCatalogProduct(updatedProduct)
      .then((savedProduct) => {
        setProducts((prev) =>
          prev.map((item) => (item.id === savedProduct.id ? savedProduct : item))
        );
      })
      .catch(() => {
        setProducts((prev) => prev);
      });
  };

  return (
    <>
      <h2>{title}</h2>

      {isLoading ? (
        <p>Loading products...</p>
      ) : (
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
      )}
    </>
  );
}
