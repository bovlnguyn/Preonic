import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PreOnicLogin from './component/Auth/PreOnicLogin';
import Register from './component/Register/Register';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PreOnicLogin />} />
        <Route path="/login" element={<PreOnicLogin />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;