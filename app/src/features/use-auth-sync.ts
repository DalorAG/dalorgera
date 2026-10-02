import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useAppDispatch } from '@/store';
import { api } from '@/store/api';
import { signedIn, signedOut } from '@/store/auth-slice';

/** Mirrors the Supabase session into Redux and clears cached data on sign-out. */
export function useAuthSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        dispatch(signedIn({ userId: session.user.id, email: session.user.email ?? null }));
      } else {
        dispatch(api.util.resetApiState());
        dispatch(signedOut());
      }
    });
    return () => data.subscription.unsubscribe();
  }, [dispatch]);
}
