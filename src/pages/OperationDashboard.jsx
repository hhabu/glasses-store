import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/OperationDashboard.css";
import { useAuth } from "../context/AuthContext";
import { formatVND } from "../utils/currency";
import { fetchOrders, mapApiOrderToView, updateOrder } from "../services/orderApi";
import {
  BLOCKED_REASON_OPTIONS,
  OPERATION_STAGES,
  QC_CHECKLIST_FIELDS,
  SALES_STAGES,
  buildOrderWorkflowPayload,
  createWorkflowTimelineEntry,
  getBlockedReasonLabel,
  getOperationStageLabel,
  getOrderWorkflow,
  getPriorityLabel,
  normalizeOrderStatus,
} from "../utils/orderWorkflow";

const OPERATION_SECTIONS = {
  OVERVIEW: "OVERVIEW",
  PRODUCTION: "PRODUCTION",
  SHIPPING: "SHIPPING",
  COMPLETED: "COMPLETED",
};

const PRODUCTION_STAGES = [
  OPERATION_STAGES.NONE,
  OPERATION_STAGES.RECEIVED_FROM_SALES,
  OPERATION_STAGES.MATERIAL_PREP,
  OPERATION_STAGES.ASSEMBLY,
  OPERATION_STAGES.QC_PENDING,
  OPERATION_STAGES.QC_FAILED,
  OPERATION_STAGES.QC_PASSED,
  OPERATION_STAGES.PACKING,
];

