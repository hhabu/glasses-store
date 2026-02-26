import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/layout/NavBar";
import ProtectedRoute from "./routes/ProtectedRoute";

import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import LoginPage from "./pages/LoginPage";
import SalesDashboard from "./pages/SalesDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerProfile from "./pages/CustomerProfile";
import OrderHistory from "./pages/OrderHistory";
import ReturnRequest from "./pages/ReturnRequest";
import DesignGlasses from "./pages/DesignGlasses";
import EyeProfile from "./pages/EyeProfile";
import CheckoutPage from "./pages/CheckoutPage";

function App() {
  const location = useLocation();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  const dashboardPaths = ["/sales", "/admin", "/operation"];
  const isDashboardPage = dashboardPaths.some((path) =>
    location.pathname.startsWith(path)
  );
  const isLoginPage = location.pathname === "/login";

  // Hien NavBar cho ca guest va user, chi an o dashboard role va trang login
  const showNavBar = !isDashboardPage && !isLoginPage;

  return (
    <>
      {showNavBar && <NavBar />}

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<HomePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="/profile" element={<CustomerProfile />} />
        <Route path="/eye-profile" element={<EyeProfile />} />
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/returns" element={<ReturnRequest />} />
        <Route path="/design-glasses" element={<DesignGlasses />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        {/* SALES ONLY */}
        <Route
          path="/sales"
          element={
            <ProtectedRoute allowRoles={["SALES"]}>
              <SalesDashboard />
            </ProtectedRoute>
          }
        />

        {/* ADMIN ONLY */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowRoles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
