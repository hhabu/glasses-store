import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

export default function GlassesCard({ glasses, onAddToCart }) {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(glasses);
    }
  };

  return (
    <>
      {/* CARD */}
      <Card className="glasses-card">
        <Card.Img variant="top" src={glasses.image} />
        <Card.Body>
          <Card.Title>{glasses.name}</Card.Title>
          <Card.Text>
            Brand: {glasses.brand} <br />
            Price: ${glasses.price}
          </Card.Text>
          <div className="d-flex gap-2">
            <Button variant="primary" onClick={handleShow}>
              Detail
            </Button>
            <Button variant="success" onClick={handleAddToCart}>
              Add to cart
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* MODAL */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>{glasses.name}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <img
            src={glasses.image}
            alt={glasses.name}
            style={{ width: "100%", marginBottom: "15px" }}
          />
          <p><strong>Brand:</strong> {glasses.brand}</p>
          <p><strong>Color:</strong> {glasses.color}</p>
          <p><strong>Price:</strong> ${glasses.price}</p>
          <p><strong>Width:</strong> {glasses.width}</p>
          <p><strong>Quantity:</strong> {glasses.quantity}</p>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
