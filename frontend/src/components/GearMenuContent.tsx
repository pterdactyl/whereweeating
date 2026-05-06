import { Link } from 'react-router-dom';
import { clearAuth, getAuthEmail, getAuthToken } from '../lib/auth';
import { notifyAuthChange, useAuthVersion } from '../lib/authSync';

type GearMenuContentProps = {
  onClose: () => void;
  /** Extra classes on outer wrapper (e.g. typography overrides). */
  className?: string;
};

export default function GearMenuContent({ onClose, className = '' }: GearMenuContentProps) {
  useAuthVersion();
  const token = getAuthToken();
  const email = getAuthEmail();

  const handleLogout = () => {
    clearAuth('all');
    notifyAuthChange();
    onClose();
  };

  const rowBase =
    'flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-black/[0.06] focus-visible:bg-black/[0.06] focus-visible:outline-none';

  return (
    <div className={`flex min-w-[13.5rem] flex-col gap-1 py-1.5 ${className}`.trim()}>
      {token ? (
        <div
          className="mx-2 flex flex-col gap-0.5 rounded-lg bg-black/[0.06] px-3 py-2.5"
          role="presentation"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-inherit opacity-55">
            Signed in
          </span>
          <span className="truncate text-sm font-semibold leading-tight text-inherit" title={email ?? undefined}>
            {email ?? 'Account'}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-0.5 px-1 pt-0.5" role="presentation">
        <Link to="/" role="menuitem" className={`${rowBase} font-semibold text-inherit`} onClick={onClose}>
          Home
        </Link>
        <Link
          to="/restaurants"
          role="menuitem"
          className={`${rowBase} font-semibold text-inherit`}
          onClick={onClose}
        >
          Manage restaurants
        </Link>
      </div>

      <div className="mx-2 mt-1 border-t border-black/[0.08] pt-1" role="presentation">
        {token ? (
          <button
            type="button"
            role="menuitem"
            className={`${rowBase} font-semibold text-red-700 hover:bg-red-50/95`}
            onClick={handleLogout}
          >
            Log out
          </button>
        ) : (
          <Link to="/login" role="menuitem" className={`${rowBase} font-semibold text-inherit`} onClick={onClose}>
            Log in
          </Link>
        )}
      </div>
    </div>
  );
}
