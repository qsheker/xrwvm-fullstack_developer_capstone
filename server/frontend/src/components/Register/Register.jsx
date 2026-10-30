import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../Auth";

export default function Register() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/djangoapp/register", { method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())) });
      await refresh(); navigate("/dealers");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="form-page">
    <h1>Create an account</h1><p>Join the conversation about your next dealership.</p>
    <form onSubmit={submit}>
      <label htmlFor="userName">Username</label><input id="userName" name="userName" autoComplete="username" maxLength="150" required />
      <div className="field-row">
        <div><label htmlFor="firstName">First Name</label><input id="firstName" name="firstName" autoComplete="given-name" maxLength="150" required /></div>
        <div><label htmlFor="lastName">Last Name</label><input id="lastName" name="lastName" autoComplete="family-name" maxLength="150" required /></div>
      </div>
      <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" maxLength="254" required />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength="8" maxLength="256" required aria-describedby="password-help" />
      <p id="password-help" className="field-help">Use at least 8 characters. Avoid common passwords and personal details.</p>
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="form-actions"><button disabled={busy}>{busy ? "Registering…" : "Register"}</button><Link to="/login">Already have an account?</Link></div>
    </form>
  </section>;
}
