import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/layout/NavBar";
import ProtectedRoute from "./routes/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SalesDashboard from "./pages/SalesDashboard";
import OperationDashboard from "./pages/OperationDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProductCreatePage from "./pages/AdminProductCreatePage";
import AdminProductEditPage from "./pages/AdminProductEditPage";
import CustomerProfile from "./pages/CustomerProfile";
import OrderHistory from "./pages/OrderHistory";
import ReturnRequest from "./pages/ReturnRequest";
import DesignGlasses from "./pages/DesignGlasses";
import EyeProfile from "./pages/EyeProfile";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";

function App() {
  const location = useLocation();
  const { user } = useAuth();

  const dashboardPaths = ["/sales", "/admin", "/operation"];
  const isDashboardPage = dashboardPaths.some((path) =>
    location.pathname.startsWith(path)
  );
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  // Hien NavBar cho ca guest va user, chi an o dashboard role va trang login
  const showNavBar = !isDashboardPage && !isAuthPage;

  return (
    <>
      {showNavBar && <NavBar />}

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route
          path="/cart"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" replace /> : <RegisterPage />}
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eye-profile"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <EyeProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <ReturnRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/design-glasses"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <DesignGlasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute allowRoles={["CUSTOMER"]}>
              <PaymentPage />
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

        {/* OPERATION ONLY */}
        <Route
          path="/operation"
          element={
            <ProtectedRoute allowRoles={["OPERATION"]}>
              <OperationDashboard />
            </ProtectedRoute>
          }
        />

        {/* ADMIN ONLY */}
        <Route
          path="/admin/products/new"
          element={
            <ProtectedRoute allowRoles={["ADMIN"]}>
              <AdminProductCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/:productId/edit"
          element={
            <ProtectedRoute allowRoles={["ADMIN"]}>
              <AdminProductEditPage />
            </ProtectedRoute>
          }
        />
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
