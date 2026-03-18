import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/OperationDashboard.css";
import { useAuth } from "../context/AuthContext";
import { formatVND } from "../utils/currency";
import { fetchOrders, mapApiOrderToView, updateOrder } from "../services/orderApi";

const OPERATION_SECTIONS = {
  OVERVIEW: "OVERVIEW",
  IN_OPERATION: "IN_OPERATION",
  SHIPPING: "SHIPPING",
  COMPLETED: "COMPLETED",
};

const OPERATION_ALLOWED_TRANSITIONS = {
  READY_FOR_OPERATION: ["IN_OPERATION"],
  IN_OPERATION: ["READY_TO_SHIP", "CUSTOMER_UPDATE_REQUIRED"],
  READY_TO_SHIP: ["DELIVERING"],
  DELIVERING: ["DELIVERED"],
};

function normalizeStatus(value) {
  return String(value || "").toUpperCase().trim();
}

function canOperationTransition(currentStatus, nextStatus) {
  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(nextStatus);
  const allowedNext = OPERATION_ALLOWED_TRANSITIONS[current] || [];
  return allowedNext.includes(next);
}

function buildOperationUpdatePayload(order, nextStatus) {
  const nowIso = new Date().toISOString();
  const basePayload = {
    ...(order?.raw || {}),
    status: nextStatus,
    updatedAt: nowIso,
  };

  const isCashOnDelivery = normalizeStatus(order?.payment?.method) === "COD";
  const isDelivered = normalizeStatus(nextStatus) === "DELIVERED";
  const isAlreadyPaid = normalizeStatus(order?.payment?.status) === "PAID";

  if (isCashOnDelivery && isDelivered && !isAlreadyPaid) {
    return {
      ...basePayload,
      payment_status: "PAID",
      paidAt: nowIso,
    };
  }

  return basePayload;
}

