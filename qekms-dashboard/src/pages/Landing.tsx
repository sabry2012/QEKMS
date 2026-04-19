import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Lock, Key, Users, Zap, CheckCircle2,
  ArrowRight, Mail, Globe, Cpu, ChevronRight, Star
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Status', href: '/status', isRoute: true },
  { label: 'Contact', href: '#contact' },
];

const FEATURES = [
  {
    icon: Lock,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    title: 'End-to-End Encryption',
    desc: 'AES-256 GCM encryption ensures data never exists in plaintext. Only verified endpoints with valid quantum keys can decrypt.',
  },
  {
    icon: Cpu,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
    title: 'Quantum Key Distribution',
    desc: 'QKD principles via Aer simulation inject true quantum unpredictability into every symmetric key generated on the mesh.',
  },
  {
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    title: 'Isolated Channel Mesh',
    desc: 'Every communication tunnel is mathematically segmented. Cross-channel data leakage is impossible by cryptographic design.',
  },
  {
    icon: Users,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    title: 'Centralized Admin Control',
    desc: 'Revoke, audit, and govern every node in real time. Blacklist compromised identities instantly across the entire collective.',
  },
  {
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
    title: 'Zero-Latency Handshakes',
    desc: 'Quantum-hardened handshake protocol completes in under 200ms. No perceptible delay — just security at full speed.',
  },
  {
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    title: 'SOC2 / ISO 27001 Ready',
    desc: 'Full audit trail, immutable ledger, and policy controls required by enterprise compliance standards worldwide.',
  },
];

const STATS = [
  { value: '256-bit', label: 'Quantum Cipher Grade' },
  { value: '99.99%', label: 'Uptime SLA' },
  { value: '<200ms', label: 'Handshake Latency' },
  { value: '∞', label: 'Key Rotations' },
];

const PLANS = [
  {
    name: 'Professional',
    price: '$500',
    period: '/month',
    desc: 'For focused institutional security teams.',
    features: [
      '50 Dedicated Encrypted Channels',
      '500 AES-256 Quantum Keys / mo',
      '20 MB Secure File Transfer',
      'Audit Log Access',
      'Email Support',
    ],
    cta: 'Request Professional',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    price: '$1,000',
    period: '/month',
    desc: 'Unlimited scale for multinational governmental infrastructure.',
    features: [
      'Infinite Dedicated Channels',
      'Infinite Encryption Key Generation',
      'Unlimited File Transfer',
      'SAML / SSO Integrations',
      '24/7 Rapid Cryptographic Support',
      'Dedicated Node Engineer',
    ],
    cta: 'Request Enterprise',
    highlighted: true,
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
      </div>

      {/* ─── Navigation ─── */}
      <header className="fixed top-0 w-full z-50 bg-mesh-dark/80 backdrop-blur-xl border-b border-white/5">
        <nav className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
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
      <section className="relative z-10 pt-44 pb-32 px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10 text-xs font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/25">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Military-Grade Encrypted Communication — Q4 2025 Platform
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-8">
          Quantum-Secure<br />
          <span className="bg-clip-text text-transparent bg-mesh-gradient">
            For Enterprises.
          </span>
        </h1>

        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-14 leading-relaxed font-medium">
          Protecting high-value communications against future cryptographic threats.
          Your operational data — encapsulated inside isolated{' '}
          <span className="text-white font-semibold">AES-256 GCM pipelines</span>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="flex items-center gap-3 border shadow-mesh-glow border-primary-cyan/30 font-bold px-9 py-4 rounded-2xl text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-mesh-glow-strong text-base bg-mesh-gradient"
          >
            Get Enterprise Access <ArrowRight size={18} />
          </Link>
          <a
            href="#pricing"
            className="flex items-center gap-2 font-semibold px-9 py-4 rounded-2xl text-gray-300 hover:text-white transition-all duration-200 text-base bg-white/5 border border-white/10"
          >
            View Pricing <ChevronRight size={16} />
          </a>
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
      <div className="relative z-10 py-8 overflow-hidden bg-white/5 border-y border-white/5">
        <p className="text-center text-xs font-bold tracking-[0.3em] text-gray-600 mb-6">TRUSTED BY SECURITY-FOCUSED ORGANIZATIONS</p>
        <div className="flex flex-wrap items-center justify-center gap-10">
          {['SOC2 Type II', 'ISO 27001', 'AES-256 GCM', 'FIPS 140-2', 'Zero-Trust Architecture'].map((badge, i) => (
            <span key={i} className="text-xs font-bold text-gray-500 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Features ─── */}
      <section id="features" className="relative z-10 py-36 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <p className="text-xs font-bold tracking-[0.3em] text-cyan-500 mb-4">INFRASTRUCTURE PROTOCOL</p>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-6">Uncompromising<br />Architecture.</h2>
            <p className="text-gray-400 text-lg max-w-xl leading-relaxed">Designed from first principles to operate in adversarial, zero-trust environments at any scale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-xs font-bold tracking-[0.3em] text-violet-400 mb-4">ENTERPRISE TIERS</p>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-6">Transparent<br />Enterprise Licensing.</h2>
            <p className="text-gray-400 text-lg">Simple scaling. Immediate provisioning post-approval.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-10 flex flex-col h-full relative ${
                  plan.highlighted 
                    ? 'bg-primary-cyan/5 border border-primary-cyan/30 shadow-[0_0_60px_rgba(6,182,212,0.07)]' 
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-mesh-gradient">
                      <Star size={11} fill="white" /> MOST SELECTED
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-black text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-500 text-sm">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-2 mb-10 pb-10 border-b border-white/10">
                  <span className="text-6xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm font-medium">{plan.period}</span>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-gray-300">
                      <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`block w-full text-center font-bold py-4 rounded-xl transition-all duration-200 ${
                    plan.highlighted
                      ? 'bg-mesh-gradient text-white hover:opacity-90'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {plan.cta}
                </Link>
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
          <p className="text-xs font-bold tracking-[0.3em] text-gray-500 mb-5">GET IN TOUCH</p>
          <h2 className="text-5xl font-black tracking-tight text-white mb-6">Contact Cybersecurity Sales.</h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-12">
            Have custom requirements? Our cryptographic engineering team is ready to scope your{' '}
            <span className="text-white font-semibold">deployment specifications</span> and threat model.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:sales@qekms.com"
              className="flex items-center gap-3 font-semibold px-8 py-4 rounded-xl text-white transition-all hover:opacity-80 bg-white/5 border border-white/10"
            >
              <Mail size={16} className="text-cyan-400" /> sales@qekms.com
            </a>
            <a
              href="mailto:sales@qekms.com"
              className="flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white transition-all hover:opacity-90 bg-mesh-gradient"
            >
              Submit Inquiry <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-20 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-14">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-mesh-gradient">
                <Shield size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg">QEKMS</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-sm">
              Engineering the world's most resilient cryptographic communication pipelines. Securing enterprise intellectual property against post-quantum computational threats.
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
              <li><a href="mailto:sales@qekms.com" className="hover:text-cyan-400 transition-colors">sales@qekms.com</a></li>
              <li><a href="mailto:support@qekms.com" className="hover:text-cyan-400 transition-colors">support@qekms.com</a></li>
              <li className="text-gray-600">Cairo, Egypt</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/5">
          <p className="text-gray-700 text-xs">© {new Date().getFullYear()} Quantum Encryption Key Management Systems. All rights reserved.</p>
          <div className="flex gap-8 text-xs text-gray-700">
            <span className="hover:text-gray-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
