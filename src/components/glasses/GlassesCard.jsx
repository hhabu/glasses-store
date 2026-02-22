import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

export default function GlassesCard({ glasses }) {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

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
          <Button variant="primary" onClick={handleShow}>
            Detail
          </Button>
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
          <p><strong>Description:</strong> {glasses.description}</p>
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
