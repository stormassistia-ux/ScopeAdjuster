import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Building2, 
  ClipboardCheck, 
  Camera, 
  FileText, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Download,
  AlertCircle,
  Droplets,
  Flame,
  Construction,
  Sparkles,
  Info,
  ShieldCheck,
  Star,
  History,
  Search,
  Upload,
  ChevronDown,
  X,
  FileSearch,
  Map,
  Files,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Minus,
  LayoutGrid,
  Zap,
  Shield,
  Maximize,
  Sun,
  Moon,
  Monitor,
  Settings as SettingsIcon,
  Home,
  Save,
  BookOpen,
  ImageIcon,
  Check,
  ChevronLeft,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Library as LibraryIcon,
  ChevronUp,
  Calendar,
  ExternalLink,
  Archive,
  RotateCcw,
  Tags,
  Mic,
  MicOff,
  Square,
  Printer,
  Eye,
  Type as TypeIcon,
  ImageOff,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  Shuffle,
  User,
  Hash,
  Database,
  Scale
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { auth, db } from './src/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { Platform, Room, EvidenceItem, EstimationState, LineItem, DamageCategory, EvidenceType, AppMode, ComparisonResult, SavedReport, MasterBaseline, MarketIntel, PriceAdjustment } from './types';
import { fetchCarrierGuidelines, analyzeDamage, compareEstimates, reverseEngineerEstimate, auditEstimate, parseBaselineFile, searchMarketRates, suggestBaselineAdjustments } from './services/geminiService';
import { uploadEstimateFile } from './src/supabaseClient';
import { fetchReports, saveReportAPI, deleteReportAPI, fetchBaselines, saveBaselineAPI, deleteBaselineAPI } from './src/services/apiService';

