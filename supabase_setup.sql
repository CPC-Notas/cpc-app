-- ============================================================
-- SUPABASE SETUP — Run this in Supabase SQL Editor
-- supabase.com → Your project → SQL Editor → New query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CLINICIANS (linked to Supabase Auth users)
CREATE TABLE clinicians (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  title       TEXT,
  license_num TEXT,
  clinic      TEXT DEFAULT 'Caribbean Psychology Wellness Center',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENTS (shared across all clinicians at the clinic)
CREATE TABLE patients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  dob         DATE,
  gender      TEXT,
  pronouns    TEXT,
  record_num  TEXT,
  insurance   TEXT,
  diagnosis   TEXT,
  clinician_id UUID REFERENCES clinicians(id),
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PROGRESS NOTES
CREATE TABLE progress_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE,
  clinician_id    UUID REFERENCES clinicians(id),
  session_date    DATE NOT NULL,
  session_type    TEXT,
  modality        TEXT,
  time_start      TIME,
  time_end        TIME,
  duration_min    INT,
  session_num     INT,
  cpt_code        TEXT,
  diagnosis       TEXT,
  -- MSE
  mse_appearance  TEXT,
  mse_behavior    TEXT,
  mse_mood        TEXT,
  mse_affect      TEXT,
  mse_thought     TEXT,
  mse_orientation TEXT,
  mse_notes       TEXT,
  gaf_score       INT DEFAULT 65,
  -- Risk
  risk_suicide    TEXT DEFAULT 'Ninguno',
  risk_homicide   TEXT DEFAULT 'Ninguno',
  safety_plan     TEXT,
  -- Session content
  session_topics  TEXT,
  techniques      TEXT,
  pt_response     TEXT,
  -- Plan
  progress        TEXT,
  plan_changes    TEXT,
  homework        TEXT,
  next_appt       DATE,
  frequency       TEXT,
  extra_notes     TEXT,
  -- Signature
  signed_at       TIMESTAMPTZ,
  signed_by       TEXT,
  status          TEXT DEFAULT 'draft', -- draft | signed
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notes_updated_at BEFORE UPDATE ON progress_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ROW LEVEL SECURITY
ALTER TABLE clinicians     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_notes ENABLE ROW LEVEL SECURITY;

-- Clinicians can only see their own profile
CREATE POLICY "clinicians_own" ON clinicians
  FOR ALL USING (auth.uid() = id);

-- All authenticated users can read/write patients (shared clinic)
CREATE POLICY "patients_authenticated" ON patients
  FOR ALL USING (auth.role() = 'authenticated');

-- All authenticated users can read/write notes
CREATE POLICY "notes_authenticated" ON progress_notes
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed default clinicians (run AFTER users sign up via app)
-- UPDATE clinicians SET full_name='Dr. José Antonio García', title='PsyD', license_num='7159' WHERE id='<user-uuid>';
-- UPDATE clinicians SET full_name='Dra. Adrianna Ortiz Morales', title='PhD', license_num='7403' WHERE id='<user-uuid>';
