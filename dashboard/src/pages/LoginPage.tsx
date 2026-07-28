import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../api/queries";
import { ApiError } from "../api/client";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate("/devices", { replace: true }) },
    );
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>KioskHub Admin</h1>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        {login.isError && (
          <p className="error">
            {login.error instanceof ApiError ? login.error.message : "Login failed"}
          </p>
        )}
        <button type="submit" disabled={login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
