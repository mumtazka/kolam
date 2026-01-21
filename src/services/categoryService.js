import { supabase } from '../lib/supabase';

/**
 * Parse session metadata from description field
 * Returns null if description is not session metadata
 */
export const parseSessionMetadata = (description) => {
    if (!description || typeof description !== 'string') return null;

    try {
        const parsed = JSON.parse(description);
        if (parsed.type === 'session_ticket') {
            return parsed;
        }
    } catch (e) {
        // Not JSON or not session metadata
        return null;
    }
    return null;
};

/**
 * Create session metadata JSON string for description field
 */
export const createSessionMetadata = (sessionId, sessionData) => {
    const metadata = {
        type: 'session_ticket',
        session_id: sessionId,
        session_name: sessionData.name,
        session_time: `${sessionData.start_time} - ${sessionData.end_time}`,
        days: sessionData.days || [],
        is_recurring: sessionData.is_recurring || false,
        booking_date: sessionData.booking_date || null
    };
    return JSON.stringify(metadata);
};

/**
 * Check if a category is a session ticket and not expired
 */
export const isValidSessionTicket = (category) => {
    const metadata = parseSessionMetadata(category.description);
    if (!metadata) return true; // Not a session ticket, always valid

    // If it's a one-time session ticket, check if it's expired
    if (!metadata.is_recurring && metadata.booking_date) {
        const bookingDate = new Date(metadata.booking_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        bookingDate.setHours(0, 0, 0, 0);

        // Hide if booking date is in the past
        return bookingDate >= today;
    }

    // Recurring or no booking date - always valid
    return true;
};

/**
 * Get all categories (excluding soft-deleted ones)
 */
export const getCategories = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select(`
            *,
            sessions (
                id,
                name,
                start_time,
                start_time,
                end_time,
                days,
                is_recurring,
                valid_from,
                valid_until
            )
        `)
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;

    return data;
};

/**
 * Get only active categories (for receptionist)
 */
export const getActiveCategories = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select(`
            *,
            sessions (
                id,
                name,
                start_time,
                end_time,
                days,
                is_recurring,
                valid_from,
                valid_until
            )
        `)
        .is('deleted_at', null)
        .eq('active', true)
        .order('name');

    if (error) throw error;

    // Filter out expired one-time session tickets
    // Use local time for "today"
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localToday = new Date(today.getTime() - offset).toISOString().split('T')[0];

    return data.filter(category => {
        // If has booking_date and it's in the past, hide it
        if (category.booking_date && category.booking_date < localToday) {
            return false;
        }

        // Backward compatibility: also check description field
        return isValidSessionTicket(category);
    });
};

/**
 * Get all categories with their prices (now from same table)
 * @deprecated Use getCategories() instead - price is now in categories table
 */
export const getCategoriesWithPrices = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;
    return data;
};

/**
 * Get active categories with prices (for receptionist dashboard)
 */
export const getActiveCategoriesWithPrices = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .order('name');

    if (error) throw error;
    return data;
};

/**
 * Get a single category by ID
 */
export const getCategoryById = async (categoryId) => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

    if (error) throw error;
    return data;
};

/**
 * Check if a prefix is already in use
 * Only checks non-deleted categories
 */
export const isPrefixUnique = async (prefix, excludeId = null) => {
    let query = supabase
        .from('categories')
        .select('id')
        .eq('code_prefix', prefix.toUpperCase())
        .is('deleted_at', null);

    if (excludeId) {
        query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data.length === 0;
};

/**
 * Create a new category
 */
export const createCategory = async (categoryData) => {
    // Validate prefix uniqueness
    const isUnique = await isPrefixUnique(categoryData.code_prefix);
    if (!isUnique) {
        throw new Error(`Prefix "${categoryData.code_prefix}" is already in use`);
    }

    const { data, error } = await supabase
        .from('categories')
        .insert({
            name: categoryData.name,
            code_prefix: categoryData.code_prefix.toUpperCase(),
            requires_nim: categoryData.requires_nim || false,
            price: categoryData.price || 0,
            active: categoryData.active !== undefined ? categoryData.active : true,
            description: categoryData.description || null,
            session_id: categoryData.session_id || null,
            booking_date: categoryData.booking_date || null
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update a category
 */
export const updateCategory = async (categoryId, categoryData) => {
    // Validate prefix uniqueness if prefix is being changed
    if (categoryData.code_prefix) {
        const isUnique = await isPrefixUnique(categoryData.code_prefix, categoryId);
        if (!isUnique) {
            throw new Error(`Prefix "${categoryData.code_prefix}" is already in use`);
        }
        categoryData.code_prefix = categoryData.code_prefix.toUpperCase();
    }

    const { data, error } = await supabase
        .from('categories')
        .update({
            ...categoryData,
            // Ensure these fields can be updated if present in categoryData
            ...(categoryData.session_id !== undefined && { session_id: categoryData.session_id }),
            ...(categoryData.booking_date !== undefined && { booking_date: categoryData.booking_date })
        })
        .eq('id', categoryId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Toggle category active status
 */
export const toggleCategoryActive = async (categoryId, active) => {
    const { data, error } = await supabase
        .from('categories')
        .update({ active })
        .eq('id', categoryId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Soft Delete a category
 * Archives the category so it doesn't appear in lists but stays for reports.
 * Also archives associated tickets (optional, but good practice if tickets need to be hidden too)
 */
export const deleteCategory = async (categoryId) => {
    // Soft delete: Set active=false and deleted_at=NOW
    const { error } = await supabase
        .from('categories')
        .update({
            active: false,
            deleted_at: new Date().toISOString()
        })
        .eq('id', categoryId);

    if (error) throw error;
};

// ============================================
// DEPRECATED - Prices table functions
// Price is now stored directly in categories
// ============================================

/**
 * @deprecated Use getCategories() instead
 */
export const getPrices = async () => {
    console.warn('getPrices is deprecated. Use getCategories() - price is now in categories table');
    const { data, error } = await supabase
        .from('categories')
        .select('id, price');

    if (error) throw error;
    return data.map(cat => ({ category_id: cat.id, price: cat.price }));
};

/**
 * @deprecated Use updateCategory() instead
 */
export const updatePrice = async (categoryId, price, updatedBy) => {
    console.warn('updatePrice is deprecated. Use updateCategory() - price is now in categories table');
    const { data, error } = await supabase
        .from('categories')
        .update({ price })
        .eq('id', categoryId)
        .select()
        .single();

    if (error) throw error;
    return { category_id: categoryId, price: data.price };
};
