import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowRoles, children }) {
  const user = JSON.parse(localStorage.getItem("user"));

  // Chưa login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Không đúng role
  if (!allowRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Đúng role
  return children;
}
