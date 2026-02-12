# Zoom API Integration Setup Guide

## Overview

Zoom meetings are created via **Netlify serverless functions** (backend proxy). Credentials stay on the server and are never exposed to the frontend.

## Setup

### 1. Create Zoom JWT App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** → **Build App** → **JWT** (or Server-to-Server OAuth)
3. Add scopes: `meeting:write`, `meeting:read`, `meeting:delete`
4. Copy **API Key** and **API Secret**

### 2. Configure Netlify Environment Variables

In **Netlify Dashboard** → **Site** → **Environment variables**, add:

| Variable | Value | Scopes |
|----------|-------|--------|
| `VITE_ZOOM_API_KEY` | Your Zoom API Key | All |
| `VITE_ZOOM_API_SECRET` | Your Zoom API Secret | All |
| `VITE_USE_ZOOM_API` | `true` | All |

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
