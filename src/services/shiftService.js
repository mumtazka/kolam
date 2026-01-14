import { supabase } from '../lib/supabase';

// Get the active shift for today
export const getActiveShift = async () => {
    const today = new Date().toISOString().split('T')[0];

    // We get the latest entry for today
    const { data, error } = await supabase
        .from('position_shifts')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching active shift:', error);
        return null;
    }

    // Default to MORNING if no record exists for today
    if (!data || data.length === 0) {
        return { shift_label: 'MORNING', date: today };
    }

    return data[0];
};

// Set the active shift for today (INSERT - log-based, latest entry wins)
export const setActiveShift = async (shiftLabel, userId) => {
    const today = new Date().toISOString().split('T')[0];

    // Log-based approach: Insert new record, latest entry for date is the truth
    const { data, error } = await supabase
        .from('position_shifts')
        .insert({
            shift_label: shiftLabel,
            date: today,
            changed_by: userId,
            changed_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Get all staff assignments for a specific DAY OF WEEK (e.g. 'Monday')
export const getStaffSchedules = async (dayOfWeek) => {
    // 1. Get all users
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('is_active', true)
        .order('name');

    if (usersError) throw usersError;

    // 2. Get existing schedules for this Day of Week
    const { data: schedules, error: schedulesError } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('day_of_week', dayOfWeek);

    if (schedulesError) throw schedulesError;

    // 3. Merge data
    const combinedData = users.map(user => {
        const userSchedule = schedules.find(s => s.user_id === user.id);

        return {
            user_id: user.id,
            name: user.name,
            email: user.email,
            default_role: user.role,
            morning_role: userSchedule ? userSchedule.morning_role : 'OFF',
            afternoon_role: userSchedule ? userSchedule.afternoon_role : 'OFF'
        };
    });

    return combinedData;
};

// Update a specific staff role for a recurring day
export const updateWeeklySchedule = async (userId, dayOfWeek, morningRole, afternoonRole) => {

    // We need to fetch existing to know if we are updating, or just upsert blindly?
    // UPSERT is safer.
    // BUT we are updating morning and afternoon separately in UI? 
    // The UI might pass both.
    // Let's assume the UI sends the full state for that day row.

    // If we only receive one role, we need to fetch the other? 
    // Better to have the UI pass the current known state.

    const { data, error } = await supabase
        .from('weekly_schedules')
        .upsert({
            user_id: userId,
            day_of_week: dayOfWeek,
            morning_role: morningRole,
            afternoon_role: afternoonRole
        }, {
            onConflict: 'user_id, day_of_week'
        })
        .select();

    if (error) throw error;
    return data;
};
// Get full weekly schedule for a specific user
export const getUserSchedule = async (userId) => {
    const { data, error } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('user_id', userId);

    if (error) throw error;
    return data || [];
};

// Update full weekly schedule for a user (Batch)
export const updateUserFullSchedule = async (userId, scheduleArray) => {
    const upsertData = scheduleArray.map(item => ({
        user_id: userId,
        day_of_week: item.day_of_week,
        morning_role: item.morning_role,
        afternoon_role: item.afternoon_role
    }));

    const { data, error } = await supabase
        .from('weekly_schedules')
        .upsert(upsertData, { onConflict: 'user_id, day_of_week' })
        .select();

    if (error) throw error;
    return data;
};
