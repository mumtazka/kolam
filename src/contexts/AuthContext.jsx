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
    // Check for stored user on mount and validate session
    const validateSession = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);

          // Validate UUID format (should be 36 chars with hyphens)
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsedUser.id);

          if (!isValidUUID) {
            console.warn('Invalid user ID format, clearing session');
            localStorage.removeItem('user');
            setUser(null);
            setLoading(false);
            return;
          }

          // Verify user still exists in database
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('id, is_active')
            .eq('id', parsedUser.id)
            .maybeSingle();

          if (error || !dbUser || !dbUser.is_active) {
            console.warn('User session invalid or user deleted, clearing session');
            localStorage.removeItem('user');
            setUser(null);
          } else {
            setUser(parsedUser);
          }
        } catch (e) {
          console.error('Session validation error:', e);
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    validateSession();
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