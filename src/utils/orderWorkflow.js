export const SALES_STAGES = {
  NEW_ORDER: "NEW_ORDER",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
  CUSTOMER_INFO_CHECK: "CUSTOMER_INFO_CHECK",
  RX_REVIEW: "RX_REVIEW",
  WAITING_CUSTOMER_RESPONSE: "WAITING_CUSTOMER_RESPONSE",
  PREORDER_CONFIRMATION: "PREORDER_CONFIRMATION",
  READY_FOR_HANDOFF: "READY_FOR_HANDOFF",
  AFTER_SALES_TRIAGE: "AFTER_SALES_TRIAGE",
  CASE_CLOSED: "CASE_CLOSED",
};

export const OPERATION_STAGES = {
  NONE: "NONE",
  RECEIVED_FROM_SALES: "RECEIVED_FROM_SALES",
  MATERIAL_PREP: "MATERIAL_PREP",
  ASSEMBLY: "ASSEMBLY",
  QC_PENDING: "QC_PENDING",
  QC_FAILED: "QC_FAILED",
  QC_PASSED: "QC_PASSED",
  PACKING: "PACKING",
  READY_TO_SHIP: "READY_TO_SHIP",
  DELIVERING: "DELIVERING",
  DELIVERY_EXCEPTION: "DELIVERY_EXCEPTION",
  DELIVERED: "DELIVERED",
};

export const COMPLAINT_STAGES = {
  NONE: "NONE",
  TRIAGE: "TRIAGE",
  IN_PROGRESS: "IN_PROGRESS",
  CLOSED: "CLOSED",
};

export const PRIORITY_OPTIONS = [
  { value: "NORMAL", label: "Normal" },
  { value: "URGENT", label: "Urgent" },
  { value: "VIP", label: "VIP" },
  { value: "REMAKE", label: "Remake" },
  { value: "COMPLAINT", label: "Complaint" },
];

export const BLOCKED_REASON_OPTIONS = [
  { value: "MISSING_INFO", label: "Missing information" },
  { value: "INVALID_RX", label: "Invalid prescription" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "CHANGE_REQUEST", label: "Customer wants changes" },
  { value: "UNREACHABLE", label: "Customer unreachable" },
  { value: "QC_FAILED", label: "QC failed" },
  { value: "DELIVERY_EXCEPTION", label: "Delivery exception" },
];

export const RESOLUTION_TYPE_OPTIONS = [
  { value: "REFUND", label: "Refund" },
  { value: "WARRANTY", label: "Warranty" },
  { value: "REMAKE", label: "Remake" },
  { value: "SUPPORT", label: "Support only" },
];

export const RX_CHECKLIST_FIELDS = [
  { key: "paymentChecked", label: "Payment checked" },
  { key: "rxValidated", label: "Prescription validated" },
  { key: "lensFrameMatched", label: "Lens/frame compatibility checked" },
  { key: "customerConfirmed", label: "Customer confirmed details" },
];

export const QC_CHECKLIST_FIELDS = [
  { key: "lensAlignment", label: "Lens alignment passed" },
  { key: "frameCondition", label: "Frame condition passed" },
  { key: "accessoriesIncluded", label: "Accessories included" },
  { key: "packagingCompleted", label: "Packaging completed" },
];

const SALES_STAGE_LABELS = {
  [SALES_STAGES.NEW_ORDER]: "New order",
  [SALES_STAGES.PAYMENT_VERIFIED]: "Payment verified",
  [SALES_STAGES.CUSTOMER_INFO_CHECK]: "Customer info check",
  [SALES_STAGES.RX_REVIEW]: "Prescription review",
  [SALES_STAGES.WAITING_CUSTOMER_RESPONSE]: "Waiting customer response",
  [SALES_STAGES.PREORDER_CONFIRMATION]: "Pre-order confirmation",
  [SALES_STAGES.READY_FOR_HANDOFF]: "Ready for handoff",
  [SALES_STAGES.AFTER_SALES_TRIAGE]: "After-sales triage",
  [SALES_STAGES.CASE_CLOSED]: "Case closed",
};

