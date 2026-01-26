import { useState, useEffect, useRef } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    navigate("/");
    window.location.reload();
  };

  return (
  <div className="absolute top-3 right-0 z-50" ref={ref}>
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-3xl text-black button"
      >
        <FaUserCircle />
      </button>
      {open && (
        <div className="absolute right-1 w-20 bg-white rounded shadow-md border text-black">
          <ul className="flex flex-col">
            <li
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => navigate('/')}
            >
            Home
            </li>
            {!loggedIn ? (
              <>
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate('/login')}
                >
                  Login
                </li>
              </>
            ) : (
              <>
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate('/admin')}
                >
                  Admin
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={handleLogout}
                >
                  Logout
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  </div>
);
}
