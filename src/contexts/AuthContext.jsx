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

  // Unified login - no mode selection required upfront
  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);

      // 1. Fetch user from Supabase
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw new Error(`Database error: ${error.message}`);
      if (!userData) throw new Error('User not found or inactive.');

      // 2. Verify password
      const isValidPassword = await bcrypt.compare(password, userData.password_hash);
      if (!isValidPassword) throw new Error('Invalid password');

      // 3. Determine user type
      // ADMIN -> ADMIN
      // RECEPTIONIST/SCANNER/STAFF -> STAFF
      let userType = 'STAFF';
      let activeMode = null;

      if (userData.role === 'ADMIN') {
        userType = 'ADMIN';
        activeMode = 'ADMIN'; // Admin mode is set automatically
      }
      // For staff, mode will be set later via setActiveMode

      // 4. Create safe user object
      const safeUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        type: userType,
        active_mode: activeMode, // null for staff until they choose
        original_role: userData.role,
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

  // Set active mode for staff users after login
  const setActiveMode = async (mode) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    if (user.type === 'ADMIN') {
      throw new Error('Admin users cannot switch modes');
    }

    if (mode !== 'CASHIER' && mode !== 'SCANNER') {
      throw new Error('Invalid mode. Must be CASHIER or SCANNER');
    }

    const updatedUser = {
      ...user,
      active_mode: mode
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    return updatedUser;
  };

  // Switch mode for staff users (can be used from dashboards)
  const switchMode = async (newMode) => {
    return setActiveMode(newMode);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      setActiveMode,
      switchMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;