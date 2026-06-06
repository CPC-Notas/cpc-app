// db.js — Supabase client wrapper
(function(){
  const cfg = window.CPC_CONFIG;
  window.db = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  // ── PATIENTS ──────────────────────────────────────────────
  window.DB = {

    async getPatients(search=''){
      let q = db.from('patients').select('*').order('name');
      if(search) q = q.ilike('name', '%'+search+'%');
      const {data,error} = await q;
      if(error) throw error;
      return data||[];
    },

    async savePatient(pt){
      const {id,...rest} = pt;
      if(id){
        const {data,error} = await db.from('patients').update(rest).eq('id',id).select().single();
        if(error) throw error; return data;
      } else {
        const {data,error} = await db.from('patients').insert(rest).select().single();
        if(error) throw error; return data;
      }
    },

    async deletePatient(id){
      const {error} = await db.from('patients').delete().eq('id',id);
      if(error) throw error;
    },

    async searchPatients(q){
      const {data,error} = await db.from('patients')
        .select('*')
        .or('name.ilike.%'+q+'%,record_num.ilike.%'+q+'%')
        .order('name').limit(8);
      if(error) throw error; return data||[];
    },

    // ── NOTES ──────────────────────────────────────────────
    async saveNote(note){
      const {id,...rest} = note;
      if(id){
        const {data,error} = await db.from('progress_notes').update(rest).eq('id',id).select().single();
        if(error) throw error; return data;
      } else {
        const {data,error} = await db.from('progress_notes').insert(rest).select().single();
        if(error) throw error; return data;
      }
    },

    async getNotesByPatient(patientId){
      const {data,error} = await db.from('progress_notes')
        .select('*').eq('patient_id',patientId).order('session_date',{ascending:false});
      if(error) throw error; return data||[];
    },

    async getRecentNotes(limit=20){
      const {data,error} = await db.from('progress_notes')
        .select('*, patients(name,record_num)')
        .order('session_date',{ascending:false}).limit(limit);
      if(error) throw error; return data||[];
    },

    async signNote(id, clinicianName){
      const {data,error} = await db.from('progress_notes')
        .update({status:'signed', signed_at: new Date().toISOString(), signed_by: clinicianName})
        .eq('id',id).select().single();
      if(error) throw error; return data;
    },

    // ── CLINICIAN ──────────────────────────────────────────
    async getClinician(userId){
      const {data,error} = await db.from('clinicians').select('*').eq('id',userId).single();
      if(error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async saveClinician(userId, info){
      const {data,error} = await db.from('clinicians')
        .upsert({id:userId,...info}).select().single();
      if(error) throw error; return data;
    },

    async getAllClinicians(){
      const {data,error} = await db.from('clinicians').select('*').order('full_name');
      if(error) throw error; return data||[];
    },
  };
})();
