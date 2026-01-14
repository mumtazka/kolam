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
 * Get all pools
 */
export const getPools = async () => {
    const { data, error } = await supabase
        .from('pools')
        .select('*')
        .order('name');

    if (error) throw error;
    return data;
};

/**
 * Create pool
 */
export const createPool = async (poolData) => {
    const { data, error } = await supabase
        .from('pools')
        .insert(poolData)
        .select()
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to create pool: No data returned');
    return data;
};

/**
 * Update pool
 */
export const updatePool = async (poolId, poolData) => {
    const { data, error } = await supabase
        .from('pools')
        .update(poolData)
        .eq('id', poolId)
        .select()
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Pool not found or access denied');
    return data;
};

/**
 * Delete pool
 */
export const deletePool = async (poolId) => {
    const { error } = await supabase
        .from('pools')
        .delete()
        .eq('id', poolId);

    if (error) throw error;
};

/**
 * Upload pool image
 * @param {File} file - File object to upload
 */
export const uploadPoolImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Debug Authentication
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Current Session:", session);
    console.log("User Role:", session?.user?.role);
    console.log("Uploading to bucket: pool-images");

    const { error: uploadError } = await supabase.storage
        .from('pool-images')
        .upload(filePath, file);

    if (uploadError) {
        console.error("Storage Error Details:", uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('pool-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

// Deprecated Location functions mapped to Pool functions for backward compatibility during migration
export const getLocations = getPools;
export const createLocation = createPool;
export const updateLocation = updatePool;
export const deleteLocation = deletePool;

/**
 * Get all ticket packages
 */
export const getTicketPackages = async () => {
    const { data, error } = await supabase
        .from('ticket_packages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

/**
 * Create ticket package
 */
export const createTicketPackage = async (packageData) => {
    const { data, error } = await supabase
        .from('ticket_packages')
        .insert(packageData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update ticket package
 */
export const updateTicketPackage = async (packageId, packageData) => {
    const { data, error } = await supabase
        .from('ticket_packages')
        .update(packageData)
        .eq('id', packageId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Delete ticket package
 */
export const deleteTicketPackage = async (packageId) => {
    const { error } = await supabase
        .from('ticket_packages')
        .delete()
        .eq('id', packageId);

    if (error) throw error;
};
