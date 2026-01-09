import { supabase } from '../lib/supabase';

/**
 * Generate QR code data URL for a ticket
 */
const generateQRCode = async (ticketId) => {
    // Using a simple QR code API - in production you might want to use a library
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketId}`;
};

/**
 * Create batch of tickets
 * @param {Array} ticketItems - Array of { category_id, quantity, nim }
 * @param {Object} user - Current user object
 * @param {string} shift - Current shift (Pagi/Siang/Sore)
 */
export const createBatchTickets = async (ticketItems, user, shift) => {
    // Generate batch ID
    const batchId = crypto.randomUUID();

    // Get categories and prices
    const { data: categories } = await supabase.from('categories').select('*');
    const { data: prices } = await supabase.from('prices').select('*');

    // Create all tickets
    const ticketsToInsert = [];

    for (const item of ticketItems) {
        const category = categories.find(c => c.id === item.category_id);
        const price = prices.find(p => p.category_id === item.category_id)?.price || 0;

        for (let i = 0; i < item.quantity; i++) {
            const ticketId = crypto.randomUUID();
            ticketsToInsert.push({
                id: ticketId,
                batch_id: batchId,
                category_id: item.category_id,
                category_name: category?.name || 'Unknown',
                status: 'UNUSED',
                price: price,
                nim: item.nim || null,
                qr_code: await generateQRCode(ticketId),
                created_by: user.id,
                created_by_name: user.name,
                shift: shift
            });
        }
    }

    const { data, error } = await supabase
        .from('tickets')
        .insert(ticketsToInsert)
        .select();

    if (error) throw error;

    return {
        batch_id: batchId,
        total_tickets: data.length,
        tickets: data
    };
};

/**
 * Scan and validate a ticket
 * @param {string} ticketId - Ticket UUID
 * @param {Object} scanner - Scanner user object
 */
export const scanTicket = async (ticketId, scanner) => {
    // First, get the ticket
    const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

    if (fetchError || !ticket) {
        return {
            success: false,
            status: 'INVALID',
            message: 'Ticket not found',
            ticket: null
        };
    }

    // Check if already used
    if (ticket.status === 'USED') {
        return {
            success: false,
            status: 'USED',
            message: `Ticket already scanned at ${new Date(ticket.scanned_at).toLocaleString()}`,
            ticket: ticket
        };
    }

    // Mark as used
    const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update({
            status: 'USED',
            scanned_at: new Date().toISOString(),
            scanned_by: scanner.id
        })
        .eq('id', ticketId)
        .select()
        .single();

    if (updateError) throw updateError;

    // Create scan log
    await supabase.from('scan_logs').insert({
        ticket_id: ticketId,
        scanned_by: scanner.id,
        scanned_by_name: scanner.name,
        category_name: ticket.category_name
    });

    return {
        success: true,
        status: 'VALID',
        message: 'Ticket validated successfully!',
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
