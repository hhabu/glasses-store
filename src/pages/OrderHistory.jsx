import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import "../styles/OrderHistory.css";
import { formatVND } from "../utils/currency";

const ORDERS_KEY = "orders";

function readOrders() {
  try {
    const data = JSON.parse(localStorage.getItem(ORDERS_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function OrderHistory() {
  const location = useLocation();
  const orders = useMemo(() => readOrders(), []);

  return (
    <div className="order-history-page">
      <h2 className="order-history-title">Order History</h2>

      {location.state?.justPlaced ? (
        <p className="order-history-success">
          Order placed successfully. Order ID: {location.state?.orderId}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className="order-history-empty">No orders yet.</p>
      ) : (
        <div className="order-history-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card-header">
                <h3>{order.id}</h3>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>

              <div className="order-customer">
                <p><strong>Name:</strong> {order.customer?.fullName || "-"}</p>
                <p><strong>Phone:</strong> {order.customer?.phone || "-"}</p>
                <p><strong>Address:</strong> {order.customer?.address || "-"}</p>
              </div>

              <div className="order-items">
                {order.items?.map((item) => (
                  <div className="order-item" key={`${order.id}-${item.id}`}>
                    <span>{item.name}</span>
                    <span>x{item.quantity}</span>
                    <span>{formatVND(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="order-total">
                <strong>Total: {formatVND(order.totalPrice || 0)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
