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

  const login = async (email, password, selectedMode) => {
    try {
      console.log('Attempting login for:', email, 'Mode:', selectedMode);

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

      // 3. User Type Enforcement
      // ADMIN -> ADMIN
      // RECEPTIONIST/SCANNER -> STAFF
      let userType = 'STAFF';
      if (userData.role === 'ADMIN') {
        userType = 'ADMIN';
      }

      // 4. Validate Mode Selection
      if (selectedMode === 'ADMIN') {
        if (userType !== 'ADMIN') {
          throw new Error('Access Denied: Only Admins can login to Admin mode.');
        }
      } else if (selectedMode === 'CASHIER' || selectedMode === 'SCANNER') {
        if (userType !== 'STAFF') {
          // Optional: Strict rule -> Admins cannot use Staff modes? 
          // Project context said: "If selected = Admin: allow only if user.type === ADMIN"
          // "If selected = Cashier or Scanner: allow only if user.type === STAFF"
          // So yes, strictly enforce types.
          throw new Error('Access Denied: Only Staff can login to Cashier/Scanner mode.');
        }
      } else {
        throw new Error('Invalid login mode selected.');
      }

      // 5. Create safe user object with active_mode
      const safeUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        type: userType,          // Derived type
        active_mode: selectedMode, // The mode they chose

        // Keep original role just in case, but rely on active_mode for UI
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