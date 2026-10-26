import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type AuthState =
  | { status: 'loading'; userId: null; email: null; name: null; avatarPath: null }
  | { status: 'signedOut'; userId: null; email: null; name: null; avatarPath: null }
  | { status: 'signedIn'; userId: string; email: string | null; name: string | null; avatarPath: string | null };

const initialState = { status: 'loading', userId: null, email: null, name: null, avatarPath: null } as AuthState;

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn: (_state, action: PayloadAction<{ userId: string; email: string | null; name: string | null; avatarPath: string | null }>) => ({
      status: 'signedIn' as const,
      ...action.payload,
    }),
    signedOut: () => ({ status: 'signedOut' as const, userId: null, email: null, name: null, avatarPath: null }),
  },
});

export const { signedIn, signedOut } = authSlice.actions;
