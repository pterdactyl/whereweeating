import { NavLink, useLocation } from 'react-router-dom';
import { FaHome, FaUtensils, FaUsers, FaSignInAlt } from 'react-icons/fa';

const TABS = [
  { to: '/', icon: FaHome, label: 'Home', requiresAuth: false },
  { to: '/restaurants', icon: FaUtensils, label: 'Restaurants', requiresAuth: true },
  { to: '/group-sessions', icon: FaUsers, label: 'Group', requiresAuth: true },
];

export default function BottomNav() {
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isLoggedIn = !!token;

  const tabs = isLoggedIn ? TABS : TABS.filter(t => !t.requiresAuth);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 border-t border-gray-200 backdrop-blur-md">
      <div className="mx-auto max-w-md flex justify-around py-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive: navActive }) =>
                `flex flex-col items-center text-xs ${
                  navActive || isActive ? 'text-black' : 'text-gray-400'
                }`
              }
            >
              <Icon className="text-xl mb-0.5" />
              <span>{label}</span>
            </NavLink>
          );
        })}

        {!isLoggedIn && (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${
                isActive ? 'text-black' : 'text-gray-400'
              }`
            }
          >
            <FaSignInAlt className="text-xl mb-0.5" />
            <span>Login</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}

