import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";
import { registerCustomer } from "../services/userService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const result = registerCustomer({ username, password });
    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate("/login");
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleRegister}>
        <h2 className="login-title">Register</h2>

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

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="login-input"
        />

        <button type="submit" className="login-btn login-btn-primary">
          Create Account
        </button>

        <button
          type="button"
          className="login-btn login-btn-secondary"
          onClick={() => navigate("/login")}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}
