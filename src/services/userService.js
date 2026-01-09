import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

/**
 * Get all users
 */
export const getUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

/**
 * Get user by ID
 */
export const getUserById = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, is_active, created_at, updated_at')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
};

/**
 * Create a new user (Admin only)
 * @param {Object} userData - { email, password, name, role }
 */
export const createUser = async (userData) => {
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const { data, error } = await supabase
        .from('users')
        .insert({
            email: userData.email,
            password_hash: passwordHash,
            name: userData.name,
            role: userData.role,
            is_active: true
        })
        .select('id, email, name, role, is_active, created_at')
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update user
 * @param {string} userId 
 * @param {Object} userData - { name, role, is_active }
 */
export const updateUser = async (userId, userData) => {
    const updateData = {
        name: userData.name,
        role: userData.role,
        is_active: userData.is_active
    };

    // If password is provided, hash it
    if (userData.password) {
        updateData.password_hash = await bcrypt.hash(userData.password, 12);
    }

    const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('id, email, name, role, is_active, created_at')
        .single();

    if (error) throw error;
    return data;
};

/**
 * Deactivate user (soft delete)
 */
export const deactivateUser = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Activate user
 */
export const activateUser = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Delete user permanently
 */
export const deleteUser = async (userId) => {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) throw error;
};
