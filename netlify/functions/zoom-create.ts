import type { Context, Config } from "@netlify/functions";
import crypto from "crypto";

interface CreateMeetingBody {
  topic: string;
  startTime: string;
  durationMinutes: number;
  agenda?: string;
  password?: string;
}

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

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.VITE_ZOOM_API_KEY || Netlify?.env?.get?.("VITE_ZOOM_API_KEY");
  const apiSecret = process.env.VITE_ZOOM_API_SECRET || Netlify?.env?.get?.("VITE_ZOOM_API_SECRET");
  if (!apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({ error: "Zoom API not configured. Set VITE_ZOOM_API_KEY and VITE_ZOOM_API_SECRET in Netlify env." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: CreateMeetingBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { topic, startTime, durationMinutes, agenda, password } = body;
  if (!topic || !startTime || !durationMinutes) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: topic, startTime, durationMinutes" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const token = generateZoomJWT(apiKey, apiSecret);
  const zoomStartTime = new Date(startTime).toISOString();

  const meetingRequest = {
    topic,
    type: 2,
    start_time: zoomStartTime,
    duration: durationMinutes,
    timezone: "UTC",
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
    const errData = await zoomRes.json();
    return new Response(
      JSON.stringify({ error: errData.message || zoomRes.statusText }),
      { status: zoomRes.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const data = await zoomRes.json();
  return new Response(
    JSON.stringify({
      joinUrl: data.join_url,
      startUrl: data.start_url,
      meetingId: String(data.id),
      password: data.password,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

export const config: Config = {
  path: "/api/zoom/create",
};
