import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { LayoutGrid, Search, ArrowRightLeft, RefreshCw, ShieldCheck, Archive, Library as LibraryIcon, Settings as SettingsIcon } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { auth } from '../firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import {
  Platform, Room, EvidenceItem, EstimationState, LineItem,
  EvidenceType, AppMode, SavedReport, MasterBaseline, MarketIntel, PriceAdjustment
} from '../../types';
import {
  fetchCarrierGuidelines, analyzeDamage, compareEstimates,
  reverseEngineerEstimate, auditEstimate, parseBaselineFile,
  searchMarketRates, suggestBaselineAdjustments
} from '../../services/geminiService';
import { uploadEstimateFile } from '../supabaseClient';
import {
  fetchReports, saveReportAPI, deleteReportAPI,
  fetchBaselines, saveBaselineAPI, deleteBaselineAPI
} from '../services/apiService';

export const STORAGE_KEYS = {
  HISTORY: 'adjuster_carrier_history',
  FAVORITES: 'adjuster_carrier_favorites',
  THEME: 'adjuster_ai_theme',
  SAVED_GUIDELINES: 'adjuster_saved_guidelines',
  ROOM_FAVORITES: 'adjuster_room_favorites',
  SIDEBAR_STATE: 'adjuster_sidebar_collapsed',
  SAVED_REPORTS: 'adjuster_saved_reports',
  INTERIOR_BANK: 'adjuster_interior_bank',
  EXTERIOR_BANK: 'adjuster_exterior_bank'
};

export const DEFAULT_INTERIOR_ROOM_TYPES = [
  'Attic', 'Balcony', 'Basement', 'Bathroom', 'Bedroom', 'Bonus Room', 'Breakfast Nook', 'Breakfast Room', 'Breezeway', 'Butler’s Pantry',
  'Cellar', 'Closet', 'Corridor', 'Craft Room', 'Crawl Space', 'Deck', 'Den', 'Dining Room', 'Eat-In Kitchen', 'Electrical Room',
  'Ensuite Bathroom', 'Entire Dwelling', 'Exercise Room', 'Family Room', 'Finished Attic', 'Finished Basement', 'Florida Room',
  'Foyer', 'Furnace Room', 'Garage', 'Attached Garage', 'Detached Garage', 'Game Room', 'Great Room', 'Guest Bathroom', 'Guest Bedroom',
  'Gym', 'Half Bath', 'Hallway', 'Home Office', 'Home Theater', 'Homework Room', 'Kitchen', 'Landing', 'Laundry Room', 'Library',
  'Linen Closet', 'Living Room', 'Lounge', 'Lower Level', 'Main Floor', 'Master Bathroom', 'Master Bedroom', 'Mechanical Room',
  'Media Room', 'Mudroom', 'Nursery', 'Office', 'Pantry', 'Parlor', 'Patio', 'Playroom', 'Porch', 'Powder Room', 'Primary Bedroom',
  'Rear Porch', 'Screened Porch', 'Second Floor', 'Sewing Room', 'Sitting Room', 'Stairwell', 'Storage Closet', 'Storage Room',
  'Study', 'Sunroom', 'Tool Room', 'Unfinished Attic', 'Unfinished Basement', 'Upper Level', 'Utility Room', 'Vestibule',
  'Walk-In Closet', 'Water Heater Closet', 'Wine Cellar', 'Workshop'
].sort();

export const DEFAULT_EXTERIOR_TYPES = [
  'Elevation', 'Roof', 'Fence', 'Outbuilding', 'Shed', 'Retaining Wall'
].sort();

const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.7;