const OPERATION_STAGE_LABELS = {
  [OPERATION_STAGES.NONE]: "Not started",
  [OPERATION_STAGES.RECEIVED_FROM_SALES]: "Received from sales",
  [OPERATION_STAGES.MATERIAL_PREP]: "Material prep",
  [OPERATION_STAGES.ASSEMBLY]: "Assembly",
  [OPERATION_STAGES.QC_PENDING]: "QC pending",
  [OPERATION_STAGES.QC_FAILED]: "QC failed",
  [OPERATION_STAGES.QC_PASSED]: "QC passed",
  [OPERATION_STAGES.PACKING]: "Packing",
  [OPERATION_STAGES.READY_TO_SHIP]: "Ready to ship",
  [OPERATION_STAGES.DELIVERING]: "Delivering",
  [OPERATION_STAGES.DELIVERY_EXCEPTION]: "Delivery exception",
  [OPERATION_STAGES.DELIVERED]: "Delivered",
};

const COMPLAINT_STAGE_LABELS = {
  [COMPLAINT_STAGES.NONE]: "No complaint",
  [COMPLAINT_STAGES.TRIAGE]: "Complaint triage",
  [COMPLAINT_STAGES.IN_PROGRESS]: "Complaint in progress",
  [COMPLAINT_STAGES.CLOSED]: "Complaint closed",
};

function normalizeTextValue(value) {
  return String(value || "").toUpperCase().trim();
}

