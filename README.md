<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# JCI Connect - Zoom Manager

A comprehensive meeting management platform for Junior Chamber International Youth Organization members to schedule, view, and manage Zoom online meetings, featuring AI-powered agenda generation.

## Features

- 📅 **Meeting Management**: Create, edit, delete, and view meetings
- 🎯 **AI-Powered Agendas**: Auto-generate meeting agendas using Gemini AI
- 📆 **Calendar View**: Visual weekly calendar with time slots
- 🔗 **Zoom Integration**: Real Zoom API integration for meeting creation
- 📊 **Dashboard**: Overview of scheduled meetings and statistics

## Prerequisites

- Node.js (v18 or higher)
- Zoom API credentials (optional, for real Zoom integration)
- Gemini API key (for AI agenda generation)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   # Required: Gemini AI API Key
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Optional: Zoom API Configuration (for real Zoom integration)
   VITE_ZOOM_API_KEY=your_zoom_api_key_here
   VITE_ZOOM_API_SECRET=your_zoom_api_secret_here
   VITE_ZOOM_ACCOUNT_ID=your_zoom_account_id_here
   VITE_USE_ZOOM_API=true
   ```

3. **Get API Keys:**
   
   - **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **Zoom API Credentials**: 
     1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
     2. Click "Develop" → "Build App"
     3. Choose "Server-to-Server OAuth App"
     4. Add "Meeting" scope with required permissions
     5. Copy API Key, API Secret, and Account ID

4. **Run the app:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Zoom API Integration

### Security Note

⚠️ **Important**: For production use, Zoom API credentials should NEVER be exposed in frontend code. This implementation is for development/demo purposes only.

**Production Best Practices:**
- Create a backend API proxy that handles Zoom API calls
- Store Zoom credentials securely on the server
- Use Server-to-Server OAuth for production applications
- Implement proper authentication and authorization

### Using Mock Mode

If you don't have Zoom API credentials or want to test without real Zoom integration:
- Set `VITE_USE_ZOOM_API=false` in `.env.local`
- The app will generate mock Zoom links for testing

## Development

- **Build for production:**
  ```bash
  npm run build
  ```

- **Preview production build:**
  ```bash
  npm run preview
  ```

## Project Structure

```
├── components/          # React components
│   ├── BookingForm.tsx  # Meeting booking/editing form
│   ├── CalendarView.tsx # Weekly calendar view
│   ├── Header.tsx       # Navigation header
│   └── MeetingCard.tsx  # Meeting detail card
├── services/            # API services
│   ├── geminiService.ts # AI agenda generation
│   ├── storageService.ts # Local storage management
│   └── zoomService.ts   # Zoom API integration
├── types.ts             # TypeScript type definitions
└── App.tsx              # Main application component
```

## License

Private project for JCI organization use.
