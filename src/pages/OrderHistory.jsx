import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/OrderHistory.css";
import { formatVND } from "../utils/currency";
import { useAuth } from "../context/AuthContext";
import {
  fetchOrdersByAccount,
  mapApiOrderToView,
  updateOrder,
} from "../services/orderApi";

const STATUS_FILTER_ORDER = [
  "PENDING_PAYMENT",
  "PLACED",
  "PRESCRIPTION_REVIEW",
  "CUSTOMER_UPDATE_REQUIRED",
  "READY_FOR_OPERATION",
  "IN_OPERATION",
  "READY_TO_SHIP",
  "DELIVERING",
  "DELIVERED",
  "RETURN_REQUESTED",
  "WARRANTY_PROCESSING",
  "REFUND_APPROVED",
  "CANCELLED",
  "PAYMENT_EXPIRED",
];

const SALES_SUPPORT_PHONE = (import.meta.env.VITE_SALES_SUPPORT_PHONE || "").trim();

function normalizeStatus(value) {
  return String(value || "").toUpperCase().trim();
}

function buildPhoneHref(phone) {
  return `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
}

function formatStatusLabel(value) {
  const normalized = normalizeStatus(value);
  if (!normalized) {
    return "-";
  }
  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

export default function OrderHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState("ALL");
  const salesSupportHref = SALES_SUPPORT_PHONE ? buildPhoneHref(SALES_SUPPORT_PHONE) : "";
  const accountId =
    user?.id === undefined || user?.id === null || user?.id === ""
      ? ""
      : String(user.id);

  useEffect(() => {
    if (!accountId) {
      setOrders([]);
      setIsLoading(false);
      setLoadError("Missing account id. Please re-login.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError("");

    fetchOrdersByAccount(accountId)
      .then((data) => {
        if (!isMounted) {
          return;
        }
        const list = (Array.isArray(data) ? data : [])
          .map((item) => mapApiOrderToView(item))
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
          );
        setOrders(list);
      })
      .catch(() => {
        if (isMounted) {
          setOrders([]);
          setLoadError("Failed to load orders.");
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
  }, [accountId]);

  const handleCancelOrder = async (order) => {
    setActionError("");
    const currentPaymentMethod = String(order.payment?.method || "").toUpperCase();
    const currentPaymentStatus = String(order.payment?.status || "").toUpperCase();
    const nextPaymentStatus =
      currentPaymentMethod === "ONLINE_BANKING" &&
      currentPaymentStatus !== "PAID"
        ? "CANCELLED"
        : currentPaymentStatus || "CANCELLED";

    try {
      const updatedRaw = await updateOrder(order.id, {
        ...(order.raw || {}),
        status: "CANCELLED",
        payment_status: nextPaymentStatus,
        updatedAt: new Date().toISOString(),
      });
      const updatedOrder = mapApiOrderToView(updatedRaw);
      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? updatedOrder : item))
      );
    } catch {
      setActionError("Failed to cancel this order. Please try again.");
    }
  };

  const handleReturnOrder = (order) => {
    navigate("/returns", { state: { order } });
  };

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      ),
    [orders]
  );

  const orderCountByStatus = useMemo(() => {
    const next = {};
    sortedOrders.forEach((order) => {
      const key = normalizeStatus(order.status);
      if (!key) {
        return;
      }
      next[key] = (next[key] || 0) + 1;
    });
    return next;
  }, [sortedOrders]);

  const availableStatusFilters = useMemo(() => {
    const unique = [...new Set(sortedOrders.map((order) => normalizeStatus(order.status)).filter(Boolean))];
    unique.sort((a, b) => {
      const aIndex = STATUS_FILTER_ORDER.indexOf(a);
      const bIndex = STATUS_FILTER_ORDER.indexOf(b);
      if (aIndex === -1 && bIndex === -1) {
        return a.localeCompare(b);
      }
      if (aIndex === -1) {
        return 1;
      }
      if (bIndex === -1) {
        return -1;
      }
      return aIndex - bIndex;
    });
    return ["ALL", ...unique];
  }, [sortedOrders]);

  useEffect(() => {
    if (activeStatusFilter === "ALL") {
      return;
    }
    if (!availableStatusFilters.includes(activeStatusFilter)) {
      setActiveStatusFilter("ALL");
    }
  }, [activeStatusFilter, availableStatusFilters]);

  const filteredOrders = useMemo(() => {
    if (activeStatusFilter === "ALL") {
      return sortedOrders;
    }
    return sortedOrders.filter(
      (order) => normalizeStatus(order.status) === activeStatusFilter
    );
  }, [activeStatusFilter, sortedOrders]);

  return (
    <div className="order-history-page">
      <h2 className="order-history-title">Order History</h2>

      {location.state?.justPlaced ? (
        <p className="order-history-success">
          Order placed successfully. Order ID: {location.state?.orderId}
        </p>
      ) : null}
      {location.state?.justPaid ? (
        <p className="order-history-success">
          Payment successful. Order ID: {location.state?.orderId}
        </p>
      ) : null}

      {actionError ? <p className="order-history-empty">{actionError}</p> : null}

      {isLoading ? (
        <p className="order-history-empty">Loading orders...</p>
      ) : loadError ? (
        <p className="order-history-empty">{loadError}</p>
      ) : sortedOrders.length === 0 ? (
        <p className="order-history-empty">No orders yet.</p>
      ) : (
        <>
          <div className="order-history-filters">
            {availableStatusFilters.map((status) => {
              const isAll = status === "ALL";
              const count = isAll
                ? sortedOrders.length
                : (orderCountByStatus[status] || 0);
              const label = isAll ? "All" : formatStatusLabel(status);

              return (
                <button
                  key={status}
                  type="button"
                  className={`order-history-filter-btn${
                    activeStatusFilter === status ? " is-active" : ""
                  }`}
                  onClick={() => setActiveStatusFilter(status)}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="order-history-empty">
              No orders with status {formatStatusLabel(activeStatusFilter)}.
            </p>
          ) : (
            <div className="order-history-list">
              {filteredOrders.map((order) => {
                const normalizedStatus = String(order.status || "").toLowerCase();
                const canCancel =
                  normalizedStatus === "placed" ||
                  normalizedStatus === "pending_payment";
                const canReturn = normalizedStatus === "delivered";

                return (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <h3>{order.orderCode || order.id}</h3>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>

                  <div className="order-customer">
                    <p><strong>Name:</strong> {order.customer?.fullName || "-"}</p>
                    <p><strong>Phone:</strong> {order.customer?.phone || "-"}</p>
                    <p><strong>Address:</strong> {order.customer?.address || "-"}</p>
                  </div>

                  <div className="order-items">
                    {order.items?.map((item, index) => (
                      <div className="order-item" key={`${order.id}-${item.id}-${index}`}>
                        <span>{item.name}</span>
                        <span>x{item.quantity}</span>
                        <span>{formatVND(item.lineTotal ?? item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-total">
                    <strong>Total: {formatVND(order.totalPrice || 0)}</strong>
                  </div>
                  <div className="order-total">
                    <strong>Order status: {order.status || "-"}</strong>
                  </div>
                  {normalizedStatus === "customer_update_required" ? (
                    <div className="order-status-note">
                      <p className="order-status-note-title">
                        Prescription information needs an update from the customer.
                      </p>
                      <p>
                        Please update your eye profile or confirm the corrected
                        prescription with Sales so the order can return to review.
                      </p>
                      {SALES_SUPPORT_PHONE ? (
                        <p>
                          Need help? Contact Sales at{" "}
                          <a href={salesSupportHref} className="order-status-link">
                            {SALES_SUPPORT_PHONE}
                          </a>{" "}
                          so they can update the prescription for you.
                        </p>
                      ) : (
                        <p>
                          Need help? Please contact Sales so they can update the
                          prescription for you.
                        </p>
                      )}
                    </div>
                  ) : null}
                  <div className="order-total">
                    <strong>
                      Payment: {order.payment?.method || "-"} / {order.payment?.status || "-"}
                    </strong>
                  </div>
                  {canCancel || canReturn ? (
                    <div className="order-actions">
                      {canCancel ? (
                        <button
                          type="button"
                          className="order-action-btn is-cancel"
                          onClick={() => handleCancelOrder(order)}
                        >
                          Cancel
                        </button>
                      ) : null}
                      {canReturn ? (
                        <button
                          type="button"
                          className="order-action-btn is-return"
                          onClick={() => handleReturnOrder(order)}
                        >
                          Return
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