function normalizeDateValue(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function readItems(order) {
  if (Array.isArray(order?.items)) {
    return order.items;
  }

  if (Array.isArray(order?.raw?.item)) {
    return order.raw.item;
  }

  if (Array.isArray(order?.raw?.items)) {
    return order.raw.items;
  }

  return [];
}

function hasCustomEyeProfile(order) {
  return readItems(order).some(
    (item) =>
      (item?.eyeProfileId || item?.eye_profile_id || "").toString().trim() !== "" ||
      (item?.eyeProfileName || item?.eye_profile_name || "").trim() !== "" ||
      (item?.eyeProfileSummary || item?.eye_profile_summary || "").trim() !== ""
  );
}

function hasDesignedFrameAndLens(order) {
  return readItems(order).some(
    (item) =>
      (item?.frameId || item?.frame_id || "").toString().trim() !== "" &&
      (item?.lensId || item?.lens_id || "").toString().trim() !== ""
  );
}

function requiresPrescriptionCheck(order) {
  return hasCustomEyeProfile(order) || hasDesignedFrameAndLens(order);
}

function hasClearedPayment(order) {
  const paymentStatus = normalizeOrderStatus(
    order?.payment?.status ?? order?.raw?.payment_status
  );
  const paymentMethod = normalizeOrderStatus(
    order?.payment?.method ?? order?.raw?.payment_method
  );

  return paymentStatus === "PAID" || paymentMethod === "COD";
}

export function normalizeOrderStatus(value) {
  return normalizeTextValue(value);
}

export function isPreOrderOrder(order) {
  const workflow = order?.workflow || order?.raw?.workflow || {};
  const status = normalizeOrderStatus(order?.status ?? order?.raw?.status);
  const note = String(order?.customer?.note ?? order?.raw?.note ?? "").toLowerCase();

  return (
    status.includes("PRE_ORDER") ||
    status.includes("PREORDER") ||
    Boolean(workflow?.preorderEta) ||
    note.includes("pre-order") ||
    note.includes("preorder")
  );
}

export function isComplaintOrder(order) {
  const status = normalizeOrderStatus(order?.status ?? order?.raw?.status);
  return (
    status === "RETURN_REQUESTED" ||
    status === "WARRANTY_REQUESTED" ||
    status === "REFUND_REQUESTED" ||
    status === "COMPLAINT_OPEN" ||
    status === "WARRANTY_PROCESSING" ||
    status === "REFUND_APPROVED" ||
    status === "COMPLAINT_CLOSED"
  );
}

function normalizeChecklist(source, fields) {
  return fields.reduce((result, field) => {
    result[field.key] = Boolean(source?.[field.key]);
    return result;
  }, {});
}

function normalizeTimeline(timeline) {
  if (!Array.isArray(timeline)) {
    return [];
  }

  return timeline
    .map((entry, index) => ({
      id: String(entry?.id || `timeline-${index + 1}`),
      at: normalizeDateValue(entry?.at || entry?.createdAt) || "",
      role: String(entry?.role || "").trim(),
      actor: String(entry?.actor || "").trim(),
      action: String(entry?.action || "").trim(),
      note: String(entry?.note || "").trim(),
      details: Array.isArray(entry?.details)
        ? entry.details.map((detail) => String(detail || "").trim()).filter(Boolean)
        : [],
    }))
    .filter((entry) => entry.action)
    .sort(
      (a, b) =>
        new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()
    );
}

function deriveSalesStage(order, status) {
  if (isComplaintOrder(order)) {
    if (
      ["REFUND_APPROVED", "COMPLAINT_CLOSED", "WARRANTY_COMPLETED"].includes(status)
    ) {
      return SALES_STAGES.CASE_CLOSED;
    }
    return SALES_STAGES.AFTER_SALES_TRIAGE;
  }

  if (isPreOrderOrder(order)) {
    return SALES_STAGES.PREORDER_CONFIRMATION;
  }

  if (status === "CUSTOMER_UPDATE_REQUIRED") {
    return SALES_STAGES.WAITING_CUSTOMER_RESPONSE;
  }

  if (status === "PRESCRIPTION_REVIEW") {
    return SALES_STAGES.RX_REVIEW;
  }

  if (
    ["READY_FOR_OPERATION", "IN_OPERATION", "READY_TO_SHIP", "DELIVERING", "DELIVERED"].includes(
      status
    )
  ) {
    return SALES_STAGES.READY_FOR_HANDOFF;
  }

  if (status === "PENDING_PAYMENT" || status === "PENDING_QR") {
    return SALES_STAGES.NEW_ORDER;
  }

  if (hasClearedPayment(order)) {
    return SALES_STAGES.PAYMENT_VERIFIED;
  }

  return SALES_STAGES.NEW_ORDER;
}

function deriveOperationStage(order, status) {
  if (status === "READY_FOR_OPERATION") {
    return OPERATION_STAGES.RECEIVED_FROM_SALES;
  }

  if (status === "IN_OPERATION") {
    return OPERATION_STAGES.MATERIAL_PREP;
  }

  if (status === "READY_TO_SHIP") {
    return OPERATION_STAGES.READY_TO_SHIP;
  }

  if (status === "DELIVERING") {
    return OPERATION_STAGES.DELIVERING;
  }

  if (status === "DELIVERED") {
    return OPERATION_STAGES.DELIVERED;
  }

  if (isComplaintOrder(order)) {
    return OPERATION_STAGES.NONE;
  }

  return OPERATION_STAGES.NONE;
}

function deriveComplaintStage(order, status) {
  if (!isComplaintOrder(order)) {
    return COMPLAINT_STAGES.NONE;
  }

  if (["COMPLAINT_CLOSED", "WARRANTY_COMPLETED"].includes(status)) {
    return COMPLAINT_STAGES.CLOSED;
  }

  if (["WARRANTY_PROCESSING", "REFUND_APPROVED"].includes(status)) {
    return COMPLAINT_STAGES.IN_PROGRESS;
  }

  return COMPLAINT_STAGES.TRIAGE;
}

function derivePriority(order) {
  if (isComplaintOrder(order)) {
    return "COMPLAINT";
  }

  if (isPreOrderOrder(order)) {
    return "VIP";
  }

  if (requiresPrescriptionCheck(order)) {
    return "URGENT";
  }

  return "NORMAL";
}

export function getOrderWorkflow(order) {
  const rawWorkflow = order?.workflow ?? order?.raw?.workflow ?? {};
  const status = normalizeOrderStatus(order?.status ?? order?.raw?.status);

  return {
    salesStage:
      normalizeTextValue(rawWorkflow.salesStage) || deriveSalesStage(order, status),
    operationStage:
      normalizeTextValue(rawWorkflow.operationStage) ||
      deriveOperationStage(order, status),
    complaintStage:
      normalizeTextValue(rawWorkflow.complaintStage) ||
      deriveComplaintStage(order, status),
    assigneeSales: String(rawWorkflow.assigneeSales || "").trim(),
    assigneeOperation: String(rawWorkflow.assigneeOperation || "").trim(),
    priority: normalizeTextValue(rawWorkflow.priority) || derivePriority(order),
    dueAt: normalizeDateValue(rawWorkflow.dueAt),
    blockedReason: normalizeTextValue(rawWorkflow.blockedReason),
    handoffNote: String(rawWorkflow.handoffNote || "").trim(),
    preorderEta: normalizeDateValue(rawWorkflow.preorderEta),
    resolutionType: normalizeTextValue(rawWorkflow.resolutionType),
    shippingCarrier: String(rawWorkflow.shippingCarrier || "").trim(),
    trackingCode: String(rawWorkflow.trackingCode || "").trim(),
    rxChecklist: normalizeChecklist(rawWorkflow.rxChecklist, RX_CHECKLIST_FIELDS),
    qcChecklist: normalizeChecklist(rawWorkflow.qcChecklist, QC_CHECKLIST_FIELDS),
    timeline: normalizeTimeline(rawWorkflow.timeline),
  };
}

export function orderRequiresPrescriptionCheck(order) {
  return requiresPrescriptionCheck(order);
}

export function createWorkflowTimelineEntry({
  role,
  actor,
  action,
  note = "",
  details = [],
}) {
  const now = new Date().toISOString();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
    role: String(role || "").trim(),
    actor: String(actor || "").trim(),
    action: String(action || "").trim(),
    note: String(note || "").trim(),
    details: Array.isArray(details)
      ? details.map((detail) => String(detail || "").trim()).filter(Boolean)
      : [],
  };
}

