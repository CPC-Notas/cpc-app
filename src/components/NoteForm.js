import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { supabase } from '../supabaseClient'

// ── CONSTANTS
const CLINICIANS_LIST = ['Dr. José Antonio García, PsyD — Lic. 7159','Dra. Adrianna Ortiz Morales, PhD — Lic. 7403']
const SESSION_TYPES = ['Individual','Pareja','Familiar','Grupal','Evaluación','Consulta','Telehealth']
const MODALITIES    = ['Presencial','Telehealth – Video','Telehealth – Teléfono']
const CPT_CODES     = ['90791 – Evaluación psiquiátrica','90834 – Psicoterapia 45 min','90837 – Psicoterapia 60 min','90847 – Psicoterapia familiar','90853 – Psicoterapia grupal','96130 – Pruebas psicológicas']
const TECNICAS      = ['TCC','ACT','DBT','EMDR','Psicodinámico','Mindfulness','Psicoeducación','Activación conductual','Narrativa','Terapia de juego','Gestalt','Sistémica','Entrevista motivacional']
const AFECTOS       = ['Eutímico','Deprimido','Ansioso','Lábil','Plano','Elevado']
const INSURE        = ['','MCS','Triple S','Privado / Pago directo','Psicología Para Todos','Otro']
const DIAGS         = ['F32.1 – Ep. depresivo mayor, moderado','F32.9 – Ep. depresivo mayor, no especificado','F41.0 – T. de pánico','F41.1 – T. ansiedad generalizada','F43.10 – TEPT','F43.23 – T. adaptativo mixto','F90.0 – TDAH inatento','F90.2 – TDAH combinado','F60.3 – T. limítrofe personalidad','F31.9 – T. bipolar']
const FREQUENCIES   = ['Semanal','Cada dos semanas','Mensual','Según necesidad','Alta – sin próxima cita']
const RISK_LEVELS   = ['Ninguno','Bajo','Moderado','Alto','Inminente']
const RISK_BG       = {Ninguno:'#E1F5EE',Bajo:'#EAF3DE',Moderado:'#FAEEDA',Alto:'#FCEBEB',Inminente:'#E24B4A'}
const RISK_CLR      = {Ninguno:'#0F6E56',Bajo:'#3B6D11',Moderado:'#854F0B',Alto:'#A32D2D',Inminente:'#fff'}

const toArr = v => Array.isArray(v) ? v : (!v ? [] : v.split(', ').filter(Boolean))
const todayStr = () => new Date().toISOString().split('T')[0]
const gafLabel = v => v>=91?'Excelente':v>=81?'Mínimos':v>=71?'Leves':v>=61?'Mod. leve':v>=51?'Moderados':v>=41?'Serio':v>=31?'Marcado':'Severo'

const emptyNote = {
  patient_name:'',clinician:'',session_type:'',modality:'',enc_date:todayStr(),
  time_start:'',time_end:'',duration_min:'',session_num:'',record_num:'',insurance:'',cpt_code:'',diagnosis:'',
  apariencia:[],actitud:[],mood:'',afecto:'',pensamiento:[],orientacion:[],mse_notes:'',
  gaf_score:65,risk_suicida:'Ninguno',risk_homicida:'Ninguno',safety_plan:'',
  session_topics:'',tecnicas:[],resp_interv:'',progreso:'',cambios:[],homework:'',
  next_appt:'',frequency:'',extra_notes:'',status:'draft',signed_by:'',signed_at:null,
}

// ── OUTSIDE COMPONENTS (stable, never redefined)

const SecHeader = memo(({ num, title, onAI }) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',background:'#f7f8fa',borderBottom:'1px solid #e2e6ec'}}>
    <div style={{fontSize:12,fontWeight:700,color:'#1a2c4e',textTransform:'uppercase',letterSpacing:'.06em'}}>{num}. {title}</div>
    {onAI && <button onMouseDown={e=>{e.preventDefault();onAI()}} style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:5,padding:'4px 10px',fontSize:11,color:'#0F6E56',cursor:'pointer',fontWeight:600,fontFamily:'inherit'}}>✦ IA</button>}
  </div>
))

const RiskButtons = memo(({ value, onChange }) => (
  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
    {RISK_LEVELS.map(r => (
      <button key={r} onMouseDown={e=>{e.preventDefault();onChange(r)}}
        style={{padding:'6px 11px',borderRadius:6,border:`1.5px solid ${value===r?RISK_BG[r]:'#e2e6ec'}`,background:value===r?RISK_BG[r]:'#fff',color:value===r?RISK_CLR[r]:'#666',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
        {r}
      </button>
    ))}
  </div>
))

const ChipButtons = memo(({ opts, value, multi, onChange }) => (
  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:5}}>
    {opts.map(o => {
      const active = multi ? value.includes(o) : value === o
      return (
        <button key={o} onMouseDown={e=>{e.preventDefault();onChange(o)}}
          style={{padding:'5px 11px',borderRadius:6,border:`1px solid ${active?'#1D9E75':'#e2e6ec'}`,background:active?'#E1F5EE':'#fff',color:active?'#0F6E56':'#666',fontSize:12.5,cursor:'pointer',fontFamily:'inherit'}}>
          {o}
        </button>
      )
    })}
  </div>
))

const LocalTextarea = memo(({ stateValue, onCommit, placeholder, minHeight=68 }) => {
  const [v, setV] = useState(stateValue||'')
  useEffect(()=>{ setV(stateValue||'') },[stateValue])
  return (
    <textarea value={v} placeholder={placeholder}
      onChange={e=>setV(e.target.value)}
      onBlur={e=>{ if(e.target.value!==stateValue) onCommit(e.target.value) }}
      style={{width:'100%',minHeight,padding:'8px 10px',border:'1px solid #e2e6ec',borderRadius:8,fontSize:13,fontFamily:'inherit',resize:'vertical',outline:'none',lineHeight:1.6,boxSizing:'border-box'}} />
  )
})

