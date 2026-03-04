import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import "../styles/PaymentPage.css";
import { formatVND } from "../utils/currency";

const ORDERS_KEY = "orders";
const CART_KEY = "cart";
const ONLINE_METHOD = "ONLINE_BANKING";

function readOrders() {
  try {
    const stored = JSON.parse(localStorage.getItem(ORDERS_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function getOrderById(orderId) {
  if (!orderId) {
    return null;
  }
  const orders = readOrders();
  return orders.find((order) => order.id === orderId) ?? null;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderId = location.state?.orderId;
  const [order, setOrder] = useState(() => getOrderById(orderId));
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    setOrder(getOrderById(orderId));
  }, [orderId]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expiresAtMs = useMemo(() => {
    const value = order?.payment?.expiresAt;
    if (!value) {
      return null;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }, [order?.payment?.expiresAt]);

  const secondsLeft = useMemo(() => {
    if (!expiresAtMs) {
      return 0;
    }
    return Math.max(0, Math.floor((expiresAtMs - now) / 1000));
  }, [expiresAtMs, now]);

  const isExpired = secondsLeft === 0;
  const isPaid = order?.payment?.status === "PAID";
  const isPending = order?.payment?.status === "PENDING_QR";

  useEffect(() => {
    if (!order || !isExpired || !isPending) {
      return;
    }
    const updatedOrder = {
      ...order,
      payment: {
        ...order.payment,
        status: "EXPIRED",
      },
      status: "PAYMENT_EXPIRED",
    };
    const nextOrders = readOrders().map((item) =>
      item.id === updatedOrder.id ? updatedOrder : item
    );
    saveOrders(nextOrders);
    setOrder(updatedOrder);
    setMessage("QR has expired. Please go back to checkout to create a new payment.");
  }, [isExpired, isPending, order]);

  const updateOrderAndStorage = (updater) => {
    if (!order) {
      return null;
    }
    const updatedOrder = updater(order);
    const nextOrders = readOrders().map((item) =>
      item.id === updatedOrder.id ? updatedOrder : item
    );
    saveOrders(nextOrders);
    setOrder(updatedOrder);
    return updatedOrder;
  };

  const mockCheckPaymentStatus = () => {
    // TODO: Replace with backend API call:
    // GET /payments/:paymentId/status
    return "PAID";
  };

  const handleCheckStatus = async () => {
    if (!order || isExpired) {
      return;
    }
    setChecking(true);
    setMessage("");

    await new Promise((resolve) => setTimeout(resolve, 800));
    const nextStatus = mockCheckPaymentStatus();

    if (nextStatus === "PAID") {
      const updated = updateOrderAndStorage((current) => ({
        ...current,
        paidAt: new Date().toISOString(),
        payment: {
          ...current.payment,
          status: "PAID",
        },
        status: "PLACED",
      }));
      localStorage.setItem(CART_KEY, JSON.stringify([]));
      setChecking(false);
      navigate("/orders", {
        replace: true,
        state: { justPaid: true, orderId: updated?.id ?? order.id },
      });
      return;
    }

    setChecking(false);
    setMessage("Payment is still pending. Please complete transfer and try again.");
  };

  const handleCancel = () => {
    updateOrderAndStorage((current) => ({
      ...current,
      payment: {
        ...current.payment,
        status: "CANCELLED",
      },
      status: "CANCELLED",
    }));
    navigate("/orders", { replace: true });
  };

  if (!orderId) {
    return <Navigate to="/checkout" replace />;
  }

  if (!order) {
    return <Navigate to="/orders" replace />;
  }

  if (order.payment?.method !== ONLINE_METHOD) {
    return <Navigate to="/orders" replace />;
  }

  return (
    <div className="payment-page">
      <div className="payment-card">
        <h2>Online Banking Payment</h2>
        <p className="payment-order-id">
          Order: <strong>{order.id}</strong>
        </p>

        <div className="payment-layout">
          <div className="payment-qr-block">
            <img
              src={
                order.payment?.qrCodeUrl ??
                "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=DEMO-PAYMENT"
              }
              alt="Payment QR"
              className="payment-qr-image"
            />
            <p className="payment-qr-caption">Scan QR with your banking app to pay.</p>
            <p className="payment-id">
              Payment ID: <strong>{order.payment?.paymentId || "-"}</strong>
            </p>
          </div>

          <div className="payment-info-block">
            <div className="payment-row">
              <span>Total</span>
              <strong>{formatVND(order.totalPrice || 0)}</strong>
            </div>
            <div className="payment-row">
              <span>Status</span>
              <strong>{order.payment?.status || "-"}</strong>
            </div>
            <div className="payment-row">
              <span>Time left</span>
              <strong>
                {`${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
                  secondsLeft % 60
                ).padStart(2, "0")}`}
              </strong>
            </div>

            <button
              type="button"
              className="payment-primary-btn"
              disabled={checking || isExpired || isPaid}
              onClick={handleCheckStatus}
            >
              {checking ? "Checking..." : "I Have Paid - Check Status"}
            </button>
            <button type="button" className="payment-secondary-btn" onClick={handleCancel}>
              Cancel Payment
            </button>
            {message ? <p className="payment-message">{message}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