export function appendWorkflowTimeline(currentTimeline, entry) {
  const normalized = normalizeTimeline(currentTimeline);
  return [entry, ...normalized].slice(0, 8);
}

export function buildOrderWorkflowPayload(order, updates = {}) {
  const {
    workflowUpdates = {},
    rootUpdates = {},
    timelineEntry = null,
  } = updates;
  const currentWorkflow = getOrderWorkflow(order);

  const nextWorkflow = {
    ...currentWorkflow,
    ...workflowUpdates,
    rxChecklist: {
      ...currentWorkflow.rxChecklist,
      ...(workflowUpdates.rxChecklist || {}),
    },
    qcChecklist: {
      ...currentWorkflow.qcChecklist,
      ...(workflowUpdates.qcChecklist || {}),
    },
  };

  if (timelineEntry) {
    nextWorkflow.timeline = appendWorkflowTimeline(
      currentWorkflow.timeline,
      timelineEntry
    );
  }

  return {
    ...(order?.raw || {}),
    ...rootUpdates,
    updatedAt: rootUpdates.updatedAt || new Date().toISOString(),
    workflow: nextWorkflow,
  };
}

export function getSalesStageLabel(stage) {
  return SALES_STAGE_LABELS[normalizeTextValue(stage)] || "Not set";
}

export function getOperationStageLabel(stage) {
  return OPERATION_STAGE_LABELS[normalizeTextValue(stage)] || "Not set";
}

export function getComplaintStageLabel(stage) {
  return COMPLAINT_STAGE_LABELS[normalizeTextValue(stage)] || "No complaint";
}

export function getPriorityLabel(priority) {
  return (
    PRIORITY_OPTIONS.find((option) => option.value === normalizeTextValue(priority))
      ?.label || "Normal"
  );
}

export function getBlockedReasonLabel(reason) {
  return (
    BLOCKED_REASON_OPTIONS.find((option) => option.value === normalizeTextValue(reason))
      ?.label || ""
  );
}

export function getResolutionTypeLabel(value) {
  return (
    RESOLUTION_TYPE_OPTIONS.find((option) => option.value === normalizeTextValue(value))
      ?.label || ""
  );
}
