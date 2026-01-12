import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { scanTicket } from '../../services/ticketService';
import { getPools } from '../../services/adminService';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { LogOut, Scan, CheckCircle, XCircle, AlertTriangle, User, Calendar, Droplets } from 'lucide-react';
import { toast } from 'sonner';

const ScannerDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { t } = useLanguage();

    // State
    const [setupComplete, setSetupComplete] = useState(false);
    const [selectedShift, setSelectedShift] = useState('');
    const [selectedPool, setSelectedPool] = useState(null); // Object: { id, name }
    const [pools, setPools] = useState([]);
    const [loadingPools, setLoadingPools] = useState(true);

    // Scan State: 'IDLE' | 'PROCESSING' | 'VALID' | 'USED' | 'INVALID' | 'ERROR'
    const [scanStatus, setScanStatus] = useState('IDLE');
    const [scanResult, setScanResult] = useState(null);
    const [lastScannedCode, setLastScannedCode] = useState('');

    // Buffer for barcode input
    const barcodeBuffer = useRef('');
    const lastKeyTime = useRef(Date.now());
    const scanTimeout = useRef(null);

    useEffect(() => {
        const loadPools = async () => {
            try {
                const data = await getPools();
                const activePools = data.filter(p => p.active);
                setPools(activePools);
            } catch (error) {
                console.error("Failed to load pools", error);
                toast.error("Failed to load pools");
            } finally {
                setLoadingPools(false);
            }
        };
        loadPools();
    }, []);

    // Play sound helper
    const playSound = (type) => {
        try {
            const audio = new Audio(type === 'success' ? '/success.mp3' : '/error.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { }); // Ignore errors
        } catch (e) {
            // Ignore audio errors
        }
    };

    // Handle barcode processing
    const processBarcode = async (code) => {
        if (!code || code.length < 5) return; // Ignore noise
        if (scanStatus === 'PROCESSING') return;

        setScanStatus('PROCESSING');
        setLastScannedCode(code);

        try {
            // Clean the code (some scanners add prefixes/suffixes)
            const cleanCode = code.trim();

            // Call API with pool ID
            const result = await scanTicket(cleanCode, user, selectedShift, selectedPool?.id);

            setScanResult(result);
            if (result.success) {
                setScanStatus('VALID');
                playSound('success');
            } else if (result.status === 'USED') {
                setScanStatus('USED');
                playSound('error');
            } else {
                setScanStatus('INVALID');
                playSound('error');
            }

        } catch (error) {
            console.error('Scan error:', error);
            setScanStatus('ERROR');
            setScanResult({ message: 'System Error: ' + error.message });
            playSound('error');
        }

        // Reset to IDLE after delay
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        scanTimeout.current = setTimeout(() => {
            setScanStatus('IDLE');
            setScanResult(null);
        }, 3000); // Show result for 3 seconds
    };

    // Keyboard listener
    useEffect(() => {
        if (!setupComplete) return;

        const handleKeyDown = (e) => {
            const currentTime = Date.now();

            // Timeout check: if typing is too slow, it's likely manual typing, not a scanner
            // Reset buffer if gap > 100ms
            if (currentTime - lastKeyTime.current > 100) {
                barcodeBuffer.current = '';
            }

            lastKeyTime.current = currentTime;

            if (e.key === 'Enter') {
                if (barcodeBuffer.current) {
                    processBarcode(barcodeBuffer.current);
                    barcodeBuffer.current = '';
                }
            } else if (e.key.length === 1) {
                // Append printable characters
                barcodeBuffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setupComplete, user, selectedShift, scanStatus, selectedPool]);

    // Start Shift Handler
    const startShift = () => {
        if (selectedShift && selectedPool) {
            setSetupComplete(true);
        } else {
            toast.error('Please select shift and pool');
        }
    };

    if (!setupComplete) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-['Outfit']">
                <Card className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="bg-sky-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Scan className="w-8 h-8 text-sky-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">{t('scanner.setup')}</h1>
                        <p className="text-slate-400 mt-2">Configure your station before starting</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-3 block">{t('dashboard.selectShift')}</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Pagi', 'Siang', 'Sore'].map(s => (
                                    <Button
                                        key={s}
                                        onClick={() => setSelectedShift(s)}
                                        variant={selectedShift === s ? 'default' : 'outline'}
                                        className={`h-12 ${selectedShift === s ? 'bg-sky-500 hover:bg-sky-600 border-none' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                                    >
                                        {s}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-3 block">{t('admin.pools')}</label>
                            {loadingPools ? (
                                <div className="text-center text-slate-500 py-4">Loading pools...</div>
                            ) : pools.length === 0 ? (
                                <div className="text-center text-amber-500 py-4">No active pools found</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {pools.map(pool => (
                                        <Button
                                            key={pool.id}
                                            onClick={() => setSelectedPool(pool)}
                                            variant={selectedPool?.id === pool.id ? 'default' : 'outline'}
                                            className={`h-auto py-3 px-2 whitespace-normal text-center leading-tight ${selectedPool?.id === pool.id ? 'bg-indigo-500 hover:bg-indigo-600 border-none' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                                        >
                                            {pool.name}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={startShift}
                            disabled={!selectedShift || !selectedPool}
                            className="w-full h-12 text-lg bg-emerald-500 hover:bg-emerald-600 font-bold text-white mt-4"
                        >
                            {t('scanner.startShift')}
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // --- MAIN SCANNER INTERFACE ---

    // Determine Background Color
    const getBgColor = () => {
        switch (scanStatus) {
            case 'VALID': return 'bg-emerald-50';
            case 'USED': return 'bg-amber-50';
            case 'INVALID': return 'bg-red-50';
            case 'ERROR': return 'bg-red-50';
            case 'PROCESSING': return 'bg-white';
            default: return 'bg-slate-50'; // IDLE
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 flex flex-col ${getBgColor()} text-slate-900 overflow-hidden`}>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm">
                <div>
                    <h2 className="text-xl font-bold font-['Outfit'] text-slate-900">{t('auth.title')}</h2>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center"><User className="w-4 h-4 mr-1" /> {user.name}</span>
                        <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {selectedShift}</span>
                        <span className="flex items-center"><Droplets className="w-4 h-4 mr-1" /> {selectedPool ? selectedPool.name : '-'}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSetupComplete(false)}
                        className="bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                    >
                        {t('common.switch')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={logout}
                        className="bg-white hover:bg-slate-100 text-rose-600 border-slate-200 hover:text-rose-700"
                    >
                        {t('common.logout')}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300 pt-24">

                {/* IDLE STATE */}
                {scanStatus === 'IDLE' && (
                    <div className="space-y-6">
                        <div className="w-32 h-32 rounded-full bg-sky-100 flex items-center justify-center mx-auto animate-pulse shadow-lg">
                            <Scan className="w-16 h-16 text-sky-600" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t('scanner.ready')}</h1>
                        <p className="text-xl font-mono text-slate-500">{t('scanner.waiting')}</p>
                        <p className="text-sm text-slate-400 mt-8 bg-slate-100 py-2 px-4 rounded-full inline-block">{t('scanner.focusMessage')}</p>
                    </div>
                )}

                {/* PROCESSING STATE */}
                {scanStatus === 'PROCESSING' && (
                    <div className="space-y-6">
                        <div className="w-24 h-24 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto"></div>
                        <h2 className="text-3xl font-bold text-slate-800">{t('scanner.processing')}</h2>
                        <p className="font-mono text-xl text-slate-500">{lastScannedCode}</p>
                    </div>
                )}

                {/* VALID STATE */}
                {scanStatus === 'VALID' && (
                    <div className="space-y-6 scale-110 transform transition-transform">
                        <div className="w-40 h-40 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl border-4 border-white">
                            <CheckCircle className="w-24 h-24" />
                        </div>
                        <div>
                            <h1 className="text-6xl font-black tracking-tight mb-2 text-emerald-600">{t('scanner.valid')}</h1>
                            <p className="text-2xl text-emerald-700/80 font-medium">{t('scanner.accessGranted')}</p>
                        </div>

                        {/* Ticket Details Card */}
                        <div className="mt-8 bg-white rounded-2xl p-8 max-w-lg mx-auto text-left border border-emerald-100 shadow-xl ring-4 ring-emerald-50">
                            <div className="grid grid-cols-2 gap-y-6">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Category</p>
                                    <p className="text-2xl font-bold text-slate-900">{scanResult?.ticket?.category_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Price</p>
                                    <p className="text-2xl font-bold text-emerald-600">Rp {scanResult?.ticket?.price?.toLocaleString()}</p>
                                </div>
                                {scanResult?.ticket?.nim && (
                                    <div className="col-span-2 border-t border-slate-100 pt-4">
                                        <p className="text-sm text-slate-500 mb-1">Student ID (NIM)</p>
                                        <p className="text-3xl font-mono font-bold text-slate-800 bg-yellow-100 inline-block px-2 py-1 rounded">{scanResult.ticket.nim}</p>
                                    </div>
                                )}
                                <div className="col-span-2 border-t border-slate-100 pt-4">
                                    <p className="text-sm text-slate-500 mb-1">Ticket Code</p>
                                    <p className="font-mono text-slate-600">{scanResult?.ticket?.ticket_code}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* USED STATE */}
                {scanStatus === 'USED' && (
                    <div className="space-y-6">
                        <div className="w-40 h-40 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-2xl border-4 border-white">
                            <AlertTriangle className="w-24 h-24" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black tracking-tight mb-2 text-amber-600">{t('scanner.used')}</h1>
                            <p className="text-xl text-amber-700/80">{t('scanner.usedMessage')}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 max-w-md mx-auto mt-6 shadow-lg border border-amber-100">
                            <p className="text-sm text-slate-500 text-center uppercase tracking-wider font-semibold mb-4">Riwayat Penggunaan</p>
                            <div className="text-center space-y-4">
                                <div>
                                    <p className="text-xs text-slate-400 md:text-sm">{t('scanner.scannedAt')}</p>
                                    <p className="text-xl font-bold text-slate-800">{scanResult?.ticket?.scanned_at ? new Date(scanResult.ticket.scanned_at).toLocaleString() : 'Visual Error'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 md:text-sm">{t('scanner.scannedBy')}</p>
                                    <p className="text-lg font-semibold text-slate-700">{scanResult?.ticket?.scanned_by || t('common.unknown')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* INVALID/ERROR STATE */}
                {(scanStatus === 'INVALID' || scanStatus === 'ERROR') && (
                    <div className="space-y-6">
                        <div className="w-40 h-40 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-2xl border-4 border-white">
                            <XCircle className="w-24 h-24" />
                        </div>
                        <div>
                            <h1 className="text-6xl font-black tracking-tight mb-2 text-red-600">{t('scanner.invalid')}</h1>
                            <p className="text-2xl text-red-700/80 font-medium">{scanResult?.message || t('scanner.invalidMessage')}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 font-mono text-lg mt-6 shadow-md border border-red-100 inline-block px-8">
                            Code: {lastScannedCode}
                        </div>
                    </div>
                )}

            </div>

            {/* Footer Instructions */}
            <div className="absolute bottom-6 left-0 right-0 text-center text-slate-400 text-sm">
                <p>Sistem Scanner V2.0 - USB Mode - {scanStatus}</p>
            </div>

        </div>
    );
};

export default ScannerDashboard;