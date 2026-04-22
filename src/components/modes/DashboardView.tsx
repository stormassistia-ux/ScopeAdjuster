import React from 'react';
import { Search, ArrowRightLeft, RefreshCw, ShieldCheck, ChevronRight, Shuffle } from 'lucide-react';
import { AppMode } from '../../../types';
import { useApp } from '../../context/AppContext';

export const DashboardView: React.FC = () => {
  const { handleModeToggle } = useApp();

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-1 md:space-y-3 px-4">
        <h2 className="text-2xl md:text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tighter drop-shadow-2xl">Enterprise Dashboard</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs md:text-lg max-w-xl mx-auto opacity-70">Automate forensic repair scoping with hyper-tactile AI intelligence.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-8 max-w-7xl mx-auto perspective-1000 px-4 md:px-0">
        <button
          onClick={() => handleModeToggle(AppMode.INVESTIGATION)}
          className="group relative bg-[#0a0f1d] dark:bg-[#050810] p-6 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-red-900/30 shadow-2xl hover:shadow-red-500/10 transition-all text-left overflow-hidden transform-gpu hover:-translate-y-1 duration-500 flex flex-col gap-4 md:gap-8"
        >
          <div className="absolute top-0 right-0 p-3 md:p-6 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-1000 transform group-hover:scale-110">
            <Search size={140} className="text-red-500 rotate-6" />
          </div>
          <div className="w-12 h-12 md:w-20 md:h-20 bg-[#1a0a0a] rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-red-500 border border-red-500/20 relative group-hover:scale-110 transition-transform duration-500">
            <Search size={28} className="md:size-[40px] drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
          </div>
          <div className="space-y-1 md:space-y-3 relative z-10">
            <h3 className="text-lg md:text-2xl font-black text-red-500 tracking-tight">Claim Investigation</h3>
            <p className="text-slate-400 font-bold text-xs md:text-base leading-relaxed opacity-80">Forensic repair scoping from site photos and carrier protocols.</p>
          </div>
          <div className="flex items-center text-red-500 font-black text-[9px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] gap-2 md:gap-4 mt-auto group-hover:gap-6 transition-all">
            Initialize Logic <ChevronRight size={16} className="md:size-[20px]" />
          </div>
        </button>

        <button
          onClick={() => handleModeToggle(AppMode.COMPARISON)}
          className="group relative bg-[#0a0f1d] dark:bg-[#050810] p-6 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-blue-900/30 shadow-2xl hover:shadow-blue-500/10 transition-all text-left overflow-hidden transform-gpu hover:-translate-y-1 duration-500 flex flex-col gap-4 md:gap-8"
        >
          <div className="absolute top-0 right-0 p-3 md:p-6 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-1000 transform group-hover:scale-110">
            <ArrowRightLeft size={140} className="text-blue-500 -rotate-6" />
          </div>
          <div className="w-12 h-12 md:w-20 md:h-20 bg-[#0f172a] rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-blue-500 border border-blue-500/20 relative group-hover:scale-110 transition-transform duration-500">
            <ArrowRightLeft size={28} className="md:size-[40px] drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
          </div>
          <div className="space-y-1 md:space-y-3 relative z-10">
            <h3 className="text-lg md:text-2xl font-black text-blue-500 tracking-tight">Audit Compare</h3>
            <p className="text-slate-400 font-bold text-xs md:text-base leading-relaxed opacity-80">Reconcile differences between disparate digital platforms.</p>
          </div>
          <div className="flex items-center text-blue-500 font-black text-[9px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] gap-2 md:gap-4 mt-auto group-hover:gap-6 transition-all">
            Initialize Audit <ChevronRight size={16} className="md:size-[20px]" />
          </div>
        </button>

        <button
          onClick={() => handleModeToggle(AppMode.REVERSE_ENGINEER)}
          className="group relative bg-[#0a0f1d] dark:bg-[#050810] p-6 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-emerald-900/30 shadow-2xl hover:shadow-emerald-500/10 transition-all text-left overflow-hidden transform-gpu hover:-translate-y-1 duration-500 flex flex-col gap-4 md:gap-8"
        >
          <div className="absolute top-0 right-0 p-3 md:p-6 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-1000 transform group-hover:scale-110">
            <Shuffle size={140} className="text-emerald-500 rotate-12" />
          </div>
          <div className="w-12 h-12 md:w-20 md:h-20 bg-[#0a1a15] rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-emerald-500 border border-emerald-500/20 relative group-hover:scale-110 transition-transform duration-500">
            <RefreshCw size={28} className="md:size-[40px] drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
          </div>
          <div className="space-y-1 md:space-y-3 relative z-10">
            <h3 className="text-lg md:text-2xl font-black text-emerald-500 tracking-tight italic">Reverse Engineer</h3>
            <p className="text-slate-400 font-bold text-xs md:text-base leading-relaxed opacity-80">Database Transmutation: Convert Xactimate to Symbility instantly.</p>
          </div>
          <div className="flex items-center text-emerald-500 font-black text-[9px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] gap-2 md:gap-4 mt-auto group-hover:gap-6 transition-all">
            Initiate Transmute <ChevronRight size={16} className="md:size-[20px]" />
          </div>
        </button>

        <button
          onClick={() => handleModeToggle(AppMode.COMPLIANCE_AUDIT)}
          className="group relative bg-[#0a0f1d] dark:bg-[#050810] p-6 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-amber-900/30 shadow-2xl hover:shadow-amber-500/10 transition-all text-left overflow-hidden transform-gpu hover:-translate-y-1 duration-500 flex flex-col gap-4 md:gap-8"
        >
          <div className="absolute top-0 right-0 p-3 md:p-6 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-1000 transform group-hover:scale-110">
            <ShieldCheck size={140} className="text-amber-500 -rotate-12" />
          </div>
          <div className="w-12 h-12 md:w-20 md:h-20 bg-[#1a150a] rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-amber-500 border border-amber-500/20 relative group-hover:scale-110 transition-transform duration-500">
            <ShieldCheck size={28} className="md:size-[40px] drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
          </div>
          <div className="space-y-1 md:space-y-3 relative z-10">
            <h3 className="text-lg md:text-2xl font-black text-amber-500 tracking-tight">Compliance Audit</h3>
            <p className="text-slate-400 font-bold text-xs md:text-base leading-relaxed opacity-80">Post-Estimate Review: Detect leakage, overlaps, and IRC violations.</p>
          </div>
          <div className="flex items-center text-amber-500 font-black text-[9px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] gap-2 md:gap-4 mt-auto group-hover:gap-6 transition-all">
            Start Audit <ChevronRight size={16} className="md:size-[20px]" />
          </div>
        </button>
      </div>
    </div>
  );
};
