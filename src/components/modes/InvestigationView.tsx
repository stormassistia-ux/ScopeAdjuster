import React from 'react';
import {
  Building2, LayoutGrid, FileSearch, Check, Loader2, Mic, Square, Upload, Camera,
  AlertCircle, X, Plus, Trash2, Search, ImageIcon, Zap, FileSpreadsheet, Printer,
  User, Hash, Scale, Database, CheckCircle2
} from 'lucide-react';
import { Platform, AppMode } from '../../../types';
import { useApp } from '../../context/AppContext';

export const InvestigationView: React.FC = () => {
  const {
    step, setStep, state, setState, fetchedGuidelines, setFetchedGuidelines,
    guidelinesLoading, fetchGuidelines, toggleDictation, isDictating,
    uploadError, setUploadError, dragActiveId, handleDrag, handleDrop,
    handleEvidenceUpload, startCamera, activeZoneType, setActiveZoneType,
    roomSearch, setRoomSearch, interiorBank, exteriorBank, addRoom, removeRoom,
    runInvestigationAnalysis, handleModeToggle, exportToCSV, user
  } = useApp();

  const currentBank = activeZoneType === 'Interior' ? interiorBank : exteriorBank;
  const filteredBank = currentBank.filter(r => r.toLowerCase().includes(roomSearch.toLowerCase()));

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-6xl mx-auto px-4 md:px-0">
      <div className="flex items-center justify-between mb-6 md:mb-12 gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
        {['Identity', 'Guidelines', 'Evidence', 'Results'].map((label, idx) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5 md:gap-2.5 min-w-[70px]">
              <div className={`w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-base border-2 transition-all duration-500 ${step >= idx + 1 ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'border-slate-800 text-slate-700 bg-[#0a0f1d]/20'}`}>
                {step > idx + 1 ? <Check size={16} /> : idx + 1}
              </div>
              <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] transition-colors text-center ${step >= idx + 1 ? 'text-red-500' : 'text-slate-800'}`}>{label}</span>
            </div>
            {idx < 3 && <div className={`flex-1 min-w-[15px] h-0.5 rounded-full transition-all duration-1000 ${step > idx + 1 ? 'bg-red-600' : 'bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5 md:space-y-8 bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-red-900/20 shadow-2xl animate-in">
          <h3 className="text-xl md:text-3xl font-black tracking-tighter text-red-500 italic flex items-center gap-2.5 md:gap-4"><Building2 size={28} className="md:size-[36px]" /> Initialize Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10">
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Carrier Registry</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={state.carrier} onChange={(e) => setState({...state, carrier: e.target.value})}
                  className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner"
                  placeholder="Identify Carrier..." />
              </div>
            </div>
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Target Architecture</label>
              <div className="relative">
                <LayoutGrid size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select value={state.platform} onChange={(e) => setState({...state, platform: e.target.value as Platform})}
                  className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all appearance-none cursor-pointer shadow-inner">
                  <option value={Platform.XACTIMATE}>Xactimate System</option>
                  <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                </select>
              </div>
            </div>
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Insured Name (Optional)</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={state.insuredName || ''} onChange={(e) => setState({...state, insuredName: e.target.value})}
                  className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner"
                  placeholder="Insured / Client Name..." />
              </div>
            </div>
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Claim Number (Optional)</label>
              <div className="relative">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={state.claimNumber || ''} onChange={(e) => setState({...state, claimNumber: e.target.value})}
                  className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner"
                  placeholder="Claim Ref #..." />
              </div>
            </div>
          </div>
          <button onClick={() => { if(state.carrier) fetchGuidelines(state.carrier); setStep(2); }} disabled={!state.carrier}
            className="w-full p-5 md:p-8 bg-red-600 text-white font-black text-base md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-[0_8px_25px_rgba(220,38,38,0.3)] hover:bg-red-500 hover:scale-[1.01] transition-all transform active:scale-95 border-b-3 md:border-b-6 border-red-800 disabled:opacity-30">
            Secure Identity Logic
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 md:space-y-8 bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-12 rounded-xl md:rounded-[3rem] border-2 border-red-900/20 shadow-2xl animate-in">
          <h3 className="text-xl md:text-3xl font-black tracking-tighter text-red-500 italic flex items-center gap-2.5 md:gap-4"><FileSearch size={28} className="md:size-[36px]" /> Scope Guidelines</h3>
          <div className="grid grid-cols-1 gap-5 md:gap-10">
            <div className="space-y-3 md:space-y-5">
              <div className="flex justify-between items-center px-1.5 md:px-3">
                <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500">Damage Synopsis</label>
                <button onClick={toggleDictation}
                  className={`p-1.5 md:p-3 rounded-lg md:rounded-xl flex items-center gap-1.5 md:gap-2.5 font-black text-[7px] md:text-[11px] uppercase tracking-widest transition-all ${isDictating ? 'bg-red-500 text-white animate-pulse' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
                  {isDictating ? <Square size={12} className="md:size-[14px]" /> : <Mic size={12} className="md:size-[14px]" />}
                  {isDictating ? 'Capturing...' : 'Start Dictation'}
                </button>
              </div>
              <textarea value={state.synopsis} onChange={(e) => setState({...state, synopsis: e.target.value})} rows={6}
                className="w-full p-5 md:p-8 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2.5rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner placeholder:italic placeholder:opacity-40"
                placeholder="Describe the scope of damage, cause of loss, and repair requirements..." />
            </div>
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Carrier Protocols {guidelinesLoading && <Loader2 className="inline animate-spin ml-1.5 size-3" />}</label>
              <div className="p-5 md:p-8 bg-[#0f172a] border-2 border-red-900/10 rounded-lg md:rounded-[2.5rem] min-h-[120px] md:min-h-[180px] shadow-inner text-slate-300 font-bold leading-relaxed whitespace-pre-wrap italic text-xs md:text-base">
                {fetchedGuidelines || 'Retrieving policy guidelines for ' + state.carrier + '...'}
              </div>
            </div>
            <div className="space-y-3 md:space-y-5">
              <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Override / Custom Logic</label>
              <input type="text" value={(state as any).customGuidelines || ''} onChange={(e) => setState({...state, customGuidelines: e.target.value} as any)}
                className="w-full p-3.5 md:p-7 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[1.8rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner"
                placeholder="Add specific adjuster notes or unique carrier rules..." />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 md:gap-5">
            <button onClick={() => setStep(1)} className="w-full md:w-1/3 p-3.5 md:p-8 border-4 border-red-900/30 text-red-500 font-black text-xs md:text-base uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-lg md:rounded-[2.5rem] hover:bg-red-500/10 transition-all italic">Previous</button>
            <button onClick={() => setStep(3)} className="flex-1 p-3.5 md:p-8 bg-red-600 text-white font-black text-sm md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all">Advance to Evidence</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 md:space-y-10 animate-in relative">
          {uploadError && (
            <div className="absolute -top-14 md:-top-18 left-3 right-3 md:left-0 md:right-0 z-[60] bg-red-500/90 text-white p-3.5 md:p-5 rounded-lg md:rounded-[1.5rem] border-2 border-red-400 shadow-[0_8px_25px_rgba(239,68,68,0.4)] flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-2 md:gap-5 font-bold text-xs md:text-base">
                <AlertCircle size={20} className="md:size-[28px]" />
                <p>{uploadError}</p>
              </div>
              <button onClick={() => setUploadError(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={18} className="md:size-[22px]" /></button>
            </div>
          )}

          <div
            className={`flex flex-col md:flex-row justify-between items-center md:items-end bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-10 rounded-xl md:rounded-[3rem] border-2 transition-all duration-300 shadow-2xl relative overflow-hidden gap-5 ${dragActiveId === 'bulk' ? 'border-red-500 bg-red-500/5' : 'border-red-900/20'}`}
            onDragEnter={(e) => handleDrag(e, 'bulk')}
            onDragOver={(e) => handleDrag(e, 'bulk')}
            onDragLeave={(e) => handleDrag(e, null)}
            onDrop={(e) => handleDrop(e)}
          >
            {dragActiveId === 'bulk' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-600/20 backdrop-blur-sm pointer-events-none">
                <Upload size={50} className="md:size-[70px] text-red-500 animate-bounce" />
                <p className="text-base md:text-xl font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-red-500 drop-shadow-md">Drop Damage Photos Here</p>
              </div>
            )}
            <div className="space-y-1.5 md:space-y-3 text-center md:text-left">
              <h3 className="text-xl md:text-3xl font-black tracking-tighter text-red-500 italic flex items-center justify-center md:justify-start gap-2.5 md:gap-4"><ImageIcon size={28} className="md:size-[36px]" /> Site Evidence</h3>
              <p className="text-slate-500 font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-[7px] md:text-[9px] ml-0.5 md:ml-1">Map damage evidence to claim architecture • JPEG, PNG, GIF</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => startCamera()} className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-[#0f172a] text-red-500 border-2 border-red-500/30 rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[9px] md:text-[11px] tracking-widest hover:bg-red-500/10 transition-all shadow-xl"><Camera size={18} className="md:size-[22px]" /> Field Capture</button>
              <div className="relative group/bulk flex-1 md:flex-none">
                <button className="w-full px-3.5 md:px-8 py-2.5 md:py-4 bg-red-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[9px] md:text-[11px] tracking-widest shadow-xl border-b-2 md:border-b-3 border-red-800 transition-all active:translate-y-1 active:border-b-0">
                  <Upload size={18} className="md:size-[22px]" /> Upload Bulk
                </button>
                <input type="file" multiple accept="image/jpeg,image/png,image/gif" onChange={(e) => handleEvidenceUpload('Photo', undefined, e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="bg-[#0a0f1d] p-6 md:p-8 rounded-xl md:rounded-[2.5rem] border-2 border-red-900/10 shadow-xl space-y-5 md:space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2 md:gap-4 p-1 bg-[#0f172a] rounded-lg md:rounded-xl border border-red-900/10">
                <button onClick={() => setActiveZoneType('Interior')}
                  className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-all ${activeZoneType === 'Interior' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-red-400'}`}>
                  Interior
                </button>
                <button onClick={() => setActiveZoneType('Exterior')}
                  className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-all ${activeZoneType === 'Exterior' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-red-400'}`}>
                  Exterior
                </button>
              </div>
              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={roomSearch} onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder={`Search ${activeZoneType}...`}
                  className="w-full pl-10 pr-4 py-2 bg-[#0f172a] border border-red-900/10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-slate-200 outline-none focus:border-red-500 transition-all" />
              </div>
            </div>

            <div className="max-h-40 md:max-h-48 overflow-y-auto custom-scrollbar pr-2 flex flex-wrap gap-1.5 md:gap-2">
              {filteredBank.map(roomName => (
                <button key={roomName} onClick={() => addRoom(roomName, activeZoneType === 'Interior' ? 'Room' : 'Exterior Face')}
                  className="px-3 md:px-4 py-1.5 md:py-2 bg-[#0f172a] hover:bg-red-600/10 border border-red-900/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-md md:rounded-lg text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all transform active:scale-95">
                  <Plus size={10} className="inline mr-1" /> {roomName}
                </button>
              ))}
              {filteredBank.length === 0 && roomSearch.trim() && (
                <button onClick={() => addRoom(roomSearch, activeZoneType === 'Interior' ? 'Room' : 'Exterior Face')}
                  className="px-3 md:px-4 py-1.5 md:py-2 bg-red-600 text-white rounded-md md:rounded-lg text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                  Add "{roomSearch}" Manually
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {state.rooms.map(room => (
              <div key={room.id}
                className={`bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-8 rounded-xl md:rounded-[3rem] border-2 shadow-2xl transition-all duration-300 flex flex-col gap-3 md:gap-5 relative group ${dragActiveId === room.id ? 'border-red-500 scale-[1.02] bg-red-500/5' : 'border-red-900/20 hover:border-red-500/50'}`}
                onDragEnter={(e) => handleDrag(e, room.id)}
                onDragOver={(e) => handleDrag(e, room.id)}
                onDragLeave={(e) => handleDrag(e, null)}
                onDrop={(e) => handleDrop(e, room.id)}
              >
                {dragActiveId === room.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-600/10 backdrop-blur-[2px] pointer-events-none rounded-xl md:rounded-[3rem]">
                    <Plus size={28} className="md:size-[40px] text-red-500 animate-pulse" />
                  </div>
                )}
                <button onClick={() => removeRoom(room.id)} className="absolute top-3 right-3 md:top-6 md:right-6 p-2 md:p-3 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-20"><Trash2 size={18} className="md:size-[22px]" /></button>
                <div className="flex items-center gap-3 md:gap-5">
                  <div className="p-2.5 md:p-4 bg-red-500/10 rounded-lg md:rounded-xl text-red-500 shadow-inner"><Building2 size={20} className="md:size-[28px]" /></div>
                  <div>
                    <h4 className="text-base md:text-xl font-black tracking-tight text-slate-100 leading-tight">{room.name}</h4>
                    <p className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">{room.type}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 md:gap-2.5">
                  {state.evidence.filter(e => e.roomId === room.id).map(ev => (
                    <div key={ev.id} className="aspect-square bg-[#0f172a] rounded-md md:rounded-lg overflow-hidden border border-red-500/20 relative group/ev">
                      <img src={ev.base64} alt="Evidence" className="w-full h-full object-cover opacity-60 group-hover/ev:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover/ev:opacity-100 flex items-center justify-center"><CheckCircle2 size={14} className="md:size-[18px] text-white drop-shadow-md" /></div>
                    </div>
                  ))}
                  <div className="aspect-square border-2 border-dashed border-red-900/30 rounded-md md:rounded-lg flex items-center justify-center text-red-900/50 relative hover:border-red-500/50 hover:text-red-500 transition-all cursor-pointer">
                    <Plus size={14} className="md:size-[18px]" />
                    <input type="file" multiple accept="image/jpeg,image/png,image/gif" onChange={(e) => handleEvidenceUpload('Photo', room.id, e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-5 pt-5 md:pt-10">
            <button onClick={() => setStep(2)} className="w-full md:w-1/3 p-3.5 md:p-8 border-4 border-red-900/30 text-red-500 font-black text-xs md:text-lg uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-lg md:rounded-[2.5rem] hover:bg-red-500/10 transition-all italic">Previous</button>
            <button disabled={state.isAnalyzing} onClick={runInvestigationAnalysis}
              className="flex-1 p-5 md:p-12 bg-red-600 text-white font-black text-lg md:text-2xl uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-xl md:rounded-[3rem] shadow-[0_12px_40px_rgba(220,38,38,0.3)] border-b-3 md:border-b-6 border-red-800 hover:bg-red-500 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 md:gap-8">
              {state.isAnalyzing ? <Loader2 size={28} className="md:size-[40px] animate-spin" /> : <>Run Forensic Analysis <Zap size={28} className="md:size-[40px] fill-red-100" /></>}
            </button>
          </div>
        </div>
      )}

      {step === 4 && state.analysisComplete && (
        <div className="space-y-5 md:space-y-8 animate-in">
          <div className="flex flex-col bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-red-900/20 shadow-2xl gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-5">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-xl md:text-3xl font-black tracking-tighter text-red-500 italic">Forensic Repair Scope</h3>
                <p className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em]">Database: {state.platform} • Sync Active</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => exportToCSV({ id: 'temp', userId: user?.uid || 'temp', type: 'Investigation', title: `${state.carrier} Scope`, carrier: state.carrier, timestamp: Date.now(), platform: state.platform, state })}
                  className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-[#0f172a] text-red-400 border-2 border-red-500/20 rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[7px] md:text-xs tracking-widest hover:bg-red-500/10 transition-all shadow-xl group">
                  <FileSpreadsheet size={16} className="md:size-[22px] group-hover:scale-110 transition-transform" /> Spreadsheet
                </button>
                <button onClick={() => window.print()}
                  className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-red-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[7px] md:text-xs tracking-widest hover:bg-red-500 transition-all shadow-xl border-b-3 md:border-b-4 border-red-800 group">
                  <Printer size={16} className="md:size-[22px] group-hover:scale-110 transition-transform" /> Print As PDF
                </button>
              </div>
            </div>

            {(state.insuredName || state.claimNumber) && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-red-900/10">
                {state.insuredName && (
                  <div className="flex items-center gap-3">
                    <User size={14} className="text-slate-500" />
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Insured</span>
                      <span className="text-[10px] md:text-xs font-bold text-slate-200">{state.insuredName}</span>
                    </div>
                  </div>
                )}
                {state.claimNumber && (
                  <div className="flex items-center gap-3">
                    <Hash size={14} className="text-slate-500" />
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Claim #</span>
                      <span className="text-[10px] md:text-xs font-bold text-slate-200">{state.claimNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-5 printable-document">
            <div className="hidden print:block mb-8 p-6 border-2 border-slate-200 rounded-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-black text-red-600 uppercase italic">AdjusterAI Scope Report</h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Repair Orchestration v3.1.2</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-500">TIMESTAMP: {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 py-4 border-y border-slate-200">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Carrier Identity</p>
                  <p className="text-sm font-bold">{state.carrier}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Target Database</p>
                  <p className="text-sm font-bold">{state.platform}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Claim Reference</p>
                  <p className="text-sm font-bold">INSURED: {state.insuredName || 'N/A'}</p>
                  <p className="text-sm font-bold">CLAIM #: {state.claimNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {state.lineItems.map(li => (
              <div key={li.id} className="p-5 md:p-8 bg-[#0a0f1d] dark:bg-[#050810] rounded-xl md:rounded-[2.5rem] border-2 border-red-900/20 shadow-2xl hover:border-red-500 transition-all flex flex-col md:flex-row justify-between gap-5 md:gap-8 group/item">
                <div className="flex-1 space-y-3 md:space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] md:text-[11px] font-black text-red-500 uppercase tracking-widest bg-emerald-500/10 px-3.5 md:px-5 py-0.5 md:py-1.5 rounded-full border border-red-500/20">{li.roomName}</span>
                  </div>
                  <h4 className="text-lg md:text-2xl font-black tracking-tight text-slate-100 leading-tight">{li.code} - {li.description}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="p-3 md:p-4 bg-red-500/5 rounded-lg md:rounded-xl border border-red-500/20 flex items-start gap-3">
                      <Scale size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">IRC Compliance</p>
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
                  <div className="p-3.5 md:p-5 bg-[#0f172a] rounded-lg md:rounded-[1.5rem] border border-red-900/10 shadow-inner group-hover/item:border-red-500/20 transition-all">
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 leading-relaxed italic border-l-3 border-red-500/40 pl-3 md:pl-5">"{li.justification}"</p>
                  </div>
                </div>
                <div className="text-right md:min-w-[140px] flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center">
                  <p className="text-3xl md:text-5xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]">${li.quantity}</p>
                  <p className="text-[7px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em] md:mt-1.5">{li.unit}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => handleModeToggle(AppMode.DASHBOARD)} className="w-full p-6 md:p-10 bg-[#0a0f1d] border-4 border-red-900/30 text-red-500 font-black text-xs md:text-lg uppercase tracking-[0.3em] md:tracking-[0.4em] rounded-xl md:rounded-[3rem] hover:bg-[#0f172a] hover:border-red-500 transition-all shadow-2xl transform active:scale-[0.98]">Reset Investigation Matrix</button>
        </div>
      )}
    </div>
  );
};
