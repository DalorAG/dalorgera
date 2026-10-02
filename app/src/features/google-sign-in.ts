import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/** Path the OAuth flow returns to; must be in Supabase → Auth → URL Configuration → Redirect URLs. */
const CALLBACK_PATH = 'auth-callback';

/**
 * Signs in (or signs up) with Google through Supabase OAuth.
 * Returns false when the user closed the browser.
 */
export async function signInWithGoogle(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Full-page redirect; /auth-callback finishes the sign-in.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/${CALLBACK_PATH}` },
    });
    if (error) throw error;
    return true;
  }

  const redirectTo = Linking.createURL(CALLBACK_PATH);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;

  const { queryParams } = Linking.parse(result.url);
  if (typeof queryParams?.error_description === 'string') throw new Error(queryParams.error_description);
  if (typeof queryParams?.code !== 'string') throw new Error('Anmeldung fehlgeschlagen.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(queryParams.code);
  if (exchangeError) throw exchangeError;
  return true;
}
