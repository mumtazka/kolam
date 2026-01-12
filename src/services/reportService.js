import { supabase } from '../lib/supabase';

/**
 * Get daily report
 * Revenue is calculated from SCANNED tickets only (status = USED)
 * @param {string} date - Date in YYYY-MM-DD format
 */
export const getDailyReport = async (date) => {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    // Get printed tickets (by created_at)
    const { data: printedTickets, error: printedError } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

    if (printedError) throw printedError;

    // Get scanned tickets (by scanned_at) for revenue
    const { data: scannedTickets, error: scannedError } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'USED')
        .gte('scanned_at', startOfDay)
        .lte('scanned_at', endOfDay);

    if (scannedError) throw scannedError;

    // Aggregate printed data
    const ticketsPrinted = printedTickets.length;
    const ticketsUnused = printedTickets.filter(t => t.status === 'UNUSED').length;

    // Revenue from ALL printed tickets (Sales)
    const ticketsScanned = scannedTickets.length;
    const totalRevenue = printedTickets.reduce((sum, t) => sum + parseFloat(t.price), 0);

    // Group sales by category (for revenue) - using printedTickets
    const byCategory = {};
    printedTickets.forEach(ticket => {
        if (!byCategory[ticket.category_name]) {
            byCategory[ticket.category_name] = { count: 0, revenue: 0 };
        }
        byCategory[ticket.category_name].count++;
        byCategory[ticket.category_name].revenue += parseFloat(ticket.price);
    });

    // Get scan logs for attendance attribution
    const { data: scanLogs, error: logError } = await supabase
        .from('scan_logs')
        .select('*')
        .gte('scanned_at', startOfDay)
        .lte('scanned_at', endOfDay);

    if (logError) throw logError;

    // Group sales by shift (from printed tickets)
    const byShift = {};
    printedTickets.forEach(ticket => {
        const shift = ticket.shift || 'Unknown';
        if (!byShift[shift]) {
            byShift[shift] = { count: 0, revenue: 0 };
        }
        byShift[shift].count++;
        byShift[shift].revenue += parseFloat(ticket.price);
    });

    // Group attendance by staff (who scanned)
    // Note: Revenue is NOT attributed here since scanning doesn't generate revenue anymore
    const byStaff = {};
    scanLogs.forEach(log => {
        if (!byStaff[log.scanned_by_name]) {
            byStaff[log.scanned_by_name] = { count: 0, revenue: 0 };
        }
        byStaff[log.scanned_by_name].count++;
        // Revenue is 0 here because scanning is just attendance
    });

    return {
        date,
        tickets: printedTickets, // Include raw ticket data for history table
        tickets_printed: ticketsPrinted,
        tickets_scanned: ticketsScanned,
        tickets_unused: ticketsUnused,
        total_revenue: totalRevenue, // From SALES (printed)
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
 * Revenue is calculated from SALES (printed tickets)
 * @param {number} year 
 * @param {number} month - 1-12
 */
export const getMonthlyReport = async (year, month) => {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
    const lastDay = new Date(year, month, 0).getDate();
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59`;

    // Get printed tickets (Sales)
    const { data: printedTickets, error: printedError } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

    if (printedError) throw printedError;

    // Get scanned tickets for attendance stats
    const { data: scannedTickets, error: scannedError } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'USED')
        .gte('scanned_at', startOfMonth)
        .lte('scanned_at', endOfMonth);

    if (scannedError) throw scannedError;

    // Aggregate data
    const ticketsPrinted = printedTickets.length;
    const ticketsScanned = scannedTickets.length;
    const ticketsUnused = printedTickets.filter(t => t.status === 'UNUSED').length;

    // Revenue from SALES
    const totalRevenue = printedTickets.reduce((sum, t) => sum + parseFloat(t.price), 0);

    // Group sales by category
    const byCategory = {};
    printedTickets.forEach(ticket => {
        if (!byCategory[ticket.category_name]) {
            byCategory[ticket.category_name] = { count: 0, revenue: 0 };
        }
        byCategory[ticket.category_name].count++;
        byCategory[ticket.category_name].revenue += parseFloat(ticket.price);
    });

    // Group sales by day
    const byDay = {};
    printedTickets.forEach(ticket => {
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
        tickets: printedTickets, // Include raw ticket data for history table
        tickets_printed: ticketsPrinted,
        tickets_scanned: ticketsScanned,
        tickets_unused: ticketsUnused,
        total_revenue: totalRevenue,
        by_category: Object.entries(byCategory).map(([name, data]) => ({
            _id: name,
            count: data.count,
            revenue: data.revenue
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
 * Shows printed vs scanned status for audit
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
                scanned_tickets: 0,
                unused_tickets: 0,
                printed_value: 0,      // Total value of printed tickets
                realized_revenue: 0    // Revenue from scanned only
            };
        }
        batches[ticket.batch_id].tickets.push(ticket);
        batches[ticket.batch_id].total_tickets++;
        batches[ticket.batch_id].printed_value += parseFloat(ticket.price);

        if (ticket.status === 'USED') {
            batches[ticket.batch_id].scanned_tickets++;
            batches[ticket.batch_id].realized_revenue += parseFloat(ticket.price);
        } else {
            batches[ticket.batch_id].unused_tickets++;
        }
    });

    return Object.values(batches).sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );
};
