import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../styles/ProductDetail.css";
import { readCatalogProducts } from "../utils/productCatalog";
import { computeProductDisplayPricing } from "../utils/pricing";
import { formatVND } from "../utils/currency";
import { useAuth } from "../context/AuthContext";

function normalizeId(value) {
  return value === null || value === undefined ? "" : String(value);
}

export default function ProductDetail() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const initialProduct = useMemo(() => {
    if (location.state?.product) {
      return computeProductDisplayPricing(location.state.product);
    }
    return null;
  }, [location.state]);

  const [product, setProduct] = useState(initialProduct);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [notFound, setNotFound] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const relatedListRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);

    readCatalogProducts()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        const list = Array.isArray(data) ? data : [];
        const match = list.find(
          (item) => normalizeId(item.product_id) === normalizeId(productId)
        );
        setCatalogProducts(list);
        if (match) {
          setProduct(computeProductDisplayPricing(match));
        } else {
          setProduct(null);
          setNotFound(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProduct(null);
          setNotFound(true);
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
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    if (!user || user.role !== "CUSTOMER") {
      navigate("/login");
      return;
    }

    const cartItem = {
      id: product.product_id,
      name: product.name,
      brand: product.brand,
      color: product.color,
      image: product.image,
      price: product.pricingView?.finalPrice ?? product.price,
      originalPrice: product.pricingView?.originalPrice ?? product.price,
      discountPercent: product.pricingView?.discountPercent ?? 0,
      quantity: 1,
    };

    const currentCart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingIndex = currentCart.findIndex(
      (item) => item.id === product.product_id
    );

    if (existingIndex >= 0) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(currentCart));
  };

  const handleDesignGlass = () => {
    if (!product) {
      return;
    }

    localStorage.setItem("selectedDesignProduct", JSON.stringify(product));
    navigate("/design-glasses", { state: { selectedProduct: product } });
  };

  const cardMeta = useMemo(() => {
    if (!product) {
      return [];
    }

    return [
      { label: "Brand", value: product.brand },
      { label: "Color", value: product.color },
      { label: "Width", value: product.width },
    ].filter((item) => item.value !== undefined && item.value !== null && item.value !== "");
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product || !product.brand || !product.color) {
      return [];
    }
    const list = (Array.isArray(catalogProducts) ? catalogProducts : []).filter(
      (item) => item.product_id !== product.product_id
    );

    const sameBrandAndColor = list.filter(
      (item) => item.brand === product.brand && item.color === product.color
    );
    const sameBrand = list.filter((item) => item.brand === product.brand);
    const sameColor = list.filter((item) => item.color === product.color);

    const selected =
      sameBrandAndColor.length > 0
        ? sameBrandAndColor
        : sameBrand.length > 0
          ? sameBrand
          : sameColor.length > 0
            ? sameColor
            : list;

    return selected.map((item) => computeProductDisplayPricing(item)).slice(0, 4);
  }, [catalogProducts, product]);

  const scrollRelated = (direction) => {
    const node = relatedListRef.current;
    if (!node) {
      return;
    }
    const amount = Math.round(node.clientWidth * 0.9);
    node.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <div className="product-detail">
        <p className="product-detail-empty">Loading product...</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="product-detail">
        <p className="product-detail-empty">Product not found.</p>
        <button className="product-detail-back" onClick={() => navigate("/products")}>
          Back to catalog
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="product-detail">
        <div className="product-detail-hero">
          <button className="product-detail-back" onClick={() => navigate("/products")}>
            Back to catalog
          </button>
        </div>

        <div className="product-detail-card">
          <div className="product-detail-media">
            <img src={product.image} alt={product.name} className="product-detail-image" />
            {product.pricingView?.isOnSale ? (
              <span className="product-detail-badge">
                -{product.pricingView.discountPercent}%
              </span>
            ) : null}
          </div>

          <div className="product-detail-info">
            <h1 className="product-detail-title">{product.name}</h1>

            <div className="product-detail-price">
              <span className="product-detail-price-now">
                {formatVND(product.pricingView?.finalPrice ?? product.price)}
              </span>
              {product.pricingView?.isOnSale ? (
                <span className="product-detail-price-old">
                  {formatVND(product.pricingView.originalPrice)}
                </span>
              ) : null}
            </div>

            <div className="product-detail-specs">
              {cardMeta.map((item) => (
                <p key={item.label}>
                  <strong>{item.label}:</strong> {item.value}
                </p>
              ))}
            </div>

            <div className="product-detail-actions">
              <button className="product-detail-btn" onClick={handleAddToCart}>
                Add to cart
              </button>
              <button
                className="product-detail-btn product-detail-btn-outline"
                onClick={handleDesignGlass}
              >
                Design
              </button>
            </div>
          </div>
        </div>

        {product.description ? (
          <div className="product-detail-description">
            <h2 className="product-detail-description-title">Description</h2>
            <p>{product.description}</p>
          </div>
        ) : null}

        {relatedProducts.length > 0 ? (
          <div className="product-detail-related">
            <div className="product-detail-related-header">
              <h2 className="product-detail-related-title">Related products</h2>
              <div className="product-detail-related-controls">
                <button
                  className="product-detail-related-btn"
                  type="button"
                  onClick={() => scrollRelated("prev")}
                >
                  Prev
                </button>
                <button
                  className="product-detail-related-btn"
                  type="button"
                  onClick={() => scrollRelated("next")}
                >
                  Next
                </button>
              </div>
            </div>
            <div className="product-detail-related-list" ref={relatedListRef}>
              {relatedProducts.map((item) => (
                <button
                  key={item.product_id}
                  className="product-detail-related-card"
                  onClick={() =>
                    navigate(`/products/${item.product_id}`, { state: { product: item } })
                  }
                >
                  <div className="product-detail-related-image-wrap">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="product-detail-related-image"
                    />
                  </div>
                  <div className="product-detail-related-body">
                    <span className="product-detail-related-name">{item.name}</span>
                    <span className="product-detail-related-price">
                      {formatVND(item.pricingView?.finalPrice ?? item.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
