import { localAuth } from './local';
import { supabaseAuth } from './supabase';
import type { AuthBackend } from './types';

export const cloudEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const auth: AuthBackend = cloudEnabled ? supabaseAuth : localAuth;

export type { AuthBackend, AuthUser, Repo } from './types';
