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
    <div className="min-h-screen bg-mesh-dark font-sans text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-150px] right-[-100px] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[100px]" />
        <div className="absolute bottom-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[100px]" />
      </div>

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-mesh-gradient">
            <Shield size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg">QEKMS</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span>Already have access?</span>
          <Link to="/login" className="flex items-center gap-1.5 text-primary-cyan hover:text-cyan-300 font-semibold transition-colors">
            Sign In <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-start">
        {/* ── Left: Form ── */}
        <div>
          <div className="mb-10">
            <p className="text-xs font-bold tracking-[0.25em] text-primary-cyan mb-4">ENTERPRISE ONBOARDING</p>
            <h1 className="text-4xl font-black tracking-tight text-white mb-3">Request Enterprise Access</h1>
            <p className="text-gray-400 text-base leading-relaxed max-w-lg">
              Submit your deployment requirements and our cryptographic team will provision
              your dedicated node within 24–48 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Full Name</label>
                <Input type="text" icon={User} required placeholder="John Smith" value={formData.full_name} onChange={update('full_name')} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Organization</label>
                <Input type="text" icon={Building} required placeholder="ACME Corp" value={formData.company} onChange={update('company')} />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Business Email</label>
                <Input type="email" icon={Mail} required placeholder="ciso@company.com" value={formData.email} onChange={update('email')} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">Phone Number</label>
                <Input type="tel" icon={Phone} placeholder="+1 (555) 000-0000" value={formData.phone} onChange={update('phone')} />
              </div>
            </div>

            {/* Plan Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500">Select Your Plan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, plan: plan.id })}
                    className={`relative text-left p-5 rounded-xl transition-all duration-200 border ${
                      formData.plan === plan.id
                        ? 'border-primary-cyan/40 bg-primary-cyan/5'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold text-white bg-mesh-gradient">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-white text-sm">{plan.name}</span>
                      {formData.plan === plan.id && <CheckCircle2 size={16} className="text-primary-cyan" />}
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-black text-white">{plan.price}</span>
                      <span className="text-gray-500 text-xs">{plan.period}</span>
                    </div>
                    <ul className="space-y-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-xs text-gray-400 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary-cyan shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500">
                Deployment Requirements <span className="text-gray-700">(optional)</span>
              </label>
              <textarea
                placeholder="Describe your infrastructure requirements, expected node count, compliance needs..."
                value={formData.notes} onChange={update('notes')}
                rows={4}
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all resize-none focus:border-primary-cyan/50 focus:bg-white/10"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-400 bg-red-400/10 border border-red-400/20">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full mt-4" isLoading={submitting}>
              Submit Access Request <ArrowRight size={16} />
            </Button>

            <p className="text-center text-xs text-gray-700 pt-2">
              By submitting, you agree to our Terms of Service. All data is encrypted in transit and at rest.
            </p>
          </form>
        </div>

        {/* ── Right: Info Panel ── */}
        <div className="hidden lg:block space-y-6 sticky top-28">
          {/* What happens next */}
          <Card className="p-7 space-y-6">
            <h3 className="font-bold text-white text-lg">What happens next?</h3>
            <div className="space-y-5">
              {[
                { step: '01', title: 'Request Review', desc: 'Our team reviews your organization profile and requirements within 24 hours.' },
                { step: '02', title: 'Node Provisioning', desc: 'We configure your dedicated encrypted mesh node and generate your quantum keys.' },
                { step: '03', title: 'Credentials Delivered', desc: 'Secure credentials are delivered to your business email via encrypted channel.' },
              ].map(s => (
                <div key={s.step} className="flex gap-4">
                  <span className="text-xs font-black text-gray-600 shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">{s.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Security badges */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={14} className="text-primary-cyan" />
              <span className="text-xs font-bold text-gray-400">SECURITY POSTURE</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['SOC2 Type II', 'ISO 27001', 'AES-256', 'Zero-Trust', 'FIPS 140-2'].map(b => (
                <span key={b} className="px-3 py-1 text-xs text-gray-500 rounded-lg border border-white/10">
                  {b}
                </span>
              ))}
            </div>
          </Card>

          {/* Already submitted? */}
          <div className="text-center">
            <Link to="/status" className="text-sm text-gray-500 hover:text-primary-cyan transition-colors">
              Already submitted? Track your application →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
