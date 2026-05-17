import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthContextValue = {
  currentUser: User | null;
  isFirebaseConfigured: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
