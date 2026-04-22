import React from 'react';
import { Home, Tags, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const {
    resetBanks, newInteriorInput, setNewInteriorInput, interiorBank, setInteriorBank,
    newExteriorInput, setNewExteriorInput, exteriorBank, setExteriorBank
  } = useApp();

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-6xl mx-auto px-4 md:px-0">
      <div className="text-center space-y-1.5 md:space-y-3">
        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Settings Matrix</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-xs">Configure claim environment and room heuristics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10">
        <div className="bg-[#0a0f1d] dark:bg-[#050810] p-6 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-blue-900/20 shadow-2xl flex flex-col gap-5 md:gap-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-2xl font-black text-blue-500 tracking-tight flex items-center gap-2.5 md:gap-3"><Home size={24} className="md:size-[32px]" /> Interior Bank</h3>
            <button onClick={resetBanks} className="p-2 md:p-3 bg-blue-500/10 text-blue-500 rounded-lg md:rounded-xl hover:bg-blue-500/20 transition-all"><RotateCcw size={18} className="md:size-[22px]" /></button>
          </div>
          <div className="flex gap-2">
            <input type="text" value={newInteriorInput} onChange={(e) => setNewInteriorInput(e.target.value)}
              placeholder="Add Custom Room..."
              className="flex-1 p-3.5 md:p-5 bg-[#0f172a] border-2 border-blue-900/30 rounded-lg md:rounded-xl font-bold text-xs md:text-base text-slate-100 outline-none focus:border-blue-500 transition-all" />
            <button onClick={() => { if(newInteriorInput) { setInteriorBank([...interiorBank, newInteriorInput].sort()); setNewInteriorInput(''); } }}
              className="p-3.5 md:p-5 bg-blue-600 text-white rounded-lg md:rounded-xl hover:bg-blue-500 transition-all">
              <Plus size={20} className="md:size-[28px]" />
            </button>
          </div>
          <div className="h-48 md:h-80 overflow-y-auto custom-scrollbar pr-3 md:pr-4 space-y-1.5 md:space-y-2">
            {interiorBank.map(room => (
              <div key={room} className="flex items-center justify-between p-2.5 md:p-4 bg-[#0f172a] rounded-lg border border-blue-900/10 group">
                <span className="font-bold text-slate-300 text-xs md:text-base">{room}</span>
                <button onClick={() => setInteriorBank(interiorBank.filter(r => r !== room))} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={16} className="md:size-[20px]" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0a0f1d] dark:bg-[#050810] p-6 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-emerald-900/20 shadow-2xl flex flex-col gap-5 md:gap-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg md:text-2xl font-black text-emerald-500 tracking-tight flex items-center gap-2.5 md:gap-3"><Tags size={24} className="md:size-[32px]" /> Exterior Bank</h3>
            <button onClick={resetBanks} className="p-2 md:p-3 bg-emerald-500/10 text-emerald-500 rounded-lg md:rounded-xl hover:bg-emerald-500/20 transition-all"><RotateCcw size={18} className="md:size-[22px]" /></button>
          </div>
          <div className="flex gap-2">
            <input type="text" value={newExteriorInput} onChange={(e) => setNewExteriorInput(e.target.value)}
              placeholder="Add Custom Exterior..."
              className="flex-1 p-3.5 md:p-5 bg-[#0f172a] border-2 border-blue-900/30 rounded-lg md:rounded-[1.2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-emerald-500 transition-all" />
            <button onClick={() => { if(newExteriorInput) { setExteriorBank([...exteriorBank, newExteriorInput].sort()); setNewExteriorInput(''); } }}
              className="p-3.5 md:p-5 bg-emerald-600 text-white rounded-lg md:rounded-[1.2rem] hover:bg-emerald-500 transition-all">
              <Plus size={20} className="md:size-[28px]" />
            </button>
          </div>
          <div className="h-48 md:h-80 overflow-y-auto custom-scrollbar pr-3 md:pr-4 space-y-1.5 md:space-y-2">
            {exteriorBank.map(ext => (
              <div key={ext} className="flex items-center justify-between p-2.5 md:p-4 bg-[#0f172a] rounded-lg border border-blue-900/10 group">
                <span className="font-bold text-slate-300 text-xs md:text-base">{ext}</span>
                <button onClick={() => setExteriorBank(exteriorBank.filter(e => e !== ext))} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={16} className="md:size-[20px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
