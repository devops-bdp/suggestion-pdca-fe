'use client'

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { ToastContainer } from "react-toastify";
import { apiClient } from "@/types/api-client";
import { LoginPayload, LoginResponse } from "@/types/api";
import { showError, showSuccess } from "@/lib/toast";

const AUTH_TOKEN_KEY = "token";

export default function LoginPage() {
  const router = useRouter();
  const [nrp, setNrp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const persistToken = (response: LoginResponse) => {
    // Try multiple possible response structures
    const token = 
      response.token || 
      response.data?.token || 
      (response as any).accessToken ||
      (response as any).access_token;
    
    if (!token || typeof token !== "string") {
      console.error("Response structure:", response);
      throw new Error("Token not found in login response.");
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    console.log("Token saved successfully");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate inputs
    if (!nrp.trim() || !password.trim()) {
      showError("NRP and password are required.");
      setIsLoading(false);
      return;
    }

    try {
      // Try with string nrp first (current format)
      let payload: LoginPayload = { 
        nrp: nrp.trim(), 
        password: password.trim() 
      };
      
      console.log("Sending login request:", { 
        endpoint: "/auth/login",
        payload: { ...payload, password: "***" },
        fullUrl: "https://sugestion-system.vercel.app/api/auth/login"
      });
      
      let result: LoginResponse;
      
      try {
        // Try with string nrp
        result = await apiClient.post<LoginResponse, LoginPayload>(
          "/auth/login",
          payload
        );
      } catch (firstError) {
        // If 500 error, try with number nrp (some APIs expect number)
        if (firstError instanceof Error && firstError.message.includes("Internal server error")) {
          console.log("Trying alternative format: nrp as number");
          const numericNrp = parseInt(nrp.trim(), 10);
          if (!isNaN(numericNrp)) {
            try {
              result = await apiClient.post<LoginResponse, any>(
                "/auth/login",
                { 
                  nrp: numericNrp, 
                  password: password.trim() 
                }
              );
            } catch (secondError) {
              // If still fails, throw original error
              throw firstError;
            }
          } else {
            throw firstError;
          }
        } else {
          throw firstError;
        }
      }

      console.log("Login response received:", result);
      persistToken(result);
      showSuccess("Login successful! Redirecting...");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 500);
    } catch (err) {
      console.error("Login error:", err);
      let message = "Invalid NRP or password.";
      
      if (err instanceof Error) {
        // Check if it's a server error
        if (err.message.includes("Internal server error")) {
          message = "Internal server error. Please try again later or contact administrator.";
        } else if (err.message.includes("Invalid credentials") || err.message.includes("Unauthorized")) {
          message = "Invalid NRP or password.";
        } else {
          message = err.message;
        }
      }
      
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Image 
                src="/img/logo.png" 
                alt="Batara Logo" 
                width={120} 
                height={120}
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Login</h1>
            <p className="text-slate-600">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* NRP */}
            <div>
              <label
                htmlFor="nrp"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                NRP
              </label>
              <input
                id="nrp"
                type="text"
                inputMode="numeric"
                placeholder="12345678"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link href="#" className="text-blue-600 hover:text-blue-700 font-medium transition">
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
