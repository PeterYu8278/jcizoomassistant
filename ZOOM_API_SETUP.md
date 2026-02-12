# Zoom API Integration Setup Guide

## Overview

This application integrates with Zoom API to create, update, and delete Zoom meetings programmatically. This guide explains how to set up and use the Zoom API integration.

## ⚠️ Security Warning

**CRITICAL**: The current implementation stores Zoom API credentials in environment variables that are exposed to the frontend. This is **NOT SECURE** for production use.

### Why This Is Unsafe

1. **Frontend Exposure**: Environment variables prefixed with `VITE_` are bundled into the frontend code
2. **Credential Leakage**: Anyone can view your API credentials by inspecting the browser's JavaScript bundle
3. **No Access Control**: There's no way to restrict who can create meetings on your Zoom account

### Production Recommendations

For production deployments, you **MUST**:

1. **Create a Backend Proxy**
   - Build a Node.js/Express backend API
   - Store Zoom credentials securely on the server (never expose to frontend)
   - Create endpoints like `/api/zoom/create-meeting`, `/api/zoom/update-meeting`
   - Implement authentication and authorization

2. **Use Server-to-Server OAuth**
   - Set up proper OAuth flow on your backend
   - Generate JWT tokens server-side
   - Never expose API secrets to clients

3. **Implement Access Control**
   - Add user authentication (login system)
   - Implement role-based permissions
   - Audit meeting creation/deletion

## Development Setup

For development and testing purposes, you can use the current implementation:

### Step 1: Create Zoom App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Click **"Develop"** → **"Build App"**
3. Select **"Server-to-Server OAuth App"**
4. Fill in app details:
   - **App Name**: JCI Connect
   - **Company Name**: Your Organization
   - **Developer Email**: Your Email
5. Click **"Create"**

### Step 2: Configure App Scopes

1. In your app settings, go to **"Scopes"** tab
2. Add the following scopes:
   - `meeting:write:admin` - Create meetings
   - `meeting:write` - Create and update meetings
   - `meeting:read` - Read meeting details
   - `meeting:delete` - Delete meetings
3. Click **"Activate"** to activate your app

### Step 3: Get Credentials

1. Go to **"App Credentials"** tab
2. Copy:
   - **API Key** (Client ID)
   - **API Secret** (Client Secret)
   - **Account ID** (found in the app details)

### Step 4: Configure Environment Variables

Create `.env.local` file:

```env
VITE_ZOOM_API_KEY=your_api_key_here
VITE_ZOOM_API_SECRET=your_api_secret_here
VITE_ZOOM_ACCOUNT_ID=your_account_id_here
VITE_USE_ZOOM_API=true
```

### Step 5: Test Integration

1. Start the development server: `npm run dev`
2. Create a new meeting
3. Check your Zoom account to verify the meeting was created

## API Endpoints Used

The integration uses the following Zoom API endpoints:

- **Create Meeting**: `POST https://api.zoom.us/v2/users/me/meetings`
- **Update Meeting**: `PATCH https://api.zoom.us/v2/meetings/{meetingId}`
- **Delete Meeting**: `DELETE https://api.zoom.us/v2/meetings/{meetingId}`

## Authentication

The app uses JWT (JSON Web Token) authentication:

1. Generates a JWT token using your API Key and Secret
2. Token expires after 1 hour
3. Token is included in the `Authorization` header as `Bearer {token}`

## Error Handling

The app includes fallback behavior:

- If Zoom API is not configured → Uses mock meeting links
- If API call fails → Falls back to mock links
- Errors are logged to console for debugging

## Mock Mode

To use mock mode (no real Zoom integration):

Set in `.env.local`:
```env
VITE_USE_ZOOM_API=false
```

Mock mode generates fake Zoom links for testing without requiring Zoom API credentials.

## Troubleshooting

### "Zoom API credentials are missing"
- Check that `.env.local` exists and contains all required variables
- Ensure variables are prefixed with `VITE_`
- Restart the development server after changing `.env.local`

### "Zoom API Error: Invalid access token"
- Check that your API Key and Secret are correct
- Verify that your app is activated in Zoom Marketplace
- Ensure you have the correct scopes enabled

### "Failed to create Zoom meeting"
- Check browser console for detailed error messages
- Verify your Zoom account has meeting creation permissions
- Ensure the start time is in the future

## Next Steps

For production deployment:

1. **Backend Implementation**: Create a Node.js backend API
2. **Security**: Move all Zoom API calls to the backend
3. **Authentication**: Implement user login system
4. **Authorization**: Add role-based access control
5. **Monitoring**: Add logging and error tracking
6. **Testing**: Write integration tests for Zoom API calls

## Resources

- [Zoom API Documentation](https://marketplace.zoom.us/docs/api-reference/zoom-api)
- [Zoom Server-to-Server OAuth Guide](https://marketplace.zoom.us/docs/guides/build/server-to-server-oauth-app)
- [Zoom Meeting API Reference](https://marketplace.zoom.us/docs/api-reference/zoom-api/methods/#tag/Meetings)
