import { auth } from '../firebase';
import { SavedReport, MasterBaseline } from '../../types';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api`;

/** Helper to get auth headers with JWT for backend requests */
const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User is not authenticated.');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/* =======================================
   Reports API
======================================= */
export const fetchReports = async (): Promise<SavedReport[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/reports`, { method: 'GET', headers });
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
};

export const saveReportAPI = async (report: Partial<SavedReport>): Promise<SavedReport> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers,
    body: JSON.stringify(report)
  });
  if (!res.ok) throw new Error('Failed to save report');
  return res.json();
};

export const deleteReportAPI = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/reports/${id}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('Failed to delete report');
};

/* =======================================
   Baselines API
======================================= */
export const fetchBaselines = async (): Promise<MasterBaseline[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/baselines`, { method: 'GET', headers });
  if (!res.ok) throw new Error('Failed to fetch baselines');
  return res.json();
};

export const saveBaselineAPI = async (baseline: Partial<MasterBaseline>): Promise<MasterBaseline> => {
  const headers = await getAuthHeaders();
  // Server acts as upsert or create: POST
  const res = await fetch(`${API_BASE_URL}/baselines`, {
    method: 'POST',
    headers,
    body: JSON.stringify(baseline)
  });
  if (!res.ok) throw new Error('Failed to save baseline');
  return res.json();
};

export const deleteBaselineAPI = async (id: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/baselines/${id}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error('Failed to delete baseline');
};
