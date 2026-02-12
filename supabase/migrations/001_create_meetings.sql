-- JCI Connect: meetings table for multi-device sync
create table if not exists public.meetings (
  id text primary key,
  title text not null default '',
  description text default '',
  host text default '',
  date text not null,
  start_time text not null,
  duration_minutes integer not null default 60,
  zoom_link text not null default '',
  category text not null default 'Project' check (category in ('Board', 'Training', 'Social', 'Project')),
  zoom_meeting_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS; allow anon read/write for shared org use (add auth policies later for production)
alter table public.meetings enable row level security;

create policy "Allow anon all" on public.meetings
  for all using (true) with check (true);

-- Index for zoom_meeting_id lookups during sync
create index if not exists idx_meetings_zoom_id on public.meetings(zoom_meeting_id);
