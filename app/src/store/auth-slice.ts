import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type AuthState =
  | { status: 'loading'; userId: null; email: null }
  | { status: 'signedOut'; userId: null; email: null }
  | { status: 'signedIn'; userId: string; email: string | null };

const initialState = { status: 'loading', userId: null, email: null } as AuthState;

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn: (_state, action: PayloadAction<{ userId: string; email: string | null }>) => ({
      status: 'signedIn' as const,
      ...action.payload,
    }),
    signedOut: () => ({ status: 'signedOut' as const, userId: null, email: null }),
  },
});

export const { signedIn, signedOut } = authSlice.actions;
