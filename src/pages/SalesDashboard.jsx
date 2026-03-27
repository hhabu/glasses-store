import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SalesDashboard.css";
import { useAuth } from "../context/AuthContext";
import { formatVND } from "../utils/currency";
import { fetchOrders, mapApiOrderToView, updateOrder } from "../services/orderApi";
import {
  BLOCKED_REASON_OPTIONS,
  COMPLAINT_STAGES,
  PRIORITY_OPTIONS,
  RESOLUTION_TYPE_OPTIONS,
  RX_CHECKLIST_FIELDS,
  SALES_STAGES,
  buildOrderWorkflowPayload,
  createWorkflowTimelineEntry,
  getBlockedReasonLabel,
  getComplaintStageLabel,
  getOrderWorkflow,
  getPriorityLabel,
  getResolutionTypeLabel,
  getSalesStageLabel,
  isComplaintOrder,
  isPreOrderOrder,
  normalizeOrderStatus,
  orderRequiresPrescriptionCheck,
} from "../utils/orderWorkflow";

const SECTION_KEYS = {
  OVERVIEW: "OVERVIEW",
  ORDER_INTAKE: "ORDER_INTAKE",
  PRESCRIPTION_SUPPORT: "PRESCRIPTION_SUPPORT",
  HANDOFF: "HANDOFF",
  PREORDER: "PREORDER",
  COMPLAINTS: "COMPLAINTS",
};

const SALES_PIPELINE_STAGES = [
  SALES_STAGES.NEW_ORDER,
  SALES_STAGES.PAYMENT_VERIFIED,
  SALES_STAGES.CUSTOMER_INFO_CHECK,
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

function getDisplayOrderId(order) {
  return order?.orderCode || `ORD-${order?.id || ""}`;
}

function getOrderTypeLabel(order) {
  return orderRequiresPrescriptionCheck(order)
    ? "Prescription order"
    : "Ready-made order";
}

function hasAllChecklistItems(checklist, fields) {
  return fields.every((field) => Boolean(checklist?.[field.key]));
}

function isOverdue(value) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < Date.now();
}

function createChecklistState(fields, source = {}) {
  return fields.reduce((result, field) => {
    result[field.key] = Boolean(source?.[field.key]);
    return result;
  }, {});
}

function createSalesDraft(order, actorName) {
  const workflow = getOrderWorkflow(order);

  return {
    assigneeSales: workflow.assigneeSales || actorName || "",
    assigneeOperation: workflow.assigneeOperation || "",
    priority: workflow.priority || "NORMAL",
    dueAt: toDateTimeInputValue(workflow.dueAt),
    blockedReason: workflow.blockedReason || "",
    handoffNote: workflow.handoffNote || "",
    preorderEta: toDateTimeInputValue(workflow.preorderEta),
    resolutionType: workflow.resolutionType || "",
    note: "",
    rxChecklist: createChecklistState(RX_CHECKLIST_FIELDS, workflow.rxChecklist),
  };
}

