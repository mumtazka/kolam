import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Login successful!');
      
      // Redirect based on role
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'RECEPTIONIST') {
        navigate('/receptionist');
      } else if (user.role === 'SCANNER') {
        navigate('/scanner');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div 
        className="hidden lg:flex lg:w-3/5 relative bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1575204015190-28962b6919bf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwzfHxpbmRvb3IlMjBzd2ltbWluZyUyMHBvb2wlMjBtaW5pbWFsJTIwYXJjaGl0ZWN0dXJlfGVufDB8fHx8MTc2NzkzMDE2MXww&ixlib=rb-4.1.0&q=85')`
        }}
      >
        <div className="absolute inset-0 bg-slate-900/50"></div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="text-5xl font-bold mb-4" style={{fontFamily: 'Outfit'}}>AquaFlow</h1>
          <p className="text-2xl font-light mb-2">Pool Management System</p>
          <p className="text-lg opacity-90">Professional ticketing & operations platform</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2" style={{fontFamily: 'Outfit'}}>Welcome Back</h2>
            <p className="text-slate-600">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="mt-1 h-12 border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                data-testid="email-input"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 font-medium mb-2">Demo Credentials:</p>
            <p className="text-sm text-slate-700">Email: <span className="font-mono">admin@aquaflow.com</span></p>
            <p className="text-sm text-slate-700">Password: <span className="font-mono">admin123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;