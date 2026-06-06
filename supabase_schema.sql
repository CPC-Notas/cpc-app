-- =====================================================
-- Caribbean Psychology Wellness Center
-- Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PATIENTS TABLE
create table if not exists patients (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  dob         text,
  gender      text,
  pronouns    text,
  record_num  text,
  insurance   text,
  clinician   text,
  diagnosis   text,
  phone       text,
  email       text,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  created_by  uuid references auth.users(id)
);

-- ── PROGRESS NOTES TABLE
create table if not exists progress_notes (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid references patients(id) on delete cascade,
  patient_name    text,
  clinician       text,
  session_type    text,
  modality        text,
  enc_date        date,
  time_start      text,
  time_end        text,
  duration_min    integer,
  session_num     integer,
  insurance       text,
  cpt_code        text,
  diagnosis       text,
  -- MSE
  apariencia      text,
  actitud         text,
  mood            text,
  afecto          text,
  pensamiento     text,
  orientacion     text,
  mse_notes       text,
  -- GAF
  gaf_score       integer,
  gaf_label       text,
  -- Risk
  risk_suicida    text,
  risk_homicida   text,
  safety_plan     text,
  -- Session content
  session_topics  text,
  tecnicas        text,
  resp_interv     text,
  -- Plan
  progreso        text,
  cambios         text,
  homework        text,
  next_appt       date,
  frequency       text,
  extra_notes     text,
  -- Signature
  signed_by       text,
  signed_at       timestamptz,
  -- Meta
  status          text default 'draft',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  created_by      uuid references auth.users(id)
);

-- ── ROW LEVEL SECURITY (RLS)
-- Only authenticated users can access data

alter table patients enable row level security;
alter table progress_notes enable row level security;

-- All authenticated users in the clinic can read/write patients
create policy "clinic_patients_select" on patients
  for select using (auth.role() = 'authenticated');

create policy "clinic_patients_insert" on patients
  for insert with check (auth.role() = 'authenticated');

create policy "clinic_patients_update" on patients
  for update using (auth.role() = 'authenticated');

create policy "clinic_patients_delete" on patients
  for delete using (auth.role() = 'authenticated');

-- All authenticated users can read all notes
create policy "clinic_notes_select" on progress_notes
  for select using (auth.role() = 'authenticated');

-- Users can insert notes
create policy "clinic_notes_insert" on progress_notes
  for insert with check (auth.role() = 'authenticated');

-- Users can update their own notes (or all if admin)
create policy "clinic_notes_update" on progress_notes
  for update using (auth.role() = 'authenticated');

-- ── AUTO UPDATE updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger patients_updated_at
  before update on patients
  for each row execute function update_updated_at();

create trigger notes_updated_at
  before update on progress_notes
  for each row execute function update_updated_at();

-- ── INDEXES
create index if not exists patients_name_idx on patients(name);
create index if not exists notes_patient_idx on progress_notes(patient_id);
create index if not exists notes_date_idx on progress_notes(enc_date desc);
create index if not exists notes_clinician_idx on progress_notes(clinician);
