import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CartPage.css";
import { formatVND } from "../utils/currency";

const CART_KEY = "cart";

function readCartFromStorage() {
  try {
    const data = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState(readCartFromStorage);
  const navigate = useNavigate();

  const saveCart = (nextCart) => {
    setCartItems(nextCart);
    localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
  };

  const handleIncrease = (id) => {
    const nextCart = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    saveCart(nextCart);
  };

  const handleDecrease = (id) => {
    const nextCart = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
    );

    saveCart(nextCart);
  };

  const handleRemove = (id) => {
    saveCart(cartItems.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    saveCart([]);
  };

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  return (
    <div className="cart-page">
      <h2 className="cart-title">Your Cart</h2>

      {cartItems.length === 0 ? (
        <p className="cart-empty">Cart is empty.</p>
      ) : (
        <>
          <div className="cart-list">
            {cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image} alt={item.name} className="cart-item-image" />

                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p>Brand: {item.brand}</p>
                  <p>Color: {item.color}</p>
                  {item.lensName ? <p>Lens: {item.lensName}</p> : null}
                  <p>Price: {formatVND(item.price)}</p>
                </div>

                <div className="cart-item-actions">
                  <div className="qty-control">
                    <button
                      onClick={() => handleDecrease(item.id)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => handleIncrease(item.id)}>+</button>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() => handleRemove(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>Total: {formatVND(totalPrice)}</h3>
            <div className="cart-summary-actions">
              <button className="clear-btn" onClick={handleClearCart}>
                Clear cart
              </button>
              <button
                className="checkout-btn"
                onClick={() => navigate("/checkout")}
              >
                Checkout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
