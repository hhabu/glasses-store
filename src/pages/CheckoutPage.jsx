import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import "../styles/CheckoutPage.css";
import { formatVND } from "../utils/currency";

const CART_KEY = "cart";
const ORDERS_KEY = "orders";

function readCartFromStorage() {
  try {
    const data = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const [cartItems] = useState(readCartFromStorage);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    note: "",
  });

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch {
      user = null;
    }

    const newOrder = {
      id: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customer: {
        id: user?.id ?? null,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        note: formData.note.trim(),
      },
      items: cartItems,
      totalPrice,
      status: "PLACED",
    };

    let orders = [];
    try {
      const stored = JSON.parse(localStorage.getItem(ORDERS_KEY));
      orders = Array.isArray(stored) ? stored : [];
    } catch {
      orders = [];
    }

    localStorage.setItem(ORDERS_KEY, JSON.stringify([newOrder, ...orders]));
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    navigate("/orders", { replace: true, state: { justPlaced: true, orderId: newOrder.id } });
  };

  if (cartItems.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <div className="checkout-page">
      <h2 className="checkout-title">Checkout</h2>

      <div className="checkout-layout">
        <section className="checkout-section">
          <h3>Delivery Information</h3>
          <form className="checkout-form" onSubmit={handleSubmit}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <label htmlFor="address">Address</label>
            <input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />

            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows={3}
            />

            <button type="submit" className="place-order-btn">
              Place Order
            </button>
          </form>
        </section>

        <section className="checkout-section">
          <h3>Your Items</h3>
          <div className="checkout-items">
            {cartItems.map((item) => (
              <div className="checkout-item" key={item.id}>
                <img src={item.image} alt={item.name} className="checkout-item-image" />
                <div className="checkout-item-info">
                  <p className="checkout-item-name">{item.name}</p>
                  <p>Qty: {item.quantity}</p>
                  <p>{formatVND(item.price)}</p>
                </div>
                <p className="checkout-item-subtotal">
                  {formatVND(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="checkout-total">
            <span>Total</span>
            <strong>{formatVND(totalPrice)}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}
