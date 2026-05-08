import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  QrCode, 
  FileText, 
  Bell, 
  AlertTriangle, 
  Search, 
  LogOut, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Menu, 
  X,
  User,
  Loader2,
  Calendar,
  ChevronRight,
  Info,
  Activity,
  Heart,
  Stethoscope
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../config/supabase';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const Dashboard = () => {
  // 1. Context & Router Hooks
  const { user, profile, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // 2. ALL useState declarations
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [particlesReady, setParticlesReady] = useState(false);
  const [history, setHistory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [adrReports, setAdrReports] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPrescription, setShowAddPrescription] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({ drug_name: '', dosage: '', prescribed_by: '', start_date: '', end_date: '', notes: '' });
  const [reminderForm, setReminderForm] = useState({ medicine_name: '', remind_at: '', frequency: 'daily' });
  const [adrForm, setAdrForm] = useState({ batch_address: '', drug_name: '', details: '', severity: 'mild' });

  // 3. ALL useCallback hooks
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, prescriptionRes, reminderRes, adrRes] = await Promise.all([
        authFetch('http://localhost:5000/scans/history'),
        authFetch('http://localhost:5000/prescriptions'),
        authFetch('http://localhost:5000/reminders'),
        authFetch('http://localhost:5000/adr/my-reports')
      ]);

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.scans || []);
      }
      if (prescriptionRes.ok) {
        const data = await prescriptionRes.json();
        setPrescriptions(data.prescriptions || []);
      }
      if (reminderRes.ok) {
        const data = await reminderRes.json();
        setReminders(data.reminders || []);
      }
      if (adrRes.ok) {
        const data = await adrRes.json();
        setAdrReports(data.reports || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // 4. ALL useEffect hooks
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const particlesInitialized = useRef(false);
  useEffect(() => {
    if (!particlesInitialized.current) {
      particlesInitialized.current = true;
      initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      }).then(() => setParticlesReady(true));
    }
  }, []);

  useEffect(() => {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    const move = (e) => {
      if (dot) { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }
      if (ring) { ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // 5. Early Returns AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#FAFAFA] text-blue-600">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-black tracking-widest text-xs uppercase">Initializing MediTrace...</p>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleAddPrescription = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('http://localhost:5000/prescriptions', {
        method: 'POST',
        body: JSON.stringify(prescriptionForm)
      });
      if (res.ok) {
        setShowAddPrescription(false);
        setPrescriptionForm({ drug_name: '', dosage: '', prescribed_by: '', start_date: '', end_date: '', notes: '' });
        fetchData();
      }
    } catch (err) { alert("Failed to add prescription"); }
  };

  const handleDeletePrescription = async (id) => {
    try {
      const res = await authFetch(`http://localhost:5000/prescriptions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('http://localhost:5000/reminders', {
        method: 'POST',
        body: JSON.stringify(reminderForm)
      });
      if (res.ok) {
        setShowAddReminder(false);
        setReminderForm({ medicine_name: '', remind_at: '', frequency: 'daily' });
        fetchData();
      }
    } catch (err) { alert("Failed to add reminder"); }
  };

  const handleToggleReminder = async (id) => {
    try {
      const res = await authFetch(`http://localhost:5000/reminders/${id}/toggle`, { method: 'PUT' });
      if (res.ok) fetchData();
    } catch (err) { alert("Failed to toggle"); }
  };

  const handleDeleteReminder = async (id) => {
    try {
      const res = await authFetch(`http://localhost:5000/reminders/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleSubmitADR = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('http://localhost:5000/adr', {
        method: 'POST',
        body: JSON.stringify(adrForm)
      });
      if (res.ok) {
        alert("ADR Report submitted successfully");
        setAdrForm({ batch_address: '', drug_name: '', details: '', severity: 'mild' });
        fetchData();
      }
    } catch (err) { alert("Failed to submit report"); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`http://localhost:5000/batches/search/${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.batches || []);
      }
    } catch (err) { alert("Search failed"); }
  };

  const particleOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: ["#2563EB", "#D97706"] },
      links: { color: "#2563EB", distance: 150, enable: true, opacity: 0.08, width: 1 },
      move: { enable: true, speed: 0.4, direction: "none", random: true, outModes: { default: "bounce" } },
      number: { value: 40, density: { enable: true } },
      opacity: { value: 0.15 },
      size: { value: { min: 1, max: 2 } },
    },
    detectRetina: true,
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827] font-sans flex relative overflow-hidden">
      {/* Custom Cursor */}
      <div id="cursor-dot" className="hidden lg:block" style={{
        position: 'fixed', width: 8, height: 8,
        borderRadius: '50%', backgroundColor: '#2563EB',
        pointerEvents: 'none', zIndex: 9999,
        transform: 'translate(-50%, -50%)',
        transition: 'none'
      }} />
      <div id="cursor-ring" className="hidden lg:block" style={{
        position: 'fixed', width: 32, height: 32,
        borderRadius: '50%', border: '2px solid #D97706',
        pointerEvents: 'none', zIndex: 9998,
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.12s ease, top 0.12s ease'
      }} />

      {particlesReady && (
        <Particles id="tsparticles" options={particleOptions} className="absolute inset-0 z-0 pointer-events-none" />
      )}

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-6 right-6 z-50 p-3 bg-[#2563EB] rounded-2xl shadow-xl text-white"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-40 w-72 h-screen border-r border-[#E5E7EB] bg-white p-8 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-blue-600/10">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h1 className="font-black text-2xl tracking-tighter text-[#111827]">MediTrace<span className="text-[#2563EB]">.</span></h1>
        </div>

        <div className="mb-10 px-2 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] font-black text-xl">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-[#111827] truncate">{profile?.full_name || 'Patient'}</p>
            <p className="text-[10px] text-[#6B7280] truncate uppercase tracking-widest font-black">{user?.email}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavBtn icon={<LayoutDashboard size={20} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavBtn icon={<QrCode size={20} />} label="Scan History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavBtn icon={<FileText size={20} />} label="Prescriptions" active={activeTab === 'prescriptions'} onClick={() => setActiveTab('prescriptions')} />
          <NavBtn icon={<Bell size={20} />} label="Reminders" active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />
          <NavBtn icon={<AlertTriangle size={20} />} label="Report ADR" active={activeTab === 'adr'} onClick={() => setActiveTab('adr')} />
          <NavBtn icon={<Search size={20} />} label="Med Search" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-6 py-4 w-full rounded-2xl text-[#6B7280] hover:text-red-600 hover:bg-red-50 border border-transparent transition-all font-bold group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-12 relative z-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing with Blockchain...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto"
            >
              {activeTab === 'overview' && <OverviewTab history={history} prescriptions={prescriptions} reminders={reminders} adrReports={adrReports} />}
              {activeTab === 'history' && <HistoryTab history={history} />}
              {activeTab === 'prescriptions' && (
                <PrescriptionsTab 
                  user={user}
                  prescriptions={prescriptions} 
                  showAdd={showAddPrescription} 
                  setShowAdd={setShowAddPrescription} 
                  form={prescriptionForm} 
                  setForm={setPrescriptionForm} 
                  onSubmit={handleAddPrescription} 
                  onDelete={handleDeletePrescription}
                />
              )}
              {activeTab === 'reminders' && (
                <RemindersTab 
                  reminders={reminders} 
                  showAdd={showAddReminder} 
                  setShowAdd={setShowAddReminder} 
                  form={reminderForm} 
                  setForm={setReminderForm} 
                  onSubmit={handleAddReminder} 
                  onToggle={handleToggleReminder}
                  onDelete={handleDeleteReminder}
                />
              )}
              {activeTab === 'adr' && <ADRTab reports={adrReports} form={adrForm} setForm={setAdrForm} onSubmit={handleSubmitADR} />}
              {activeTab === 'search' && <SearchTab query={searchQuery} setQuery={setSearchQuery} onSearch={handleSearch} results={searchResults} />}
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
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-sm border-l-[3px] ${
      active 
        ? 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]' 
        : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] border-transparent'
    }`}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ icon, label, value }) => (
  <div className="p-8 rounded-[20px] bg-white border border-[#E5E7EB] group hover:border-[#2563EB] transition-all duration-300">
    <div className="w-14 h-14 rounded-2xl bg-[#DBEAFE] flex items-center justify-center mb-6 text-[#2563EB]">
      {icon}
    </div>
    <p className="text-[#6B7280] text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-4xl font-black text-[#111827] tracking-tight">{value}</h3>
  </div>
);

// --- TAB: OVERVIEW ---
const OverviewTab = ({ history, prescriptions, reminders, adrReports }) => {
  const activePrescriptions = (Array.isArray(prescriptions) ? prescriptions : []).filter(p => new Date(p.end_date) > new Date()).length;
  const activeReminders = (Array.isArray(reminders) ? reminders : []).filter(r => r.is_active).length;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2 text-[#111827]">Patient Dashboard</h2>
          <p className="text-[#6B7280] font-medium">Real-time health insights and verification history.</p>
        </div>
        <Link to="/scan" className="px-8 py-4 bg-[#2563EB] text-white rounded-2xl font-black shadow-lg shadow-blue-600/10 hover:border-[#D97706] border border-transparent transition-all flex items-center gap-3">
          <QrCode size={20} /> Verify New Medicine
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<QrCode size={28} />} label="Total Scans" value={(Array.isArray(history) ? history : []).length} />
        <StatCard icon={<FileText size={28} />} label="Active Rx" value={activePrescriptions} />
        <StatCard icon={<Bell size={28} />} label="Reminders" value={activeReminders} />
        <StatCard icon={<AlertCircle size={28} />} label="ADR Filed" value={(Array.isArray(adrReports) ? adrReports : []).length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black flex items-center gap-3 text-[#111827] border-l-4 border-[#2563EB] pl-4">
            Recent Scans
          </h3>
          <div className="space-y-4">
            {(Array.isArray(history) ? history : []).slice(0, 3).map((scan, idx) => (
              <HistoryCard key={idx} scan={scan} />
            ))}
            {(Array.isArray(history) ? history : []).length === 0 && <EmptyState text="No recent scans found." />}
          </div>
        </div>
        
        <div className="space-y-6">
          <h3 className="text-xl font-black flex items-center gap-3 text-[#111827] border-l-4 border-[#D97706] pl-4">
            Health Pulse
          </h3>
          <div className="p-8 rounded-[20px] bg-white border border-[#E5E7EB] relative overflow-hidden">
            <p className="text-[#6B7280] text-[10px] font-black uppercase tracking-widest mb-2">System Status</p>
            <h4 className="text-2xl font-black mb-6 text-[#111827]">Network Verified</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                <span className="text-[#6B7280]">Verification Accuracy</span>
                <span className="text-[#D97706]">100%</span>
              </div>
              <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                <div className="bg-[#D97706] h-full w-[100%] rounded-full" />
              </div>
              <p className="text-[10px] text-[#6B7280] font-medium leading-relaxed italic pt-2">
                "Real-time node synchronization active. All scanned medicines are verified against the CDSCO blockchain ledger."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- TAB: HISTORY ---
const HistoryTab = ({ history }) => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <h2 className="text-3xl font-black tracking-tight text-[#111827]">Scan History</h2>
      <span className="px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-black text-[#6B7280] uppercase tracking-widest">
        {history.length} Total Records
      </span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(Array.isArray(history) ? history : []).map((scan, idx) => <HistoryCard key={idx} scan={scan} />)}
      {(Array.isArray(history) ? history : []).length === 0 && <EmptyState text="No scans yet. Go scan a medicine!" link="/scan" />}
    </div>
  </div>
);

// --- TAB: PRESCRIPTIONS ---
const PrescriptionsTab = ({ user, prescriptions, showAdd, setShowAdd, form, setForm, onSubmit, onDelete }) => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <h2 className="text-3xl font-black tracking-tight text-[#111827]">My Prescriptions</h2>
      <button 
        onClick={() => setShowAdd(!showAdd)}
        className="px-6 py-3 bg-[#2563EB] text-white rounded-2xl font-black flex items-center gap-2 hover:border-[#D97706] border border-transparent transition-all"
      >
        {showAdd ? <X size={20} /> : <Plus size={20} />}
        {showAdd ? 'Cancel' : 'Add Prescription'}
      </button>
    </div>

    {showAdd && (
      <motion.form 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={onSubmit}
        className="p-10 rounded-[20px] bg-white border border-[#E5E7EB] grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Input label="Medicine Name" placeholder="e.g. Lipitor" value={form.drug_name} onChange={e => setForm({...form, drug_name: e.target.value})} required />
        <Input label="Dosage" placeholder="e.g. 20mg once daily" value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} />
        <Input label="Prescribed By" placeholder="Dr. Sharma" value={form.prescribed_by} onChange={e => setForm({...form, prescribed_by: e.target.value})} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
          <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Notes</label>
          <textarea 
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 mt-2 focus:border-[#2563EB] outline-none transition-all placeholder-[#9CA3AF] h-24 text-[#111827] font-bold"
            value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
          />
        </div>
        <button type="submit" className="md:col-span-2 py-4 bg-[#2563EB] text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all">
          Save Prescription
        </button>
      </motion.form>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(Array.isArray(prescriptions) ? prescriptions : []).map((p, idx) => (
        <div key={idx} className="p-8 rounded-[20px] bg-white border border-[#E5E7EB] group hover:border-[#2563EB] transition-all border-l-4 border-l-[#D97706]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-black mb-1 text-[#111827]">{p.drug_name}</h3>
              <p className="text-[#2563EB] text-sm font-black">{p.dosage}</p>
            </div>
            <button onClick={() => onDelete(p.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
              <Trash2 size={18} />
            </button>
          </div>
          <div className="space-y-3 mb-6">
            <p className="text-xs text-[#6B7280] font-black uppercase tracking-widest flex items-center gap-2"><User size={14} /> {p.prescribed_by}</p>
            <p className="text-xs text-[#6B7280] font-black uppercase tracking-widest flex items-center gap-2"><Calendar size={14} /> {new Date(p.start_date).toLocaleDateString()} — {new Date(p.end_date).toLocaleDateString()}</p>
          </div>
          {p.notes && <p className="text-sm text-[#6B7280] italic bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">"{p.notes}"</p>}
        </div>
      ))}
      {(Array.isArray(prescriptions) ? prescriptions : []).length === 0 && !showAdd && <EmptyState text="No prescriptions saved yet." />}
    </div>
  </div>
);

// --- TAB: REMINDERS ---
const RemindersTab = ({ reminders, showAdd, setShowAdd, form, setForm, onSubmit, onToggle, onDelete }) => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <h2 className="text-3xl font-black tracking-tight text-[#111827]">Medication Reminders</h2>
      <button onClick={() => setShowAdd(!showAdd)} className="px-6 py-3 bg-[#2563EB] text-white rounded-2xl font-black flex items-center gap-2">
        {showAdd ? <X size={20} /> : <Plus size={20} />}
        {showAdd ? 'Cancel' : 'New Reminder'}
      </button>
    </div>

    {showAdd && (
      <motion.form 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={onSubmit}
        className="p-10 rounded-[20px] bg-white border border-[#E5E7EB] grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Input label="Medicine" placeholder="e.g. Insulin" value={form.medicine_name} onChange={e => setForm({...form, medicine_name: e.target.value})} required />
        <Input label="Time" type="datetime-local" value={form.remind_at} onChange={e => setForm({...form, remind_at: e.target.value})} required />
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Frequency</label>
          <select 
            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3.5 focus:border-[#2563EB] outline-none transition-all text-[#111827] font-bold"
            value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}
          >
            <option value="once">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <button type="submit" className="md:col-span-3 py-4 bg-[#2563EB] text-white rounded-2xl font-black text-lg">Create Reminder</button>
      </motion.form>
    )}

    <div className="space-y-4">
      {(Array.isArray(reminders) ? reminders : []).map((r, idx) => (
        <div key={idx} className="flex items-center justify-between p-6 rounded-2xl bg-white border border-[#E5E7EB] group hover:border-[#2563EB] transition-all">
          <div className="flex items-center gap-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${r.is_active ? 'bg-amber-50 text-[#D97706]' : 'bg-gray-100 text-[#9CA3AF]'}`}>
              <Bell size={24} className={r.is_active ? 'animate-bounce' : ''} />
            </div>
            <div>
              <h4 className={`text-lg font-black ${r.is_active ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>{r.medicine_name}</h4>
              <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-widest">Next: {new Date(r.remind_at).toLocaleString()} • {r.frequency}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onToggle(r.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                r.is_active ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-[#9CA3AF]'
              }`}
            >
              {r.is_active ? 'Active' : 'Paused'}
            </button>
            <button onClick={() => onDelete(r.id)} className="p-2 text-[#9CA3AF] hover:text-red-500 transition-colors">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      ))}
      {(Array.isArray(reminders) ? reminders : []).length === 0 && !showAdd && <EmptyState text="No active reminders." />}
    </div>
  </div>
);

