import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import { AuthProvider } from "./contexts/AuthContext";

import Home from "./pages/Home";
import PreOnicLogin from "./component/Auth/PreOnicLogin";
import Register from "./component/Register/Register";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<PreOnicLogin />} />
          <Route path="/auth" element={<PreOnicLogin />} />

          <Route path="/register" element={<Register />} />

          <Route path="/products" element={<Home />} />
          <Route path="/solutions" element={<Home />} />
          <Route path="/contact" element={<Home />} />
          <Route path="/ai-agriculture" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;