import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SalesDashboard.css";
import { useAuth } from "../context/AuthContext";
import { formatVND } from "../utils/currency";
import { fetchOrders, mapApiOrderToView, updateOrder } from "../services/orderApi";

const SECTION_KEYS = {
  OVERVIEW: "OVERVIEW",
  ORDER_INTAKE: "ORDER_INTAKE",
  PRESCRIPTION_SUPPORT: "PRESCRIPTION_SUPPORT",
  HANDOFF: "HANDOFF",
  PREORDER: "PREORDER",
  COMPLAINTS: "COMPLAINTS",
};

const SALES_ALLOWED_TRANSITIONS = {
  PLACED: ["PRESCRIPTION_REVIEW", "PRE_ORDER_CONFIRMED", "READY_FOR_OPERATION"],
  CUSTOMER_UPDATE_REQUIRED: ["PRESCRIPTION_REVIEW"],
  PRESCRIPTION_REVIEW: ["CUSTOMER_UPDATE_REQUIRED", "READY_FOR_OPERATION"],
  PRE_ORDER_CONFIRMED: ["READY_FOR_OPERATION"],
  READY_FOR_OPERATION: ["IN_OPERATION"],
  RETURN_REQUESTED: ["REFUND_APPROVED", "WARRANTY_PROCESSING", "COMPLAINT_CLOSED"],
  WARRANTY_REQUESTED: ["REFUND_APPROVED", "WARRANTY_PROCESSING", "COMPLAINT_CLOSED"],
  REFUND_REQUESTED: ["REFUND_APPROVED", "WARRANTY_PROCESSING", "COMPLAINT_CLOSED"],
  COMPLAINT_OPEN: ["REFUND_APPROVED", "WARRANTY_PROCESSING", "COMPLAINT_CLOSED"],
  WARRANTY_PROCESSING: ["COMPLAINT_CLOSED"],
};

function normalizeStatus(value) {
  return String(value || "").toUpperCase().trim();
}

function canSalesTransition(currentStatus, nextStatus) {
  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(nextStatus);
  const allowedNext = SALES_ALLOWED_TRANSITIONS[current] || [];
  return allowedNext.includes(next);
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

function toDateOnlyMs(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  ).getTime();
}

function hasSelectedPower(order) {
  return (order?.items || []).some(
    (item) =>
      item?.prescription !== undefined &&
      item?.prescription !== null &&
      item?.prescription !== ""
  );
}

function hasCustomEyeProfile(order) {
  return (order?.items || []).some(
    (item) =>
      (item?.eyeProfileId || "").toString().trim() !== "" ||
      (item?.eyeProfileName || "").trim() !== "" ||
      (item?.eyeProfileSummary || "").trim() !== ""
  );
}

function hasDesignedFrameAndLens(order) {
  return (order?.items || []).some(
    (item) =>
      (item?.frameId || "").toString().trim() !== "" &&
      (item?.lensId || "").toString().trim() !== ""
  );
}

function requiresPrescriptionCheck(order) {
  return hasCustomEyeProfile(order) || hasDesignedFrameAndLens(order);
}

function getOrderTypeLabel(order) {
  return requiresPrescriptionCheck(order)
    ? "Prescription order"
    : "Ready-made order";
}

function getPowerLabel(order) {
  return requiresPrescriptionCheck(order) ? "Prescription" : "Selected power";
}

function isPreOrder(order) {
  const status = normalizeStatus(order?.status);
  if (status.includes("PRE_ORDER") || status.includes("PREORDER")) {
    return true;
  }
  const note = String(order?.customer?.note || "").toLowerCase();
  return note.includes("pre-order") || note.includes("preorder");
}

function isComplaint(order) {
  const status = normalizeStatus(order?.status);
  return (
    status === "RETURN_REQUESTED" ||
    status === "WARRANTY_REQUESTED" ||
    status === "REFUND_REQUESTED" ||
    status === "COMPLAINT_OPEN"
  );
}

function getDisplayOrderId(order) {
  return order?.orderCode || `ORD-${order?.id || ""}`;
}

