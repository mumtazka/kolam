import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { LogOut, Scan, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';

// Import Supabase service
import { scanTicket } from '../../services/ticketService';

const ScannerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  const startScanner = () => {
    if (scanning) return;

    setScanning(true);
    setScanResult(null);

    const html5QrCodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    html5QrCodeScanner.render(
      (decodedText) => {
        handleScan(decodedText);
        html5QrCodeScanner.clear();
        setScanning(false);
      },
      (error) => {
        console.log(error);
      }
    );

    setScanner(html5QrCodeScanner);
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
      setScanning(false);
    }
  };

  const handleScan = async (ticketId) => {
    // If ticket ID is a URL, extract the ID
    // Assumption: ticket ID is the random UUID
    let cleanId = ticketId;
    if (ticketId.includes('data=')) {
      cleanId = ticketId.split('data=')[1];
    }

    try {
      const result = await scanTicket(cleanId, user);
      setScanResult(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error(error);
      setScanResult({
        success: false,
        status: 'ERROR',
        message: 'System error: ' + error.message,
        ticket: null
      });
      toast.error('Failed to validate ticket');
    }
  };

  const handleManualScan = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
      setManualInput('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getResultColor = () => {
    if (!scanResult) return '';
    if (scanResult.status === 'VALID') return 'bg-emerald-500';
    if (scanResult.status === 'USED') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getResultIcon = () => {
    if (!scanResult) return null;
    if (scanResult.status === 'VALID') return <CheckCircle className="w-24 h-24" />;
    if (scanResult.status === 'USED') return <AlertCircle className="w-24 h-24" />;
    return <XCircle className="w-24 h-24" />;
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="scanner-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Kolam Renang UNY - Scanner</h1>
            <p className="text-sm text-slate-600">{user?.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Scan Result */}
        {scanResult && (
          <div className={`${getResultColor()} text-white rounded-xl p-8 mb-6 text-center shadow-lg transition-all duration-300`} data-testid="scan-result">
            <div className="flex justify-center mb-4">
              {getResultIcon()}
            </div>
            <h2 className="text-3xl font-bold mb-2">{scanResult.status}</h2>
            <p className="text-lg mb-4">{scanResult.message}</p>
            {scanResult.ticket && (
              <Card className="bg-white/20 backdrop-blur-sm p-4 text-left border-none text-white">
                <div className="space-y-2 text-sm">
                  {scanResult.ticket.ticket_code && <p><span className="font-semibold opacity-80">Code:</span> <span className="text-lg font-bold font-mono">{scanResult.ticket.ticket_code}</span></p>}
                  <p><span className="font-semibold opacity-80">Category:</span> <span className="text-lg font-bold">{scanResult.ticket.category_name}</span></p>
                  <p><span className="font-semibold opacity-80">Price:</span> Rp {scanResult.ticket.price?.toLocaleString()}</p>
                  <p><span className="font-semibold opacity-80">Scanner:</span> {user.name}</p>
                  {scanResult.ticket.nim && <p><span className="font-semibold opacity-80">NIM:</span> {scanResult.ticket.nim}</p>}
                </div>
              </Card>
            )}
            <Button
              onClick={() => setScanResult(null)}
              className="mt-6 bg-white text-slate-900 hover:bg-slate-100 font-semibold w-full"
              data-testid="scan-another-button"
            >
              Scan Next Ticket
            </Button>
          </div>
        )}

        {/* Scanner Interface */}
        {!scanResult && (
          <div className="space-y-6">
            {/* QR Scanner */}
            <Card className="p-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 text-center" style={{ fontFamily: 'Outfit' }}>Scan QR Code</h2>

              {!scanning ? (
                <div className="text-center py-12">
                  <Scan className="w-24 h-24 mx-auto mb-6 text-slate-400" />
                  <Button
                    onClick={startScanner}
                    className="bg-slate-900 hover:bg-slate-800 h-14 px-8 text-lg w-full max-w-xs"
                    data-testid="start-scan-button"
                  >
                    <Scan className="w-6 h-6 mr-2" />
                    Start Camera
                  </Button>
                </div>
              ) : (
                <div>
                  <div id="qr-reader" className="mb-4 overflow-hidden rounded-lg"></div>
                  <Button
                    onClick={stopScanner}
                    variant="outline"
                    className="w-full"
                    data-testid="stop-scan-button"
                  >
                    Stop Scanner
                  </Button>
                </div>
              )}
            </Card>

            {/* Manual Entry */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>Manual Entry</h2>
              <form onSubmit={handleManualScan} className="space-y-4">
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter ticket ID"
                  className="h-12 text-lg"
                  data-testid="manual-ticket-input"
                />
                <Button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800"
                  data-testid="manual-scan-button"
                >
                  Validate Ticket
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div >
  );
};

export default ScannerDashboard;