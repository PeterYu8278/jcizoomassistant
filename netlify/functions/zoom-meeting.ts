import type { Context, Config } from "@netlify/functions";
import crypto from "crypto";

interface UpdateMeetingBody {
  topic: string;
  startTime: string;
  durationMinutes: number;
  agenda?: string;
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

export default async (req: Request, context: Context) => {
  const apiKey = process.env.VITE_ZOOM_API_KEY || Netlify?.env?.get?.("VITE_ZOOM_API_KEY");
  const apiSecret = process.env.VITE_ZOOM_API_SECRET || Netlify?.env?.get?.("VITE_ZOOM_API_SECRET");
  if (!apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({ error: "Zoom API not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const meetingId = context.params?.id;
  if (!meetingId) {
    return new Response(JSON.stringify({ error: "Missing meeting ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = generateZoomJWT(apiKey, apiSecret);

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

    const { topic, startTime, durationMinutes, agenda } = body;
    const zoomStartTime = new Date(startTime).toISOString();

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
      const errData = await zoomRes.json();
      return new Response(
        JSON.stringify({ error: errData.message || zoomRes.statusText }),
        { status: zoomRes.status, headers: { "Content-Type": "application/json" } }
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