const STORAGE_KEYS = {
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

const DEFAULT_INTERIOR_ROOM_TYPES = [
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

const DEFAULT_EXTERIOR_TYPES = [
  'Elevation', 'Roof', 'Fence', 'Outbuilding', 'Shed', 'Retaining Wall'
].sort();

const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.7;

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
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const optimizeImage = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_IMAGE_DIMENSION) {
          height *= MAX_IMAGE_DIMENSION / width;
          width = MAX_IMAGE_DIMENSION;
        }
      } else {
        if (height > MAX_IMAGE_DIMENSION) {
          width *= MAX_IMAGE_DIMENSION / height;
          height = MAX_IMAGE_DIMENSION;
        }
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

interface SavedGuideline {
  id: string;
  carrier: string;
  content: string;
  timestamp: number;
}

const sidebarItems = [
  { mode: AppMode.DASHBOARD, icon: LayoutGrid, label: 'Dashboard' },
  { mode: AppMode.INVESTIGATION, icon: Search, label: 'Investigation' },
  { mode: AppMode.COMPARISON, icon: ArrowRightLeft, label: 'Comparison' },
  { mode: AppMode.REVERSE_ENGINEER, icon: RefreshCw, label: 'Reverse Engineer' },
  { mode: AppMode.COMPLIANCE_AUDIT, icon: ShieldCheck, label: 'Compliance Audit' },
  { mode: AppMode.REPORTS, icon: Archive, label: 'Reports Vault' },
  { mode: AppMode.LIBRARY, icon: LibraryIcon, label: 'Policy Library' },
  { mode: AppMode.SETTINGS, icon: SettingsIcon, label: 'App Settings' },
];

const App: React.FC = () => {
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
  const [suggestedAdjustments, setSuggestedAdjustments] = useState<{ [baselineId: string]: PriceAdjustment[] }>({});
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
      
      if (firebaseUser) {
        // Ensure user document exists in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'client',
            createdAt: Timestamp.now(),
            lastLogin: Timestamp.now()
          });
        } else {
          await setDoc(userRef, { lastLogin: Timestamp.now() }, { merge: true });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setSavedReports([]);
      return;
    }

    fetchReports()
      .then(setSavedReports)
      .catch(error => console.error("API Fetch Error (Reports): ", error));

  }, [user]);

  useEffect(() => {
    if (!user) {
      setMasterBaselines([]);
      return;
    }

    fetchBaselines()
      .then(setMasterBaselines)
      .catch(error => console.error("API Fetch Error (Baselines): ", error));

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
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
          onerror: (e) => {
            console.error('[AdjusterAI] Dictation error:', e);
            stopDictation();
          },
          onclose: () => {
            setIsDictating(false);
          }
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

  const toggleDictation = () => {
    if (isDictating) stopDictation();
    else startDictation();
  };

  const startCamera = async (roomId?: string) => {
    setCameraRoomId(roomId);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    } catch (err) {
      console.error('[AdjusterAI] Camera access failed:', err);
      alert('Could not access camera. Please check system permissions.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
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
      alert(e.message || "Failed to retrieve carrier guidelines. You can still proceed with manual synopsis.");
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
    } catch (error) {
      console.error("Login Error: ", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      handleModeToggle(AppMode.DASHBOARD);
    } catch (error) {
      console.error("Logout Error: ", error);
    }
  };

  const saveReport = async (type: 'Investigation' | 'Comparison' | 'Transmutation' | 'Compliance Audit', finalState: any) => {
    if (!user) {
      alert("Please login to save reports to the cloud.");
      return;
    }

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
          evidence: finalState.evidence.map((e: any) => ({ ...e, base64: '' })), // Clear large images for storage
          fileA: finalState.fileA ? { ...finalState.fileA, file: undefined } : undefined,
          fileB: finalState.fileB ? { ...finalState.fileB, file: undefined } : undefined
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
    if (!confirm("Permanently delete this report from the cloud?")) return;
    
    try {
      await deleteReportAPI(id);
      setSavedReports(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Delete Error: ", error);
    }
  };

  const deleteSavedGuideline = (id: string) => {
    if (!confirm("Permanently delete this guideline from the library?")) return;
    const updated = savedGuidelines.filter(g => g.id !== id);
    setSavedGuidelines(updated);
    localStorage.setItem(STORAGE_KEYS.SAVED_GUIDELINES, JSON.stringify(updated));
  };

  const saveMasterBaseline = async (name: string, description: string, platform: Platform, lineItems: LineItem[]) => {
    if (!user) {
      alert("Please login to save baselines to the cloud.");
      return;
    }

    try {
      const newBaseline: Omit<MasterBaseline, 'id'> = {
        userId: user.uid,
        name,
        description,
        platform,
        timestamp: Date.now(),
        lineItems
      };

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
    if (!confirm("Permanently delete this master baseline?")) return;
    
    try {
      await deleteBaselineAPI(id);
      setMasterBaselines(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error("Delete Error: ", error);
    }
  };

  const handleBaselineImport = async (file: File) => {
    if (!user) {
      alert("Please login to import baselines.");
      return;
    }

    const name = prompt("Enter a name for this Master Baseline:", file.name.replace(/\.[^/.]+$/, ""));
    if (!name) return;

    const description = prompt("Enter a brief description:", "Imported from " + file.name);
    
    try {
      // Phase 5 direct upload: Upload to Supabase Storage immediately
      const publicUrl = await uploadEstimateFile(file);

      // Convert file to EvidenceItem format for the service (preserving base64 for now for local parsing)
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const evidenceItem: EvidenceItem = {
        id: `import-${Date.now()}`,
        type: 'Estimate File',
        base64: fileData,
        storageUrl: publicUrl,
        mimeType: file.type,
        fileName: file.name,
        timestamp: Date.now()
      };

      // Extract line items using Gemini
      const extractedItems = await parseBaselineFile(evidenceItem, Platform.XACTIMATE); // Default to Xactimate for now or ask user

      await saveMasterBaseline(name, description || '', Platform.XACTIMATE, extractedItems);
      alert("Baseline imported successfully.");
    } catch (error: any) {
      console.error("Import Error:", error);
      alert("Failed to parse baseline file: " + error.message);
    }
  };

  const handleMarketSearch = async () => {
    const zip = prompt("Enter Zip Code or Region for Market Intelligence:", "Miami, FL");
    if (!zip) return;

    setIsSearchingMarket(true);
    try {
      const intel = await searchMarketRates(zip);
      setMarketIntel(intel);
    } catch (error: any) {
      alert("Market search failed: " + error.message);
    } finally {
      setIsSearchingMarket(false);
    }
  };

  const handleSuggestAdjustments = async (baseline: MasterBaseline) => {
    if (!marketIntel) {
      alert("Please search for Market Intelligence first to get current trends.");
      return;
    }

    setIsAdjusting(baseline.id);
    try {
      const adjustments = await suggestBaselineAdjustments(baseline, marketIntel);
      setSuggestedAdjustments(prev => ({ ...prev, [baseline.id]: adjustments }));
    } catch (error: any) {
      alert("Adjustment suggestion failed: " + error.message);
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
      if (adjustment) {
        return { 
          ...item, 
          unitPrice: adjustment.suggestedPrice,
          total: (item.quantity || 0) * adjustment.suggestedPrice
        };
      }
      return item;
    });

    try {
      const updated = await saveBaselineAPI({
        ...baseline,
        lineItems: updatedLineItems,
        timestamp: Date.now()
      });
      setMasterBaselines(prev => prev.map(b => b.id === baselineId ? updated : b));
      setSuggestedAdjustments(prev => {
        const next = { ...prev };
        delete next[baselineId];
        return next;
      });
      alert("Baseline pricing updated successfully.");
    } catch (error: any) {
      alert("Failed to apply adjustments: " + error.message);
    }
  };

  const runComparison = async () => {
    if (!state.fileA || !state.fileB) {
      alert("Please upload both Estimate A and Estimate B before running comparison.");
      return;
    }
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      // Find active baseline if selected
      const activeBaseline = state.activeBaselineId 
        ? masterBaselines.find(b => b.id === state.activeBaselineId) 
        : undefined;

      const result = await compareEstimates(
        state.fileA!, 
        state.fileB!, 
        state.platformA, 
        state.platformB,
        activeBaseline
      );
      const newState = { ...state, comparisonResult: result, isAnalyzing: false, analysisComplete: true };
      setState(newState);
      saveReport('Comparison', newState);
      setStep(3);
    } catch (err: any) {
      alert(err.message || "Comparison analysis failed.");
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const runTransmutation = async () => {
    if (!state.fileA) {
      alert("Please upload the source estimate file first.");
      return;
    }
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const result = await reverseEngineerEstimate(state.fileA!, state.platformA, state.platformB);
      const newState = { ...state, lineItems: result, isAnalyzing: false, analysisComplete: true };
      setState(newState);
      saveReport('Transmutation', newState);
      setStep(3);
    } catch (err: any) {
      alert(err.message || "Transmutation analysis failed.");
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const runAudit = async () => {
    if (!state.fileA) {
      alert("Please upload the estimate file to audit.");
      return;
    }
    setState(prev => ({ ...prev, isAnalyzing: true }));
    try {
      const result = await auditEstimate(state.fileA!, state.carrier, fetchedGuidelines || state.customGuidelines || "", state.platform);
      const newState = { ...state, auditResult: result, isAnalyzing: false, analysisComplete: true };
      setState(newState);
      saveReport('Compliance Audit', newState);
      setStep(3);
    } catch (err: any) {
      alert(err.message || "Compliance audit failed.");
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const handleComparisonFileUpload = async (side: 'A' | 'B', file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please upload an estimate smaller than 10MB.");
      return;
    }

    try {
      // Phase 5 direct upload: Upload to Supabase Storage immediately
      const publicUrl = await uploadEstimateFile(file);

      // Continue with generic file parsing for UI state/AI tools
      const reader = new FileReader();
      reader.onload = async (e) => {
        let base64 = e.target?.result as string;
        if (file.type.startsWith('image/')) {
          base64 = await optimizeImage(base64);
        }
        
        const evidence: EvidenceItem = {
          id: crypto.randomUUID(),
          type: 'Estimate File',
          base64,
          storageUrl: publicUrl,
          mimeType: file.type || 'application/octet-stream',
          fileName: file.name
        };
        setState(prev => ({ ...prev, [side === 'A' ? 'fileA' : 'fileB']: evidence }));
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      console.error("[Storage Upload Error]", err);
      alert("Failed to upload the estimate to secure storage: " + err.message);
    }
  };

  const resetBanks = () => {
    if (!confirm("Reset all room banks to default?")) return;
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
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        } else if (r.name === baseLabel) {
          if (maxNum === 0) maxNum = 1;
        }
      });
      nextName = `${baseLabel} ${maxNum + 1}`;
    }
    const newRoom: Room = { id: crypto.randomUUID(), name: nextName, type };
    setState(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
  };

  const removeRoom = (id: string) => {
    setState(prev => ({ 
      ...prev, 
      rooms: prev.rooms.filter(r => r.id !== id),
      evidence: prev.evidence.filter(e => e.roomId !== id)
    }));
  };

  const handleEvidenceUpload = async (type: EvidenceType, roomId?: string, files?: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const validFiles: File[] = [];
    const invalidFileNames: string[] = [];

    Array.from(files).forEach(file => {
      if (allowedMimeTypes.includes(file.type)) {
        validFiles.push(file);
      } else {
        invalidFileNames.push(file.name);
      }
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
          resolve({
            id: crypto.randomUUID(),
            roomId,
            type,
            base64,
            mimeType: file.type,
            fileName: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    }));

    setState(prev => ({ ...prev, evidence: [...prev.evidence, ...newItems] }));
  };

  const handleDrag = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveId(id);
    } else if (e.type === "dragleave") {
      setDragActiveId(null);
    }
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
        state.platform, 
        state.carrier || "Unknown Carrier", 
        state.synopsis || "No synopsis provided", 
        fetchedGuidelines || state.customGuidelines || "Standard industry rules", 
        state.evidence, 
        roomMap
      );
      const newState = { ...state, lineItems: result.lineItems, evidence: result.labeledEvidence, isAnalyzing: false, analysisComplete: true };
      setState(newState);
      saveReport('Investigation', newState);
      setStep(4);
    } catch (err: any) {
      alert(err.message || "Investigation failed.");
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const exportToCSV = (report: SavedReport) => {
    const state = report.state;
    let csvContent = "";
    
    if (report.type === 'Investigation' || report.type === 'Transmutation') {
      const headers = ["Room/Zone", "Code", "Description", "Quantity", "Unit", "Justification"];
      csvContent = headers.join(",") + "\n";
      state.lineItems.forEach((li: LineItem) => {
        const row = [
          `"${li.roomName}"`,
          `"${li.code}"`,
          `"${li.description}"`,
          li.quantity,
          `"${li.unit}"`,
          `"${li.justification || ''}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (report.type === 'Comparison') {
      const headers = ["Category", "Item A", "Item B", "Delta", "Reason"];
      csvContent = headers.join(",") + "\n";
      state.comparisonResult.variances.forEach((v: any) => {
        const row = [
          `"${v.category}"`,
          `"${v.itemA}"`,
          `"${v.itemB}"`,
          v.delta,
          `"${v.reason}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (report.type === 'Compliance Audit') {
      const headers = ["Type", "Item Code", "Description", "Suggested Action", "Severity"];
      csvContent = headers.join(",") + "\n";
      state.auditResult.suggestions.forEach((s: any) => {
        const row = [
          `"${s.type}"`,
          `"${s.itemCode || ''}"`,
          `"${s.description}"`,
          `"${s.suggestedAction}"`,
          `"${s.severity}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${report.title.replace(/\s+/g, '_')}_${report.platform}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (report: SavedReport) => {
    loadReport(report);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const renderDashboard = () => {
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

  const renderReportsArchive = () => (
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
              <button 
                onClick={() => exportToCSV(report)}
                className="flex items-center justify-center gap-1.5 md:gap-2 py-1.5 md:py-2 bg-[#0f172a] text-blue-400 font-black text-[7px] md:text-[9px] uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-blue-500/10 transition-all border border-blue-500/10 group/btn"
              >
                <FileSpreadsheet size={12} className="md:size-[14px] group-hover/btn:scale-110 transition-transform" /> Spread
              </button>
              <button 
                onClick={() => exportToPDF(report)}
                className="flex items-center justify-center gap-1.5 md:gap-2 py-1.5 md:py-2 bg-[#0f172a] text-blue-400 font-black text-[7px] md:text-[9px] uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-blue-500/10 transition-all border border-blue-500/10 group/btn"
              >
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

  const renderAuditFlow = () => (
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
                  <input 
                    type="text" 
                    value={state.carrier} 
                    onChange={(e) => setState({...state, carrier: e.target.value})}
                    className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-amber-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-amber-500 transition-all shadow-inner"
                    placeholder="Identify Carrier..."
                  />
                </div>
              </div>
              <div className="space-y-3 md:space-y-5">
                <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Estimate Platform</label>
                <div className="relative">
                  <LayoutGrid size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select 
                    value={state.platform}
                    onChange={(e) => setState({...state, platform: e.target.value as Platform})}
                    className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-amber-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer shadow-inner"
                  >
                    <option value={Platform.XACTIMATE}>Xactimate System</option>
                    <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                    <option value={Platform.HAND_WRITTEN}>Handwritten Scope</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3 md:space-y-5 md:col-span-2">
                <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Estimate File to Audit</label>
                <div className="relative h-[52px] md:h-[72px] border-2 border-amber-900/30 rounded-lg md:rounded-[2rem] flex items-center px-3 md:px-7 bg-[#0f172a] hover:border-amber-500 transition-all cursor-pointer shadow-inner">
                  <input 
                    type="file" 
                    onChange={(e) => e.target.files?.[0] && handleComparisonFileUpload('A', e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                  />
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
           <button 
              onClick={() => { if(state.carrier) fetchGuidelines(state.carrier); setStep(2); }} 
              disabled={!state.carrier || !state.fileA}
              className="w-full p-5 md:p-8 bg-amber-600 text-white font-black text-base md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-[0_8px_25px_rgba(245,158,11,0.3)] hover:bg-amber-500 hover:scale-[1.01] transition-all transform active:scale-95 border-b-3 md:border-b-6 border-amber-800 disabled:opacity-30"
            >
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
                   {fetchedGuidelines || "Retrieving policy guidelines for " + state.carrier + "..."}
                 </div>
               </div>

               <div className="space-y-3 md:space-y-5">
                 <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Override / Custom Logic</label>
                 <input 
                   type="text" 
                   value={state.customGuidelines || ''}
                   onChange={(e) => setState({...state, customGuidelines: e.target.value})}
                   className="w-full p-3.5 md:p-7 bg-[#0f172a] border-2 border-amber-900/30 rounded-lg md:rounded-[1.8rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-amber-500 transition-all shadow-inner"
                   placeholder="Add specific adjuster notes or unique carrier rules..."
                 />
               </div>
           </div>

           <div className="flex flex-col md:flex-row gap-3 md:gap-5">
             <button onClick={() => setStep(1)} className="w-full md:w-1/3 p-3.5 md:p-8 border-4 border-amber-900/30 text-amber-500 font-black text-xs md:text-base uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-lg md:rounded-[2.5rem] hover:bg-amber-500/10 transition-all italic">Previous</button>
             <button 
              onClick={runAudit} 
              disabled={state.isAnalyzing}
              className="flex-1 p-3.5 md:p-8 bg-amber-600 text-white font-black text-sm md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
             >
               {state.isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <>Execute Compliance Audit <Zap size={24} className="fill-amber-100" /></>}
             </button>
           </div>
         </div>
       )}

       {step === 3 && state.analysisComplete && state.auditResult && (
         <div className="space-y-5 md:space-y-8 animate-in">
           <div className="flex flex-col md:flex-row justify-between items-center bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-amber-900/20 shadow-2xl gap-5">
             <div className="space-y-0.5 md:space-y-1.5 text-center md:text-left">
                <h3 className="text-xl md:text-3xl font-black tracking-tighter text-amber-500 italic">Audit Findings</h3>
                <p className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.4em]">Carrier: {state.carrier} • Platform: {state.platform}</p>
             </div>
             <div className="flex gap-2">
                <button onClick={() => exportToCSV({id: 'temp', userId: user?.uid || 'temp', type: 'Compliance Audit', title: 'Audit Report', carrier: state.carrier, timestamp: Date.now(), platform: state.platform, state})} className="px-6 md:px-8 py-3 md:py-4 bg-[#0f172a] text-amber-400 border-2 border-amber-500/20 rounded-lg md:rounded-[1.2rem] flex items-center gap-3 md:gap-4 font-black uppercase text-[9px] md:text-xs tracking-widest hover:bg-amber-500/10 transition-all shadow-xl group"><FileSpreadsheet size={20} className="group-hover:scale-110 transition-transform md:size-[28px]" /> Spreadsheet</button>
                <button onClick={() => window.print()} className="px-6 md:px-8 py-3 md:py-4 bg-amber-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center gap-3 md:gap-4 font-black uppercase text-[9px] md:text-xs tracking-widest hover:bg-amber-500 transition-all shadow-xl border-b-3 md:border-b-4 border-amber-800 group"><Printer size={20} className="group-hover:scale-110 transition-transform md:size-[28px]" /> Print Audit</button>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
              <div className="bg-[#0a0f1d] p-8 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-amber-900/20 shadow-2xl flex flex-col items-center justify-center gap-2 md:gap-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Compliance Score</p>
                <p className={`text-4xl md:text-6xl font-black ${state.auditResult.score >= 90 ? 'text-emerald-500' : state.auditResult.score >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                  {state.auditResult.score}%
                </p>
              </div>
              <div className="md:col-span-2 bg-[#0a0f1d] p-8 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-amber-900/20 shadow-2xl space-y-3 md:space-y-4">
                <h4 className="text-lg md:text-xl font-black text-amber-500 uppercase tracking-widest italic">Audit Summary</h4>
                <p className="text-slate-300 font-bold leading-relaxed italic border-l-4 border-amber-500/30 pl-4 md:pl-6 text-sm md:text-base">"{state.auditResult.summary}"</p>
              </div>
           </div>

           <div className="space-y-4 md:space-y-6 printable-document">
              {state.auditResult.suggestions.map((s, i) => (
                <div key={i} className="bg-[#0a0f1d] p-6 md:p-10 rounded-xl md:rounded-[2.5rem] border-2 border-amber-900/20 shadow-xl flex flex-col md:flex-row justify-between gap-6 md:gap-10 hover:border-amber-500/50 transition-all">
                  <div className="flex-1 space-y-3 md:space-y-4">
                     <div className="flex flex-wrap items-center gap-3">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 md:px-6 py-1 md:py-2 rounded-full border ${
                          s.type === 'IRC Violation' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          s.type === 'Missed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          s.type === 'Overlapping' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {s.type}
                        </span>
                        {s.itemCode && <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Code: {s.itemCode}</span>}
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          s.severity === 'High' ? 'text-red-500' : s.severity === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
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

  const renderReverseEngineerFlow = () => (
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
                <select 
                  value={state.platformA}
                  onChange={(e) => setState({...state, platformA: e.target.value as Platform})}
                  className="w-full p-3.5 md:p-6 bg-[#0f172a] border-2 border-emerald-900/30 rounded-lg md:rounded-[2rem] font-bold text-sm md:text-lg text-slate-100 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer shadow-inner"
                >
                  <option value={Platform.XACTIMATE}>Xactimate System</option>
                  <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                  <option value={Platform.HAND_WRITTEN}>Handwritten Scope Sheet</option>
                </select>
              </div>
              <div className="space-y-3 md:space-y-5">
                <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Source Document</label>
                <div className="relative h-[52px] md:h-[72px] border-2 border-emerald-900/30 rounded-lg md:rounded-[2rem] flex items-center px-3 md:px-7 bg-[#0f172a] hover:border-emerald-500 transition-all cursor-pointer shadow-inner">
                  <input 
                    type="file" 
                    onChange={(e) => e.target.files?.[0] && handleComparisonFileUpload('A', e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                  />
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

           <button 
              onClick={() => setStep(2)} 
              disabled={!state.fileA}
              className="w-full p-5 md:p-8 bg-emerald-600 text-white font-black text-base md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-[0_8px_25px_rgba(16,185,129,0.3)] hover:bg-emerald-500 hover:scale-[1.01] transition-all transform active:scale-95 border-b-3 md:border-b-6 border-emerald-800 disabled:opacity-30"
            >
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
                 <select 
                    value={state.platformB}
                    onChange={(e) => setState({...state, platformB: e.target.value as Platform})}
                    className="bg-transparent border-none text-lg md:text-2xl font-black text-slate-100 outline-none cursor-pointer text-center appearance-none hover:text-emerald-400 transition-colors"
                  >
                    <option value={Platform.XACTIMATE}>Xactimate Database</option>
                    <option value={Platform.SYMBILITY_COTALITY}>Symbility / Cotality</option>
                  </select>
              </div>
           </div>

           <div className="flex flex-col md:flex-row gap-3 md:gap-5">
             <button onClick={() => setStep(1)} className="w-full md:w-1/3 p-3.5 md:p-8 border-4 border-emerald-900/30 text-emerald-500 font-black text-xs md:text-lg uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-lg md:rounded-[2.5rem] hover:bg-emerald-500/10 transition-all italic">Previous</button>
             <button 
              onClick={runTransmutation} 
              disabled={state.isAnalyzing}
              className="flex-1 p-3.5 md:p-8 bg-emerald-600 text-white font-black text-base md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl border-b-3 md:border-b-6 border-emerald-800 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 md:gap-5"
             >
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
                <button 
                  onClick={() => exportToCSV({ 
                    id: 'temp', userId: user?.uid || 'temp', type: 'Transmutation', title: `Transmuted Scope`, 
                    carrier: 'N/A', timestamp: Date.now(), platform: state.platformB, state: state 
                  })} 
                  className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-[#0f172a] text-emerald-400 border-2 border-blue-500/20 rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[7px] md:text-xs tracking-widest hover:bg-emerald-500/10 transition-all shadow-xl group"
                >
                  <FileSpreadsheet size={16} className="md:size-[22px] group-hover:scale-110 transition-transform" /> Spreadsheet
                </button>
                <button 
                  onClick={() => window.print()} 
                  className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-emerald-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[7px] md:text-xs tracking-widest hover:bg-emerald-500 transition-all shadow-xl border-b-3 md:border-b-4 border-emerald-800 group"
                >
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
                            {li.databaseMapping?.xactimate && (
                              <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Xact: {li.databaseMapping.xactimate}</span>
                            )}
                            {li.databaseMapping?.symbility && (
                              <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Symb: {li.databaseMapping.symbility}</span>
                            )}
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

  const renderInvestigationFlow = () => {
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
                    <input 
                      type="text" 
                      value={state.carrier} 
                      onChange={(e) => setState({...state, carrier: e.target.value})}
                      className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner"
                      placeholder="Identify Carrier..."
                    />
                  </div>
                </div>
                <div className="space-y-3 md:space-y-5">
                  <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Target Architecture</label>
                  <div className="relative">
                    <LayoutGrid size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select 
                      value={state.platform}
                      onChange={(e) => setState({...state, platform: e.target.value as Platform})}
                      className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all appearance-none cursor-pointer shadow-inner"
                    >
                      <option value={Platform.XACTIMATE}>Xactimate System</option>
                      <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3 md:space-y-5">
                  <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Insured Name (Optional)</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      value={state.insuredName || ''} 
                      onChange={(e) => setState({...state, insuredName: e.target.value})}
                      className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner"
                      placeholder="Insured / Client Name..."
                    />
                  </div>
                </div>
                <div className="space-y-3 md:space-y-5">
                  <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Claim Number (Optional)</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      value={state.claimNumber || ''} 
                      onChange={(e) => setState({...state, claimNumber: e.target.value})}
                      className="w-full pl-12 pr-6 py-3.5 md:py-6 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner"
                      placeholder="Claim Ref #..."
                    />
                  </div>
                </div>
            </div>
            <button 
                onClick={() => { if(state.carrier) fetchGuidelines(state.carrier); setStep(2); }} 
                disabled={!state.carrier}
                className="w-full p-5 md:p-8 bg-red-600 text-white font-black text-base md:text-xl uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-[0_8px_25px_rgba(220,38,38,0.3)] hover:bg-red-500 hover:scale-[1.01] transition-all transform active:scale-95 border-b-3 md:border-b-6 border-red-800 disabled:opacity-30"
              >
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
                    <button 
                      onClick={toggleDictation}
                      className={`p-1.5 md:p-3 rounded-lg md:rounded-xl flex items-center gap-1.5 md:gap-2.5 font-black text-[7px] md:text-[11px] uppercase tracking-widest transition-all ${isDictating ? 'bg-red-500 text-white animate-pulse' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                    >
                      {isDictating ? <Square size={12} className="md:size-[14px]" /> : <Mic size={12} className="md:size-[14px]" />}
                      {isDictating ? 'Capturing...' : 'Start Dictation'}
                    </button>
                  </div>
                  <textarea 
                    value={state.synopsis}
                    onChange={(e) => setState({...state, synopsis: e.target.value})}
                    rows={6}
                    className="w-full p-5 md:p-8 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[2.5rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner placeholder:italic placeholder:opacity-40"
                    placeholder="Describe the scope of damage, cause of loss, and repair requirements..."
                  />
                </div>

                <div className="space-y-3 md:space-y-5">
                  <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Carrier Protocols {guidelinesLoading && <Loader2 className="inline animate-spin ml-1.5 size-3" />}</label>
                  <div className="p-5 md:p-8 bg-[#0f172a] border-2 border-red-900/10 rounded-lg md:rounded-[2.5rem] min-h-[120px] md:min-h-[180px] shadow-inner text-slate-300 font-bold leading-relaxed whitespace-pre-wrap italic text-xs md:text-base">
                    {fetchedGuidelines || "Retrieving policy guidelines for " + state.carrier + "..."}
                  </div>
                </div>

                <div className="space-y-3 md:space-y-5">
                  <label className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 ml-1.5 md:ml-3">Override / Custom Logic</label>
                  <input 
                    type="text" 
                    value={state.customGuidelines || ''}
                    onChange={(e) => setState({...state, customGuidelines: e.target.value})}
                    className="w-full p-3.5 md:p-7 bg-[#0f172a] border-2 border-red-900/30 rounded-lg md:rounded-[1.8rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-red-500 transition-all shadow-inner"
                    placeholder="Add specific adjuster notes or unique carrier rules..."
                  />
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
                   <button 
                    onClick={() => setActiveZoneType('Interior')}
                    className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-all ${activeZoneType === 'Interior' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-red-400'}`}
                   >
                     Interior
                   </button>
                   <button 
                    onClick={() => setActiveZoneType('Exterior')}
                    className={`px-4 md:px-6 py-1.5 md:py-2 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest transition-all ${activeZoneType === 'Exterior' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-red-400'}`}
                   >
                     Exterior
                   </button>
                </div>
                <div className="relative w-full md:w-64">
                   <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                   <input 
                    type="text" 
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    placeholder={`Search ${activeZoneType}...`}
                    className="w-full pl-10 pr-4 py-2 bg-[#0f172a] border border-red-900/10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-slate-200 outline-none focus:border-red-500 transition-all"
                   />
                </div>
              </div>

              <div className="max-h-40 md:max-h-48 overflow-y-auto custom-scrollbar pr-2 flex flex-wrap gap-1.5 md:gap-2">
                {filteredBank.map(roomName => (
                  <button 
                    key={roomName}
                    onClick={() => addRoom(roomName, activeZoneType === 'Interior' ? 'Room' : 'Exterior Face')}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-[#0f172a] hover:bg-red-600/10 border border-red-900/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-md md:rounded-lg text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all transform active:scale-95"
                  >
                    <Plus size={10} className="inline mr-1" /> {roomName}
                  </button>
                ))}
                {filteredBank.length === 0 && roomSearch.trim() && (
                   <button 
                    onClick={() => addRoom(roomSearch, activeZoneType === 'Interior' ? 'Room' : 'Exterior Face')}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-red-600 text-white rounded-md md:rounded-lg text-[9px] md:text-[11px] font-black uppercase tracking-widest"
                   >
                     Add "{roomSearch}" Manually
                   </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {state.rooms.map(room => (
                <div 
                  key={room.id} 
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
                        <div className="absolute inset-0 bg-red-500/20 opacity-0 group-hover/ev:opacity-100 flex items-center justify-center"><Check size={14} className="md:size-[18px] text-white drop-shadow-md" /></div>
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
              <button 
              disabled={state.isAnalyzing}
              onClick={runInvestigationAnalysis} 
              className="flex-1 p-5 md:p-12 bg-red-600 text-white font-black text-lg md:text-2xl uppercase tracking-[0.2em] md:tracking-[0.4em] rounded-xl md:rounded-[3rem] shadow-[0_12px_40px_rgba(220,38,38,0.3)] border-b-3 md:border-b-6 border-red-800 hover:bg-red-500 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 md:gap-8"
              >
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
                    <button 
                      onClick={() => exportToCSV({ 
                        id: 'temp', userId: user?.uid || 'temp', type: 'Investigation', title: `${state.carrier} Scope`, 
                        carrier: state.carrier, timestamp: Date.now(), platform: state.platform, state: state 
                      })} 
                      className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-[#0f172a] text-red-400 border-2 border-red-500/20 rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[7px] md:text-xs tracking-widest hover:bg-red-500/10 transition-all shadow-xl group"
                    >
                      <FileSpreadsheet size={16} className="md:size-[22px] group-hover:scale-110 transition-transform" /> Spreadsheet
                    </button>
                    <button 
                      onClick={() => window.print()} 
                      className="flex-1 md:flex-none px-3.5 md:px-8 py-2.5 md:py-4 bg-red-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center justify-center gap-2 md:gap-3 font-black uppercase text-[7px] md:text-xs tracking-widest hover:bg-red-500 transition-all shadow-xl border-b-3 md:border-b-4 border-red-800 group"
                    >
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
                {/* Print Only Header */}
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
                              {li.databaseMapping?.xactimate && (
                                <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Xact: {li.databaseMapping.xactimate}</span>
                              )}
                              {li.databaseMapping?.symbility && (
                                <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Symb: {li.databaseMapping.symbility}</span>
                              )}
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

  /**
   * Comparison flow renderer
   */
  const renderComparisonFlow = () => (
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
              <div className="space-y-4 md:space-y-6 p-4 md:p-8 bg-[#0f172a] rounded-lg md:rounded-[2rem] border-2 border-blue-900/20 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-black">A</div>
                  <h4 className="text-base md:text-xl font-black text-slate-100 tracking-tight">Primary Estimate</h4>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Architecture</label>
                  <select 
                    value={state.platformA}
                    onChange={(e) => setState({...state, platformA: e.target.value as Platform})}
                    className="w-full p-3.5 bg-[#080c16] border-2 border-blue-900/30 rounded-lg font-bold text-xs md:text-sm text-slate-100 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value={Platform.XACTIMATE}>Xactimate System</option>
                    <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                    <option value={Platform.HAND_WRITTEN}>Handwritten Scope</option>
                  </select>
                </div>
                <div className="relative h-[68px] md:h-[72px] border-2 border-dashed border-blue-900/30 rounded-lg flex items-center px-6 bg-[#080c16] hover:border-blue-500 transition-all cursor-pointer">
                  <input type="file" onChange={(e) => e.target.files?.[0] && handleComparisonFileUpload('A', e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                  {state.fileA ? (
                    <div className="flex items-center gap-3 text-emerald-500 w-full">
                      <CheckCircle2 size={20} className="md:size-[24px]" />
                      <span className="font-bold truncate flex-1 text-xs">{state.fileA.fileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-500">
                      <Upload size={20} className="md:size-[24px]" />
                      <span className="font-bold text-xs">Upload Est. A...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 md:space-y-6 p-4 md:p-8 bg-[#0f172a] rounded-lg md:rounded-[2rem] border-2 border-blue-900/20 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-black">B</div>
                  <h4 className="text-base md:text-xl font-black text-slate-100 tracking-tight">Comparison Audit</h4>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Architecture</label>
                  <select 
                    value={state.platformB}
                    onChange={(e) => setState({...state, platformB: e.target.value as Platform})}
                    className="w-full p-3.5 bg-[#080c16] border-2 border-blue-900/30 rounded-lg font-bold text-xs md:text-sm text-slate-100 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value={Platform.XACTIMATE}>Xactimate System</option>
                    <option value={Platform.SYMBILITY_COTALITY}>Symbility Architecture</option>
                    <option value={Platform.HAND_WRITTEN}>Handwritten Scope</option>
                  </select>
                </div>
                <div className="relative h-[68px] md:h-[72px] border-2 border-dashed border-blue-900/30 rounded-lg flex items-center px-6 bg-[#080c16] hover:border-blue-500 transition-all cursor-pointer">
                  <input type="file" onChange={(e) => e.target.files?.[0] && handleComparisonFileUpload('B', e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                  {state.fileB ? (
                    <div className="flex items-center gap-3 text-emerald-500 w-full">
                      <CheckCircle2 size={20} className="md:size-[24px]" />
                      <span className="font-bold truncate flex-1 text-xs">{state.fileB.fileName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-500">
                      <Upload size={20} className="md:size-[24px]" />
                      <span className="font-bold text-xs">Upload Est. B...</span>
                    </div>
                  )}
                </div>
              </div>
           </div>

           <div className="space-y-4 md:space-y-6 p-6 md:p-10 bg-[#0f172a] rounded-lg md:rounded-[2rem] border-2 border-blue-900/20 shadow-inner">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck size={24} className="text-blue-500" />
                <h4 className="text-base md:text-xl font-black text-slate-100 tracking-tight">Master Baseline (Optional)</h4>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Compare against a pre-defined gold standard estimate</p>
              <div className="relative">
                <Database size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select 
                  value={state.activeBaselineId || ''}
                  onChange={(e) => setState({...state, activeBaselineId: e.target.value || undefined})}
                  className="w-full pl-12 pr-6 py-4 md:py-6 bg-[#080c16] border-2 border-blue-900/30 rounded-lg md:rounded-[1.5rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-inner"
                >
                  <option value="">No Master Baseline (Direct Comparison)</option>
                  {masterBaselines.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.platform})</option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
           </div>

           <button 
              onClick={() => setStep(2)} 
              disabled={!state.fileA || !state.fileB}
              className="w-full p-5 md:p-8 bg-blue-600 text-white font-black text-base md:text-xl uppercase tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl hover:bg-blue-500 hover:scale-[1.01] transition-all transform active:scale-95 border-b-6 md:border-b-8 border-blue-800 disabled:opacity-30"
            >
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
             <button 
              onClick={runComparison} 
              disabled={state.isAnalyzing}
              className="flex-1 p-4 md:p-8 bg-blue-600 text-white font-black text-base md:text-xl uppercase tracking-[0.3em] rounded-lg md:rounded-[2.5rem] shadow-2xl border-b-6 md:border-b-8 border-blue-800 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-4 md:gap-6"
             >
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
                <button onClick={() => exportToCSV({id: 'temp', userId: user?.uid || 'temp', type: 'Comparison', title: 'Audit Report', carrier: 'Dual', timestamp: Date.now(), platform: 'Dual', state})} className="px-6 md:px-8 py-3 md:py-4 bg-[#0f172a] text-blue-400 border-2 border-blue-500/20 rounded-lg md:rounded-[1.2rem] flex items-center gap-3 md:gap-4 font-black uppercase text-[9px] md:text-xs tracking-widest hover:bg-blue-500/10 transition-all shadow-xl group"><FileSpreadsheet size={20} className="group-hover:scale-110 transition-transform md:size-[28px]" /> Spreadsheet</button>
                <button onClick={() => window.print()} className="px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-lg md:rounded-[1.2rem] flex items-center gap-3 md:gap-4 font-black uppercase text-[9px] md:text-xs tracking-widest hover:bg-blue-500 transition-all shadow-xl border-b-3 md:border-b-4 border-blue-800 group"><Printer size={20} className="group-hover:scale-110 transition-transform md:size-[28px]" /> Print Audit</button>
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

  const renderSettings = () => (
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
            <input 
              type="text" 
              value={newInteriorInput}
              onChange={(e) => setNewInteriorInput(e.target.value)}
              placeholder="Add Custom Room..."
              className="flex-1 p-3.5 md:p-5 bg-[#0f172a] border-2 border-blue-900/30 rounded-lg md:rounded-xl font-bold text-xs md:text-base text-slate-100 outline-none focus:border-blue-500 transition-all"
            />
            <button 
              onClick={() => { if(newInteriorInput) { setInteriorBank([...interiorBank, newInteriorInput].sort()); setNewInteriorInput(''); } }}
              className="p-3.5 md:p-5 bg-blue-600 text-white rounded-lg md:rounded-xl hover:bg-blue-500 transition-all"
            >
              <Plus size={20} className="md:size-[28px]" />
            </button>
          </div>

          <div className="h-48 md:h-80 overflow-y-auto custom-scrollbar pr-3 md:pr-4 space-y-1.5 md:space-y-2">
            {interiorBank.map(room => (
              <div key={room} className="flex items-center justify-between p-2.5 md:p-4 bg-[#0f172a] rounded-lg border border-blue-900/10 group">
                <span className="font-bold text-slate-300 text-xs md:text-base">{room}</span>
                <button 
                  onClick={() => setInteriorBank(interiorBank.filter(r => r !== room))}
                  className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
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
            <input 
              type="text" 
              value={newExteriorInput}
              onChange={(e) => setNewExteriorInput(e.target.value)}
              placeholder="Add Custom Exterior..."
              className="flex-1 p-3.5 md:p-5 bg-[#0f172a] border-2 border-blue-900/30 rounded-lg md:rounded-[1.2rem] font-bold text-xs md:text-base text-slate-100 outline-none focus:border-emerald-500 transition-all"
            />
            <button 
              onClick={() => { if(newExteriorInput) { setExteriorBank([...exteriorBank, newExteriorInput].sort()); setNewExteriorInput(''); } }}
              className="p-3.5 md:p-5 bg-emerald-600 text-white rounded-lg md:rounded-[1.2rem] hover:bg-emerald-500 transition-all"
            >
              <Plus size={20} className="md:size-[28px]" />
            </button>
          </div>

          <div className="h-48 md:h-80 overflow-y-auto custom-scrollbar pr-3 md:pr-4 space-y-1.5 md:space-y-2">
            {exteriorBank.map(ext => (
              <div key={ext} className="flex items-center justify-between p-2.5 md:p-4 bg-[#0f172a] rounded-lg border border-blue-900/10 group">
                <span className="font-bold text-slate-300 text-xs md:text-base">{ext}</span>
                <button 
                  onClick={() => setExteriorBank(exteriorBank.filter(e => e !== ext))}
                  className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} className="md:size-[20px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLibrary = () => (
    <div className="space-y-6 md:space-y-10 animate-in max-w-6xl mx-auto px-4 md:px-0">
      <div className="text-center space-y-1.5 md:space-y-3">
        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Policy Library</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-xs">Stored carrier protocols and estimating guidelines</p>
      </div>

      {/* Market Intelligence Section */}
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
          
          <button 
            onClick={handleMarketSearch}
            disabled={isSearchingMarket}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-3 active:scale-95"
          >
            {isSearchingMarket ? <Loader2 className="animate-spin" /> : <Search size={20} />}
            {isSearchingMarket ? "Scanning Market..." : "Search Market Rates"}
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
            <button 
              onClick={() => { setFetchedGuidelines(guideline.content); setState({...state, carrier: guideline.carrier, mode: AppMode.INVESTIGATION}); setStep(2); }}
              className="mt-2 md:mt-4 w-full py-3 md:py-4 bg-[#0f172a] text-blue-400 font-black uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-lg md:rounded-xl hover:bg-blue-500/10 transition-all border border-blue-500/10 flex items-center justify-center gap-2"
            >
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

      <div className="text-center space-y-1.5 md:space-y-3 mt-12 md:mt-20">
        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Master Baselines</h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-xs">Gold standard estimates for automated comparison</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
        <div className="bg-[#0a0f1d] dark:bg-[#050810] p-5 md:p-8 rounded-xl md:rounded-[2.5rem] border-2 border-dashed border-blue-900/40 hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-4 group relative cursor-pointer min-h-[200px]">
          <input 
            type="file" 
            onChange={(e) => e.target.files?.[0] && handleBaselineImport(e.target.files[0])}
            className="absolute inset-0 opacity-0 cursor-pointer z-20"
          />
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
              <button 
                onClick={() => handleSuggestAdjustments(baseline)}
                disabled={isAdjusting === baseline.id || !marketIntel}
                className="w-full py-2.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
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
                  <button 
                    onClick={() => applyAdjustments(baseline.id)}
                    className="w-full mt-4 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                  >
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

  const renderReportPreviewModal = () => {
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
      {/* Sidebar - Positioned Dashboard button properly below logo */}
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
        
        {/* Navigation list centered vertically within available space */}
        <nav className="flex-1 px-2.5 md:px-4 py-4 space-y-1 md:space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col justify-center min-h-0">
          {sidebarItems.map((item) => (
            <button 
              key={item.mode} 
              onClick={() => handleModeToggle(item.mode)} 
              className={`w-full flex items-center rounded-lg md:rounded-xl transition-all duration-300 group relative overflow-hidden transform-gpu border-2 ${isSidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 md:px-5 py-2 md:py-3.5 gap-4 md:gap-6'} ${state.mode === item.mode ? 'bg-[#0f172a] border-red-500/30 text-red-500 shadow-[0_10px_30px_-10px_rgba(220,38,38,0.3)] scale-105' : 'bg-transparent border-transparent text-slate-500 hover:bg-[#0f172a]/40 hover:border-red-500/10 hover:text-red-400'}`}
            >
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
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex items-center justify-center p-3 md:p-4 bg-[#0f172a]/50 text-red-500 hover:text-red-400 hover:bg-[#0f172a] rounded-lg md:rounded-xl transition-all duration-500 shadow-2xl border-2 border-red-500/10 group">
            {isSidebarCollapsed ? <PanelLeftOpen size={24} className="md:size-[30px] group-hover:scale-110 transition-transform" /> : <PanelLeftClose size={24} className="md:size-[30px] group-hover:scale-110 transition-transform" />}
          </button>
        </div>
      </aside>
      
      {/* Main Content Area scaling */}
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
               <button 
                 onClick={handleLogin}
                 className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 bg-red-600 text-white font-black text-[9px] md:text-xs uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-red-500 transition-all shadow-xl border-b-3 md:border-b-4 border-red-800"
               >
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
            switch(state.mode) {
              case AppMode.DASHBOARD: return renderDashboard();
              case AppMode.REPORTS: return renderReportsArchive();
              case AppMode.INVESTIGATION: return renderInvestigationFlow();
              case AppMode.COMPARISON: return renderComparisonFlow();
              case AppMode.COMPLIANCE_AUDIT: return renderAuditFlow();
              case AppMode.REVERSE_ENGINEER: return renderReverseEngineerFlow();
              case AppMode.SETTINGS: return renderSettings();
              case AppMode.LIBRARY: return renderLibrary();
              default: return renderDashboard();
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
      {renderReportPreviewModal()}
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        :root {
          font-family: 'Space Grotesk', sans-serif;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: #0f172a; 
          border-radius: 10px; 
          border: 1px solid transparent; 
          background-clip: content-box; 
        }
        
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
          .printable-document { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 0; 
            border: none !important; 
            box-shadow: none !important; 
            border-radius: 0 !important; 
            background: white !important;
            color: black !important;
          }
          .printable-document div, .printable-document h4, .printable-document p, .printable-document span, .printable-document h1, .printable-document h3 {
            color: black !important;
            border-color: #ddd !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .dark .printable-document { background: white !important; }
        }

        @media (max-width: 640px) {
          h3 { font-size: 0.95rem !important; }
          p { font-size: 0.75rem !important; }
        }
      `}</style>

      {isCameraOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300 p-4">
          <div className="relative w-full h-full max-w-4xl max-h-[85vh] bg-slate-900 rounded-xl overflow-hidden border-2 border-red-500/30 shadow-[0_0_100px_rgba(220,38,38,0.3)]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute top-4 right-4">
               <button onClick={stopCamera} className="p-2.5 bg-slate-800/80 text-white rounded-full hover:bg-red-500 transition-all border border-white/20"><X size={20} /></button>
            </div>
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <button onClick={capturePhoto} className="p-6 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all shadow-[0_0_50px_rgba(220,38,38,0.6)] border-4 border-white active:scale-90 transform-gpu">
                <Camera size={36} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;