function getNextActionLabel(order) {
  const workflow = getOrderWorkflow(order);
  const stage = workflow.salesStage;

  if (stage === SALES_STAGES.NEW_ORDER) {
    return "Claim intake and verify payment.";
  }

  if (stage === SALES_STAGES.PAYMENT_VERIFIED) {
    return "Complete customer info review.";
  }

  if (stage === SALES_STAGES.CUSTOMER_INFO_CHECK) {
    return orderRequiresPrescriptionCheck(order)
      ? "Route to RX review or ask customer for corrections."
      : "Prepare the handoff package for operation.";
  }

  if (stage === SALES_STAGES.RX_REVIEW) {
    return "Complete the RX checklist before handoff.";
  }

  if (stage === SALES_STAGES.WAITING_CUSTOMER_RESPONSE) {
    return "Follow up with customer and resume review.";
  }

  if (stage === SALES_STAGES.PREORDER_CONFIRMATION) {
    return "Set ETA and move the order to handoff when ready.";
  }

  if (stage === SALES_STAGES.READY_FOR_HANDOFF) {
    return normalizeOrderStatus(order?.status) === "READY_FOR_OPERATION"
      ? "Waiting for operation team to claim this order."
      : "Assign operation owner and send the order to operation.";
  }

  if (stage === SALES_STAGES.AFTER_SALES_TRIAGE) {
    return "Decide refund, warranty, or support path.";
  }

  if (stage === SALES_STAGES.CASE_CLOSED) {
    return "Case completed.";
  }

  return "Review the order workflow.";
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
  const [filterSalesStage, setFilterSalesStage] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState("");
  const [filterCreatedTo, setFilterCreatedTo] = useState("");
  const [orderDrafts, setOrderDrafts] = useState({});
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const salesActorName =
    user?.fullName || user?.name || user?.username || "Sales Staff";

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

  useEffect(() => {
    setOrderDrafts((previous) => {
      const next = {};

      orders.forEach((order) => {
        const key = String(order.id);
        next[key] = previous[key] || createSalesDraft(order, salesActorName);
      });

      return next;
    });
  }, [orders, salesActorName]);

  const statusOptions = useMemo(() => {
    const values = [
      ...new Set(orders.map((order) => normalizeOrderStatus(order.status)).filter(Boolean)),
    ];
    return values.sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const salesStageOptions = useMemo(() => {
    const values = [
      ...new Set(
        orders
          .map((order) => getOrderWorkflow(order).salesStage)
          .filter(Boolean)
      ),
    ];
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
      const workflow = getOrderWorkflow(order);

      if (query) {
        const haystack = `${getDisplayOrderId(order)} ${order.id || ""}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (
        filterStatus !== "ALL" &&
        normalizeOrderStatus(order.status) !== filterStatus
      ) {
        return false;
      }

      if (
        filterSalesStage !== "ALL" &&
        workflow.salesStage !== filterSalesStage
      ) {
        return false;
      }

      if (filterPriority !== "ALL" && workflow.priority !== filterPriority) {
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
  }, [
    orders,
    filterOrderCode,
    filterStatus,
    filterSalesStage,
    filterPriority,
    filterCreatedFrom,
    filterCreatedTo,
  ]);

  const metrics = useMemo(() => {
    const waitingPayment = orders.filter((order) =>
      ["PENDING_PAYMENT", "PENDING_QR"].includes(normalizeOrderStatus(order.status))
    ).length;
    const intake = orders.filter((order) => {
      const workflow = getOrderWorkflow(order);
      return (
        !isPreOrderOrder(order) &&
        !isComplaintOrder(order) &&
        SALES_PIPELINE_STAGES.includes(workflow.salesStage)
      );
    }).length;
    const rxReview = orders.filter((order) => {
      const workflow = getOrderWorkflow(order);
      return (
        workflow.salesStage === SALES_STAGES.RX_REVIEW ||
        workflow.salesStage === SALES_STAGES.WAITING_CUSTOMER_RESPONSE
      );
    }).length;
    const handoff = orders.filter((order) => {
      const workflow = getOrderWorkflow(order);
      return workflow.salesStage === SALES_STAGES.READY_FOR_HANDOFF;
    }).length;
    const overdue = orders.filter((order) =>
      isOverdue(getOrderWorkflow(order).dueAt)
    ).length;
    const complaints = orders.filter((order) => {
      const workflow = getOrderWorkflow(order);
      return workflow.complaintStage !== COMPLAINT_STAGES.NONE;
    }).length;

    return {
      totalOrders: orders.length,
      waitingPayment,
      intake,
      rxReview,
      handoff,
      overdue,
      complaints,
    };
  }, [orders]);

  const intakeOrders = useMemo(
    () =>
      filteredOrders.filter((order) => {
        const workflow = getOrderWorkflow(order);
        return (
          !isPreOrderOrder(order) &&
          !isComplaintOrder(order) &&
          SALES_PIPELINE_STAGES.includes(workflow.salesStage)
        );
      }),
    [filteredOrders]
  );

  const rxOrders = useMemo(
    () =>
      filteredOrders.filter((order) => {
        const workflow = getOrderWorkflow(order);
        return (
          orderRequiresPrescriptionCheck(order) &&
          [
            SALES_STAGES.RX_REVIEW,
            SALES_STAGES.WAITING_CUSTOMER_RESPONSE,
          ].includes(workflow.salesStage)
        );
      }),
    [filteredOrders]
  );

  const handoffOrders = useMemo(
    () =>
      filteredOrders.filter((order) => {
        const workflow = getOrderWorkflow(order);
        const status = normalizeOrderStatus(order.status);

        return (
          workflow.salesStage === SALES_STAGES.READY_FOR_HANDOFF &&
          !["IN_OPERATION", "READY_TO_SHIP", "DELIVERING", "DELIVERED"].includes(
            status
          )
        );
      }),
    [filteredOrders]
  );

  const preOrderOrders = useMemo(
    () =>
      filteredOrders.filter((order) => {
        const workflow = getOrderWorkflow(order);
        return (
          isPreOrderOrder(order) &&
          workflow.salesStage === SALES_STAGES.PREORDER_CONFIRMATION
        );
      }),
    [filteredOrders]
  );

  const complaintOrders = useMemo(
    () =>
      filteredOrders.filter((order) => {
        const workflow = getOrderWorkflow(order);
        return (
          isComplaintOrder(order) ||
          workflow.complaintStage !== COMPLAINT_STAGES.NONE
        );
      }),
    [filteredOrders]
  );

  const getDraft = (order) =>
    orderDrafts[String(order.id)] || createSalesDraft(order, salesActorName);

  const updateDraft = (orderId, patch) => {
    setOrderDrafts((previous) => ({
      ...previous,
      [String(orderId)]: {
        ...(previous[String(orderId)] || {}),
        ...patch,
      },
    }));
  };

  const updateRxChecklist = (orderId, key, checked) => {
    setOrderDrafts((previous) => {
      const current = previous[String(orderId)] || {};
      return {
        ...previous,
        [String(orderId)]: {
          ...current,
          rxChecklist: {
            ...(current.rxChecklist || {}),
            [key]: checked,
          },
        },
      };
    });
  };

  const clearFilters = () => {
    setFilterOrderCode("");
    setFilterStatus("ALL");
    setFilterSalesStage("ALL");
    setFilterPriority("ALL");
    setFilterCreatedFrom("");
    setFilterCreatedTo("");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const persistSalesUpdate = async (
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
            role: "SALES",
            actor: salesActorName,
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
        [String(order.id)]: createSalesDraft(updatedMapped, salesActorName),
      }));
      setActionMessage(successText);
    } catch {
      setActionError("Failed to update sales workflow. Please try again.");
    } finally {
      setActionOrderId("");
    }
  };

  const handleSalesAction = async (order, actionKey) => {
    const draft = getDraft(order);
    const workflow = getOrderWorkflow(order);
    const baseWorkflowUpdates = {
      assigneeSales: draft.assigneeSales.trim(),
      assigneeOperation: draft.assigneeOperation.trim(),
      priority: draft.priority,
      dueAt: toIsoDateTime(draft.dueAt),
      handoffNote: draft.handoffNote.trim(),
      preorderEta: toIsoDateTime(draft.preorderEta),
      resolutionType: draft.resolutionType,
      rxChecklist: draft.rxChecklist,
    };
    const note = draft.note.trim();
    const blockedReasonLabel = getBlockedReasonLabel(draft.blockedReason);
    const operationOwner = draft.assigneeOperation.trim();

    const requireValue = (condition, message) => {
      if (!condition) {
        setActionMessage("");
        setActionError(message);
        return false;
      }

      return true;
    };

    switch (actionKey) {
      case "CLAIM_INTAKE":
        if (
          !requireValue(
            draft.assigneeSales.trim(),
            `Assign an owner before claiming ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.PAYMENT_VERIFIED,
            blockedReason: "",
          },
          rootUpdates: {},
          action: "Claimed intake queue",
          note,
          details: [
            `Owner: ${draft.assigneeSales.trim()}`,
            `Priority: ${getPriorityLabel(draft.priority)}`,
          ],
          successText: `${getDisplayOrderId(order)} claimed for intake review.`,
        });
        return;

      case "CUSTOMER_INFO_CHECK":
        if (
          !requireValue(
            draft.assigneeSales.trim(),
            `Assign an owner before updating ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.CUSTOMER_INFO_CHECK,
            blockedReason: "",
          },
          rootUpdates: {},
          action: "Completed customer info check",
          note,
          details: [
            `Customer info reviewed by ${draft.assigneeSales.trim()}`,
            draft.dueAt ? `Due: ${formatDateTime(draft.dueAt)}` : "",
          ].filter(Boolean),
          successText: `${getDisplayOrderId(order)} moved to customer info check.`,
        });
        return;

      case "START_RX_REVIEW":
        if (
          !requireValue(
            draft.assigneeSales.trim(),
            `Assign an RX owner before moving ${getDisplayOrderId(order)} to review.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.RX_REVIEW,
            blockedReason: "",
          },
          rootUpdates: {
            status: "PRESCRIPTION_REVIEW",
          },
          action: "Moved order to RX review",
          note,
          details: [`Owner: ${draft.assigneeSales.trim()}`],
          successText: `${getDisplayOrderId(order)} moved to prescription review.`,
        });
        return;

      case "REQUEST_CUSTOMER_UPDATE":
        if (
          !requireValue(
            draft.blockedReason,
            `Select a blocker before asking customer to update ${getDisplayOrderId(
              order
            )}.`
          ) ||
          !requireValue(
            note,
            `Add a note so the team knows why ${getDisplayOrderId(order)} is blocked.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.WAITING_CUSTOMER_RESPONSE,
            blockedReason: draft.blockedReason,
          },
          rootUpdates: {
            status: "CUSTOMER_UPDATE_REQUIRED",
          },
          action: "Requested customer update",
          note,
          details: [blockedReasonLabel],
          successText: `${getDisplayOrderId(order)} marked as waiting for customer response.`,
        });
        return;

      case "RESUME_RX_REVIEW":
        if (
          !requireValue(
            draft.assigneeSales.trim(),
            `Assign an owner before resuming ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.RX_REVIEW,
            blockedReason: "",
          },
          rootUpdates: {
            status: "PRESCRIPTION_REVIEW",
          },
          action: "Resumed RX review",
          note,
          details: [`Owner: ${draft.assigneeSales.trim()}`],
          successText: `${getDisplayOrderId(order)} returned to prescription review.`,
        });
        return;

      case "VERIFY_RX":
        if (
          !requireValue(
            hasAllChecklistItems(draft.rxChecklist, RX_CHECKLIST_FIELDS),
            `Complete the RX checklist before verifying ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.READY_FOR_HANDOFF,
            blockedReason: "",
          },
          rootUpdates: {},
          action: "Prescription verified",
          note,
          details: ["RX checklist completed"],
          successText: `${getDisplayOrderId(order)} is ready for handoff.`,
        });
        return;

      case "PREPARE_HANDOFF":
        if (
          !requireValue(
            draft.assigneeSales.trim(),
            `Assign an owner before preparing handoff for ${getDisplayOrderId(
              order
            )}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.READY_FOR_HANDOFF,
            blockedReason: "",
          },
          rootUpdates: {},
          action: "Prepared handoff package",
          note,
          details: [
            `Owner: ${draft.assigneeSales.trim()}`,
            draft.handoffNote.trim() ? "Handoff note prepared" : "",
          ].filter(Boolean),
          successText: `${getDisplayOrderId(order)} is queued for handoff.`,
        });
        return;

      case "CONFIRM_PREORDER":
        if (
          !requireValue(
            draft.preorderEta,
            `Set an ETA before confirming the pre-order for ${getDisplayOrderId(
              order
            )}.`
          ) ||
          !requireValue(
            note,
            `Add a note about the pre-order promise for ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.PREORDER_CONFIRMATION,
            blockedReason: "",
          },
          rootUpdates: {
            status: "PRE_ORDER_CONFIRMED",
          },
          action: "Confirmed pre-order ETA",
          note,
          details: [`ETA: ${formatDateTime(draft.preorderEta)}`],
          successText: `${getDisplayOrderId(order)} pre-order ETA confirmed.`,
        });
        return;

      case "MOVE_PREORDER_TO_HANDOFF":
        if (
          !requireValue(
            draft.preorderEta,
            `Set an ETA before handing off ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.READY_FOR_HANDOFF,
            blockedReason: "",
          },
          rootUpdates: {
            status: "PRE_ORDER_CONFIRMED",
          },
          action: "Moved pre-order to handoff",
          note,
          details: [`ETA: ${formatDateTime(draft.preorderEta)}`],
          successText: `${getDisplayOrderId(order)} moved to handoff queue.`,
        });
        return;

      case "SEND_TO_OPERATIONS":
        if (
          !requireValue(
            operationOwner,
            `Assign an operation owner before sending ${getDisplayOrderId(order)}.`
          ) ||
          !requireValue(
            draft.handoffNote.trim(),
            `Add a handoff note before transferring ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.READY_FOR_HANDOFF,
            blockedReason: "",
          },
          rootUpdates: {
            status: "READY_FOR_OPERATION",
          },
          action: "Sent order to operation",
          note,
          details: [
            `Operation owner: ${operationOwner}`,
            `Handoff note: ${draft.handoffNote.trim()}`,
          ],
          successText: `${getDisplayOrderId(order)} handed off to operation.`,
        });
        return;

      case "START_WARRANTY":
        if (
          !requireValue(
            note,
            `Add a support note before starting warranty for ${getDisplayOrderId(
              order
            )}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.AFTER_SALES_TRIAGE,
            complaintStage: COMPLAINT_STAGES.IN_PROGRESS,
            resolutionType: draft.resolutionType || "WARRANTY",
            priority: "COMPLAINT",
            blockedReason: "",
          },
          rootUpdates: {
            status: "WARRANTY_PROCESSING",
          },
          action: "Started warranty processing",
          note,
          details: [
            `Resolution: ${getResolutionTypeLabel(
              draft.resolutionType || "WARRANTY"
            )}`,
          ],
          successText: `${getDisplayOrderId(order)} moved to warranty processing.`,
        });
        return;

      case "APPROVE_REFUND":
        if (
          !requireValue(
            note,
            `Add a note before approving the refund for ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.AFTER_SALES_TRIAGE,
            complaintStage: COMPLAINT_STAGES.IN_PROGRESS,
            resolutionType: "REFUND",
            priority: "COMPLAINT",
            blockedReason: "",
          },
          rootUpdates: {
            status: "REFUND_APPROVED",
          },
          action: "Approved refund",
          note,
          details: ["Resolution: Refund"],
          successText: `${getDisplayOrderId(order)} refund approved.`,
        });
        return;

      case "CLOSE_CASE":
        if (
          !requireValue(
            note,
            `Add a final resolution note before closing ${getDisplayOrderId(order)}.`
          )
        ) {
          return;
        }

        await persistSalesUpdate(order, {
          workflowUpdates: {
            ...baseWorkflowUpdates,
            salesStage: SALES_STAGES.CASE_CLOSED,
            complaintStage: COMPLAINT_STAGES.CLOSED,
            priority: "COMPLAINT",
            blockedReason: "",
          },
          rootUpdates: {
            status:
              workflow.resolutionType === "WARRANTY" ||
              draft.resolutionType === "WARRANTY"
                ? "WARRANTY_COMPLETED"
                : "COMPLAINT_CLOSED",
          },
          action: "Closed support case",
          note,
          details: [
            draft.resolutionType
              ? `Resolution: ${getResolutionTypeLabel(draft.resolutionType)}`
              : "",
          ].filter(Boolean),
          successText: `${getDisplayOrderId(order)} support case closed.`,
        });
        return;

      default:
        return;
    }
  };

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
          <span>Public status</span>
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
          <span>Sales stage</span>
          <select
            value={filterSalesStage}
            onChange={(event) => setFilterSalesStage(event.target.value)}
          >
            <option value="ALL">All stages</option>
            {salesStageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {getSalesStageLabel(stage)}
              </option>
            ))}
          </select>
        </label>

        <label className="sales-filter-field">
          <span>Priority</span>
          <select
            value={filterPriority}
            onChange={(event) => setFilterPriority(event.target.value)}
          >
            <option value="ALL">All priorities</option>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
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

  const renderSharedFields = (order, options = {}) => {
    const draft = getDraft(order);

    return (
      <div className="sales-workflow-form">
        <div className="sales-form-grid">
          {options.showAssigneeSales ? (
            <label className="sales-form-field">
              <span>Sales owner</span>
              <input
                type="text"
                value={draft.assigneeSales}
                onChange={(event) =>
                  updateDraft(order.id, { assigneeSales: event.target.value })
                }
                placeholder="Assign sales owner"
              />
            </label>
          ) : null}

          {options.showAssigneeOperation ? (
            <label className="sales-form-field">
              <span>Operation owner</span>
              <input
                type="text"
                value={draft.assigneeOperation}
                onChange={(event) =>
                  updateDraft(order.id, {
                    assigneeOperation: event.target.value,
                  })
                }
                placeholder="Assign operation owner"
              />
            </label>
          ) : null}

          {options.showPriority ? (
            <label className="sales-form-field">
              <span>Priority</span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  updateDraft(order.id, { priority: event.target.value })
                }
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {options.showDueAt ? (
            <label className="sales-form-field">
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
            <label className="sales-form-field">
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

          {options.showPreorderEta ? (
            <label className="sales-form-field">
              <span>Pre-order ETA</span>
              <input
                type="datetime-local"
                value={draft.preorderEta}
                onChange={(event) =>
                  updateDraft(order.id, { preorderEta: event.target.value })
                }
              />
            </label>
          ) : null}

          {options.showResolutionType ? (
            <label className="sales-form-field">
              <span>Resolution type</span>
              <select
                value={draft.resolutionType}
                onChange={(event) =>
                  updateDraft(order.id, { resolutionType: event.target.value })
                }
              >
                <option value="">Select resolution</option>
                {RESOLUTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {options.showHandoffNote ? (
          <label className="sales-form-field is-full">
            <span>Handoff note</span>
            <textarea
              value={draft.handoffNote}
              onChange={(event) =>
                updateDraft(order.id, { handoffNote: event.target.value })
              }
              rows={3}
              placeholder="What should operation know before claiming this order?"
            />
          </label>
        ) : null}

        {options.showRxChecklist ? (
          <div className="sales-checklist">
            <p className="sales-card-section-title">RX checklist</p>
            <div className="sales-checklist-grid">
              {RX_CHECKLIST_FIELDS.map((field) => (
                <label className="sales-checklist-item" key={field.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.rxChecklist?.[field.key])}
                    onChange={(event) =>
                      updateRxChecklist(order.id, field.key, event.target.checked)
                    }
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {options.showNote ? (
          <label className="sales-form-field is-full">
            <span>Internal note</span>
            <textarea
              value={draft.note}
              onChange={(event) =>
                updateDraft(order.id, { note: event.target.value })
              }
              rows={3}
              placeholder="Write the reason, promise, or handoff context..."
            />
          </label>
        ) : null}
      </div>
    );
  };

  const renderOrderCard = (order, content) => {
    const workflow = getOrderWorkflow(order);
    const draft = getDraft(order);
    const rxCompleted = hasAllChecklistItems(draft.rxChecklist, RX_CHECKLIST_FIELDS);

    return (
      <article className="sales-order-card" key={order.id}>
        <div className="sales-order-head">
          <div>
            <h4>{getDisplayOrderId(order)}</h4>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          <div className="sales-status-row">
            <span
              className={`sales-status-badge ${getStatusBadgeClass(order.status)}`}
            >
              {order.status || "-"}
            </span>
            <span className="sales-status-badge is-neutral">
              {getSalesStageLabel(workflow.salesStage)}
            </span>
            <span className="sales-status-badge is-info">
              {getPriorityLabel(workflow.priority)}
            </span>
            {workflow.complaintStage !== COMPLAINT_STAGES.NONE ? (
              <span className="sales-status-badge is-warning">
                {getComplaintStageLabel(workflow.complaintStage)}
              </span>
            ) : null}
          </div>
        </div>

        <p>
          <strong>Customer:</strong> {order.customer?.fullName || "-"} (
          {order.customer?.phone || "-"})
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

        <div className="sales-meta-grid">
          <div className="sales-meta-card">
            <span>Sales owner</span>
            <strong>{workflow.assigneeSales || "Unassigned"}</strong>
          </div>
          <div className="sales-meta-card">
            <span>Ops owner</span>
            <strong>{workflow.assigneeOperation || "Not assigned"}</strong>
          </div>
          <div className="sales-meta-card">
            <span>Due at</span>
            <strong className={isOverdue(workflow.dueAt) ? "is-danger" : ""}>
              {formatDateTime(workflow.dueAt)}
            </strong>
          </div>
          <div className="sales-meta-card">
            <span>Next action</span>
            <strong>{getNextActionLabel(order)}</strong>
          </div>
        </div>

        {workflow.blockedReason ? (
          <p className="sales-note-strip is-warning">
            Blocked by: {getBlockedReasonLabel(workflow.blockedReason)}
          </p>
        ) : null}

        {workflow.preorderEta ? (
          <p className="sales-note-strip">Promised ETA: {formatDateTime(workflow.preorderEta)}</p>
        ) : null}

        {workflow.handoffNote ? (
          <p className="sales-note-strip">Handoff note: {workflow.handoffNote}</p>
        ) : null}

        {orderRequiresPrescriptionCheck(order) ? (
          <p className="sales-inline-hint">
            RX readiness: {rxCompleted ? "Checklist complete" : "Checklist pending"}
          </p>
        ) : null}

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

        {workflow.timeline.length > 0 ? (
          <div className="sales-timeline">
            <p className="sales-card-section-title">Recent timeline</p>
            <div className="sales-timeline-list">
              {workflow.timeline.slice(0, 3).map((entry) => (
                <div className="sales-timeline-entry" key={entry.id}>
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
        "Sales / Support Overview",
        "This workflow now tracks ownership, blockers, checklists, and handoff quality instead of only changing status."
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
          <p>RX Review</p>
          <strong>{metrics.rxReview}</strong>
        </div>
        <div className="sales-metric-card">
          <p>Handoff Ready</p>
          <strong>{metrics.handoff}</strong>
        </div>
        <div className="sales-metric-card">
          <p>Overdue</p>
          <strong>{metrics.overdue}</strong>
        </div>
      </div>

      <div className="sales-overview-grid">
        <section className="sales-overview-note">
          <h3>What changed</h3>
          <p>1. Intake orders now require an owner and due date.</p>
          <p>2. RX review uses a checklist before handoff.</p>
          <p>3. Customer-update cases now store the blocker and note.</p>
          <p>4. Handoff to operation requires owner assignment and context.</p>
          <p>5. Complaint handling tracks a separate internal resolution path.</p>
        </section>

        <section className="sales-overview-note">
          <h3>Queue health</h3>
          <p>Complaints in progress: {metrics.complaints}</p>
          <p>Orders in handoff stage: {metrics.handoff}</p>
          <p>Orders overdue: {metrics.overdue}</p>
          <p>Recommended focus: clear blocked intake and RX review first.</p>
        </section>
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
              "Sales should claim the order, verify payment, check customer info, and only then branch to RX review or handoff."
            )}
            {intakeOrders.length === 0 ? (
              <p className="sales-empty">No orders in intake queue.</p>
            ) : (
              <div className="sales-order-grid">
                {intakeOrders.map((order) => {
                  const workflow = getOrderWorkflow(order);
                  const isBusy = actionOrderId === String(order.id);
                  const needsRx = orderRequiresPrescriptionCheck(order);

                  return renderOrderCard(
                    order,
                    <div className="sales-card-actions-shell">
                      {renderSharedFields(order, {
                        showAssigneeSales: true,
                        showPriority: true,
                        showDueAt: true,
                        showBlockedReason: true,
                        showNote: true,
                      })}
                      <div className="sales-order-actions">
                        {workflow.salesStage === SALES_STAGES.NEW_ORDER ? (
                          <button
                            type="button"
                            onClick={() => handleSalesAction(order, "CLAIM_INTAKE")}
                            disabled={isBusy}
                          >
                            Claim Intake
                          </button>
                        ) : null}

                        {[
                          SALES_STAGES.NEW_ORDER,
                          SALES_STAGES.PAYMENT_VERIFIED,
                        ].includes(workflow.salesStage) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleSalesAction(order, "CUSTOMER_INFO_CHECK")
                            }
                            disabled={isBusy}
                          >
                            Customer Info Checked
                          </button>
                        ) : null}

                        {workflow.salesStage === SALES_STAGES.CUSTOMER_INFO_CHECK &&
                        needsRx ? (
                          <button
                            type="button"
                            onClick={() => handleSalesAction(order, "START_RX_REVIEW")}
                            disabled={isBusy}
                          >
                            Send To RX Review
                          </button>
                        ) : null}

                        {workflow.salesStage === SALES_STAGES.CUSTOMER_INFO_CHECK &&
                        !needsRx ? (
                          <button
                            type="button"
                            onClick={() => handleSalesAction(order, "PREPARE_HANDOFF")}
                            disabled={isBusy}
                          >
                            Prepare Handoff
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            handleSalesAction(order, "REQUEST_CUSTOMER_UPDATE")
                          }
                          disabled={isBusy}
                        >
                          Need Customer Update
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.PRESCRIPTION_SUPPORT:
        return (
          <div>
            {renderSectionIntro(
              "Prescription Check & Customer Support",
              "RX review now needs explicit checklist completion, blocker tracking, and a clear return path when customer information is incomplete."
            )}
            {rxOrders.length === 0 ? (
              <p className="sales-empty">No custom prescription orders in review.</p>
            ) : (
              <div className="sales-order-grid">
                {rxOrders.map((order) => {
                  const workflow = getOrderWorkflow(order);
                  const isBusy = actionOrderId === String(order.id);

                  return renderOrderCard(
                    order,
                    <div className="sales-card-actions-shell">
                      {renderSharedFields(order, {
                        showAssigneeSales: true,
                        showPriority: true,
                        showDueAt: true,
                        showBlockedReason: true,
                        showRxChecklist: true,
                        showNote: true,
                      })}
                      <div className="sales-order-actions">
                        {workflow.salesStage ===
                        SALES_STAGES.WAITING_CUSTOMER_RESPONSE ? (
                          <button
                            type="button"
                            onClick={() => handleSalesAction(order, "RESUME_RX_REVIEW")}
                            disabled={isBusy}
                          >
                            Resume RX Review
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            handleSalesAction(order, "REQUEST_CUSTOMER_UPDATE")
                          }
                          disabled={isBusy}
                        >
                          Request Customer Update
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSalesAction(order, "VERIFY_RX")}
                          disabled={isBusy}
                        >
                          RX Verified
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.HANDOFF:
        return (
          <div>
            {renderSectionIntro(
              "Confirm & Handoff To Operations",
              "Orders leave sales only when the operation owner is assigned and the handoff note gives enough production context."
            )}
            {handoffOrders.length === 0 ? (
              <p className="sales-empty">No orders ready for handoff.</p>
            ) : (
              <div className="sales-order-grid">
                {handoffOrders.map((order) => {
                  const isBusy = actionOrderId === String(order.id);

                  return renderOrderCard(
                    order,
                    <div className="sales-card-actions-shell">
                      {renderSharedFields(order, {
                        showAssigneeSales: true,
                        showAssigneeOperation: true,
                        showPriority: true,
                        showDueAt: true,
                        showHandoffNote: true,
                        showNote: true,
                      })}
                      <div className="sales-order-actions">
                        <button
                          type="button"
                          onClick={() => handleSalesAction(order, "SEND_TO_OPERATIONS")}
                          disabled={isBusy}
                        >
                          Send To Operations
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.PREORDER:
        return (
          <div>
            {renderSectionIntro(
              "Pre-order Handling",
              "Pre-orders now need a promised ETA, owner note, and a deliberate move into the handoff queue."
            )}
            {preOrderOrders.length === 0 ? (
              <p className="sales-empty">No pre-orders found.</p>
            ) : (
              <div className="sales-order-grid">
                {preOrderOrders.map((order) => {
                  const isBusy = actionOrderId === String(order.id);

                  return renderOrderCard(
                    order,
                    <div className="sales-card-actions-shell">
                      {renderSharedFields(order, {
                        showAssigneeSales: true,
                        showPriority: true,
                        showDueAt: true,
                        showPreorderEta: true,
                        showNote: true,
                      })}
                      <div className="sales-order-actions">
                        <button
                          type="button"
                          onClick={() => handleSalesAction(order, "CONFIRM_PREORDER")}
                          disabled={isBusy}
                        >
                          Confirm Pre-order
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSalesAction(order, "MOVE_PREORDER_TO_HANDOFF")
                          }
                          disabled={isBusy}
                        >
                          Move To Handoff
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case SECTION_KEYS.COMPLAINTS:
        return (
          <div>
            {renderSectionIntro(
              "Complaints, Warranty, Refund",
              "Support cases now carry a resolution type, progress state, and closing note so the history is reviewable."
            )}
            {complaintOrders.length === 0 ? (
              <p className="sales-empty">No complaint cases right now.</p>
            ) : (
              <div className="sales-order-grid">
                {complaintOrders.map((order) => {
                  const isBusy = actionOrderId === String(order.id);

                  return renderOrderCard(
                    order,
                    <div className="sales-card-actions-shell">
                      {renderSharedFields(order, {
                        showAssigneeSales: true,
                        showResolutionType: true,
                        showNote: true,
                      })}
                      <div className="sales-order-actions">
                        <button
                          type="button"
                          onClick={() => handleSalesAction(order, "START_WARRANTY")}
                          disabled={isBusy}
                        >
                          Start Warranty
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSalesAction(order, "APPROVE_REFUND")}
                          disabled={isBusy}
                        >
                          Approve Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSalesAction(order, "CLOSE_CASE")}
                          disabled={isBusy}
                        >
                          Close Case
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      default:
        return renderOverview();
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
          className={
            activeSection === SECTION_KEYS.PRESCRIPTION_SUPPORT ? "active" : ""
          }
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
          onClick={() => setIsSidebarOpen((previous) => !previous)}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? "Hide menu" : "Show menu"}
        </button>

        <div className="sales-panel">
          {!isLoading && !loadError && activeSection !== SECTION_KEYS.OVERVIEW
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
