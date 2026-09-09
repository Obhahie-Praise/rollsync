"use client";

import { useState } from "react";
import { AuthMode } from "./auth-modal";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface AuthFormProps {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
}

export function AuthForm({ mode, setMode }: AuthFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      // Better auth handles oauth
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/onboarding",
      });
    } catch (err: any) {
      setError(err?.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "sign-up") {
        const { data, error } = await authClient.signUp.email({
          email,
          password,
          name: `${firstName} ${lastName}`.trim(),
        });
        if (error) throw error;
        router.push("/onboarding");
      } else {
        const { data, error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) throw error;
        router.push("/onboarding");
      }
    } catch (err: any) {
      setError(err?.message || err?.error?.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full bg-[#0d34db] hover:bg-[#0b2bb5] text-white rounded-full py-[14px] px-6 flex items-center justify-center font-medium text-[16px] transition-colors disabled:opacity-70"
      >
        <svg className="w-[18px] h-[18px] mr-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center my-8">
        <div className="flex-1 border-t border-gray-200/60"></div>
        <span className="px-4 text-[14px] text-gray-500 font-medium">or</span>
        <div className="flex-1 border-t border-gray-200/60"></div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "sign-up" && (
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="flex-1 bg-gray-200/60 border-none rounded-full px-6 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#0d34db]/30 transition-all placeholder:text-gray-400"
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="flex-1 bg-gray-200/60 border-none rounded-full px-6 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#0d34db]/30 transition-all placeholder:text-gray-400"
            />
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-gray-200/60 border-none rounded-full px-6 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#0d34db]/30 transition-all placeholder:text-gray-400"
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-gray-200/60 border-none rounded-full pl-6 pr-14 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#0d34db]/30 transition-all placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mt-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0d34db] hover:bg-[#0b2bb5] text-white rounded-full py-[14px] px-6 flex items-center justify-center font-medium text-[16px] transition-colors mt-2 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : mode === "sign-up" ? (
            "Sign up with email"
          ) : (
            "Sign in with email"
          )}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
          className="text-[14px] text-gray-500 hover:text-gray-900 transition-colors"
        >
          {mode === "sign-up" ? (
            <>Already have an account? <span className="font-medium underline hover:no-underline">Sign in</span></>
          ) : (
            <>Don't have an account? <span className="font-medium underline hover:no-underline">Sign up</span></>
          )}
        </button>
      </div>
    </div>
  );
}
