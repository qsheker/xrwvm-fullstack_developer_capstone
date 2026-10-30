import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../Auth";

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/djangoapp/login", { method: "POST", body: JSON.stringify({
        userName: form.get("username"), password: form.get("password")
      }) });
      await refresh();
      const next = params.get("next");
      navigate(next && /^\/postreview\/\d+$/.test(next) ? next : "/dealers");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="form-page">
    <h1>Login</h1><p>Sign in to share your dealership experience.</p>
    <form onSubmit={submit}>
      <label htmlFor="username">Username</label>
      <input id="username" name="username" autoComplete="username" maxLength="150" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="form-actions"><button disabled={busy}>{busy ? "Logging in…" : "Login"}</button><Link to="/dealers">Cancel</Link></div>
    </form>
    <p>New to Best Cars? <Link to="/register">Register now</Link>.</p>
  </section>;
}
