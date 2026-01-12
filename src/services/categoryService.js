import { supabase } from '../lib/supabase';

/**
 * Get all categories
 */
export const getCategories = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
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
        .select('*')
        .eq('active', true)
        .order('name');

    if (error) throw error;
    return data;
};

/**
 * Get all categories with their prices (now from same table)
 * @deprecated Use getCategories() instead - price is now in categories table
 */
export const getCategoriesWithPrices = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
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
 */
export const isPrefixUnique = async (prefix, excludeId = null) => {
    let query = supabase
        .from('categories')
        .select('id')
        .eq('code_prefix', prefix.toUpperCase());

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
            description: categoryData.description || null
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
        .update(categoryData)
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
 * Delete a category (use with caution - may affect existing tickets)
 */
export const deleteCategory = async (categoryId) => {
    const { error } = await supabase
        .from('categories')
        .delete()
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
