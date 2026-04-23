import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Shield, Mail, Building, User, MessageSquare, 
  ArrowRight, CheckCircle2, ChevronLeft, Globe, Zap
} from 'lucide-react';
import api from '../api/axiosConfig';

export default function RequestExpert() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'expert';
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    organization: '',
    message: '',
    plan: plan
  });

  const getTitle = () => {
    if (plan === 'sales') return { first: 'Contact', last: 'Sales Team.' };
    if (plan === 'support') return { first: 'Technical', last: 'Support.' };
    return { first: 'Consult a', last: 'Security Architect.' };
  };

  const title = getTitle();

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      await api.post('/inquiries/expert', formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 bg-mesh-dark font-sans text-white">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-primary-cyan/10 border border-primary-cyan/25"
        >
          <CheckCircle2 size={40} className="text-primary-cyan" />
        </motion.div>
        <h1 className="text-4xl font-black tracking-tight mb-4 uppercase">Inquiry Transmitted</h1>
        <p className="text-gray-400 text-lg max-w-md leading-relaxed mb-10">
          Our cryptographic engineering team has received your request. An expert will reach out to scope your deployment within 24 hours.
        </p>
        <Link
          to="/"
          className="flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-white bg-mesh-gradient hover:opacity-90 transition-opacity"
        >
          <ChevronLeft size={16} /> Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden px-6">
      {/* Ambient backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-24 items-center justify-center">
        {/* Left Side: Copy */}
        <div className="hidden lg:block flex-1 max-w-xl">
           <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-cyan transition-colors mb-8 text-xs font-bold uppercase tracking-widest">
              <ChevronLeft size={16} /> Back to mesh
           </Link>
           <div className="mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-cyan/10 border border-primary-cyan/20 rounded-2xl flex items-center justify-center">
                 <Globe className="text-primary-cyan" size={24} />
              </div>
              <p className="text-[10px] font-black tracking-[0.4em] text-primary-cyan uppercase opacity-80">Strategic Deployment</p>
           </div>
           <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-8">
             <span className="text-white block">{title.first}</span>
             <span className="bg-clip-text text-transparent bg-mesh-gradient drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {title.last}
             </span>
           </h1>
           <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-md">
             Enterprise-grade security requires custom-tailored strategy. Connect with our engineers to design your isolated mesh infrastructure.
           </p>
           
           <div className="space-y-4">
              {[
                { icon: Shield, text: 'Custom Cryptographic Scoping' },
                { icon: Zap, text: 'Post-Quantum Migration Planning' },
                { icon: Globe, text: 'Multinational Mesh Architecture' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-xs font-bold text-gray-300">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <item.icon size={16} className="text-primary-cyan" />
                  </div>
                  {item.text}
                </div>
              ))}
           </div>
        </div>

        {/* Mobile Header (Hidden on LG) */}
        <div className="lg:hidden w-full text-left mb-6">
           <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-cyan transition-colors mb-4 text-[10px] font-bold uppercase tracking-widest">
              <ChevronLeft size={14} /> Back
           </Link>
           <h1 className="text-4xl font-black tracking-tighter leading-[0.95] mb-2">
             <span className="text-white block">{title.first}</span>
             <span className="bg-clip-text text-transparent bg-mesh-gradient">{title.last}</span>
           </h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-xl bg-[#0d0d0f]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary-cyan/5 rounded-full blur-[80px]" />
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Work Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Organization</label>
              <div className="relative group">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                <input
                  type="text"
                  required
                  className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                  placeholder="Enterprise Name"
                  value={formData.organization}
                  onChange={e => setFormData({...formData, organization: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Project Scope</label>
              <div className="relative group">
                <MessageSquare className="absolute left-4 top-5 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                <textarea
                  required
                  rows={3}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 pt-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5 resize-none"
                  placeholder="Tell us about your security requirements..."
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl text-[9px] text-red-500 bg-red-500/5 border border-red-500/10 font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-14 bg-mesh-gradient shadow-mesh-glow font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl text-white flex items-center justify-center gap-3 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Transmitting...' : 'Request Consultation'} <ArrowRight size={18} />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
