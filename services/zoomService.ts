/**
 * Zoom API Service
 * 
 * IMPORTANT SECURITY NOTE:
 * For production use, Zoom API credentials (API Key & Secret) should NEVER be exposed in frontend code.
 * This implementation is for development/demo purposes only.
 * 
 * Production Best Practices:
 * 1. Create a backend API proxy that handles Zoom API calls
 * 2. Store Zoom credentials securely on the server
 * 3. Use Server-to-Server OAuth for production applications
 * 4. Implement proper authentication and authorization
 */

interface ZoomMeetingRequest {
  topic: string;
  type: number; // 1 = Instant, 2 = Scheduled, 3 = Recurring, 8 = Fixed recurring
  start_time?: string; // ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ
  duration: number; // Duration in minutes
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    watermark?: boolean;
    use_pmi?: boolean;
    approval_type?: number;
    audio?: string;
    auto_recording?: string;
  };
}

interface ZoomMeetingResponse {
  id: number;
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  status: string;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  start_url: string;
  join_url: string;
  password?: string;
  h323_password?: string;
  pstn_password?: string;
  encrypted_password?: string;
  settings: {
    host_video: boolean;
    participant_video: boolean;
    cn_meeting: boolean;
    in_meeting: boolean;
    join_before_host: boolean;
    jbh_time: number;
    mute_upon_entry: boolean;
    watermark: boolean;
    use_pmi: boolean;
    approval_type: number;
    audio: string;
    auto_recording: string;
    enforce_login: boolean;
    enforce_login_domains: string;
    alternative_hosts: string;
    close_registration: boolean;
    show_share_button: boolean;
    allow_multiple_devices: boolean;
    registrants_confirmation_email: boolean;
    waiting_room: boolean;
    global_dial_in_countries: string[];
    global_dial_in_numbers: {
      country: string;
      country_name: string;
      city: string;
      number: string;
      type: string;
    }[];
    contact_name: string;
    contact_email: string;
    registrants_email_notification: boolean;
    meeting_authentication: boolean;
    authentication_option: string;
    authentication_domains: string;
    authentication_name: string;
    additional_data_center_regions: string[];
  };
  pre_schedule: boolean;
}

interface ZoomErrorResponse {
  code: number;
  message: string;
}

// Get Zoom API credentials from environment
const ZOOM_API_KEY = import.meta.env.VITE_ZOOM_API_KEY || '';
const ZOOM_API_SECRET = import.meta.env.VITE_ZOOM_API_SECRET || '';
const ZOOM_ACCOUNT_ID = import.meta.env.VITE_ZOOM_ACCOUNT_ID || '';
const USE_ZOOM_API = import.meta.env.VITE_USE_ZOOM_API === 'true';

// In dev, use Vite proxy to avoid CORS; in prod, call Zoom directly (requires backend proxy for production)
const ZOOM_API_BASE = import.meta.env.DEV ? '/api/zoom' : 'https://api.zoom.us/v2';

/**
 * Generate JWT token for Zoom API authentication using Web Crypto API
 * Note: For production, this should be done on a backend server for security.
 */
const generateZoomJWT = async (): Promise<string> => {
  if (!ZOOM_API_KEY || !ZOOM_API_SECRET) {
    throw new Error('Zoom API credentials are missing');
  }

  // JWT Header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ZOOM_API_KEY,
    exp: now + 3600, // Token expires in 1 hour
    iat: now
  };

  // Base64 URL encode
  const base64UrlEncode = (str: string): string => {
    const base64 = btoa(str);
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signature using Web Crypto API HMAC-SHA256
  const encoder = new TextEncoder();
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ZOOM_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signatureBase64}`;
};

/**
 * Create a Zoom meeting using Zoom API
 * 
 * @param meetingData - Meeting details
 * @returns Promise with meeting information including join URL
 */
/**
 * Generate a mock Zoom link for demo mode when API is not configured
 */
const generateMockZoomLink = (): { joinUrl: string; startUrl: string; meetingId: string } => {
  const id = Math.random().toString(36).slice(2, 11);
  const joinUrl = `https://zoom.us/j/${id}`;
  return { joinUrl, startUrl: joinUrl, meetingId: id };
};

