import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import App from './pages/Home.js';
import ManageRestaurants from './pages/ManageRestaurants.js';
import AuthPage from './pages/LoginPage.js';
import GroupSessionPage from './pages/GroupSessionPage.js';
import AccountPage from './pages/AccountPage.js';
import { ToastProvider } from './components/Toast';
import { AuthSyncProvider } from './lib/authSync';

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <AuthSyncProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/restaurants" element={<ManageRestaurants />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/group-sessions/:id?" element={<GroupSessionPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </Router>
    </AuthSyncProvider>
  </ToastProvider>
);
