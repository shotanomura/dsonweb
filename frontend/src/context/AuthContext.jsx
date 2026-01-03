import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Validate token or fetch user profile from backend
      // For now, we decode basic info or just trust the token existence + backend 401 checks
      fetchUser(token);
    } else {
        setLoading(false);
    }
  }, [token]);

  const fetchUser = async (authToken) => {
      try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
              headers: {
                  'Authorization': `Bearer ${authToken}`
              }
          });
          if (response.ok) {
              const userData = await response.json();
              setUser(userData);
          } else {
              logout();
          }
      } catch (error) {
          console.error("Failed to fetch user", error);
          logout();
      } finally {
          setLoading(false);
      }
  };

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
