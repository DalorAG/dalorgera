import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from './env';

export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    // On web supabase-js uses localStorage by default.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    // PKCE: OAuth (Google) returns a one-time code that is exchanged for a session.
    flowType: 'pkce',
    // On web the OAuth redirect lands on /auth-callback and the client exchanges the code itself.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Only refresh the session while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
