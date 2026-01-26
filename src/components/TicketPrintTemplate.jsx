import React from 'react';
import { createPortal } from 'react-dom';
import QRCode from './ui/QRCode';

const TicketPrintTemplate = ({ ticket, copies = 1 }) => {
    return createPortal(
        <div className="print-container hidden print:block text-black">
            <style type="text/css" media="print">
                {`
           @page { 
             size: 80mm 120mm; 
             margin: 0; 
           }
           
           html, body { 
             width: 80mm !important; 
             height: 120mm !important;
             margin: 0 !important; 
             padding: 0 !important;
             overflow: hidden !important;
             font-family: 'Inter', sans-serif;
             background: white !important;
           }
           
           .print-container {
             position: absolute;
             top: 0;
             left: 0;
             width: 80mm !important;
             margin: 0 !important;
             padding: 0 !important;
             display: block !important;
             background: white !important;
             z-index: 99999 !important;
           }

           .printable-ticket { 
             width: 80mm !important;
             height: 120mm !important;
             max-height: 120mm !important;
             padding: 8px 5mm !important; 
             margin: 0 !important;
             box-sizing: border-box !important;
             border: none !important;
             display: flex !important;
             flex-direction: column;
             justify-content: flex-start;
             align-items: center;
             gap: 4px !important;
             overflow: hidden !important;
             page-break-after: always !important; 
             page-break-inside: avoid !important;
             break-after: page !important;
             break-inside: avoid !important;
             background: white !important;
             box-shadow: none !important;
           }

           .printable-ticket:last-child {
             page-break-after: auto !important;
             break-after: auto !important;
           }
           
           .printable-ticket * {
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
           }
         `}
            </style>

            {Array.from({ length: copies }).map((_, index) => (
                <div key={index} className="printable-ticket">
                    {/* Header - Venue Info */}
                    <div className="text-center w-full pb-1">
                        <h2 className="text-[11px] font-bold leading-tight text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>Kolam Renang</h2>
                        <h2 className="text-[11px] font-bold leading-tight text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>Vokasi UNY</h2>
                        <p className="text-[9px] text-gray-600 leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Jl Mandung, Pengasih, Kulon Progo</p>
                    </div>

                    {/* Receipt Label */}
                    <div className="text-center w-full py-1">
                        <p className="text-[10px] font-bold tracking-[0.3em] text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>R E C E I P T</p>
                    </div>

                    {/* Ticket Info */}
                    <div className="text-center w-full">
                        <p className="text-[10px] font-semibold text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>{ticket.ticket_code || ticket.id?.substring(0, 8)}</p>
                        <p className="text-[11px] font-bold uppercase text-black" style={{ fontFamily: 'Inter, sans-serif' }}>{ticket.category_name}</p>
                    </div>

                    {/* Price Calculation */}
                    <div className="w-full px-2 py-1">
                        <div className="flex justify-between items-center text-[9px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            <span className="text-gray-600">Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')} x 1</span>
                            <span className="text-gray-800 font-medium">Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="text-center w-full py-1">
                        <p className="text-[12px] font-bold text-black" style={{ fontFamily: 'Inter, sans-serif' }}>Total: Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')}</p>
                    </div>

                    {/* Tax Note */}
                    <div className="text-center w-full">
                        <p className="text-[9px] text-teal-700 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Termasuk Pajak Hiburan 10%</p>
                    </div>

                    {/* QR Code */}
                    <div className="tick-qr flex justify-center w-full py-2">
                        <QRCode
                            value={ticket.ticket_code || ticket.id}
                            size={90}
                        />
                    </div>

                    {/* NIM if present */}
                    {ticket.nim && (
                        <div className="text-center w-full">
                            <p className="text-[9px] text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>NIM: <span className="font-bold text-black">{ticket.nim}</span></p>
                        </div>
                    )}

                    {/* Validity Note */}
                    <div className="text-center w-full py-1">
                        <p className="font-bold text-[8px] leading-tight text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {ticket.max_usage && ticket.max_usage > 1
                                ? `TIKET BERLAKU ${ticket.max_usage} KALI`
                                : 'TIKET HANYA BERLAKU 1 KALI'}
                        </p>
                    </div>

                    {/* Footer - Contact Info */}
                    <div className="text-center w-full pt-1 mt-auto border-t border-gray-300">
                        <p className="text-[9px] font-semibold text-gray-700" style={{ fontFamily: 'Inter, sans-serif' }}>Pramudianndaru</p>
                        <p className="text-[8px] text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>kolamrenangwates@uny.ac.id</p>
                        <p className="text-[8px] text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>IG: @kolamrenang_vokasiunywates</p>
                        <p className="text-[8px] text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>0852-2562-0011</p>
                    </div>

                    {/* Timestamp */}
                    <div className="text-center w-full pt-1">
                        <p className="text-[8px] text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {new Date(ticket.created_at).toLocaleString('id-ID', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            }).replace(/\./g, ':')}
                        </p>
                    </div>
                </div>
            ))}
        </div>,
        document.body
    );
};

export default TicketPrintTemplate;
