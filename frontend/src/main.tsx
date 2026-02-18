import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import App from './pages/Home.js';
import ManageRestaurants from './pages/ManageRestaurants.js';
import AuthPage from './pages/LoginPage.js';
import { ToastProvider } from './components/Toast';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/restaurants" element={<ManageRestaurants />} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </Router>
    </ToastProvider>
  </StrictMode>
);
