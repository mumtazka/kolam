import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);

      // Fetch user from Supabase
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      console.log('Supabase response:', { userData, error });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!userData) {
        throw new Error('User not found. Please check if the database is set up correctly.');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, userData.password_hash);
      console.log('Password valid:', isValidPassword);

      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Create safe user object (without password_hash)
      const safeUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        is_active: userData.is_active,
        created_at: userData.created_at
      };

      // Store user in localStorage and state
      localStorage.setItem('user', JSON.stringify(safeUser));
      setUser(safeUser);

      return safeUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;