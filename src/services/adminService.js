import { supabase } from '../lib/supabase';

/**
 * Get all sessions
 */
export const getSessions = async () => {
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_time');

    if (error) throw error;
    return data;
};

/**
 * Create session
 */
export const createSession = async (sessionData) => {
    const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update session
 */
export const updateSession = async (sessionId, sessionData) => {
    const { data, error } = await supabase
        .from('sessions')
        .update(sessionData)
        .eq('id', sessionId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Delete session
 */
export const deleteSession = async (sessionId) => {
    const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

    if (error) throw error;
};

/**
 * Get all packages
 */
export const getPackages = async () => {
    const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name');

    if (error) throw error;
    return data;
};

/**
 * Create package
 */
export const createPackage = async (packageData) => {
    const { data, error } = await supabase
        .from('packages')
        .insert(packageData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update package
 */
export const updatePackage = async (packageId, packageData) => {
    const { data, error } = await supabase
        .from('packages')
        .update(packageData)
        .eq('id', packageId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Delete package
 */
export const deletePackage = async (packageId) => {
    const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', packageId);

    if (error) throw error;
};

/**
 * Get all locations
 */
export const getLocations = async () => {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

    if (error) throw error;
    return data;
};

/**
 * Create location
 */
export const createLocation = async (locationData) => {
    const { data, error } = await supabase
        .from('locations')
        .insert(locationData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update location
 */
export const updateLocation = async (locationId, locationData) => {
    const { data, error } = await supabase
        .from('locations')
        .update(locationData)
        .eq('id', locationId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Delete location
 */
export const deleteLocation = async (locationId) => {
    const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId);

    if (error) throw error;
};
