import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { Input } from '../components/ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'account' | 'admin'>('account');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.getElementById('google-jssdk')) return;
      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            { theme: 'outline', size: 'large', width: '400' }
          );
        }
      };
    };
    loadGoogleScript();
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/auth/google', { token: response.credential });
      await login();
      if (res.data.profile_incomplete) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/login', { email, password, role });
      await login();
      navigate(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Access Denied.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex flex-col lg:flex-row gap-12 lg:gap-32 items-center justify-center">
        {/* Left Side: Brand Identity */}
        <div className="hidden lg:block max-w-xl shrink-0">
          <div className="mb-8 flex items-center gap-4">
             <div className="w-12 h-12 bg-primary-cyan/10 border border-primary-cyan/20 rounded-2xl flex items-center justify-center">
                <Shield className="text-primary-cyan" size={24} />
             </div>
             <p className="text-[10px] font-black tracking-[0.4em] text-primary-cyan uppercase opacity-80">Enterprise Protocol</p>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] m-0 mb-8">
            <span className="text-white block">Quantum Access</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              Authentication.
            </span>
          </h1>
          <p className="text-gray-500 text-lg font-medium leading-relaxed max-w-md">
            Unlock your secure node and rejoin the quantum mesh. All connections are encrypted and audited in real-time.
          </p>
        </div>

        {/* ── Login-Synced Form Card ── */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-xl bg-[#0d0d0f]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary-cyan/5 rounded-full blur-[80px]" />
          
          {/* Mobile Header */}
          <div className="mb-10 text-left lg:hidden">
            <p className="text-[9px] font-black tracking-[0.4em] text-primary-cyan mb-2 uppercase opacity-80">Enterprise Protocol</p>
            <h1 className="text-4xl font-black tracking-tighter leading-[0.95] m-0">
              <span className="text-white block">Quantum Access</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500">Authentication.</span>
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-8 hidden lg:block">
               <h3 className="text-2xl font-black tracking-tighter mb-1 text-white">Secure Node Login</h3>
               <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold">Authorized Personnel Only</p>
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-4 rounded-2xl transition-all duration-300 border flex flex-col items-center justify-center gap-2 ${role === 'admin'
                  ? 'border-primary-cyan/40 bg-primary-cyan/10 shadow-mesh-glow'
                  : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${role === 'admin' ? 'text-primary-cyan' : 'text-gray-500'}`}>Overseer</span>
                {role === 'admin' && <div className="w-1 h-1 rounded-full bg-primary-cyan shadow-[0_0_8px_cyan]" />}
              </button>
              <button
                type="button"
                onClick={() => setRole('account')}
                className={`p-4 rounded-2xl transition-all duration-300 border flex flex-col items-center justify-center gap-2 ${role === 'account'
                  ? 'border-primary-cyan/40 bg-primary-cyan/10 shadow-mesh-glow'
                  : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${role === 'account' ? 'text-primary-cyan' : 'text-gray-500'}`}>Operator</span>
                {role === 'account' && <div className="w-1 h-1 rounded-full bg-primary-cyan shadow-[0_0_8px_cyan]" />}
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Identity Secret</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                    placeholder="email@quantum.node"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Access Cipher</label>
                  <Link to="/forgot-password/request" className="text-[9px] font-bold text-primary-cyan/60 hover:text-primary-cyan uppercase tracking-widest transition-colors">Recover</Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-12 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-primary-cyan transition-all border-none bg-transparent cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl text-[10px] text-red-500 bg-red-500/5 border border-red-500/10 font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full h-14 bg-mesh-gradient shadow-mesh-glow font-black text-xs uppercase tracking-[0.2em] rounded-2xl" 
                isLoading={submitting}
              >
                Access Node <ArrowRight size={18} className="ml-2" />
              </Button>

              <div id="google-signin-button" className="flex justify-center" />
              
              <p className="text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-4">
                New Node? <Link to="/register" className="text-primary-cyan hover:underline transition-all">Provision Now</Link>
              </p>
            </div>
          </form>
        </motion.div>

      </div>
    </div>
  );
}
