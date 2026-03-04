import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";
import { loginWithCredentials } from "../services/userService";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const result = loginWithCredentials(username, password);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    const user = result.user;
    switch (user.role) {
      case "ADMIN":
        navigate("/admin");
        break;
      case "SALES":
        navigate("/sales");
        break;
      case "OPERATION":
        navigate("/operation");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleLogin}>
        <h2 className="login-title">Login</h2>

        {error && <p className="login-error">{error}</p>}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="login-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />

        <button type="submit" className="login-btn login-btn-primary">
          Login
        </button>

        <button
          type="button"
          className="login-btn login-btn-secondary"
          onClick={() => navigate("/")}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
