import React from 'react';
import { FileText, Shuffle, Upload, CheckCircle2, Trash2, ChevronRight, Check, Loader2, Zap, FileSpreadsheet, Printer, Scale, Database } from 'lucide-react';
import { Platform, AppMode } from '../../../types';
import { useApp } from '../../context/AppContext';

export const ReverseEngineerView: React.FC = () => {
  const {
    step, setStep, state, setState, runTransmutation, handleModeToggle,
    handleComparisonFileUpload, exportToCSV, user
  } = useApp();

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex items-center justify-between mb-6 md:mb-12 gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
        {['Source Ingestion', 'Mapping Ecosystem', 'Results'].map((label, idx) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5 md:gap-2.5 min-w-[70px]">
              <div className={`w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-base border-2 transition-all duration-500 ${step >= idx + 1 ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'border-slate-800 text-slate-700 bg-[#0a0f1d]/20'}`}>
                {step > idx + 1 ? <Check size={16} /> : idx + 1}
              </div>
              <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] transition-colors text-center ${step >= idx + 1 ? 'text-emerald-500' : 'text-slate-800'}`}>{label}</span>
            </div>
            {idx < 2 && <div className={`flex-1 min-w-[15px] h-0.5 rounded-full transition-all duration-1000 ${step > idx + 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5 md:space-y-8 bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-emerald-900/20 shadow-2xl animate-in">
          <h3 className="text-xl md:text-3xl font-black tracking-tighter text-emerald-500 italic flex items-center gap-2.5 md:gap-4"><FileText size={28} className="md:size-[36px]" /> Ingest Source Estimate</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10">
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Source ecosystem</label>
              <select value={state.platformA} onChange={(e) => setState({...state, platformA: e.target.value as Platform})}
                className="w-full p-3.5 md:p-6 bg-[#0f172a] border-2 border-emerald-900/30 rounded-lg md:rounded-[2rem] font-bold text-sm md:text-lg text-slate-100 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer shadow-inner">
                <option value={Platform.XACTIMATE}>Xactimate System</option>
                <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                <option value={Platform.HAND_WRITTEN}>Handwritten Scope Sheet</option>
              </select>
            </div>
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Source Document</label>
              <div className="relative h-[52px] md:h-[72px] border-2 border-emerald-900/30 rounded-lg md:rounded-[2rem] flex items-center px-3 md:px-7 bg-[#0f172a] hover:border-emerald-500 transition-all cursor-pointer shadow-inner">
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
                    <span className="font-bold text-xs md:text-base">Upload Source File...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => setStep(2)} disabled={!state.fileA}
            className="w-full p-5 md:p-8 bg-emerald-600 text-white font-black text-base md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-[0_8px_25px_rgba(16,185,129,0.3)] hover:bg-emerald-500 hover:scale-[1.01] transition-all transform active:scale-95 border-b-3 md:border-b-6 border-emerald-800 disabled:opacity-30">
            Verify Source Integrity
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 md:space-y-8 bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-emerald-900/20 shadow-2xl animate-in">
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <h3 className="text-xl md:text-3xl font-black tracking-tighter text-emerald-500 italic flex items-center gap-2.5 md:gap-4"><Shuffle size={28} className="md:size-[36px]" /> Define Database Mapping</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10 items-center">
            <div className="p-5 md:p-8 bg-[#0f172a] rounded-lg md:rounded-[2rem] border-2 border-emerald-900/20 shadow-inner flex flex-col items-center gap-2 md:gap-5">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
                <p className="font-black text-base md:text-xl uppercase">IN</p>
              </div>
              <p className="font-black text-slate-500 uppercase tracking-widest text-[7px] md:text-[10px]">SOURCE ARCHITECTURE</p>
              <p className="text-lg md:text-2xl font-black text-slate-100 text-center">{state.platformA}</p>
            </div>
            <div className="p-5 md:p-8 bg-[#0f172a] rounded-lg md:rounded-[2rem] border-2 border-emerald-900/20 shadow-[0_0_40px_rgba(16,185,129,0.1)] flex flex-col items-center gap-2 md:gap-5 animate-pulse">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <ChevronRight size={24} className="md:size-[32px]" />
              </div>
              <p className="font-black text-emerald-500 uppercase tracking-widest text-[7px] md:text-[10px]">TARGET ECOSYSTEM</p>
              <select value={state.platformB} onChange={(e) => setState({...state, platformB: e.target.value as Platform})}
                className="bg-transparent border-none text-lg md:text-2xl font-black text-slate-100 outline-none cursor-pointer text-center appearance-none hover:text-emerald-400 transition-colors">
                <option value={Platform.XACTIMATE}>Xactimate Database</option>
                <option value={Platform.SYMBILITY_COTALITY}>Symbility / Cotality</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-5">
            <button onClick={() => setStep(1)} className="w-full md:w-1/3 p-3.5 md:p-8 border-4 border-emerald-900/30 text-emerald-500 font-black text-xs md:text-lg uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-lg md:rounded-[2.5rem] hover:bg-emerald-500/10 transition-all italic">Previous</button>
            <button onClick={runTransmutation} disabled={state.isAnalyzing}
              className="flex-1 p-3.5 md:p-8 bg-emerald-600 text-white font-black text-base md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl border-b-3 md:border-b-6 border-emerald-800 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 md:gap-5">
              {state.isAnalyzing ? <Loader2 size={20} className="md:size-[28px] animate-spin" /> : <>Execute Transmutation <Zap size={20} className="md:size-[28px] fill-emerald-100" /></>}
            </button>
          </div>
        </div>
      )}

      {step === 3 && state.analysisComplete && (
        <div className="space-y-5 md:space-y-8 animate-in">
          <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-emerald-900/20 shadow-2xl gap-5">
            <div className="space-y-0.5 md:space-y-1.5 text-center md:text-left">
              <h3 className="text-xl md:text-3xl font-black tracking-tighter text-emerald-500 italic">Transmutated Scope</h3>
              <p className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em]">From {state.platformA} → Migration to {state.platformB}</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => exportToCSV({ id: 'temp', userId: user?.uid || 'temp', type: 'Transmutation', title: 'Transmuted Scope', carrier: 'N/A', timestamp: Date.now(), platform: state.platformB, state })}
                className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-[#0f172a] text-emerald-400 border-2 border-blue-500/20 rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[7px] md:text-xs tracking-widest hover:bg-emerald-500/10 transition-all shadow-xl group">
                <FileSpreadsheet size={16} className="md:size-[22px] group-hover:scale-110 transition-transform" /> Spreadsheet
              </button>
              <button onClick={() => window.print()}
                className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-emerald-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[7px] md:text-xs tracking-widest hover:bg-emerald-500 transition-all shadow-xl border-b-3 md:border-b-4 border-emerald-800 group">
                <Printer size={16} className="md:size-[22px] group-hover:scale-110 transition-transform" /> Print As PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-5 printable-document">
            {state.lineItems.map(li => (
              <div key={li.id} className="p-5 md:p-8 bg-[#0a0f1d] dark:bg-[#050810] rounded-xl md:rounded-[2.5rem] border-2 border-emerald-900/20 shadow-2xl hover:border-emerald-500 transition-all flex flex-col md:flex-row justify-between gap-5 md:gap-8 group/item">
                <div className="flex-1 space-y-3 md:space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] md:text-[11px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3.5 md:px-5 py-0.5 md:py-1.5 rounded-full border border-emerald-500/20">{li.roomName}</span>
                  </div>
                  <h4 className="text-lg md:text-2xl font-black tracking-tight text-slate-100">{li.code} - {li.description}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="p-3 md:p-4 bg-emerald-500/5 rounded-lg md:rounded-xl border border-emerald-500/20 flex items-start gap-3">
                      <Scale size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">IRC Compliance</p>
                        <p className="text-[10px] md:text-xs font-bold text-slate-300">{li.ircReference || 'Standard Compliance'}</p>
                      </div>
                    </div>
                    <div className="p-3 md:p-4 bg-blue-500/5 rounded-lg md:rounded-xl border border-blue-500/20 flex items-start gap-3">
                      <Database size={16} className="text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Database Mapping</p>
                        <div className="flex flex-wrap gap-2">
                          {li.databaseMapping?.xactimate && <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Xact: {li.databaseMapping.xactimate}</span>}
                          {li.databaseMapping?.symbility && <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Symb: {li.databaseMapping.symbility}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3.5 md:p-5 bg-[#0f172a] rounded-lg md:rounded-[1.5rem] border border-emerald-900/10 shadow-inner group-hover/item:border-emerald-500/20 transition-all">
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 leading-relaxed italic border-l-3 border-emerald-500/40 pl-3 md:pl-5">"Mapping Justification: {li.justification}"</p>
                  </div>
                </div>
                <div className="text-right md:min-w-[140px] flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center">
                  <p className="text-3xl md:text-5xl font-black text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">${li.quantity}</p>
                  <p className="text-[7px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em] md:mt-1.5">{li.unit}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => handleModeToggle(AppMode.DASHBOARD)} className="w-full p-6 md:p-10 bg-[#0a0f1d] border-4 border-emerald-900/30 text-emerald-500 font-black text-xs md:text-lg uppercase tracking-[0.3em] md:tracking-[0.4em] rounded-xl md:rounded-[3rem] hover:bg-[#0f172a] hover:border-emerald-500 transition-all shadow-2xl transform active:scale-[0.98]">Reset Transmutation Engine</button>
        </div>
      )}
    </div>
  );
};
