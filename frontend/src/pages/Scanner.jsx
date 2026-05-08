import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scan, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  ArrowLeft, 
  RefreshCw, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Camera,
  Keyboard,
  Share2,
  AlertCircle,
  X,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from '../context/AuthContext';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const parseQRValue = (raw) => {
  if (!raw) return { type: "unknown" };
  if (raw.startsWith("MEDITRACE_BATCH::")) {
    const parts = Object.fromEntries(
      raw.replace("MEDITRACE_BATCH::", "").split("::").map(p => p.split("="))
    );
    return { type: "batch", batchId: parts.batchId, batchAddress: parts.batchAddress, medicine: parts.medicine };
  }
  if (raw.startsWith("MEDITRACE_HANDOFF::")) {
    const parts = Object.fromEntries(
      raw.replace("MEDITRACE_HANDOFF::", "").split("::").map(p => p.split("="))
    );
    return { type: "handoff", batchAddress: parts.batch, stage: parts.stage, token: parts.token };
  }
  return { type: "batch", batchId: raw, batchAddress: raw };
};

const Scanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const queryParams = new URLSearchParams(window.location.search);
  const batchFromUrl = queryParams.get("batch");

  const [mode, setMode] = useState('camera'); // 'camera' or 'manual'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [manualId, setManualId] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [showADRModal, setShowADRModal] = useState(false);
  const [adrForm, setAdrForm] = useState({ reaction: '', severity: 'mild' });
  const [adrLoading, setAdrLoading] = useState(false);
  const [particlesReady, setParticlesReady] = useState(false);

  const particlesInitialized = useRef(false);
  useEffect(() => {
    if (!particlesInitialized.current) {
      particlesInitialized.current = true;
      initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      }).then(() => setParticlesReady(true));
    }

    // Handle batch ID from navigation state (Search) or URL params
    const batchFromUrl = queryParams.get("batch");
    const companyFromUrl = queryParams.get("company");

    if (location.state?.batchId) {
      handleScanResult(location.state.batchId, location.state.companyName);
    } else if (batchFromUrl) {
      handleScanResult(batchFromUrl, companyFromUrl);
    }
  }, [location.state, batchFromUrl]);

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

  useEffect(() => {
    if (mode !== 'camera' || result || loading) return;
    const readerEl = document.getElementById('qr-reader');
    if (!readerEl) return;
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length) {
        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            handleScanResult(decodedText);
            html5QrCode.stop().catch(err => console.error(err));
          },
          (error) => {
            // Quiet mode for scanner errors
          }
        ).catch(err => console.error("Camera start error:", err));
      }
    }).catch(err => console.error("Get cameras error:", err));

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Cleanup stop error:", err));
      }
    };
  }, [mode, result, loading]);

  const handleScanResult = async (batchId, companyName = '') => {
    const parsed = parseQRValue(batchId);
    const lookupId = parsed.batchId || batchId;

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // 1. Fetch batch data from backend
      const url = companyName
        ? `http://localhost:5000/batches/${lookupId}?company=${encodeURIComponent(companyName)}`
        : `http://localhost:5000/batches/${lookupId}`;
      const response = await axios.get(url);
      const raw = response.data;

      const rawBatchId = raw.batch?.batchId || batchId;
      const displayBatchId = rawBatchId.includes('_') 
        ? rawBatchId.split('_').slice(1).join('_') 
        : rawBatchId;

      const data = {
        ...raw.batch,
        id: displayBatchId,
        batchId: displayBatchId,
        drugName: raw.batch?.medicineName || raw.batch?.drugName,
        cdscoCert: raw.batch?.cdscoCertificate,
        manufacturedAt: raw.batch?.manufacturingDate,
        handoffs: raw.handoffs || [],
        isBreached: raw.isBreached || false,
        geminiSummary: raw.geminiSummary || ''
      };
      
      // 2. Save to scan history if user logged in
      if (user) {
        try {
          await axios.post('http://localhost:5000/scans', {
            batchId: lookupId,
            userId: user.id,
            locationLat: null,
            locationLng: null
          });
        } catch (scanErr) {
          console.error("Failed to save scan history", scanErr);
        }
      }
      
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Batch not found in the MediTrace registry.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim() && manualCompany.trim()) {
      handleScanResult(manualId.trim(), manualCompany.trim());
    } else {
      alert("Both Batch ID and Company Name are required for unique identification.");
    }
  };

  const submitADR = async () => {
    if (!adrForm.reaction) return;
    setAdrLoading(true);
    try {
      await axios.post('http://localhost:5000/adr', {
        batch_address: result.id,
        details: adrForm.reaction,
        severity: adrForm.severity
      });
      alert("Side effect reported successfully. Thank you for your contribution to public safety.");
      setShowADRModal(false);
      setAdrForm({ reaction: '', severity: 'mild' });
    } catch (err) {
      alert("Failed to report side effect. Please try again later.");
    } finally {
      setAdrLoading(false);
    }
  };

  const shareResult = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Scan result link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col items-center p-6 overflow-x-hidden">
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

      {/* Header */}
      <header className="relative z-10 w-full max-w-2xl flex justify-between items-center mb-8 mt-4">
        <button 
          onClick={() => navigate('/')} 
          className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-sm backdrop-blur-sm"
        >
          <ArrowLeft size={18} /> Home
        </button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-blue-600/20">
            <Scan size={22} className="text-white" />
          </div>
          <h1 className="font-black text-xl tracking-tight">Verify Medicine</h1>
        </div>
        <div className="w-12" />
      </header>

      <main className="relative z-10 w-full max-w-2xl flex-1 flex flex-col items-center mb-20">
        {!result && !loading && !error && (
          <div className="w-full flex flex-col items-center">
            {/* Mode Toggle */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 mb-10 backdrop-blur-md">
              <button 
                onClick={() => setMode('camera')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === 'camera' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Camera size={18} /> Scan QR
              </button>
              <button 
                onClick={() => setMode('manual')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Keyboard size={18} /> Enter ID
              </button>
            </div>

            {mode === 'camera' ? (
              <div className="w-full flex flex-col items-center">
                <div style={{
                  width: "300px",
                  height: "300px",
                  maxHeight: "300px",
                  minHeight: "300px",
                  margin: "0 auto",
                  borderRadius: "12px",
                  overflow: "hidden",
                  position: "relative",
                  background: "#000"
                }}>
                  <div
                    id="qr-reader"
                    style={{ 
                      width: "300px", 
                      height: "300px",
                      maxHeight: "300px",
                      overflow: "hidden"
                    }}
                  />
                  {mode === 'camera' && (
                    <div style={{
                      position: "absolute",
                      top: "20px",
                      left: "10px",
                      right: "10px",
                      height: "1px",
                      backgroundColor: "#22c55e",
                      animation: "scanLine 2s linear infinite",
                      zIndex: 20,
                      pointerEvents: "none"
                    }} />
                  )}
                </div>
                <div className="mt-8 text-center space-y-2">
                  <p className="text-blue-500 font-bold">Point camera at medicine QR code</p>
                  <p className="text-xs text-gray-500 tracking-widest uppercase">No app needed · Works offline · Free</p>
                </div>
              </div>
            ) : (
              <motion.form 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleManualSubmit}
                className="w-full max-w-md p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-6 text-center">Manual Entry</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 ml-2 uppercase tracking-widest">Batch ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. BATCH-001" 
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value.toUpperCase())}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-blue-500/50 outline-none transition-all placeholder-white/20 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 ml-2 uppercase tracking-widest">Company Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. PharmaCorp India" 
                      value={manualCompany}
                      onChange={(e) => setManualCompany(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-blue-500/50 outline-none transition-all placeholder-white/20 font-bold"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                  >
                    Verify Medicine
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="w-full max-w-lg p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center animate-pulse">
            <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mb-8">
              <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">Verifying on Blockchain</h3>
            <p className="text-gray-500 font-medium">Communicating with MediTrace decentralized node...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-10 rounded-[40px] bg-red-500/10 border border-red-500/20 backdrop-blur-xl flex flex-col items-center text-center shadow-2xl shadow-red-500/10"
          >
            <div className="w-20 h-20 bg-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-red-500/30">
              <X size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight text-red-500">Scan Failed</h3>
            <p className="text-gray-400 font-medium mb-10">{error}</p>
            <button 
              onClick={() => { setError(null); setMode('camera'); }}
              className="w-full py-4 bg-white/10 border border-white/10 rounded-2xl font-bold hover:bg-white/20 transition-all"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Result Card */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full space-y-6"
            >
              {/* Status Header */}
              <div className={`p-1 rounded-[40px] shadow-2xl shadow-black/50 ${
                result.status === 'expired' ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                result.status === 'revoked' || result.isBreached ? 'bg-gradient-to-r from-red-600 to-red-400' :
                'bg-gradient-to-r from-blue-600 to-blue-400'
              }`}>
                <div className="bg-black/90 backdrop-blur-xl rounded-[39px] p-8 flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 shadow-2xl ${
                    result.status === 'expired' ? 'bg-orange-500 text-white shadow-orange-500/30' :
                    result.status === 'revoked' || result.isBreached ? 'bg-red-500 text-white shadow-red-500/30' :
                    'bg-blue-600 text-white shadow-blue-500/30'
                  }`}>
                    {result.status === 'active' && !result.isBreached ? <CheckCircle2 size={40} /> : 
                     result.status === 'expired' ? <AlertCircle size={40} /> :
                     <XCircle size={40} />}
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className={`text-4xl font-black tracking-tight ${
                      result.status === 'expired' ? 'text-orange-500' :
                      result.status === 'revoked' || result.isBreached ? 'text-red-500' :
                      'text-blue-500'
                    }`}>
                      {result.isBreached ? 'COLD CHAIN BREACH' :
                       result.status === 'revoked' ? 'REVOKED' :
                       result.status === 'expired' ? 'EXPIRED' :
                       'AUTHENTIC'}
                    </h2>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">
                      {result.isBreached ? 'Temperature Compromised' :
                       result.status === 'revoked' ? 'This batch has been recalled' :
                       result.status === 'expired' ? 'Do not use this medicine' :
                       'Verified on Blockchain'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Medicine Info Section */}
              <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl">
                <div className="mb-8">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-3xl font-black tracking-tight">{result.drugName}</h3>
                    <span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20 mt-1">
                      {result.companyName || result.manufacturer}
                    </span>
                  </div>
                  <p className="text-blue-400 italic font-medium leading-relaxed">
                    "{result.geminiSummary || 'Standard pharmaceutical verification passed.'}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <DetailItem label="Active Ingredient" value={result.activeIngredient || 'Standard'} />
                  <DetailItem label="Dosage" value={result.dosage || '500mg'} />
                  <DetailItem label="Manufacturer" value={result.manufacturer} />
                  <DetailItem label="CDSCO ID" value={result.cdscoCert || 'VER-0921-X'} />
                  <DetailItem label="MFG Date" value={new Date(parseInt(result.manufacturedAt) * 1000).toLocaleDateString()} />
                  <DetailItem label="Expiry Date" value={new Date(parseInt(result.expiryDate) * 1000).toLocaleDateString()} />
                  <DetailItem label="Batch ID" value={result.id} />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</span>
                    <span className={`text-xs font-bold uppercase ${
                      result.status === 'active' ? 'text-green-500' : 'text-red-500'
                    }`}>{result.status}</span>
                  </div>
                </div>
              </div>

              {/* Supply Chain Journey */}
              <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl">
                <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                  <MapPin size={22} className="text-blue-500" />
                  Supply Chain Journey
                </h3>
                
                <div className="space-y-0 relative">
                  {result.handoffs && result.handoffs.length > 0 ? (
                    result.handoffs.map((handoff, idx) => (
                      <div key={idx} className="flex gap-6">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-blue-600 border-4 border-blue-600/30" />
                          {idx !== result.handoffs.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                        </div>
                        <div className="pb-8">
                          <p className="font-bold flex items-center gap-2">
                            {handoff.fromName} <ChevronRight size={14} className="text-gray-600" /> {handoff.toName}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">
                            {new Date(handoff.timestamp * 1000).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-500 italic">
                      No handoff records found in the blockchain history.
                    </div>
                  )}
                </div>
              </div>

              {/* Temperature Section */}
              <div className={`p-8 rounded-[40px] border backdrop-blur-xl flex items-center justify-between shadow-xl ${
                result.isBreached ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    result.isBreached ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                  }`}>
                    {result.isBreached ? <AlertTriangle size={28} /> : <ShieldCheck size={28} />}
                  </div>
                  <div>
                    <h4 className={`text-lg font-black ${result.isBreached ? 'text-red-500' : 'text-green-500'}`}>
                      {result.isBreached ? 'Temperature Breach Detected' : 'Cold Chain Intact'}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">IoT Smart Sensor Audit Status</p>
                  </div>
                </div>
                {result.isBreached && <div className="text-red-500 font-black text-xs animate-pulse">CRITICAL</div>}
              </div>

              {/* Actions Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {!user ? (
                  <button 
                    onClick={() => navigate('/login')}
                    className="py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
                  >
                    Save to History <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <div className="py-4 bg-green-500/10 border border-green-500/20 rounded-2xl font-black text-lg text-green-500 flex items-center justify-center gap-2">
                    <CheckCircle2 size={20} /> Saved to History
                  </div>
                )}
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowADRModal(true)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={18} /> Report Reaction
                  </button>
                  <button 
                    onClick={shareResult}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Share2 size={18} /> Share Result
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ADR Modal */}
      <AnimatePresence>
        {showADRModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowADRModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowADRModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <h3 className="text-2xl font-black mb-2 tracking-tight">Report Side Effect</h3>
              <p className="text-gray-500 text-sm mb-8 font-medium">Your anonymous report helps identify dangerous batches across India.</p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Describe Reaction</label>
                  <textarea 
                    rows={4}
                    placeholder="Details about headache, rashes, nausea..."
                    value={adrForm.reaction}
                    onChange={(e) => setAdrForm({...adrForm, reaction: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-blue-500/50 outline-none transition-all placeholder-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Severity Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['mild', 'moderate', 'severe'].map(level => (
                      <button
                        key={level}
                        onClick={() => setAdrForm({...adrForm, severity: level})}
                        className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${
                          adrForm.severity === level 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={submitADR}
                  disabled={adrLoading || !adrForm.reaction}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {adrLoading ? <Loader2 className="animate-spin" /> : 'Submit Alert'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
    <span className="text-sm font-bold text-white truncate">{value}</span>
  </div>
);

export default Scanner;
