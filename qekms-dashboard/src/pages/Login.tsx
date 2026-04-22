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
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex flex-col lg:flex-row gap-12 lg:gap-32 items-center justify-center">
        {/* ── Left: Main Login Card ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-xl bg-[#0d0d0f]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary-cyan/5 rounded-full blur-[80px]" />
          
          <div className="mb-8 text-left">
            <p className="text-[9px] font-black tracking-[0.4em] text-primary-cyan mb-2 uppercase opacity-80">Security Protocol</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.95] m-0">
              <span className="text-white block">Quantum Access</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                Authentication.
              </span>
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Split Roles Grid */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Identity Secret</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                    placeholder="operator@mesh.intel"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Access Cipher</label>
                  <Link to="/forgot-password" className="text-[10px] font-bold text-primary-cyan hover:underline transition-all">
                    Forgot?
                  </Link>
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

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] font-bold"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                className="w-full h-14 text-[12px] font-black uppercase tracking-[0.2em] shadow-mesh-glow shadow-primary-cyan/10"
                isLoading={submitting}
              >
                Establish Connection <ArrowRight size={18} className="ml-2" />
              </Button>
            </motion.div>

            {/* Google Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">
                <span className="bg-mesh-dark px-4">Federated Access</span>
              </div>
            </div>

            <GoogleAuthButton id="google-signin-button" text="Fast-Track Identity" />

            <div className="flex justify-center items-center gap-6 pt-2">
              <Link to="/register" className="text-[11px] font-bold text-gray-600 hover:text-white transition-colors">Apply Clearance</Link>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <Link to="/status" className="text-[11px] font-bold text-gray-600 hover:text-white transition-colors">Audit Status</Link>
            </div>
          </form>
        </motion.div>

        {/* ── Right: Side Info Panel (Protocol Pipeline) ── */}
        <div className="hidden lg:flex flex-col gap-8 max-w-sm shrink-0 h-full justify-center">
            <div className="space-y-2">
                <p className="text-[10px] font-black text-primary-cyan uppercase tracking-[0.4em] opacity-80">Authentication Loop</p>
                <h3 className="text-2xl font-black text-white tracking-tighter">Protocol Pipeline</h3>
            </div>
            
            <div className="space-y-8">
              {[
                { step: '01', title: 'Credential Audit', desc: 'Secure verification of identity matrix and node clearance levels.' },
                { step: '02', title: 'Handshake Sync', desc: 'Quantum key exchange and multi-factor protocol initialization.' },
                { step: '03', title: 'Access Granted', desc: 'Encrypted tunnel establishment to high-availability compute nodes.' },
              ].map(s => (
                <div key={s.step} className="flex gap-6 group">
                  <span className="text-[10px] font-black text-gray-500 shrink-0 border border-white/10 w-10 h-10 flex items-center justify-center rounded-xl group-hover:border-primary-cyan/40 group-hover:text-primary-cyan transition-all duration-300">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-sm font-black text-white mb-1 group-hover:text-primary-cyan transition-colors">{s.title}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium uppercase tracking-wider">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
               <div className="flex items-center gap-4 group">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                    <Shield size={14} className="text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-black text-white/60 tracking-[0.2em] uppercase">ISO-27001 SECURE NODE</span>
               </div>
               <p className="text-[10px] text-gray-600 font-bold uppercase leading-loose tracking-widest italic opacity-50">
                    Quantum Governance v4.2 Active
               </p>
            </div>
        </div>
      </div>

      {/* ── Footer Decorative Audit Info ── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-4 opacity-30 pointer-events-none">
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.5em]"></span>
      </div>
    </div>
  );
}
