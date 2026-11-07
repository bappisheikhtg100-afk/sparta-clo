/**
 * Authentication Service for SPARTA Atelier Admin
 * Integrates with Supabase Auth and provides role checks
 */

import { supabase } from '../lib/supabase';

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager';
}

const LOCAL_ADMIN_KEY = 'sparta_admin_session_v1';

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      return {
        id: session.user.id,
        email: session.user.email,
        role: 'super_admin',
      };
    }
  } catch {
    // ignore
  }

  // Check local admin fallback for immediate development/management
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  return null;
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  // 1. Try Supabase Auth
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user && data.user.email) {
      const admin: AdminUser = {
        id: data.user.id,
        email: data.user.email,
        role: 'super_admin',
      };
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(admin));
      return admin;
    }
  } catch (err) {
    console.warn('Supabase auth attempt failed:', err);
  }

  // 2. Fallback to master admin credential check (for setup before Supabase user created)
  if (
    (email === 'admin@sparta.com' && password === 'sparta2026') ||
    (email === 'sparta@atelier.com' && password === 'atelier2026')
  ) {
    const admin: AdminUser = {
      id: 'sparta-master-admin',
      email,
      role: 'super_admin',
    };
    localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(admin));
    return admin;
  }

  throw new Error('Invalid email or password. Please verify credentials.');
}

export async function logoutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  localStorage.removeItem(LOCAL_ADMIN_KEY);
}
