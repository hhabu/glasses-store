import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AdminDashboard.css";
import { useAuth } from "../context/AuthContext";

import ProductConfigManagement from "../components/admin/ProductConfigManagement";
import UserManagement from "../components/admin/UserManagement";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("BUSINESS_RULES");
  const navigate = useNavigate();
  const { logout } = useAuth();

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /* ================= CONTENT RENDER ================= */
  const renderContent = () => {
    switch (activeSection) {
      case "BUSINESS_RULES":
        return <h2>Business Rules & Policies Management</h2>;

      case "PRODUCT_CONFIG":
        return <ProductConfigManagement mode="basic" />;

      case "USER_MANAGEMENT":
        return <UserManagement />;

      case "PRICING":
        return (
          <ProductConfigManagement
            title="Pricing, Combo & Promotion Management"
            mode="pricing"
          />
        );

      case "REVENUE":
        return <h2>Revenue Management</h2>;

      default:
        return <h2>Admin Dashboard</h2>;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* ================= SIDEBAR ================= */}
      <aside className="admin-sidebar">
        <h3 className="sidebar-title">Admin Panel</h3>

        <button onClick={() => navigate("/")}>HomePage</button>

        <button
          className={activeSection === "BUSINESS_RULES" ? "active" : ""}
          onClick={() => setActiveSection("BUSINESS_RULES")}
        >
          Business Rules
        </button>

        <button
          className={activeSection === "PRODUCT_CONFIG" ? "active" : ""}
          onClick={() => setActiveSection("PRODUCT_CONFIG")}
        >
          Product Configuration
        </button>

        <button
          className={activeSection === "USER_MANAGEMENT" ? "active" : ""}
          onClick={() => setActiveSection("USER_MANAGEMENT")}
        >
          User Management
        </button>

        <button
          className={activeSection === "PRICING" ? "active" : ""}
          onClick={() => setActiveSection("PRICING")}
        >
          Pricing & Promotion
        </button>

        <button
          className={activeSection === "REVENUE" ? "active" : ""}
          onClick={() => setActiveSection("REVENUE")}
        >
          Revenue
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="admin-content">{renderContent()}</main>
    </div>
  );
}
