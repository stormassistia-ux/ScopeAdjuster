import React from 'react';
import {
  ClipboardCheck, Loader2, Zap, Sun, Moon, User, X,
  PanelLeftClose, PanelLeftOpen, FileSearch
} from 'lucide-react';
import { AppMode } from './types';
import { AppProvider, useApp, sidebarItems } from './src/context/AppContext';
import { DashboardView } from './src/components/modes/DashboardView';
import { ReportsView } from './src/components/modes/ReportsView';
import { AuditView } from './src/components/modes/AuditView';
import { ReverseEngineerView } from './src/components/modes/ReverseEngineerView';
import { InvestigationView } from './src/components/modes/InvestigationView';
import { ComparisonView } from './src/components/modes/ComparisonView';
import { SettingsView } from './src/components/modes/SettingsView';
import { LibraryView } from './src/components/modes/LibraryView';

const ReportPreviewModal: React.FC = () => {
  const { showReportPreview, setShowReportPreview } = useApp();
  if (!showReportPreview) return null;
  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 md:p-8 animate-in fade-in duration-300">
      <div className="bg-[#0a0f1d] w-full max-w-5xl max-h-[90vh] rounded-xl md:rounded-[3rem] border-2 border-blue-500/30 shadow-[0_0_100px_rgba(59,130,246,0.2)] flex flex-col overflow-hidden relative">
        <div className="p-5 md:p-10 border-b-2 border-blue-900/20 flex justify-between items-center bg-[#050810]">
          <h3 className="text-xl md:text-3xl font-black tracking-tighter text-blue-500 italic uppercase">Quick Preview</h3>
          <button onClick={() => setShowReportPreview(false)} className="p-3 bg-slate-800/80 text-white rounded-full hover:bg-red-500 transition-all border border-white/10"><X size={20} className="md:size-[32px]" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 md:p-12 custom-scrollbar text-slate-300">
          <div className="flex flex-col items-center justify-center h-full space-y-6 opacity-40">
            <FileSearch size={100} className="text-blue-500 animate-pulse md:size-[140px]" />
            <p className="text-lg md:text-2xl font-black uppercase tracking-[0.3em] text-center">Interactive preview coming in v3.2</p>
          </div>
        </div>
        <div className="p-6 md:p-10 border-t-2 border-blue-900/20 bg-[#050810] flex justify-end">
          <button onClick={() => setShowReportPreview(false)} className="px-10 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-blue-500 transition-all shadow-xl">Dismiss</button>
        </div>
      </div>
    </div>
  );
};

