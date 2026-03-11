import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import "../styles/CustomerProfile.css";
import { updateUser } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_AVATAR_URL } from "../constants/avatar";

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(60, "Full name is too long.")
    .required("Full name is required."),
  email: Yup.string()
    .trim()
    .email("Please enter a valid email.")
    .required("Email is required."),
  phone: Yup.string()
    .trim()
    .matches(/^[0-9()+\s-]{8,20}$/, "Please enter a valid phone number.")
    .required("Phone number is required."),
  address: Yup.string()
    .trim()
    .min(5, "Address is too short.")
    .max(120, "Address is too long.")
    .required("Address is required."),
});

export default function CustomerProfile() {
  const { user: sessionUser, setUser: setSessionUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const user = sessionUser;
  const formId = "customer-profile-form";

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      if (!user) return;
      if (!editMode) {
        setEditMode(true);
        setSubmitting(false);
        return;
      }
      try {
        const updated = await updateUser({
          ...user,
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          address: values.address.trim(),
        });
        setSessionUser(updated);
        resetForm({
          values: {
            name: updated?.name || "",
            email: updated?.email || "",
            phone: updated?.phone || "",
            address: updated?.address || "",
          },
        });
        setEditMode(false);
        alert("Profile updated!");
      } catch {
        alert("Failed to update profile. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const showError = (field) =>
    editMode && formik.touched[field] && formik.errors[field];

  const inputClassName = (field) => {
    const classes = ["profile-input"];
    if (!editMode) classes.push("profile-input-readonly");
    if (showError(field)) classes.push("profile-input-error");
    return classes.join(" ");
  };

  const handleCancel = () => {
    setEditMode(false);
    formik.resetForm();
  };

  const handleEdit = (event) => {
    event.preventDefault();
    if (!formik.isSubmitting) {
      setEditMode(true);
    }
  };

  const handleSave = async () => {
    formik.setTouched(
      {
        name: true,
        email: true,
        phone: true,
        address: true,
      },
      true
    );
    await formik.submitForm();
  };

  if (!user) return <h2 className="profile-empty">No user data</h2>;

  return (
    <div className="customer-profile-page">
      <div className="customer-profile-container">
        <h2 className="profile-title">Customer Profile</h2>

        <div className="profile-card">
          {/* AVATAR */}
          <div className="profile-avatar-wrap">
            <img
              src={user.avatar || DEFAULT_AVATAR_URL}
              alt="avatar"
              width="120"
              height="120"
              className="profile-avatar-img"
              onError={(event) => {
                event.currentTarget.src = DEFAULT_AVATAR_URL;
              }}
            />
          </div>

          <form id={formId} onSubmit={formik.handleSubmit} noValidate>
            <label className="profile-label">Username</label>
            <input
              value={user.username}
              disabled
              className="profile-input profile-input-readonly"
            />

            <label className="profile-label">Full Name</label>
            <input
              name="name"
              value={formik.values.name}
              disabled={!editMode}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={inputClassName("name")}
            />
            {showError("name") ? (
              <p className="profile-error">{formik.errors.name}</p>
            ) : null}

            <label className="profile-label">Email</label>
            <input
              name="email"
              value={formik.values.email}
              disabled={!editMode}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={inputClassName("email")}
            />
            {showError("email") ? (
              <p className="profile-error">{formik.errors.email}</p>
            ) : null}

            <label className="profile-label">Phone</label>
            <input
              name="phone"
              value={formik.values.phone}
              disabled={!editMode}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={inputClassName("phone")}
            />
            {showError("phone") ? (
              <p className="profile-error">{formik.errors.phone}</p>
            ) : null}

            <label className="profile-label">Address</label>
            <input
              name="address"
              value={formik.values.address}
              disabled={!editMode}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={inputClassName("address")}
            />
            {showError("address") ? (
              <p className="profile-error">{formik.errors.address}</p>
            ) : null}

            <label className="profile-label">Status</label>
            <input
              value={user.status}
              disabled
              className="profile-input profile-input-readonly"
            />
          </form>

          <div className="profile-actions">
            {!editMode ? (
              <button
                type="button"
                className="profile-btn profile-btn-primary"
                onClick={handleEdit}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="profile-btn profile-btn-primary"
                  disabled={formik.isSubmitting}
                  onClick={handleSave}
                >
                  {formik.isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="profile-btn profile-btn-secondary"
                  onClick={handleCancel}
                  disabled={formik.isSubmitting}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
