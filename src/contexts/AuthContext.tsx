import { createContext, useState, useEffect } from 'react';
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { User, AuthState, LoginCredentials, SignupData } from '../types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get Supabase credentials from environment variables
const getSupabaseUrl = (): string => {
  return import.meta.env.VITE_SUPABASE_URL || '';
};

const getSupabaseAnonKey = (): string => {
  return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
};

// Initialize Supabase client
export let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (url && key) {
    supabase = createClient(url, key);
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null,
  });

  // Check for existing user session on startup
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setAuthState(prev => ({ ...prev, isLoading: false, error: 'Supabase not configured' }));
        return;
      }

      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          // Fetch or create user profile in our public.users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!userError && userData) {
            // User profile exists
            setAuthState(prev => ({ 
              ...prev, 
              user: userData as User,
              isLoading: false,
              error: null
            }));
          } else {
            // Create user profile if it doesn't exist
            const newUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || 
                      session.user.email?.split('@')[0] || 'User',
              avatarUrl: session.user.user_metadata?.avatar_url || '',
              role: 'user',
              createdAt: session.user.created_at || new Date().toISOString(),
            };
            
            await supabase
              .from('users')
              .upsert(newUser, { onConflict: 'id' });
              
            setAuthState(prev => ({ 
              ...prev, 
              user: newUser,
              isLoading: false,
              error: null
            }));
          }
        } else {
          // No session
          setAuthState(prev => ({ 
            ...prev, 
            user: null, 
            isLoading: false, 
            error: null 
          }));
        }
      } catch (error: any) {
        console.error('Auth initialization error:', error);
        setAuthState(prev => ({ 
          ...prev, 
          user: null, 
          isLoading: false, 
          error: error.message || 'Authentication error' 
        }));
      }
    };

    checkSession();

    if (!supabase) return;

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // User signed in
          const { data: userData, error } = await supabase!
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!error && userData) {
            setAuthState(prev => ({ 
              ...prev, 
              user: userData as User,
              isLoading: false,
              error: null
            }));
          } else {
            // Create profile if missing
            const newUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || 
                      session.user.email?.split('@')[0] || 'User',
              avatarUrl: session.user.user_metadata?.avatar_url || '',
              role: 'user',
              createdAt: session.user.created_at || new Date().toISOString(),
            };
            
            await supabase!
              .from('users')
              .upsert(newUser, { onConflict: 'id' });
              
            setAuthState(prev => ({ 
              ...prev, 
              user: newUser,
              isLoading: false,
              error: null
            }));
          }
        } else {
          // User signed out
          setAuthState(prev => ({ 
            ...prev, 
            user: null, 
            isLoading: false, 
            error: null 
          }));
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    if (!supabase) {
      setAuthState({ user: null, isLoading: false, error: 'Supabase not configured' });
      return;
    }

    setAuthState({ user: null, isLoading: true, error: null });
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      
      if (error) throw error;
      
      // The onAuthStateChange listener will handle setting the user
    } catch (error: any) {
      setAuthState({
        user: null,
        isLoading: false,
        error: error.message || 'Login failed. Please try again.',
      });
    }
  };

  const signup = async (data: SignupData) => {
    if (!supabase) {
      setAuthState({ user: null, isLoading: false, error: 'Supabase not configured' });
      return;
    }

    setAuthState({ user: null, isLoading: true, error: null });
    
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          }
        }
      });
      
      if (error) throw error;
      
      // Note: With email confirmations, the user might not be created yet
      // The onAuthStateChange listener will handle it when they confirm and sign in
    } catch (error: any) {
      setAuthState({
        user: null,
        isLoading: false,
        error: error.message || 'Signup failed. Please try again.',
      });
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: 'Supabase not configured' }));
      return false;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;

      setAuthState(prev => ({ ...prev, isLoading: false, error: null }));
      return true;
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Unable to send password reset email.',
      }));
      return false;
    }
  };

  const updatePassword = async (password: string) => {
    if (!supabase) {
      setAuthState(prev => ({ ...prev, isLoading: false, error: 'Supabase not configured' }));
      return false;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setAuthState(prev => ({ ...prev, isLoading: false, error: null }));
      return true;
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Unable to update password.',
      }));
      return false;
    }
  };

  const logout = () => {
    if (!supabase) return;
    
    supabase.auth.signOut().catch(console.error);
    // onAuthStateChange will handle setting user to null
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        signup,
        resetPassword,
        updatePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
