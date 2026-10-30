import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const data = await api("/djangoapp/session");
      setUser(data.user);
      setError("");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  return <AuthContext.Provider value={{ user, loading, error, refresh }}>
    {children}
  </AuthContext.Provider>;
}
