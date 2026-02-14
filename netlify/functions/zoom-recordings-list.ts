import type { Config } from "@netlify/functions";
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

/** Single meeting recording from Zoom API */
export interface AccountRecordingMeeting {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: {
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
  }[];
}

export default async (req: Request) => {
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let token: string;
  try {
    token = await getZoomToken();
  } catch (e: unknown) {
    return jsonResponse({ error: (e as Error)?.message || "Zoom auth failed" }, 500);
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("page_size")) || 300, 1), 300);
  const nextPageToken = url.searchParams.get("next_page_token") || "";

  // Zoom requires from/to with max 1 month range (UTC dates)
  const now = new Date();
  const defaultTo = now.toISOString().slice(0, 10);
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const from = fromParam || defaultFrom;
  const to = toParam || defaultTo;

  const params = new URLSearchParams({
    from,
    to,
    page_size: String(pageSize),
  });
  if (nextPageToken) params.set("next_page_token", nextPageToken);

  const apiUrl = `https://api.zoom.us/v2/users/me/recordings?${params.toString()}`;

  const zoomRes = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!zoomRes.ok) {
    const errData = (await safeJson(zoomRes)) as { message?: string };
    return jsonResponse(
      { error: errData.message || zoomRes.statusText },
      zoomRes.status
    );
  }

  const data = (await safeJson(zoomRes)) as {
    from?: string;
    to?: string;
    page_count?: number;
    page_size?: number;
    total_records?: number;
    next_page_token?: string;
    meetings?: AccountRecordingMeeting[];
  };

  return jsonResponse(
    {
      from: data.from,
      to: data.to,
      pageCount: data.page_count ?? 0,
      pageSize: data.page_size ?? pageSize,
      totalRecords: data.total_records ?? 0,
      nextPageToken: data.next_page_token ?? "",
      meetings: data.meetings ?? [],
    },
    200
  );
};

export const config: Config = {
  path: "/api/zoom/recordings",
};
