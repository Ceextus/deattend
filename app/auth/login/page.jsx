'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans selection:bg-[#2563EB]/20 selection:text-[#1E3A8A]">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-16 md:px-24 py-12 relative z-10 bg-white">
        
        {/* Logo / Brand */}
        <div className="absolute top-8 left-8 sm:left-16 md:left-24 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1E3A8A] rounded-lg flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <span className="font-bold text-[#1E3A8A] tracking-tight text-lg">ChoirFlow</span>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Welcome back</h1>
          <p className="text-[#76767D] text-sm mb-10">
            Please enter your details to sign in and manage your community.
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-50/50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@choir.org"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1 pb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer appearance-none w-4 h-4 border border-gray-300 rounded cursor-pointer checked:bg-[#2563EB] checked:border-[#2563EB] transition-colors" />
                  <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm text-[#76767D] group-hover:text-gray-900 transition-colors select-none">Remember for 30 days</span>
              </label>

              <a href="#" className="text-sm font-medium text-[#1E3A8A] hover:text-[#2563EB] transition-colors" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2563EB] hover:bg-[#1E3A8A] text-white rounded-xl font-medium text-sm transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none shadow-lg shadow-[#2563EB]/20"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#76767D]">
            Need help accessing your account?{' '}
            <a href="#" className="font-semibold text-[#1E3A8A] hover:text-[#2563EB] hover:underline transition-all">
              Contact support
            </a>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative bg-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A8A]/90 via-[#1E3A8A]/20 to-transparent z-10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
        <Image 
          src="/login.jpg" 
          alt="Abstract Musical Art" 
          fill
          priority
          className="object-cover object-center opacity-90 scale-105 hover:scale-100 transition-transform duration-10000"
        />
        
        {/* Optional overlay text/quote */}
        <div className="absolute bottom-12 left-12 right-12 z-20 text-white">
          <div className="max-w-lg">
            <h2 className="text-2xl font-light leading-snug mb-4">
              Harmonizing our community, one perfect note and punctual moment at a time.
            </h2>
            <div className="flex items-center gap-3">
              <div className="h-0.5 w-8 bg-[#6E2C00]"></div>
              <p className="text-sm font-medium tracking-wide uppercase text-white/90">ChoirFlow Administration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}