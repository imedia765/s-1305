import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import Index from './pages/Index';
import Login from './pages/Login';
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', session?.user?.id);
      if (error) {
        console.error('Session check error:', error);
        handleAuthError(error);
      }
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.id);
      
      if (_event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }

      if (_event === 'SIGNED_OUT') {
        console.log('User signed out, clearing session and queries');
        await handleSignOut();
      }

      setSession(session);
      
      if (!session) {
        // Clear all queries when logging out
        await queryClient.resetQueries();
      } else {
        // Refresh queries when logging in
        await queryClient.invalidateQueries();
      }
    });

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const handleAuthError = async (error: any) => {
    console.error('Auth error:', error);
    
    if (error.message?.includes('refresh_token_not_found') || 
        error.message?.includes('Invalid Refresh Token')) {
      console.log('Invalid refresh token, signing out...');
      await handleSignOut();
      
      toast({
        title: "Session expired",
        description: "Please sign in again",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      await queryClient.resetQueries();
      console.log('Sign out complete, queries reset');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            session ? <Navigate to="/" replace /> : <Login />
          } 
        />
        <Route 
          path="/" 
          element={
            session ? <Index /> : <Navigate to="/login" replace />
          } 
        />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;