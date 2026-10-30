import React from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./Auth";
import Header from "./components/Header/Header";
import Login from "./components/Login/Login";
import Register from "./components/Register/Register";
import Dealers from "./components/Dealers/Dealers";
import Dealer from "./components/Dealers/Dealer";
import PostReview from "./components/Dealers/PostReview";
import "./App.css";

export default function App() {
  return <AuthProvider>
    <Header />
    <main className="app-main">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dealers" element={<Dealers />} />
        <Route path="/dealer/:id" element={<Dealer />} />
        <Route path="/postreview/:id" element={<PostReview />} />
        <Route path="*" element={<p>Page not found. <a href="/dealers">View dealerships</a>.</p>} />
      </Routes>
    </main>
    <footer className="site-footer">Best Cars · Dealer directory & customer reviews</footer>
  </AuthProvider>;
}
