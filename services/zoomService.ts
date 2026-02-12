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
      startTime,
      durationMinutes,
      agenda,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || response.statusText);
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
