# Zoom API Integration Setup Guide

## Overview

Zoom meetings are created via **Netlify serverless functions** (backend proxy). Credentials stay on the server and are never exposed to the frontend. Uses **Server-to-Server OAuth** (JWT apps are deprecated by Zoom).

**Timezone:** The app and Zoom both use **Asia/Kuala_Lumpur (UTC+8)**. All meeting times are interpreted and displayed in this timezone, independent of the user's system/browser timezone.

## Setup

### 1. Create Zoom Server-to-Server OAuth App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** → **Build App** → **Server-to-Server OAuth**
3. Add scopes: `meeting:write`, `meeting:read`, `meeting:delete`
4. Activate the app
5. Copy **Account ID**, **Client ID**, and **Client Secret**

### 2. Configure Netlify Environment Variables

In **Netlify Dashboard** → **Site** → **Environment variables**, add:

| Variable | Value | Scopes |
|----------|-------|--------|
| `VITE_ZOOM_ACCOUNT_ID` | Your Zoom Account ID | All |
| `VITE_ZOOM_CLIENT_ID` | Your Zoom Client ID | All |
| `VITE_ZOOM_CLIENT_SECRET` | Your Zoom Client Secret | All |
| `VITE_USE_ZOOM_API` | `true` | All |
| `VITE_ZOOM_TIMEZONE` | `Asia/Kuala_Lumpur` (optional) | All |
| `VITE_ZOOM_REGISTRATION_TYPE` | `0` = no registration, `1` = per occurrence, `2` = once for multiple (optional) | All |

### 3. Local Development

For Zoom to work locally, run:

```bash
npm run dev:zoom
```

This starts `netlify dev`, which runs both the app and Zoom proxy functions. Plain `npm run dev` does not include the functions.

### 4. Deploy

Deploy to Netlify; the functions are bundled automatically. Ensure env vars are set in the Netlify dashboard.

## API Endpoints (internal)

- `POST /api/zoom/create` – Create meeting
- `PATCH /api/zoom/meetings/:id` – Update meeting
- `DELETE /api/zoom/meetings/:id` – Delete meeting

## Disable Zoom

Set `VITE_USE_ZOOM_API=false` and enter Zoom links manually when creating meetings.
