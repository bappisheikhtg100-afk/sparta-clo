/**
 * Production Authentication Service for SPARTA Atelier Admin
 * Strictly authenticates against Supabase Authentication.
 * Clears all cached tokens, sessions, and state on sign out.
 */

import { supabase } from '../lib/supabase';

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager';
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session?.user && session.user.email) {
      const user = session.user;
      const role =
        (user.app_metadata?.role ||
          user.user_metadata?.role ||
          'super_admin') as AdminUser['role'];

      return {
        id: user.id,
        email: user.email!,
        role,
      };
    }
  } catch (err) {
    console.warn('Error verifying admin session:', err);
  }
  return null;
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user || !data.user.email) {
    throw new Error(
      error?.message || 'Invalid email or password. Please verify your Supabase credentials.'
    );
  }

  const role =
    (data.user.app_metadata?.role ||
      data.user.user_metadata?.role ||
      'super_admin') as AdminUser['role'];

  return {
    id: data.user.id,
    email: data.user.email,
    role,
  };
}

export async function logoutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Sign out error:', err);
  } finally {
    // Purge cached session tokens and sensitive keys on logout
    try {
      localStorage.removeItem('sparta_pathao_token_v2');
      sessionStorage.clear();
    } catch {
      // ignore
    }
  }
}
