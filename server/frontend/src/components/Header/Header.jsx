import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../Auth";
import { api } from "../../api";

export default function Header() {
  const { user, loading, error, refresh } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const navigate = useNavigate();
  async function signOut() {
    try {
      await api("/djangoapp/logout", { method: "POST" });
      await refresh();
      navigate("/dealers");
    } catch (err) { setLogoutError(err.message); }
  }
  return <header className="site-header">
    <nav aria-label="Main navigation">
      <a href="/" className="brand"><span className="brand-mark" aria-hidden="true">BC</span>Best Cars</a>
      <div className="nav-links">
        <NavLink to="/dealers">Dealerships</NavLink>
        <a href="/about/">About Us</a><a href="/contact/">Contact Us</a>
      </div>
      <div className="account">
        {loading ? <span>Checking session…</span> : user
          ? <><span className="username">{user.userName}</span><button className="text-button" onClick={signOut}>Logout</button></>
          : <><NavLink to="/login">Login</NavLink><NavLink to="/register">Register</NavLink></>}
      </div>
    </nav>
    {(logoutError || error) && <p className="alert" role="alert">{logoutError || error}</p>}
  </header>;
}
