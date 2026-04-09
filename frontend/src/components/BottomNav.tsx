import { NavLink, useLocation } from 'react-router-dom';
import { FaHome, FaUtensils, FaUsers, FaSignInAlt, FaUser } from 'react-icons/fa';
import { useAuthVersion } from '../lib/authSync';
import { getAuthToken } from '../lib/auth';

const TABS = [
  { to: '/', icon: FaHome, label: 'Home', requiresAuth: false },
  { to: '/restaurants', icon: FaUtensils, label: 'List', requiresAuth: true },
  { to: '/group-sessions', icon: FaUsers, label: 'Group', requiresAuth: true },
  { to: '/account', icon: FaUser, label: 'Account', requiresAuth: true },
];

export default function BottomNav() {
  const location = useLocation();
  useAuthVersion();
  const token = getAuthToken();
  const isLoggedIn = !!token;

  const tabs = isLoggedIn ? TABS : TABS.filter(t => !t.requiresAuth);

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4">
      <div className="mx-auto max-w-md w-full flex justify-center gap-8 rounded-3xl border border-gray-200 bg-white/90 backdrop-blur-md shadow-sm py-2 px-5">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive: navActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] ${
                  navActive || isActive ? 'text-black' : 'text-gray-400'
                }`
              }
            >
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-yellow-400/10'
                    : 'bg-transparent'
                }`}
              >
                <Icon className="text-lg" />
              </div>
              <span>{label}</span>
            </NavLink>
          );
        })}

        {!isLoggedIn && (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] flex-1 ${
                isActive ? 'text-black' : 'text-gray-400'
              }`
            }
          >
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
                location.pathname === '/login'
                  ? 'bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-yellow-400/10'
                  : 'bg-transparent'
              }`}
            >
              <FaSignInAlt className="text-lg" />
            </div>
            <span>Login</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}

