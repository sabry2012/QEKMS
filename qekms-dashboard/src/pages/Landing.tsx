import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Lock, Key, Users, Zap, CheckCircle2,
  ArrowRight, Mail, Globe, Cpu, ChevronRight, Star
} from 'lucide-react';
import QuantumAnimation from '../components/QuantumAnimation';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Status', href: '/status', isRoute: true },
  { label: 'Contact', href: '#contact' },
];

const FEATURES = [
  {
    icon: Lock,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    title: 'Absolute Privacy',
    desc: 'AES-256 GCM encryption ensures your data exists in plaintext only at verified endpoints — never in transit.',
  },
  {
    icon: Cpu,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
    title: 'Future-Proof Security',
    desc: 'Quantum-resistant QKD principles inject true unpredictability into every key, defeating future decryption threats.',
  },
  {
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    title: 'Zero-Leak Architecture',
    desc: 'Mathematically segmented mesh channels ensure a breach in one tunnel never compromises the rest of your network.',
  },
  {
    icon: Users,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    title: 'Total Admin Control',
    desc: 'Audit, revoke, and govern every node in real time. Eliminate compromised identities across your collective instantly.',
  },
  {
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
    title: 'High-Speed Security',
    desc: 'Military-grade handshakes complete in under 200ms. No perceptible delay — just uncompromising protection at full speed.',
  },
  {
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    title: 'Instant Compliance',
    desc: 'Immutable audit trails and policy controls built specifically for SOC2, ISO 27001, and global enterprise standards.',
  },
];

const STATS = [
  { value: '256-bit', label: 'Absolute Cipher Grade' },
  { value: '99.99%', label: 'Mission-Critical SLA' },
  { value: '<200ms', label: 'Zero-Delay Handshake' },
  { value: '∞', label: 'Key Unpredictability' },
];

const PLANS = [
  {
    name: 'Quantum Shield',
    headline: 'Secure Your Entry Point',
    price: '$79',
    period: '/ month',
    desc: 'Essential protection for high-value individuals and teams targeting absolute privacy.',
    features: [
      '25 Private Mesh Channels',
      '1,000 Daily Encryptions',
      'Max 10 Users per Channel',
      'Secure 100 MB File Transfers',
      'Standard Priority Support',
      'Full Audit Log History'
    ],
    cta: 'Start Securing Now',
    linkTo: '/register?plan=starter',
    highlighted: false,
    icon: Shield,
    color: 'text-gray-400',
    border: 'border-white/10',
    bg: 'bg-white/5',
    buttonClass: 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
  },
  {
    name: 'Cyber Fortress',
    headline: 'Take Full Control',
    price: '$249',
    period: '/ month',
    desc: 'Enterprise-grade mesh security for growing institutions needing performance and scale.',
    features: [
      '100 High-Capacity Channels',
      '10,000 Burst Encryptions',
      'Zero-Delay Handshake Speed',
      'Real-Time Attack Intelligence',
      'Dedicated Crypto-Engineering',
      'Mass Team Scaling Support'
    ],
    cta: 'Upgrade Your Security',
    linkTo: '/register?plan=professional',
    highlighted: true,
    icon: Zap,
    color: 'text-primary-cyan',
    border: 'border-primary-cyan/30',
    bg: 'bg-primary-cyan/10',
    buttonClass: 'bg-primary-cyan text-black hover:bg-white shadow-primary-cyan/20'
  },
  {
    name: 'Infinity Mesh',
    headline: 'Deploy Absolute Power',
    price: '$899',
    period: '/ month',
    desc: 'The world\'s most resilient quantum-resistant infrastructure with zero limitations.',
    features: [
      'Absolute Channel Freedom',
      'Infinite Encryption Power',
      'Global Fleet Integration',
      'Custom Quantum Key Access',
      '99.999% Ironclad SLA',
      'Full Compliance & Onboarding'
    ],
    cta: 'Deploy at Scale',
    linkTo: '/request-expert?plan=infinity',
    highlighted: false,
    icon: Globe,
    color: 'text-violet-500',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    buttonClass: 'bg-violet-500 text-white hover:bg-white hover:text-black shadow-violet-500/20'
  },
];

