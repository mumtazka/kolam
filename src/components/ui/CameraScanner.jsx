import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { Button } from './button';

/**
 * Camera-based QR Code Scanner Component
 * Uses html5-qrcode for camera access and QR code detection
 * Auto-submits when a QR code is successfully scanned
 */
const CameraScanner = ({ onScan, onError, active = false, className = '' }) => {
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [error, setError] = useState(null);
    const lastScannedRef = useRef('');
    const scanCooldownRef = useRef(false);

    // Get available cameras
    useEffect(() => {
        Html5Qrcode.getCameras()
            .then(devices => {
                if (devices && devices.length) {
                    setCameras(devices);
                    // Prefer back camera on mobile
                    const backCamera = devices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('rear')
                    );
                    setSelectedCamera(backCamera?.id || devices[0].id);
                }
            })
            .catch(err => {
                console.error('Failed to get cameras:', err);
                setError('Tidak dapat mengakses kamera');
                onError?.(err);
            });
    }, []);

    // Start/Stop scanner based on active prop
    useEffect(() => {
        if (active && selectedCamera && !isScanning) {
            startScanner();
        } else if (!active && isScanning) {
            stopScanner();
        }

        return () => {
            stopScanner();
        };
    }, [active, selectedCamera]);

    const startScanner = async () => {
        if (!scannerRef.current || !selectedCamera) return;

        try {
            if (html5QrCodeRef.current) {
                await stopScanner();
            }

            html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);

            await html5QrCodeRef.current.start(
                selectedCamera,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    // Prevent duplicate scans with cooldown
                    if (scanCooldownRef.current) return;
                    if (decodedText === lastScannedRef.current) return;

                    lastScannedRef.current = decodedText;
                    scanCooldownRef.current = true;

                    // Auto-submit the scanned code
                    onScan?.(decodedText);

                    // Reset cooldown after 2 seconds
                    setTimeout(() => {
                        scanCooldownRef.current = false;
                        lastScannedRef.current = '';
                    }, 2000);
                },
                (errorMessage) => {
                    // Ignore scanning failures (no QR code in frame)
                }
            );

            setIsScanning(true);
            setError(null);
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setError('Gagal memulai kamera');
            onError?.(err);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error('Failed to stop scanner:', err);
            }
            html5QrCodeRef.current = null;
        }
        setIsScanning(false);
    };

    const switchCamera = () => {
        if (cameras.length <= 1) return;

        const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
        const nextIndex = (currentIndex + 1) % cameras.length;
        setSelectedCamera(cameras[nextIndex].id);
    };

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center p-8 bg-rose-50 rounded-xl border border-rose-200 ${className}`}>
                <CameraOff className="w-12 h-12 text-rose-400 mb-3" />
                <p className="text-rose-600 font-medium text-center">{error}</p>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                        setError(null);
                        startScanner();
                    }}
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Coba Lagi
                </Button>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {/* Scanner Container */}
            <div
                id="qr-scanner-container"
                ref={scannerRef}
                className="w-full aspect-square bg-slate-900 rounded-xl overflow-hidden"
            />

            {/* Camera Switch Button (if multiple cameras) */}
            {cameras.length > 1 && isScanning && (
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-4 right-4 bg-white/90 hover:bg-white shadow-lg"
                    onClick={switchCamera}
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>
            )}

            {/* Scanning Indicator */}
            {isScanning && (
                <div className="absolute bottom-4 left-4 flex items-center bg-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
                    <Camera className="w-4 h-4 mr-2" />
                    Scanning...
                </div>
            )}

            {/* Scan Frame Overlay */}
            {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                            {/* Corner markers */}
                            <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                            <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                            <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CameraScanner;
