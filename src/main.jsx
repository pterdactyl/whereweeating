import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Admin from './Admin.jsx';
import AuthPage from './AuthPage.jsx';
import Navbar from './Navbar';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<AuthPage />} />
      </Routes>
    </Router>
  </StrictMode>
);
