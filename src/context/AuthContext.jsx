import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, logoutUser } from '../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext({});

const allowedEmails = [
  "banikabir1234@gmail.com",
  "rahatkhandokar5@gmail.com",
  "rahatkhandokar6@gmail.com"
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userEmail = user.email?.toLowerCase();
        if (allowedEmails.some(email => email.toLowerCase() === userEmail)) {
          setCurrentUser(user);
          setError('');
        } else {
          console.warn(`Unauthorized access attempt from: ${user.email}`);
          await logoutUser();
          setCurrentUser(null);
          setError('This account does not have access to Podium.');
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const clearError = () => setError('');

  return (
    <AuthContext.Provider value={{ currentUser, loading, error, clearError, logout: logoutUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
