import { Meeting } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const TABLE = 'meetings';

const rowToMeeting = (r: Record<string, unknown>): Meeting => ({
  id: r.id as string,
  title: (r.title as string) || '',
  description: (r.description as string) || '',
  host: (r.host as string) || '',
  date: r.date as string,
  startTime: r.start_time as string,
  durationMinutes: (r.duration_minutes as number) ?? 60,
  zoomLink: (r.zoom_link as string) || '',
  category: (r.category as Meeting['category']) || 'Project',
  zoomMeetingId: r.zoom_meeting_id as string | undefined,
});

const meetingToRow = (m: Meeting) => ({
  id: m.id,
  title: m.title,
  description: m.description,
  host: m.host,
  date: m.date,
  start_time: m.startTime,
  duration_minutes: m.durationMinutes,
  zoom_link: m.zoomLink,
  category: m.category,
  zoom_meeting_id: m.zoomMeetingId ?? null,
  updated_at: new Date().toISOString(),
});

export const getMeetingsAsync = async (): Promise<Meeting[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from(TABLE).select('*').order('date').order('start_time');
  if (error) {
    console.error('Supabase getMeetings:', error);
    return [];
  }
  return (data || []).map(rowToMeeting);
};

export const saveMeetingAsync = async (meeting: Meeting): Promise<void> => {
  if (!supabase) return;
  const row = meetingToRow(meeting);
  const { error } = await supabase.from(TABLE).upsert(row);
  if (error) throw new Error(error.message);
};

export const updateMeetingAsync = async (id: string, meeting: Meeting): Promise<void> => {
  if (!supabase) return;
  const row = meetingToRow(meeting);
  const { error } = await supabase.from(TABLE).update(row).eq('id', id);
  if (error) throw new Error(error.message);
};

export const deleteMeetingAsync = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
};

export const upsertMeetingsAsync = async (meetings: Meeting[]): Promise<void> => {
  if (!supabase || meetings.length === 0) return;
  const rows = meetings.map((m) => ({
    ...meetingToRow(m),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from(TABLE).upsert(rows);
  if (error) throw new Error(error.message);
};
