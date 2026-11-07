/**
 * Production Authentication Service for SPARTA Atelier Admin
 * Strictly authenticates against Supabase Authentication.
 * No hardcoded demo credentials.
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
    if (!error && session?.user?.email) {
      return {
        id: session.user.id,
        email: session.user.email,
        role: 'super_admin',
      };
    }
  } catch (err) {
    console.warn('Error checking admin session:', err);
  }
  return null;
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user || !data.user.email) {
    throw new Error(error?.message || 'Invalid email or password. Please verify your Supabase credentials.');
  }

  return {
    id: data.user.id,
    email: data.user.email,
    role: 'super_admin',
  };
}

export async function logoutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Sign out error:', err);
  }
}
