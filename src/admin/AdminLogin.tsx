import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { loginAdmin, AdminUser } from '../services/authService';

interface AdminLoginProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onExit: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onExit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await loginAdmin(email.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your Supabase Auth credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B0B0E] text-stone-100">
      <div className="w-full max-w-md bg-[#131317] border border-white/10 rounded-sm p-8 sm:p-10 shadow-2xl relative">
        {/* Back to Storefront */}
        <button
          type="button"
          onClick={onExit}
          className="absolute top-6 right-6 text-xs tracking-wider uppercase text-stone-400 hover:text-white transition-colors cursor-pointer"
        >
          Exit to Store
        </button>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px] font-mono tracking-widest uppercase text-stone-300 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-300" />
            SPARTA Atelier Admin
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-light tracking-wider text-white">
            Administrative Portal
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Sign in with your registered Supabase administrator account.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-800/60 text-xs text-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">
              Administrator Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-admin@sparta.com"
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/15 focus:border-stone-300 text-sm text-white rounded-none outline-none transition-colors"
              />
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/15 focus:border-stone-300 text-sm text-white rounded-none outline-none transition-colors"
              />
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-white text-black font-medium text-xs tracking-widest uppercase hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-stone-400 text-[11px]">
          <KeyRound className="w-3.5 h-3.5 shrink-0 text-stone-500" />
          <span>Protected with Supabase Authentication &amp; RLS authorization policies.</span>
        </div>
      </div>
    </div>
  );
};
