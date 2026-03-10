import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useToast } from '../components/Toast';
import { notifyAuthChange } from '../lib/authSync';

export default function AccountPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const storedEmail = localStorage.getItem('email');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setEmail(storedEmail);
  }, [navigate]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      notifyAuthChange();
    }

    showToast('success', 'Logged out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="page">
      <div className="page-bg" />
      <div className="page-content">
        <div className="flex flex-col items-center gap-6 w-full px-4 py-8 sm:py-12">
          <div className="content w-full max-w-md">
            <h1 className="text-3xl sm:text-4xl font-bold mb-6">Account</h1>

            <div className="bg-white/90 rounded-lg shadow-md border border-gray-200 p-5 space-y-4">
              {email && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                    Signed in as
                  </p>
                  <p className="font-medium text-gray-900 break-all">{email}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-2 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

