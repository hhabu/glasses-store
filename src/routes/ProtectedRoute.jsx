import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowRoles, children }) {
  const { user } = useAuth();

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
