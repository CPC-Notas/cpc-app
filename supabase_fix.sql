-- =====================================================
-- CPC-Notas: Fix Script — Ejecutar si ya corriste el schema antes
-- Borra políticas duplicadas y las recrea limpio
-- =====================================================

-- Drop existing policies if they exist
drop policy if exists "clinic_patients_select" on patients;
drop policy if exists "clinic_patients_insert" on patients;
drop policy if exists "clinic_patients_update" on patients;
drop policy if exists "clinic_patients_delete" on patients;
drop policy if exists "clinic_notes_select" on progress_notes;
drop policy if exists "clinic_notes_insert" on progress_notes;
drop policy if exists "clinic_notes_update" on progress_notes;

-- Drop existing triggers if they exist
drop trigger if exists patients_updated_at on patients;
drop trigger if exists notes_updated_at on progress_notes;

-- Drop existing function
drop function if exists update_updated_at() cascade;

-- ── Make sure tables exist (won't overwrite if already there)
create extension if not exists "uuid-ossp";

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

create table if not exists progress_notes (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid references patients(id) on delete set null,
  patient_name    text,
  clinician       text,
  session_type    text,
  modality        text,
  enc_date        date,
  time_start      text,
  time_end        text,
  duration_min    integer,
  session_num     integer,
  record_num      text,
  insurance       text,
  cpt_code        text,
  diagnosis       text,
  apariencia      text,
  actitud         text,
  mood            text,
  afecto          text,
  pensamiento     text,
  orientacion     text,
  mse_notes       text,
  gaf_score       integer default 65,
  gaf_label       text,
  risk_suicida    text default 'Ninguno',
  risk_homicida   text default 'Ninguno',
  safety_plan     text,
  session_topics  text,
  tecnicas        text,
  resp_interv     text,
  progreso        text,
  cambios         text,
  homework        text,
  next_appt       date,
  frequency       text,
  extra_notes     text,
  status          text default 'draft',
  signed_by       text,
  signed_at       timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  created_by      uuid references auth.users(id)
);

-- ── Enable Row Level Security
alter table patients enable row level security;
alter table progress_notes enable row level security;

-- ── Recreate policies cleanly
create policy "clinic_patients_select" on patients
  for select using (auth.role() = 'authenticated');

create policy "clinic_patients_insert" on patients
  for insert with check (auth.role() = 'authenticated');

create policy "clinic_patients_update" on patients
  for update using (auth.role() = 'authenticated');

create policy "clinic_patients_delete" on patients
  for delete using (auth.role() = 'authenticated');

create policy "clinic_notes_select" on progress_notes
  for select using (auth.role() = 'authenticated');

create policy "clinic_notes_insert" on progress_notes
  for insert with check (auth.role() = 'authenticated');

create policy "clinic_notes_update" on progress_notes
  for update using (auth.role() = 'authenticated');

-- ── Auto-update timestamps
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

-- ── Indexes
create index if not exists patients_name_idx on patients(name);
create index if not exists notes_date_idx on progress_notes(enc_date desc);
create index if not exists notes_clinician_idx on progress_notes(clinician);
