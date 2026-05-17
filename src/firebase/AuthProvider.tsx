import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';

import { AuthContext, type AuthContextValue } from './authStateContext';
import { firebaseAuth, isFirebaseConfigured } from './config';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!firebaseAuth) {
      return undefined;
    }

    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setCurrentUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isFirebaseConfigured,
      isLoading,
      signInWithGoogle: async () => {
        if (!firebaseAuth) {
          throw new Error('Firebase is not configured yet. Add your Vite Firebase env vars first.');
        }

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(firebaseAuth, provider);
      },
      signOut: async () => {
        if (!firebaseAuth) {
          return;
        }

        await firebaseSignOut(firebaseAuth);
      },
    }),
    [currentUser, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
