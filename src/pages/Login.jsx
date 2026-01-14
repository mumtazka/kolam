import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Globe, Monitor, ScanLine } from 'lucide-react';
import kolamBg from '../assets/kolam.jpg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const { login, setActiveMode } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);

      // Admin users go directly to admin panel
      if (user.type === 'ADMIN') {
        navigate('/admin');
      } else {
        // Staff users need to select their mode
        setLoggedInUser(user);
        setShowModeSelection(true);
      }
    } catch (error) {
      toast.error(error.message || t('auth.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleModeSelect = async (mode) => {
    try {
      await setActiveMode(mode);
      if (mode === 'CASHIER') {
        navigate('/receptionist');
      } else if (mode === 'SCANNER') {
        navigate('/scanner');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to set mode');
    }
  };

  const toggleLanguage = () => {
    changeLanguage(language === 'id' ? 'en' : 'id');
  };

  // Mode selection screen for staff after login
  if (showModeSelection && loggedInUser) {
    return (
      <div className="min-h-screen flex">
        {/* Left Side - Branding */}
        <div
          className="hidden lg:flex lg:w-3/5 relative bg-cover bg-center"
          style={{
            backgroundImage: `url(${kolamBg})`
          }}
        >
          <div className="absolute inset-0 bg-slate-900/50"></div>
          <div className="relative z-10 flex flex-col justify-center px-16 text-white">
            <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Outfit' }}>{t('auth.title')}</h1>
            <p className="text-2xl font-light mb-2">{t('auth.subtitle')}</p>
          </div>
        </div>

        {/* Right Side - Mode Selection */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white relative">
          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="absolute top-6 right-6 flex items-center gap-2 text-slate-600 hover:bg-slate-100"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase font-semibold">{language}</span>
          </Button>

          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                {t('auth.selectMode') || 'Pilih Mode Kerja'}
              </h2>
              <p className="text-slate-600 text-lg">
                {(t('auth.welcomeStaff') || 'Selamat datang, {{name}}!').replace('{{name}}', loggedInUser.name)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {t('auth.selectModeDescription') || 'Silakan pilih mode kerja Anda'}
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => handleModeSelect('CASHIER')}
                className="w-full h-24 text-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-between px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-slate-800 p-3 rounded-xl group-hover:bg-slate-700 transition-colors">
                    <Monitor className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xl">{t('auth.modeCashier') || 'Kasir / Resepsionis'}</div>
                    <div className="text-sm font-light opacity-80">{t('auth.modeCashierDesc') || 'Penjualan tiket dan transaksi'}</div>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleModeSelect('SCANNER')}
                className="w-full h-24 text-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-between px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-emerald-500 p-3 rounded-xl group-hover:bg-emerald-400 transition-colors">
                    <ScanLine className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xl">{t('auth.modeScanner') || 'Scanner'}</div>
                    <div className="text-sm font-light opacity-80">{t('auth.modeScannerDesc') || 'Scan dan validasi tiket'}</div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div
        className="hidden lg:flex lg:w-3/5 relative bg-cover bg-center"
        style={{
          backgroundImage: `url(${kolamBg})`
        }}
      >
        <div className="absolute inset-0 bg-slate-900/50"></div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Outfit' }}>{t('auth.title')}</h1>
          <p className="text-2xl font-light mb-2">{t('auth.subtitle')}</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white relative">
        {/* Language Switcher */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="absolute top-6 right-6 flex items-center gap-2 text-slate-600 hover:bg-slate-100"
        >
          <Globe className="w-4 h-4" />
          <span className="uppercase font-semibold">{language}</span>
        </Button>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
              {t('dashboard.welcome')}
            </h2>
            <p className="text-slate-600">
              {t('auth.loginDescription') || 'Masuk ke sistem manajemen kolam renang'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-slate-700 font-medium">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.placeholderEmail')}
                required
                className="mt-1 h-12 border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                data-testid="email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-700 font-medium">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.placeholderPassword')}
                required
                className="mt-1 h-12 border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium text-base"
              data-testid="login-button"
            >
              {loading ? t('auth.signingIn') : t('auth.login')}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 font-medium mb-2">{t('auth.demoCredentials') || 'Demo Credentials'}:</p>
            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <p className="font-medium text-slate-800">Admin:</p>
                <p>Email: <span className="font-mono">admin@kolamuny.ac.id</span></p>
                <p>Password: <span className="font-mono">admin123</span></p>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-2">
                <p className="font-medium text-slate-800">Staff:</p>
                <p>Email: <span className="font-mono">resepsionis@kolamuny.ac.id</span></p>
                <p>Password: <span className="font-mono">admin123</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;