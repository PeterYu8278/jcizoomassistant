import { Meeting } from '../types';
import { listZoomMeetings, ZoomMeetingRaw } from './zoomService';
import { isSupabaseConfigured } from './supabaseClient';
import {
  getMeetingsAsync as getFromSupabase,
  saveMeetingAsync as saveToSupabase,
  updateMeetingAsync as updateInSupabase,
  deleteMeetingAsync as deleteFromSupabase,
  upsertMeetingsAsync as upsertToSupabase,
} from './supabaseStorage';

const STORAGE_KEY = 'jci_meetings_data';

const zoomToMeeting = (z: ZoomMeetingRaw): Meeting & { zoomMeetingId: string } => {
  const start = new Date(z.start_time);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  return {
    id: `zoom-${z.id}`,
    title: z.topic || 'Untitled',
    description: z.agenda || '',
    host: '',
    date,
    startTime,
    durationMinutes: z.duration || 60,
    zoomLink: z.join_url,
    category: 'Project',
    zoomMeetingId: String(z.id),
  };
};

/** Sync from Zoom and merge with local/Supabase storage */
export const syncMeetingsFromZoom = async (): Promise<Meeting[]> => {
  const local = isSupabaseConfigured()
    ? await getFromSupabase()
    : getMeetingsSync();
  const zoomList = await listZoomMeetings();
  if (zoomList.length === 0) return local;

  const zoomById = new Map<string, ZoomMeetingRaw>();
  zoomList.forEach((z) => zoomById.set(String(z.id), z));

  const localByZoomId = new Map<string, Meeting>();
  const localManual: Meeting[] = [];
  local.forEach((m) => {
    const zid = (m as Meeting & { zoomMeetingId?: string }).zoomMeetingId;
    if (zid) localByZoomId.set(zid, m);
    else localManual.push(m);
  });

  const merged: Meeting[] = [];

  for (const m of localManual) {
    merged.push(m);
  }

  for (const z of zoomList) {
    const zid = String(z.id);
    const existing = localByZoomId.get(zid);
    const fromZoom = zoomToMeeting(z);
    if (existing) {
      const updated: Meeting & { zoomMeetingId?: string } = {
        ...existing,
        title: fromZoom.title,
        zoomLink: fromZoom.zoomLink,
        date: fromZoom.date,
        startTime: fromZoom.startTime,
        durationMinutes: fromZoom.durationMinutes,
        description: fromZoom.description || existing.description,
        zoomMeetingId: zid,
      };
      merged.push(updated);
    } else {
      merged.push(fromZoom);
    }
  }

  merged.sort((a, b) => {
    const da = new Date(a.date + 'T' + a.startTime).getTime();
    const db = new Date(b.date + 'T' + b.startTime).getTime();
    return da - db;
  });

  if (isSupabaseConfigured()) {
    await upsertToSupabase(merged);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
};


const getMeetingsSync = (): Meeting[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load meetings', e);
    return [];
  }
};

/** Load meetings (async - Supabase or localStorage) */
export const loadMeetings = async (): Promise<Meeting[]> => {
  if (isSupabaseConfigured()) {
    return getFromSupabase();
  }
  return getMeetingsSync();
};

export const saveMeeting = async (meeting: Meeting): Promise<void> => {
  if (isSupabaseConfigured()) {
    await saveToSupabase(meeting);
    return;
  }
  const current = getMeetingsSync();
  const updated = [...current, meeting];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const updateMeeting = async (id: string, updatedMeeting: Meeting): Promise<void> => {
  if (isSupabaseConfigured()) {
    await updateInSupabase(id, updatedMeeting);
    return;
  }
  const current = getMeetingsSync();
  const updated = current.map((m) => (m.id === id ? updatedMeeting : m));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const deleteMeeting = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    await deleteFromSupabase(id);
    return;
  }
  const current = getMeetingsSync();
  const updated = current.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
