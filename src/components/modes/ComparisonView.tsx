import React from 'react';
import { Files, ArrowRightLeft, Upload, CheckCircle2, ShieldCheck, ChevronDown, Database, Loader2, Check, Zap, FileSpreadsheet, Printer, Info } from 'lucide-react';
import { Platform, AppMode } from '../../../types';
import { useApp } from '../../context/AppContext';

export const ComparisonView: React.FC = () => {
  const {
    step, setStep, state, setState, masterBaselines, runComparison,
    handleComparisonFileUpload, handleModeToggle, exportToCSV, user
  } = useApp();

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex items-center justify-between mb-6 md:mb-12 gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
        {['Audit Ingestion', 'Reconciliation', 'Discrepancy Matrix'].map((label, idx) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5 md:gap-2.5 min-w-[70px]">
              <div className={`w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-base border-2 transition-all duration-500 ${step >= idx + 1 ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'border-slate-800 text-slate-700 bg-[#0a0f1d]/20'}`}>
                {step > idx + 1 ? <Check size={16} /> : idx + 1}
              </div>
              <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] transition-colors text-center ${step >= idx + 1 ? 'text-blue-500' : 'text-slate-800'}`}>{label}</span>
            </div>
            {idx < 2 && <div className={`flex-1 min-w-[15px] h-0.5 rounded-full transition-all duration-1000 ${step > idx + 1 ? 'bg-blue-600' : 'bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5 md:space-y-8 bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-blue-900/20 shadow-2xl animate-in">
          <h3 className="text-xl md:text-3xl font-black tracking-tighter text-blue-500 italic flex items-center gap-2.5 md:gap-4"><Files size={28} className="md:size-[36px]" /> Audit Ingestion</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
            {(['A', 'B'] as const).map((side) => (
              <div key={side} className="space-y-4 md:space-y-6 p-4 md:p-8 bg-[#0f172a] rounded-lg md:rounded-[2rem] border-2 border-blue-900/20 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-black">{side}</div>
                  <h4 className="text-base md:text-xl font-black text-slate-100 tracking-tight">{side === 'A' ? 'Primary Estimate' : 'Comparison Audit'}</h4>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Architecture</label>
                  <select value={side === 'A' ? state.platformA : state.platformB}
                    onChange={(e) => setState({...state, [side === 'A' ? 'platformA' : 'platformB']: e.target.value as Platform})}
                    className="w-full p-3.5 bg-[#080c16] border-2 border-blue-900/30 rounded-lg font-bold text-xs md:text-sm text-slate-100 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                    <option value={Platform.XACTIMATE}>Xactimate System</option>
                    <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                    <option value={Platform.HAND_WRITTEN}>Handwritten Scope</option>
                  </select>
                </div>
                <div className="relative h-[68px] md:h-[72px] border-2 border-dashed border-blue-900/30 rounded-lg flex items-center px-6 bg-[#080c16] hover:border-blue-500 transition-all cursor-pointer">
                  <input type="file" onChange={(e) => e.target.files?.[0] && handleComparisonFileUpload(side, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                  {(side === 'A' ? state.fileA : state.fileB) ? (
                    <div className="flex items-center gap-3 text-emerald-500 w-full">
                      <CheckCircle2 size={20} className="md:size-[24px]" />
                      <span className="font-bold truncate flex-1 text-xs">{(side === 'A' ? state.fileA : state.fileB)?.fileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-500">
                      <Upload size={20} className="md:size-[24px]" />
                      <span className="font-bold text-xs">Upload Est. {side}...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 md:space-y-6 p-6 md:p-10 bg-[#0f172a] rounded-lg md:rounded-[2rem] border-2 border-blue-900/20 shadow-inner">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck size={24} className="text-blue-500" />
              <h4 className="text-base md:text-xl font-black text-slate-100 tracking-tight">Master Baseline (Optional)</h4>
            </div>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Compare against a pre-defined gold standard estimate</p>
            <div className="relative">
              <Database size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <select value={state.activeBaselineId || ''}
                onChange={(e) => setState({...state, activeBaselineId: e.target.value || undefined})}
                className="w-full pl-12 pr-6 py-4 md:py-6 bg-[#080c16] border-2 border-blue-900/30 rounded-lg md:rounded-[1.5rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-inner">
                <option value="">No Master Baseline (Direct Comparison)</option>
                {masterBaselines.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.platform})</option>
                ))}
              </select>
              <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <button onClick={() => setStep(2)} disabled={!state.fileA || !state.fileB}
            className="w-full p-5 md:p-8 bg-blue-600 text-white font-black text-base md:text-xl uppercase tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl hover:bg-blue-500 hover:scale-[1.01] transition-all transform active:scale-95 border-b-6 md:border-b-8 border-blue-800 disabled:opacity-30">
            Initialize Audit Reconciliation
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 md:space-y-8 bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-blue-900/20 shadow-2xl animate-in">
          <h3 className="text-xl md:text-3xl font-black tracking-tighter text-blue-500 italic flex items-center gap-2.5 md:gap-4"><ArrowRightLeft size={28} className="md:size-[36px]" /> Confirm Audit Parameters</h3>
          <div className="p-6 md:p-10 bg-[#0f172a] rounded-lg md:rounded-[2rem] border-2 border-blue-900/10 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left space-y-1.5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Primary Source</p>
              <p className="text-lg md:text-2xl font-black text-slate-100">{state.fileA?.fileName}</p>
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-0.5 rounded-full">{state.platformA}</span>
            </div>
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center animate-pulse"><ArrowRightLeft size={28} className="md:size-[36px]" /></div>
            <div className="flex-1 text-center md:text-right space-y-1.5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Comparison Source</p>
              <p className="text-lg md:text-2xl font-black text-slate-100">{state.fileB?.fileName}</p>
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-3 py-0.5 rounded-full">{state.platformB}</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <button onClick={() => setStep(1)} className="w-full md:w-1/3 p-4 md:p-8 border-4 border-blue-900/30 text-blue-500 font-black text-xs md:text-base uppercase tracking-[0.3em] rounded-lg md:rounded-[2.5rem] hover:bg-blue-500/10 transition-all italic">Previous</button>
            <button onClick={runComparison} disabled={state.isAnalyzing}
              className="flex-1 p-4 md:p-8 bg-blue-600 text-white font-black text-base md:text-xl uppercase tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl border-b-6 md:border-b-8 border-blue-800 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4 md:gap-6">
              {state.isAnalyzing ? <Loader2 size={28} className="animate-spin md:size-[36px]" /> : <>Execute Logic Audit <Zap size={28} className="fill-blue-100 md:size-[36px]" /></>}
            </button>
          </div>
        </div>
      )}

      {step === 3 && state.analysisComplete && (
        <div className="space-y-5 md:space-y-8 animate-in">
          <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-blue-900/20 shadow-2xl gap-5">
            <div className="space-y-0.5 md:space-y-1.5 text-center md:text-left">
              <h3 className="text-xl md:text-3xl font-black tracking-tighter text-blue-500 italic">Audit Reconciliation</h3>
              <p className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em]">Comparison: {state.platformA} vs {state.platformB}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportToCSV({id: 'temp', userId: user?.uid || 'temp', type: 'Comparison', title: 'Audit Report', carrier: 'Dual', timestamp: Date.now(), platform: 'Dual', state})}
                className="px-6 md:px-8 py-3 md:py-4 bg-[#0f172a] text-blue-400 border-2 border-blue-500/20 rounded-lg md:rounded-[1.2rem] flex items-center gap-3 md:gap-4 font-black uppercase text-[9px] md:text-xs tracking-widest hover:bg-blue-500/10 transition-all shadow-xl group">
                <FileSpreadsheet size={20} className="group-hover:scale-110 transition-transform md:size-[28px]" /> Spreadsheet
              </button>
              <button onClick={() => window.print()} className="px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center gap-3 md:gap-4 font-black uppercase text-[9px] md:text-xs tracking-widest hover:bg-blue-500 transition-all shadow-xl border-b-3 md:border-b-4 border-blue-800 group">
                <Printer size={20} className="group-hover:scale-110 transition-transform md:size-[28px]" /> Print Audit
              </button>
            </div>
          </div>

          {state.comparisonResult && (
            <div className="space-y-5 md:space-y-8 animate-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
                <div className="bg-[#0a0f1d] p-8 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-blue-900/20 shadow-2xl flex flex-col items-center justify-center gap-2 md:gap-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Delta</p>
                  <p className={`text-3xl md:text-5xl font-black ${state.comparisonResult.summary.total.b - state.comparisonResult.summary.total.a >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    ${Math.abs(state.comparisonResult.summary.total.b - state.comparisonResult.summary.total.a).toLocaleString()}
                  </p>
                </div>
                <div className="bg-[#0a0f1d] p-8 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-blue-900/20 shadow-2xl flex flex-col items-center justify-center gap-2 md:gap-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Labor Delta</p>
                  <p className="text-xl md:text-3xl font-black text-blue-500">${Math.abs(state.comparisonResult.summary.labor.b - state.comparisonResult.summary.labor.a).toLocaleString()}</p>
                </div>
                <div className="bg-[#0a0f1d] p-8 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-blue-900/20 shadow-2xl flex flex-col items-center justify-center gap-2 md:gap-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Material Delta</p>
                  <p className="text-xl md:text-3xl font-black text-blue-500">${Math.abs(state.comparisonResult.summary.material.b - state.comparisonResult.summary.material.a).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-[#0a0f1d] p-8 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-blue-900/20 shadow-2xl space-y-4 md:space-y-6">
                <h4 className="text-xl md:text-3xl font-black text-blue-500 italic flex items-center gap-3 md:gap-4"><Info size={28} className="md:size-[32px]" /> Narrative Audit Summary</h4>
                <p className="text-slate-300 font-bold leading-relaxed whitespace-pre-wrap italic border-l-6 md:border-l-8 border-blue-500/30 pl-6 md:pl-10 text-sm md:text-lg">"{state.comparisonResult.narrative}"</p>
              </div>

              <div className="space-y-4 md:space-y-6 printable-document">
                {state.comparisonResult.variances.map((v, i) => (
                  <div key={i} className="bg-[#0a0f1d] p-6 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-blue-900/20 shadow-xl flex flex-col md:flex-row justify-between gap-6 md:gap-10 hover:border-blue-500/50 transition-all">
                    <div className="flex-1 space-y-3 md:space-y-4">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] bg-blue-500/10 px-4 md:px-6 py-1 md:py-2 rounded-full border border-blue-500/20">{v.category}</span>
                      <div className="grid grid-cols-2 gap-5 md:gap-8">
                        <div>
                          <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Source A ({state.platformA})</p>
                          <p className="font-bold text-slate-200 text-xs md:text-base">{v.itemA}</p>
                        </div>
                        <div>
                          <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Source B ({state.platformB})</p>
                          <p className="font-bold text-slate-200 text-xs md:text-base">{v.itemB}</p>
                        </div>
                      </div>
                      <p className="text-[10px] md:text-sm font-bold text-slate-400 italic bg-[#0f172a] p-4 md:p-6 rounded-lg md:rounded-2xl border border-blue-900/20">Reason: {v.reason}</p>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center min-w-[120px] md:min-w-[160px]">
                      <p className={`text-2xl md:text-4xl font-black ${v.delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>${Math.abs(v.delta).toLocaleString()}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5 md:mt-2">{v.delta >= 0 ? 'Surplus' : 'Deficit'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => handleModeToggle(AppMode.DASHBOARD)} className="w-full p-8 md:p-12 bg-[#0a0f1d] border-4 border-blue-900/30 text-blue-500 font-black text-sm md:text-xl uppercase tracking-[0.4em] md:tracking-[0.5em] rounded-xl md:rounded-[3rem] hover:bg-[#0f172a] hover:border-blue-500 transition-all shadow-2xl">Reset Audit Engine</button>
        </div>
      )}
    </div>
  );
};
