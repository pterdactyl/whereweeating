import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import App from './pages/Home.js';
import Admin from './pages/Admin.jsx';
import AuthPage from './pages/Auth.jsx';
import Navbar from './components/Navbar.jsx';

createRoot(document.getElementById('root')!).render(
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
