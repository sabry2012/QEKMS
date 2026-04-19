import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
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
    <div className="min-h-screen flex bg-mesh-dark relative overflow-hidden font-sans">
      {/* ── Background Ambient Architecture ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="absolute top-0 left-0 w-full h-full"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-blue/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </motion.div>
      </div>

      {/* ── Left Panel: Cyber Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-16 relative z-10 border-r border-white/5 bg-white/[0.01] backdrop-blur-3xl">
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              y: [0, -20, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 right-10 w-64 h-64 border border-primary-cyan/10 rounded-full"
          />
        </div>

        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-mesh-gradient shadow-mesh-glow relative group">
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <Shield size={24} className="text-white relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white m-0">QEKMS</h1>
            <p className="text-[10px] font-bold text-primary-cyan uppercase tracking-[0.2em] m-0">Quantum Intelligence</p>
          </div>
        </motion.div>

        {/* Hero Section */}
        <div className="space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[11px] font-extrabold tracking-[0.3em] text-primary-cyan mb-6 uppercase">System Protocol v4.0</p>
            <h2 className="text-6xl font-black tracking-tighter leading-[0.9] text-white">
              Securing the<br />
              <span className="bg-clip-text text-transparent bg-mesh-gradient">
                Quantum
              </span><br />
              Frontier.
            </h2>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-500 text-lg leading-relaxed max-w-sm font-medium"
          >
            Experience the next generation of cryptographic mesh governance with zero-trust node verification.
          </motion.p>

          {/* Features */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-5"
          >
            {[
              { label: 'E2EE Post-Quantum Handshakes', status: 'Active' },
              { label: 'Distributed Entropy Sourcing', status: 'Verified' },
              { label: 'ISO-27001 Cryptographic Ledger', status: 'Audit Ready' }
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary-cyan/20 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-cyan shadow-[0_0_8px_cyan]" />
                  <span className="text-sm font-bold text-gray-400 group-hover:text-gray-200 transition-colors uppercase tracking-wide">{f.label}</span>
                </div>
                <span className="text-[9px] font-black py-1 px-2.5 rounded-md bg-white/5 border border-white/10 text-gray-500 uppercase">{f.status}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-mesh-dark bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">U{i}</div>
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-600">Used by 400+ Enterprise Nodes</span>
          </div>
          <div className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Est. 2024</div>
        </motion.div>
      </div>

      {/* ── Right Panel: Modern Glass Login Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile view Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-mesh-gradient shadow-mesh-glow">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-black text-xl text-white tracking-tight">QEKMS</span>
          </div>

          <div className="mb-12">
            <h3 className="text-4xl font-black tracking-tight text-white mb-3">Operator Login</h3>
            <p className="text-gray-500 font-medium m-0">Input credentials to initialize session handshake.</p>
          </div>

          {/* Premium Segmented Toggle */}
          <div className="relative flex p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 mb-10 overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.div
                key={role}
                layoutId="role-slider"
                className="absolute inset-y-1.5 rounded-xl bg-mesh-gradient shadow-mesh-glow"
                style={{ 
                  left: role === 'account' ? '6px' : 'calc(50% + 1px)',
                  width: 'calc(50% - 7px)'
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            </AnimatePresence>
            <button
              onClick={() => setRole('account')}
              className={`flex-1 py-3 text-[13px] font-extrabold uppercase tracking-widest relative z-10 transition-colors duration-300 ${
                role === 'account' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Operator
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`flex-1 py-3 text-[13px] font-extrabold uppercase tracking-widest relative z-10 transition-colors duration-300 ${
                role === 'admin' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Overseer
            </button>
          </div>

          {/* Form Stack */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1 group-focus-within:text-primary-cyan transition-colors">Session Locator</label>
              <Input
                type="email"
                icon={Mail}
                required
                placeholder="operator@mesh.intel"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-black/20 border-white/5 focus:bg-black/40 h-14"
              />
            </div>

            <div className="space-y-1.5 group">
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 ml-1 group-focus-within:text-primary-cyan transition-colors">Cipher Key</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  icon={Lock}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-black/20 border-white/5 focus:bg-black/40 h-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-primary-cyan transition-all border-none bg-transparent cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 py-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="w-4 h-4 rounded border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-primary-cyan transition-colors">
                  <div className="w-2 h-2 rounded-sm bg-primary-cyan opacity-0 group-hover:opacity-20" />
                </div>
                <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-400">Remember Node</span>
              </label>
              <Link to="/forgot-password" className="text-[11px] font-bold text-primary-cyan hover:brightness-125 transition-all">
                Recovery Protocol
              </Link>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-center gap-3 text-red-500 text-xs font-bold"
                >
                  <Loader2 size={16} className="animate-spin" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button 
                type="submit" 
                className="w-full h-14 text-[13px] font-black uppercase tracking-widest shadow-mesh-glow hover:shadow-mesh-glow-strong" 
                isLoading={submitting}
              >
                {submitting ? 'Authenticating...' : (
                  <>
                    Initialize Session <ArrowRight size={18} className="ml-1" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Bottom Links */}
          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em]">Credentials Required</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>

            <div className="text-center space-y-4">
              <Link to="/register" className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-all">
                No active clearance? 
                <span className="text-primary-cyan font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Apply for Node Access <ChevronRight size={16} />
                </span>
              </Link>
              
              <div className="flex items-center justify-center gap-4 opacity-50">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SOC-2 Type II Certified</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Footer Decorative Audit Info ── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-4 opacity-30 pointer-events-none">
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.5em]">Restricted Access Control // Intel Core 08-X</span>
      </div>
    </div>
  );
}
