export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SCHEDULE = 'SCHEDULE',
  BOOKING = 'BOOKING',
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  host: string;
  email?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  zoomLink: string;
  zoomPassword?: string;
  category: 'Board' | 'Training' | 'Social' | 'Project';
  zoomMeetingId?: string; // Zoom API meeting ID for sync
}

export interface BookingFormData {
  title: string;
  description: string;
  host: string;
  email: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  category: Meeting['category'];
  manualZoomLink?: string;
}

export const CATEGORIES: Meeting['category'][] = ['Board', 'Training', 'Social', 'Project'];