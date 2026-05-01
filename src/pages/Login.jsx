import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { currentUser, error, clearError } = useAuth();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign in failed", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue/5 to-brand-cream p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-brand-blue p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-yellow rounded-2xl shadow-lg mb-6">
            <span className="text-3xl font-bold text-brand-blue">P</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Podium Tutoring</h1>
          <p className="text-brand-blue-100 text-opacity-90 font-medium">Internal Management Portal</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl">
              <p className="text-brand-red text-sm font-semibold text-center">{error}</p>
            </div>
          )}

          <div className="space-y-6 text-center">
            <p className="text-slate-600 font-medium">
              Please sign in with your authorized Google account to continue.
            </p>
            
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-brand-blue hover:text-brand-blue hover:shadow-md transition-all duration-200 font-semibold py-3.5 px-4 rounded-xl"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
