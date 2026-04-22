import React from 'react';
import { Archive, Trash2, FileSpreadsheet, FileDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ReportsView: React.FC = () => {
  const { savedReports, loadReport, exportToCSV, exportToPDF, deleteReport } = useApp();

  return (
    <div className="space-y-6 md:space-y-10 animate-in max-w-6xl mx-auto px-4 md:px-0">
      <div className="text-center space-y-1 md:space-y-3">
        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Reports Vault</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[8px] md:text-xs">Access historical audit records and repair scopes</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {savedReports.map(report => (
          <div key={report.id} className="group bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-6 rounded-xl md:rounded-[2rem] border-2 border-blue-900/20 hover:border-blue-500 transition-all transform hover:-translate-y-1 flex flex-col gap-3 md:gap-4 shadow-xl relative">
            <div className="flex justify-between items-start">
              <div className="bg-blue-500/10 p-2 md:p-3 rounded-lg md:rounded-xl text-blue-500 shadow-inner"><Archive size={24} className="md:size-[28px]" /></div>
              <div className="flex gap-1 md:gap-2">
                <button onClick={(e) => deleteReport(report.id, e)} className="p-1.5 md:p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={16} className="md:size-[20px]" /></button>
              </div>
            </div>
            <div onClick={() => loadReport(report)} className="space-y-1 cursor-pointer flex-1">
              <h3 className="font-black text-lg md:text-xl tracking-tight text-slate-100 group-hover:text-blue-400 transition-colors leading-tight">{report.title}</h3>
              <p className="text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest">{new Date(report.timestamp).toLocaleDateString()}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5 md:mt-3">
                <span className="text-[7px] md:text-[9px] px-2 py-0.5 md:px-3 md:py-1 bg-blue-500/10 text-blue-500 rounded-full font-black uppercase tracking-widest border border-blue-500/20">{report.platform}</span>
                <span className="text-[7px] md:text-[9px] px-2 py-0.5 md:px-3 md:py-1 bg-slate-500/10 text-slate-400 rounded-full font-black uppercase tracking-widest border border-slate-500/20">{report.type}</span>
                {report.type === 'Compliance Audit' && report.state.auditResult && (
                  <span className={`text-[7px] md:text-[9px] px-2 py-0.5 md:px-3 md:py-1 rounded-full font-black uppercase tracking-widest border ${
                    report.state.auditResult.score >= 90 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    report.state.auditResult.score >= 70 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    Score: {report.state.auditResult.score}%
                  </span>
                )}
              </div>
            </div>
            <div className="pt-3 md:pt-4 border-t border-blue-900/10 grid grid-cols-2 gap-1.5 md:gap-3">
              <button onClick={() => exportToCSV(report)} className="flex items-center justify-center gap-1.5 md:gap-2 py-1.5 md:py-2 bg-[#0f172a] text-blue-400 font-black text-[7px] md:text-[9px] uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-blue-500/10 transition-all border border-blue-500/10 group/btn">
                <FileSpreadsheet size={12} className="md:size-[14px] group-hover/btn:scale-110 transition-transform" /> Spread
              </button>
              <button onClick={() => exportToPDF(report)} className="flex items-center justify-center gap-1.5 md:gap-2 py-1.5 md:py-2 bg-[#0f172a] text-blue-400 font-black text-[7px] md:text-[9px] uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-blue-500/10 transition-all border border-blue-500/10 group/btn">
                <FileDown size={12} className="md:size-[14px] group-hover/btn:scale-110 transition-transform" /> PDF
              </button>
            </div>
          </div>
        ))}
        {savedReports.length === 0 && (
          <div className="col-span-full py-12 md:py-20 text-center border-4 border-dashed border-blue-900/20 rounded-xl md:rounded-[3rem] opacity-30 flex flex-col items-center gap-3 md:gap-5">
            <Archive size={50} className="md:size-[70px] text-slate-500" />
            <p className="text-base md:text-xl font-black uppercase tracking-[0.2em] text-slate-400 px-4">No records found in vault</p>
          </div>
        )}
      </div>
    </div>
  );
};
