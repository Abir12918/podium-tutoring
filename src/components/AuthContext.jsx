import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase/firebaseConfig';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const allowedEmails = [
  "banikabir1234@gmail.com",
  "rahatkhandokar5@gmail.com"
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (allowedEmails.includes(user.email)) {
          setCurrentUser(user);
          setError('');
        } else {
          await signOut(auth);
          setCurrentUser(null);
          setError("This account does not have access to Podium.");
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!allowedEmails.includes(result.user.email)) {
        await signOut(auth);
        setError("This account does not have access to Podium.");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => signOut(auth);

  const value = {
    currentUser,
    loginWithGoogle,
    logout,
    error,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