export default function SalesDashboard() {
  const [activeSection, setActiveSection] = useState(SECTION_KEYS.OVERVIEW);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionOrderId, setActionOrderId] = useState("");
  const [filterOrderCode, setFilterOrderCode] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState("");
  const [filterCreatedTo, setFilterCreatedTo] = useState("");
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
          setLoadError("Failed to load orders from MockAPI.");
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

  const statusOptions = useMemo(() => {
    const values = [...new Set(orders.map((order) => normalizeStatus(order.status)).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = filterOrderCode.trim().toLowerCase();
    const fromMs = filterCreatedFrom
      ? toDateOnlyMs(`${filterCreatedFrom}T00:00:00`)
      : null;
    const toMs = filterCreatedTo
      ? toDateOnlyMs(`${filterCreatedTo}T23:59:59`)
      : null;

    return orders.filter((order) => {
      if (query) {
        const haystack = `${getDisplayOrderId(order)} ${order.id || ""}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (filterStatus !== "ALL" && normalizeStatus(order.status) !== filterStatus) {
        return false;
      }

      const createdMs = toDateOnlyMs(order.createdAt);
      if (fromMs !== null && (createdMs === null || createdMs < fromMs)) {
        return false;
      }
      if (toMs !== null && (createdMs === null || createdMs > toMs)) {
        return false;
      }

      return true;
    });
  }, [orders, filterOrderCode, filterStatus, filterCreatedFrom, filterCreatedTo]);

  const metrics = useMemo(() => {
    const waitingPayment = orders.filter(
      (order) => normalizeStatus(order.status) === "PENDING_PAYMENT"
    ).length;
    const intake = orders.filter((order) =>
      ["PLACED"].includes(normalizeStatus(order.status))
    ).length;
    const handoff = orders.filter((order) =>
      ["READY_FOR_OPERATION", "IN_OPERATION"].includes(
        normalizeStatus(order.status)
      )
    ).length;
    const preOrder = orders.filter((order) => isPreOrder(order)).length;
    const complaints = orders.filter((order) => isComplaint(order)).length;

    return {
      totalOrders: orders.length,
      waitingPayment,
      intake,
      handoff,
      preOrder,
      complaints,
    };
  }, [orders]);

  const intakeOrders = useMemo(
    () =>
      filteredOrders.filter(
        (order) => normalizeStatus(order.status) === "PLACED"
      ),
    [filteredOrders]
  );

  const rxOrders = useMemo(
    () =>
      filteredOrders.filter((order) => {
        const status = normalizeStatus(order.status);
        if (!["PRESCRIPTION_REVIEW", "CUSTOMER_UPDATE_REQUIRED"].includes(status)) {
          return false;
        }
        return requiresPrescriptionCheck(order);
      }),
    [filteredOrders]
  );

  const handoffOrders = useMemo(
    () =>
      filteredOrders.filter((order) =>
        ["READY_FOR_OPERATION", "IN_OPERATION"].includes(
          normalizeStatus(order.status)
        )
      ),
    [filteredOrders]
  );

  const preOrderOrders = useMemo(
    () => filteredOrders.filter((order) => isPreOrder(order)),
    [filteredOrders]
  );

  const complaintOrders = useMemo(
    () => filteredOrders.filter((order) => isComplaint(order)),
    [filteredOrders]
  );

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleUpdateStatus = async (order, nextStatus, successText) => {
    if (!canSalesTransition(order?.status, nextStatus)) {
      setActionMessage("");
      setActionError(
        `Sales cannot change status from ${normalizeStatus(
          order?.status
        )} to ${normalizeStatus(nextStatus)}.`
      );
      return;
    }

    setActionMessage("");
    setActionError("");
    setActionOrderId(String(order.id));

    try {
      const updatedRaw = await updateOrder(order.id, {
        ...(order.raw || {}),
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });

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

  const clearFilters = () => {
    setFilterOrderCode("");
    setFilterStatus("ALL");
    setFilterCreatedFrom("");
    setFilterCreatedTo("");
  };

  const renderOrderCard = (order, actions) => (
    <article className="sales-order-card" key={order.id}>
      <div className="sales-order-head">
        <h4>{getDisplayOrderId(order)}</h4>
        <span>{formatDateTime(order.createdAt)}</span>
      </div>
      <p>
        <strong>Customer:</strong> {order.customer?.fullName || "-"} (
        {order.customer?.phone || "-"})
      </p>
      <p>
        <strong>Status:</strong>{" "}
        <span
          className={`sales-status-badge ${getStatusBadgeClass(order.status)}`}
        >
          {order.status || "-"}
        </span>
      </p>
      <p>
        <strong>Order type:</strong> {getOrderTypeLabel(order)}
      </p>
      <p>
        <strong>Payment:</strong>{" "}
        <span className="sales-payment-method">{order.payment?.method || "-"}</span>{" "}
        /{" "}
        <span
          className={`sales-status-badge ${getStatusBadgeClass(
            order.payment?.status
          )}`}
        >
          {order.payment?.status || "-"}
        </span>
      </p>
      <p>
        <strong>Total:</strong> {formatVND(order.totalPrice || 0)}
      </p>
      <div className="sales-item-list">
        {(order.items || []).map((item, index) => (
          <div className="sales-item-row" key={`${order.id}-${item.id}-${index}`}>
            <span>
              {item.name} x{item.quantity}
            </span>
            <span>{formatVND((item.price || 0) * (item.quantity || 0))}</span>
          </div>
        ))}
      </div>
      {hasSelectedPower(order) ? (
        <p className="sales-item-note">
          {getPowerLabel(order)}:{" "}
          {(order.items || [])
            .map((item) => item.prescription)
            .filter(
              (value) =>
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            )
            .join(", ")}
        </p>
      ) : null}
      {(order.items || []).some((item) => (item.eyeProfileName || "").trim() !== "") ? (
        <p className="sales-item-note">
          Eye Profile:{" "}
          {(order.items || [])
            .map((item) => item.eyeProfileName)
            .filter((value) => (value || "").trim() !== "")
            .join(", ")}
        </p>
      ) : null}
      <div className="sales-order-actions">{actions}</div>
    </article>
  );

  const renderSectionIntro = (title, description) => (
    <div className="sales-section-head">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );

  const renderFilters = () => (
    <div className="sales-filter-bar">
      <div className="sales-filter-grid">
        <label className="sales-filter-field">
          <span>Order code</span>
          <input
            type="text"
            value={filterOrderCode}
            onChange={(event) => setFilterOrderCode(event.target.value)}
            placeholder="Search by ORD-..."
          />
        </label>

        <label className="sales-filter-field">
          <span>Status</span>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="sales-filter-field">
          <span>Created from</span>
          <input
            type="date"
            value={filterCreatedFrom}
            onChange={(event) => setFilterCreatedFrom(event.target.value)}
          />
        </label>

        <label className="sales-filter-field">
          <span>Created to</span>
          <input
            type="date"
            value={filterCreatedTo}
            onChange={(event) => setFilterCreatedTo(event.target.value)}
          />
        </label>
      </div>

      <div className="sales-filter-actions">
        <p className="sales-filter-summary">
          Showing {filteredOrders.length} / {orders.length} orders
        </p>
        <button type="button" onClick={clearFilters}>
          Clear filters
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return <p>Loading sales dashboard...</p>;
    }

    if (loadError) {
      return <p>{loadError}</p>;
    }

    switch (activeSection) {
      case SECTION_KEYS.ORDER_INTAKE:
        return (
          <div>
            {renderSectionIntro(
              "Order Intake & Processing",
              "Receive new orders, then split them into ready-made or prescription workflow."
            )}
            {intakeOrders.length === 0 ? (
              <p className="sales-empty">No orders in intake queue.</p>
            ) : (
              <div className="sales-order-grid">
                {intakeOrders.map((order) =>
                  renderOrderCard(
                    order,
                    <>
                      {normalizeStatus(order.status) === "PLACED" &&
                      requiresPrescriptionCheck(order) ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "PRESCRIPTION_REVIEW",
                              `${getDisplayOrderId(order)} moved to prescription review.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Start Prescription Check
                        </button>
                      ) : null}
                      {normalizeStatus(order.status) === "PLACED" &&
                      !requiresPrescriptionCheck(order) ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "READY_FOR_OPERATION",
                              `${getDisplayOrderId(order)} marked ready for operations.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Mark Ready
                        </button>
                      ) : null}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.PRESCRIPTION_SUPPORT:
        return (
          <div>
            {renderSectionIntro(
              "Prescription Check & Customer Support",
              "Review only custom prescription orders created from saved eye profiles or design flow."
            )}
            {rxOrders.length === 0 ? (
              <p className="sales-empty">No custom prescription orders in review.</p>
            ) : (
              <div className="sales-order-grid">
                {rxOrders.map((order) =>
                  renderOrderCard(
                    order,
                    <>
                      {canSalesTransition(
                        order.status,
                        "CUSTOMER_UPDATE_REQUIRED"
                      ) ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "CUSTOMER_UPDATE_REQUIRED",
                              `${getDisplayOrderId(order)} marked for customer adjustment.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Need Customer Update
                        </button>
                      ) : null}
                      {canSalesTransition(order.status, "PRESCRIPTION_REVIEW") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "PRESCRIPTION_REVIEW",
                              `${getDisplayOrderId(order)} returned to prescription review.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Resume Prescription Review
                        </button>
                      ) : null}
                      {canSalesTransition(order.status, "READY_FOR_OPERATION") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "READY_FOR_OPERATION",
                              `${getDisplayOrderId(order)} prescription verified.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Prescription Verified
                        </button>
                      ) : null}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.HANDOFF:
        return (
          <div>
            {renderSectionIntro(
              "Confirm & Handoff To Operations",
              "Confirm customer order and pass to Operations for production and shipping."
            )}
            {handoffOrders.length === 0 ? (
              <p className="sales-empty">No orders ready for handoff.</p>
            ) : (
              <div className="sales-order-grid">
                {handoffOrders.map((order) =>
                  renderOrderCard(
                    order,
                    <>
                      {normalizeStatus(order.status) ===
                      "READY_FOR_OPERATION" ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "IN_OPERATION",
                              `${getDisplayOrderId(order)} handed off to operations.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Send To Operations
                        </button>
                      ) : null}
                      {normalizeStatus(order.status) === "IN_OPERATION" ? (
                        <span className="sales-action-note">
                          Delivery status is handled by Operation Staff.
                        </span>
                      ) : null}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.PREORDER:
        return (
          <div>
            {renderSectionIntro(
              "Pre-order Handling",
              "Track pre-order commitments before handing off to operations."
            )}
            {preOrderOrders.length === 0 ? (
              <p className="sales-empty">No pre-orders found.</p>
            ) : (
              <div className="sales-order-grid">
                {preOrderOrders.map((order) =>
                  renderOrderCard(
                    order,
                    <>
                      {canSalesTransition(order.status, "PRE_ORDER_CONFIRMED") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "PRE_ORDER_CONFIRMED",
                              `${getDisplayOrderId(order)} pre-order confirmed.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Confirm Pre-order
                        </button>
                      ) : null}
                      {canSalesTransition(order.status, "READY_FOR_OPERATION") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "READY_FOR_OPERATION",
                              `${getDisplayOrderId(order)} pre-order moved to operation queue.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Queue For Operations
                        </button>
                      ) : null}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.COMPLAINTS:
        return (
          <div>
            {renderSectionIntro(
              "Complaints, Warranty, Refund",
              "Handle return, warranty, and refund requests from customers."
            )}
            {complaintOrders.length === 0 ? (
              <p className="sales-empty">No complaint cases right now.</p>
            ) : (
              <div className="sales-order-grid">
                {complaintOrders.map((order) =>
                  renderOrderCard(
                    order,
                    <>
                      {canSalesTransition(order.status, "REFUND_APPROVED") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "REFUND_APPROVED",
                              `${getDisplayOrderId(order)} refund approved.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Approve Refund
                        </button>
                      ) : null}
                      {canSalesTransition(order.status, "WARRANTY_PROCESSING") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "WARRANTY_PROCESSING",
                              `${getDisplayOrderId(order)} moved to warranty processing.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Process Warranty
                        </button>
                      ) : null}
                      {canSalesTransition(order.status, "COMPLAINT_CLOSED") ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(
                              order,
                              "COMPLAINT_CLOSED",
                              `${getDisplayOrderId(order)} complaint closed.`
                            )
                          }
                          disabled={actionOrderId === String(order.id)}
                        >
                          Close Case
                        </button>
                      ) : null}
                    </>
                  )
                )}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.OVERVIEW:
      default:
        return (
          <div>
            {renderSectionIntro(
              "Sales / Support Overview",
              "Coordinate sales and support workflow from intake to post-sale handling."
            )}
            <div className="sales-metric-grid">
              <div className="sales-metric-card">
                <p>Total Orders</p>
                <strong>{metrics.totalOrders}</strong>
              </div>
              <div className="sales-metric-card">
                <p>Waiting Payment</p>
                <strong>{metrics.waitingPayment}</strong>
              </div>
              <div className="sales-metric-card">
                <p>Intake Queue</p>
                <strong>{metrics.intake}</strong>
              </div>
              <div className="sales-metric-card">
                <p>Ready / In Operation</p>
                <strong>{metrics.handoff}</strong>
              </div>
              <div className="sales-metric-card">
                <p>Pre-orders</p>
                <strong>{metrics.preOrder}</strong>
              </div>
              <div className="sales-metric-card">
                <p>Complaints</p>
                <strong>{metrics.complaints}</strong>
              </div>
            </div>
            <div className="sales-overview-note">
              <h3>Recommended workflow</h3>
              <p>1) Intake order and validate payment status.</p>
              <p>2) Send only custom prescription orders to Prescription Support.</p>
              <p>3) Confirm order and handoff to Operations.</p>
              <p>4) Track pre-order timeline and update customer proactively.</p>
              <p>5) Resolve complaints with clear return/warranty/refund status.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`sales-dashboard ${isSidebarOpen ? "" : "is-sidebar-collapsed"}`}>
      <aside className="sales-sidebar">
        <h3 className="sales-sidebar-title">Sales Panel</h3>

        <button onClick={() => navigate("/")}>HomePage</button>

        <button
          className={activeSection === SECTION_KEYS.OVERVIEW ? "active" : ""}
          onClick={() => setActiveSection(SECTION_KEYS.OVERVIEW)}
        >
          Overview
        </button>

        <button
          className={activeSection === SECTION_KEYS.ORDER_INTAKE ? "active" : ""}
          onClick={() => setActiveSection(SECTION_KEYS.ORDER_INTAKE)}
        >
          Order Intake
        </button>

        <button
          className={activeSection === SECTION_KEYS.PRESCRIPTION_SUPPORT ? "active" : ""}
          onClick={() => setActiveSection(SECTION_KEYS.PRESCRIPTION_SUPPORT)}
        >
          Prescription Support
        </button>

        <button
          className={activeSection === SECTION_KEYS.HANDOFF ? "active" : ""}
          onClick={() => setActiveSection(SECTION_KEYS.HANDOFF)}
        >
          Confirm & Handoff
        </button>

        <button
          className={activeSection === SECTION_KEYS.PREORDER ? "active" : ""}
          onClick={() => setActiveSection(SECTION_KEYS.PREORDER)}
        >
          Pre-order
        </button>

        <button
          className={activeSection === SECTION_KEYS.COMPLAINTS ? "active" : ""}
          onClick={() => setActiveSection(SECTION_KEYS.COMPLAINTS)}
        >
          Complaints
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="sales-content">
        <button
          className="sales-menu-toggle"
          type="button"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? "Hide menu" : "Show menu"}
        </button>

        <div className="sales-panel">
          {!isLoading &&
          !loadError &&
          activeSection !== SECTION_KEYS.OVERVIEW
            ? renderFilters()
            : null}
          {actionMessage ? (
            <p className="sales-feedback success">{actionMessage}</p>
          ) : null}
          {actionError ? <p className="sales-feedback error">{actionError}</p> : null}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
