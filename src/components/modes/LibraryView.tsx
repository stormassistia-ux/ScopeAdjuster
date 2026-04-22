import React from 'react';
import { Zap, Search, Loader2, TrendingUp, TrendingDown, BookOpen, Calendar, ExternalLink, Trash2, ShieldCheck, Plus, RefreshCw, X } from 'lucide-react';
import { AppMode } from '../../../types';
import { useApp } from '../../context/AppContext';

export const LibraryView: React.FC = () => {
  const {
    marketIntel, isSearchingMarket, handleMarketSearch,
    savedGuidelines, deleteSavedGuideline, setFetchedGuidelines, setState, state, setStep,
    masterBaselines, deleteMasterBaseline, handleBaselineImport,
    handleSuggestAdjustments, isAdjusting, suggestedAdjustments, setSuggestedAdjustments, applyAdjustments
  } = useApp();

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-6xl mx-auto px-4 md:px-0">
      <div className="text-center space-y-1.5 md:space-y-3">
        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Policy Library</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-xs">Stored carrier protocols and estimating guidelines</p>
      </div>

      {/* Market Intelligence */}
      <div className="bg-[#0a0f1d] dark:bg-[#050810] p-6 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-blue-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Zap size={120} className="text-blue-500" />
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl md:text-3xl font-black text-slate-100 uppercase tracking-tighter italic flex items-center justify-center md:justify-start gap-3">
              <Zap className="text-blue-500 fill-blue-500/20" /> Market Intelligence
            </h3>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-xs">Real-time price list tracking & market trends</p>
          </div>
          <button onClick={handleMarketSearch} disabled={isSearchingMarket}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-3 active:scale-95">
            {isSearchingMarket ? <Loader2 className="animate-spin" /> : <Search size={20} />}
            {isSearchingMarket ? 'Scanning Market...' : 'Search Market Rates'}
          </button>
        </div>

        {marketIntel && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-blue-500/10 space-y-4">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Latest Price Lists</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Xactimate</span>
                  <span className="text-xs font-black text-slate-100 bg-blue-500/20 px-2 py-1 rounded">{marketIntel.xactimateVersion}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Symbility</span>
                  <span className="text-xs font-black text-slate-100 bg-emerald-500/20 px-2 py-1 rounded">{marketIntel.symbilityVersion}</span>
                </div>
              </div>
              <p className="text-[8px] text-slate-600 font-bold uppercase italic">Region: {marketIntel.zipCode}</p>
            </div>
            <div className="md:col-span-2 bg-[#0f172a] p-6 rounded-2xl border border-blue-500/10 space-y-4">
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Market Trends & Benchmarks</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {marketIntel.trends.map((trend, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5">
                    <div className={`p-2 rounded-lg ${trend.change.includes('+') ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {trend.change.includes('+') ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-200 uppercase tracking-tight">{trend.category}</p>
                      <p className="text-[9px] text-slate-500 font-medium leading-tight mt-1">{trend.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Saved Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
        {savedGuidelines.map(guideline => (
          <div key={guideline.id} className="bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-8 rounded-xl md:rounded-[2.5rem] border-2 border-slate-800 hover:border-blue-500 transition-all flex flex-col gap-3 md:gap-5 group relative">
            <div className="flex justify-between items-start">
              <div className="bg-blue-500/10 p-3 md:p-4 rounded-lg md:rounded-xl text-blue-500 shadow-inner"><BookOpen size={28} className="md:size-[36px]" /></div>
              <button onClick={() => deleteSavedGuideline(guideline.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} className="md:size-[24px]" /></button>
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg md:text-2xl text-slate-100 tracking-tight">{guideline.carrier} Guidelines</h3>
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={12} className="md:size-[16px]" />
                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">{new Date(guideline.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="p-5 md:p-6 bg-[#0f172a] rounded-lg md:rounded-xl border border-blue-900/10 shadow-inner max-h-36 md:h-48 overflow-y-auto custom-scrollbar text-[10px] md:text-sm text-slate-400 leading-relaxed italic">
              {guideline.content}
            </div>
            <button onClick={() => { setFetchedGuidelines(guideline.content); setState({...state, carrier: guideline.carrier, mode: AppMode.INVESTIGATION}); setStep(2); }}
              className="mt-2 md:mt-4 w-full py-3 md:py-4 bg-[#0f172a] text-blue-400 font-black uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-lg md:rounded-xl hover:bg-blue-500/10 transition-all border border-blue-500/10 flex items-center justify-center gap-2">
              <ExternalLink size={14} className="md:size-[20px]" /> Load into Engine
            </button>
          </div>
        ))}
        {savedGuidelines.length === 0 && (
          <div className="col-span-full py-12 md:py-20 text-center border-4 border-dashed border-slate-800 rounded-xl md:rounded-[3rem] opacity-30 flex flex-col items-center gap-3 md:gap-5">
            <BookOpen size={50} className="md:size-[70px] text-slate-500" />
            <p className="text-base md:text-xl font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-400">Library is currently empty</p>
          </div>
        )}
      </div>

      {/* Master Baselines */}
      <div className="text-center space-y-1.5 md:space-y-3 mt-12 md:mt-20">
        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Master Baselines</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-xs">Gold standard estimates for automated comparison</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
        <div className="bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-8 rounded-xl md:rounded-[2.5rem] border-2 border-dashed border-blue-900/40 hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-4 group relative cursor-pointer min-h-[200px]">
          <input type="file" onChange={(e) => e.target.files?.[0] && handleBaselineImport(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
          <div className="bg-blue-500/10 p-4 rounded-full text-blue-500 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
          <p className="font-black text-xs md:text-sm text-slate-400 uppercase tracking-widest text-center">Import New Baseline<br/><span className="text-[8px] opacity-50 font-bold">(Xactimate/Symbility Export)</span></p>
        </div>

        {masterBaselines.map(baseline => (
          <div key={baseline.id} className="bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-8 rounded-xl md:rounded-[2.5rem] border-2 border-slate-800 hover:border-emerald-500 transition-all flex flex-col gap-3 md:gap-5 group relative">
            <div className="flex justify-between items-start">
              <div className="bg-emerald-500/10 p-3 md:p-4 rounded-lg md:rounded-xl text-emerald-500 shadow-inner"><ShieldCheck size={28} className="md:size-[36px]" /></div>
              <button onClick={(e) => deleteMasterBaseline(baseline.id, e)} className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} className="md:size-[24px]" /></button>
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg md:text-2xl text-slate-100 tracking-tight">{baseline.name}</h3>
              <p className="text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest">{baseline.platform} • {baseline.lineItems.length} Items</p>
              <p className="text-xs text-slate-400 line-clamp-2 mt-2">{baseline.description}</p>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-800/50 space-y-3">
              <button onClick={() => handleSuggestAdjustments(baseline)} disabled={isAdjusting === baseline.id || !marketIntel}
                className="w-full py-2.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                {isAdjusting === baseline.id ? <Loader2 className="animate-spin size-3" /> : <RefreshCw size={12} />}
                Suggest Price Adjustments
              </button>

              {suggestedAdjustments[baseline.id] && (
                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Market Updates ({suggestedAdjustments[baseline.id].length})</p>
                    <button onClick={() => setSuggestedAdjustments(prev => { const n = {...prev}; delete n[baseline.id]; return n; })} className="text-slate-600 hover:text-white"><X size={10} /></button>
                  </div>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {suggestedAdjustments[baseline.id].map((adj, idx) => (
                      <div key={idx} className="text-[9px] flex justify-between items-center p-2 bg-slate-900/50 rounded border border-white/5">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-200">{adj.itemCode}</span>
                          <span className="text-[8px] text-slate-500 truncate max-w-[100px]">{adj.reason}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-black ${adj.percentageChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {adj.percentageChange > 0 ? '+' : ''}{adj.percentageChange}%
                          </span>
                          <p className="text-[7px] text-slate-600 font-bold">${adj.currentPrice} → ${adj.suggestedPrice}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => applyAdjustments(baseline.id)}
                    className="w-full mt-4 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20">
                    Apply All Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
