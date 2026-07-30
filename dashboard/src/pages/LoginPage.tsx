import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../api/queries";
import { ApiError } from "../api/client";
import { IconMonitor } from "../components/Icons";
import { ThemeToggle } from "../components/ThemeToggle";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate("/devices", { replace: true }) });
  };

  return (
    <div className="login-page">
      <div style={{ position: "fixed", top: 16, right: 16 }}>
        <ThemeToggle />
      </div>

      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-head">
          <span className="brand-mark">
            <IconMonitor size={22} />
          </span>
          <div>
            <h2>KioskHub</h2>
            <p className="section-sub">Sign in to manage your kiosk fleet</p>
          </div>
        </div>

        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            placeholder="admin@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </label>

        {login.isError && (
          <p className="error">
            {login.error instanceof ApiError ? login.error.message : "Login failed"}
          </p>
        )}

        <button className="primary" type="submit" disabled={login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
