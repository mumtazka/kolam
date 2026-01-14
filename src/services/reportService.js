import { supabase } from '../lib/supabase';

/**
 * Helper function to fetch all records with pagination
 * Supabase has a default limit of 1000 records per query
 * This function fetches all records by paginating through results
 */
const fetchAllRecords = async (query, pageSize = 1000) => {
    let allRecords = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await query.range(from, from + pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allRecords = [...allRecords, ...data];
            from += pageSize;
            hasMore = data.length === pageSize;
        } else {
            hasMore = false;
        }
    }

    return allRecords;
};

/**
 * Get daily report
 * Revenue is calculated from PRINTED tickets (sales)
 * @param {string} date - Date in YYYY-MM-DD format
 */
export const getDailyReport = async (date) => {
    try {
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        // Get printed tickets (by created_at) - with pagination for large datasets
        const printedQuery = supabase
            .from('tickets')
            .select('*')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        const printedTickets = await fetchAllRecords(printedQuery);

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

        // Get scanned tickets (by scanned_at) for attendance stats - with pagination
        const scannedQuery = supabase
            .from('tickets')
            .select('*')
            .eq('status', 'USED')
            .gte('scanned_at', startOfDay)
            .lte('scanned_at', endOfDay);

        const scannedTickets = await fetchAllRecords(scannedQuery);

        // Aggregate printed data
        const ticketsPrinted = printedTickets.reduce((sum, t) => {
            const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
            return sum + multiplier;
        }, 0);
        const ticketsUnused = printedTickets.filter(t => t.status === 'UNUSED' && (t.usage_count || 0) === 0).length;
        // For scanned count: sum usage_count from all printed tickets (handles package tickets with multiple scans)
        const ticketsScanned = printedTickets.reduce((sum, t) => sum + (t.usage_count || 0), 0);

        // Revenue from ALL printed tickets (Sales)
        // For package tickets, total = price * max_usage (one ticket covers multiple people)
        const totalRevenue = printedTickets.reduce((sum, t) => {
            const price = parseFloat(t.price || 0);
            const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
            return sum + (isNaN(price) ? 0 : price * multiplier);
        }, 0);

        // Group sales by category (for revenue) - using printedTickets
        const byCategory = {};
        printedTickets.forEach(ticket => {
            const categoryName = ticket.category_name || 'Unknown';
            if (!byCategory[categoryName]) {
                byCategory[categoryName] = { count: 0, revenue: 0 };
            }
            // For package tickets, count the max_usage as quantity sold
            const multiplier = ticket.max_usage && ticket.max_usage > 1 ? ticket.max_usage : 1;
            byCategory[categoryName].count += multiplier;
            const price = parseFloat(ticket.price || 0);
            byCategory[categoryName].revenue += isNaN(price) ? 0 : price * multiplier;
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
        // Pad month to 2 digits
        const monthStr = String(month).padStart(2, '0');
        // Calculate last day of month
        const lastDay = new Date(year, month, 0).getDate();

        const startOfMonth = `${year}-${monthStr}-01T00:00:00`;
        const endOfMonth = `${year}-${monthStr}-${lastDay}T23:59:59`;

        // Get printed tickets (Sales) - with pagination for large datasets
        const printedQuery = supabase
            .from('tickets')
            .select('*')
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth);

        const printedTickets = await fetchAllRecords(printedQuery);

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

        // Get scanned tickets (by scanned_at) for attendance stats - with pagination
        const scannedQuery = supabase
            .from('tickets')
            .select('*')
            .eq('status', 'USED')
            .gte('scanned_at', startOfMonth)
            .lte('scanned_at', endOfMonth);

        const scannedTickets = await fetchAllRecords(scannedQuery);

        // Aggregate data
        const ticketsPrinted = printedTickets.reduce((sum, t) => {
            const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
            return sum + multiplier;
        }, 0);
        const ticketsUnused = printedTickets.filter(t => t.status === 'UNUSED' && (t.usage_count || 0) === 0).length;
        // For scanned count: sum usage_count from all printed tickets
        const ticketsScanned = printedTickets.reduce((sum, t) => sum + (t.usage_count || 0), 0);

        // Revenue from ALL printed tickets (Sales)
        // For package tickets, total = price * max_usage
        const totalRevenue = printedTickets.reduce((sum, t) => {
            const price = parseFloat(t.price || 0);
            const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
            return sum + (isNaN(price) ? 0 : price * multiplier);
        }, 0);

        // Group sales by category
        const byCategory = {};
        printedTickets.forEach(ticket => {
            const categoryName = ticket.category_name || 'Unknown';
            if (!byCategory[categoryName]) {
                byCategory[categoryName] = { count: 0, revenue: 0 };
            }
            const multiplier = ticket.max_usage && ticket.max_usage > 1 ? ticket.max_usage : 1;
            byCategory[categoryName].count += multiplier;
            const price = parseFloat(ticket.price || 0);
            byCategory[categoryName].revenue += isNaN(price) ? 0 : price * multiplier;
        });

        // Group sales by day
        const byDay = {};
        printedTickets.forEach(ticket => {
            const day = ticket.created_at.substring(0, 10); // YYYY-MM-DD
            if (!byDay[day]) {
                byDay[day] = { count: 0, revenue: 0 };
            }
            byDay[day].count++;
            const price = parseFloat(ticket.price || 0);
            byDay[day].revenue += isNaN(price) ? 0 : price;
        });

        // Group sales by staff
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
            })).sort((a, b) => b.count - a.count),
            by_day: Object.entries(byDay).map(([day, data]) => ({
                day,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => a.day.localeCompare(b.day)),
            by_staff: Object.entries(byStaff).map(([name, data]) => ({
                staff_name: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.revenue - a.revenue)
        };
    } catch (error) {
        console.error('Error in getMonthlyReport:', error);
        throw error;
    }
};

/**
 * Get yearly report
 * Revenue is calculated from SALES (printed tickets)
 * @param {number} year 
 */
export const getYearlyReport = async (year) => {
    try {
        const startOfYear = `${year}-01-01T00:00:00`;
        const endOfYear = `${year}-12-31T23:59:59`;

        // Get printed tickets (Sales) - using existing logic
        const printedQuery = supabase
            .from('tickets')
            .select('*')
            .gte('created_at', startOfYear)
            .lte('created_at', endOfYear);

        const printedTickets = await fetchAllRecords(printedQuery);

        if (!printedTickets || printedTickets.length === 0) {
            return {
                year,
                tickets: [],
                tickets_sold: 0,
                tickets_scanned: 0,
                tickets_unused: 0,
                total_revenue: 0,
                by_category: [],
                by_month: [], // Changed from by_day to by_month
                by_staff: []
            };
        }

        // Get scanned tickets
        const scannedQuery = supabase
            .from('tickets')
            .select('*')
            .eq('status', 'USED')
            .gte('scanned_at', startOfYear)
            .lte('scanned_at', endOfYear);

        const scannedTickets = await fetchAllRecords(scannedQuery);

        // Aggregate data
        const ticketsPrinted = printedTickets.reduce((sum, t) => {
            const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
            return sum + multiplier;
        }, 0);
        const ticketsUnused = printedTickets.filter(t => t.status === 'UNUSED' && (t.usage_count || 0) === 0).length;
        // For scanned count: sum usage_count from all printed tickets
        const ticketsScanned = printedTickets.reduce((sum, t) => sum + (t.usage_count || 0), 0);

        // Revenue
        const totalRevenue = printedTickets.reduce((sum, t) => {
            const price = parseFloat(t.price || 0);
            const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
            return sum + (isNaN(price) ? 0 : price * multiplier);
        }, 0);

        // Group by Category
        const byCategory = {};
        printedTickets.forEach(ticket => {
            const categoryName = ticket.category_name || 'Unknown';
            if (!byCategory[categoryName]) {
                byCategory[categoryName] = { count: 0, revenue: 0 };
            }
            const multiplier = ticket.max_usage && ticket.max_usage > 1 ? ticket.max_usage : 1;
            byCategory[categoryName].count += multiplier;
            const price = parseFloat(ticket.price || 0);
            byCategory[categoryName].revenue += isNaN(price) ? 0 : price * multiplier;
        });

        // Group by Month (unique to yearly report)
        const byMonth = {};
        printedTickets.forEach(ticket => {
            // Extract YYYY-MM
            const month = ticket.created_at.substring(0, 7);
            if (!byMonth[month]) {
                byMonth[month] = { count: 0, revenue: 0 };
            }
            byMonth[month].count++;
            const price = parseFloat(ticket.price || 0);
            byMonth[month].revenue += isNaN(price) ? 0 : price;
        });

        // Group by Staff
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
            tickets: printedTickets,
            tickets_sold: ticketsPrinted,
            tickets_scanned: ticketsScanned,
            tickets_unused: ticketsUnused,
            total_revenue: totalRevenue,
            by_category: Object.entries(byCategory).map(([name, data]) => ({
                _id: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.count - a.count),
            by_month: Object.entries(byMonth).map(([month, data]) => ({
                month,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => a.month.localeCompare(b.month)),
            by_staff: Object.entries(byStaff).map(([name, data]) => ({
                staff_name: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.revenue - a.revenue)
        };
    } catch (error) {
        console.error('Error in getYearlyReport:', error);
        throw error;
    }
};

/**
 * Get Lifetime report (All Time)
 */
export const getLifetimeReport = async () => {
    try {
        // Fetch ALL printed tickets
        const printedQuery = supabase
            .from('tickets')
            .select('*');

        const printedTickets = await fetchAllRecords(printedQuery);

        if (!printedTickets || printedTickets.length === 0) {
            return {
                tickets: [],
                tickets_sold: 0,
                tickets_scanned: 0,
                tickets_unused: 0,
                total_revenue: 0,
                by_category: [],
                by_year: [],
                by_staff: []
            };
        }

        // Fetch ALL scanned tickets
        const scannedQuery = supabase
            .from('tickets')
            .select('*')
            .eq('status', 'USED');

        const scannedTickets = await fetchAllRecords(scannedQuery);

        // Aggregate
        const ticketsPrinted = printedTickets.reduce((sum, t) => {
            const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
            return sum + multiplier;
        }, 0);
        const ticketsUnused = printedTickets.filter(t => t.status === 'UNUSED' && (t.usage_count || 0) === 0).length;
        // For scanned count: sum usage_count from all printed tickets
        const ticketsScanned = printedTickets.reduce((sum, t) => sum + (t.usage_count || 0), 0);

        const totalRevenue = printedTickets.reduce((sum, t) => {
            const price = parseFloat(t.price || 0);
            const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
            return sum + (isNaN(price) ? 0 : price * multiplier);
        }, 0);

        // Group by Category
        const byCategory = {};
        printedTickets.forEach(ticket => {
            const categoryName = ticket.category_name || 'Unknown';
            if (!byCategory[categoryName]) {
                byCategory[categoryName] = { count: 0, revenue: 0 };
            }
            const multiplier = ticket.max_usage && ticket.max_usage > 1 ? ticket.max_usage : 1;
            byCategory[categoryName].count += multiplier;
            const price = parseFloat(ticket.price || 0);
            byCategory[categoryName].revenue += isNaN(price) ? 0 : price * multiplier;
        });

        // Group by Year
        const byYear = {};
        printedTickets.forEach(ticket => {
            const year = ticket.created_at.substring(0, 4);
            if (!byYear[year]) {
                byYear[year] = { count: 0, revenue: 0 };
            }
            byYear[year].count++;
            const price = parseFloat(ticket.price || 0);
            byYear[year].revenue += isNaN(price) ? 0 : price;
        });

        // Group by Staff
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
            tickets: printedTickets,
            tickets_sold: ticketsPrinted,
            tickets_scanned: ticketsScanned,
            tickets_unused: ticketsUnused,
            total_revenue: totalRevenue,
            by_category: Object.entries(byCategory).map(([name, data]) => ({
                _id: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.count - a.count),
            by_year: Object.entries(byYear).map(([year, data]) => ({
                year,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => a.year.localeCompare(b.year)),
            by_staff: Object.entries(byStaff).map(([name, data]) => ({
                staff_name: name,
                count: data.count,
                revenue: data.revenue
            })).sort((a, b) => b.revenue - a.revenue)
        };
    } catch (error) {
        console.error('Error in getLifetimeReport:', error);
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

        // Use pagination for large datasets
        const ticketsQuery = supabase
            .from('tickets')
            .select('*')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        const tickets = await fetchAllRecords(ticketsQuery);

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

/**
 * Get total visits (all-time scan count from scan_logs)
 * This represents actual visitors who entered the pool
 */
export const getTotalVisits = async () => {
    try {
        const { count, error } = await supabase
            .from('scan_logs')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error in getTotalVisits:', error);
        throw error;
    }
};

/**
 * Get visits for last 7 days grouped by date
 * Returns array of { date, total_scan } for chart display
 */
export const getVisitsLast7Days = async () => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const startDate = sevenDaysAgo.toISOString();

        const { data, error } = await supabase
            .from('scan_logs')
            .select('scanned_at')
            .gte('scanned_at', startDate);

        if (error) throw error;

        // Group by date
        const byDate = {};
        (data || []).forEach(log => {
            const date = log.scanned_at.split('T')[0];
            byDate[date] = (byDate[date] || 0) + 1;
        });

        // Generate 7 days array with zero-fill for missing dates
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                total_scan: byDate[dateStr] || 0
            });
        }
        return result;
    } catch (error) {
        console.error('Error in getVisitsLast7Days:', error);
        throw error;
    }
};