// --- TAB: ADR ---
const ADRTab = ({ reports, form, setForm, onSubmit }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
    <div className="space-y-8">
      <h2 className="text-3xl font-black tracking-tight text-[#111827]">Report Side Effect</h2>
      <form onSubmit={onSubmit} className="p-10 rounded-[20px] bg-white border border-[#E5E7EB] space-y-6 shadow-sm">
        <Input label="Batch Address" placeholder="0x..." value={form.batch_address} onChange={e => setForm({...form, batch_address: e.target.value})} required />
        <Input label="Medicine Name" placeholder="e.g. Covishield" value={form.drug_name} onChange={e => setForm({...form, drug_name: e.target.value})} />
        <div className="space-y-2">
          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Reaction Details</label>
          <textarea className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 focus:border-[#2563EB] outline-none h-32 text-[#111827] font-bold" value={form.details} onChange={e => setForm({...form, details: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest ml-1">Severity</label>
          <div className="grid grid-cols-3 gap-3">
            {['mild', 'moderate', 'severe'].map(s => (
              <button key={s} type="button" onClick={() => setForm({...form, severity: s})} className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${form.severity === s ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20' : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="w-full py-4 bg-[#2563EB] text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all">Submit Global Alert</button>
      </form>
    </div>

    <div className="space-y-8">
      <h2 className="text-3xl font-black tracking-tight text-[#6B7280]">Previous Reports</h2>
      <div className="space-y-4">
        {(Array.isArray(reports) ? reports : []).map((r, idx) => (
          <div key={idx} className="p-8 rounded-[20px] bg-white border border-[#E5E7EB]">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${r.severity === 'severe' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                {r.severity}
              </span>
              <span className="text-[10px] text-[#6B7280] font-black uppercase tracking-widest">{new Date(r.timestamp).toLocaleDateString()}</span>
            </div>
            <h4 className="text-lg font-black text-[#111827] mb-2">{r.drug_name || 'Medicine'}</h4>
            <p className="text-sm text-[#6B7280] font-medium leading-relaxed italic">"{r.details}"</p>
          </div>
        ))}
        {(Array.isArray(reports) ? reports : []).length === 0 && <EmptyState text="No reports filed yet." />}
      </div>
    </div>
  </div>
);

// --- TAB: SEARCH ---
const SearchTab = ({ query, setQuery, onSearch, results }) => {
  const navigate = useNavigate();
  return (
  <div className="space-y-12">
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <h2 className="text-5xl font-black tracking-tighter text-[#111827]">Global Medicine Search</h2>
      <p className="text-[#6B7280] font-medium">Verify any medicine batch across the MediTrace network.</p>
      <form onSubmit={onSearch} className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#2563EB] group-focus-within:scale-110 transition-transform" size={24} />
        <input 
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by Medicine Name (e.g. Paracetamol)"
          className="w-full bg-white border border-[#E5E7EB] rounded-[32px] pl-16 pr-6 py-6 text-xl focus:border-[#2563EB] outline-none transition-all text-[#111827] font-bold"
        />
        <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 px-6 py-3 bg-[#2563EB] text-white rounded-2xl font-black text-sm shadow-lg hover:bg-blue-700 transition-all">Search</button>
      </form>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {(Array.isArray(results) ? results : []).map((batch, idx) => (
        <div key={idx} className="p-8 rounded-[20px] bg-white border border-[#E5E7EB] group hover:border-[#2563EB] transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
              <Stethoscope size={28} />
            </div>
            <StatusBadge status={batch.status} />
          </div>
          <h4 className="text-2xl font-black text-[#111827] mb-1">{batch.drugName}</h4>
          <p className="text-[10px] text-[#6B7280] font-black uppercase tracking-widest mb-6">ID: {batch.id}</p>
          <button 
            onClick={() => navigate('/scan', { state: { batchId: batch.id } })}
            className="w-full py-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl font-black text-xs uppercase tracking-widest text-[#6B7280] hover:bg-[#2563EB] hover:text-white transition-all flex items-center justify-center gap-2"
          >
            Full Verification <ChevronRight size={18} />
          </button>
        </div>
      ))}
    </div>
  </div>
);
};

// --- Helper Components ---

const HistoryCard = ({ scan }) => (
  <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] group hover:border-[#2563EB] transition-all duration-300 flex justify-between items-center shadow-sm">
    <div className="flex items-center gap-6">
      <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
        <Heart size={28} />
      </div>
      <div>
        <h4 className="text-lg font-black text-[#111827]">{scan.drugName || 'Unknown Medicine'}</h4>
        <div className="flex items-center gap-4 text-[10px] text-[#6B7280] font-black uppercase tracking-widest mt-1">
          <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(scan.timestamp).toLocaleDateString()}</span>
          {scan.location && <span className="flex items-center gap-1.5"><MapPin size={12} /> {scan.location}</span>}
        </div>
      </div>
    </div>
    <div className="flex flex-col items-end gap-2">
      <StatusBadge status={scan.status || 'AUTHENTIC'} />
      <p className="text-[10px] text-[#9CA3AF] font-black uppercase tracking-widest">{scan.batch_address?.slice(0, 8)}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const isOk = status === 'AUTHENTIC' || status === 'active';
  const isErr = status === 'REVOKED' || status === 'revoked';
  const isExp = status === 'EXPIRED' || status === 'expired';

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border transition-all duration-300 ${
      isOk ? 'bg-blue-50 text-[#2563EB] border-[#DBEAFE]' :
      isErr ? 'bg-red-50 text-red-600 border-red-100' :
      isExp ? 'bg-amber-50 text-amber-600 border-amber-100' :
      'bg-blue-50 text-[#2563EB] border-[#DBEAFE]'
    }`}>
      {isOk ? <CheckCircle2 size={12} /> : isErr ? <XCircle size={12} /> : <Info size={12} />}
      {status}
    </span>
  );
};

const Input = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest ml-1">{label}</label>
    <input 
      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-5 py-4 focus:border-[#2563EB] outline-none transition-all placeholder-[#9CA3AF] text-[#111827] font-bold"
      {...props}
    />
  </div>
);

const EmptyState = ({ text, link }) => (
  <div className="p-12 rounded-[20px] bg-white border border-dashed border-[#E5E7EB] flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 bg-[#F9FAFB] rounded-3xl flex items-center justify-center mb-6 text-[#9CA3AF]">
      <Info size={32} />
    </div>
    <p className="text-[#6B7280] font-black uppercase tracking-widest text-[10px] mb-6">{text}</p>
    {link && (
      <Link to={link} className="px-8 py-3 bg-[#2563EB] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-600/10">
        Verify Now
      </Link>
    )}
  </div>
);

export default Dashboard;
