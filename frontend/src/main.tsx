import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import HomeV2 from './pages/HomeV2.js';
import ManageRestaurants from './pages/ManageRestaurants.js';
import AuthPage from './pages/LoginPage.js';
import { ToastProvider } from './components/Toast';
import { AuthSyncProvider } from './lib/authSync';

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <AuthSyncProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomeV2 />} />
          <Route path="/restaurants" element={<ManageRestaurants />} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </Router>
    </AuthSyncProvider>
  </ToastProvider>
);
