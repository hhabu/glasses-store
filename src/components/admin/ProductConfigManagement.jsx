// components/admin/ProductConfigManagement.jsx
import { useMemo, useEffect, useState } from "react";
import AdminProductCard from "./AdminProductCard";
import { readCatalogProducts, updateCatalogProduct } from "../../utils/productCatalog";
import "../../styles/Glasses.css";

const ITEMS_PER_PAGE = 12;

export default function ProductConfigManagement({
  title = "Product Configuration Management",
  mode = "basic",
}) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return products.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [products, currentPage]);

  const handleSaveProduct = async (updatedProduct) => {
    try {
      const savedProduct = await updateCatalogProduct(updatedProduct);
      setProducts((prev) =>
        prev.map((item) =>
          String(item.product_id) === String(savedProduct.product_id)
            ? savedProduct
            : item
        )
      );
      window.alert("Update successfully");
      return savedProduct;
    } catch (error) {
      console.error("Failed to sync product with API:", error);
      window.alert("Update failed");
      throw error;
    }
  };

  return (
    <>
      <h2>{title}</h2>

      {isLoading ? (
        <p>Loading products...</p>
      ) : (
        <>
          <div className="glasses-grid">
            {pageItems.map((product) => (
              <AdminProductCard
                key={product.product_id}
                product={product}
                onSave={handleSaveProduct}
                mode={mode}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="admin-pagination">
              <button
                className="page-btn"
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>

              <div className="page-list">
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      className={`page-btn ${page === currentPage ? "is-active" : ""}`}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                className="page-btn"
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