function getStatusBadgeClass(status) {
  const normalized = normalizeOrderStatus(status);

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

function toDateTimeInputValue(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
    parsed.getDate()
  )}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function toIsoDateTime(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function createChecklistState(fields, source = {}) {
  return fields.reduce((result, field) => {
    result[field.key] = Boolean(source?.[field.key]);
    return result;
  }, {});
}

function hasAllChecklistItems(checklist, fields) {
  return fields.every((field) => Boolean(checklist?.[field.key]));
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

function createOperationDraft(order, actorName) {
  const workflow = getOrderWorkflow(order);

  return {
    assigneeOperation: workflow.assigneeOperation || actorName || "",
    dueAt: toDateTimeInputValue(workflow.dueAt),
    blockedReason: workflow.blockedReason || "",
    shippingCarrier: workflow.shippingCarrier || "",
    trackingCode: workflow.trackingCode || "",
    note: "",
    qcChecklist: createChecklistState(QC_CHECKLIST_FIELDS, workflow.qcChecklist),
  };
}

function getOperationNextActionLabel(order) {
  const workflow = getOrderWorkflow(order);
  const stage = workflow.operationStage;

  if (stage === OPERATION_STAGES.NONE) {
    return "Claim the handoff from sales.";
  }

  if (stage === OPERATION_STAGES.RECEIVED_FROM_SALES) {
    return "Prepare materials and start production.";
  }

  if (stage === OPERATION_STAGES.MATERIAL_PREP) {
    return "Start assembly.";
  }

  if (stage === OPERATION_STAGES.ASSEMBLY) {
    return "Move the order into QC.";
  }

  if (stage === OPERATION_STAGES.QC_PENDING) {
    return "Complete QC or flag an issue.";
  }

  if (stage === OPERATION_STAGES.QC_FAILED) {
    return "Resolve the issue or send the case back to sales.";
  }

  if (stage === OPERATION_STAGES.QC_PASSED) {
    return "Pack the order.";
  }

  if (stage === OPERATION_STAGES.PACKING) {
    return "Prepare shipment and tracking.";
  }

  if (stage === OPERATION_STAGES.READY_TO_SHIP) {
    return "Dispatch the shipment.";
  }

  if (stage === OPERATION_STAGES.DELIVERING) {
    return "Monitor delivery and close the order.";
  }

  if (stage === OPERATION_STAGES.DELIVERY_EXCEPTION) {
    return "Coordinate with sales on the delivery issue.";
  }

  return "Workflow completed.";
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
  const [orderDrafts, setOrderDrafts] = useState({});
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const operationActorName =
    user?.fullName || user?.name || user?.username || "Operation Staff";

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

  useEffect(() => {
    setOrderDrafts((previous) => {
      const next = {};

      orders.forEach((order) => {
        const key = String(order.id);
        next[key] = previous[key] || createOperationDraft(order, operationActorName);
      });

      return next;
    });
  }, [orders, operationActorName]);

  const productionOrders = useMemo(
    () =>
      orders.filter((order) => {
        const workflow = getOrderWorkflow(order);
        return (
          PRODUCTION_STAGES.includes(workflow.operationStage) &&
          normalizeOrderStatus(order.status) !== "DELIVERED"
        );
      }),
    [orders]
  );

  const shippingOrders = useMemo(
    () =>
      orders.filter((order) => {
        const workflow = getOrderWorkflow(order);
        return [
          OPERATION_STAGES.READY_TO_SHIP,
          OPERATION_STAGES.DELIVERING,
          OPERATION_STAGES.DELIVERY_EXCEPTION,
        ].includes(workflow.operationStage);
      }),
    [orders]
  );

  const completedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          getOrderWorkflow(order).operationStage === OPERATION_STAGES.DELIVERED ||
          normalizeOrderStatus(order.status) === "DELIVERED"
      ),
    [orders]
  );

  const metrics = useMemo(
    () => ({
      readyToClaim: orders.filter(
        (order) => normalizeOrderStatus(order.status) === "READY_FOR_OPERATION"
      ).length,
      activeProduction: productionOrders.length,
      shipping: shippingOrders.length,
      exceptions: orders.filter((order) =>
        ["QC_FAILED", "DELIVERY_EXCEPTION"].includes(
          getOrderWorkflow(order).blockedReason
        )
      ).length,
      deliveredToday: completedOrders.filter((order) =>
        isToday(order.updatedAt || order.createdAt)
      ).length,
    }),
    [orders, productionOrders, shippingOrders, completedOrders]
  );

  const getDraft = (order) =>
    orderDrafts[String(order.id)] || createOperationDraft(order, operationActorName);

  const updateDraft = (orderId, patch) => {
    setOrderDrafts((previous) => ({
      ...previous,
      [String(orderId)]: {
        ...(previous[String(orderId)] || {}),
        ...patch,
      },
    }));
  };

  const updateQcChecklist = (orderId, key, checked) => {
    setOrderDrafts((previous) => {
      const current = previous[String(orderId)] || {};
      return {
        ...previous,
        [String(orderId)]: {
          ...current,
          qcChecklist: {
            ...(current.qcChecklist || {}),
            [key]: checked,
          },
        },
      };
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const persistOperationUpdate = async (
    order,
    { workflowUpdates, rootUpdates, action, note, details, successText }
  ) => {
    setActionMessage("");
    setActionError("");
    setActionOrderId(String(order.id));

    try {
      const updatedRaw = await updateOrder(
        order.id,
        buildOrderWorkflowPayload(order, {
          workflowUpdates,
          rootUpdates,
          timelineEntry: createWorkflowTimelineEntry({
            role: "OPERATION",
            actor: operationActorName,
            action,
            note,
            details,
          }),
        })
      );

      const updatedMapped = mapApiOrderToView(updatedRaw);
      setOrders((previous) =>
        previous.map((item) =>
          String(item.id) === String(order.id) ? updatedMapped : item
        )
      );
      setOrderDrafts((previous) => ({
        ...previous,
        [String(order.id)]: createOperationDraft(updatedMapped, operationActorName),
      }));
      setActionMessage(successText);
    } catch {
      setActionError("Failed to update operation workflow. Please try again.");
    } finally {
      setActionOrderId("");
    }
  };

  const handleOperationAction = async (order, actionKey) => {
    const draft = getDraft(order);
    const note = draft.note.trim();
    const blockedReason = draft.blockedReason || "";
    const baseWorkflowUpdates = {
      assigneeOperation: draft.assigneeOperation.trim(),
      dueAt: toIsoDateTime(draft.dueAt),
      blockedReason,
      shippingCarrier: draft.shippingCarrier.trim(),
      trackingCode: draft.trackingCode.trim(),
      qcChecklist: draft.qcChecklist,
    };

    const requireValue = (condition, message) => {
      if (!condition) {
        setActionMessage("");
        setActionError(message);
        return false;
      }

      return true;
    };

    const deliveryRootUpdates = (status) => {
      if (
        status !== "DELIVERED" ||
        normalizeOrderStatus(order.payment?.method) !== "COD" ||
        normalizeOrderStatus(order.payment?.status) === "PAID"
      ) {
        return { status };
      }

      return {
        status,
        payment_status: "PAID",
        paidAt: new Date().toISOString(),
      };
    };

    switch (actionKey) {
      case "CLAIM_FROM_SALES":
        if (
          !requireValue(
            draft.assigneeOperation.trim(),
            `Assign an operation owner before claiming ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.RECEIVED_FROM_SALES,
            blockedReason: "",
          },
          rootUpdates: {
            status: "READY_FOR_OPERATION",
          },
          action: "Claimed handoff from sales",
          note,
          details: [`Owner: ${draft.assigneeOperation.trim()}`],
          successText: `${getDisplayOrderId(order)} claimed by operation.`,
        });
        return;

      case "START_MATERIAL_PREP":
        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.MATERIAL_PREP,
            blockedReason: "",
          },
          rootUpdates: {
            status: "IN_OPERATION",
          },
          action: "Started material prep",
          note,
          details: [],
          successText: `${getDisplayOrderId(order)} moved to material prep.`,
        });
        return;

      case "START_ASSEMBLY":
        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.ASSEMBLY,
            blockedReason: "",
          },
          rootUpdates: {
            status: "IN_OPERATION",
          },
          action: "Started assembly",
          note,
          details: [],
          successText: `${getDisplayOrderId(order)} moved to assembly.`,
        });
        return;

      case "SEND_TO_QC":
        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.QC_PENDING,
            blockedReason: "",
          },
          rootUpdates: {
            status: "IN_OPERATION",
          },
          action: "Moved order to QC",
          note,
          details: [],
          successText: `${getDisplayOrderId(order)} moved to QC.`,
        });
        return;

      case "MARK_QC_FAILED":
        if (
          !requireValue(
            note,
            `Add a QC note before failing ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.QC_FAILED,
            blockedReason: blockedReason || "QC_FAILED",
          },
          rootUpdates: {
            status: "IN_OPERATION",
          },
          action: "QC failed",
          note,
          details: [getBlockedReasonLabel(blockedReason || "QC_FAILED")],
          successText: `${getDisplayOrderId(order)} marked as QC failed.`,
        });
        return;

      case "SEND_BACK_TO_SALES":
        if (
          !requireValue(
            note,
            `Add a note before sending ${getDisplayOrderId(order)} back to sales.`
          ) ||
          !requireValue(
            blockedReason,
            `Select a blocker before sending ${getDisplayOrderId(order)} back to sales.`
          )
        ) {
          return;
        }

        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.QC_FAILED,
            salesStage: SALES_STAGES.WAITING_CUSTOMER_RESPONSE,
          },
          rootUpdates: {
            status: "CUSTOMER_UPDATE_REQUIRED",
          },
          action: "Sent order back to sales",
          note,
          details: [getBlockedReasonLabel(blockedReason)],
          successText: `${getDisplayOrderId(order)} returned to sales for follow-up.`,
        });
        return;

      case "MARK_QC_PASSED":
        if (
          !requireValue(
            hasAllChecklistItems(draft.qcChecklist, QC_CHECKLIST_FIELDS),
            `Complete the QC checklist before passing ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.QC_PASSED,
            blockedReason: "",
          },
          rootUpdates: {
            status: "IN_OPERATION",
          },
          action: "QC passed",
          note,
          details: ["QC checklist complete"],
          successText: `${getDisplayOrderId(order)} passed QC.`,
        });
        return;

      case "PACK_ORDER":
        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.PACKING,
            blockedReason: "",
          },
          rootUpdates: {
            status: "IN_OPERATION",
          },
          action: "Packed order",
          note,
          details: [],
          successText: `${getDisplayOrderId(order)} moved to packing.`,
        });
        return;

      case "MOVE_TO_SHIPPING":
        if (
          !requireValue(
            draft.shippingCarrier.trim() && draft.trackingCode.trim(),
            `Enter carrier and tracking code before moving ${getDisplayOrderId(
              order
            )} to shipping.`
          )
        ) {
          return;
        }

        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.READY_TO_SHIP,
            blockedReason: "",
          },
          rootUpdates: {
            status: "READY_TO_SHIP",
          },
          action: "Prepared shipment",
          note,
          details: [
            `Carrier: ${draft.shippingCarrier.trim()}`,
            `Tracking: ${draft.trackingCode.trim()}`,
          ],
          successText: `${getDisplayOrderId(order)} is ready to ship.`,
        });
        return;

      case "START_DELIVERY":
        if (
          !requireValue(
            draft.shippingCarrier.trim() && draft.trackingCode.trim(),
            `Enter carrier and tracking code before dispatching ${getDisplayOrderId(
              order
            )}.`
          )
        ) {
          return;
        }

        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.DELIVERING,
            blockedReason: "",
          },
          rootUpdates: {
            status: "DELIVERING",
          },
          action: "Started delivery",
          note,
          details: [
            `Carrier: ${draft.shippingCarrier.trim()}`,
            `Tracking: ${draft.trackingCode.trim()}`,
          ],
          successText: `${getDisplayOrderId(order)} moved to delivering.`,
        });
        return;

      case "REPORT_EXCEPTION":
        if (
          !requireValue(
            note,
            `Add an exception note before escalating ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.DELIVERY_EXCEPTION,
            salesStage: SALES_STAGES.WAITING_CUSTOMER_RESPONSE,
            blockedReason: blockedReason || "DELIVERY_EXCEPTION",
          },
          rootUpdates: {
            status: "CUSTOMER_UPDATE_REQUIRED",
          },
          action: "Reported delivery exception",
          note,
          details: [
            getBlockedReasonLabel(blockedReason || "DELIVERY_EXCEPTION"),
          ],
          successText: `${getDisplayOrderId(order)} escalated due to delivery exception.`,
        });
        return;

      case "MARK_DELIVERED":
        await persistOperationUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            operationStage: OPERATION_STAGES.DELIVERED,
            blockedReason: "",
          },
          rootUpdates: deliveryRootUpdates("DELIVERED"),
          action: "Marked order delivered",
          note,
          details: [
            draft.shippingCarrier.trim()
              ? `Carrier: ${draft.shippingCarrier.trim()}`
              : "",
          ].filter(Boolean),
          successText: `${getDisplayOrderId(order)} marked as delivered.`,
        });
        return;

      default:
        return;
    }
  };

  const renderSectionIntro = (title, subtitle) => (
    <div className="operation-section-head">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );

  const renderSharedFields = (order, options = {}) => {
    const draft = getDraft(order);

    return (
      <div className="operation-workflow-form">
        <div className="operation-form-grid">
          {options.showAssigneeOperation ? (
            <label className="operation-form-field">
              <span>Operation owner</span>
              <input
                type="text"
                value={draft.assigneeOperation}
                onChange={(event) =>
                  updateDraft(order.id, { assigneeOperation: event.target.value })
                }
                placeholder="Assign operation owner"
              />
            </label>
          ) : null}

          {options.showDueAt ? (
            <label className="operation-form-field">
              <span>Due at</span>
              <input
                type="datetime-local"
                value={draft.dueAt}
                onChange={(event) =>
                  updateDraft(order.id, { dueAt: event.target.value })
                }
              />
            </label>
          ) : null}

          {options.showBlockedReason ? (
            <label className="operation-form-field">
              <span>Blocked reason</span>
              <select
                value={draft.blockedReason}
                onChange={(event) =>
                  updateDraft(order.id, { blockedReason: event.target.value })
                }
              >
                <option value="">Select blocker</option>
                {BLOCKED_REASON_OPTIONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {options.showShippingMeta ? (
            <>
              <label className="operation-form-field">
                <span>Carrier</span>
                <input
                  type="text"
                  value={draft.shippingCarrier}
                  onChange={(event) =>
                    updateDraft(order.id, { shippingCarrier: event.target.value })
                  }
                  placeholder="DHL, GHTK, GHN..."
                />
              </label>

              <label className="operation-form-field">
                <span>Tracking code</span>
                <input
                  type="text"
                  value={draft.trackingCode}
                  onChange={(event) =>
                    updateDraft(order.id, { trackingCode: event.target.value })
                  }
                  placeholder="Tracking number"
                />
              </label>
            </>
          ) : null}
        </div>

        {options.showQcChecklist ? (
          <div className="operation-checklist">
            <p className="operation-card-section-title">QC checklist</p>
            <div className="operation-checklist-grid">
              {QC_CHECKLIST_FIELDS.map((field) => (
                <label className="operation-checklist-item" key={field.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.qcChecklist?.[field.key])}
                    onChange={(event) =>
                      updateQcChecklist(order.id, field.key, event.target.checked)
                    }
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {options.showNote ? (
          <label className="operation-form-field is-full">
            <span>Internal note</span>
            <textarea
              value={draft.note}
              onChange={(event) =>
                updateDraft(order.id, { note: event.target.value })
              }
              rows={3}
              placeholder="Write the production or delivery update..."
            />
          </label>
        ) : null}
      </div>
    );
  };

  const renderOrderCard = (order, content) => {
    const workflow = getOrderWorkflow(order);

    return (
      <article className="operation-order-card" key={order.id}>
        <div className="operation-order-head">
          <div>
            <h4>{getDisplayOrderId(order)}</h4>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="operation-status-row">
            <span
              className={`operation-status-badge ${getStatusBadgeClass(
                order.status
              )}`}
            >
              {order.status || "-"}
            </span>
            <span className="operation-status-badge is-neutral">
              {getOperationStageLabel(workflow.operationStage)}
            </span>
            <span className="operation-status-badge is-info">
              {getPriorityLabel(workflow.priority)}
            </span>
          </div>
        </div>

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

        <div className="operation-meta-grid">
          <div className="operation-meta-card">
            <span>Operation owner</span>
            <strong>{workflow.assigneeOperation || "Unassigned"}</strong>
          </div>
          <div className="operation-meta-card">
            <span>Due at</span>
            <strong>{formatDateTime(workflow.dueAt)}</strong>
          </div>
          <div className="operation-meta-card">
            <span>Tracking</span>
            <strong>
              {workflow.trackingCode
                ? `${workflow.shippingCarrier || "Carrier"} / ${workflow.trackingCode}`
                : "Not assigned"}
            </strong>
          </div>
          <div className="operation-meta-card">
            <span>Next action</span>
            <strong>{getOperationNextActionLabel(order)}</strong>
          </div>
        </div>

        {workflow.blockedReason ? (
          <p className="operation-note-strip is-warning">
            Blocked by: {getBlockedReasonLabel(workflow.blockedReason)}
          </p>
        ) : null}

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

        {workflow.timeline.length > 0 ? (
          <div className="operation-timeline">
            <p className="operation-card-section-title">Recent timeline</p>
            <div className="operation-timeline-list">
              {workflow.timeline.slice(0, 3).map((entry) => (
                <div className="operation-timeline-entry" key={entry.id}>
                  <div>
                    <strong>{entry.action}</strong>
                    <span>{entry.actor || entry.role || "Team"}</span>
                  </div>
                  <time>{formatDateTime(entry.at)}</time>
                  {entry.note ? <p>{entry.note}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {content}
      </article>
    );
  };

  const renderOverview = () => (
    <div>
      {renderSectionIntro(
        "Operations Overview",
        "Production is now broken into internal stages with QC gates, shipping records, and exception loops back to sales."
      )}
      <div className="operation-metric-grid">
        <div className="operation-metric-card">
          <p>Ready To Claim</p>
          <strong>{metrics.readyToClaim}</strong>
        </div>
        <div className="operation-metric-card">
          <p>Active Production</p>
          <strong>{metrics.activeProduction}</strong>
        </div>
        <div className="operation-metric-card">
          <p>Shipping Queue</p>
          <strong>{metrics.shipping}</strong>
        </div>
        <div className="operation-metric-card">
          <p>Exceptions</p>
          <strong>{metrics.exceptions}</strong>
        </div>
        <div className="operation-metric-card">
          <p>Delivered Today</p>
          <strong>{metrics.deliveredToday}</strong>
        </div>
      </div>
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
      case OPERATION_SECTIONS.PRODUCTION:
        return (
          <div>
            {renderSectionIntro(
              "Production Queue",
              "Claim handoff, move through material prep and assembly, then pass only verified orders through QC and packing."
            )}
            {productionOrders.length === 0 ? (
              <p className="operation-empty">No production orders right now.</p>
            ) : (
              <div className="operation-order-grid">
                {productionOrders.map((order) => {
                  const workflow = getOrderWorkflow(order);
                  const stage = workflow.operationStage;
                  const isBusy = actionOrderId === String(order.id);

                  return renderOrderCard(
                    order,
                    <div className="operation-card-actions-shell">
                      {renderSharedFields(order, {
                        showAssigneeOperation: true,
                        showDueAt: true,
                        showBlockedReason: true,
                        showQcChecklist: true,
                        showShippingMeta:
                          stage === OPERATION_STAGES.PACKING ||
                          stage === OPERATION_STAGES.QC_PASSED,
                        showNote: true,
                      })}
                      <div className="operation-order-actions">
                        {stage === OPERATION_STAGES.NONE ? (
                          <button
                            type="button"
                            onClick={() => handleOperationAction(order, "CLAIM_FROM_SALES")}
                            disabled={isBusy}
                          >
                            Claim From Sales
                          </button>
                        ) : null}

                        {[OPERATION_STAGES.NONE, OPERATION_STAGES.RECEIVED_FROM_SALES].includes(
                          stage
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleOperationAction(order, "START_MATERIAL_PREP")
                            }
                            disabled={isBusy}
                          >
                            Start Material Prep
                          </button>
                        ) : null}

                        {stage === OPERATION_STAGES.MATERIAL_PREP ? (
                          <button
                            type="button"
                            onClick={() => handleOperationAction(order, "START_ASSEMBLY")}
                            disabled={isBusy}
                          >
                            Start Assembly
                          </button>
                        ) : null}

                        {stage === OPERATION_STAGES.ASSEMBLY ? (
                          <button
                            type="button"
                            onClick={() => handleOperationAction(order, "SEND_TO_QC")}
                            disabled={isBusy}
                          >
                            Send To QC
                          </button>
                        ) : null}

                        {[OPERATION_STAGES.QC_PENDING, OPERATION_STAGES.QC_FAILED].includes(
                          stage
                        ) ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleOperationAction(order, "MARK_QC_FAILED")
                              }
                              disabled={isBusy}
                            >
                              QC Failed
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleOperationAction(order, "SEND_BACK_TO_SALES")
                              }
                              disabled={isBusy}
                            >
                              Need Sales Follow-up
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleOperationAction(order, "MARK_QC_PASSED")
                              }
                              disabled={isBusy}
                            >
                              QC Passed
                            </button>
                          </>
                        ) : null}

                        {stage === OPERATION_STAGES.QC_PASSED ? (
                          <button
                            type="button"
                            onClick={() => handleOperationAction(order, "PACK_ORDER")}
                            disabled={isBusy}
                          >
                            Pack Order
                          </button>
                        ) : null}

                        {stage === OPERATION_STAGES.PACKING ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleOperationAction(order, "MOVE_TO_SHIPPING")
                            }
                            disabled={isBusy}
                          >
                            Ready To Ship
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case OPERATION_SECTIONS.SHIPPING:
        return (
          <div>
            {renderSectionIntro(
              "Shipping Queue",
              "Shipping now requires carrier, tracking, and an exception path instead of only toggling delivery status."
            )}
            {shippingOrders.length === 0 ? (
              <p className="operation-empty">No shipping orders right now.</p>
            ) : (
              <div className="operation-order-grid">
                {shippingOrders.map((order) => {
                  const workflow = getOrderWorkflow(order);
                  const stage = workflow.operationStage;
                  const isBusy = actionOrderId === String(order.id);

                  return renderOrderCard(
                    order,
                    <div className="operation-card-actions-shell">
                      {renderSharedFields(order, {
                        showAssigneeOperation: true,
                        showBlockedReason: true,
                        showShippingMeta: true,
                        showNote: true,
                      })}
                      <div className="operation-order-actions">
                        {stage === OPERATION_STAGES.READY_TO_SHIP ? (
                          <button
                            type="button"
                            onClick={() => handleOperationAction(order, "START_DELIVERY")}
                            disabled={isBusy}
                          >
                            Start Delivery
                          </button>
                        ) : null}

                        {[OPERATION_STAGES.DELIVERING, OPERATION_STAGES.DELIVERY_EXCEPTION].includes(
                          stage
                        ) ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleOperationAction(order, "REPORT_EXCEPTION")
                              }
                              disabled={isBusy}
                            >
                              Report Exception
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleOperationAction(order, "MARK_DELIVERED")
                              }
                              disabled={isBusy}
                            >
                              Mark Delivered
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case OPERATION_SECTIONS.COMPLETED:
        return (
          <div>
            {renderSectionIntro(
              "Completed Orders",
              "Delivered orders keep their internal timeline so the team can audit what happened during production and shipping."
            )}
            {completedOrders.length === 0 ? (
              <p className="operation-empty">No completed orders yet.</p>
            ) : (
              <div className="operation-order-grid">
                {completedOrders.map((order) =>
                  renderOrderCard(
                    order,
                    <div className="operation-order-actions">
                      <span className="operation-tag">Delivered</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );

      default:
        return renderOverview();
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
          className={activeSection === OPERATION_SECTIONS.PRODUCTION ? "active" : ""}
          onClick={() => setActiveSection(OPERATION_SECTIONS.PRODUCTION)}
        >
          Production Queue
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
          Completed
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="operation-content">
        <button
          className="operation-menu-toggle"
          type="button"
          onClick={() => setIsSidebarOpen((previous) => !previous)}
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
