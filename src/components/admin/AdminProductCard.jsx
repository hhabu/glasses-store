import { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { formatVND } from "../../utils/currency";
import {
  computeProductDisplayPricing,
  normalizeProductPricing,
  SALE_OVERRIDE_TYPE,
} from "../../utils/pricing";

export default function AdminProductCard({ product, onSave, mode = "basic" }) {
  const normalizedProduct = normalizeProductPricing(product);
  const display = computeProductDisplayPricing(normalizedProduct);
  const isPricingMode = mode === "pricing";
  const [show, setShow] = useState(false);
  const [editData, setEditData] = useState({ ...normalizedProduct });

  const handleChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const handleSaleOverrideChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        saleOverride: {
          ...prev.pricing.saleOverride,
          [field]: value,
        },
      },
    }));
  };

  const handleSave = () => {
    const normalized = normalizeProductPricing(editData);
    onSave(normalized);
    setEditData(normalized);
    setShow(false);
  };

  return (
    <>
      {/* CARD */}
      <Card className="glasses-card">
        <Card.Img variant="top" src={normalizedProduct.image} />
        <Card.Body>
          <Card.Title>{normalizedProduct.name}</Card.Title>
          <Card.Text>
            {display.pricingView.isOnSale ? (
              <>
                <strong>{formatVND(display.pricingView.finalPrice)}</strong>
                {" "}
                <span style={{ textDecoration: "line-through", opacity: 0.7 }}>
                  {formatVND(display.pricingView.originalPrice)}
                </span>
                {" "}
                <span style={{ color: "#d9534f" }}>
                  -{display.pricingView.discountPercent}%
                </span>
              </>
            ) : (
              formatVND(display.pricingView.originalPrice)
            )}
          </Card.Text>
          <Button variant="warning" onClick={() => setShow(true)}>
            {isPricingMode ? "Set Discount" : "Update"}
          </Button>
        </Card.Body>
      </Card>

      {/* MODAL */}
      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {isPricingMode ? "Product Discount Settings" : "Update Product"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {!isPricingMode ? (
            <>
              {[
                "name",
                "rating",
                "image",
                "color",
                "brand",
                "category",
                "width",
              ].map((field) => (
                <div key={field} style={{ marginBottom: "10px" }}>
                  <label>{field}</label>
                  <input
                    className="form-control"
                    value={editData[field]}
                    onChange={(e) =>
                      handleChange(
                        field,
                        field === "rating" ? Number(e.target.value) : e.target.value
                      )
                    }
                  />
                </div>
              ))}

              <div style={{ marginBottom: "10px" }}>
                <label>Base Price</label>
                <input
                  className="form-control"
                  type="number"
                  value={editData.pricing?.basePrice ?? editData.price ?? 0}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      price: Number(e.target.value) || 0,
                      pricing: {
                        ...prev.pricing,
                        basePrice: Number(e.target.value) || 0,
                        saleOverride: {
                          ...prev.pricing.saleOverride,
                          salePrice: Math.min(
                            Number(prev.pricing.saleOverride?.salePrice ?? 0),
                            Number(e.target.value) || 0
                          ),
                        },
                      },
                    }))
                  }
                />
              </div>
            </>
          ) : (
            <>
              <p style={{ marginBottom: "8px" }}>
                <strong>{editData.name}</strong> | Base Price:{" "}
                {formatVND(editData.pricing?.basePrice ?? editData.price ?? 0)}
              </p>
              <p style={{ marginBottom: "12px", color: "#6b4a57" }}>
                Pricing page only controls sale override. Basic product info is read-only.
              </p>

              <h6>Sale Override (MVP)</h6>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(editData.pricing?.saleOverride?.enabled)}
                    onChange={(e) => handleSaleOverrideChange("enabled", e.target.checked)}
                  />
                  Enable sale for this product
                </label>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label>Sale Type</label>
                <select
                  className="form-control"
                  value={editData.pricing?.saleOverride?.type || SALE_OVERRIDE_TYPE.PERCENT}
                  disabled={!editData.pricing?.saleOverride?.enabled}
                  onChange={(e) => handleSaleOverrideChange("type", e.target.value)}
                >
                  <option value={SALE_OVERRIDE_TYPE.PERCENT}>Discount by %</option>
                  <option value={SALE_OVERRIDE_TYPE.FIXED_PRICE}>Fixed sale price</option>
                </select>
              </div>

              {editData.pricing?.saleOverride?.type === SALE_OVERRIDE_TYPE.PERCENT ? (
                <div style={{ marginBottom: "10px" }}>
                  <label>Percent Off (%)</label>
                  <input
                    className="form-control"
                    type="number"
                    min={0}
                    max={95}
                    disabled={!editData.pricing?.saleOverride?.enabled}
                    value={editData.pricing?.saleOverride?.percentOff ?? 0}
                    onChange={(e) =>
                      handleSaleOverrideChange("percentOff", Number(e.target.value) || 0)
                    }
                  />
                </div>
              ) : (
                <div style={{ marginBottom: "10px" }}>
                  <label>Sale Price</label>
                  <input
                    className="form-control"
                    type="number"
                    min={0}
                    max={editData.pricing?.basePrice ?? editData.price ?? 0}
                    disabled={!editData.pricing?.saleOverride?.enabled}
                    value={editData.pricing?.saleOverride?.salePrice ?? 0}
                    onChange={(e) =>
                      handleSaleOverrideChange("salePrice", Number(e.target.value) || 0)
                    }
                  />
                </div>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
