import { supabase } from '../lib/supabase';

/**
 * Get daily report
 * @param {string} date - Date in YYYY-MM-DD format
 */
export const getDailyReport = async (date) => {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

    if (error) throw error;

    // Aggregate data
    const ticketsSold = tickets.length;
    const ticketsScanned = tickets.filter(t => t.status === 'USED').length;
    const totalRevenue = tickets.reduce((sum, t) => sum + parseFloat(t.price), 0);

    // Group by category
    const byCategory = {};
    tickets.forEach(ticket => {
        if (!byCategory[ticket.category_name]) {
            byCategory[ticket.category_name] = { count: 0, revenue: 0 };
        }
        byCategory[ticket.category_name].count++;
        byCategory[ticket.category_name].revenue += parseFloat(ticket.price);
    });

    // Group by shift
    const byShift = {};
    tickets.forEach(ticket => {
        if (!byShift[ticket.shift]) {
            byShift[ticket.shift] = { count: 0, revenue: 0 };
        }
        byShift[ticket.shift].count++;
        byShift[ticket.shift].revenue += parseFloat(ticket.price);
    });

    // Group by staff
    const byStaff = {};
    tickets.forEach(ticket => {
        if (!byStaff[ticket.created_by_name]) {
            byStaff[ticket.created_by_name] = { count: 0, revenue: 0 };
        }
        byStaff[ticket.created_by_name].count++;
        byStaff[ticket.created_by_name].revenue += parseFloat(ticket.price);
    });

    return {
        date,
        tickets_sold: ticketsSold,
        tickets_scanned: ticketsScanned,
        total_revenue: totalRevenue,
        by_category: Object.entries(byCategory).map(([name, data]) => ({
            _id: name,
            count: data.count,
            revenue: data.revenue
        })),
        by_shift: Object.entries(byShift).map(([name, data]) => ({
            shift: name,
            count: data.count,
            revenue: data.revenue
        })),
        by_staff: Object.entries(byStaff).map(([name, data]) => ({
            staff_name: name,
            count: data.count,
            revenue: data.revenue
        }))
    };
};

/**
 * Get monthly report
 * @param {number} year 
 * @param {number} month - 1-12
 */
export const getMonthlyReport = async (year, month) => {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
    const lastDay = new Date(year, month, 0).getDate();
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59`;

    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

    if (error) throw error;

    // Aggregate data
    const ticketsSold = tickets.length;
    const ticketsScanned = tickets.filter(t => t.status === 'USED').length;
    const totalRevenue = tickets.reduce((sum, t) => sum + parseFloat(t.price), 0);

    // Group by category
    const byCategory = {};
    tickets.forEach(ticket => {
        if (!byCategory[ticket.category_name]) {
            byCategory[ticket.category_name] = { count: 0, revenue: 0, scanned: 0 };
        }
        byCategory[ticket.category_name].count++;
        byCategory[ticket.category_name].revenue += parseFloat(ticket.price);
        if (ticket.status === 'USED') {
            byCategory[ticket.category_name].scanned++;
        }
    });

    // Group by day for chart
    const byDay = {};
    tickets.forEach(ticket => {
        const day = ticket.created_at.split('T')[0];
        if (!byDay[day]) {
            byDay[day] = { count: 0, revenue: 0 };
        }
        byDay[day].count++;
        byDay[day].revenue += parseFloat(ticket.price);
    });

    return {
        year,
        month,
        tickets_sold: ticketsSold,
        tickets_scanned: ticketsScanned,
        total_revenue: totalRevenue,
        by_category: Object.entries(byCategory).map(([name, data]) => ({
            _id: name,
            count: data.count,
            revenue: data.revenue,
            scanned: data.scanned
        })),
        by_day: Object.entries(byDay).map(([date, data]) => ({
            date,
            count: data.count,
            revenue: data.revenue
        })).sort((a, b) => a.date.localeCompare(b.date))
    };
};

/**
 * Get batch report - list all batches
 */
export const getBatchReport = async (date) => {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

    if (error) throw error;

    // Group by batch
    const batches = {};
    tickets.forEach(ticket => {
        if (!batches[ticket.batch_id]) {
            batches[ticket.batch_id] = {
                batch_id: ticket.batch_id,
                created_at: ticket.created_at,
                created_by_name: ticket.created_by_name,
                shift: ticket.shift,
                tickets: [],
                total_tickets: 0,
                total_revenue: 0
            };
        }
        batches[ticket.batch_id].tickets.push(ticket);
        batches[ticket.batch_id].total_tickets++;
        batches[ticket.batch_id].total_revenue += parseFloat(ticket.price);
    });

    return Object.values(batches).sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );
};
