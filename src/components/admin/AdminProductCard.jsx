import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

export default function AdminProductCard({ product, onSave }) {
  const [show, setShow] = useState(false);
  const [editData, setEditData] = useState({ ...product });

  const handleChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  return (
    <>
      {/* CARD */}
      <Card className="glasses-card">
        <Card.Img variant="top" src={product.image} />
        <Card.Body>
          <Card.Title>{product.name}</Card.Title>
          <Card.Text>{product.price.toLocaleString()} VND</Card.Text>
          <Button variant="warning" onClick={() => setShow(true)}>
            Update
          </Button>
        </Card.Body>
      </Card>

      {/* MODAL */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Product</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {[
            "name",
            "rating",
            "image",
            "color",
            "brand",
            "category",
            "width",
            "price",
          ].map((field) => (
            <div key={field} style={{ marginBottom: "10px" }}>
              <label>{field}</label>
              <input
                className="form-control"
                value={editData[field]}
                onChange={(e) =>
                  handleChange(
                    field,
                    field === "price" || field === "rating"
                      ? Number(e.target.value)
                      : e.target.value
                  )
                }
              />
            </div>
          ))}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => {
              onSave(editData);
              setShow(false);
            }}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
