// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kdhuwkyihijsgyswgfvr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkaHV3a3lpaGlqc2d5c3dnZnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MjY2MjksImV4cCI6MjA5NjEwMjYyOX0.ip_drh_yHV1HtxiaF2sl3nqjEGVrzOYqBb0ZQjZPXRg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
