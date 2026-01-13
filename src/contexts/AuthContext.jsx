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

      // 3. Determine Dynamic Role based on Active Shift & Weekly Schedule
      // a. Get current active shift
      const today = new Date().toISOString().split('T')[0];
      const { data: activeShiftData, error: shiftError } = await supabase
        .from('position_shifts')
        .select('shift_label')
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      // Default to MORNING if not set
      const currentShiftLabel = (activeShiftData && activeShiftData.length > 0)
        ? activeShiftData[0].shift_label
        : 'MORNING';

      console.log('Current Active Shift:', currentShiftLabel);

      // b. Check Weekly Schedule
      // Get today's day name (Monday, Tuesday, etc.) to match DB
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      console.log('Day of Week:', dayOfWeek);

      const { data: schedule, error: scheduleError } = await supabase
        .from('weekly_schedules')
        .select('morning_role, afternoon_role')
        .eq('user_id', userData.id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();

      if (scheduleError) console.error('Error fetching schedule:', scheduleError);

      let effectiveRole = 'OFF';

      if (schedule) {
        effectiveRole = currentShiftLabel === 'MORNING' ? schedule.morning_role : schedule.afternoon_role;
      }

      // c. ADMIN BYPASS
      // If user is statically an ADMIN, they always get access as ADMIN, overriding schedule (or lack thereof)
      if (userData.role === 'ADMIN') {
        console.log('User is static ADMIN. Bypassing schedule check.');
        effectiveRole = 'ADMIN';
      }

      if (effectiveRole === 'OFF') {
        throw new Error(`Access Denied: You are not scheduled for ${dayOfWeek} ${currentShiftLabel} shift.`);
      }

      // 4. Create safe user object with effective role
      const safeUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        // OLD STATIC ROLE (kept for reference if needed, but UI should use shift_role)
        static_role: userData.role,
        // NEW DYNAMIC ROLE
        role: effectiveRole,
        shift_label: currentShiftLabel,
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