import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Globe, Cpu, Check, ArrowRight, X, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const UpgradePage = () => {
    const plans = [
        {
            name: 'Starter',
            price: 'Open',
            duration: 'Standard Node',
            features: [
                'Up to 10 Channels',
                '100 Encryptions / month',
                'Max 5 users per channel',
                'File upload limit: 10 MB',
                'Standard encryption priority',
                'Basic audit logs',
                'Email support'
            ],
            icon: Shield,
            color: 'text-gray-400',
            border: 'border-white/10',
            bg: 'bg-white/5',
            current: true
        },
        {
            name: 'Professional',
            price: 'Complimentary',
            duration: 'Enterprise Node',
            popular: true,
            features: [
                'Up to 50 Channels',
                '500 Encryptions / month',
                'Max 20 users per channel',
                'File upload limit: 50 MB',
                'High-priority processing',
                'Advanced audit logs',
                'Real-time notifications',
                'Priority support'
            ],
            icon: Zap,
            color: 'text-primary-cyan',
            border: 'border-primary-cyan/30',
            bg: 'bg-primary-cyan/10',
            button: 'bg-primary-cyan text-black hover:bg-white shadow-primary-cyan/20'
        },
        {
            name: 'Enterprise',
            price: 'Provisioned',
            duration: 'Infrastructure Scale',
            features: [
                'Unlimited Channels',
                'Unlimited Encryptions',
                'Unlimited users per channel',
                'File limit: 250 MB+',
                'Mission-critical priority',
                'Full audit & compliance',
                'Quantum key resources',
                '24/7 Premium support'
            ],
            icon: Globe,
            color: 'text-violet-500',
            border: 'border-violet-500/30',
            bg: 'bg-violet-500/10',
            button: 'bg-violet-500 text-white hover:bg-white hover:text-black shadow-violet-500/20'
        }
    ];

    return (
        <div className="font-sans min-h-screen bg-mesh-dark text-white p-8 md:p-12 relative overflow-hidden">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-200px] right-[-200px] w-[800px] h-[800px] rounded-full bg-primary-cyan/5 blur-[120px]" />
                <div className="absolute bottom-[-200px] left-[-200px] w-[800px] h-[800px] rounded-full bg-violet-600/5 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-16">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-mesh-gradient flex items-center justify-center shadow-mesh-glow">
                            <Lock size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight uppercase">Clearance Upgrade</h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Scale your quantum communication capacity</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="text-center mb-20">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter mb-6"
                    >
                        Secure Your <span className="text-primary-cyan">Expansion</span>
                    </motion.h2>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg font-medium leading-relaxed uppercase tracking-widest text-xs">
                        Select a higher clearance tier to unlock additional mesh nodes and hardware-hardened encryption protocols.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className={`relative h-full flex flex-col p-0 border ${plan.border} ${plan.bg} backdrop-blur-2xl rounded-[40px] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl`}>
                                {plan.popular && (
                                    <div className="absolute top-6 right-8 px-4 py-1.5 bg-primary-cyan text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                        Highly Recommended
                                    </div>
                                )}
                                
                                <div className="p-10 flex-1">
                                    <div className={`w-16 h-16 rounded-2xl ${plan.bg} border ${plan.border} flex items-center justify-center mb-8 ${plan.color}`}>
                                        <plan.icon size={32} />
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline gap-2 mb-8">
                                        <span className="text-5xl font-black text-white">{plan.price}</span>
                                        <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{plan.duration}</span>
                                    </div>

                                    <div className="space-y-4">
                                        {plan.features.map((feature, fIdx) => (
                                            <div key={fIdx} className="flex items-start gap-4">
                                                <div className={`mt-1 p-0.5 rounded-full ${plan.bg} ${plan.color}`}>
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                                <span className="text-sm font-semibold text-gray-300">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-10 pt-0">
                                    {plan.current ? (
                                        <div className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-gray-500 text-center font-black uppercase tracking-widest text-[11px]">
                                            Current Clearance Level
                                        </div>
                                    ) : (
                                        <button className={`w-full py-5 rounded-2xl ${plan.button} font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl`}>
                                            Unlock Access
                                            <ArrowRight size={16} />
                                        </button>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-24 p-12 rounded-[40px] border border-white/5 bg-white/[0.01] backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400">
                            <Globe size={32} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-white uppercase tracking-tight mb-1">Global Expansion</h4>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Looking for custom mesh deployments or localized node hosting?</p>
                        </div>
                    </div>
                    <button className="px-10 py-5 rounded-2xl border border-white/10 hover:border-white/30 text-white font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-3">
                        Contact Mesh Control
                    </button>
                </div>
                
                <div className="mt-12 text-center text-gray-600 text-[9px] font-bold uppercase tracking-widest">
                    Authorized Encryption Clearance • Subject to Terms of Service • QEKMS Protocol v1.4.2
                </div>
            </div>
        </div>
    );
};

export default UpgradePage;
