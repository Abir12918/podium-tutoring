import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';

const Login = () => {
  const { currentUser, error: authError, clearError } = useAuth();

  const [mode, setMode] = useState('select'); // 'select', 'login', 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authError) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [authError, clearError]);

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const displayError = localError || authError;

  const handleGoogleSignIn = async () => {
    setLocalError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sign in failed", err);
      setLocalError('Google sign-in failed. Please try again.');
    }
  };

  const getFriendlyError = (code) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try logging in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
        return 'No account found with this email. Try signing up instead.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a moment and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Email login failed", err);
      setLocalError(getFriendlyError(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Email signup failed", err);
      setLocalError(getFriendlyError(err.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setMode('select');
    setLocalError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-blue/5 to-brand-cream p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-brand-blue p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-yellow rounded-2xl shadow-lg mb-6">
            <span className="text-3xl font-bold text-brand-blue">P</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Podium Tutoring</h1>
          <p className="text-blue-200 font-medium">Internal Management Portal</p>
        </div>
        
        <div className="p-8">
          {displayError && (
            <div className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl">
              <p className="text-brand-red text-sm font-semibold text-center">{displayError}</p>
            </div>
          )}

          {/* Mode: Select Login Method */}
          {mode === 'select' && (
            <div className="space-y-5">
              <p className="text-slate-600 font-medium text-center">
                Sign in to access your dashboard.
              </p>
              
              {/* Google Sign In */}
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

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-sm text-slate-400 font-medium">or</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* Email Login */}
              <button
                onClick={() => setMode('login')}
                className="w-full flex items-center justify-center gap-3 bg-brand-blue text-white hover:bg-blue-700 hover:shadow-md transition-all duration-200 font-semibold py-3.5 px-4 rounded-xl"
              >
                <Mail size={20} />
                Sign in with Email
              </button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-brand-blue font-semibold hover:text-blue-700 transition-colors"
                >
                  Sign Up
                </button>
              </p>
            </div>
          )}

          {/* Mode: Email Login */}
          {mode === 'login' && (
            <div className="space-y-5">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-blue transition-colors font-medium group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to options
              </button>

              <h2 className="text-xl font-bold text-slate-800 text-center">Sign In</h2>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@email.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-blue text-white font-semibold py-3.5 px-4 rounded-xl hover:bg-blue-700 hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setLocalError(''); }}
                  className="text-brand-blue font-semibold hover:text-blue-700 transition-colors"
                >
                  Sign Up
                </button>
              </p>
            </div>
          )}

          {/* Mode: Email Sign Up */}
          {mode === 'signup' && (
            <div className="space-y-5">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-blue transition-colors font-medium group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to options
              </button>

              <h2 className="text-xl font-bold text-slate-800 text-center">Create Account</h2>

              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@email.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Confirm Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-green text-white font-semibold py-3.5 px-4 rounded-xl hover:bg-green-700 hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : null}
                  {submitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setLocalError(''); }}
                  className="text-brand-blue font-semibold hover:text-blue-700 transition-colors"
                >
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
