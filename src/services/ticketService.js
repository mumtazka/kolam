import { supabase } from '../lib/supabase';

/**
 * Generate a random alphanumeric string
 */
const generateRandomCode = (length = 4) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: I, O, 0, 1
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generate ticket code in format: [PREFIX]-[YYYYMMDD]-[BATCH]-[RANDOM]
 * Example: VIP-20260112-0042-A9K2
 */
const generateTicketCode = async (prefix, batchNumber) => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const batchStr = String(batchNumber).padStart(4, '0');
    const randomStr = generateRandomCode(4);

    return `${prefix}-${dateStr}-${batchStr}-${randomStr}`;
};

/**
 * Get the next batch number for today
 */
const getNextBatchNumber = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = `${today}T00:00:00`;
    const todayEnd = `${today}T23:59:59`;

    const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

    if (error) throw error;

    // Batch number = total tickets today + 1
    return (count || 0) + 1;
};

/**
 * Generate Code128 barcode image URL for a ticket
 * Using barcodeapi.org for server-side generation
 */
const generateBarcode = (ticketCode) => {
    // Code128 barcode - good for alphanumeric codes
    return `https://barcodeapi.org/api/128/${encodeURIComponent(ticketCode)}`;
};

/**
 * Create batch of tickets (using Backend RPC for security)
 * @param {Array} ticketItems - Array of { category_id, quantity, package_id, nims }
 * @param {Object} user - Current user object
 * @param {string} shift - Current shift (Pagi/Siang/Sore)
 */
export const createBatchTickets = async (ticketItems, user, shift) => {
<<<<<<< Updated upstream
    // Generate batch ID
    const batchId = crypto.randomUUID();

    // Get categories for prefix lookup
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*');

    if (catError) throw catError;

    // Get starting batch number
    let batchNumber = await getNextBatchNumber();

    // Create all tickets
    const ticketsToInsert = [];

    for (const item of ticketItems) {
        const category = categories.find(c => c.id === item.category_id);

        if (!category) {
            throw new Error(`Category not found: ${item.category_id}`);
        }

        for (let i = 0; i < item.quantity; i++) {
            const ticketId = crypto.randomUUID();
            const ticketCode = await generateTicketCode(category.code_prefix, batchNumber);

            ticketsToInsert.push({
                id: ticketId,
                ticket_code: ticketCode,
                batch_id: batchId,
                category_id: item.category_id,
                category_name: category.name,
                status: 'UNUSED',
                price: category.price,
                nim: (item.nims && item.nims[i]) ? item.nims[i] : null,
                qr_code: generateBarcode(ticketCode),
                created_by: user.id,
                created_by_name: user.name,
                shift: shift
            });

            batchNumber++;
        }
    }

=======
    // Call the RPC function to handle transaction securely on server
>>>>>>> Stashed changes
    const { data, error } = await supabase
        .rpc('process_ticket_transaction', {
            p_items: ticketItems,
            p_created_by: user.id,
            p_created_by_name: user.name,
            p_shift: shift
        });

    if (error) throw error;

    return {
        batch_id: data.batch_id,
        total_tickets: data.total_tickets,
        tickets: data.tickets
    };
};

/**
 * Scan and validate a ticket
 * @param {string} ticketIdentifier - Ticket UUID or ticket_code
 * @param {Object} scanner - Scanner user object
 * @param {string} shift - Current scanner shift
 */
export const scanTicket = async (ticketIdentifier, scanner, shift = 'Unknown', poolId = null) => {
    // Try to find ticket by ID first, then by ticket_code
    let ticket = null;
    let fetchError = null;

    // Check if it looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketIdentifier);

    if (isUUID) {
        const result = await supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketIdentifier)
            .single();
        ticket = result.data;
        fetchError = result.error;
    } else {
        // Try by ticket_code
        const result = await supabase
            .from('tickets')
            .select('*')
            .eq('ticket_code', ticketIdentifier.toUpperCase())
            .single();
        ticket = result.data;
        fetchError = result.error;
    }

    if (fetchError || !ticket) {
        return {
            success: false,
            status: 'INVALID',
            message: 'Ticket not found',
            ticket: null
        };
    }

    // --- SPECIAL TICKET LOGIC MAIN IMPLEMENTATION ---

    // 1. Determine Limits based on Prefix
    const isSpecial = ticket.ticket_code.toUpperCase().startsWith('K');
    const maxLimit = isSpecial ? 100 : 1;
    const currentUsage = ticket.usage_count || 0;

    // 2. Validate Usage
    if (ticket.status === 'USED' || currentUsage >= maxLimit) {
        return {
            success: false,
            status: 'USED',
            message: `Ticket limit reached (${currentUsage}/${maxLimit})`,
            ticket: ticket
        };
    }

    // 3. Calculate New State
    const newUsage = currentUsage + 1;
    const isExhausted = newUsage >= maxLimit;
    const newStatus = isExhausted ? 'USED' : 'UNUSED'; // Keep UNUSED if still has quota

    // 4. Update Database
    const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update({
            status: newStatus,
            usage_count: newUsage,
            scanned_at: new Date().toISOString(),
            scanned_by: scanner.id
        })
        .eq('id', ticket.id)
        .select()
        .single();

    if (updateError) throw updateError;

    // 5. Create Scan Log
    await supabase.from('scan_logs').insert({
        ticket_id: ticket.id,
        scanned_by: scanner.id,
        scanned_by_name: scanner.name,
        category_name: ticket.category_name,
        shift: shift,
        pool_id: poolId,
        quantity: 1, // Log as 1 scan event
        total_price: 0 // Price calculation handled if needed, for now 0 or unit price
    });

    return {
        success: true,
        status: 'VALID',
        message: isSpecial
            ? `Special Ticket Valid (${newUsage}/${maxLimit})`
            : 'Ticket Validated Successfully',
        ticket: updatedTicket
    };
};

/**
 * Get tickets by date
 */
export const getTicketsByDate = async (date) => {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

/**
 * Get tickets by batch ID
 */
export const getTicketsByBatch = async (batchId) => {
    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};
