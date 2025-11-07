'use client';

import { onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';

// Context'in tipini tanımla
const AuthContext = createContext({
  user: null,
  isLoading: true,
});

// Provider bileşeni (Uygulamayı sarmalayacak)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Firebase'den auth durumu değişikliklerini dinle
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Kullanıcı varsa user state'ini, yoksa null olarak ayarla
      setIsLoading(false); // Yükleme bitti
    });

    // Component unmount olduğunda listener'ı temizle
    return () => unsubscribe();
  }, []); // Sadece component mount olduğunda çalışır

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook (Context'i kolayca kullanmak için)
export const useAuth = () => {
  return useContext(AuthContext);
};

