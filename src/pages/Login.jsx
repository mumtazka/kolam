import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Globe } from 'lucide-react';
import kolamBg from '../assets/kolam.jpg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null); // 'ADMIN', 'CASHIER', 'SCANNER'
  const { login } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
  };

  const handleBackToMode = () => {
    setSelectedMode(null);
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password, selectedMode);
      // toast.success(t('auth.success') || 'Login successful!'); 

      // Redirect based on active_mode
      if (user.active_mode === 'ADMIN') {
        navigate('/admin');
      } else if (user.active_mode === 'CASHIER') {
        navigate('/receptionist');
      } else if (user.active_mode === 'SCANNER') {
        navigate('/scanner');
      }
    } catch (error) {
      toast.error(error.message || t('auth.failed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    changeLanguage(language === 'id' ? 'en' : 'id');
  };

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
              {selectedMode ? `Login: ${selectedMode}` : t('dashboard.welcome')}
            </h2>
            <p className="text-slate-600">
              {selectedMode ? 'Please enter your credentials' : 'Select your login mode'}
            </p>
          </div>

          {!selectedMode ? (
            <div className="space-y-4">
              <Button
                onClick={() => handleModeSelect('ADMIN')}
                className="w-full h-14 text-lg bg-slate-800 hover:bg-slate-900"
              >
                Login as Admin
              </Button>
              <Button
                onClick={() => handleModeSelect('CASHIER')}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
              >
                Login as Cashier
              </Button>
              <Button
                onClick={() => handleModeSelect('SCANNER')}
                className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
              >
                Login as Scanner
              </Button>
            </div>
          ) : (
            <>
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

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToMode}
                    disabled={loading}
                    className="flex-1 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium text-base"
                    data-testid="login-button"
                  >
                    {loading ? t('auth.signingIn') : t('auth.login')}
                  </Button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 font-medium mb-2">Demo Credentials ({selectedMode}):</p>
                {selectedMode === 'ADMIN' && (
                  <>
                    <p className="text-sm text-slate-700">Email: <span className="font-mono">admin@kolamuny.ac.id</span></p>
                    <p className="text-sm text-slate-700">Password: <span className="font-mono">admin123</span></p>
                  </>
                )}
                {selectedMode === 'CASHIER' && (
                  <>
                    <p className="text-sm text-slate-700">Email: <span className="font-mono">resepsionis@kolamuny.ac.id</span></p>
                    <p className="text-sm text-slate-700">Password: <span className="font-mono">admin123</span></p>
                  </>
                )}
                {selectedMode === 'SCANNER' && (
                  <>
                    <p className="text-sm text-slate-700">Email: <span className="font-mono">scanner@kolamuny.ac.id</span></p>
                    <p className="text-sm text-slate-700">Password: <span className="font-mono">admin123</span></p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;