const CameraOverlay: React.FC = () => {
  const { isCameraOpen, stopCamera, capturePhoto, videoRef, canvasRef } = useApp();
  if (!isCameraOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300 p-4">
      <div className="relative w-full h-full max-w-4xl max-h-[85vh] bg-slate-900 rounded-xl overflow-hidden border-2 border-red-500/30 shadow-[0_0_100px_rgba(220,38,38,0.3)]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute top-4 right-4">
          <button onClick={stopCamera} className="p-2.5 bg-slate-800/80 text-white rounded-full hover:bg-red-500 transition-all border border-white/20"><X size={20} /></button>
        </div>
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <button onClick={capturePhoto} className="p-6 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all shadow-[0_0_50px_rgba(220,38,38,0.6)] border-4 border-white active:scale-90 transform-gpu">
            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const {
    user, isAuthLoading, isDarkMode, toggleTheme,
    isSidebarCollapsed, setIsSidebarCollapsed,
    state, handleModeToggle, handleLogin, handleLogout
  } = useApp();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#03050a] transition-all font-sans selection:bg-red-500/30 selection:text-red-200 overflow-hidden">
      {isAuthLoading && (
        <div className="fixed inset-0 z-[300] bg-[#03050a] flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 animate-pulse" />
            <Loader2 size={60} className="text-red-500 animate-spin relative z-10" />
          </div>
          <p className="text-red-500 font-black uppercase tracking-[0.5em] animate-pulse">Initializing Neural Link...</p>
        </div>
      )}

      <aside className={`fixed left-0 top-0 h-full z-50 bg-[#080c16] border-r-2 border-blue-900/20 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col shadow-[25px_0_100px_-30px_rgba(0,0,0,0.5)] ${isSidebarCollapsed ? 'w-20 md:w-24' : 'w-72 md:w-80'}`}>
        <div className="p-4 md:p-8 flex items-center justify-between shrink-0">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 md:gap-3 animate-in fade-in slide-in-from-left-4 duration-1000">
              <div className="bg-[#0f172a] p-2 md:p-2.5 rounded-xl text-red-500 shadow-[0_10px_30px_rgba(220,38,38,0.2)] border border-red-500/20 transform -rotate-12 hover:rotate-0 transition-transform duration-700"><ClipboardCheck size={24} className="md:size-[30px]" /></div>
              <div className="flex flex-col">
                <span className="font-black text-xl md:text-3xl text-red-500 tracking-tighter uppercase italic">AI</span>
                <span className="text-[7px] font-black text-red-400/40 uppercase tracking-[0.2em]">Logic Engine</span>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="bg-[#0f172a] p-2 md:p-2.5 rounded-lg text-red-500 mx-auto shadow-2xl transform group hover:rotate-12 transition-transform duration-500 border border-red-500/10"><ClipboardCheck size={24} /></div>
          )}
        </div>

        <nav className="flex-1 px-2.5 md:px-4 py-4 space-y-1 md:space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col justify-center min-h-0">
          {sidebarItems.map((item) => (
            <button key={item.mode} onClick={() => handleModeToggle(item.mode)}
              className={`w-full flex items-center rounded-lg md:rounded-xl transition-all duration-300 group relative overflow-hidden transform-gpu border-2 ${isSidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 md:px-5 py-2 md:py-3.5 gap-4 md:gap-6'} ${state.mode === item.mode ? 'bg-[#0f172a] border-red-500/30 text-red-500 shadow-[0_10px_30px_-10px_rgba(220,38,38,0.3)] scale-105' : 'bg-transparent border-transparent text-slate-500 hover:bg-[#0f172a]/40 hover:border-red-500/10 hover:text-red-400'}`}>
              <div className={`relative p-1.5 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 flex-shrink-0 ${state.mode === item.mode ? 'bg-red-500/10' : 'bg-slate-800/10 group-hover:bg-red-500/5'}`}>
                {state.mode === item.mode && <div className="absolute inset-0 bg-red-500 blur-md opacity-40 animate-pulse" />}
                <item.icon size={20} className={`${state.mode === item.mode ? 'text-red-500 scale-110' : 'group-hover:text-red-400'} transition-all transform duration-300 relative z-10`} />
              </div>
              {!isSidebarCollapsed && <span className="text-[11px] md:text-sm font-black uppercase tracking-[0.15em] md:tracking-[0.15em] whitespace-nowrap drop-shadow-md">{item.label}</span>}
              {state.mode === item.mode && !isSidebarCollapsed && <div className="absolute right-2 w-1 h-1 bg-red-500 rounded-full animate-ping shadow-[0_0_8px_rgba(220,38,38,1)]" />}
            </button>
          ))}
        </nav>

        <div className="p-3 md:p-5 mt-auto shrink-0">
          <button onClick={() => setIsSidebarCollapsed(prev => !prev)} className="w-full flex items-center justify-center p-3 md:p-4 bg-[#0f172a]/50 text-red-500 hover:text-red-400 hover:bg-[#0f172a] rounded-lg md:rounded-xl transition-all duration-500 shadow-2xl border-2 border-red-500/10 group">
            {isSidebarCollapsed ? <PanelLeftOpen size={24} className="md:size-[30px] group-hover:scale-110 transition-transform" /> : <PanelLeftClose size={24} className="md:size-[30px] group-hover:scale-110 transition-transform" />}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarCollapsed ? 'pl-20 md:pl-24' : 'pl-72 md:pl-80'}`}>
        <header className="sticky top-0 z-40 w-full px-4 md:px-10 py-3 md:py-5 bg-white/70 dark:bg-[#03050a]/90 backdrop-blur-3xl border-b-2 border-blue-900/20 flex items-center justify-between shadow-[0_1px_50px_-10px_rgba(0,0,0,0.3)] relative shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-blue-600 to-emerald-800 opacity-30" />
          <div className="flex items-center gap-3 md:gap-8">
            <h2 className="text-[9px] md:text-[12px] font-black text-red-500 uppercase tracking-[0.3em] md:tracking-[0.6em] drop-shadow-[0_0_10px_rgba(220,38,38,0.4)] italic truncate max-w-[70px] md:max-w-none">{state.mode}</h2>
            <div className="h-6 md:h-10 w-1 bg-blue-900/30 rounded-full" />
            <div className="hidden sm:flex items-center gap-3 md:gap-6 group">
              <div className="relative">
                <div className="absolute inset-0 bg-red-400 blur-lg md:blur-xl opacity-40 group-hover:opacity-100 transition-opacity animate-pulse" />
                <Zap size={20} className="md:size-[28px] text-red-500 fill-red-500 relative z-10 drop-shadow-2xl group-hover:scale-125 transition-transform" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] md:text-[13px] font-black text-slate-100 dark:text-slate-100 uppercase tracking-[0.1em] md:tracking-[0.3em] drop-shadow-md">Core v3.1.2</span>
                <span className="text-[7px] md:text-[9px] font-black text-red-400/60 uppercase tracking-widest">Active Sweep</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-8">
            <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-[#080c16] border-2 border-red-500/20 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] transform-gpu hover:scale-105 transition-transform">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_12px_#22c55e] animate-pulse border-2 border-white/20" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Secure</span>
            </div>

            {user ? (
              <div className="flex items-center gap-3 md:gap-4 bg-[#080c16] border-2 border-blue-500/20 px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl shadow-xl">
                <img src={user.photoURL || ''} alt="" className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-blue-500/30" />
                <div className="hidden md:flex flex-col">
                  <span className="text-[9px] font-black text-slate-100 uppercase tracking-widest truncate max-w-[100px]">{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[7px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 text-left">Sign Out</button>
                </div>
                <button onClick={handleLogout} className="md:hidden text-red-500"><X size={16} /></button>
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 bg-red-600 text-white font-black text-[9px] md:text-xs uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-red-500 transition-all shadow-xl border-b-3 md:border-b-4 border-red-800">
                <User size={14} className="md:size-[18px]" /> Login
              </button>
            )}

            <button onClick={toggleTheme} className="p-2 md:p-3.5 bg-[#080c16] text-red-500 hover:text-red-400 rounded-xl md:rounded-[1.5rem] transition-all shadow-xl active:scale-75 transform-gpu border-2 border-red-500/10 group">
              {isDarkMode ? <Sun size={20} className="md:size-[28px] group-hover:rotate-180 transition-transform duration-700" /> : <Moon size={20} className="md:size-[28px] group-hover:-rotate-45 transition-transform duration-700" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-10 lg:p-16 max-w-[1900px] mx-auto w-full transform-gpu overflow-x-hidden overflow-y-auto">
          {(() => {
            switch (state.mode) {
              case AppMode.DASHBOARD: return <DashboardView />;
              case AppMode.REPORTS: return <ReportsView />;
              case AppMode.INVESTIGATION: return <InvestigationView />;
              case AppMode.COMPARISON: return <ComparisonView />;
              case AppMode.COMPLIANCE_AUDIT: return <AuditView />;
              case AppMode.REVERSE_ENGINEER: return <ReverseEngineerView />;
              case AppMode.SETTINGS: return <SettingsView />;
              case AppMode.LIBRARY: return <LibraryView />;
              default: return <DashboardView />;
            }
          })()}
        </main>

        <footer className="px-4 md:px-10 py-6 md:py-12 border-t-2 border-blue-950/40 text-center flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700 bg-[#020408]/50 shrink-0">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="text-xs md:text-sm font-black text-red-500 uppercase tracking-[0.5em] md:tracking-[0.7em] italic">AdjusterAI Labs</p>
            <p className="text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">Repair Orchestration v3.1.2</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-12">
            {['Privacy', 'Neural Guard', 'Audit'].map(label => (
              <span key={label} className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] cursor-help text-slate-400 hover:text-red-500 transition-colors relative group">
                {label}
                <div className="absolute -top-1.5 w-full h-0.5 bg-red-500 scale-x-0 group-hover:scale-x-100 transition-transform shadow-[0_0_8px_rgba(220,38,38,1)]" />
              </span>
            ))}
          </div>
        </footer>
      </div>

      <ReportPreviewModal />
      <CameraOverlay />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        :root { font-family: 'Space Grotesk', sans-serif; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; border: 1px solid transparent; background-clip: content-box; }
        .animate-in { animation: tactical-entry 0.6s cubic-bezier(0.1, 1, 0.1, 1) forwards; }
        @keyframes tactical-entry {
          from { opacity: 0; transform: translateY(15px) scale(0.99); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .perspective-1000 { perspective: 1000px; }
        .transform-gpu { transform-style: preserve-3d; }
        @media print {
          body * { visibility: hidden; }
          aside, header, footer, .sidebar-spacer { display: none !important; }
          .printable-document, .printable-document * { visibility: visible; }
          .printable-document { position: absolute; left: 0; top: 0; width: 100%; padding: 0; border: none !important; box-shadow: none !important; border-radius: 0 !important; background: white !important; color: black !important; }
          .printable-document div, .printable-document h4, .printable-document p, .printable-document span, .printable-document h1, .printable-document h3 { color: black !important; border-color: #ddd !important; background: transparent !important; box-shadow: none !important; }
          .dark .printable-document { background: white !important; }
        }
        @media (max-width: 640px) { h3 { font-size: 0.95rem !important; } p { font-size: 0.75rem !important; } }
      `}</style>
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