export default function Landing() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-mesh-dark text-white overflow-x-hidden font-sans">

      {/* ─── Ambient Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-200px] right-[-200px] w-[700px] h-[700px] rounded-full bg-primary-cyan/10 blur-[100px]" />
        <div className="absolute bottom-[-300px] left-[-200px] w-[800px] h-[800px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:48px_48px]" />
        
        {/* Full-Page 3D Quantum Animation */}
        <div className="absolute inset-0 opacity-30">
          <QuantumAnimation />
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <header className="fixed top-0 w-full z-50 bg-mesh-dark/80 backdrop-blur-xl border-b border-white/5">
        <nav className="flex items-center justify-between px-8 py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-mesh-gradient">
              <Shield size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">QEKMS</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link =>
              link.isRoute ? (
                <Link key={link.label} to={link.href} className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                  {link.label}
                </a>
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
              Secure Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all duration-200 hover:opacity-90 bg-mesh-gradient"
            >
              Request Access
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative z-10 pt-44 pb-32 px-8 text-center overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 bg-cyan-400/10 border border-cyan-400/25 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
          Military-Grade Encrypted Communication — Q4 2025
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-8">
          Absolute Data<br />
          <span className="bg-clip-text text-transparent bg-mesh-gradient drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            Sovereignty.
          </span>
        </h1>

        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-14 leading-relaxed font-medium">
          Stop gambling with legacy security. Protect your high-value assets with military-grade 
          <span className="text-white font-semibold"> AES-256 GCM pipelines</span> designed to eliminate data exposure.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register?plan=starter"
            className="flex items-center gap-3 border shadow-mesh-glow border-primary-cyan/30 font-bold px-9 py-4 rounded-2xl text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-mesh-glow-strong text-base bg-mesh-gradient"
          >
            Get Enterprise Access Now <ArrowRight size={18} />
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-px max-w-4xl mx-auto rounded-2xl overflow-hidden bg-white/5 border border-white/10">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center py-8 px-6 bg-mesh-dark">
              <span className="text-3xl font-black text-white mb-1">{s.value}</span>
              <span className="text-xs text-gray-500 font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <div className="relative z-10 py-10 overflow-hidden bg-white/[0.02] border-y border-white/5">
        <p className="text-center text-[10px] font-black tracking-[0.4em] text-primary-cyan/60 mb-8 uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
          Trusted by Security-Focused Organizations
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {['SOC2 Type II', 'ISO 27001', 'AES-256 GCM', 'FIPS 140-2', 'Zero-Trust Architecture'].map((badge, i) => (
            <span
              key={i}
              className="text-[10px] font-black text-gray-400 px-5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-500 hover:text-white hover:border-primary-cyan/40 hover:bg-primary-cyan/5 hover:shadow-mesh-glow uppercase tracking-widest cursor-default"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Features ─── */}
      <section id="features" className="relative z-10 py-36 px-8">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-20 text-center">
            <p className="text-[10px] font-black tracking-[0.4em] text-primary-cyan mb-4 uppercase">Infrastructure Protocol</p>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
              Uncompromising<br />
              <span className="bg-clip-text text-transparent bg-mesh-gradient drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                Defensive Strategy.
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl leading-relaxed mx-auto">Designed from first principles to neutralize threats in zero-trust environments at any scale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 bg-white/5 border border-white/10 hover:border-white/20"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${f.bg} border ${f.border}`}>
                  <f.icon size={22} className={f.color} />
                </div>
                <h3 className="text-white font-bold text-xl mb-3">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="relative z-10 py-36 px-8 bg-black/30">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-20">
            <p className="text-[10px] font-black tracking-[0.4em] text-primary-cyan mb-4 uppercase">Enterprise Tiers</p>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
              Scalable<br />
              <span className="bg-clip-text text-transparent bg-mesh-gradient drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                Security Infrastructure.
              </span>
            </h2>
            <p className="text-gray-400 text-lg">Predictable pricing. Mission-critical reliability. No hidden fees. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`flex flex-col p-0 border backdrop-blur-2xl rounded-[40px] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl relative ${plan.border} ${plan.bg}`}
              >
                {plan.highlighted && (
                  <div className="absolute top-6 right-8 px-4 py-1.5 bg-primary-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    Highly Recommended
                  </div>
                )}

                <div className="p-10 flex-1">
                  <div className={`w-16 h-16 rounded-2xl ${plan.bg} border ${plan.border} flex items-center justify-center mb-8 ${plan.color}`}>
                    <plan.icon size={32} />
                  </div>

                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{plan.name}</h3>
                  <p className="text-primary-cyan text-[10px] font-black uppercase tracking-widest mb-6">{plan.headline}</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black text-white">{plan.price}</span>
                    <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{plan.period}</span>
                  </div>
                  <p className="text-gray-400 text-[11px] leading-relaxed mb-8">{plan.desc}</p>

                  <div className="space-y-4">
                    {plan.features.map((feature, j) => (
                      <div key={j} className="flex items-start gap-4">
                        <div className={`mt-1 p-0.5 rounded-full ${plan.bg} ${plan.color}`}>
                          <CheckCircle2 size={12} strokeWidth={4} />
                        </div>
                        <span className="text-sm font-semibold text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-10 pt-0">
                  <Link
                    to={plan.linkTo}
                    className={`block w-full text-center py-5 rounded-2xl ${plan.buttonClass} font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl`}
                  >
                    {plan.cta}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact ─── */}
      <section id="contact" className="relative z-10 py-36 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 bg-white/5 border border-white/10">
            <Mail size={28} className="text-gray-400" />
          </div>
          <p className="text-[10px] font-black tracking-[0.4em] text-primary-cyan mb-5 uppercase">Expert Consultation</p>
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
            Consult a<br />
            <span className="bg-clip-text text-transparent bg-mesh-gradient drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              Security Architect.
            </span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-12">
            Have custom requirements? Our cryptographic engineering team is ready to scope your{' '}
            <span className="text-white font-semibold">deployment specifications</span> and neutralize your threat model.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/request-expert"
              className="flex items-center gap-3 font-semibold px-8 py-4 rounded-xl text-white transition-all hover:opacity-80 bg-white/5 border border-white/10"
            >
              <Mail size={16} className="text-cyan-400" /> experts@qekms.com
            </Link>
            <Link
              to="/request-expert"
              className="flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white transition-all hover:opacity-90 bg-mesh-gradient"
            >
              Consult an Expert <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-20 px-8 border-t border-white/5">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-14">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-mesh-gradient">
                <Shield size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg">QEKMS</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-sm">
              Engineering the world's most resilient cryptographic communication pipelines. Securing global intellectual property against post-quantum computational threats.
            </p>
            <div className="flex gap-3">
              {['SOC2 Type II', 'ISO 27001'].map(b => (
                <span key={b} className="text-xs text-gray-500 font-medium px-3 py-1.5 rounded-lg border border-white/10">{b}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs tracking-widest mb-6">PLATFORM</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><Link to="/register" className="hover:text-gray-300 transition-colors">Request Access</Link></li>
              <li><Link to="/status" className="hover:text-gray-300 transition-colors">Application Status</Link></li>
              <li><Link to="/login" className="hover:text-gray-300 transition-colors">Secure Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs tracking-widest mb-6">OPERATIONS</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><Link to="/request-expert?plan=sales" className="hover:text-cyan-400 transition-colors">sales@qekms.com</Link></li>
              <li><Link to="/request-expert?plan=support" className="hover:text-cyan-400 transition-colors">support@qekms.com</Link></li>
              <li className="text-gray-600">Cairo, Egypt</li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/5">
          <p className="text-gray-700 text-xs">© {new Date().getFullYear()} Quantum Encryption Key Management Systems. All rights reserved.</p>
          <div className="flex gap-8 text-xs text-gray-700">
            <Link to="/privacy" className="hover:text-gray-400 cursor-pointer transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
