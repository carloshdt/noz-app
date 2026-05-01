import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, senha: string) => Promise<void>;
  signUp: (nome: string, email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOAuthProvider = async (provider: 'google' | 'apple') => {
    const redirectTo = makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) return;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      const parsed = Linking.parse(result.url);
      const access_token = parsed.queryParams?.access_token as string;
      const refresh_token = parsed.queryParams?.refresh_token as string;
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  };

  const signInWithGoogle = () => signInWithOAuthProvider('google');
  const signInWithApple = () => signInWithOAuthProvider('apple');

  const signInWithEmail = async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  };

  const signUp = async (nome: string, email: string, senha: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      signInWithGoogle, signInWithApple,
      signInWithEmail, signUp, signOut, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
