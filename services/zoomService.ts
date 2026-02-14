/**
 * Zoom API Service
 *
 * Uses Netlify serverless functions as proxy - credentials stay on server.
 * Set VITE_USE_ZOOM_API=true and configure Zoom credentials in Netlify env vars.
 */

const USE_ZOOM_API = import.meta.env.VITE_USE_ZOOM_API === 'true';

// Use same-origin: /api/zoom/* is served by Netlify Functions (prod + netlify dev)
const getApiBase = (): string => '';

export const createZoomMeeting = async (
  topic: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  agenda?: string,
  password?: string
): Promise<{ joinUrl: string; startUrl: string; meetingId: string; password?: string }> => {
  if (!USE_ZOOM_API) {
    throw new Error('Zoom API is disabled. Set VITE_USE_ZOOM_API=true and configure Zoom credentials in Netlify.');
  }

  const base = getApiBase();
  const response = await fetch(`${base}/api/zoom/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      date,
      startTime,
      durationMinutes,
      agenda,
      password,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || response.statusText);
  }

  return response.json();
};

export const updateZoomMeeting = async (
  meetingId: string,
  topic: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  agenda?: string
): Promise<{ joinUrl: string; startUrl: string }> => {
  if (!USE_ZOOM_API) {
    throw new Error('Zoom API is disabled.');
  }

  const base = getApiBase();
  const response = await fetch(`${base}/api/zoom/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      date,
      startTime,
      durationMinutes,
      agenda,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as { error?: string }).error || (err as { message?: string }).message || response.statusText;
    throw new Error(msg || `Zoom update failed (${response.status})`);
  }

  return response.json();
};

export const deleteZoomMeeting = async (meetingId: string): Promise<void> => {
  if (!USE_ZOOM_API) return;

  const base = getApiBase();
  const response = await fetch(`${base}/api/zoom/meetings/${meetingId}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 204 && response.status !== 404) {
    const err = await response.json();
    throw new Error(err.error || response.statusText);
  }
};

export const isZoomApiConfigured = (): boolean => USE_ZOOM_API;

/** Raw Zoom meeting from API */
export interface ZoomMeetingRaw {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  agenda?: string;
}

/** List meetings from Zoom API (for sync) */
export const listZoomMeetings = async (): Promise<ZoomMeetingRaw[]> => {
  if (!USE_ZOOM_API) return [];

  const base = getApiBase();
  const response = await fetch(`${base}/api/zoom/list?type=scheduled`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.warn('Zoom list API failed:', response.status, err);
    return [];
  }

  const data = await response.json();
  const list = data.meetings || [];
  return list;
};