export const sidebarItems = [
  { mode: AppMode.DASHBOARD, icon: LayoutGrid, label: 'Dashboard' },
  { mode: AppMode.INVESTIGATION, icon: Search, label: 'Investigation' },
  { mode: AppMode.COMPARISON, icon: ArrowRightLeft, label: 'Comparison' },
  { mode: AppMode.REVERSE_ENGINEER, icon: RefreshCw, label: 'Reverse Engineer' },
  { mode: AppMode.COMPLIANCE_AUDIT, icon: ShieldCheck, label: 'Compliance Audit' },
  { mode: AppMode.REPORTS, icon: Archive, label: 'Reports Vault' },
  { mode: AppMode.LIBRARY, icon: LibraryIcon, label: 'Policy Library' },
  { mode: AppMode.SETTINGS, icon: SettingsIcon, label: 'App Settings' },
];

export interface SavedGuideline {
  id: string;
  carrier: string;
  content: string;
  timestamp: number;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createAudioBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

export const optimizeImage = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_IMAGE_DIMENSION) { height *= MAX_IMAGE_DIMENSION / width; width = MAX_IMAGE_DIMENSION; }
      } else {
        if (height > MAX_IMAGE_DIMENSION) { width *= MAX_IMAGE_DIMENSION / height; height = MAX_IMAGE_DIMENSION; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
    };
    img.onerror = () => resolve(base64);
  });
};

