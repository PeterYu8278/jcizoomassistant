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
  password?: string;
  agenda?: string;
}

/** Cloud recording file from Zoom API */
export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size?: number;
  playback_url?: string;
  download_url?: string;
  status: string;
  recording_type: string;
}

/** Cloud recordings response */
export interface ZoomRecordingsResponse {
  uuid?: string;
  meetingId?: number;
  topic?: string;
  startTime?: string;
  duration?: number;
  recordingCount: number;
  recordingFiles: ZoomRecordingFile[];
}

/** Account-level recording (meeting with its recording files) */
export interface AccountRecordingMeeting {
  uuid: string;
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

/** List all cloud recordings for the account (date range, max 1 month) */
export const getAccountRecordings = async (params?: {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  pageSize?: number;
  nextPageToken?: string;
}): Promise<{
  from: string;
  to: string;
  pageCount: number;
  totalRecords: number;
  nextPageToken: string;
  meetings: AccountRecordingMeeting[];
}> => {
  if (!USE_ZOOM_API) {
    throw new Error('Zoom API is disabled.');
  }

  const base = getApiBase();
  const sp = new URLSearchParams();
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.pageSize) sp.set('page_size', String(params.pageSize));
  if (params?.nextPageToken) sp.set('next_page_token', params.nextPageToken);

  const url = `${base}/api/zoom/recordings${sp.toString() ? `?${sp}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as { error?: string }).error || (err as { message?: string }).message || response.statusText;
    throw new Error(msg || `Failed to fetch recordings (${response.status})`);
  }

  const data = await response.json();
  return {
    from: data.from,
    to: data.to,
    pageCount: data.pageCount ?? 0,
    totalRecords: data.totalRecords ?? 0,
    nextPageToken: data.nextPageToken ?? '',
    meetings: data.meetings ?? [],
  };
};

/** Get cloud recordings for a meeting (requires recording:read scope) */
export const getMeetingRecordings = async (meetingId: string): Promise<ZoomRecordingsResponse> => {
  if (!USE_ZOOM_API) {
    throw new Error('Zoom API is disabled.');
  }

  const base = getApiBase();
  const response = await fetch(`${base}/api/zoom/meetings/${encodeURIComponent(meetingId)}/recordings`);

  if (response.status === 404) {
    const err = await response.json();
    throw new Error((err as { error?: string }).error || 'No recordings found for this meeting.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as { error?: string }).error || (err as { message?: string }).message || response.statusText;
    throw new Error(msg || `Failed to fetch recordings (${response.status})`);
  }

  return response.json();
};

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
