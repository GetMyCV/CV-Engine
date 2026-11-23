import { localAuth } from './local';
import { supabaseAuth } from './supabase';
import type { AuthBackend } from './types';

import { cloudEnabled } from './config';

export { cloudEnabled };

export const auth: AuthBackend = cloudEnabled ? supabaseAuth : localAuth;

export type { AuthBackend, AuthUser, Repo } from './types';
