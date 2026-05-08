import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Plus, 
  Package, 
  QrCode, 
  AlertTriangle, 
  BarChart, 
  LogOut, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2, 
  XCircle, 
  Menu, 
  X,
  User,
  Users,
  FileText,
  Activity,
  ChevronRight,
  Download,
  Clock,
  Loader2,
  Trash2,
  ShieldAlert,
  Calendar,
  Layers,
  MapPin
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../config/supabase';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { QRCodeCanvas as QRCode } from "qrcode.react";

const Admin = () => {
  const { user, profile, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // 1. ALL useState declarations
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [particlesReady, setParticlesReady] = useState(false);
  
  // Data states
  const [stats, setStats] = useState({ scans: 0, users: 0, alerts: 0, prescriptions: 0, reports: 0 });
  const [alerts, setAlerts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [alertFilter, setAlertFilter] = useState('unresolved'); // 'all', 'unresolved', 'resolved'

  // Form states
  const [mintForm, setMintForm] = useState({
    batch_id: '',
    drug_name: '',
    active_ingredient: '',
    dosage: '',
    manufacturer_name: '',
    company_name: '',
    cdsco_cert: '',
    mfg_date: '',
    exp_date: ''
  });
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState(null);

  const [handoffForm, setHandoffForm] = useState({
    batch_address: '',
    count: 4,
    stages: {
      manufacturer: true,
      cnf_agent: false,
      stockist: false,
      pharmacy: false
    }
  });
  const [isGeneratingHandoff, setIsGeneratingHandoff] = useState(false);
  const [handoffResults, setHandoffResults] = useState([]);

  // 2. Auth Protection Logic
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // 3. Particles Engine
  const particlesInitialized = useRef(false);
  useEffect(() => {
    if (!particlesInitialized.current) {
      particlesInitialized.current = true;
      initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      }).then(() => setParticlesReady(true));
    }
  }, []);

  // 4. ALL useCallback hooks
  const authFetch = useCallback(async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
  }, []);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, batchesRes] = await Promise.all([
        authFetch('http://localhost:5000/admin/stats'),
        authFetch('http://localhost:5000/admin/alerts'),
        authFetch('http://localhost:5000/admin/batches')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (user && profile?.role === 'admin') fetchAdminData();
  }, [user, profile, fetchAdminData]);

  // 5. Action Handlers
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleMintBatch = async (e) => {
    e.preventDefault();
    setIsMinting(true);
    setMintResult(null);
    try {
      const payload = {
        batchId: mintForm.batch_id,
        medicineName: mintForm.drug_name,
        activeIngredient: mintForm.active_ingredient,
        dosage: mintForm.dosage,
        manufacturer: mintForm.manufacturer_name,
        companyName: mintForm.company_name || mintForm.manufacturer_name,
        cdscoCertificate: mintForm.cdsco_cert,
        manufacturingDate: Math.floor(new Date(mintForm.mfg_date).getTime() / 1000),
        expiryDate: Math.floor(new Date(mintForm.exp_date).getTime() / 1000)
      };

      const res = await authFetch('http://localhost:5000/batches/mint', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        setMintResult({
          success: true,
          hash: data.txHash,
          batchId: mintForm.batch_id,
          batchAddress: data.onChainBatchId,
          medicineName: mintForm.drug_name,
          companyName: mintForm.company_name || mintForm.manufacturer_name
        });
        fetchAdminData();
      } else {
        throw new Error(data.error || "Minting failed");
      }
    } catch (err) {
      setMintResult({ success: false, error: err.message });
    } finally {
      setIsMinting(false);
    }
  };

  const handleGenerateHandoff = async (e, extraLabels = []) => {
    if (e) e.preventDefault();
    setIsGeneratingHandoff(true);
    try {
      const activeStages = Object.keys(handoffForm.stages).filter(s => handoffForm.stages[s]);
      if (activeStages.length === 0) throw new Error("Select at least one stage");

      const res = await authFetch('http://localhost:5000/handoffs/generate-qr', {
        method: 'POST',
        body: JSON.stringify({
          batchAddress: handoffForm.batch_address,
          count: handoffForm.count,
          stages: activeStages,
          extraLabels: extraLabels
        })
      });
      const data = await res.json();
      console.log("Handoff Data:", data);
      if (res.ok) {
        setHandoffResults(data.tokens || []);
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGeneratingHandoff(false);
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      const res = await authFetch(`http://localhost:5000/admin/alerts/${id}/resolve`, { method: 'PUT' });
      if (res.ok) fetchAdminData();
    } catch (err) { alert("Failed to resolve alert"); }
  };

  const handleRevokeBatch = async (batchId) => {
    if (!window.confirm("Are you sure you want to revoke this batch? This action is permanent.")) return;
    try {
      const res = await authFetch(`http://localhost:5000/batches/${batchId}/revoke`, { method: 'POST' });
      if (res.ok) fetchAdminData();
    } catch (err) { alert("Failed to revoke batch"); }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm("Remove this revoked batch from your inventory? It remains on the blockchain.")) return;
    try {
      const res = await authFetch(`http://localhost:5000/batches/${batchId}`, { method: 'DELETE' });
      if (res.ok) fetchAdminData();
    } catch (err) {
      alert("Failed to remove batch");
    }
  };

  // 6. UI Helpers
  const particleOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: "#3b82f6" },
      links: { color: "#3b82f6", distance: 150, enable: true, opacity: 0.1, width: 1 },
      move: { enable: true, speed: 0.5, direction: "none", random: true, outModes: { default: "bounce" } },
      number: { value: 50, density: { enable: true } },
      opacity: { value: 0.2 },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  };

  // 7. Render Protection
  if (authLoading) return <LoadingScreen message="Verifying Identity..." />;
  if (!user) return null;
  if (profile?.role !== 'admin') return <AccessDenied />;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex relative overflow-hidden">
      {particlesReady && (
        <Particles id="tsparticles" options={particleOptions} className="absolute inset-0 z-0 pointer-events-none" />
      )}

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-6 right-6 z-50 p-3 bg-blue-600 rounded-2xl shadow-xl text-white"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-40 w-72 h-screen border-r border-white/5 bg-black/40 backdrop-blur-3xl p-8 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-red-600/20">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <h1 className="font-black text-2xl tracking-tighter">MediTrace <span className="text-[10px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded-full ml-1">ADMIN</span></h1>
        </div>

        <div className="mb-10 px-2 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-black text-xl">
            A
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-sm truncate">System Admin</p>
            <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest">{user?.email}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavBtn icon={<LayoutDashboard size={20} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavBtn icon={<Plus size={20} />} label="Mint Batch" active={activeTab === 'mint'} onClick={() => setActiveTab('mint')} />
          <NavBtn icon={<Package size={20} />} label="Manage Batches" active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} />
          <NavBtn icon={<QrCode size={20} />} label="Supply Chain QRs" active={activeTab === 'handoff'} onClick={() => setActiveTab('handoff')} />
          <NavBtn icon={<AlertTriangle size={20} />} label="Alerts" active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} />
          <NavBtn icon={<BarChart size={20} />} label="Statistics" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-6 py-4 w-full rounded-2xl text-gray-400 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-bold group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-12 relative z-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading && activeTab !== 'mint' && activeTab !== 'handoff' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="animate-spin text-red-600 mb-4" size={48} />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Accessing Neural Ledger...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto"
            >
              {activeTab === 'overview' && <OverviewTab stats={stats} alerts={alerts} onResolve={handleResolveAlert} />}
              {activeTab === 'mint' && (
                <MintTab 
                  form={mintForm} 
                  setForm={setMintForm} 
                  onSubmit={handleMintBatch} 
                  loading={isMinting} 
                  result={mintResult}
                  onGoToHandoff={() => {
                    setHandoffForm({...handoffForm, batch_address: mintResult.batchAddress});
                    setActiveTab('handoff');
                  }}
                />
              )}
              {activeTab === 'manage' && <ManageTab batches={batches} onRevoke={handleRevokeBatch} onDelete={handleDeleteBatch} />}
              {activeTab === 'handoff' && (
                <HandoffTab 
                  form={handoffForm} 
                  setForm={setHandoffForm} 
                  onSubmit={handleGenerateHandoff} 
                  loading={isGeneratingHandoff} 
                  results={handoffResults}
                />
              )}
              {activeTab === 'alerts' && <AlertsTab alerts={alerts} filter={alertFilter} setFilter={setAlertFilter} onResolve={handleResolveAlert} />}
              {activeTab === 'stats' && <StatsTab stats={stats} batches={batches} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- Sub-Components ---

const NavBtn = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
      active 
        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
    }`}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ icon, label, value, color = "blue" }) => (
  <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl group hover:border-red-500/30 transition-all shadow-xl">
    <div className={`w-14 h-14 rounded-2xl bg-${color}-600/10 flex items-center justify-center mb-6 text-${color}-500 shadow-inner`}>
      {icon}
    </div>
    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-4xl font-black tracking-tighter">{value}</h3>
  </div>
);

const LoadingScreen = ({ message }) => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
    <Loader2 className="animate-spin text-red-600 mb-6" size={48} />
    <p className="font-black uppercase tracking-widest text-xs text-gray-500">{message}</p>
  </div>
);

const AccessDenied = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
    <div className="w-20 h-20 bg-red-600/20 text-red-500 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
      <ShieldAlert size={48} />
    </div>
    <h2 className="text-4xl font-black tracking-tighter mb-4">Access Denied</h2>
    <p className="text-gray-500 max-w-md mb-10 font-medium">Your credentials do not grant access to the MediTrace administrative node. This event has been logged.</p>
    <Link to="/dashboard" className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all">Return to Dashboard</Link>
  </div>
);

// --- TAB: OVERVIEW ---
const OverviewTab = ({ stats, alerts, onResolve }) => {
  const recentAlerts = alerts.filter(a => !a.is_resolved).slice(0, 5);

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-4xl font-black tracking-tighter mb-2">Network Overview</h2>
        <p className="text-gray-500 font-medium">Real-time surveillance of the MediTrace blockchain.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard icon={<QrCode size={28} />} label="Scans" value={stats.scans} color="blue" />
        <StatCard icon={<Users size={28} />} label="Users" value={stats.users} color="green" />
        <StatCard icon={<AlertTriangle size={28} />} label="Alerts" value={stats.alerts} color="red" />
        <StatCard icon={<FileText size={28} />} label="Rx Files" value={stats.prescriptions} color="purple" />
        <StatCard icon={<Activity size={28} />} label="ADR Logs" value={stats.reports} color="orange" />
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black flex items-center gap-3 text-red-500">
            <AlertTriangle size={20} /> Unresolved Security Alerts
          </h3>
          <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-500/20 animate-pulse">Critical Priority</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {recentAlerts.map((alert, idx) => (
            <AlertCard key={idx} alert={alert} onResolve={onResolve} />
          ))}
          {recentAlerts.length === 0 && (
            <div className="p-12 rounded-[32px] border border-dashed border-white/10 flex flex-col items-center justify-center text-gray-500 font-bold">
              <CheckCircle2 size={48} className="text-green-500 mb-4" />
              No active security threats detected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- TAB: MINT ---
const MintTab = ({ form, setForm, onSubmit, loading, result, onGoToHandoff }) => (
  <div className="space-y-8 max-w-4xl mx-auto">
    <div>
      <h2 className="text-3xl font-black tracking-tight">Mint Batch on Blockchain</h2>
      <p className="text-gray-500">Initialize a new secure medicine batch in the immutable ledger.</p>
    </div>

    {result && result.success ? (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="p-12 rounded-[40px] bg-green-500/10 border border-green-500/20 text-center space-y-8"
      >
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <h3 className="text-4xl font-black tracking-tighter">Batch Minted Successfully!</h3>
        <div className="bg-black/40 p-6 rounded-3xl border border-white/5 font-mono text-xs text-gray-400 break-all space-y-2">
          <p><span className="text-green-500 font-bold mr-2">Blockchain Receipt:</span> {result.hash}</p>
          <p><span className="text-green-500 font-bold mr-2">BATCH:</span> {result.batchId}</p>
        </div>
        <div className="p-8 bg-white rounded-[32px] w-fit mx-auto shadow-2xl flex flex-col items-center gap-6">
          <QRCode 
            id="mint-qr-canvas"
            value={`http://localhost:3000/scan?batch=${result.batchId}&company=${encodeURIComponent(result.companyName || '')}`} 
            size={200} 
          />
          <button
            onClick={() => {
              const canvas = document.getElementById("mint-qr-canvas");
              if (canvas) {
                const url = canvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = url;
                a.download = "MediTrace-" + result.batchId + ".png";
                a.click();
              }
            }}
            className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all text-sm shadow-xl"
          >
            <Download size={18} /> Download QR (.png)
          </button>
        </div>
        <div className="flex justify-center gap-4 pt-6">
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold">Mint Another</button>
          <button onClick={onGoToHandoff} className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-red-600/20">
            <QrCode size={20} /> Generate Driver QRs
          </button>
        </div>
      </motion.div>
    ) : (
      <form onSubmit={onSubmit} className="p-10 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl space-y-8 shadow-2xl">
        {result && !result.success && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center gap-3">
            <XCircle size={20} /> {result.error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Batch ID" placeholder="e.g. BATCH-7729" value={form.batch_id} onChange={e => setForm({...form, batch_id: e.target.value})} required />
          <Input label="Medicine Name" placeholder="e.g. Paracetamol" value={form.drug_name} onChange={e => setForm({...form, drug_name: e.target.value})} required />
          <Input label="Active Ingredient" placeholder="e.g. Acetaminophen" value={form.active_ingredient} onChange={e => setForm({...form, active_ingredient: e.target.value})} />
          <Input label="Dosage" placeholder="e.g. 500mg" value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} />
          <Input label="Manufacturer Name" placeholder="e.g. PharmaCorp" value={form.manufacturer_name} onChange={e => setForm({...form, manufacturer_name: e.target.value})} />
          <Input label="Company Name" placeholder="e.g. PharmaCorp India" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
          <Input label="CDSCO Certificate #" placeholder="e.g. CDSCO-RX-99" value={form.cdsco_cert} onChange={e => setForm({...form, cdsco_cert: e.target.value})} />
          <Input label="Manufacturing Date" type="date" value={form.mfg_date} onChange={e => setForm({...form, mfg_date: e.target.value})} required />
          <Input label="Expiry Date" type="date" value={form.exp_date} onChange={e => setForm({...form, exp_date: e.target.value})} required />
        </div>
        <button 
          disabled={loading}
          className="w-full py-6 bg-red-600 text-white rounded-[24px] font-black text-xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? <><Loader2 size={24} className="animate-spin" /> Minting on blockchain...</> : <><ShieldCheck size={24} /> Mint Batch on Blockchain</>}
        </button>
      </form>
    )}
  </div>
);

