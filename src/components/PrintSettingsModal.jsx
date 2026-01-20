import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Minus, Plus, Printer, X } from 'lucide-react';
import { createPortal } from 'react-dom';

const PrintSettingsModal = ({ isOpen, onClose, onPrint, ticket }) => {
    const [copies, setCopies] = useState(1);

    // Reset copies when modal opens
    useEffect(() => {
        if (isOpen) {
            setCopies(1);
        }
    }, [isOpen]);

    const increment = () => setCopies(c => c + 1);
    const decrement = () => setCopies(c => Math.max(1, c - 1));

    if (!isOpen || !ticket) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-900">Pengaturan Cetak</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="text-center mb-6">
                        <p className="text-sm text-slate-500 mb-1">Tiket yang akan dicetak</p>
                        <div className="font-bold text-slate-900 text-lg">{ticket.category_name}</div>
                        <div className="font-mono text-teal-600 font-bold">{ticket.ticket_code || ticket.id?.substring(0, 8)}</div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 block text-center">Jumlah Salinan</label>
                        <div className="flex items-center justify-center gap-4">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600"
                                onClick={decrement}
                            >
                                <Minus className="w-5 h-5" />
                            </Button>
                            <div className="w-20">
                                <Input
                                    type="number"
                                    value={copies}
                                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="h-12 text-center text-xl font-bold border-slate-200 focus:ring-teal-500 rounded-xl"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600"
                                onClick={increment}
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-2">
                            Atur jumlah tiket fisik yang ingin dicetak
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <Button onClick={onClose} variant="outline" className="flex-1 bg-white hover:bg-slate-50">
                        Batal
                    </Button>
                    <Button onClick={() => onPrint(copies)} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
                        <Printer className="w-4 h-4 mr-2" />
                        Cetak Sekarang
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PrintSettingsModal;