export const createZoomMeeting = async (
  topic: string,
  startTime: string, // YYYY-MM-DDTHH:mm:ss format
  durationMinutes: number,
  agenda?: string,
  password?: string
): Promise<{ joinUrl: string; startUrl: string; meetingId: string; password?: string }> => {
  // Fallback to mock link when Zoom API is not configured (e.g. deployed without env vars)
  if (!USE_ZOOM_API || !ZOOM_API_KEY || !ZOOM_API_SECRET) {
    return { ...generateMockZoomLink() };
  }

  try {
    // Generate JWT token
    const token = await generateZoomJWT();

    // Format start time for Zoom API (ISO 8601 with timezone)
    const startDateTime = new Date(startTime);
    const zoomStartTime = startDateTime.toISOString();

    // Prepare meeting request
    const meetingRequest: ZoomMeetingRequest = {
      topic,
      type: 2, // Scheduled meeting
      start_time: zoomStartTime,
      duration: durationMinutes,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      password: password || undefined,
      agenda: agenda || undefined,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 0, // Automatically approve
        audio: 'both',
        auto_recording: 'none'
      }
    };

    // Make API call to Zoom (proxied in dev to avoid CORS)
    const response = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(meetingRequest)
    });

    if (!response.ok) {
      const errorData: ZoomErrorResponse = await response.json();
      throw new Error(`Zoom API Error: ${errorData.message || response.statusText}`);
    }

    const meetingData: ZoomMeetingResponse = await response.json();

    return {
      joinUrl: meetingData.join_url,
      startUrl: meetingData.start_url,
      meetingId: meetingData.id.toString(),
      password: meetingData.password
    };
  } catch (error) {
    console.error('Failed to create Zoom meeting:', error);
    throw error;
  }
};

/**
 * Update a Zoom meeting
 * 
 * @param meetingId - Zoom meeting ID
 * @param meetingData - Updated meeting details
 */
export const updateZoomMeeting = async (
  meetingId: string,
  topic: string,
  startTime: string,
  durationMinutes: number,
  agenda?: string
): Promise<{ joinUrl: string; startUrl: string }> => {
  // Return mock link when Zoom API not configured (meeting may have been created in demo mode)
  if (!USE_ZOOM_API || !ZOOM_API_KEY || !ZOOM_API_SECRET) {
    const joinUrl = `https://zoom.us/j/${meetingId}`;
    return { joinUrl, startUrl: joinUrl };
  }

  try {
    const token = await generateZoomJWT();
    const zoomStartTime = new Date(startTime).toISOString();

    const meetingRequest: Partial<ZoomMeetingRequest> = {
      topic,
      start_time: zoomStartTime,
      duration: durationMinutes,
      agenda: agenda || undefined
    };

    const response = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(meetingRequest)
    });

    if (!response.ok) {
      const errorData: ZoomErrorResponse = await response.json();
      throw new Error(`Zoom API Error: ${errorData.message || response.statusText}`);
    }

    const meetingData: ZoomMeetingResponse = await response.json();

    return {
      joinUrl: meetingData.join_url,
      startUrl: meetingData.start_url
    };
  } catch (error) {
    console.error('Failed to update Zoom meeting:', error);
    throw error;
  }
};

/**
 * Delete a Zoom meeting
 * 
 * @param meetingId - Zoom meeting ID
 */
export const deleteZoomMeeting = async (meetingId: string): Promise<void> => {
  if (!USE_ZOOM_API || !ZOOM_API_KEY || !ZOOM_API_SECRET) {
    console.warn('Zoom API not configured, skipping Zoom deletion');
    return;
  }

  try {
    const token = await generateZoomJWT();

    const response = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok && response.status !== 404) {
      const errorData: ZoomErrorResponse = await response.json();
      throw new Error(`Zoom API Error: ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to delete Zoom meeting:', error);
    // Don't throw - allow local deletion even if Zoom deletion fails
  }
};

/**
 * Check if Zoom API is properly configured
 */
export const isZoomApiConfigured = (): boolean => {
  return USE_ZOOM_API && !!ZOOM_API_KEY && !!ZOOM_API_SECRET;
};
