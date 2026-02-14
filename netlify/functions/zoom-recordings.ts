import type { Context, Config } from "@netlify/functions";
import crypto from "crypto";

const getEnv = (k: string): string | undefined =>
  process.env[k] ?? (typeof (globalThis as any).Netlify?.env?.get === "function" ? (globalThis as any).Netlify.env.get(k) : undefined);

const safeJson = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text?.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
};

const getZoomTokenS2S = async (accountId: string, clientId: string, clientSecret: string): Promise<string> => {
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "account_credentials", account_id: accountId }),
  });
  if (!res.ok) {
    const err = (await safeJson(res)) as { error_description?: string; error?: string };
    throw new Error(err.error_description || err.error || "Failed to get Zoom token");
  }
  const data = (await safeJson(res)) as { access_token?: string };
  if (!data.access_token) throw new Error("No access_token in Zoom OAuth response");
  return data.access_token;
};

const generateZoomJWT = (apiKey: string, apiSecret: string): string => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: apiKey, exp: now + 3600, iat: now };
  const base64UrlEncode = (obj: object): string =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const getZoomToken = async (): Promise<string> => {
  const accountId = getEnv("VITE_ZOOM_ACCOUNT_ID");
  const clientId = getEnv("VITE_ZOOM_CLIENT_ID") || getEnv("VITE_ZOOM_API_KEY");
  const clientSecret = getEnv("VITE_ZOOM_CLIENT_SECRET") || getEnv("VITE_ZOOM_API_SECRET");

  if (accountId && clientId && clientSecret) {
    return getZoomTokenS2S(accountId, clientId, clientSecret);
  }
  if (clientId && clientSecret) {
    return generateZoomJWT(clientId, clientSecret);
  }
  throw new Error("Zoom API not configured");
};

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Zoom recording file from API */
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

export interface ZoomRecordingsResponse {
  uuid?: string;
  id?: number;
  topic?: string;
  start_time?: string;
  duration?: number;
  recording_count?: number;
  recording_files?: ZoomRecordingFile[];
}

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const meetingId = context.params?.id;
  if (!meetingId) {
    return jsonResponse({ error: "Missing meeting ID" }, 400);
  }

  let token: string;
  try {
    token = await getZoomToken();
  } catch (e: unknown) {
    return jsonResponse({ error: (e as Error)?.message || "Zoom auth failed" }, 500);
  }

  const url = new URL(req.url);
  const includeToken = url.searchParams.get("include_token") === "true";
  const ttl = Math.min(Math.max(Number(url.searchParams.get("ttl")) || 3600, 0), 604800);

  const query = new URLSearchParams();
  if (includeToken) {
    query.set("include_fields", "download_access_token");
    query.set("ttl", String(ttl));
  }
  const qs = query.toString();
  const apiUrl = `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/recordings${qs ? `?${qs}` : ""}`;

  const zoomRes = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!zoomRes.ok) {
    const errData = (await safeJson(zoomRes)) as { message?: string; code?: number };
    return jsonResponse(
      { error: errData.message || zoomRes.statusText },
      zoomRes.status === 404 ? 404 : zoomRes.status
    );
  }

  const data = (await safeJson(zoomRes)) as ZoomRecordingsResponse;
  return jsonResponse(
    {
      uuid: data.uuid,
      meetingId: data.id,
      topic: data.topic,
      startTime: data.start_time,
      duration: data.duration,
      recordingCount: data.recording_count ?? 0,
      recordingFiles: data.recording_files ?? [],
    },
    200
  );
};

export const config: Config = {
  path: "/api/zoom/meetings/:id/recordings",
};