// --- TAB: HANDOFF ---
const HandoffTab = ({ form, setForm, onSubmit, loading, results }) => {
  const [extraTokenLabels, setExtraTokenLabels] = useState(Array(Math.max(0, form.count - 4)).fill(''));

  const handleLabelChange = (idx, val) => {
    const newLabels = [...extraTokenLabels];
    newLabels[idx] = val;
    setExtraTokenLabels(newLabels);
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Supply Chain QR Generation</h2>
        <p className="text-gray-500">Generate QR codes for each stage of the supply chain</p>
      </div>

      <form 
        onSubmit={(e) => onSubmit(e, extraTokenLabels)} 
        className="p-10 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl grid grid-cols-1 md:grid-cols-4 gap-8"
      >
        <div className="md:col-span-2">
          <Input label="Batch Address" placeholder="0x..." value={form.batch_address} onChange={e => setForm({...form, batch_address: e.target.value})} required />
        </div>
        <div>
          <Input 
            label="Tokens Per Stage" type="number" min="1" max="10" 
            value={form.count} 
            onChange={e => {
              const raw = e.target.value;
              if (raw === '' || raw === '-') { setForm({...form, count: raw}); return; }
              const newCount = parseInt(raw);
              if (isNaN(newCount) || newCount < 1) return;
              const clamped = Math.min(newCount, 10);
              setForm({...form, count: clamped});
              setExtraTokenLabels(Array(Math.max(0, clamped - 4)).fill(''));
            }} 
            required 
          />
        </div>
        <div className="flex items-end">
          <button disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <QrCode size={20} />} Generate QRs
          </button>
        </div>
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.keys(form.stages).map(stage => (
            <label key={stage} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${form.stages[stage] ? 'bg-blue-600/20 border-blue-500/50 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>
              <input 
                type="checkbox" className="hidden" 
                checked={form.stages[stage]} 
                onChange={() => setForm({...form, stages: {...form.stages, [stage]: !form.stages[stage]}})}
              />
              {form.stages[stage] ? <CheckCircle2 size={18} className="text-blue-500" /> : <Layers size={18} />}
              <span className="text-xs font-black uppercase tracking-widest">{stage.replace('_', ' ')}</span>
            </label>
          ))}
        </div>

        {form.count > 4 && (
          <div className="md:col-span-4 space-y-6 pt-4 border-t border-white/5">
            <div>
              <h4 className="text-lg font-black text-blue-500">Extra Tokens — Add Custom Labels</h4>
              <p className="text-xs text-gray-500 font-medium italic">These are in addition to the 4 standard supply chain stages. Give each a name.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extraTokenLabels.map((label, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Extra Token {i+1} Label</label>
                  <input 
                    type="text"
                    placeholder="e.g. Driver name, route, cold storage unit..."
                    value={label}
                    onChange={(e) => handleLabelChange(i, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500/50 outline-none transition-all placeholder-white/10 text-sm font-bold"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </form>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {results.map((token, idx) => {
            const shortBatch = token.batchAddress.startsWith("0x") 
              ? token.batchAddress.slice(0, 10) + "..." 
              : token.batchAddress;

            return (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                key={idx} className="p-6 rounded-[32px] bg-white text-black text-center space-y-4 shadow-2xl relative group overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
                <p className="text-sm font-black uppercase tracking-tight text-blue-600">
                  {token.stage.replace(/_/g,' ').toUpperCase()}
                </p>
                <p className="text-[10px] font-mono text-gray-400 break-all leading-none">{shortBatch}</p>
                
                {token.label && token.label !== token.stage && (
                  <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">{token.label}</p>
                )}

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 inline-block">
                  <QRCode 
                    id={"qr-canvas-" + idx}
                    value={token.qrValue} 
                    size={140} 
                  />
                </div>
                
                <p className="text-[8px] font-mono text-gray-300 break-all px-2">
                  {token.token.substring(0, 18)}...
                </p>
                
                <button 
                  onClick={() => {
                    const canvas = document.getElementById("qr-canvas-" + idx);
                    if (canvas) {
                      const url = canvas.toDataURL("image/png");
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "MediTrace-" + token.stage + "-" + token.batchAddress + ".png";
                      a.click();
                    }
                  }}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-blue-600 transition-all"
                >
                  <Download size={14} /> Download QR (.png)
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- TAB: ALERTS ---
const AlertsTab = ({ alerts, filter, setFilter, onResolve }) => {
  const filtered = alerts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !a.is_resolved;
    if (filter === 'resolved') return a.is_resolved;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Global Security Alerts</h2>
          <p className="text-gray-500">Real-time incident response management.</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          {['all', 'unresolved', 'resolved'].map(f => (
            <button 
              key={f} onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((alert, idx) => (
          <AlertCard key={idx} alert={alert} onResolve={onResolve} full />
        ))}
        {filtered.length === 0 && <EmptyState text="No alerts matching filters." />}
      </div>
    </div>
  );
};

// --- TAB: MANAGE ---
const ManageTab = ({ batches, onRevoke, onDelete }) => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <h2 className="text-3xl font-black tracking-tight">Batch Inventory</h2>
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{batches.length} Total Batches</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {batches.map((batch, idx) => (
        <div key={idx} className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl group hover:border-red-500/30 transition-all shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-inner">
                <Package size={28} />
              </div>
              <StatusBadge status={batch.isRevoked === true || batch.status === 'revoked' ? 'REVOKED' : 'ACTIVE'} />
            </div>
            <div>
              <h4 className="text-2xl font-black mb-1">{batch.drugName || 'Generic Drug'}</h4>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Batch: {batch.batchId}</p>
            </div>
            
            <div className="space-y-2 py-4 border-y border-white/5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-gray-500 uppercase tracking-widest">Manufacturer</span>
                <span className="text-white uppercase">{batch.manufacturer || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-gray-500 uppercase tracking-widest">Dosage</span>
                <span className="text-white uppercase">{batch.dosage || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-gray-500 uppercase tracking-widest">Expires</span>
                <span className="text-red-500 uppercase">
                  {batch.expiryDate ? new Date(parseInt(batch.expiryDate) * 1000).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] text-gray-600 font-mono break-all">{batch.batchId}</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-2 font-bold uppercase tracking-widest">
                <Clock size={12} className="text-blue-500" /> {batch.scanCount || 0} Verifications
              </p>
            </div>
          </div>
          {batch.isRevoked === true || batch.status === 'revoked' ? (
            <div className="flex flex-col gap-2 mt-6">
              <div className="w-full py-3 rounded-2xl bg-gray-500/10 text-gray-500 font-black text-sm flex items-center justify-center gap-2 border border-gray-500/10">
                <XCircle size={16} /> Revoked on Blockchain
              </div>
              <button
                onClick={() => onDelete(batch.batchId)}
                className="w-full py-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white font-black text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 size={16} /> Remove from List
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRevoke(batch.batchId)}
              className="w-full mt-6 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white"
            >
              <Trash2 size={18} /> Revoke Batch
            </button>
          )}
        </div>
      ))}
      {batches.length === 0 && <EmptyState text="No batches deployed to blockchain." />}
    </div>
  </div>
);

// --- TAB: STATS ---
const StatsTab = ({ stats, batches }) => (
  <div className="space-y-12">
    <div>
      <h2 className="text-3xl font-black tracking-tight">Network Statistics</h2>
      <p className="text-gray-500 font-medium">Deep analytics of supply chain movement.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard icon={<QrCode size={28} />} label="Total Scans" value={stats.scans} color="blue" />
      <StatCard icon={<Users size={28} />} label="Total Users" value={stats.users} color="green" />
      <StatCard icon={<AlertTriangle size={28} />} label="Total Alerts" value={stats.alerts} color="red" />
      <StatCard icon={<FileText size={28} />} label="Prescriptions" value={stats.prescriptions} color="purple" />
      <StatCard icon={<Activity size={28} />} label="ADR Reports" value={stats.reports} color="orange" />
      <StatCard icon={<Package size={28} />} label="Total Batches" value={batches.length} color="blue" />
      <StatCard icon={<CheckCircle2 size={28} />} label="Active Batches" value={batches.filter(b => b.isRevoked !== true && b.status !== 'revoked').length} color="green" />
      <StatCard icon={<ShieldAlert size={28} />} label="Revoked Batches" value={batches.filter(b => b.isRevoked === true || b.status === 'revoked').length} color="red" />
    </div>

    <div className="p-10 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl">
      <h3 className="text-xl font-black mb-8 flex items-center gap-3"><Clock size={20} className="text-blue-500" /> Recent Batch Activity</h3>
      <div className="space-y-4">
        {batches.slice(0, 5).map((batch, idx) => (
          <div key={idx} className="flex items-center justify-between p-6 rounded-3xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/5">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-inner">
                <Package size={24} />
              </div>
              <div className="space-y-1">
                <p className="font-black text-lg">{batch.drugName}</p>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <span className="text-blue-500">{batch.batchId}</span>
                  <span>•</span>
                  <span>{batch.manufacturer}</span>
                  <span>•</span>
                  <span className="text-red-500">
                    Expires: {batch.expiryDate ? new Date(parseInt(batch.expiryDate) * 1000).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-sm font-black text-blue-500">{batch.scanCount || 0} Verifications</p>
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Network Traffic</p>
              </div>
              <StatusBadge status={batch.isRevoked === true || batch.status === 'revoked' ? 'REVOKED' : 'ACTIVE'} />
            </div>
          </div>
        ))}
        {batches.length === 0 && <EmptyState text="No activity logs." />}
      </div>
    </div>
  </div>
);

// --- Helper Components ---

const AlertCard = ({ alert, onResolve, full = false }) => {
  const isCritical = alert.type === 'DUPLICATE_ID' || alert.type === 'UNAUTHORIZED_LOCATION';
  
  return (
    <div className={`p-6 rounded-[32px] bg-white/5 border backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${isCritical ? 'border-red-500/30' : 'border-orange-500/30'}`}>
      <div className="flex gap-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${isCritical ? 'bg-red-600/10 text-red-500' : 'bg-orange-600/10 text-orange-500'}`}>
          <AlertTriangle size={28} className={isCritical && !alert.is_resolved ? 'animate-bounce' : ''} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isCritical ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
              {alert.type}
            </span>
            {alert.is_resolved && <span className="px-3 py-1 bg-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-full">Resolved</span>}
          </div>
          <h4 className="font-black text-lg mb-1">{alert.message}</h4>
          <p className="text-xs text-gray-500 font-mono mb-2">{alert.batch_address}</p>
          <div className="flex items-center gap-4 text-[10px] text-gray-600">
            <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(alert.detected_at || alert.timestamp).toLocaleString()}</span>
            {alert.location && <span className="flex items-center gap-1.5"><MapPin size={12} /> {alert.location}</span>}
          </div>
        </div>
      </div>
      {!alert.is_resolved && (
        <button 
          onClick={() => onResolve(alert.id)}
          className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isCritical ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'}`}
        >
          Resolve Threat
        </button>
      )}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const isOk = status === 'ACTIVE' || status === 'AUTHENTIC';
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${
      isOk ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
    }`}>
      {isOk ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {status}
    </span>
  );
};

const Input = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <input 
      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-red-500/50 outline-none transition-all placeholder-white/10 font-bold"
      {...props}
    />
  </div>
);

const EmptyState = ({ text }) => (
  <div className="p-12 rounded-[40px] border border-dashed border-white/10 flex flex-col items-center justify-center text-center w-full">
    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-gray-600">
      <Package size={32} />
    </div>
    <p className="text-gray-500 font-bold">{text}</p>
  </div>
);

export default Admin;