interface AppContextValue {
  user: FirebaseUser | null;
  isAuthLoading: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  state: EstimationState;
  setState: React.Dispatch<React.SetStateAction<EstimationState>>;
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  interiorBank: string[];
  setInteriorBank: React.Dispatch<React.SetStateAction<string[]>>;
  exteriorBank: string[];
  setExteriorBank: React.Dispatch<React.SetStateAction<string[]>>;
  newInteriorInput: string;
  setNewInteriorInput: React.Dispatch<React.SetStateAction<string>>;
  newExteriorInput: string;
  setNewExteriorInput: React.Dispatch<React.SetStateAction<string>>;
  guidelinesLoading: boolean;
  fetchedGuidelines: string;
  setFetchedGuidelines: React.Dispatch<React.SetStateAction<string>>;
  carrierHistory: string[];
  carrierFavorites: string[];
  setCarrierFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  savedGuidelines: SavedGuideline[];
  isCarrierDropdownOpen: boolean;
  setIsCarrierDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dropdownRef: React.RefObject<HTMLDivElement>;
  savedReports: SavedReport[];
  masterBaselines: MasterBaseline[];
  showReportPreview: boolean;
  setShowReportPreview: React.Dispatch<React.SetStateAction<boolean>>;
  marketIntel: MarketIntel | null;
  isSearchingMarket: boolean;
  suggestedAdjustments: Record<string, PriceAdjustment[]>;
  setSuggestedAdjustments: React.Dispatch<React.SetStateAction<Record<string, PriceAdjustment[]>>>;
  isAdjusting: string | null;
  isCameraOpen: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isDictating: boolean;
  dragActiveId: string | null;
  uploadError: string | null;
  setUploadError: React.Dispatch<React.SetStateAction<string | null>>;
  roomFavorites: string[];
  setRoomFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  activeZoneType: 'Interior' | 'Exterior';
  setActiveZoneType: React.Dispatch<React.SetStateAction<'Interior' | 'Exterior'>>;
  roomSearch: string;
  setRoomSearch: React.Dispatch<React.SetStateAction<string>>;
  // Handlers
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleModeToggle: (mode: AppMode) => void;
  fetchGuidelines: (carrierName: string) => Promise<void>;
  saveReport: (type: 'Investigation' | 'Comparison' | 'Transmutation' | 'Compliance Audit', finalState: any) => Promise<void>;
  loadReport: (report: SavedReport) => void;
  deleteReport: (id: string, e?: React.MouseEvent) => Promise<void>;
  deleteSavedGuideline: (id: string) => void;
  saveMasterBaseline: (name: string, description: string, platform: Platform, lineItems: LineItem[]) => Promise<void>;
  deleteMasterBaseline: (id: string, e?: React.MouseEvent) => Promise<void>;
  handleBaselineImport: (file: File) => Promise<void>;
  handleMarketSearch: () => Promise<void>;
  handleSuggestAdjustments: (baseline: MasterBaseline) => Promise<void>;
  applyAdjustments: (baselineId: string) => Promise<void>;
  runComparison: () => Promise<void>;
  runTransmutation: () => Promise<void>;
  runAudit: () => Promise<void>;
  runInvestigationAnalysis: () => Promise<void>;
  handleComparisonFileUpload: (side: 'A' | 'B', file: File) => Promise<void>;
  resetBanks: () => void;
  addRoom: (baseLabel: string, type: 'Room' | 'Exterior Face') => void;
  removeRoom: (id: string) => void;
  handleEvidenceUpload: (type: EvidenceType, roomId?: string, files?: FileList | null) => Promise<void>;
  handleDrag: (e: React.DragEvent, id: string | null) => void;
  handleDrop: (e: React.DragEvent, roomId?: string) => Promise<void>;
  startCamera: (roomId?: string) => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<void>;
  toggleDictation: () => void;
  startDictation: () => Promise<void>;
  stopDictation: () => void;
  exportToCSV: (report: SavedReport) => void;
  exportToPDF: (report: SavedReport) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.SIDEBAR_STATE) === 'true';
  });

  const [interiorBank, setInteriorBank] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INTERIOR_BANK);
    return saved ? JSON.parse(saved) : DEFAULT_INTERIOR_ROOM_TYPES;
  });

  const [exteriorBank, setExteriorBank] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXTERIOR_BANK);
    return saved ? JSON.parse(saved) : DEFAULT_EXTERIOR_TYPES;
  });

  const [state, setState] = useState<EstimationState>({
    mode: AppMode.DASHBOARD,
    carrier: '',
    insuredName: '',
    claimNumber: '',
    synopsis: '',
    platform: Platform.XACTIMATE,
    rooms: [],
    evidence: [],
    lineItems: [],
    isAnalyzing: false,
    analysisComplete: false,
    platformA: Platform.XACTIMATE,
    platformB: Platform.SYMBILITY_COTALITY
  });

  const [step, setStep] = useState(1);
  const [guidelinesLoading, setGuidelinesLoading] = useState(false);
  const [fetchedGuidelines, setFetchedGuidelines] = useState('');
  const [carrierHistory, setCarrierHistory] = useState<string[]>([]);
  const [carrierFavorites, setCarrierFavorites] = useState<string[]>([]);
  const [savedGuidelines, setSavedGuidelines] = useState<SavedGuideline[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [masterBaselines, setMasterBaselines] = useState<MasterBaseline[]>([]);
  const [marketIntel, setMarketIntel] = useState<MarketIntel | null>(null);
  const [isSearchingMarket, setIsSearchingMarket] = useState(false);
  const [suggestedAdjustments, setSuggestedAdjustments] = useState<Record<string, PriceAdjustment[]>>({});
  const [isAdjusting, setIsAdjusting] = useState<string | null>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [roomFavorites, setRoomFavorites] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ROOM_FAVORITES) || '[]');
  });
  const [isCarrierDropdownOpen, setIsCarrierDropdownOpen] = useState(false);
  const [activeZoneType, setActiveZoneType] = useState<'Interior' | 'Exterior'>('Interior');
  const [roomSearch, setRoomSearch] = useState('');
  const [newInteriorInput, setNewInteriorInput] = useState('');
  const [newExteriorInput, setNewExteriorInput] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraRoomId, setCameraRoomId] = useState<string | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const dictationSessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_STATE, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INTERIOR_BANK, JSON.stringify(interiorBank));
  }, [interiorBank]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXTERIOR_BANK, JSON.stringify(exteriorBank));
  }, [exteriorBank]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setSavedReports([]); return; }
    fetchReports().then(setSavedReports).catch(error => console.error('API Fetch Error (Reports): ', error));
  }, [user]);

  useEffect(() => {
    if (!user) { setMasterBaselines([]); return; }
    fetchBaselines().then(setMasterBaselines).catch(error => console.error('API Fetch Error (Baselines): ', error));
  }, [user]);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
    const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
    const guidelines = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_GUIDELINES) || '[]');
    setCarrierHistory(history);
    setCarrierFavorites(favorites);
    setSavedGuidelines(guidelines);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCarrierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      stopDictation();
    };
  }, []);

  const startDictation = async () => {
    if (isDictating) return;
    try {
      const tokenRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/ai/live-token`, {
        headers: { 'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}` }
      });
      if (!tokenRes.ok) throw new Error('Dictation service unavailable.');
      const { apiKey } = await tokenRes.json();
      const ai = new GoogleGenAI({ apiKey });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = audioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createAudioBlob(inputData);
              sessionPromise.then(session => { session.sendRealtimeInput({ media: pcmBlob }); });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
            setIsDictating(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setState(prev => ({
                ...prev,
                synopsis: prev.synopsis + (prev.synopsis && !prev.synopsis.endsWith(' ') ? ' ' : '') + text
              }));
            }
          },
          onerror: (e) => { console.error('[AdjusterAI] Dictation error:', e); stopDictation(); },
          onclose: () => { setIsDictating(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: 'You are a technical claims dictation assistant. Transcribe the user speech accurately for an insurance property synopsis. Be professional and brief.'
        }
      });

      dictationSessionRef.current = { sessionPromise, stream };
    } catch (err) {
      console.error('[AdjusterAI] Mic access failed:', err);
      alert('Could not access microphone. Please check system permissions.');
    }
  };

  const stopDictation = () => {
    if (dictationSessionRef.current) {
      const { sessionPromise, stream } = dictationSessionRef.current;
      sessionPromise.then((session: any) => session.close());
      stream.getTracks().forEach((track: any) => track.stop());
      dictationSessionRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    setIsDictating(false);
  };

  const toggleDictation = () => { if (isDictating) stopDictation(); else startDictation(); };

  const startCamera = async (roomId?: string) => {
    setCameraRoomId(roomId);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); };
      }
    } catch (err) {
      console.error('[AdjusterAI] Camera access failed:', err);
      alert('Could not access camera. Please check system permissions.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        let base64 = canvas.toDataURL('image/jpeg', 0.9);
        base64 = await optimizeImage(base64);
        const newItem: EvidenceItem = {
          id: crypto.randomUUID(),
          roomId: cameraRoomId,
          type: 'Photo',
          base64,
          mimeType: 'image/jpeg',
          fileName: `capture_${Date.now()}.jpg`
        };
        setState(prev => ({ ...prev, evidence: [...prev.evidence, newItem] }));
        stopCamera();
      }
    }
  };

  const fetchGuidelines = async (carrierName: string) => {
    setGuidelinesLoading(true);
    try {
      const res = await fetchCarrierGuidelines(carrierName);
      setFetchedGuidelines(res);
    } catch (e: any) {
      console.error('[AdjusterAI] Guideline fetch error:', e);
      alert(e.message || 'Failed to retrieve carrier guidelines. You can still proceed with manual synopsis.');
    } finally {
      setGuidelinesLoading(false);
    }
  };

  const handleModeToggle = (mode: AppMode) => {
    setState(prev => ({
      ...prev,
      mode,
      analysisComplete: false,
      isAnalyzing: false,
      evidence: [],
      lineItems: [],
      comparisonResult: undefined,
      auditResult: undefined,
      carrier: (mode === AppMode.DASHBOARD || mode === AppMode.REVERSE_ENGINEER || mode === AppMode.COMPLIANCE_AUDIT) ? '' : prev.carrier,
      insuredName: '',
      claimNumber: '',
      fileA: undefined,
      fileB: undefined
    }));
    setStep(1);
    setFetchedGuidelines('');
    stopDictation();
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) { console.error('Login Error: ', error); }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      handleModeToggle(AppMode.DASHBOARD);
    } catch (error) { console.error('Logout Error: ', error); }
  };

  const saveReport = async (type: 'Investigation' | 'Comparison' | 'Transmutation' | 'Compliance Audit', finalState: any) => {
    if (!user) { alert('Please login to save reports to the cloud.'); return; }
    try {
      const newReport: Omit<SavedReport, 'id'> = {
        userId: user.uid,
        type,
        title: type === 'Investigation' ? `${finalState.carrier || 'Generic'} Scope` :
               type === 'Comparison' ? `${finalState.platformA} vs ${finalState.platformB}` :
               type === 'Compliance Audit' ? `Audit: ${finalState.carrier || 'Generic'}` :
               `Transmutation: ${finalState.platformA} → ${finalState.platformB}`,
        carrier: finalState.carrier || 'N/A',
        timestamp: Date.now(),
        platform: type === 'Investigation' ? finalState.platform :
                  type === 'Comparison' ? 'Dual' :
                  type === 'Compliance Audit' ? finalState.platform :
                  `${finalState.platformB}`,
        state: {
          ...finalState,
          evidence: finalState.evidence.map((e: any) => ({ ...e, base64: '' })),
          fileA: finalState.fileA ? { ...finalState.fileA, base64: '', file: undefined } : undefined,
          fileB: finalState.fileB ? { ...finalState.fileB, base64: '', file: undefined } : undefined
        }
      };
      const saved = await saveReportAPI(newReport);
      setSavedReports(prev => [saved, ...prev]);
    } catch (e) {
      console.error('[AdjusterAI] Report saving failed:', e);
      alert('Failed to save report to cloud. Check your connection.');
    }
  };

  const loadReport = (report: SavedReport) => {
    setState({
      ...report.state,
      mode: report.type === 'Investigation' ? AppMode.INVESTIGATION :
            report.type === 'Comparison' ? AppMode.COMPARISON :
            report.type === 'Compliance Audit' ? AppMode.COMPLIANCE_AUDIT :
            AppMode.REVERSE_ENGINEER,
      analysisComplete: true,
      isAnalyzing: false
    });
    setStep(report.type === 'Investigation' ? 4 : report.type === 'Compliance Audit' ? 3 : 3);
  };

  const deleteReport = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return;
    if (!confirm('Permanently delete this report from the cloud?')) return;
    try {
      await deleteReportAPI(id);
      setSavedReports(prev => prev.filter(r => r.id !== id));
    } catch (error) { console.error('Delete Error: ', error); }
  };

  const deleteSavedGuideline = (id: string) => {
    if (!confirm('Permanently delete this guideline from the library?')) return;
    const updated = savedGuidelines.filter(g => g.id !== id);
    setSavedGuidelines(updated);
    localStorage.setItem(STORAGE_KEYS.SAVED_GUIDELINES, JSON.stringify(updated));
  };

  const saveMasterBaseline = async (name: string, description: string, platform: Platform, lineItems: LineItem[]) => {
    if (!user) { alert('Please login to save baselines to the cloud.'); return; }
    try {
      const newBaseline: Omit<MasterBaseline, 'id'> = { userId: user.uid, name, description, platform, timestamp: Date.now(), lineItems };
      const saved = await saveBaselineAPI(newBaseline);
      setMasterBaselines(prev => [saved, ...prev]);
    } catch (e) {
      console.error('[AdjusterAI] Baseline saving failed:', e);
      alert('Failed to save baseline to cloud.');
    }
  };

  const deleteMasterBaseline = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return;
    if (!confirm('Permanently delete this master baseline?')) return;
    try {
      await deleteBaselineAPI(id);
      setMasterBaselines(prev => prev.filter(b => b.id !== id));
    } catch (error) { console.error('Delete Error: ', error); }
  };

  const handleBaselineImport = async (file: File) => {
    if (!user) { alert('Please login to import baselines.'); return; }
    const name = prompt('Enter a name for this Master Baseline:', file.name.replace(/\.[^/.]+$/, ''));
    if (!name) return;
    const description = prompt('Enter a brief description:', 'Imported from ' + file.name);
    try {
      const publicUrl = await uploadEstimateFile(file);
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      const evidenceItem: EvidenceItem = {
        id: `import-${Date.now()}`, type: 'Estimate File', base64: fileData,
        storageUrl: publicUrl, mimeType: file.type, fileName: file.name, timestamp: Date.now()
      };
      const extractedItems = await parseBaselineFile(evidenceItem, Platform.XACTIMATE);
      await saveMasterBaseline(name, description || '', Platform.XACTIMATE, extractedItems);
      alert('Baseline imported successfully.');
    } catch (error: any) {
      console.error('Import Error:', error);
      alert('Failed to parse baseline file: ' + error.message);
    }
  };

  const handleMarketSearch = async () => {
    const zip = prompt('Enter Zip Code or Region for Market Intelligence:', 'Miami, FL');
    if (!zip) return;
    setIsSearchingMarket(true);
    try {
      const intel = await searchMarketRates(zip);
      setMarketIntel(intel);
    } catch (error: any) {
      alert('Market search failed: ' + error.message);
    } finally {
      setIsSearchingMarket(false);
    }
  };

  const handleSuggestAdjustments = async (baseline: MasterBaseline) => {
    if (!marketIntel) { alert('Please search for Market Intelligence first to get current trends.'); return; }
    setIsAdjusting(baseline.id);
    try {
      const adjustments = await suggestBaselineAdjustments(baseline, marketIntel);
      setSuggestedAdjustments(prev => ({ ...prev, [baseline.id]: adjustments }));
    } catch (error: any) {
      alert('Adjustment suggestion failed: ' + error.message);
    } finally {
      setIsAdjusting(null);
    }
  };

  const applyAdjustments = async (baselineId: string) => {
    const adjustments = suggestedAdjustments[baselineId];
    if (!adjustments || adjustments.length === 0) return;
    const baseline = masterBaselines.find(b => b.id === baselineId);
    if (!baseline) return;
    const updatedLineItems = baseline.lineItems.map(item => {
      const adjustment = adjustments.find(a => a.lineItemId === item.id);
      if (adjustment) return { ...item, unitPrice: adjustment.suggestedPrice, total: (item.quantity || 0) * adjustment.suggestedPrice };
      return item;
    });
    try {
      const updated = await saveBaselineAPI({ ...baseline, lineItems: updatedLineItems, timestamp: Date.now() });
      setMasterBaselines(prev => prev.map(b => b.id === baselineId ? updated : b));
      setSuggestedAdjustments(prev => { const next = { ...prev }; delete next[baselineId]; return next; });
      alert('Baseline pricing updated successfully.');
    } catch (error: any) {
      alert('Failed to apply adjustments: ' + error.message);
    }
  };

  const runComparison = async () => {
    if (!state.fileA || !state.fileB) { alert('Please upload both Estimate A and Estimate B before running comparison.'); return; }
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const activeBaseline = state.activeBaselineId ? masterBaselines.find(b => b.id === state.activeBaselineId) : undefined;
      const result = await compareEstimates(state.fileA!, state.fileB!, state.platformA, state.platformB, activeBaseline);
      const newState = { ...state, comparisonResult: result, isAnalyzing: false, analysisComplete: true };
      setState(newState);
      saveReport('Comparison', newState);
      setStep(3);
    } catch (err: any) {
      alert(err.message || 'Comparison analysis failed.');
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const runTransmutation = async () => {
    if (!state.fileA) { alert('Please upload the source estimate file first.'); return; }
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const result = await reverseEngineerEstimate(state.fileA!, state.platformA, state.platformB);
      const newState = { ...state, lineItems: result, isAnalyzing: false, analysisComplete: true };
      setState(newState);
      saveReport('Transmutation', newState);
      setStep(3);
    } catch (err: any) {
      alert(err.message || 'Transmutation analysis failed.');
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const runAudit = async () => {
    if (!state.fileA) { alert('Please upload the estimate file to audit.'); return; }
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const result = await auditEstimate(state.fileA!, state.carrier, fetchedGuidelines || (state as any).customGuidelines || '', state.platform);
      const newState = { ...state, auditResult: result, isAnalyzing: false, analysisComplete: true };
      setState(newState);
      saveReport('Compliance Audit', newState);
      setStep(3);
    } catch (err: any) {
      alert(err.message || 'Compliance audit failed.');
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleComparisonFileUpload = async (side: 'A' | 'B', file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('File is too large. Please upload an estimate smaller than 10MB.'); return; }
    try {
      const publicUrl = await uploadEstimateFile(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        let base64 = e.target?.result as string;
        if (file.type.startsWith('image/')) base64 = await optimizeImage(base64);
        const evidence: EvidenceItem = {
          id: crypto.randomUUID(), type: 'Estimate File', base64,
          storageUrl: publicUrl, mimeType: file.type || 'application/octet-stream', fileName: file.name
        };
        setState(prev => ({ ...prev, [side === 'A' ? 'fileA' : 'fileB']: evidence }));
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('[Storage Upload Error]', err);
      alert('Failed to upload the estimate to secure storage: ' + err.message);
    }
  };

  const resetBanks = () => {
    if (!confirm('Reset all room banks to default?')) return;
    setInteriorBank(DEFAULT_INTERIOR_ROOM_TYPES);
    setExteriorBank(DEFAULT_EXTERIOR_TYPES);
  };

  const addRoom = (baseLabel: string, type: 'Room' | 'Exterior Face') => {
    if (!baseLabel.trim()) return;
    const existingSameLabels = state.rooms.filter(r => r.name.startsWith(baseLabel));
    let nextName = baseLabel;
    if (existingSameLabels.length > 0) {
      let maxNum = 0;
      existingSameLabels.forEach(r => {
        const match = r.name.match(new RegExp(`^${baseLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)$`));
        if (match) { const num = parseInt(match[1]); if (num > maxNum) maxNum = num; }
        else if (r.name === baseLabel) { if (maxNum === 0) maxNum = 1; }
      });
      nextName = `${baseLabel} ${maxNum + 1}`;
    }
    const newRoom: Room = { id: crypto.randomUUID(), name: nextName, type };
    setState(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
  };

  const removeRoom = (id: string) => {
    setState(prev => ({ ...prev, rooms: prev.rooms.filter(r => r.id !== id), evidence: prev.evidence.filter(e => e.roomId !== id) }));
  };

  const handleEvidenceUpload = async (type: EvidenceType, roomId?: string, files?: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const validFiles: File[] = [];
    const invalidFileNames: string[] = [];
    Array.from(files).forEach(file => {
      if (allowedMimeTypes.includes(file.type)) validFiles.push(file);
      else invalidFileNames.push(file.name);
    });
    if (invalidFileNames.length > 0) {
      setUploadError(`Unsupported file format(s): ${invalidFileNames.join(', ')}. Please use JPEG, PNG, or GIF.`);
      setTimeout(() => setUploadError(null), 5000);
    }
    if (validFiles.length === 0) return;
    const newItems: EvidenceItem[] = await Promise.all(validFiles.map(file => {
      return new Promise<EvidenceItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          let base64 = e.target?.result as string;
          base64 = await optimizeImage(base64);
          resolve({ id: crypto.randomUUID(), roomId, type, base64, mimeType: file.type, fileName: file.name });
        };
        reader.readAsDataURL(file);
      });
    }));
    setState(prev => ({ ...prev, evidence: [...prev.evidence, ...newItems] }));
  };

  const handleDrag = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActiveId(id);
    else if (e.type === 'dragleave') setDragActiveId(null);
  };

  const handleDrop = async (e: React.DragEvent, roomId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveId(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleEvidenceUpload('Photo', roomId, e.dataTransfer.files);
    }
  };

  const runInvestigationAnalysis = async () => {
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const roomMap = state.rooms.reduce((acc, r) => ({ ...acc, [r.id]: r.name }), {});
      const result = await analyzeDamage(
        state.platform, state.carrier || 'Unknown Carrier',
        state.synopsis || 'No synopsis provided',
        fetchedGuidelines || (state as any).customGuidelines || 'Standard industry rules',
        state.evidence, roomMap
      );
      const newState = { ...state, lineItems: result.lineItems, evidence: result.labeledEvidence, isAnalyzing: false, analysisComplete: true };
      setState(newState);
      saveReport('Investigation', newState);
      setStep(4);
    } catch (err: any) {
      alert(err.message || 'Investigation failed.');
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const exportToCSV = (report: SavedReport) => {
    const s = report.state;
    let csvContent = '';
    if (report.type === 'Investigation' || report.type === 'Transmutation') {
      csvContent = ['Room/Zone', 'Code', 'Description', 'Quantity', 'Unit', 'Justification'].join(',') + '\n';
      s.lineItems.forEach((li: LineItem) => {
        csvContent += [`"${li.roomName}"`, `"${li.code}"`, `"${li.description}"`, li.quantity, `"${li.unit}"`, `"${li.justification || ''}"`].join(',') + '\n';
      });
    } else if (report.type === 'Comparison') {
      csvContent = ['Category', 'Item A', 'Item B', 'Delta', 'Reason'].join(',') + '\n';
      s.comparisonResult.variances.forEach((v: any) => {
        csvContent += [`"${v.category}"`, `"${v.itemA}"`, `"${v.itemB}"`, v.delta, `"${v.reason}"`].join(',') + '\n';
      });
    } else if (report.type === 'Compliance Audit') {
      csvContent = ['Type', 'Item Code', 'Description', 'Suggested Action', 'Severity'].join(',') + '\n';
      s.auditResult.suggestions.forEach((s: any) => {
        csvContent += [`"${s.type}"`, `"${s.itemCode || ''}"`, `"${s.description}"`, `"${s.suggestedAction}"`, `"${s.severity}"`].join(',') + '\n';
      });
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}_${report.platform}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (report: SavedReport) => {
    loadReport(report);
    setTimeout(() => { window.print(); }, 500);
  };

  const value: AppContextValue = {
    user, isAuthLoading, isDarkMode, toggleTheme,
    isSidebarCollapsed, setIsSidebarCollapsed,
    state, setState, step, setStep,
    interiorBank, setInteriorBank, exteriorBank, setExteriorBank,
    newInteriorInput, setNewInteriorInput, newExteriorInput, setNewExteriorInput,
    guidelinesLoading, fetchedGuidelines, setFetchedGuidelines,
    carrierHistory, carrierFavorites, setCarrierFavorites,
    savedGuidelines, isCarrierDropdownOpen, setIsCarrierDropdownOpen, dropdownRef,
    savedReports, masterBaselines, showReportPreview, setShowReportPreview,
    marketIntel, isSearchingMarket, suggestedAdjustments, setSuggestedAdjustments, isAdjusting,
    isCameraOpen, videoRef, canvasRef, isDictating,
    dragActiveId, uploadError, setUploadError,
    roomFavorites, setRoomFavorites, activeZoneType, setActiveZoneType, roomSearch, setRoomSearch,
    handleLogin, handleLogout, handleModeToggle, fetchGuidelines,
    saveReport, loadReport, deleteReport, deleteSavedGuideline,
    saveMasterBaseline, deleteMasterBaseline, handleBaselineImport,
    handleMarketSearch, handleSuggestAdjustments, applyAdjustments,
    runComparison, runTransmutation, runAudit, runInvestigationAnalysis,
    handleComparisonFileUpload, resetBanks, addRoom, removeRoom,
    handleEvidenceUpload, handleDrag, handleDrop,
    startCamera, stopCamera, capturePhoto,
    toggleDictation, startDictation, stopDictation,
    exportToCSV, exportToPDF
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
