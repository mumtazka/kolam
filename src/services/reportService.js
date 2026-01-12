import { supabase } from '../lib/supabase';

/**
 * Get daily report
 * Revenue is calculated from PRINTED tickets (sales)
 * @param {string} date - Date in YYYY-MM-DD format
 */
export const getDailyReport = async (date) => {
    try {
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        // Get printed tickets (by created_at)
        const { data: printedTickets, error: printedError } = await supabase
            .from('tickets')
            .select('*')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        if (printedError) throw printedError;

        // Handle case when no tickets found
        if (!printedTickets || printedTickets.length === 0) {
            return {
                date,
                tickets: [],
                tickets_sold: 0,
                tickets_scanned: 0,
                tickets_unused: 0,
                total_revenue: 0,
                by_category: [],
                by_shift: [],
                by_staff: []
            };
        }

        // Get scanned tickets (by scanned_at) for attendance stats
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
        const ticketsScanned = scannedTickets ? scannedTickets.length : 0;

        // Revenue from ALL printed tickets (Sales)
        const totalRevenue = printedTickets.reduce((sum, t) => {
            const price = parseFloat(t.price || 0);
            return sum + (isNaN(price) ? 0 : price);
        }, 0);

        // Group sales by category (for revenue) - using printedTickets
        const byCategory = {};
        printedTickets.forEach(ticket => {
            const categoryName = ticket.category_name || 'Unknown';
            if (!byCategory[categoryName]) {
                byCategory[categoryName] = { count: 0, revenue: 0 };
            }
            byCategory[categoryName].count++;
            const price = parseFloat(ticket.price || 0);
            byCategory[categoryName].revenue += isNaN(price) ? 0 : price;
        });

        // Group sales by shift (from printed tickets)
        const byShift = {};
        printedTickets.forEach(ticket => {
            const shift = ticket.shift || 'Unknown';
            if (!byShift[shift]) {
                byShift[shift] = { count: 0, revenue: 0 };
            }
            byShift[shift].count++;
            const price = parseFloat(ticket.price || 0);
            byShift[shift].revenue += isNaN(price) ? 0 : price;
        });

        // Group sales by staff (who SOLD/printed the tickets)
        const byStaff = {};
        printedTickets.forEach(ticket => {
            const staffName = ticket.created_by_name || 'Unknown';
            if (!byStaff[staffName]) {
                byStaff[staffName] = { count: 0, revenue: 0 };
            }
            byStaff[staffName].count++;
            const price = parseFloat(ticket.price || 0);
            byStaff[staffName].revenue += isNaN(price) ? 0 : price;
        });

        return {
            date,
            tickets: printedTickets,
            tickets_sold: ticketsPrinted,
            tickets_scanned: ticketsScanned,
            tickets_unused: ticketsUnused,
            total_revenue: totalRevenue,
            by_category: Object.entries(byCategory).map(([name, data]) => ({
                _id: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.count - a.count), // Sort by count descending
            by_shift: Object.entries(byShift).map(([name, data]) => ({
                shift: name,
                count: data.count,
                revenue: data.revenue
            })),
            by_staff: Object.entries(byStaff).map(([name, data]) => ({
                staff_name: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending
        };
    } catch (error) {
        console.error('Error in getDailyReport:', error);
        throw error;
    }
};

/**
 * Get monthly report
 * Revenue is calculated from SALES (printed tickets)
 * @param {number} year 
 * @param {number} month - 1-12
 */
export const getMonthlyReport = async (year, month) => {
    try {
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

        // Handle case when no tickets found
        if (!printedTickets || printedTickets.length === 0) {
            return {
                year,
                month,
                tickets: [],
                tickets_sold: 0,
                tickets_scanned: 0,
                tickets_unused: 0,
                total_revenue: 0,
                by_category: [],
                by_day: [],
                by_staff: []
            };
        }

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
        const ticketsScanned = scannedTickets ? scannedTickets.length : 0;
        const ticketsUnused = printedTickets.filter(t => t.status === 'UNUSED').length;

        // Revenue from SALES
        const totalRevenue = printedTickets.reduce((sum, t) => {
            const price = parseFloat(t.price || 0);
            return sum + (isNaN(price) ? 0 : price);
        }, 0);

        // Group sales by category
        const byCategory = {};
        printedTickets.forEach(ticket => {
            const categoryName = ticket.category_name || 'Unknown';
            if (!byCategory[categoryName]) {
                byCategory[categoryName] = { count: 0, revenue: 0 };
            }
            byCategory[categoryName].count++;
            const price = parseFloat(ticket.price || 0);
            byCategory[categoryName].revenue += isNaN(price) ? 0 : price;
        });

        // Group sales by day
        const byDay = {};
        printedTickets.forEach(ticket => {
            const day = ticket.created_at.split('T')[0];
            if (!byDay[day]) {
                byDay[day] = { count: 0, revenue: 0 };
            }
            byDay[day].count++;
            const price = parseFloat(ticket.price || 0);
            byDay[day].revenue += isNaN(price) ? 0 : price;
        });

        // Group sales by staff (who SOLD/printed the tickets)
        const byStaff = {};
        printedTickets.forEach(ticket => {
            const staffName = ticket.created_by_name || 'Unknown';
            if (!byStaff[staffName]) {
                byStaff[staffName] = { count: 0, revenue: 0 };
            }
            byStaff[staffName].count++;
            const price = parseFloat(ticket.price || 0);
            byStaff[staffName].revenue += isNaN(price) ? 0 : price;
        });

        return {
            year,
            month,
            tickets: printedTickets,
            tickets_sold: ticketsPrinted,
            tickets_scanned: ticketsScanned,
            tickets_unused: ticketsUnused,
            total_revenue: totalRevenue,
            by_category: Object.entries(byCategory).map(([name, data]) => ({
                _id: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.count - a.count), // Sort by count descending
            by_day: Object.entries(byDay).map(([date, data]) => ({
                date,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => a.date.localeCompare(b.date)),
            by_staff: Object.entries(byStaff).map(([name, data]) => ({
                staff_name: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending
        };
    } catch (error) {
        console.error('Error in getMonthlyReport:', error);
        throw error;
    }
};

/**
 * Get batch report - list all batches
 * Shows printed vs scanned status for audit
 */
export const getBatchReport = async (date) => {
    try {
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        const { data: tickets, error } = await supabase
            .from('tickets')
            .select('*')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        if (error) throw error;

        // Handle empty tickets
        if (!tickets || tickets.length === 0) {
            return [];
        }

        // Group by batch
        const batches = {};
        tickets.forEach(ticket => {
            const batchId = ticket.batch_id || 'unknown';
            if (!batches[batchId]) {
                batches[batchId] = {
                    batch_id: batchId,
                    created_at: ticket.created_at,
                    created_by_name: ticket.created_by_name || 'Unknown',
                    shift: ticket.shift || 'Unknown',
                    tickets: [],
                    total_tickets: 0,
                    scanned_tickets: 0,
                    unused_tickets: 0,
                    printed_value: 0,
                    realized_revenue: 0
                };
            }
            batches[batchId].tickets.push(ticket);
            batches[batchId].total_tickets++;

            const price = parseFloat(ticket.price || 0);
            const validPrice = isNaN(price) ? 0 : price;
            batches[batchId].printed_value += validPrice;

            if (ticket.status === 'USED') {
                batches[batchId].scanned_tickets++;
                batches[batchId].realized_revenue += validPrice;
            } else {
                batches[batchId].unused_tickets++;
            }
        });

        return Object.values(batches).sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );
    } catch (error) {
        console.error('Error in getBatchReport:', error);
        throw error;
    }
};