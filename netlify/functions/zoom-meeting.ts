import type { Context, Config } from "@netlify/functions";
import crypto from "crypto";

interface UpdateMeetingBody {
  topic: string;
  startTime: string;
  date?: string;
  durationMinutes: number;
  agenda?: string;
}

const TZ_OFFSET = "+08:00";

const toUtcIso = (date: string, startTime: string): string => {
  const normalized = startTime.includes(":") && startTime.length <= 5 ? `${startTime}:00` : startTime.slice(0, 8);
  return new Date(`${date}T${normalized}${TZ_OFFSET}`).toISOString();
};

const getEnv = (k: string) => process.env[k] ?? (globalThis as any).Netlify?.env?.get?.(k);

const getZoomTokenS2S = async (
  accountId: string,
  clientId: string,
  clientSecret: string
): Promise<string> => {
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: accountId,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || err.error || "Failed to get Zoom token");
  }
  const data = await res.json();
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

export default async (req: Request, context: Context) => {
  const meetingId = context.params?.id;
  if (!meetingId) {
    return new Response(JSON.stringify({ error: "Missing meeting ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let token: string;
  try {
    token = await getZoomToken();
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    let body: UpdateMeetingBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { topic, startTime, date, durationMinutes, agenda } = body;
    const zoomStartTime =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{1,2}:\d{2}$/.test(startTime.trim())
        ? toUtcIso(date, startTime.trim())
        : new Date(startTime).toISOString();

    const meetingRequest = {
      topic,
      start_time: zoomStartTime,
      duration: durationMinutes,
      agenda: agenda || undefined,
    };

    const zoomRes = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meetingRequest),
    });

    if (!zoomRes.ok) {
      const errData = await zoomRes.json().catch(() => ({}));
      const errMsg = (errData as any)?.message || (errData as any)?.code || zoomRes.statusText;
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: zoomRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Zoom PATCH returns 204 No Content (empty body) on success - fetch meeting to get join_url
    if (zoomRes.status === 204) {
      const getRes = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!getRes.ok) {
        return new Response(
          JSON.stringify({ error: "Update succeeded but could not fetch meeting details" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      const data = await getRes.json();
      return new Response(
        JSON.stringify({ joinUrl: data.join_url, startUrl: data.start_url }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await zoomRes.json();
    return new Response(
      JSON.stringify({ joinUrl: data.join_url, startUrl: data.start_url }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "DELETE") {
    const zoomRes = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!zoomRes.ok && zoomRes.status !== 204 && zoomRes.status !== 404) {
      const errData = await zoomRes.json();
      return new Response(
        JSON.stringify({ error: errData.message || zoomRes.statusText }),
        { status: zoomRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(null, { status: 204 });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/zoom/meetings/:id",
};
