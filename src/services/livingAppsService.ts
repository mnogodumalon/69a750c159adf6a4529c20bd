// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS } from '@/types/app';
import type { Aktivitaeten, Stimmungskategorien, TaeglicheStimmung, PositiveMomente } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: string | null | undefined): string | null {
  if (!url) return null;
  // Extrahiere die letzten 24 Hex-Zeichen mit Regex
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`File upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

export class LivingAppsService {
  // --- AKTIVITAETEN ---
  static async getAktivitaeten(): Promise<Aktivitaeten[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.AKTIVITAETEN}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getAktivitaetenEntry(id: string): Promise<Aktivitaeten | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.AKTIVITAETEN}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createAktivitaetenEntry(fields: Aktivitaeten['fields']) {
    return callApi('POST', `/apps/${APP_IDS.AKTIVITAETEN}/records`, { fields });
  }
  static async updateAktivitaetenEntry(id: string, fields: Partial<Aktivitaeten['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.AKTIVITAETEN}/records/${id}`, { fields });
  }
  static async deleteAktivitaetenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.AKTIVITAETEN}/records/${id}`);
  }

  // --- STIMMUNGSKATEGORIEN ---
  static async getStimmungskategorien(): Promise<Stimmungskategorien[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.STIMMUNGSKATEGORIEN}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getStimmungskategorienEntry(id: string): Promise<Stimmungskategorien | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.STIMMUNGSKATEGORIEN}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createStimmungskategorienEntry(fields: Stimmungskategorien['fields']) {
    return callApi('POST', `/apps/${APP_IDS.STIMMUNGSKATEGORIEN}/records`, { fields });
  }
  static async updateStimmungskategorienEntry(id: string, fields: Partial<Stimmungskategorien['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.STIMMUNGSKATEGORIEN}/records/${id}`, { fields });
  }
  static async deleteStimmungskategorienEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.STIMMUNGSKATEGORIEN}/records/${id}`);
  }

  // --- TAEGLICHE_STIMMUNG ---
  static async getTaeglicheStimmung(): Promise<TaeglicheStimmung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.TAEGLICHE_STIMMUNG}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getTaeglicheStimmungEntry(id: string): Promise<TaeglicheStimmung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.TAEGLICHE_STIMMUNG}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createTaeglicheStimmungEntry(fields: TaeglicheStimmung['fields']) {
    return callApi('POST', `/apps/${APP_IDS.TAEGLICHE_STIMMUNG}/records`, { fields });
  }
  static async updateTaeglicheStimmungEntry(id: string, fields: Partial<TaeglicheStimmung['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.TAEGLICHE_STIMMUNG}/records/${id}`, { fields });
  }
  static async deleteTaeglicheStimmungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.TAEGLICHE_STIMMUNG}/records/${id}`);
  }

  // --- POSITIVE_MOMENTE ---
  static async getPositiveMomente(): Promise<PositiveMomente[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.POSITIVE_MOMENTE}/records`);
    return Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    }));
  }
  static async getPositiveMomenteEntry(id: string): Promise<PositiveMomente | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.POSITIVE_MOMENTE}/records/${id}`);
    return { record_id: data.id, ...data };
  }
  static async createPositiveMomenteEntry(fields: PositiveMomente['fields']) {
    return callApi('POST', `/apps/${APP_IDS.POSITIVE_MOMENTE}/records`, { fields });
  }
  static async updatePositiveMomenteEntry(id: string, fields: Partial<PositiveMomente['fields']>) {
    return callApi('PATCH', `/apps/${APP_IDS.POSITIVE_MOMENTE}/records/${id}`, { fields });
  }
  static async deletePositiveMomenteEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.POSITIVE_MOMENTE}/records/${id}`);
  }

}