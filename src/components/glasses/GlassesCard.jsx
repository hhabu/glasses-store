import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useNavigate } from "react-router-dom";
import { formatVND } from "../../utils/currency";
import { computeProductDisplayPricing } from "../../utils/pricing";

export default function GlassesCard({ glasses, onAddToCart }) {
  const display = computeProductDisplayPricing(glasses);
  const navigate = useNavigate();

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(display);
    }
  };
  const handleOpenDetail = () => {
    navigate(`/products/${display.product_id}`, { state: { product: display } });
  };

  return (
    <Card className="glasses-card" onClick={handleOpenDetail}>
      <div className="glasses-card-media">
        <Card.Img variant="top" src={display.image} />
      </div>
      <Card.Body>
        <Card.Title className="card-product-name">{display.name}</Card.Title>
        <p className="card-product-brand">Brand: {display.brand}</p>
        <p className="card-product-rating">
          <span className="rating-stars">{"*".repeat(display.rating || 0)}</span>
          <span className="rating-value">{display.rating || 0}/5</span>
        </p>
        <p className="card-product-price">
          {display.pricingView?.isOnSale ? (
            <>
              <strong>{formatVND(display.pricingView.finalPrice)}</strong>{" "}
              <span style={{ textDecoration: "line-through", opacity: 0.7 }}>
                {formatVND(display.pricingView.originalPrice)}
              </span>
            </>
          ) : (
            formatVND(display.pricingView?.originalPrice ?? display.price)
          )}
        </p>
        {onAddToCart ? (
          <Button
            variant="outline-dark"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleAddToCart();
            }}
          >
            Add to cart
          </Button>
        ) : null}
      </Card.Body>
    </Card>
  );
}
