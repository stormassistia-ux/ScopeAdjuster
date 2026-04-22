import React from 'react';
import { Building2, LayoutGrid, Upload, CheckCircle2, Trash2, FileSearch, ShieldCheck, Loader2, Check, Zap, FileSpreadsheet, Printer } from 'lucide-react';
import { Platform, AppMode } from '../../../types';
import { useApp } from '../../context/AppContext';

export const AuditView: React.FC = () => {
  const {
    step, setStep, state, setState, fetchedGuidelines, guidelinesLoading, fetchGuidelines,
    runAudit, handleModeToggle, handleComparisonFileUpload, exportToCSV, user
  } = useApp();

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex items-center justify-between mb-6 md:mb-12 gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
        {['Audit Setup', 'Guidelines', 'Results'].map((label, idx) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5 md:gap-2.5 min-w-[70px]">
              <div className={`w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-base border-2 transition-all duration-500 ${step >= idx + 1 ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'border-slate-800 text-slate-700 bg-[#0a0f1d]/20'}`}>
                {step > idx + 1 ? <Check size={16} /> : idx + 1}
              </div>
              <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] transition-colors text-center ${step >= idx + 1 ? 'text-amber-500' : 'text-slate-800'}`}>{label}</span>
            </div>
            {idx < 2 && <div className={`flex-1 min-w-[15px] h-0.5 rounded-full transition-all duration-1000 ${step > idx + 1 ? 'bg-amber-600' : 'bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5 md:space-y-8 bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-amber-900/20 shadow-2xl animate-in">
          <h3 className="text-xl md:text-3xl font-black tracking-tighter text-amber-500 italic flex items-center gap-2.5 md:gap-4"><ShieldCheck size={28} className="md:size-[36px]" /> Compliance Audit Setup</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10">
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Carrier Registry</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={state.carrier} onChange={(e) => setState({...state, carrier: e.target.value})}
                  className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-amber-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-amber-500 transition-all shadow-inner"
                  placeholder="Identify Carrier..." />
              </div>
            </div>
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Estimate Platform</label>
              <div className="relative">
                <LayoutGrid size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select value={state.platform} onChange={(e) => setState({...state, platform: e.target.value as Platform})}
                  className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-amber-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer shadow-inner">
                  <option value={Platform.XACTIMATE}>Xactimate System</option>
                  <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                  <option value={Platform.HAND_WRITTEN}>Handwritten Scope</option>
                </select>
              </div>
            </div>
            <div className="space-y-3 md:space-y-5 md:col-span-2">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Estimate File to Audit</label>
              <div className="relative h-[52px] md:h-[72px] border-2 border-amber-900/30 rounded-lg md:rounded-[2rem] flex items-center px-3 md:px-7 bg-[#0f172a] hover:border-amber-500 transition-all cursor-pointer shadow-inner">
                <input type="file" onChange={(e) => e.target.files?.[0] && handleComparisonFileUpload('A', e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                {state.fileA ? (
                  <div className="flex items-center gap-2 md:gap-3 text-emerald-500 w-full">
                    <CheckCircle2 size={18} className="md:size-[22px]" />
                    <span className="font-bold truncate flex-1 text-xs md:text-base">{state.fileA.fileName}</span>
                    <Trash2 size={16} className="md:size-[18px] hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); setState({...state, fileA: undefined}); }} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 md:gap-3 text-slate-500">
                    <Upload size={18} className="md:size-[22px]" />
                    <span className="font-bold text-xs md:text-base">Upload Estimate File...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => { if(state.carrier) fetchGuidelines(state.carrier); setStep(2); }} disabled={!state.carrier || !state.fileA}
            className="w-full p-5 md:p-8 bg-amber-600 text-white font-black text-base md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-[0_8px_25px_rgba(245,158,11,0.3)] hover:bg-amber-500 hover:scale-[1.01] transition-all transform active:scale-95 border-b-3 md:border-b-6 border-amber-800 disabled:opacity-30">
            Secure Audit Logic
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 md:space-y-8 bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-amber-900/20 shadow-2xl animate-in">
          <h3 className="text-xl md:text-3xl font-black tracking-tighter text-amber-500 italic flex items-center gap-2.5 md:gap-4"><FileSearch size={28} className="md:size-[36px]" /> Audit Guidelines</h3>
          <div className="grid grid-cols-1 gap-5 md:gap-10">
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Carrier Protocols {guidelinesLoading && <Loader2 className="inline animate-spin ml-1.5 size-3" />}</label>
              <div className="p-5 md:p-8 bg-[#0f172a] border-2 border-amber-900/10 rounded-lg md:rounded-[2.5rem] min-h-[120px] md:min-h-[180px] shadow-inner text-slate-300 font-bold leading-relaxed whitespace-pre-wrap italic text-xs md:text-base">
                {fetchedGuidelines || 'Retrieving policy guidelines for ' + state.carrier + '...'}
              </div>
            </div>
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Override / Custom Logic</label>
              <input type="text" value={(state as any).customGuidelines || ''} onChange={(e) => setState({...state, customGuidelines: e.target.value} as any)}
                className="w-full p-3.5 md:p-7 bg-[#0f172a] border-2 border-amber-900/30 rounded-lg md:rounded-[1.8rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-amber-500 transition-all shadow-inner"
                placeholder="Add specific adjuster notes or unique carrier rules..." />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-5">
            <button onClick={() => setStep(1)} className="w-full md:w-1/3 p-3.5 md:p-8 border-4 border-amber-900/30 text-amber-500 font-black text-xs md:text-base uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-lg md:rounded-[2.5rem] hover:bg-amber-500/10 transition-all italic">Previous</button>
            <button onClick={runAudit} disabled={state.isAnalyzing}
              className="flex-1 p-3.5 md:p-8 bg-amber-600 text-white font-black text-sm md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3">
              {state.isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <>Execute Compliance Audit <Zap size={24} className="fill-amber-100" /></>}
            </button>
          </div>
        </div>
      )}

      {step === 3 && state.analysisComplete && (state as any).auditResult && (
        <div className="space-y-5 md:space-y-8 animate-in">
          <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-amber-900/20 shadow-2xl gap-5">
            <div className="space-y-0.5 md:space-y-1.5 text-center md:text-left">
              <h3 className="text-xl md:text-3xl font-black tracking-tighter text-amber-500 italic">Audit Findings</h3>
              <p className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em]">Carrier: {state.carrier} • Platform: {state.platform}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportToCSV({id: 'temp', userId: user?.uid || 'temp', type: 'Compliance Audit', title: 'Audit Report', carrier: state.carrier, timestamp: Date.now(), platform: state.platform, state})}
                className="px-6 md:px-8 py-3 md:py-4 bg-[#0f172a] text-amber-400 border-2 border-amber-500/20 rounded-lg md:rounded-[1.2rem] flex items-center gap-3 md:gap-4 font-black uppercase text-[9px] md:text-xs tracking-widest hover:bg-amber-500/10 transition-all shadow-xl group">
                <FileSpreadsheet size={20} className="group-hover:scale-110 transition-transform md:size-[28px]" /> Spreadsheet
              </button>
              <button onClick={() => window.print()} className="px-6 md:px-8 py-3 md:py-4 bg-amber-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center gap-3 md:gap-4 font-black uppercase text-[9px] md:text-xs tracking-widest hover:bg-amber-500 transition-all shadow-xl border-b-3 md:border-b-4 border-amber-800 group">
                <Printer size={20} className="group-hover:scale-110 transition-transform md:size-[28px]" /> Print Audit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
            <div className="bg-[#0a0f1d] p-8 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-amber-900/20 shadow-2xl flex flex-col items-center justify-center gap-2 md:gap-4">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Compliance Score</p>
              <p className={`text-4xl md:text-6xl font-black ${(state as any).auditResult.score >= 90 ? 'text-emerald-500' : (state as any).auditResult.score >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                {(state as any).auditResult.score}%
              </p>
            </div>
            <div className="md:col-span-2 bg-[#0a0f1d] p-8 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-amber-900/20 shadow-2xl space-y-3 md:space-y-4">
              <h4 className="text-lg md:text-xl font-black text-amber-500 uppercase tracking-widest italic">Audit Summary</h4>
              <p className="text-slate-300 font-bold leading-relaxed italic border-l-4 border-amber-500/30 pl-4 md:pl-6 text-sm md:text-base">"{(state as any).auditResult.summary}"</p>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6 printable-document">
            {(state as any).auditResult.suggestions.map((s: any, i: number) => (
              <div key={i} className="bg-[#0a0f1d] p-6 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-amber-900/20 shadow-xl flex flex-col md:flex-row justify-between gap-6 md:gap-10 hover:border-amber-500/50 transition-all">
                <div className="flex-1 space-y-3 md:space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 md:px-6 py-1 md:py-2 rounded-full border ${
                      s.type === 'IRC Violation' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      s.type === 'Missed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      s.type === 'Overlapping' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>{s.type}</span>
                    {s.itemCode && <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Code: {s.itemCode}</span>}
                    <span className={`text-[9px] font-black uppercase tracking-widest ${s.severity === 'High' ? 'text-red-500' : s.severity === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {s.severity} Priority
                    </span>
                  </div>
                  <h4 className="text-lg md:text-xl font-black text-slate-100 tracking-tight">{s.description}</h4>
                  <div className="p-4 md:p-6 bg-[#0f172a] rounded-lg md:rounded-2xl border border-amber-900/20">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-2">Suggested Action</p>
                    <p className="text-[10px] md:text-sm font-bold text-slate-300 italic">{s.suggestedAction}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => handleModeToggle(AppMode.DASHBOARD)} className="w-full p-8 md:p-12 bg-[#0a0f1d] border-4 border-amber-900/30 text-amber-500 font-black text-sm md:text-xl uppercase tracking-[0.4em] md:tracking-[0.5em] rounded-xl md:rounded-[3rem] hover:bg-[#0f172a] hover:border-amber-500 transition-all shadow-2xl">Reset Audit Engine</button>
        </div>
      )}
    </div>
  );
};
