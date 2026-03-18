import { useMemo, useState } from "react";
import { useFormik } from "formik";
import { Navigate, useNavigate } from "react-router-dom";
import * as Yup from "yup";
import "../styles/CheckoutPage.css";
import { formatVND } from "../utils/currency";
import { useAuth } from "../context/AuthContext";
import { createOrder } from "../services/orderApi";

const CART_KEY = "cart";
const PAYMENT_METHODS = {
  COD: "COD",
  ONLINE_BANKING: "ONLINE_BANKING",
};

function readCartFromStorage() {
  try {
    const data = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const [cartItems] = useState(readCartFromStorage);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.COD);
  const [submitError, setSubmitError] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const deliverySchema = Yup.object({
    fullName: Yup.string().trim().min(2, "Full name is too short.").required("Full name is required."),
    phone: Yup.string()
      .trim()
      .matches(/^(0|\+84)\d{9,10}$/, "Phone must start with 0 or +84 and contain 10-11 digits.")
      .required("Phone is required."),
    address: Yup.string().trim().min(5, "Address is too short.").required("Address is required."),
    note: Yup.string().max(250, "Note must be 250 characters or less."),
  });

  const createOrderFromForm = (values, method) => {
    const now = new Date();
    const accountId =
      user?.id === undefined || user?.id === null || user?.id === ""
        ? ""
        : String(user.id);
    const normalizedItems = cartItems.map((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(item.price) || 0;
      return {
        id: String(item.id ?? ""),
        product_id: String(item.productId ?? item.frameId ?? item.id ?? ""),
        frame_id:
          item.frameId === undefined || item.frameId === null
            ? ""
            : String(item.frameId),
        lens_id:
          item.lensId === undefined || item.lensId === null
            ? ""
            : String(item.lensId),
        name: item.name ?? "",
        brand: item.brand ?? "",
        color: item.color ?? "",
        image: item.image ?? "",
        prescription: item.prescription ?? "",
        lens_name: item.lensName ?? "",
        eye_profile_id:
          item.eyeProfileId === undefined || item.eyeProfileId === null
            ? ""
            : String(item.eyeProfileId),
        eye_profile_name: item.eyeProfileName ?? "",
        eye_profile_summary: item.eyeProfileSummary ?? "",
        quantity,
        unit_price: unitPrice,
        line_total: unitPrice * quantity,
      };
    });

    return {
      account_id: accountId,
      order_code: `ORD-${now.getTime()}`,
      status: method === PAYMENT_METHODS.COD ? "PLACED" : "PENDING_PAYMENT",
      payment_method: method,
      payment_status: method === PAYMENT_METHODS.COD ? "UNPAID_COD" : "PENDING_QR",
      item: normalizedItems,
      total_price: totalPrice,
      shipping_name: values.fullName.trim(),
      shipping_phone: values.phone.trim(),
      shipping_address: values.address.trim(),
      note: values.note.trim(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      paidAt: "",
    };
  };

  const formik = useFormik({
    initialValues: {
      fullName: "",
      phone: "",
      address: "",
      note: "",
    },
    validationSchema: deliverySchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      setSubmitError("");
      const accountId =
        user?.id === undefined || user?.id === null || user?.id === ""
          ? ""
          : String(user.id);
      if (!accountId) {
        setSubmitError("Missing account id. Please re-login and try again.");
        setSubmitting(false);
        return;
      }

      setIsSavingOrder(true);
      try {
        const payload = createOrderFromForm(values, paymentMethod);
        const createdOrder = await createOrder(payload);

        if (paymentMethod === PAYMENT_METHODS.COD) {
          localStorage.setItem(CART_KEY, JSON.stringify([]));
          resetForm();
          navigate("/orders", {
            replace: true,
            state: {
              justPlaced: true,
              orderId: createdOrder?.order_code || createdOrder?.id || payload.order_code,
            },
          });
          return;
        }

        if (!createdOrder?.id) {
          setSubmitError("Order created but payment session is missing. Please try again.");
          return;
        }

        resetForm();
        navigate("/payment", { state: { orderId: createdOrder.id } });
      } catch {
        setSubmitError("Failed to place order. Please try again.");
      } finally {
        setIsSavingOrder(false);
        setSubmitting(false);
      }
    },
  });

  if (cartItems.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <div className="checkout-page">
      <h2 className="checkout-title">Checkout</h2>

      <div className="checkout-layout">
        <section className="checkout-section">
          <h3>Delivery Information</h3>
          <form className="checkout-form" onSubmit={formik.handleSubmit}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              value={formik.values.fullName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.fullName && formik.errors.fullName ? (
              <p className="checkout-field-error">{formik.errors.fullName}</p>
            ) : null}

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              value={formik.values.phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.phone && formik.errors.phone ? (
              <p className="checkout-field-error">{formik.errors.phone}</p>
            ) : null}

            <label htmlFor="address">Address</label>
            <input
              id="address"
              name="address"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.address && formik.errors.address ? (
              <p className="checkout-field-error">{formik.errors.address}</p>
            ) : null}

            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              name="note"
              value={formik.values.note}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              rows={3}
            />
            {formik.touched.note && formik.errors.note ? (
              <p className="checkout-field-error">{formik.errors.note}</p>
            ) : null}

            <button
              type="submit"
              className="place-order-btn"
              disabled={paymentMethod !== PAYMENT_METHODS.COD || isSavingOrder}
            >
              {paymentMethod === PAYMENT_METHODS.COD
                ? isSavingOrder
                  ? "Placing..."
                  : "Place Order"
                : "Place Order (COD only)"}
            </button>
            {submitError ? (
              <p className="checkout-field-error">{submitError}</p>
            ) : null}
          </form>
        </section>

        <section className="checkout-section">
          <h3>Your Items</h3>
          <div className="checkout-items">
            {cartItems.map((item) => (
              <div className="checkout-item" key={item.id}>
                <img src={item.image} alt={item.name} className="checkout-item-image" />
                <div className="checkout-item-info">
                  <p className="checkout-item-name">{item.name}</p>
                  <p>Qty: {item.quantity}</p>
                  <p>{formatVND(item.price)}</p>
                </div>
                <p className="checkout-item-subtotal">
                  {formatVND(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="checkout-total">
            <div className="checkout-payment-methods">
              <p className="checkout-payment-title">Payment Method</p>
              <label className="checkout-payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={PAYMENT_METHODS.COD}
                  checked={paymentMethod === PAYMENT_METHODS.COD}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                />
                COD (Pay on delivery)
              </label>
              <label className="checkout-payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={PAYMENT_METHODS.ONLINE_BANKING}
                  checked={paymentMethod === PAYMENT_METHODS.ONLINE_BANKING}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                />
                Online Banking (QR)
              </label>
              {paymentMethod === PAYMENT_METHODS.ONLINE_BANKING ? (
                <button
                  type="button"
                  className="checkout-online-btn"
                  disabled={isSavingOrder}
                  onClick={formik.submitForm}
                >
                  {isSavingOrder ? "Generating..." : "Generate QR & Continue"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="checkout-total checkout-total-summary">
            <span>Total</span>
            <strong>{formatVND(totalPrice)}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}
