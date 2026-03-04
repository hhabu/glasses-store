import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useNavigate } from "react-router-dom";
import { formatVND } from "../../utils/currency";
import { computeProductDisplayPricing } from "../../utils/pricing";

const MODAL_LAYOUT = "marketplace"; // switch to "classic" to restore previous modal

export default function GlassesCard({ glasses, onAddToCart }) {
  const display = computeProductDisplayPricing(glasses);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(display);
    }
  };
  const handleDesignGlass = () => {
    localStorage.setItem("selectedDesignProduct", JSON.stringify(display));
    navigate("/design-glasses", { state: { selectedProduct: display } });
  };

  return (
    <>
      {/* CARD */}
      <Card className="glasses-card" onClick={handleShow}>
        <Card.Img variant="top" src={display.image} />
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
        </Card.Body>
      </Card>

      {/* MODAL */}
      <Modal
        show={show}
        onHide={handleClose}
        centered
        size="xl"
        dialogClassName={`glasses-modal ${
          MODAL_LAYOUT === "marketplace" ? "marketplace-modal" : ""
        }`}
      >
        {MODAL_LAYOUT === "marketplace" ? (
          <>
            <Modal.Header closeButton>
              <Modal.Title>Product Detail</Modal.Title>
            </Modal.Header>

            <Modal.Body className="marketplace-modal-body">
              <div className="marketplace-left">
                <div className="marketplace-main-media">
                  <div className="marketplace-main-image-wrap">
                    <img src={display.image} alt={display.name} className="marketplace-main-image" />
                  </div>
                </div>
              </div>

              <div className="marketplace-right">
                <h2 className="marketplace-title">{display.name}</h2>

                <div className="marketplace-rating-row">
                  <span className="marketplace-rating-score">4.9</span>
                  <span className="marketplace-stars">*****</span>
                  <span className="marketplace-reviews">158 Reviews</span>
                </div>

                {display.pricingView?.isOnSale ? (
                  <div className="marketplace-flash">FLASH SALE</div>
                ) : null}

                <div className="marketplace-price-box">
                  <span className="marketplace-price-now">
                    {formatVND(display.pricingView?.finalPrice ?? display.price)}
                  </span>
                  {display.pricingView?.isOnSale ? (
                    <>
                      <span className="marketplace-price-old">
                        {formatVND(display.pricingView.originalPrice)}
                      </span>
                      <span className="marketplace-discount">
                        -{display.pricingView.discountPercent}%
                      </span>
                    </>
                  ) : null}
                </div>

                <div className="marketplace-info-list">
                  <p><strong>Brand:</strong> {display.brand}</p>
                  <p><strong>Color:</strong> {display.color}</p>
                  <p><strong>Width:</strong> {display.width}</p>
                  <p><strong>Quantity:</strong> {display.quantity}</p>
                </div>

                <div className="marketplace-actions">
                  <Button
                    variant="outline-danger"
                    className="marketplace-btn-add"
                    onClick={handleAddToCart}
                  >
                    Add To Cart
                  </Button>
                  <Button
                    variant="danger"
                    className="marketplace-btn-buy"
                    onClick={handleDesignGlass}
                  >
                    Design glass
                  </Button>
                </div>
              </div>
            </Modal.Body>
          </>
        ) : (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{display.name}</Modal.Title>
            </Modal.Header>

            <Modal.Body className="glasses-modal-body">
              <div className="glasses-modal-image-wrap">
                <img src={display.image} alt={display.name} className="glasses-modal-image" />
              </div>

              <div className="glasses-modal-info">
                <h4 className="glasses-modal-name">{display.name}</h4>
                <p><strong>Brand:</strong> {display.brand}</p>
                <p><strong>Color:</strong> {display.color}</p>
                <p><strong>Width:</strong> {display.width}</p>
                <p>
                  <strong>Price:</strong>{" "}
                  {formatVND(display.pricingView?.finalPrice ?? display.price)}
                </p>
                <p><strong>Quantity:</strong> {display.quantity}</p>

                <Button
                  variant="success"
                  className="glasses-modal-add-btn"
                  onClick={handleAddToCart}
                >
                  Add to cart
                </Button>
              </div>
            </Modal.Body>
          </>
        )}
      </Modal>
    </>
  );
}
