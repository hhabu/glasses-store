import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useNavigate } from "react-router-dom";
import { formatVND } from "../../utils/currency";

const MODAL_LAYOUT = "marketplace"; // switch to "classic" to restore previous modal

export default function GlassesCard({ glasses, onAddToCart }) {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(glasses);
    }
  };
  const handleDesignGlass = () => {
    localStorage.setItem("selectedDesignProduct", JSON.stringify(glasses));
    navigate("/design-glasses", { state: { selectedProduct: glasses } });
  };

  return (
    <>
      {/* CARD */}
      <Card className="glasses-card" onClick={handleShow}>
        <Card.Img variant="top" src={glasses.image} />
        <Card.Body>
          <Card.Title className="card-product-name">{glasses.name}</Card.Title>
          <p className="card-product-brand">Brand: {glasses.brand}</p>
          <p className="card-product-rating">
            <span className="rating-stars">{"*".repeat(glasses.rating || 0)}</span>
            <span className="rating-value">{glasses.rating || 0}/5</span>
          </p>
          <p className="card-product-price">{formatVND(glasses.price)}</p>
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
                    <img
                      src={glasses.image}
                      alt={glasses.name}
                      className="marketplace-main-image"
                    />
                  </div>
                </div>
              </div>

              <div className="marketplace-right">
                <h2 className="marketplace-title">{glasses.name}</h2>

                <div className="marketplace-rating-row">
                  <span className="marketplace-rating-score">4.9</span>
                  <span className="marketplace-stars">*****</span>
                  <span className="marketplace-reviews">158 Reviews</span>
                </div>

                <div className="marketplace-flash">FLASH SALE</div>

                <div className="marketplace-price-box">
                  <span className="marketplace-price-now">{formatVND(glasses.price)}</span>
                  <span className="marketplace-price-old">{formatVND(Math.round(glasses.price * 1.3))}</span>
                  <span className="marketplace-discount">-23%</span>
                </div>

                <div className="marketplace-info-list">
                  <p><strong>Brand:</strong> {glasses.brand}</p>
                  <p><strong>Color:</strong> {glasses.color}</p>
                  <p><strong>Width:</strong> {glasses.width}</p>
                  <p><strong>Quantity:</strong> {glasses.quantity}</p>
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
              <Modal.Title>{glasses.name}</Modal.Title>
            </Modal.Header>

            <Modal.Body className="glasses-modal-body">
              <div className="glasses-modal-image-wrap">
                <img src={glasses.image} alt={glasses.name} className="glasses-modal-image" />
              </div>

              <div className="glasses-modal-info">
                <h4 className="glasses-modal-name">{glasses.name}</h4>
                <p><strong>Brand:</strong> {glasses.brand}</p>
                <p><strong>Color:</strong> {glasses.color}</p>
                <p><strong>Width:</strong> {glasses.width}</p>
                <p><strong>Price:</strong> {formatVND(glasses.price)}</p>
                <p><strong>Quantity:</strong> {glasses.quantity}</p>

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
