export type AuthUser = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  /** The verified Supabase access token, forwarded to Supabase so RLS applies. */
  accessToken: string;
};
