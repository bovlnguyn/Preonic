import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PreOnicLogin from './component/Auth/PreOnicLogin';
import Register from './component/Register/Register';
import { AuthProvider } from './contexts/AuthContext'; // 
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>  
        <Routes>
          <Route path="/" element={<PreOnicLogin />} />
          <Route path="/login" element={<PreOnicLogin />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </AuthProvider>  
    </BrowserRouter>
  );
}

export default App;