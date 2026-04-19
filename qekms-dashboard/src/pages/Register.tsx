import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import {
  Shield, User, Building, Phone, Mail, Lock,
  ArrowRight, CheckCircle2, ChevronRight, Star
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const PLANS = [
  {
    id: 'pro',
    name: 'Professional',
    price: '$500',
    period: '/mo',
    features: ['50 Encrypted Channels', '500 Quantum Keys', '20 MB File Transfers'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$1,000',
    period: '/mo',
    features: ['Infinite Channels', 'Infinite Key Generation', 'SSO / SAML', '24/7 Support'],
    badge: 'Most Popular',
  },
];

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    email: '',
    phone: '',
    plan: 'pro',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/client/request', formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success Screen ── */
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 bg-mesh-dark font-sans">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-4">Request Received</h1>
        <p className="text-gray-400 text-lg max-w-md leading-relaxed mb-10">
          Your enterprise access request is now under review. Our cryptographic engineering team will
          contact you within <span className="text-white font-semibold">24–48 hours</span>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            to="/status"
            className="flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-white bg-mesh-gradient hover:opacity-90 transition-opacity"
          >
            Track Application <ChevronRight size={16} />
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Return to home
          </Link>
        </div>
      </div>
    );
  }

  /* ── Main Registration ── */
  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-8 flex gap-12 items-center justify-center h-full py-8">
        {/* ── Left: Main Form Card ── */}
        <div className="flex-1 max-w-2xl bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-3xl overflow-hidden shadow-2xl">
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[0.3em] text-primary-cyan mb-3 uppercase">Enterprise Onboarding</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[1.1] mb-5">
              <span className="text-white block">Enterprise Access</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                Registration.
              </span>
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Split row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Identity</label>
                <Input type="text" icon={User} required placeholder="Full Name" value={formData.full_name} onChange={update('full_name')} className="h-12 bg-black/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Organization</label>
                <Input type="text" icon={Building} required placeholder="Company" value={formData.company} onChange={update('company')} className="h-12 bg-black/20" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Communication</label>
                <Input type="email" icon={Mail} required placeholder="Business Email" value={formData.email} onChange={update('email')} className="h-12 bg-black/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Contact</label>
                <Input type="tel" icon={Phone} placeholder="Phone Number" value={formData.phone} onChange={update('phone')} className="h-12 bg-black/20" />
              </div>
            </div>

            {/* Plan Selector - Mini Mode */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Select Tier</label>
                <Link to="/pricing" className="text-[10px] font-bold text-primary-cyan underline">View Details</Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, plan: plan.id })}
                    className={`relative text-left p-4 rounded-2xl transition-all duration-200 border ${
                      formData.plan === plan.id
                        ? 'border-primary-cyan/40 bg-primary-cyan/10 shadow-mesh-glow'
                        : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-black text-xs text-white uppercase tracking-tighter">
                      {plan.name}
                      {formData.plan === plan.id && <CheckCircle2 size={14} className="text-primary-cyan" />}
                    </div>
                    <div className="text-xl font-black text-white mt-1">{plan.price}<span className="text-[10px] text-gray-500 font-bold tracking-normal">{plan.period}</span></div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl text-xs text-red-500 bg-red-500/5 border border-red-500/10 font-bold">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-14 mt-2 shadow-mesh-glow text-xs font-black uppercase tracking-[0.2em]" isLoading={submitting}>
              Submit Handshake <ArrowRight size={16} className="ml-2" />
            </Button>

            <div className="flex justify-center items-center gap-6 mt-4">
               <Link to="/login" className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors">SignIn Instead</Link>
               <Link to="/status" className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors">Track Status</Link>
            </div>
          </form>
        </div>

        {/* ── Right: Side Info (Compact) ── */}
        <div className="hidden lg:flex flex-col gap-6 max-w-xs shrink-0 h-full justify-center">
            <h3 className="text-xs font-black text-primary-cyan uppercase tracking-[0.3em] mb-2">Protocol Pipeline</h3>
            <div className="space-y-6">
              {[
                { step: '01', title: 'Review', desc: 'Team reviews organization profile' },
                { step: '02', title: 'Provision', desc: 'Secure node setup & key generation' },
                { step: '03', title: 'Access', desc: 'Credentials delivered encrypted' },
              ].map(s => (
                <div key={s.step} className="flex gap-4">
                  <span className="text-[10px] font-black text-gray-700 shrink-0 border border-white/10 w-6 h-6 flex items-center justify-center rounded-lg mt-0.5">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white mb-0.5">{s.title}</p>
                    <p className="text-[10px] text-gray-600 leading-snug">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
               <div className="flex items-center gap-3 grayscale opacity-30">
                  <Lock size={14} className="text-white" />
                  <span className="text-[10px] font-black text-white tracking-widest">ISO-27001 SECURE</span>
               </div>
               <p className="text-[10px] text-gray-700 font-medium">By initializing this handshake you agree to the cryptographic governance agreement.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
