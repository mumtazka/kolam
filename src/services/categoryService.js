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
 * Get all categories with their prices
 */
export const getCategoriesWithPrices = async () => {
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    if (catError) throw catError;

    const { data: prices, error: priceError } = await supabase
        .from('prices')
        .select('*');

    if (priceError) throw priceError;

    // Join categories with prices
    return categories.map(cat => ({
        ...cat,
        price: prices.find(p => p.category_id === cat.id)?.price || 0
    }));
};

/**
 * Get all prices
 */
export const getPrices = async () => {
    const { data, error } = await supabase
        .from('prices')
        .select('*');

    if (error) throw error;
    return data;
};

/**
 * Update price for a category
 */
export const updatePrice = async (categoryId, price, updatedBy) => {
    const { data: existing } = await supabase
        .from('prices')
        .select('id')
        .eq('category_id', categoryId)
        .single();

    if (existing) {
        const { data, error } = await supabase
            .from('prices')
            .update({ price, updated_by: updatedBy })
            .eq('category_id', categoryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('prices')
            .insert({ category_id: categoryId, price, updated_by: updatedBy })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

/**
 * Create a new category
 */
export const createCategory = async (categoryData) => {
    const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update a category
 */
export const updateCategory = async (categoryId, categoryData) => {
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
 * Delete a category
 */
export const deleteCategory = async (categoryId) => {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

    if (error) throw error;
};