const LocalInput = memo(({ stateValue, onCommit, placeholder, type='text', list, style:ext }) => {
  const [v, setV] = useState(stateValue||'')
  useEffect(()=>{ setV(stateValue||'') },[stateValue])
  return (
    <input type={type} value={v} placeholder={placeholder} list={list}
      onChange={e=>setV(e.target.value)}
      onBlur={e=>{ if(e.target.value!==stateValue) onCommit(e.target.value) }}
      style={{width:'100%',padding:'8px 10px',border:'1px solid #e2e6ec',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box',...(ext||{})}} />
  )
})

const PatientSearch = memo(({ value, patients, onSelect }) => {
  const [q, setQ]       = useState(value||'')
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)
  useEffect(()=>{ setQ(value||'') },[value])
  useEffect(()=>{
    const h = e=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown',h)
    return ()=>document.removeEventListener('mousedown',h)
  },[])
  const filtered = q.length>0 ? patients.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())).slice(0,8) : patients.slice(0,8)
  return (
    <div ref={ref} style={{position:'relative'}}>
      <input value={q} placeholder="Apellido, Nombre"
        style={{width:'100%',padding:'8px 10px',border:'1px solid #e2e6ec',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
        onChange={e=>{setQ(e.target.value);setOpen(true)}}
        onFocus={()=>setOpen(true)} />
      {open && filtered.length>0 && (
        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #e2e6ec',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,.12)',zIndex:9999,maxHeight:240,overflowY:'auto',marginTop:3}}>
          {filtered.map(p=>(
            <div key={p.id}
              onMouseDown={e=>{e.preventDefault();setQ(p.name);setOpen(false);onSelect(p)}}
              style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #f0f2f5'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f0f9f5'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <div style={{fontWeight:500,fontSize:13,color:'#1a2c4e'}}>{p.name}</div>
              <div style={{fontSize:11,color:'#9aa3b2',marginTop:1,display:'flex',gap:10,flexWrap:'wrap'}}>
                {p.record_num&&<span>📁 {p.record_num}</span>}
                {p.insurance&&<span>🏥 {p.insurance}</span>}
                {p.diagnosis&&<span style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🩺 {p.diagnosis}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// ── MAIN COMPONENT
export default function NoteForm({ nav, session, patient, note }) {
  const [form, setForm] = useState(() => {
    if(note?.id) return {
      ...emptyNote,...note,
      apariencia:toArr(note.apariencia),actitud:toArr(note.actitud),
      pensamiento:toArr(note.pensamiento),orientacion:toArr(note.orientacion),
      tecnicas:toArr(note.tecnicas),cambios:toArr(note.cambios),
      mood:note.mood||'',mse_notes:note.mse_notes||'',
      session_topics:note.session_topics||'',resp_interv:note.resp_interv||'',
      homework:note.homework||'',safety_plan:note.safety_plan||'',
      extra_notes:note.extra_notes||'',progreso:note.progreso||'',afecto:note.afecto||'',
    }
    const base={...emptyNote}
    if(patient){base.patient_name=patient.name||'';base.insurance=patient.insurance||'';base.diagnosis=patient.diagnosis||'';base.record_num=patient.record_num||'';base.clinician=patient.clinician||''}
    return base
  })

  const [patients,setPatients]   = useState([])
  const [saving,setSaving]       = useState(false)
  const [toast,setToast]         = useState(null)
  const [aiOpen,setAiOpen]       = useState(false)
  const [aiInput,setAiInput]     = useState('')
  const [aiMsgs,setAiMsgs]       = useState([{role:'ai',text:'👋 Usa los botones ✦IA o escríbeme. Generaré texto clínico para insertar en la nota.'}])
  const [aiLoading,setAiLoading] = useState(false)
  const [apiKey,setApiKey]       = useState(()=>localStorage.getItem('cpc_api_key')||'')
  const [showKey,setShowKey]     = useState(false)
  const msgsEnd = useRef(null)
  const formRef = useRef(form)
  formRef.current = form

  useEffect(()=>{
    supabase.from('patients').select('id,name,insurance,diagnosis,record_num,clinician,gender,pronouns').order('name').then(({data})=>setPatients(data||[]))
  },[])

  useEffect(()=>{ msgsEnd.current?.scrollIntoView({behavior:'smooth'}) },[aiMsgs])

  const sf = useCallback((k,v)=>setForm(f=>({...f,[k]:v})),[])

  const toggleArr = useCallback((k,v)=>setForm(f=>({
    ...f,[k]:f[k].includes(v)?f[k].filter(x=>x!==v):[...f[k],v]
  })),[])

  const onStartTime = useCallback(val=>{
    if(!val){sf('time_start',val);return}
    const [sh,sm]=val.split(':').map(Number)
    const tot=sh*60+sm+60
    const eh=String(Math.floor(tot/60)%24).padStart(2,'0')
    const em=String(tot%60).padStart(2,'0')
    setForm(f=>({...f,time_start:val,time_end:`${eh}:${em}`,duration_min:60}))
  },[sf])

  const onEndTime = useCallback(val=>{
    setForm(f=>{
      if(!val||!f.time_start) return {...f,time_end:val}
      const [sh,sm]=f.time_start.split(':').map(Number)
      const [eh,em]=val.split(':').map(Number)
      const diff=(eh*60+em)-(sh*60+sm)
      return {...f,time_end:val,duration_min:diff>0?diff:f.duration_min}
    })
  },[])

  const onPatientSelect = useCallback(p=>{
    setForm(f=>({...f,
      patient_name:p.name||'',
      record_num:p.record_num||f.record_num,
      insurance:p.insurance||f.insurance,
      diagnosis:p.diagnosis||f.diagnosis,
      clinician:p.clinician||f.clinician,
    }))
  },[])

  const clearNote = useCallback(()=>{
    if(window.confirm('¿Limpiar todos los campos?')){
      setForm({...emptyNote})
      setAiMsgs([{role:'ai',text:'🔄 Nota limpiada.'}])
    }
  },[])

  const showToast = useCallback((msg,type='ok')=>{
    setToast({msg,type}); setTimeout(()=>setToast(null),3000)
  },[])

  const saveNote = async(status='draft')=>{
    const f=formRef.current
    if(!f.patient_name.trim()){showToast('Nombre del paciente requerido','err');return}
    setSaving(true)
    const payload={...f,status,
      session_num: f.session_num?parseInt(f.session_num):null,
      duration_min:f.duration_min?parseInt(f.duration_min):null,
      gaf_score:   f.gaf_score?parseInt(f.gaf_score):65,
      tecnicas:    toArr(f.tecnicas).join(', '),
      apariencia:  toArr(f.apariencia).join(', '),
      actitud:     toArr(f.actitud).join(', '),
      pensamiento: toArr(f.pensamiento).join(', '),
      orientacion: toArr(f.orientacion).join(', '),
      cambios:     toArr(f.cambios).join(', '),
      next_appt:   f.next_appt||null,
      updated_at:  new Date().toISOString(),
    }
    if(status==='signed'){payload.signed_by=f.clinician;payload.signed_at=new Date().toISOString()}
    let error
    if(f.id){
      ({error}=await supabase.from('progress_notes').update(payload).eq('id',f.id))
    } else {
      payload.created_by=session.user.id
      const {data,error:e}=await supabase.from('progress_notes').insert(payload).select().single()
      error=e; if(data) sf('id',data.id)
    }
    setSaving(false)
    if(error){showToast('Error: '+error.message,'err');return}
    showToast(status==='signed'?'✓ Nota firmada y guardada.':'💾 Guardado.')
  }

  const printNote = ()=>{
    const f=formRef.current
    const ptCtx=patients.find(p=>p.name===f.patient_name)
    const win=window.open('','_blank','width=900,height=700')
    win.document.open(); win.document.write(generatePrintHTML(f,ptCtx)); win.document.close()
    win.focus(); setTimeout(()=>win.print(),800)
  }

  const sendAI = useCallback(async prompt=>{
    const msg=prompt||aiInput.trim()
    if(!msg) return
    if(!apiKey){setShowKey(true);return}
    setAiOpen(true)
    setAiInput('')
    setAiMsgs(m=>[...m,{role:'user',text:msg.replace(/\[CAMPO:[^\]]+\]/g,'').trim()}])
    setAiLoading(true)
    const f=formRef.current
    const pts=patients
    const ptCtx=pts.find(p=>p.name===f.patient_name)
    const pronRef=ptCtx?.gender==='Femenino'?'la paciente':ptCtx?.gender==='Masculino'?'el paciente':'el/la paciente'
    const sys=`Eres asistente clínico de Caribbean Psychology Wellness Center. Redactas texto para notas de progreso.
REGLAS: Solo español clínico. SIN títulos, SIN markdown. Escribe DIRECTAMENTE 2-4 oraciones en tercera persona usando "${pronRef}". Termina con [CAMPO:id] usando guión bajo. Sin explicaciones extras.
Contexto: Px:${f.patient_name||'N/E'}|Dx:${f.diagnosis||'N/E'}|GAF:${f.gaf_score}|Riesgo:${f.risk_suicida}|Afecto:${f.afecto||'N/E'}|Técnicas:${toArr(f.tecnicas).join(',')||'N/E'}`
    try{
      const resp=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-5',max_tokens:600,system:sys,messages:[{role:'user',content:msg}]})
      })
      const data=await resp.json()
      if(!resp.ok){setAiMsgs(m=>[...m,{role:'ai',text:'❌ '+(data?.error?.message||'Error')}]);setAiLoading(false);return}
      const text=data.content?.[0]?.text||''
      const match=text.match(/\[CAMPO:([a-z0-9_]+)\]/)
      const fieldTag=match?match[1]:null
      const clean=text.replace(/\[CAMPO:[^\]]+\]/g,'').trim()
      setAiMsgs(m=>[...m,{role:'ai',text:clean,fieldTag}])
    }catch(e){setAiMsgs(m=>[...m,{role:'ai',text:'⚠️ Error de conexión.'}])}
    setAiLoading(false)
  },[aiInput,apiKey,patients])

  const applyField = useCallback((fieldTag,text)=>{
    if(!fieldTag||!Object.keys(emptyNote).includes(fieldTag)) return
    sf(fieldTag,text); showToast('✓ Insertado.')
  },[sf,showToast])

  const ask = useCallback(p=>{ setAiOpen(true); setTimeout(()=>sendAI(p),100) },[sendAI])

  const inp = {width:'100%',padding:'8px 10px',border:'1px solid #e2e6ec',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}
  const btn = {padding:'8px 14px',borderRadius:8,border:'1px solid #e2e6ec',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',background:'#fff'}
  const lbl = {fontSize:11,fontWeight:600,color:'#9aa3b2',textTransform:'uppercase',letterSpacing:'.07em',display:'block',marginBottom:4}
  const card = {background:'#fff',border:'1px solid #e2e6ec',borderRadius:12,marginBottom:12,overflow:'hidden'}

  return (
    <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
    <div style={{flex:1,minWidth:0}}>

      {/* HEADER BUTTONS */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.25rem',gap:12,flexWrap:'wrap'}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:600,color:'#1a2c4e'}}>{form.id?'Editar nota':'Nueva nota de progreso'}</h1>
          <p style={{margin:'4px 0 0',fontSize:13,color:'#9aa3b2'}}>Caribbean Psychology Wellness Center · {form.status==='signed'?'✓ Firmada':'Borrador'}</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button style={btn} onClick={()=>setAiOpen(o=>!o)}>✦ IA {aiOpen?'▲':'▼'}</button>
          <button style={btn} onClick={printNote}>🖨 PDF</button>
          <button style={{...btn,background:'#6c757d',color:'#fff',border:'none'}} onClick={clearNote}>🗑 Limpiar</button>
          <button style={{...btn,background:'#1a2c4e',color:'#fff',border:'none'}} onClick={()=>saveNote('draft')} disabled={saving}>💾 Guardar</button>
          <button style={{...btn,background:'#1D9E75',color:'#fff',border:'none'}} onClick={()=>saveNote('signed')} disabled={saving}>✍ Firmar</button>
        </div>
      </div>

      {/* 1. ENCUENTRO */}
      <div style={card}>
        <SecHeader num={1} title="Datos del Encuentro" />
        <div style={{padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px 14px'}}>
          <div><label style={lbl}>Clínico</label>
            <select style={inp} value={form.clinician} onChange={e=>sf('clinician',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {CLINICIANS_LIST.map(c=><option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label style={lbl}>Tipo de sesión</label>
            <select style={inp} value={form.session_type} onChange={e=>sf('session_type',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {SESSION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label style={lbl}>Modalidad</label>
            <select style={inp} value={form.modality} onChange={e=>sf('modality',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {MODALITIES.map(m=><option key={m} value={m}>{m}</option>)}
            </select></div>
          <div><label style={lbl}>Fecha *</label>
            <input type="date" style={inp} value={form.enc_date} onChange={e=>sf('enc_date',e.target.value)} /></div>
          <div><label style={lbl}>Hora inicio</label>
            <input type="time" style={inp} value={form.time_start} onChange={e=>onStartTime(e.target.value)} /></div>
          <div><label style={lbl}>Hora fin <span style={{fontSize:10,color:'#9aa3b2'}}>(auto +60)</span></label>
            <input type="time" style={inp} value={form.time_end} onChange={e=>onEndTime(e.target.value)} /></div>
        </div>
      </div>

      {/* 2. PACIENTE */}
      <div style={card}>
        <SecHeader num={2} title="Datos del Paciente" />
        <div style={{padding:'14px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
          <div style={{gridColumn:'span 2'}}>
            <label style={lbl}>Nombre del paciente *</label>
            <PatientSearch value={form.patient_name} patients={patients} onSelect={onPatientSelect} />
          </div>
          <div><label style={lbl}>Núm. expediente</label>
            <LocalInput stateValue={form.record_num||''} onCommit={v=>sf('record_num',v)} placeholder="EXP-0000" /></div>
          <div><label style={lbl}>Sesión #</label>
            <LocalInput type="number" stateValue={form.session_num||''} onCommit={v=>sf('session_num',v)} placeholder="1" /></div>
          <div><label style={lbl}>Seguro / Plan</label>
            <select style={inp} value={form.insurance||''} onChange={e=>sf('insurance',e.target.value)}>
              {INSURE.map(i=><option key={i} value={i}>{i||'— Seleccionar —'}</option>)}
            </select></div>
          <div><label style={lbl}>Código CPT</label>
            <select style={inp} value={form.cpt_code||''} onChange={e=>sf('cpt_code',e.target.value)}>
              <option value="">— Seleccionar —</option>
              {CPT_CODES.map(c=><option key={c} value={c}>{c}</option>)}
            </select></div>
          <div style={{gridColumn:'span 2'}}><label style={lbl}>Diagnóstico DSM-5</label>
            <LocalInput stateValue={form.diagnosis||''} onCommit={v=>sf('diagnosis',v)} placeholder="Ej. F41.1 – T. ansiedad generalizada" list="diag-list" />
            <datalist id="diag-list">{DIAGS.map(d=><option key={d} value={d}/>)}</datalist>
          </div>
        </div>
      </div>

      {/* 3. MSE */}
      <div style={card}>
        <SecHeader num={3} title="Examen del Estado Mental" onAI={()=>ask('Redacta la narrativa del MSE en 3 oraciones clínicas. [CAMPO:mse_notes]')} />
        <div style={{padding:'14px 16px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
            <div><label style={lbl}>Apariencia</label>
              <ChipButtons opts={['Apropiada','Bien arreglada','Descuidada','Inapropiada']} value={form.apariencia} multi onChange={v=>toggleArr('apariencia',v)} /></div>
            <div><label style={lbl}>Actitud</label>
              <ChipButtons opts={['Cooperador','Ansioso','Resistente','Agitado','Retraído','Hostil']} value={form.actitud} multi onChange={v=>toggleArr('actitud',v)} /></div>
            <div><label style={lbl}>Estado de ánimo</label>
              <LocalInput stateValue={form.mood||''} onCommit={v=>sf('mood',v)} placeholder='"me siento triste"' style={{marginTop:5}} /></div>
            <div><label style={lbl}>Afecto observado</label>
              <ChipButtons opts={AFECTOS} value={form.afecto} onChange={v=>sf('afecto',v===form.afecto?'':v)} /></div>
            <div><label style={lbl}>Pensamiento</label>
              <ChipButtons opts={['Lógico y coherente','Desorganizado','Ideas rumiativas','Pensamiento mágico','Alucinaciones','Delusiones']} value={form.pensamiento} multi onChange={v=>toggleArr('pensamiento',v)} /></div>
            <div><label style={lbl}>Orientación / Insight</label>
              <ChipButtons opts={['Orientado ×3','Insight adecuado','Juicio intacto','Memoria intacta','Concentración ↓','Insight limitado']} value={form.orientacion} multi onChange={v=>toggleArr('orientacion',v)} /></div>
          </div>
          <div style={{marginTop:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <label style={lbl}>Observaciones narrativas</label>
              <button onMouseDown={e=>{e.preventDefault();ask('Redacta la narrativa del MSE en 3 oraciones. [CAMPO:mse_notes]')}} style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:4,padding:'2px 8px',fontSize:10,color:'#0F6E56',cursor:'pointer',fontFamily:'inherit'}}>✦ IA</button>
            </div>
            <LocalTextarea stateValue={form.mse_notes||''} onCommit={v=>sf('mse_notes',v)} placeholder="Descripción narrativa del estado mental..." />
          </div>
        </div>
      </div>

      {/* 4. GAF */}
      <div style={card}>
        <SecHeader num={4} title="Funcionalidad Global (GAF)" />
        <div style={{padding:'14px 16px'}}>
          <div style={{background:'#f7f8fa',borderRadius:10,padding:'14px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <div><div style={{fontSize:36,fontWeight:700,color:'#1a2c4e',lineHeight:1}}>{form.gaf_score}</div>
                <div style={{fontSize:12,color:'#1D9E75',fontWeight:600,marginTop:2}}>{gafLabel(form.gaf_score)}</div></div>
              <div style={{fontSize:11,color:'#9aa3b2',textAlign:'right',lineHeight:1.9}}>91–100: Excelente<br/>71–90: Leve<br/>51–70: Moderado<br/>31–50: Serio<br/>1–30: Severo</div>
            </div>
            <input type="range" min="1" max="100" value={form.gaf_score} onChange={e=>sf('gaf_score',+e.target.value)} style={{width:'100%',accentColor:'#1D9E75'}} />
          </div>
        </div>
      </div>

      {/* 5. RIESGO */}
      <div style={card}>
        <SecHeader num={5} title="Evaluación de Riesgo" />
        <div style={{padding:'14px 16px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
            <div><label style={lbl}>Riesgo suicida</label><RiskButtons value={form.risk_suicida} onChange={v=>sf('risk_suicida',v)} /></div>
            <div><label style={lbl}>Riesgo homicida</label><RiskButtons value={form.risk_homicida} onChange={v=>sf('risk_homicida',v)} /></div>
          </div>
          <div style={{marginTop:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <label style={lbl}>Plan de seguridad</label>
              <button onMouseDown={e=>{e.preventDefault();ask('Redacta el plan de seguridad en 2 oraciones. [CAMPO:safety_plan]')}} style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:4,padding:'2px 8px',fontSize:10,color:'#0F6E56',cursor:'pointer',fontFamily:'inherit'}}>✦ IA</button>
            </div>
            <LocalTextarea stateValue={form.safety_plan||''} onCommit={v=>sf('safety_plan',v)} placeholder="Plan de seguridad..." />
          </div>
        </div>
      </div>

      {/* 6. SESION */}
      <div style={card}>
        <SecHeader num={6} title="Contenido e Intervenciones" onAI={()=>ask('Redacta los temas de sesión en 2 oraciones. [CAMPO:session_topics]')} />
        <div style={{padding:'14px 16px'}}>
          <div style={{marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <label style={lbl}>Temas abordados</label>
              <button onMouseDown={e=>{e.preventDefault();ask('Redacta los temas de sesión en 2 oraciones. [CAMPO:session_topics]')}} style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:4,padding:'2px 8px',fontSize:10,color:'#0F6E56',cursor:'pointer',fontFamily:'inherit'}}>✦ IA</button>
            </div>
            <LocalTextarea stateValue={form.session_topics||''} onCommit={v=>sf('session_topics',v)} placeholder="Temas principales..." />
          </div>
          <div><label style={lbl}>Técnicas utilizadas</label>
            <ChipButtons opts={TECNICAS} value={form.tecnicas} multi onChange={v=>toggleArr('tecnicas',v)} /></div>
          <div style={{marginTop:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <label style={lbl}>Respuesta del paciente</label>
              <button onMouseDown={e=>{e.preventDefault();ask('Redacta la respuesta del paciente en 2 oraciones. [CAMPO:resp_interv]')}} style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:4,padding:'2px 8px',fontSize:10,color:'#0F6E56',cursor:'pointer',fontFamily:'inherit'}}>✦ IA</button>
            </div>
            <LocalTextarea stateValue={form.resp_interv||''} onCommit={v=>sf('resp_interv',v)} placeholder="Respuesta a las intervenciones..." />
          </div>
        </div>
      </div>

      {/* 7. PROGRESO */}
      <div style={card}>
        <SecHeader num={7} title="Progreso y Plan" onAI={()=>ask('Escribe 3 tareas terapéuticas concretas. [CAMPO:homework]')} />
        <div style={{padding:'14px 16px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px',marginBottom:10}}>
            <div><label style={lbl}>Progreso hacia objetivos</label>
              <ChipButtons opts={['Notable mejoría','Mejoría moderada','Sin cambios','Deterioro leve','Deterioro significativo','No aplica (1ra sesión)']} value={form.progreso} onChange={v=>sf('progreso',v===form.progreso?'':v)} /></div>
            <div><label style={lbl}>Cambios al plan</label>
              <ChipButtons opts={['Sin cambios','Ajuste de frecuencia','Nuevo objetivo','Referido psiquiatría','Referido otro especialista','Alta clínica']} value={form.cambios} multi onChange={v=>toggleArr('cambios',v)} /></div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <label style={lbl}>Tareas / Asignaciones</label>
              <button onMouseDown={e=>{e.preventDefault();ask('Escribe 3 tareas terapéuticas breves. [CAMPO:homework]')}} style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:4,padding:'2px 8px',fontSize:10,color:'#0F6E56',cursor:'pointer',fontFamily:'inherit'}}>✦ IA</button>
            </div>
            <LocalTextarea stateValue={form.homework||''} onCommit={v=>sf('homework',v)} placeholder="Tareas entre sesiones..." />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
            <div><label style={lbl}>Próxima cita</label>
              <input type="date" style={inp} value={form.next_appt||''} onChange={e=>sf('next_appt',e.target.value)} /></div>
            <div><label style={lbl}>Frecuencia</label>
              <select style={inp} value={form.frequency||''} onChange={e=>sf('frequency',e.target.value)}>
                <option value="">— Seleccionar —</option>
                {FREQUENCIES.map(f=><option key={f} value={f}>{f}</option>)}
              </select></div>
          </div>
        </div>
      </div>

      {/* 8. NOTAS */}
      <div style={card}>
        <SecHeader num={8} title="Notas Adicionales" />
        <div style={{padding:'14px 16px'}}>
          <LocalTextarea stateValue={form.extra_notes||''} onCommit={v=>sf('extra_notes',v)} placeholder="Coordinaciones, aspectos legales..." />
        </div>
      </div>

      {/* FIRMA */}
      <div style={{...card,padding:'1.25rem',marginBottom:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'#9aa3b2',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>Clínico responsable</div>
            <div style={{borderBottom:'1.5pt solid #1a2c4e',padding:'4px 0',minHeight:32,fontSize:13,color:'#1a2c4e',fontWeight:500,display:'flex',alignItems:'flex-end'}}>{form.signed_by||form.clinician||'—'}</div>
            <div style={{fontSize:10,color:'#9aa3b2',marginTop:3,textTransform:'uppercase'}}>Nombre · Credencial · Licencia</div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'#9aa3b2',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>Fecha de la nota</div>
            <div style={{borderBottom:'1.5pt solid #1a2c4e',padding:'4px 0',minHeight:32,fontSize:13,color:'#1a2c4e',display:'flex',alignItems:'flex-end'}}>{form.enc_date||'—'}</div>
            <div style={{fontSize:10,color:'#9aa3b2',marginTop:3,textTransform:'uppercase'}}>Fecha del encuentro</div>
          </div>
        </div>
        <div style={{background:'#E1F5EE',border:'1px solid #9FE1CB',borderRadius:6,padding:'8px 12px',fontSize:11.5,color:'#0F6E56',marginTop:12}}>
          Certificación: El clínico certifica que la información es correcta y completa, en cumplimiento con HIPAA y la Ley Núm. 408 de Puerto Rico.
        </div>
      </div>

      <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginBottom:32}}>
        <button style={btn} onClick={()=>nav('notes')}>← Volver</button>
        <button style={btn} onClick={printNote}>🖨 PDF</button>
        <button style={{...btn,background:'#6c757d',color:'#fff',border:'none'}} onClick={clearNote}>🗑 Limpiar</button>
        <button style={{...btn,background:'#1a2c4e',color:'#fff',border:'none'}} onClick={()=>saveNote('draft')} disabled={saving}>💾 Guardar borrador</button>
        <button style={{...btn,background:'#1D9E75',color:'#fff',border:'none'}} onClick={()=>saveNote('signed')} disabled={saving}>✍ Firmar y guardar</button>
      </div>
    </div>

    {/* AI PANEL */}
    {aiOpen&&(
      <div style={{width:320,flexShrink:0,background:'#fff',border:'1px solid #e2e6ec',borderRadius:12,display:'flex',flexDirection:'column',position:'sticky',top:20,height:'calc(100vh - 40px)',overflow:'hidden'}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid #e2e6ec',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1a2c4e',display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:7,height:7,background:'#1D9E75',borderRadius:'50%',display:'inline-block'}}/>Claude IA
          </div>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#9aa3b2'}} onClick={()=>setAiOpen(false)}>✕</button>
        </div>
        <div style={{padding:'5px 10px',background:'#f7f8fa',borderBottom:'1px solid #e2e6ec',fontSize:11,color:'#9aa3b2',flexShrink:0}}>
          {form.patient_name||'Sin paciente'} · GAF:{form.gaf_score}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:10}}>
          {aiMsgs.map((m,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:m.role==='user'?'flex-end':'flex-start'}}>
              <div style={{padding:'8px 11px',borderRadius:9,fontSize:12.5,lineHeight:1.6,maxWidth:'94%',background:m.role==='user'?'#1a2c4e':'#f0f2f5',color:m.role==='user'?'#fff':'#1a2c4e',whiteSpace:'pre-wrap'}}>{m.text}</div>
              {m.fieldTag&&<button onMouseDown={e=>{e.preventDefault();applyField(m.fieldTag,m.text)}} style={{marginTop:4,background:'#1D9E75',border:'none',color:'#fff',borderRadius:5,padding:'4px 12px',fontSize:11.5,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✅ Insertar en nota</button>}
              <div style={{fontSize:9.5,color:'#9aa3b2',marginTop:2}}>{m.role==='user'?'Tú':'Claude · CPC'}</div>
            </div>
          ))}
          {aiLoading&&<div style={{fontSize:12,color:'#9aa3b2',textAlign:'center',padding:8}}>⏳ Generando...</div>}
          <div ref={msgsEnd}/>
        </div>
        <div style={{padding:'6px 10px',borderTop:'1px solid #e2e6ec',display:'flex',flexWrap:'wrap',gap:4,flexShrink:0}}>
          {[
            {l:'MSE',p:'Redacta narrativa del MSE en 3 oraciones. [CAMPO:mse_notes]'},
            {l:'Temas',p:'Redacta temas de sesión en 2 oraciones. [CAMPO:session_topics]'},
            {l:'Respuesta',p:'Redacta respuesta del paciente en 2 oraciones. [CAMPO:resp_interv]'},
            {l:'Tareas',p:'Escribe 3 tareas terapéuticas breves. [CAMPO:homework]'},
            {l:'Seguridad',p:'Redacta plan de seguridad en 2 oraciones. [CAMPO:safety_plan]'},
            {l:'Revisar',p:'Revisa la nota y da sugerencias breves.'},
          ].map(({l,p})=><button key={l} onMouseDown={e=>{e.preventDefault();sendAI(p)}} style={{background:'#f7f8fa',border:'1px solid #e2e6ec',borderRadius:12,padding:'4px 9px',fontSize:11,cursor:'pointer',fontFamily:'inherit',color:'#5a6478'}}>{l}</button>)}
        </div>
        {showKey&&(
          <div style={{padding:'10px 12px',background:'#FAEEDA',borderTop:'1px solid #FAC775',flexShrink:0}}>
            <div style={{fontSize:11.5,color:'#854F0B',marginBottom:6}}>🔑 API Key de Anthropic:</div>
            <div style={{display:'flex',gap:6}}>
              <input style={{flex:1,fontSize:12,padding:'6px 8px',border:'1px solid #e2e6ec',borderRadius:6}} placeholder="sk-ant-..." defaultValue={apiKey} onChange={e=>setApiKey(e.target.value)}/>
              <button onClick={()=>{localStorage.setItem('cpc_api_key',apiKey);setShowKey(false);showToast('✓ API Key guardada.')}} style={{background:'#1D9E75',color:'#fff',border:'none',borderRadius:6,padding:'6px 10px',fontSize:12,cursor:'pointer'}}>Guardar</button>
            </div>
          </div>
        )}
        <div style={{padding:'8px 10px',borderTop:'1px solid #e2e6ec',display:'flex',gap:6,alignItems:'flex-end',flexShrink:0}}>
          <textarea value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI()}}} placeholder="Escribe aquí..." rows={2} style={{flex:1,fontSize:12.5,padding:'7px 9px',border:'1.5px solid #1D9E75',borderRadius:7,resize:'none',fontFamily:'inherit',outline:'none'}}/>
          <button onMouseDown={e=>{e.preventDefault();sendAI()}} disabled={aiLoading} style={{background:'#1D9E75',color:'#fff',border:'none',borderRadius:7,padding:'10px 13px',cursor:'pointer',fontSize:15}}>➤</button>
        </div>
      </div>
    )}
    {toast&&<div style={{position:'fixed',bottom:20,right:20,background:toast.type==='err'?'#E24B4A':'#1D9E75',color:'#fff',padding:'10px 18px',borderRadius:8,fontSize:13,fontWeight:500,zIndex:999}}>{toast.msg}</div>}
    </div>
  )
}

function generatePrintHTML(form,ptCtx){
  const arr=v=>Array.isArray(v)?v.filter(Boolean).join(' · '):(v||'')
  const has=v=>v&&String(v).trim()
  const gL=v=>v>=91?'Excelente':v>=81?'Mínimos':v>=71?'Leves':v>=61?'Mod. leve':v>=51?'Moderados':v>=41?'Serio':v>=31?'Marcado':'Severo'
  const rC={Ninguno:'#0F6E56',Bajo:'#3B6D11',Moderado:'#854F0B',Alto:'#A32D2D',Inminente:'#fff'}
  const rB={Ninguno:'#E1F5EE',Bajo:'#EAF3DE',Moderado:'#FAEEDA',Alto:'#FCEBEB',Inminente:'#E24B4A'}
  const rs=form.risk_suicida||'Ninguno',rh=form.risk_homicida||'Ninguno'
  const f=(l,v)=>has(v)?`<div class="field"><span class="fl">${l}</span><span class="fv">${v}</span></div>`:''
  const sh=(n,t)=>`<div class="sh"><span class="sn">${n}</span>${t}</div>`
  const chips=str=>str?str.split(' · ').map(t=>`<span class="chip">${t}</span>`).join(''):''
  return`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Nota · ${form.patient_name||'Px'}</title><style>
@page{size:letter portrait;margin:14mm 15mm 12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Calibri',Arial,sans-serif;font-size:8.2pt;color:#1e2530}
.header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:7pt;margin-bottom:7pt;border-bottom:2.5pt solid #1a2c4e}
.logo{display:flex;align-items:center;gap:9pt}.logo-dot{width:30pt;height:30pt;border-radius:50%;background:#1a2c4e;color:#fff;font-size:9.5pt;font-weight:700;display:flex;align-items:center;justify-content:center}
.clinic-n{font-size:12pt;font-weight:700;color:#1a2c4e}.clinic-s{font-size:7pt;color:#9aa3b2;margin-top:1pt}
.hdr-right{text-align:right}.doc-t{font-size:11pt;font-weight:700;color:#1D9E75}.doc-s{font-size:7pt;color:#9aa3b2;margin-top:2pt}
.hipaa{display:inline-block;font-size:6pt;font-weight:700;background:#FCEBEB;color:#A32D2D;padding:1.5pt 5pt;border-radius:3pt;margin-top:3pt}
.pt-strip{background:#1a2c4e;border-radius:5pt;padding:6pt 10pt;margin-bottom:7pt;display:flex;justify-content:space-between;align-items:center}
.pt-n{font-size:11.5pt;font-weight:700;color:#fff}.pt-m{font-size:7.5pt;color:#9ab0cc;margin-top:2pt;display:flex;gap:10pt;flex-wrap:wrap}.pt-dx{font-size:8pt;color:#9FE1CB;text-align:right;max-width:180pt}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:0 14pt}.sec{margin-bottom:6pt}
.sh{display:flex;align-items:center;gap:5pt;margin-bottom:3pt;padding-bottom:1.5pt;border-bottom:.8pt solid #1D9E75;font-size:7pt;font-weight:700;color:#1a2c4e;text-transform:uppercase;letter-spacing:.07em}
.sn{background:#1D9E75;color:#fff;font-size:6pt;font-weight:700;width:11pt;height:11pt;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.field{display:flex;gap:4pt;margin-bottom:1.5pt}.fl{font-size:7.5pt;font-weight:700;color:#6b7280;min-width:72pt;flex-shrink:0}.fv{font-size:8pt;color:#1e2530;flex:1}
.narr{background:#f7f9fc;border-left:2pt solid #1D9E75;padding:3pt 6pt;font-size:8pt;line-height:1.5;color:#2d3748;margin:2pt 0 3pt}
.chips{display:flex;flex-wrap:wrap;gap:2.5pt;margin:2pt 0 3pt}.chip{background:#E1F5EE;color:#0F6E56;padding:1.5pt 6pt;border-radius:10pt;font-size:7pt;font-weight:500}.chip-b{background:#E6F1FB;color:#0C447C}
.gaf-row{display:flex;align-items:center;gap:8pt;margin:2pt 0}.gaf-num{font-size:22pt;font-weight:700;color:#1a2c4e;line-height:1}.gaf-lbl{font-size:8pt;font-weight:700;color:#1D9E75;margin-bottom:3pt}
.gaf-bar{height:6pt;border-radius:3pt;background:linear-gradient(to right,#E24B4A,#EF9F27 38%,#1D9E75 72%,#0F6E56)}.gaf-sc{display:flex;justify-content:space-between;font-size:6pt;color:#9aa3b2;margin-top:1.5pt}
.risk-row{display:flex;gap:5pt;margin:2pt 0}.risk-box{flex:1;border-radius:4pt;padding:4pt 6pt;text-align:center}.risk-lbl{font-size:6pt;font-weight:600;text-transform:uppercase;opacity:.8;margin-bottom:1.5pt}.risk-val{font-size:9pt;font-weight:700}
.sig-wrap{display:grid;grid-template-columns:1fr 1fr;gap:12pt;margin:5pt 0;padding:6pt 10pt;background:#f7f9fc;border-radius:5pt}
.sig-line{border-bottom:1.5pt solid #1a2c4e;min-height:20pt;padding-bottom:2pt;font-size:9pt;font-weight:700;color:#1a2c4e;display:flex;align-items:flex-end}.sig-sub{font-size:6.5pt;color:#9aa3b2;text-transform:uppercase;margin-top:2pt}
.cert{background:#E1F5EE;border:.5pt solid #9FE1CB;border-radius:4pt;padding:5pt 8pt;font-size:7.5pt;color:#0F6E56;line-height:1.55;margin:4pt 0}
.footer{text-align:center;font-size:6.5pt;color:#c8cdd6;margin-top:4pt;padding-top:4pt;border-top:.3pt solid #e2e6ec}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
</style></head><body>
<div class="header"><div class="logo"><div class="logo-dot">CPC</div><div><div class="clinic-n">Caribbean Psychology Wellness Center</div><div class="clinic-s">San Juan, Puerto Rico · caribbeanpsychology.com</div></div></div>
<div class="hdr-right"><div class="doc-t">Nota de Progreso Clínico</div><div class="doc-s">${form.enc_date||''} · ${form.session_type||''} · Sesión ${form.session_num||'—'}</div><div class="hipaa">Confidencial · HIPAA · Ley 408 PR</div></div></div>
<div class="pt-strip"><div><div class="pt-n">${form.patient_name||'—'}</div><div class="pt-m">${ptCtx?.gender?`<span>${ptCtx.gender}${ptCtx.pronouns?' · '+ptCtx.pronouns:''}</span>`:''}${has(form.record_num)?`<span>Exp: ${form.record_num}</span>`:''}${has(form.insurance)?`<span>${form.insurance}</span>`:''}${has(form.cpt_code)?`<span>${form.cpt_code.split('–')[0].trim()}</span>`:''}</div></div>${has(form.diagnosis)?`<div class="pt-dx">${form.diagnosis}</div>`:''}</div>
<div class="cols"><div>
<div class="sec">${sh(1,'Encuentro')}${f('Clínico',form.clinician)}${f('Hora',has(form.time_start)&&has(form.time_end)?form.time_start+' – '+form.time_end+(form.duration_min?' ('+form.duration_min+' min)':''):null)}</div>
<div class="sec">${sh(3,'Estado Mental')}${f('Apariencia',arr(form.apariencia))}${f('Actitud',arr(form.actitud))}${has(form.mood)?`<div class="field"><span class="fl">Ánimo</span><span class="fv"><em>"${form.mood}"</em></span></div>`:''}${f('Afecto',form.afecto)}${f('Pensamiento',arr(form.pensamiento))}${f('Orientación',arr(form.orientacion))}${has(form.mse_notes)?`<div class="narr">${form.mse_notes}</div>`:''}</div>
<div class="sec">${sh(4,'GAF')}<div class="gaf-row"><div class="gaf-num">${form.gaf_score}</div><div style="flex:1"><div class="gaf-lbl">${gL(form.gaf_score)}</div><div class="gaf-bar"></div><div class="gaf-sc"><span>1</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div></div></div>
<div class="sec">${sh(5,'Riesgo')}<div class="risk-row"><div class="risk-box" style="background:${rB[rs]};color:${rC[rs]}"><div class="risk-lbl">Suicida</div><div class="risk-val">${rs}</div></div><div class="risk-box" style="background:${rB[rh]};color:${rC[rh]}"><div class="risk-lbl">Homicida</div><div class="risk-val">${rh}</div></div></div>${has(form.safety_plan)?`<div class="narr">${form.safety_plan}</div>`:''}</div>
</div><div>
<div class="sec">${sh(6,'Intervenciones')}${has(form.session_topics)?`<div class="narr">${form.session_topics}</div>`:''}${arr(form.tecnicas)?`<div class="chips">${chips(arr(form.tecnicas))}</div>`:''}${has(form.resp_interv)?`<div class="narr">${form.resp_interv}</div>`:''}</div>
<div class="sec">${sh(7,'Progreso')}${has(form.progreso)?`<div class="chips"><span class="chip chip-b">${form.progreso}</span></div>`:''}${arr(form.cambios)?`<div class="chips">${arr(form.cambios).split(' · ').map(t=>`<span class="chip">${t}</span>`).join('')}</div>`:''}${has(form.homework)?`<div class="narr">${form.homework}</div>`:''}${f('Próxima cita',form.next_appt)}${f('Frecuencia',form.frequency)}</div>
${has(form.extra_notes)?`<div class="sec">${sh(8,'Notas')}<div class="narr">${form.extra_notes}</div></div>`:''}
</div></div>
<div class="sig-wrap"><div><div class="sig-line">${form.signed_by||form.clinician||'—'}</div><div class="sig-sub">Clínico · Nombre · Credencial · Licencia</div></div><div><div class="sig-line">${form.enc_date||'—'}</div><div class="sig-sub">Fecha de la nota</div></div></div>
<div class="cert"><strong>Certificación:</strong> El clínico certifica que la información es correcta y completa, en cumplimiento con HIPAA y la Ley Núm. 408 de Puerto Rico.</div>
<div class="footer">Caribbean Psychology Wellness Center · Nota de Progreso Clínico · Confidencial – HIPAA · ${new Date().toLocaleDateString('es-PR')}</div>
</body></html>`
}
