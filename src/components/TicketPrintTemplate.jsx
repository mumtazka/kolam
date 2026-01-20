import React from 'react';
import { createPortal } from 'react-dom';
import QRCode from './ui/QRCode';

const TicketPrintTemplate = ({ ticket, copies = 1 }) => {
    return createPortal(
        <div className="print-container hidden print:block text-black">
            <style type="text/css" media="print">
                {`
           @page { 
             size: 80mm 80mm; 
             margin: 0; 
           }
           
           html, body { 
             width: 80mm !important; 
             height: 80mm !important;
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
             height: 80mm !important;
             max-height: 80mm !important;
             padding: 10px 6mm !important; 
             margin: 0 !important;
             box-sizing: border-box !important;
             border: none !important;
             display: flex !important;
             flex-direction: column;
             justify-content: flex-start;
             align-items: center;
             gap: 5px !important;
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
                    {/* Header */}
                    <div className="text-center w-full pb-2 border-b border-black border-dashed">
                        <h2 className="text-[16px] font-extrabold uppercase leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Kolam Renang UNY</h2>
                        <h3 className="text-[12px] font-bold uppercase leading-tight mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{ticket.category_name}</h3>
                    </div>

                    {/* QR Code */}
                    <div className="tick-qr flex justify-center w-full py-2">
                        <QRCode
                            value={ticket.ticket_code || ticket.id}
                            size={110}
                        />
                    </div>

                    {/* Ticket Details */}
                    <div className="w-full font-mono text-[10px] uppercase leading-relaxed px-1 space-y-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-slate-600">KODE</span>
                            <span className="font-bold text-black text-right">{ticket.ticket_code || ticket.id?.substring(0, 8)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-600">HARGA</span>
                            <span className="font-bold text-black text-right">Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')}</span>
                        </div>
                        {ticket.nim && (
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-600">NIM</span>
                                <span className="font-bold text-black text-right">{ticket.nim}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-600">TANGGAL</span>
                            <span className="font-bold text-black text-right">
                                {new Date(ticket.created_at).toLocaleString('id-ID', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                }).replace(/\./g, ':')}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-2 mt-auto w-full border-t border-black border-dashed">
                        <p className="font-bold text-[8px] leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>TIKET HANYA BERLAKU 1 KALI</p>
                        <p className="text-[8px] leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>TIKET YANG SUDAH DIBELI TIDAK DAPAT DIKEMBALIKAN</p>
                    </div>
                </div>
            ))}
        </div>,
        document.body
    );
};

export default TicketPrintTemplate;
