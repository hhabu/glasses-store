import { useMemo, useState } from "react";
import { useFormik } from "formik";
import { Navigate, useNavigate } from "react-router-dom";
import * as Yup from "yup";
import "../styles/CheckoutPage.css";
import { formatVND } from "../utils/currency";
import { useAuth } from "../context/AuthContext";

const CART_KEY = "cart";
const ORDERS_KEY = "orders";
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
    const now = Date.now();
    const expiresAt = new Date(now + 15 * 60 * 1000).toISOString();

    return {
      id: `ORD-${now}`,
      createdAt: new Date().toISOString(),
      customer: {
        id: user?.id ?? null,
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        note: values.note.trim(),
      },
      items: cartItems,
      totalPrice,
      payment: {
        method,
        status: method === PAYMENT_METHODS.COD ? "UNPAID_COD" : "PENDING_QR",
        paymentId: method === PAYMENT_METHODS.ONLINE_BANKING ? `PAY-${now}` : null,
        qrCodeUrl:
          method === PAYMENT_METHODS.ONLINE_BANKING
            ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=ORDER-${now}`
            : null,
        expiresAt: method === PAYMENT_METHODS.ONLINE_BANKING ? expiresAt : null,
      },
      status: method === PAYMENT_METHODS.COD ? "PLACED" : "PENDING_PAYMENT",
    };
  };

  const saveOrder = (newOrder) => {
    let orders = [];
    try {
      const stored = JSON.parse(localStorage.getItem(ORDERS_KEY));
      orders = Array.isArray(stored) ? stored : [];
    } catch {
      orders = [];
    }

    localStorage.setItem(ORDERS_KEY, JSON.stringify([newOrder, ...orders]));
  };

  const handleCodOrder = (values, { resetForm }) => {
    const newOrder = createOrderFromForm(values, PAYMENT_METHODS.COD);
    saveOrder(newOrder);
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    resetForm();
    navigate("/orders", { replace: true, state: { justPlaced: true, orderId: newOrder.id } });
  };

  const startOnlineBanking = (values, { resetForm }) => {
    const newOrder = createOrderFromForm(values, PAYMENT_METHODS.ONLINE_BANKING);
    saveOrder(newOrder);
    resetForm();
    navigate("/payment", { state: { orderId: newOrder.id } });
  };

  const formik = useFormik({
    initialValues: {
      fullName: "",
      phone: "",
      address: "",
      note: "",
    },
    validationSchema: deliverySchema,
    onSubmit: (values, helpers) => {
      if (paymentMethod !== PAYMENT_METHODS.COD) {
        startOnlineBanking(values, helpers);
        return;
      }
      handleCodOrder(values, helpers);
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
              disabled={paymentMethod !== PAYMENT_METHODS.COD}
            >
              {paymentMethod === PAYMENT_METHODS.COD
                ? "Place Order"
                : "Place Order (COD only)"}
            </button>
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
                  onClick={formik.submitForm}
                >
                  Generate QR & Continue
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
