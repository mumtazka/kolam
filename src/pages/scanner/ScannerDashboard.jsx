import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { scanTicket } from '../../services/ticketService';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { LogOut, Scan, CheckCircle, XCircle, AlertTriangle, User, Calendar, Tag, Clock, History, Keyboard, ChevronDown, Monitor } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { toast } from 'sonner';

const ScannerDashboard = () => {
    const navigate = useNavigate();
    const { user, logout, switchMode } = useAuth();
    const { t } = useLanguage();

    // Use shift label from user context (set at login based on active shift)
    const getShiftLabel = () => {
        // Use the shift_label from AuthContext (MORNING/AFTERNOON)
        // Fall back to legacy label if not available
        if (user?.shift_label) {
            return user.shift_label === 'MORNING' ? 'Pagi' : 'Siang';
        }
        // Legacy fallback based on time
        const hour = new Date().getHours();
        if (hour < 12) return 'Pagi';
        return 'Siang';
    };

    // State
    const [selectedShift, setSelectedShift] = useState(getShiftLabel());
    const [selectedLocation] = useState(t('scanner.scannerStation'));

    // Scan State
    const [scanStatus, setScanStatus] = useState('IDLE');
    const [scanResult, setScanResult] = useState(null);
    const [lastScannedCode, setLastScannedCode] = useState('');

    // Manual Input State
    const [manualCode, setManualCode] = useState('');

    // History State
    const [scanHistory, setScanHistory] = useState([]);

    // Buffer for barcode input
    const barcodeBuffer = useRef('');
    const lastKeyTime = useRef(Date.now());
    const scanTimeout = useRef(null);


    // Note: Shift is now set at login from global active shift, no need for periodic updates


    // Play sound helper
    const playSound = (type) => {
        try {
            const audio = new Audio(type === 'success' ? '/success.mp3' : '/error.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });
        } catch (e) {
            // Ignore audio errors
        }
    };

    // Add to history helper
    const addToHistory = (result, code) => {
        const newEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            code,
            status: result.status || (result.success ? 'VALID' : 'INVALID'),
            message: result.message,
            ticket: result.ticket
        };
        setScanHistory(prev => [newEntry, ...prev].slice(0, 50));
    };

    // Handle barcode processing
    const processBarcode = async (code) => {
        if (!code || code.length < 3) return;
        if (scanStatus === 'PROCESSING') return;

        setScanStatus('PROCESSING');
        setLastScannedCode(code);
        setManualCode(''); // Clear manual input

        try {
            const cleanCode = code.trim();
            const result = await scanTicket(cleanCode, user, selectedShift);

            setScanResult(result);
            addToHistory(result, cleanCode);

            if (result.success) {
                setScanStatus('VALID');
                playSound('success');
                toast.success(t('scanner.valid'));
            } else if (result.status === 'USED') {
                setScanStatus('USED');
                playSound('error');
                toast.warning(t('scanner.used') || 'Tiket Sudah Digunakan');
            } else {
                setScanStatus('INVALID');
                playSound('error');
                toast.error(result.message || t('scanner.invalid'));
            }

        } catch (error) {
            console.error('Scan error:', error);
            setScanStatus('ERROR');
            const errorResult = { success: false, status: 'ERROR', message: 'System Error: ' + error.message };
            setScanResult(errorResult);
            addToHistory(errorResult, code);
            playSound('error');
            toast.error(t('scanner.systemError'));
        }

        // Reset to IDLE after delay
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        scanTimeout.current = setTimeout(() => {
            setScanStatus('IDLE');
        }, 3000);
    };

    // Manual Submit
    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualCode) {
            processBarcode(manualCode);
        }
    };

    // Keyboard listener for Scanner Hardware
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check timing to differentiate fast scan from manual typing
            const currentTime = Date.now();
            if (currentTime - lastKeyTime.current > 100) {
                // If slow, reset buffer (likely start of new input or manual typing)
                barcodeBuffer.current = '';
            }
            lastKeyTime.current = currentTime;

            if (e.key === 'Enter') {
                // Only trigger if we have a valid buffer (burst input)
                // We check for length >= 2 to avoid triggering on single accidental fast keys
                if (barcodeBuffer.current && barcodeBuffer.current.length >= 2) {
                    e.preventDefault(); // Prevent form submission / duplicate handling

                    // If the scanner typed into the input, we might want to ensure we don't double process
                    // But typically processBarcode clears the manual input anyway

                    processBarcode(barcodeBuffer.current);
                    barcodeBuffer.current = '';
                }
            } else if (e.key.length === 1) {
                // Accumulate characters
                barcodeBuffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [user, selectedShift, scanStatus]);

    // --- MAIN SCANNER INTERFACE (Admin Style) ---
    // Background logic to give visual feedback but keep it cleaner
    const getMainBg = () => {
        switch (scanStatus) {
            case 'VALID': return 'bg-emerald-50';
            case 'USED': return 'bg-amber-50';
            case 'INVALID': return 'bg-rose-50';
            case 'ERROR': return 'bg-rose-50';
            default: return 'bg-slate-50';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden font-['Outfit']">
            {/* Header matches Admin Layout style */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <Scan className="w-6 h-6 mr-2 text-sky-600" />
                        <span className="font-bold text-xl text-slate-900 tracking-tight">WebKolam Scanner</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                        <span className="flex items-center bg-slate-100 px-3 py-1 rounded-full"><Calendar className="w-4 h-4 mr-1.5 text-slate-500" /> {selectedShift}</span>
                        <span className="flex items-center bg-slate-100 px-3 py-1 rounded-full"><Tag className="w-4 h-4 mr-1.5 text-slate-500" /> {selectedLocation}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex items-center space-x-2 hover:bg-slate-50">
                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-600" />
                                </div>
                                <span className="text-slate-700 font-medium">{user?.name}</span>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{t('auth.modeScanner')}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={async () => {
                                    try {
                                        await switchMode('CASHIER');
                                        navigate('/receptionist');
                                    } catch (e) {
                                        toast.error(e.message);
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                <Monitor className="w-4 h-4 mr-2" />
                                <span>{t('auth.switchMode')}: {t('auth.modeCashier')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { logout(); navigate('/login'); }} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                                <LogOut className="w-4 h-4 mr-2" />
                                <span>{t('common.logout')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Main Scanner Area */}
                <main className={`flex-1 transition-colors duration-300 ease-out flex flex-col items-center justify-center p-8 ${getMainBg()}`}>

                    <div className="w-full max-w-2xl mx-auto space-y-8">

                        {/* Status Display */}
                        <div className="text-center">
                            {scanStatus === 'IDLE' && (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                                        <Scan className="w-16 h-16 text-slate-400" />
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-bold text-slate-900 mb-2">{t('scanner.ready')}</h1>
                                        <p className="text-lg text-slate-500">{t('scanner.pointScanner')}</p>
                                    </div>
                                </div>
                            )}

                            {scanStatus === 'PROCESSING' && (
                                <div className="space-y-6">
                                    <div className="w-24 h-24 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin mx-auto"></div>
                                    <h2 className="text-2xl font-bold text-slate-700">{t('scanner.processing')}</h2>
                                </div>
                            )}

                            {scanStatus === 'VALID' && (
                                <div className="space-y-6 animate-in zoom-in-95">
                                    <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-md">
                                        <CheckCircle className="w-16 h-16 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-5xl font-bold text-emerald-600 mb-2">{t('scanner.valid')}</h1>
                                        <p className="text-xl text-emerald-800">{t('scanner.accessGranted')}</p>
                                    </div>
                                    <Card className="bg-white/80 backdrop-blur border-emerald-200 shadow-lg text-left">
                                        <CardContent className="p-6 grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-slate-500 text-sm font-medium uppercase">{t('scanner.category')}</p>
                                                <p className="text-2xl font-bold text-slate-900">{scanResult?.ticket?.category_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-sm font-medium uppercase">{t('common.code')}</p>
                                                <p className="text-lg font-mono text-slate-700">{scanResult?.ticket?.ticket_code}</p>
                                            </div>
                                            {scanResult?.ticket?.nim && (
                                                <div className="col-span-2 pt-4 border-t border-slate-100">
                                                    <p className="text-slate-500 text-sm font-medium uppercase mb-1">{t('scanner.studentId')}</p>
                                                    <div className="inline-block bg-sky-50 px-3 py-1 rounded text-xl font-mono font-bold text-sky-700 border border-sky-100">
                                                        {scanResult.ticket.nim}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {scanStatus === 'USED' && (
                                <div className="space-y-6 animate-in shake">
                                    <div className="w-32 h-32 bg-amber-100 rounded-full flex items-center justify-center mx-auto shadow-md">
                                        <AlertTriangle className="w-16 h-16 text-amber-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-bold text-amber-600 mb-2">{t('scanner.used')}</h1>
                                        <p className="text-lg text-amber-800">{t('scanner.scannedAt')} {new Date(scanResult?.ticket?.scanned_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            )}

                            {(scanStatus === 'INVALID' || scanStatus === 'ERROR') && (
                                <div className="space-y-6 animate-in shake">
                                    <div className="w-32 h-32 bg-rose-100 rounded-full flex items-center justify-center mx-auto shadow-md">
                                        <XCircle className="w-16 h-16 text-rose-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-bold text-rose-600 mb-2">{t('scanner.invalid')}</h1>
                                        <p className="text-lg text-rose-800">{scanResult?.message}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Manual Entry Form */}
                        <div className="mt-8 pt-8 border-t border-slate-200/60 max-w-md mx-auto">
                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder={t('scanner.enterCode')}
                                        className="pl-9 h-12 text-lg uppercase bg-white border-slate-300 focus:border-sky-500 text-slate-900 placeholder:text-slate-400"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                    />
                                </div>
                                <Button type="submit" size="lg" className="h-12 bg-slate-900 hover:bg-slate-800 text-white">
                                    {t('scanner.scan')}
                                </Button>
                            </form>
                        </div>

                    </div>
                </main>

                {/* Right Side: History Sidebar (Admin Style) */}
                <aside className="w-80 bg-white border-l border-slate-200 flex flex-col z-20 shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 flex items-center">
                            <History className="w-4 h-4 mr-2 text-slate-500" />
                            {t('scanner.recentScans')}
                        </h3>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {scanHistory.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-slate-400 text-sm">{t('scanner.noScans')}</p>
                                </div>
                            ) : (
                                scanHistory.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-3 rounded-lg border text-sm transition-colors ${item.status === 'VALID' ? 'bg-emerald-50 border-emerald-200' :
                                            item.status === 'USED' ? 'bg-amber-50 border-amber-200' :
                                                'bg-rose-50 border-rose-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${item.status === 'VALID' ? 'bg-emerald-100 text-emerald-700' :
                                                item.status === 'USED' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-rose-100 text-rose-700'
                                                }`}>
                                                {item.status}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {item.status === 'VALID' || item.status === 'USED' ? (
                                            <>
                                                <p className="font-medium text-slate-900 truncate">{item.ticket?.category_name}</p>
                                                <p className="text-xs font-mono text-slate-500 truncate">{item.code}</p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-slate-500">{item.message}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </aside>
            </div>
        </div>
    );
};

export default ScannerDashboard;