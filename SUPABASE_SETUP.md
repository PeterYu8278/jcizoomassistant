# Supabase Setup (Multi-Device Sync)

## Overview

Supabase provides cloud storage for meetings so data syncs across devices. Without Supabase, meetings are stored in browser localStorage only.

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a project
2. In **Project Settings** → **API**, copy:
   - **Project URL**
   - **anon public** key

### 2. Run Migration

In Supabase Dashboard → **SQL Editor**, run:

```sql
-- From supabase/migrations/001_create_meetings.sql
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

alter table public.meetings enable row level security;

create policy "Allow anon all" on public.meetings
  for all using (true) with check (true);

create index if not exists idx_meetings_zoom_id on public.meetings(zoom_meeting_id);
```

Add `email` and `zoom_password` columns (migration 002):

```sql
alter table public.meetings add column if not exists email text default '';
alter table public.meetings add column if not exists zoom_password text default '';
```

### 3. Configure Environment

Add to `.env.local` and Netlify:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your anon key |

### 4. Deploy

Redeploy after setting env vars. Meetings will sync across all devices.

## Without Supabase

If these vars are not set, the app falls back to localStorage (single-device only).
