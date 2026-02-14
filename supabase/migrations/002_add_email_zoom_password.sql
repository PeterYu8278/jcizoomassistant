-- Add email and zoom_password columns to meetings
alter table public.meetings add column if not exists email text default '';
alter table public.meetings add column if not exists zoom_password text default '';
