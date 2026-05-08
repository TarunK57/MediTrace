import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scan, 
  Shield, 
  Link as LinkIcon, 
  Eye, 
  Thermometer, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const Landing = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [particlesReady, setParticlesReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setParticlesReady(true));
  }, []);

  const particleOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: "#3b82f6" },
      links: {
        color: "#3b82f6",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.8,
        direction: "none",
        random: true,
        outModes: { default: "bounce" },
      },
      number: { value: 80, density: { enable: true } },
      opacity: { value: 0.3 },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ 
      behavior: "smooth" 
    });
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    whileInView: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    },
    viewport: { once: true }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {particlesReady && (
        <Particles
          id="tsparticles"
          options={particleOptions}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
            pointerEvents: "none"
          }}
        />
      )}

      {/* Navbar */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-6 py-3 flex items-center gap-8 shadow-lg shadow-black/20 max-w-fit whitespace-nowrap">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
            <Shield size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">MediTrace</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</button>
          <button onClick={() => scrollToSection('contact')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Contact</button>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/scan" className="hidden sm:flex items-center gap-2 px-4 py-2 border border-white/10 rounded-full text-sm font-medium hover:bg-white/5 transition-colors">
            <Scan size={16} />
            Scan
          </Link>
          <Link to="/login" className="px-5 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
            Log in
          </Link>
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-40 bg-black pt-24 px-6 md:hidden"
        >
          <div className="flex flex-col gap-6 text-2xl font-bold">
            <button className="text-left" onClick={() => { scrollToSection('scan'); setIsMenuOpen(false); }}>Scan</button>
            <button className="text-left" onClick={() => { scrollToSection('features'); setIsMenuOpen(false); }}>Features</button>
            <button className="text-left" onClick={() => { scrollToSection('contact'); setIsMenuOpen(false); }}>Contact</button>
            <Link to="/scan" className="flex items-center gap-2 text-blue-500">Scan Now <ArrowRight /></Link>
          </div>
        </motion.div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 pt-48 pb-32 px-6 flex flex-col items-center text-center">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full" />
          <div className="absolute top-40 right-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          {...fadeIn}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold mb-8 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          VERIFIED PLATFORM
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 max-w-4xl"
        >
          Every Medicine. <br />
          Every Step. <br />
          <span className="text-blue-500">Verified.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed"
        >
          Blockchain + AI platform eliminating counterfeit drugs across India's 12 lakh pharmacies
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link to="/scan" className="px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
            Scan a Medicine <ArrowRight size={20} />
          </Link>
          <button onClick={() => scrollToSection('features')} className="px-8 py-4 bg-white/5 border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 transition-all">
            Learn More
          </button>
        </motion.div>

        {/* Floating Cards */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute hidden xl:block top-64 left-20 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-2xl max-w-[200px] text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <span className="text-xs font-bold text-red-500">CRITICAL ISSUE</span>
          </div>
          <p className="text-sm font-medium leading-tight">3,000 deaths/year · Preventable</p>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute hidden xl:block top-80 right-20 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-2xl max-w-[220px] text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Shield size={16} className="text-blue-500" />
            </div>
            <span className="text-xs font-bold text-blue-500">PROTECTION</span>
          </div>
          <p className="text-sm font-medium leading-tight">12 Lakh · Pharmacies Protected</p>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 py-20 overflow-hidden">
        <motion.div 
          {...fadeIn}
          className="max-w-5xl mx-auto bg-white rounded-[40px] p-8 md:p-16 flex flex-wrap justify-between items-center gap-12 text-black"
        >
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-black tracking-tighter">20%</span>
            <p className="text-gray-500 font-medium leading-tight max-w-[150px]">World's Generic Medicines (India produces)</p>
          </div>
          <div className="w-px h-16 bg-gray-200 hidden lg:block" />
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-black tracking-tighter">35%</span>
            <p className="text-gray-500 font-medium leading-tight max-w-[150px]">Counterfeit Drugs Originate Here</p>
          </div>
          <div className="w-px h-16 bg-gray-200 hidden lg:block" />
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-black tracking-tighter">3,000</span>
            <p className="text-gray-500 font-medium leading-tight max-w-[150px]">Annual Deaths Preventable</p>
          </div>
          <div className="w-px h-16 bg-gray-200 hidden lg:block" />
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-black tracking-tighter">12L</span>
            <p className="text-gray-500 font-medium leading-tight max-w-[150px]">Pharmacies to Protect</p>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-32 max-w-7xl mx-auto">
        <motion.div 
          {...fadeIn}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Everything you need in <br />one unified platform.</h2>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[
            { title: "On-Chain Drug Identity", icon: <Shield size={32} />, desc: "Immutable cryptographic identity for every medicine batch produced." },
            { title: "Living Chain of Custody", icon: <LinkIcon size={32} />, desc: "Real-time tracking from factory gates to pharmacy shelves." },
            { title: "AI Forgery Detection", icon: <Eye size={32} />, desc: "Computer vision algorithms detecting packaging inconsistencies instantly." },
            { title: "Cold Chain Monitor", icon: <Thermometer size={32} />, desc: "Smart IoT integration monitoring temperature-sensitive vaccines." },
            { title: "ADR Pharmacovigilance", icon: <AlertTriangle size={32} />, desc: "Community-driven reporting for adverse drug reactions." },
            { title: "Expiry Intelligence", icon: <Clock size={32} />, desc: "Automated alerts for near-expiry and expired medications." }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              variants={fadeIn}
              whileHover={{ y: -10, borderColor: "rgba(59, 130, 246, 0.5)" }}
              className="backdrop-blur-sm bg-white/5 border border-white/10 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it Works */}
      <section id="scan" className="relative z-10 px-6 py-32 bg-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.h2 {...fadeIn} className="text-4xl md:text-5xl font-black tracking-tighter mb-20">How it Works</motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connection Lines */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 hidden md:block -translate-y-1/2 -z-10" />
            
            {[
              { step: "01", title: "Scan QR Code", desc: "Use the MediTrace app to scan the specialized security QR on medicine packaging." },
              { step: "02", title: "Verify on Blockchain", desc: "Our system cross-references the unique ID with the immutable manufacturer record." },
              { step: "03", title: "Get Instant Result", desc: "Receive real-time verification of authenticity, expiry, and storage conditions." }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="bg-black p-8 rounded-3xl border border-white/10"
              >
                <div className="text-blue-500 text-6xl font-black mb-6 opacity-20">{item.step}</div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer id="contact" className="relative z-10 px-6 pt-32 pb-12 overflow-hidden border-t border-white/10">
        {/* Watermark */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[20vw] font-black text-white/[0.03] select-none pointer-events-none whitespace-nowrap">
          MediTrace
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="lg:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-6">
                <Shield size={32} className="text-blue-600" />
                <span className="text-2xl font-black">MediTrace</span>
              </Link>
              <p className="text-gray-400 leading-relaxed mb-8 max-w-sm">
                Eliminating counterfeit medications in India through blockchain transparency and AI-driven verification.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <Shield size={18} />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <Scan size={18} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Platform</h4>
              <ul className="flex flex-col gap-4 text-gray-400">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('scan')} className="hover:text-white transition-colors">How it works</button></li>
                <li><Link to="/scan" className="hover:text-white transition-colors">Verify Medicine</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Partner Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Resources</h4>
              <ul className="flex flex-col gap-4 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Contact</h4>
              <ul className="flex flex-col gap-4 text-gray-400">
                <li className="flex items-center gap-2 underline">contact@meditrace.io</li>
                <li>Bengaluru, KA</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© 2026 MediTrace. All rights reserved.</p>
            <div className="flex gap-8">
              <span>All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
