import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_BASE } from "../lib/api";

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

  // Log in box
  return (
    <form
      style={{position:"relative"}}
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ email, password });
      }}
    >
      <h1 className="text-xl font-bold mb-4">Login</h1>
      <label className="flex flex-col gap-2 my-1">
        Email:
        <input
          className="border rounded ml-1 small-wide-input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-2 my-1">
          Password:
        <div className="relative w-full small-wide-input">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="border rounded ml-1 small-wide-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0.5 top-1/2 
            transform -translate-y-1/2 text-gray-500"
            tabIndex={-1}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </label>
      <br />
      <button 
        className="bg-black hover:bg-purple-300 text-white button"
        type="submit">
        Log In
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

  return (
      <form
        style={{position:"relative"}}
        onSubmit={e => {
          e.preventDefault();
          if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
          }
          onSubmit({ email, password });
        }}
      >
        <h1 className="text-xl font-bold mb-4">Sign Up</h1>
        <label className="flex flex-col gap-2 my-1">
          Email:
          <input
            className="border rounded ml-1 small-wide-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-2 my-1">
          Password:
          <div className="relative w-full small-wide-input">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border rounded ml-1 small-wide-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0.5 top-1/2 
              transform -translate-y-1/2 text-gray-500"
              tabIndex={-1}
            > {showPassword ? '🙈' : '👁️'}
            </button>
        </div>
        </label>
        <label className="flex flex-col gap-2 my-1">
          Confirm Password:
          <div className="relative w-full small-wide-input">
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="border rounded ml-1 small-wide-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0.5 top-1/2 
              transform -translate-y-1/2 text-gray-500"
              tabIndex={-1}
            > {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>
        <br />
        <button 
          className="bg-black hover:bg-purple-300 text-white button"
          type="submit">
          Sign Up</button>
    </form>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const handleLogin = async (data: AuthPayload) => {
      try {
          const res = await fetch(`${API_BASE}/api/login`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
          });

          if (!res.ok) {
              const errorData = await res.json();
              alert("Login failed: " + errorData.message);
              return;
          }
        
          const result = await res.json();
          localStorage.setItem("token", result.token);
          localStorage.setItem("email", result.email ?? data.email);
          navigate("/", { replace: true }); 
          console.log("Login succesful:", result);
        } catch (error) {
            console.error("Network or server error:", error);
            alert("Something went wrong, please try again later.");
        }
    };

  const handleSignup = async (data: AuthPayload) => {
        try {
            const res = await fetch(`${API_BASE}/api/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json();
                alert("Signup failed: " + errorData.message);
                return;
            }
        
            const result = await res.json();
            localStorage.setItem("token", result.token);
            localStorage.setItem("email", result.email ?? data.email);
            navigate("/", { replace: true });
            console.log("Signup successful:", result);
        } catch (error) {
            console.error("Network or server error:", error);
            alert("Something went wrong, please try again later.");
        }
    };

  // Entire page
  return (
    <div
      className="flat-background"
      style={{ backgroundImage: "url('/images/default.jpg')" }}>
      <Navbar />

      <div 
        className="fixed top-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-50">
        <button
          className="button"
          onClick={() => setIsLogin(true)}
          style={{ fontWeight: isLogin ? 'bold' : 'normal' }}
        >
          Login
        </button>
        <button
          className="button"
          onClick={() => setIsLogin(false)}
          style={{ fontWeight: !isLogin ? 'bold' : 'normal' }}
        >
          Sign Up
        </button>
      </div>
      <div className="content" style={{ position: 'absolute', top: '150px' }}>
        {isLogin ? (
          <Login onSubmit={handleLogin} />
        ) : (
          <Signup onSubmit={handleSignup} />
        )}
      </div>
    </div>
    );
}