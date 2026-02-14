import type { Context, Config } from "@netlify/functions";
import crypto from "crypto";

interface CreateMeetingBody {
  topic: string;
  startTime: string;
  durationMinutes: number;
  agenda?: string;
  password?: string;
}

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

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export default async (req: Request, _context: Context) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let token: string;
    try {
      const accountId = getEnv("VITE_ZOOM_ACCOUNT_ID");
      const clientId = getEnv("VITE_ZOOM_CLIENT_ID") || getEnv("VITE_ZOOM_API_KEY");
      const clientSecret = getEnv("VITE_ZOOM_CLIENT_SECRET") || getEnv("VITE_ZOOM_API_SECRET");
      if (accountId && clientId && clientSecret) {
        token = await getZoomTokenS2S(accountId, clientId, clientSecret);
      } else if (clientId && clientSecret) {
        token = generateZoomJWT(clientId, clientSecret);
      } else {
        throw new Error("Set VITE_ZOOM_ACCOUNT_ID, VITE_ZOOM_CLIENT_ID, VITE_ZOOM_CLIENT_SECRET (S2S OAuth) in Netlify env.");
      }
    } catch (e: unknown) {
      return jsonResponse({ error: (e as Error)?.message || "Zoom auth failed" }, 500);
    }

    let body: CreateMeetingBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { topic, startTime, durationMinutes, agenda, password } = body;
    if (!topic || !startTime || !durationMinutes) {
      return jsonResponse({ error: "Missing required fields: topic, startTime, durationMinutes" }, 400);
    }

    const zoomStartTime = new Date(startTime).toISOString();
    const timezone = getEnv("VITE_ZOOM_TIMEZONE") || "Asia/Kuala_Lumpur";
    const registrationType = parseInt(getEnv("VITE_ZOOM_REGISTRATION_TYPE") || "0", 10);

    const meetingRequest = {
      topic,
      type: 2, // 2 = Scheduled meeting (1=Instant, 3=Recurring no fixed, 8=Recurring fixed)
      start_time: zoomStartTime,
      duration: durationMinutes,
      timezone,
      password: password || undefined,
      agenda: agenda || undefined,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: false,
        approval_type: 0,
        audio: "both",
        auto_recording: "none",
        registration_type: registrationType,
      },
    };

    const zoomRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meetingRequest),
    });

    if (!zoomRes.ok) {
      const errData = (await safeJson(zoomRes)) as { message?: string };
      return jsonResponse({ error: errData.message || zoomRes.statusText }, zoomRes.status);
    }

    const data = (await safeJson(zoomRes)) as { join_url?: string; start_url?: string; id?: number; password?: string };
    if (!data.join_url) {
      return jsonResponse({ error: "Zoom API did not return join_url" }, 502);
    }
    return jsonResponse(
      {
        joinUrl: data.join_url,
        startUrl: data.start_url ?? data.join_url,
        meetingId: String(data.id ?? ""),
        password: data.password,
      },
      200
    );
  } catch (e: unknown) {
    return jsonResponse({ error: (e as Error)?.message || "Internal server error" }, 500);
  }
};

export const config: Config = {
  path: "/api/zoom/create",
};