function getStatusBadgeClass(status) {
  const normalized = normalizeStatus(status);

  if (
    [
      "PENDING_PAYMENT",
      "PENDING_QR",
      "CUSTOMER_UPDATE_REQUIRED",
      "RETURN_REQUESTED",
      "WARRANTY_REQUESTED",
      "REFUND_REQUESTED",
      "COMPLAINT_OPEN",
    ].includes(normalized)
  ) {
    return "is-warning";
  }

  if (
    [
      "PRESCRIPTION_REVIEW",
      "READY_FOR_OPERATION",
      "IN_OPERATION",
      "READY_TO_SHIP",
      "DELIVERING",
      "PRE_ORDER_CONFIRMED",
      "WARRANTY_PROCESSING",
    ].includes(normalized)
  ) {
    return "is-info";
  }

  if (
    [
      "PLACED",
      "DELIVERED",
      "PAID",
      "COMPLAINT_CLOSED",
      "REFUND_APPROVED",
      "WARRANTY_COMPLETED",
      "COMPLETED",
    ].includes(normalized)
  ) {
    return "is-success";
  }

  if (
    ["CANCELLED", "PAYMENT_EXPIRED", "EXPIRED", "REFUND_REJECTED"].includes(
      normalized
    )
  ) {
    return "is-danger";
  }

  return "is-neutral";
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

function getDisplayOrderId(order) {
  return order?.orderCode || `ORD-${order?.id || ""}`;
}

function isToday(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
}

export default function OperationDashboard() {
  const [activeSection, setActiveSection] = useState(OPERATION_SECTIONS.OVERVIEW);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionOrderId, setActionOrderId] = useState("");
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError("");

    fetchOrders()
      .then((data) => {
        if (!isMounted) {
          return;
        }
        const mapped = (Array.isArray(data) ? data : [])
          .map((item) => mapApiOrderToView(item))
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
          );
        setOrders(mapped);
      })
      .catch(() => {
        if (isMounted) {
          setOrders([]);
          setLoadError("Failed to load operation orders from MockAPI.");
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
  }, []);

  const inOperationOrders = useMemo(
    () =>
      orders.filter((order) => normalizeStatus(order.status) === "IN_OPERATION"),
    [orders]
  );

  const shippingOrders = useMemo(
    () =>
      orders.filter((order) =>
        ["READY_TO_SHIP", "DELIVERING"].includes(normalizeStatus(order.status))
      ),
    [orders]
  );

  const completedTodayOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          normalizeStatus(order.status) === "DELIVERED" &&
          isToday(order.updatedAt || order.createdAt)
      ),
    [orders]
  );

  const metrics = useMemo(
    () => ({
      inOperation: inOperationOrders.length,
      shipping: shippingOrders.length,
      completedToday: completedTodayOrders.length,
      totalVisible: orders.length,
    }),
    [completedTodayOrders.length, inOperationOrders.length, orders.length, shippingOrders.length]
  );

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleUpdateStatus = async (order, nextStatus, successText) => {
    if (!canOperationTransition(order?.status, nextStatus)) {
      setActionMessage("");
      setActionError(
        `Operation cannot change status from ${normalizeStatus(
          order?.status
        )} to ${normalizeStatus(nextStatus)}.`
      );
      return;
    }

    setActionMessage("");
    setActionError("");
    setActionOrderId(String(order.id));

    try {
      const updatedRaw = await updateOrder(
        order.id,
        buildOperationUpdatePayload(order, nextStatus)
      );
      const updatedMapped = mapApiOrderToView(updatedRaw);
      setOrders((prev) =>
        prev.map((item) =>
          String(item.id) === String(order.id) ? updatedMapped : item
        )
      );
      setActionMessage(successText);
    } catch {
      setActionError("Failed to update order status. Please try again.");
    } finally {
      setActionOrderId("");
    }
  };

  const renderOrderCard = (order, actions) => (
    <article className="operation-order-card" key={order.id}>
      <div className="operation-order-head">
        <h4>{getDisplayOrderId(order)}</h4>
        <span>{formatDateTime(order.createdAt)}</span>
      </div>

      <p>
        <strong>Status:</strong>{" "}
        <span
          className={`operation-status-badge ${getStatusBadgeClass(order.status)}`}
        >
          {order.status || "-"}
        </span>
      </p>
      <p>
        <strong>Customer:</strong> {order.customer?.fullName || "-"} (
        {order.customer?.phone || "-"})
      </p>
      <p>
        <strong>Address:</strong> {order.customer?.address || "-"}
      </p>
      <p>
        <strong>Total:</strong> {formatVND(order.totalPrice || 0)}
      </p>
      <p>
        <strong>Payment:</strong> {order.payment?.method || "-"} /{" "}
        <span
          className={`operation-status-badge ${getStatusBadgeClass(
            order.payment?.status
          )}`}
        >
          {order.payment?.status || "-"}
        </span>
      </p>

      <div className="operation-item-list">
        {(order.items || []).map((item, index) => (
          <div className="operation-item-row" key={`${order.id}-${item.id}-${index}`}>
            <span>
              {item.name} x{item.quantity}
            </span>
            <span>{formatVND((item.price || 0) * (item.quantity || 0))}</span>
          </div>
        ))}
      </div>

      <div className="operation-order-actions">{actions}</div>
    </article>
  );

  const renderSectionIntro = (title, subtitle) => (
    <div className="operation-section-head">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return <p>Loading operation dashboard...</p>;
    }

    if (loadError) {
      return <p>{loadError}</p>;
    }

    switch (activeSection) {
      case OPERATION_SECTIONS.IN_OPERATION:
        return (
          <div>
            {renderSectionIntro(
              "In Operation Queue",
              "Processing and manufacturing queue for operation team."
            )}
            {inOperationOrders.length === 0 ? (
              <p className="operation-empty">No IN_OPERATION orders right now.</p>
            ) : (
              <div className="operation-order-grid">
                {inOperationOrders.map((order) =>
                  renderOrderCard(
                    order,
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(
                            order,
                            "READY_TO_SHIP",
                            `${getDisplayOrderId(order)} moved to READY_TO_SHIP.`
                          )
                        }
                        disabled={actionOrderId === String(order.id)}
                      >
                        Mark Ready To Ship
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(
                            order,
                            "CUSTOMER_UPDATE_REQUIRED",
                            `${getDisplayOrderId(order)} sent back for customer update.`
                          )
                        }
                        disabled={actionOrderId === String(order.id)}
                      >
                        Need Sales Follow-up
                      </button>
                    </>
                  )
                )}
              </div>
            )}
          </div>
        );

      case OPERATION_SECTIONS.SHIPPING:
        return (
          <div>
            {renderSectionIntro(
              "Shipping Queue",
              "Orders ready for shipping and orders currently delivering."
            )}
            {shippingOrders.length === 0 ? (
              <p className="operation-empty">No shipping orders right now.</p>
            ) : (
              <div className="operation-order-grid">
                {shippingOrders.map((order) =>
                  renderOrderCard(
                    order,
                    <>
                      {normalizeStatus(order.status) === "READY_TO_SHIP" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "DELIVERING",
                              `${getDisplayOrderId(order)} moved to DELIVERING.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Mark Delivering
                        </button>
                      ) : null}

                      {normalizeStatus(order.status) === "DELIVERING" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "DELIVERED",
                              `${getDisplayOrderId(order)} marked as DELIVERED.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Mark Delivered
                        </button>
                      ) : null}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        );

      case OPERATION_SECTIONS.COMPLETED:
        return (
          <div>
            {renderSectionIntro(
              "Completed Today",
              "Orders completed and delivered today."
            )}
            {completedTodayOrders.length === 0 ? (
              <p className="operation-empty">No completed orders today.</p>
            ) : (
              <div className="operation-order-grid">
                {completedTodayOrders.map((order) =>
                  renderOrderCard(order, <span className="operation-tag">Completed</span>)
                )}
              </div>
            )}
          </div>
        );

      case OPERATION_SECTIONS.OVERVIEW:
      default:
        return (
          <div>
            {renderSectionIntro(
              "Operations Overview",
              "Track in-operation workload, shipping queue, and completion status."
            )}
            <div className="operation-metric-grid">
              <div className="operation-metric-card">
                <p>IN_OPERATION</p>
                <strong>{metrics.inOperation}</strong>
              </div>
              <div className="operation-metric-card">
                <p>Shipping Queue</p>
                <strong>{metrics.shipping}</strong>
              </div>
              <div className="operation-metric-card">
                <p>Completed Today</p>
                <strong>{metrics.completedToday}</strong>
              </div>
              <div className="operation-metric-card">
                <p>Total Orders</p>
                <strong>{metrics.totalVisible}</strong>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`operation-dashboard ${isSidebarOpen ? "" : "is-sidebar-collapsed"}`}>
      <aside className="operation-sidebar">
        <h3 className="operation-sidebar-title">Operation Panel</h3>

        <button onClick={() => navigate("/")}>HomePage</button>

        <button
          className={activeSection === OPERATION_SECTIONS.OVERVIEW ? "active" : ""}
          onClick={() => setActiveSection(OPERATION_SECTIONS.OVERVIEW)}
        >
          Overview
        </button>

        <button
          className={activeSection === OPERATION_SECTIONS.IN_OPERATION ? "active" : ""}
          onClick={() => setActiveSection(OPERATION_SECTIONS.IN_OPERATION)}
        >
          IN_OPERATION Queue
        </button>

        <button
          className={activeSection === OPERATION_SECTIONS.SHIPPING ? "active" : ""}
          onClick={() => setActiveSection(OPERATION_SECTIONS.SHIPPING)}
        >
          Shipping Queue
        </button>

        <button
          className={activeSection === OPERATION_SECTIONS.COMPLETED ? "active" : ""}
          onClick={() => setActiveSection(OPERATION_SECTIONS.COMPLETED)}
        >
          Completed Today
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="operation-content">
        <button
          className="operation-menu-toggle"
          type="button"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? "Hide menu" : "Show menu"}
        </button>

        <div className="operation-panel">
          {actionMessage ? (
            <p className="operation-feedback success">{actionMessage}</p>
          ) : null}
          {actionError ? (
            <p className="operation-feedback error">{actionError}</p>
          ) : null}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
