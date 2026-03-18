import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import "../styles/PaymentPage.css";
import { formatVND } from "../utils/currency";
import { useAuth } from "../context/AuthContext";
import { fetchOrderById, mapApiOrderToView, updateOrder } from "../services/orderApi";

const CART_KEY = "cart";
const ONLINE_METHOD = "ONLINE_BANKING";

function addMinutes(isoDate, minutes) {
  const parsed = new Date(isoDate).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed + minutes * 60 * 1000;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const orderId = location.state?.orderId;
  const accountId =
    user?.id === undefined || user?.id === null || user?.id === ""
      ? ""
      : String(user.id);
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setMessage("");

    fetchOrderById(orderId)
      .then((data) => {
        if (!isMounted) {
          return;
        }
        const mapped = mapApiOrderToView(data);
        if (accountId && String(mapped.customer?.id ?? "") !== accountId) {
          setOrder(null);
          setMessage("Order not found.");
          return;
        }
        setOrder(mapped);
      })
      .catch(() => {
        if (isMounted) {
          setOrder(null);
          setMessage("Failed to load payment order.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, orderId]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expiresAtMs = useMemo(() => {
    if (!order) {
      return null;
    }
    return addMinutes(order.createdAt || order.updatedAt, 15);
  }, [order]);

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

    let isMounted = true;
    const expireOrder = async () => {
      try {
        const updated = await updateOrder(order.id, {
          ...(order.raw || {}),
          status: "PAYMENT_EXPIRED",
          payment_status: "EXPIRED",
          updatedAt: new Date().toISOString(),
        });
        if (!isMounted) {
          return;
        }
        setOrder(mapApiOrderToView(updated));
        setMessage("QR has expired. Please go back to checkout to create a new payment.");
      } catch {
        if (isMounted) {
          setMessage("QR has expired. Failed to sync status, please reload.");
        }
      }
    };

    expireOrder();
    return () => {
      isMounted = false;
    };
  }, [isExpired, isPending, order]);

  const updateOrderOnServer = async (overrides) => {
    if (!order) {
      return null;
    }
    const updatedRaw = await updateOrder(order.id, {
      ...(order.raw || {}),
      ...overrides,
      updatedAt: new Date().toISOString(),
    });
    const mapped = mapApiOrderToView(updatedRaw);
    setOrder(mapped);
    return mapped;
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
      try {
        const updated = await updateOrderOnServer({
          status: "PLACED",
          payment_status: "PAID",
          paidAt: new Date().toISOString(),
        });
        localStorage.setItem(CART_KEY, JSON.stringify([]));
        setChecking(false);
        navigate("/orders", {
          replace: true,
          state: { justPaid: true, orderId: updated?.orderCode ?? updated?.id ?? order.id },
        });
        return;
      } catch {
        setChecking(false);
        setMessage("Payment captured, but failed to update order. Please retry.");
        return;
      }
    }

    setChecking(false);
    setMessage("Payment is still pending. Please complete transfer and try again.");
  };

  const handleCancel = async () => {
    if (!order) {
      return;
    }

    try {
      await updateOrderOnServer({
        status: "CANCELLED",
        payment_status: "CANCELLED",
      });
      navigate("/orders", { replace: true });
    } catch {
      setMessage("Failed to cancel payment. Please try again.");
    }
  };

  if (!orderId) {
    return <Navigate to="/checkout" replace />;
  }

  if (isLoading) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Online Banking Payment</h2>
          <p>Loading payment order...</p>
        </div>
      </div>
    );
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
          Order: <strong>{order.orderCode || order.id}</strong>
        </p>

        <div className="payment-layout">
          <div className="payment-qr-block">
            <img
              src={
                `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=ORDER-${encodeURIComponent(
                  order.orderCode || order.id
                )}`
              }
              alt="Payment QR"
              className="payment-qr-image"
            />
            <p className="payment-qr-caption">Scan QR with your banking app to pay.</p>
            <p className="payment-id">
              Payment ID: <strong>{order.orderCode || "-"}</strong>
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
