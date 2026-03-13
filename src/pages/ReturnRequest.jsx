import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/ReturnRequest.css";
import { formatVND } from "../utils/currency";

const ORDERS_KEY = "orders";
const RETURN_REQUESTS_KEY = "return_requests";

function readOrders() {
  try {
    const data = JSON.parse(localStorage.getItem(ORDERS_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function readReturnRequests() {
  try {
    const data = JSON.parse(localStorage.getItem(RETURN_REQUESTS_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function buildReturnItems(order) {
  return (order?.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    maxQty: item.quantity,
    quantity: Math.min(1, item.quantity),
    selected: true,
  }));
}

export default function ReturnRequest() {
  const location = useLocation();
  const navigate = useNavigate();
  const orders = useMemo(() => readOrders(), []);
  const deliveredOrders = useMemo(() => {
    return orders.filter(
      (order) => String(order.status || "").toLowerCase() === "delivered"
    );
  }, [orders]);

  const initialOrderId =
    location.state?.order?.id || deliveredOrders[0]?.id || "";
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const selectedOrder = useMemo(() => {
    return deliveredOrders.find((order) => order.id === selectedOrderId) || null;
  }, [deliveredOrders, selectedOrderId]);

  const [returnItems, setReturnItems] = useState(() =>
    buildReturnItems(location.state?.order || deliveredOrders[0])
  );
  const [reason, setReason] = useState("Wrong size");
  const [note, setNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [refundMethod, setRefundMethod] = useState("Store credit");
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState("");

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }
    setReturnItems(buildReturnItems(selectedOrder));
    setContactName(selectedOrder.customer?.fullName || "");
    setContactPhone(selectedOrder.customer?.phone || "");
    setPickupAddress(selectedOrder.customer?.address || "");
    setNote(selectedOrder.customer?.note || "");
  }, [selectedOrder]);

  const handleToggleItem = (itemId) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleQtyChange = (itemId, nextValue) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        const safeValue = Math.max(
          1,
          Math.min(item.maxQty, Number(nextValue) || 1)
        );
        return { ...item, quantity: safeValue };
      })
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setSuccessId("");

    if (!selectedOrder) {
      setError("Please select a delivered order.");
      return;
    }

    const selectedItems = returnItems.filter(
      (item) => item.selected && item.quantity > 0
    );
    if (selectedItems.length === 0) {
      setError("Please select at least one item to return.");
      return;
    }

    if (!reason.trim()) {
      setError("Please choose a return reason.");
      return;
    }

    const requestId = `RET-${Date.now()}`;
    const newRequest = {
      id: requestId,
      orderId: selectedOrder.id,
      accountId: selectedOrder.customer?.id ?? null,
      createdAt: new Date().toISOString(),
      status: "PENDING",
      reason: reason.trim(),
      note: note.trim(),
      refundMethod,
      contact: {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        address: pickupAddress.trim(),
      },
      items: selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    const existing = readReturnRequests();
    localStorage.setItem(
      RETURN_REQUESTS_KEY,
      JSON.stringify([newRequest, ...existing])
    );

    const updatedOrders = orders.map((order) =>
      order.id === selectedOrder.id
        ? { ...order, status: "RETURN_REQUESTED" }
        : order
    );
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders));

    setSuccessId(requestId);
  };

  return (
    <div className="return-page">
      <div className="return-card">
        <p className="return-kicker">Support</p>
        <h2>Return Request</h2>
        <p className="return-subtitle">
          Submit a return request for delivered orders.
        </p>

        {deliveredOrders.length === 0 ? (
          <div className="return-empty">
            <p>No delivered orders found.</p>
            <button className="return-link-btn" onClick={() => navigate("/orders")}>
              Back to Order History
            </button>
          </div>
        ) : (
          <form className="return-form" onSubmit={handleSubmit}>
            <div className="return-field">
              <label htmlFor="orderId">Order</label>
              <select
                id="orderId"
                value={selectedOrderId}
                onChange={(event) => setSelectedOrderId(event.target.value)}
              >
                {deliveredOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id} - {new Date(order.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="return-section">
              <h3>Items to return</h3>
              <div className="return-items">
                {returnItems.map((item) => (
                  <div className="return-item" key={item.id}>
                    <label className="return-item-check">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(item.id)}
                      />
                      <span>{item.name}</span>
                    </label>
                    <div className="return-item-meta">
                      <span>{formatVND(item.price)}</span>
                      <input
                        type="number"
                        min={1}
                        max={item.maxQty}
                        value={item.quantity}
                        onChange={(event) => handleQtyChange(item.id, event.target.value)}
                        disabled={!item.selected}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="return-field">
              <label htmlFor="reason">Reason</label>
              <select
                id="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                <option value="Wrong size">Wrong size</option>
                <option value="Not as described">Not as described</option>
                <option value="Damaged product">Damaged product</option>
                <option value="Changed mind">Changed mind</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="return-field">
              <label htmlFor="note">Detail</label>
              <textarea
                id="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <div className="return-grid">
              <div className="return-field">
                <label htmlFor="contactName">Contact name</label>
                <input
                  id="contactName"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                />
              </div>
              <div className="return-field">
                <label htmlFor="contactPhone">Phone</label>
                <input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="return-field">
              <label htmlFor="pickupAddress">Pickup address</label>
              <input
                id="pickupAddress"
                value={pickupAddress}
                onChange={(event) => setPickupAddress(event.target.value)}
              />
            </div>

            <div className="return-field">
              <label htmlFor="refundMethod">Refund method</label>
              <select
                id="refundMethod"
                value={refundMethod}
                onChange={(event) => setRefundMethod(event.target.value)}
              >
                <option value="Store credit">Store credit</option>
                <option value="Bank transfer">Bank transfer</option>
                <option value="Original payment">Original payment</option>
              </select>
            </div>

            {error ? <p className="return-error">{error}</p> : null}
            {successId ? (
              <p className="return-success">
                Return request submitted. ID: {successId}
              </p>
            ) : null}

            <div className="return-actions">
              <button type="submit" className="return-submit">
                Submit return request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
