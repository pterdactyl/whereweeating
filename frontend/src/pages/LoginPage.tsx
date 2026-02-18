import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiUrl } from "../lib/api";
import { useToast } from '../components/Toast';

type AuthPayload = {
  email: string;
  password: string;
};

type AuthFormProps = {
  onSubmit: (data: AuthPayload) => void | Promise<void>;
};

function Login({ onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Log in box
  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        if (validate()) {
          setIsSubmitting(true);
          try {
            await onSubmit({ email, password });
          } finally {
            setIsSubmitting(false);
          }
        }
      }}
    >
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
              errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
            }`}
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            required
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              required
              className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
          )}
        </div>
      </div>
      <button 
        className="w-full mt-6 bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}

// Sign up box
function Signup({ onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
      <form
        onSubmit={async e => {
          e.preventDefault();
          if (validate()) {
            setIsSubmitting(true);
            try {
              await onSubmit({ email, password });
            } finally {
              setIsSubmitting(false);
            }
          }
        }}
      >
        <h1 className="text-2xl font-bold mb-6">Sign Up</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
              }`}
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              required
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                  if (errors.confirmPassword && confirmPassword) {
                    setErrors({ ...errors, confirmPassword: password === confirmPassword ? undefined : 'Passwords do not match' });
                  }
                }}
                className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                  errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: password === e.target.value ? undefined : 'Passwords do not match' });
                  }
                }}
                required
                className={`w-full border rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                  errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
        <button 
          className="w-full mt-6 bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing up...' : 'Sign Up'}
        </button>
    </form>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  
  const handleLogin = async (data: AuthPayload) => {
      try {
          const res = await fetch(apiUrl(`/api/login`), {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
          });

          if (!res.ok) {
              const errorData = await res.json().catch(() => ({ message: 'Login failed' }));
              showToast('error', "Login failed: " + errorData.message);
              return;
          }
        
          const result = await res.json();
          localStorage.setItem("token", result.token);
          localStorage.setItem("email", result.email ?? data.email);
          showToast('success', 'Login successful!');
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 500);
        } catch (error) {
            console.error("Network or server error:", error);
            showToast('error', "Something went wrong, please try again later.");
        }
    };

  const handleSignup = async (data: AuthPayload) => {
        try {
            const res = await fetch(apiUrl(`/api/signup`), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'Signup failed' }));
                showToast('error', "Signup failed: " + errorData.message);
                return;
            }
        
            const result = await res.json();
            localStorage.setItem("token", result.token);
            localStorage.setItem("email", result.email ?? data.email);
            showToast('success', 'Account created successfully!');
            setTimeout(() => {
              navigate("/", { replace: true });
            }, 500);
        } catch (error) {
            console.error("Network or server error:", error);
            showToast('error', "Something went wrong, please try again later.");
        }
    };

  // Entire page
  return (
    <div
      className="flat-background min-h-screen flex items-center justify-center"
      style={{ backgroundImage: "url('/images/default.jpg')" }}>
      <Navbar />

      <div className="w-full max-w-md px-4">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 bg-white/90 rounded-lg p-1 shadow-md">
          <button
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
              isLogin
                ? 'bg-black text-white shadow-md'
                : 'text-gray-700 hover:text-black'
            }`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
              !isLogin
                ? 'bg-black text-white shadow-md'
                : 'text-gray-700 hover:text-black'
            }`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        {/* Form Container */}
        <div className="content w-full">
          {isLogin ? (
            <Login onSubmit={handleLogin} />
          ) : (
            <Signup onSubmit={handleSignup} />
          )}
        </div>
      </div>
    </div>
    );
}