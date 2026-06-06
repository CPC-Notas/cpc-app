import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const CLINICIANS_LIST = [
  'Dr. José Antonio García, PsyD — Lic. 7159',
  'Dra. Adrianna Ortiz Morales, PhD — Lic. 7403',
]
const SESSION_TYPES = ['Individual','Pareja','Familiar','Grupal','Evaluación','Consulta','Telehealth']
const MODALITIES = ['Presencial','Telehealth – Video','Telehealth – Teléfono']
const CPT_CODES = ['90791 – Evaluación psiquiátrica','90834 – Psicoterapia 45 min','90837 – Psicoterapia 60 min','90847 – Psicoterapia familiar','90853 – Psicoterapia grupal','96130 – Pruebas psicológicas']
const TECNICAS = ['TCC','ACT','DBT','EMDR','Psicodinámico','Mindfulness','Psicoeducación','Activación conductual','Narrativa','Terapia de juego','Gestalt','Sistémica','Entrevista motivacional']
const AFECTOS = ['Eutímico','Deprimido','Ansioso','Lábil','Plano','Elevado']
const INSURE = ['','MCS','Triple S','Privado / Pago directo','Psicología Para Todos','Otro']
const DIAGS = ['F32.1 – Ep. depresivo mayor, moderado','F32.9 – Ep. depresivo mayor, no especificado','F41.0 – T. de pánico','F41.1 – T. ansiedad generalizada','F43.10 – TEPT','F43.23 – T. adaptativo mixto','F90.0 – TDAH inatento','F90.2 – TDAH combinado','F60.3 – T. limítrofe personalidad','F31.9 – T. bipolar']
const FREQUENCIES = ['Semanal','Cada dos semanas','Mensual','Según necesidad','Alta – sin próxima cita']

function today() { return new Date().toISOString().split('T')[0] }

const emptyNote = {
  patient_name:'', clinician:'', session_type:'', modality:'', enc_date: today(),
  time_start:'', time_end:'', duration_min:'', session_num:'', insurance:'', cpt_code:'', diagnosis:'',
  apariencia:[], actitud:[], mood:'', afecto:'', pensamiento:[], orientacion:[], mse_notes:'',
  gaf_score: 65, risk_suicida:'Ninguno', risk_homicida:'Ninguno', safety_plan:'',
  session_topics:'', tecnicas:[], resp_interv:'', progreso:'', cambios:[], homework:'',
  next_appt:'', frequency:'', extra_notes:'', status:'draft', signed_by:'', signed_at:null,
}

const RISK_LEVELS = ['Ninguno','Bajo','Moderado','Alto','Inminente']
const riskColor = v => ({ Ninguno:'#E1F5EE', Bajo:'#EAF3DE', Moderado:'#FAEEDA', Alto:'#FCEBEB', Inminente:'#E24B4A' }[v] || '#f0f2f5')
const riskTextColor = v => ({ Ninguno:'#0F6E56', Bajo:'#3B6D11', Moderado:'#854F0B', Alto:'#A32D2D', Inminente:'#fff' }[v] || '#333')
const gafLabel = v => { if(v>=91)return'Excelente'; if(v>=81)return'Mínimos'; if(v>=71)return'Leves'; if(v>=61)return'Mod. leve'; if(v>=51)return'Moderados'; if(v>=41)return'Serio'; if(v>=31)return'Marcado'; return'Severo' }

export default function NoteForm({ nav, session, patient, note }) {
  const [form, setForm] = useState(() => {
    if (note?.id) return { ...emptyNote, ...note }
    const base = { ...emptyNote }
    if (patient) {
      base.patient_name = patient.name || ''
      base.insurance = patient.insurance || ''
      base.diagnosis = patient.diagnosis || ''
    }
    return base
  })
  const [patients, setPatients] = useState([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiMsgs, setAiMsgs] = useState([{ role: 'ai', text: '👋 Hola. Puedo ayudarte a redactar cualquier sección de la nota. Usa los botones rápidos o escríbeme.' }])
  const [aiLoading, setAiLoading] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cpc_api_key') || '')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const msgsRef = useRef(null)

  useEffect(() => {
    supabase.from('patients').select('id,name,insurance,diagnosis,gender,pronouns').order('name').then(({data}) => setPatients(data||[]))
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [aiMsgs])

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleArr = (k, v) => sf(k, form[k].includes(v) ? form[k].filter(x=>x!==v) : [...form[k], v])
  const showToast = (msg, type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  const handleTimeChange = () => {
    const s = form.time_start, e = form.time_end
    if (s) {
      if (!e) {
        const [sh,sm] = s.split(':').map(Number)
        const total = sh*60+sm+60
        sf('time_end', `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`)
      }
      if (form.time_end) {
        const [sh,sm] = s.split(':').map(Number)
        const [eh,em] = (form.time_end||'00:00').split(':').map(Number)
        const diff = (eh*60+em)-(sh*60+sm)
        if (diff > 0) sf('duration_min', diff)
      }
    }
  }

  const saveNote = async (status = 'draft') => {
    if (!form.patient_name) { showToast('Nombre del paciente requerido','err'); return }
    setSaving(true)
    const payload = {
      ...form,
      status,
      tecnicas: Array.isArray(form.tecnicas) ? form.tecnicas.join(', ') : form.tecnicas,
      apariencia: Array.isArray(form.apariencia) ? form.apariencia.join(', ') : form.apariencia,
      actitud: Array.isArray(form.actitud) ? form.actitud.join(', ') : form.actitud,
      pensamiento: Array.isArray(form.pensamiento) ? form.pensamiento.join(', ') : form.pensamiento,
      orientacion: Array.isArray(form.orientacion) ? form.orientacion.join(', ') : form.orientacion,
      cambios: Array.isArray(form.cambios) ? form.cambios.join(', ') : form.cambios,
      updated_at: new Date().toISOString(),
    }
    if (status === 'signed') {
      payload.signed_by = form.clinician
      payload.signed_at = new Date().toISOString()
    }
    let error
    if (form.id) {
      ({ error } = await supabase.from('progress_notes').update(payload).eq('id', form.id))
    } else {
      payload.created_by = session.user.id
      const { data, error: e } = await supabase.from('progress_notes').insert(payload).select().single()
      error = e
      if (data) sf('id', data.id)
    }
    setSaving(false)
    if (error) { showToast('Error: ' + error.message, 'err'); return }
    showToast(status === 'signed' ? '✓ Nota firmada y guardada.' : '💾 Guardado.')
  }

  const printNote = () => {
    const printWindow = window.open('', '_blank')
    const ptContext = patients.find(p=>p.name===form.patient_name)
    printWindow.document.write(generatePrintHTML(form, ptContext))
    printWindow.document.close()
    setTimeout(()=>printWindow.print(), 500)
  }

  // ── AI ASSIST
  const sendAI = async () => {
    const msg = aiInput.trim()
    if (!msg) return
    if (!apiKey) { setShowKeyInput(true); return }
    setAiInput('')
    setAiMsgs(m => [...m, { role: 'user', text: msg }])
    setAiLoading(true)
    const ptCtx = patients.find(p=>p.name===form.patient_name)
    const systemPrompt = buildSystemPrompt(form, ptCtx)
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:1000, system:systemPrompt, messages:[{role:'user',content:msg}] })
      })
      const data = await resp.json()
      if (!resp.ok) { setAiMsgs(m=>[...m,{role:'ai',text:'❌ '+( data?.error?.message||'Error API')}]); setAiLoading(false); return }
      const text = data.content?.[0]?.text||''
      setAiMsgs(m => [...m, { role: 'ai', text, fieldTag: extractFieldTag(text) }])
    } catch(e) {
      setAiMsgs(m => [...m, { role:'ai', text:'⚠️ Error de conexión.' }])
    }
    setAiLoading(false)
  }

  const applyAI = (text, fieldTag) => {
    const clean = text.replace(/\[CAMPO:[^\]]+\]/g,'').trim()
    if (fieldTag && document.getElementById(fieldTag)) {
      sf(fieldTag.replace(/-/g,'_'), clean)
      showToast('✓ Texto insertado en el campo.')
    }
  }

  const quickAsk = (prompt) => { setAiInput(prompt); setTimeout(()=>sendAI(),100) }

  const fieldMap = {
    'mse_notes': 'Narrativa del estado mental',
    'session_topics': 'Temas abordados en la sesión',
    'resp_interv': 'Respuesta del paciente',
    'homework': 'Tareas terapéuticas',
    'safety_plan': 'Plan de seguridad',
  }

  // ── RENDER
  return (
    <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
      {/* FORM */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.h1}>{form.id ? 'Editar nota' : 'Nueva nota de progreso'}</h1>
            <p style={s.sub}>Caribbean Psychology Wellness Center · {form.status === 'signed' ? '✓ Firmada' : 'Borrador'}</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button style={s.btn} onClick={() => setAiOpen(o=>!o)}>✦ IA {aiOpen?'▲':'▼'}</button>
            <button style={s.btn} onClick={printNote}>🖨 Imprimir</button>
            <button style={{ ...s.btn, ...s.btnSave }} onClick={()=>saveNote('draft')} disabled={saving}>💾 Guardar</button>
            <button style={{ ...s.btn, ...s.btnSign }} onClick={()=>saveNote('signed')} disabled={saving}>✍ Firmar</button>
          </div>
        </div>

        {/* SECTION 1 — Encounter */}
        <Section title="1. Datos del Encuentro">
          <div style={s.fg3}>
            <div>
              <label style={s.lbl}>Clínico</label>
              <select style={s.inp} value={form.clinician} onChange={e=>sf('clinician',e.target.value)}>
                <option value="">— Seleccionar —</option>
                {CLINICIANS_LIST.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Tipo de sesión</label>
              <select style={s.inp} value={form.session_type} onChange={e=>sf('session_type',e.target.value)}>
                <option value="">— Seleccionar —</option>
                {SESSION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Modalidad</label>
              <select style={s.inp} value={form.modality} onChange={e=>sf('modality',e.target.value)}>
                <option value="">— Seleccionar —</option>
                {MODALITIES.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Fecha *</label>
              <input type="date" style={s.inp} value={form.enc_date} onChange={e=>sf('enc_date',e.target.value)} />
            </div>
            <div>
              <label style={s.lbl}>Hora inicio</label>
              <input type="time" style={s.inp} value={form.time_start}
                onChange={e=>{sf('time_start',e.target.value); setTimeout(handleTimeChange,50)}} />
            </div>
            <div>
              <label style={s.lbl}>Hora fin <span style={{color:'#9aa3b2',fontSize:10}}>(auto)</span></label>
              <input type="time" style={s.inp} value={form.time_end} onChange={e=>sf('time_end',e.target.value)} />
            </div>
          </div>
        </Section>

        {/* SECTION 2 — Patient */}
        <Section title="2. Datos del Paciente">
          <div style={s.fg2}>
            <div style={{ gridColumn:'span 2' }}>
              <label style={s.lbl}>Nombre del paciente *</label>
              <input style={s.inp} value={form.patient_name} list="pt-list"
                onChange={e=>{
                  sf('patient_name',e.target.value)
                  const p=patients.find(x=>x.name===e.target.value)
                  if(p){if(p.insurance)sf('insurance',p.insurance);if(p.diagnosis)sf('diagnosis',p.diagnosis)}
                }} placeholder="Apellido, Nombre" />
              <datalist id="pt-list">{patients.map(p=><option key={p.id} value={p.name}/>)}</datalist>
            </div>
            <div>
              <label style={s.lbl}>Núm. expediente</label>
              <input style={s.inp} value={form.record_num||''} onChange={e=>sf('record_num',e.target.value)} placeholder="EXP-0000" />
            </div>
            <div>
              <label style={s.lbl}>Sesión #</label>
              <input type="number" style={s.inp} value={form.session_num||''} onChange={e=>sf('session_num',e.target.value)} min="1" />
            </div>
            <div>
              <label style={s.lbl}>Seguro / Plan</label>
              <select style={s.inp} value={form.insurance||''} onChange={e=>sf('insurance',e.target.value)}>
                {INSURE.map(i=><option key={i} value={i}>{i||'— Seleccionar —'}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Código CPT</label>
              <select style={s.inp} value={form.cpt_code||''} onChange={e=>sf('cpt_code',e.target.value)}>
                <option value="">— Seleccionar —</option>
                {CPT_CODES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label style={s.lbl}>Diagnóstico DSM-5</label>
              <input style={s.inp} value={form.diagnosis||''} onChange={e=>sf('diagnosis',e.target.value)}
                placeholder="Ej. F41.1 – T. ansiedad generalizada" list="diag-list" />
              <datalist id="diag-list">{DIAGS.map(d=><option key={d} value={d}/>)}</datalist>
            </div>
          </div>
        </Section>

        {/* SECTION 3 — MSE */}
        <Section title="3. Examen del Estado Mental (MSE)" aiAction={() => quickAsk('Redacta el texto para el campo "Observaciones del estado mental" con los datos del MSE marcados. Incluye [CAMPO:mse-notes]')}>
          <div style={s.fg2}>
            <CheckGroup label="Apariencia" opts={['Apropiada','Bien arreglada','Descuidada','Inapropiada']} value={form.apariencia} onChange={v=>sf('apariencia',v)} />
            <CheckGroup label="Actitud / Comportamiento" opts={['Cooperador','Ansioso','Resistente','Agitado','Retraído','Hostil']} value={form.actitud} onChange={v=>sf('actitud',v)} />
            <div>
              <label style={s.lbl}>Estado de ánimo (autoreportado)</label>
              <input id="mood" style={s.inp} value={form.mood||''} onChange={e=>sf('mood',e.target.value)} placeholder='"me siento ansioso y sin energía"' />
            </div>
            <div>
              <label style={s.lbl}>Afecto observado</label>
              <RadioGroup opts={AFECTOS} value={form.afecto} onChange={v=>sf('afecto',v)} />
            </div>
            <CheckGroup label="Pensamiento / Cognición" opts={['Lógico y coherente','Desorganizado','Ideas rumiativas','Pensamiento mágico','Alucinaciones','Delusiones']} value={form.pensamiento} onChange={v=>sf('pensamiento',v)} />
            <CheckGroup label="Orientación / Insight" opts={['Orientado ×3','Insight adecuado','Juicio intacto','Memoria intacta','Concentración ↓','Insight limitado']} value={form.orientacion} onChange={v=>sf('orientacion',v)} />
          </div>
          <TextArea id="mse-notes" label="Observaciones narrativas del estado mental" value={form.mse_notes||''} onChange={v=>sf('mse_notes',v)} />
        </Section>

        {/* SECTION 4 — GAF */}
        <Section title="4. Funcionalidad Global (GAF)">
          <div style={{ background:'#f7f8fa', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:36, fontWeight:700, color:'#1a2c4e', lineHeight:1 }}>{form.gaf_score}</div>
                <div style={{ fontSize:12, color:'#1D9E75', fontWeight:600, marginTop:2 }}>{gafLabel(form.gaf_score)}</div>
              </div>
              <div style={{ fontSize:11, color:'#9aa3b2', textAlign:'right', lineHeight:1.9 }}>91–100: Excelente<br/>71–90: Leve<br/>51–70: Moderado<br/>31–50: Serio<br/>1–30: Severo</div>
            </div>
            <input type="range" min="1" max="100" value={form.gaf_score} onChange={e=>sf('gaf_score',+e.target.value)}
              style={{ width:'100%', accentColor:'#1D9E75' }} />
          </div>
        </Section>

        {/* SECTION 5 — Risk */}
        <Section title="5. Evaluación de Riesgo">
          <div style={s.fg2}>
            <div>
              <label style={s.lbl}>Riesgo suicida</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                {RISK_LEVELS.map(r=>(
                  <button key={r} onClick={()=>sf('risk_suicida',r)}
                    style={{ padding:'6px 11px', borderRadius:6, border:`1.5px solid ${form.risk_suicida===r?riskColor(r):'#e2e6ec'}`, background:form.risk_suicida===r?riskColor(r):'#fff', color:form.risk_suicida===r?riskTextColor(r):'#666', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>{r}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={s.lbl}>Riesgo homicida</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                {RISK_LEVELS.map(r=>(
                  <button key={r} onClick={()=>sf('risk_homicida',r)}
                    style={{ padding:'6px 11px', borderRadius:6, border:`1.5px solid ${form.risk_homicida===r?riskColor(r):'#e2e6ec'}`, background:form.risk_homicida===r?riskColor(r):'#fff', color:form.risk_homicida===r?riskTextColor(r):'#666', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          <TextArea id="safety-plan" label="Plan de seguridad / Acciones tomadas" value={form.safety_plan||''} onChange={v=>sf('safety_plan',v)} aiAction={()=>quickAsk('Redacta un plan de seguridad clínico apropiado. Incluye [CAMPO:safety-plan]')} />
        </Section>

        {/* SECTION 6 — Session */}
        <Section title="6. Contenido e Intervenciones" aiAction={()=>quickAsk('Redacta los temas abordados en la sesión basado en el diagnóstico y técnicas. Incluye [CAMPO:session-topics]')}>
          <TextArea id="session-topics" label="Temas abordados / Motivo de consulta del día" value={form.session_topics||''} onChange={v=>sf('session_topics',v)} />
          <div style={{ marginTop:10 }}>
            <label style={s.lbl}>Técnicas utilizadas</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
              {TECNICAS.map(t=>(
                <button key={t} onClick={()=>toggleArr('tecnicas',t)}
                  style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${form.tecnicas.includes(t)?'#1D9E75':'#e2e6ec'}`, background:form.tecnicas.includes(t)?'#E1F5EE':'#fff', color:form.tecnicas.includes(t)?'#0F6E56':'#666', fontSize:12.5, cursor:'pointer', fontFamily:'inherit' }}>{t}</button>
              ))}
            </div>
          </div>
          <TextArea id="resp-interv" label="Respuesta del paciente a las intervenciones" value={form.resp_interv||''} onChange={v=>sf('resp_interv',v)} aiAction={()=>quickAsk('Redacta la respuesta del paciente a las intervenciones. Incluye [CAMPO:resp-interv]')} style={{ marginTop:10 }} />
        </Section>

        {/* SECTION 7 — Progress */}
        <Section title="7. Progreso y Plan" aiAction={()=>quickAsk('Propón 3 tareas terapéuticas concretas. Incluye [CAMPO:homework]')}>
          <div style={s.fg2}>
            <div>
              <label style={s.lbl}>Progreso hacia objetivos</label>
              <RadioGroup opts={['Notable mejoría','Mejoría moderada','Sin cambios','Deterioro leve','Deterioro significativo','No aplica (1ra sesión)']} value={form.progreso} onChange={v=>sf('progreso',v)} />
            </div>
            <CheckGroup label="Cambios al plan" opts={['Sin cambios','Ajuste de frecuencia','Nuevo objetivo','Referido psiquiatría','Referido otro especialista','Alta clínica']} value={form.cambios} onChange={v=>sf('cambios',v)} />
          </div>
          <TextArea id="homework" label="Tareas / Asignaciones para el paciente" value={form.homework||''} onChange={v=>sf('homework',v)} />
          <div style={{ ...s.fg2, marginTop:10 }}>
            <div>
              <label style={s.lbl}>Próxima cita</label>
              <input type="date" style={s.inp} value={form.next_appt||''} onChange={e=>sf('next_appt',e.target.value)} />
            </div>
            <div>
              <label style={s.lbl}>Frecuencia</label>
              <select style={s.inp} value={form.frequency||''} onChange={e=>sf('frequency',e.target.value)}>
                <option value="">— Seleccionar —</option>
                {FREQUENCIES.map(f=><option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* SECTION 8 */}
        <Section title="8. Notas Adicionales">
          <TextArea id="extra-notes" label="Coordinaciones, comunicaciones, aspectos legales..." value={form.extra_notes||''} onChange={v=>sf('extra_notes',v)} />
        </Section>

        {/* SIGNATURE */}
        <div style={{ background:'#fff', border:'1px solid #e2e6ec', borderRadius:12, padding:'1.25rem', marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <div style={s.lbl}>Clínico responsable</div>
              <div style={{ borderBottom:'1.5px solid #1a2c4e', padding:'4px 0', minHeight:32, fontSize:13, color:'#1a2c4e', fontWeight:500 }}>{form.signed_by || form.clinician || '—'}</div>
              <div style={{ fontSize:10, color:'#9aa3b2', marginTop:3 }}>NOMBRE · CREDENCIAL · LICENCIA</div>
            </div>
            <div>
              <div style={s.lbl}>Fecha y hora de firma</div>
              <div style={{ borderBottom:'1.5px solid #1a2c4e', padding:'4px 0', minHeight:32, fontSize:13, color:'#1a2c4e' }}>
                {form.signed_at ? new Date(form.signed_at).toLocaleString('es-PR') : '—'}
              </div>
              <div style={{ fontSize:10, color:'#9aa3b2', marginTop:3 }}>FECHA · HORA (PUERTO RICO)</div>
            </div>
          </div>
          <div style={{ background:'#E1F5EE', border:'1px solid #9FE1CB', borderRadius:6, padding:'8px 12px', fontSize:11.5, color:'#0F6E56', marginTop:12 }}>
            Certificación: El clínico firmante certifica que la información es correcta y completa, en cumplimiento con HIPAA y la Ley Núm. 408 de Puerto Rico.
          </div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginBottom:32 }}>
          <button style={s.btn} onClick={() => nav('notes')}>← Volver</button>
          <button style={{ ...s.btn, ...s.btnSave }} onClick={()=>saveNote('draft')} disabled={saving}>💾 Guardar borrador</button>
          <button style={{ ...s.btn, ...s.btnSign }} onClick={()=>saveNote('signed')} disabled={saving}>✍ Firmar y guardar</button>
        </div>
      </div>

      {/* AI PANEL */}
      {aiOpen && (
        <div style={s.aiPanel}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #e2e6ec', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#1a2c4e', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:7, height:7, background:'#1D9E75', borderRadius:'50%', display:'inline-block' }} />
              Asistente Claude IA
            </div>
            <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9aa3b2' }} onClick={()=>setAiOpen(false)}>✕</button>
          </div>
          <div style={{ padding:'6px 12px', background:'#f7f8fa', borderBottom:'1px solid #e2e6ec', fontSize:11, color:'#9aa3b2' }}>
            {form.patient_name || 'Sin paciente'} · GAF: {form.gaf_score}
          </div>
          <div ref={msgsRef} style={{ flex:1, overflowY:'auto', padding:'12px 12px 8px', display:'flex', flexDirection:'column', gap:10 }}>
            {aiMsgs.map((m,i)=>(
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:m.role==='user'?'flex-end':'flex-start' }}>
                <div style={{ padding:'8px 11px', borderRadius:9, fontSize:12.5, lineHeight:1.6, maxWidth:'94%', background:m.role==='user'?'#1a2c4e':'#f0f2f5', color:m.role==='user'?'#fff':'#1a2c4e', whiteSpace:'pre-wrap' }}>
                  {m.text.replace(/\[CAMPO:[^\]]+\]/g,'').trim()}
                </div>
                {m.fieldTag && (
                  <button onClick={()=>applyAI(m.text, m.fieldTag)}
                    style={{ marginTop:4, background:'#E1F5EE', border:'1px solid #9FE1CB', color:'#0F6E56', borderRadius:5, padding:'3px 10px', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    ✅ Insertar en campo
                  </button>
                )}
              </div>
            ))}
            {aiLoading && <div style={{ fontSize:12, color:'#9aa3b2', textAlign:'center' }}>⏳ Pensando...</div>}
          </div>
          <div style={{ padding:'6px 10px', borderTop:'1px solid #e2e6ec', display:'flex', flexWrap:'wrap', gap:4 }}>
            {Object.entries(fieldMap).map(([k,label])=>(
              <button key={k} onClick={()=>quickAsk('Redacta el texto para "'+label+'". Incluye [CAMPO:'+k.replace(/_/g,'-')+']')}
                style={{ background:'#f7f8fa', border:'1px solid #e2e6ec', borderRadius:12, padding:'4px 9px', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#5a6478' }}>{label}</button>
            ))}
            <button onClick={()=>quickAsk('Revisa todos los campos de texto de esta nota y sugiere mejoras clínicas.')}
              style={{ background:'#E1F5EE', border:'1px solid #9FE1CB', borderRadius:12, padding:'4px 9px', fontSize:11, cursor:'pointer', fontFamily:'inherit', color:'#0F6E56' }}>🔍 Revisar nota</button>
          </div>
          {showKeyInput && (
            <div style={{ padding:'10px 12px', background:'#FAEEDA', borderTop:'1px solid #FAC775' }}>
              <div style={{ fontSize:11.5, color:'#854F0B', marginBottom:6 }}>🔑 Ingresa tu API Key de Anthropic:</div>
              <div style={{ display:'flex', gap:6 }}>
                <input style={{ flex:1, fontSize:12, padding:'6px 8px', border:'1px solid #e2e6ec', borderRadius:6 }}
                  placeholder="sk-ant-..." defaultValue={apiKey}
                  onChange={e=>setApiKey(e.target.value)} />
                <button onClick={()=>{localStorage.setItem('cpc_api_key',apiKey);setShowKeyInput(false)}}
                  style={{ background:'#1D9E75', color:'#fff', border:'none', borderRadius:6, padding:'6px 10px', fontSize:12, cursor:'pointer' }}>Guardar</button>
              </div>
            </div>
          )}
          <div style={{ padding:'8px 10px', borderTop:'1px solid #e2e6ec', display:'flex', gap:6, alignItems:'flex-end' }}>
            <textarea value={aiInput} onChange={e=>setAiInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI()} }}
              placeholder="Escribe aquí..." rows={2}
              style={{ flex:1, fontSize:12.5, padding:'7px 9px', border:'1.5px solid #1D9E75', borderRadius:7, resize:'none', fontFamily:'inherit', outline:'none' }} />
            <button onClick={sendAI} disabled={aiLoading}
              style={{ background:'#1D9E75', color:'#fff', border:'none', borderRadius:7, padding:'10px 13px', cursor:'pointer', fontSize:15 }}>➤</button>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed', bottom:20, right:20, background:toast.type==='err'?'#E24B4A':'#1D9E75', color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500, zIndex:999 }}>{toast.msg}</div>}
    </div>
  )
}

// ── HELPER COMPONENTS
function Section({ title, children, aiAction }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e6ec', borderRadius:12, marginBottom:12, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', background:'#f7f8fa', borderBottom:'1px solid #e2e6ec' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a2c4e', textTransform:'uppercase', letterSpacing:'.06em' }}>{title}</div>
        {aiAction && <button onClick={aiAction} style={{ background:'#E1F5EE', border:'1px solid #9FE1CB', borderRadius:5, padding:'3px 9px', fontSize:11, color:'#0F6E56', cursor:'pointer', fontWeight:600 }}>✦ IA</button>}
      </div>
      <div style={{ padding:'14px 16px' }}>{children}</div>
    </div>
  )
}

function TextArea({ id, label, value, onChange, aiAction, style: extraStyle }) {
  return (
    <div style={extraStyle}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <label style={{ fontSize:11, fontWeight:600, color:'#9aa3b2', textTransform:'uppercase', letterSpacing:'.07em' }}>{label}</label>
        {aiAction && <button onClick={aiAction} style={{ background:'#E1F5EE', border:'1px solid #9FE1CB', borderRadius:4, padding:'2px 8px', fontSize:10, color:'#0F6E56', cursor:'pointer' }}>✦ IA</button>}
      </div>
      <textarea id={id} value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:'100%', minHeight:68, padding:'8px 10px', border:'1px solid #e2e6ec', borderRadius:8, fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none', lineHeight:1.6, boxSizing:'border-box' }} />
    </div>
  )
}

function CheckGroup({ label, opts, value, onChange }) {
  const toggle = v => onChange(value.includes(v) ? value.filter(x=>x!==v) : [...value, v])
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:'#9aa3b2', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>{label}</label>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {opts.map(o=>(
          <button key={o} onClick={()=>toggle(o)}
            style={{ padding:'4px 9px', borderRadius:5, border:`1px solid ${value.includes(o)?'#1D9E75':'#e2e6ec'}`, background:value.includes(o)?'#E1F5EE':'#fff', color:value.includes(o)?'#0F6E56':'#666', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>{o}</button>
        ))}
      </div>
    </div>
  )
}

function RadioGroup({ opts, value, onChange }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:4 }}>
      {opts.map(o=>(
        <button key={o} onClick={()=>onChange(o)}
          style={{ padding:'4px 9px', borderRadius:5, border:`1px solid ${value===o?'#1D9E75':'#e2e6ec'}`, background:value===o?'#E1F5EE':'#fff', color:value===o?'#0F6E56':'#666', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>{o}</button>
      ))}
    </div>
  )
}

function extractFieldTag(text) {
  const m = text.match(/\[CAMPO:([a-z0-9\-]+)\]/)
  return m ? m[1] : null
}

function buildSystemPrompt(form, ptCtx) {
  const pronRef = ptCtx?.pronouns === 'ella/le' || ptCtx?.gender === 'Femenino' ? 'la paciente'
    : ptCtx?.pronouns === 'él/le' || ptCtx?.gender === 'Masculino' ? 'el paciente'
    : ptCtx?.pronouns === 'elle/le' ? 'le paciente' : 'el/la paciente'
  return `Eres un asistente clínico de Caribbean Psychology Wellness Center, San Juan, Puerto Rico. Ayudas a redactar notas de progreso clínico en español formal, conforme a APA, HIPAA y Ley 408 PR. Sé conciso. Usa "${pronRef}" al referirte al paciente. Cuando generes texto para un campo, incluye al final [CAMPO:id-del-campo].

Contexto: Paciente: ${form.patient_name||'N/E'} | Género: ${ptCtx?.gender||'N/E'} | Dx: ${form.diagnosis||'N/E'} | GAF: ${form.gaf_score} | Riesgo suicida: ${form.risk_suicida} | Afecto: ${form.afecto||'N/E'} | Técnicas: ${Array.isArray(form.tecnicas)?form.tecnicas.join(', '):form.tecnicas||'N/E'}`
}

function generatePrintHTML(form, ptCtx) {
  const arr = v => Array.isArray(v) ? v.join(', ') : v||''
  const row = (l,v) => v ? `<tr><td style="width:36%;padding:4pt 8pt;border:.5pt solid #ccc;font-weight:bold;color:#1a2c4e;font-size:10pt">${l}</td><td style="padding:4pt 8pt;border:.5pt solid #ccc;font-size:10pt">${v}</td></tr>` : ''
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    @page{size:letter portrait;margin:25mm 15mm 12mm}
    body{font-family:Calibri,sans-serif;font-size:11pt}
    h2{font-size:10pt;color:#1D9E75;border-bottom:1pt solid #1D9E75;padding-bottom:2pt;margin:12pt 0 5pt;text-transform:uppercase;letter-spacing:.06em}
    table{width:100%;border-collapse:collapse;margin-bottom:6pt}
    .logo{text-align:center;padding:8pt;margin-bottom:10pt;border-bottom:1.5pt solid #1a2c4e}
    .cert{background:#e1f5ee;border:.5pt solid #9FE1CB;padding:6pt;font-size:9pt;color:#0F6E56;margin-top:10pt}
  </style></head><body>
  <div class="logo">
    <div style="font-size:16pt;font-weight:bold;color:#1a2c4e">Caribbean Psychology Wellness Center</div>
    <div style="font-size:9pt;color:#666">San Juan, Puerto Rico · caribbeanpsychology.com</div>
    <div style="font-size:12pt;font-weight:bold;color:#1D9E75;margin-top:4pt">NOTA DE PROGRESO CLÍNICO</div>
    <div style="font-size:9pt;color:#666">Confidencial – HIPAA – Ley 408 PR</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10pt">
  <div>
  <h2>1. Encuentro</h2><table>${row('Clínico',form.clinician)}${row('Tipo',form.session_type)}${row('Modalidad',form.modality)}${row('Fecha',form.enc_date)}${row('Hora',form.time_start+' – '+form.time_end+(form.duration_min?' ('+form.duration_min+' min)':''))}</table>
  <h2>2. Paciente</h2><table>${row('Nombre',form.patient_name)}${row('Género',ptCtx?.gender||'')}${row('Pronombres',ptCtx?.pronouns||'')}${row('Expediente',form.record_num)}${row('Sesión #',form.session_num)}${row('Seguro',form.insurance)}${row('CPT',form.cpt_code)}${row('Diagnóstico',form.diagnosis)}</table>
  <h2>4. GAF</h2><table>${row('Puntuación GAF',form.gaf_score+' – '+gafLabel(form.gaf_score))}</table>
  <h2>5. Riesgo</h2><table>${row('Riesgo suicida',form.risk_suicida)}${row('Riesgo homicida',form.risk_homicida)}${row('Plan de seguridad',form.safety_plan)}</table>
  </div>
  <div>
  <h2>3. Estado Mental</h2><table>${row('Apariencia',arr(form.apariencia))}${row('Actitud',arr(form.actitud))}${row('Ánimo',form.mood)}${row('Afecto',form.afecto)}${row('Pensamiento',arr(form.pensamiento))}${row('Orientación',arr(form.orientacion))}${row('Observaciones',form.mse_notes)}</table>
  <h2>6. Intervenciones</h2><table>${row('Temas',form.session_topics)}${row('Técnicas',arr(form.tecnicas))}${row('Respuesta',form.resp_interv)}</table>
  <h2>7. Progreso</h2><table>${row('Progreso',form.progreso)}${row('Cambios',arr(form.cambios))}${row('Tareas',form.homework)}${row('Próxima cita',form.next_appt)}${row('Frecuencia',form.frequency)}</table>
  ${form.extra_notes?'<h2>8. Notas adicionales</h2><table>'+row('Notas',form.extra_notes)+'</table>':''}
  </div></div>
  <h2>9. Firma</h2>
  <table><tr><td style="width:50%;padding:4pt 8pt;border:.5pt solid #ccc;font-size:10pt"><strong>Clínico:</strong> ${form.signed_by||form.clinician||'—'}</td>
  <td style="padding:4pt 8pt;border:.5pt solid #ccc;font-size:10pt"><strong>Firmado:</strong> ${form.signed_at?new Date(form.signed_at).toLocaleString('es-PR'):'—'}</td></tr></table>
  <div class="cert">Certificación: El clínico firmante certifica que la información es correcta y fue documentada contemporáneamente al servicio, en cumplimiento con HIPAA y la Ley Núm. 408 de Puerto Rico.</div>
  </body></html>`
}

const s = {
  pageHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.25rem', gap:12, flexWrap:'wrap' },
  h1: { margin:0, fontSize:22, fontWeight:600, color:'#1a2c4e' },
  sub: { margin:'4px 0 0', fontSize:13, color:'#9aa3b2' },
  fg2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 14px', marginBottom:4 },
  fg3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 14px', marginBottom:4 },
  lbl: { fontSize:11, fontWeight:600, color:'#9aa3b2', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:4 },
  inp: { width:'100%', padding:'8px 10px', border:'1px solid #e2e6ec', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
  btn: { padding:'8px 14px', borderRadius:8, border:'1px solid #e2e6ec', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', background:'#fff' },
  btnSave: { background:'#1a2c4e', color:'#fff', border:'none' },
  btnSign: { background:'#1D9E75', color:'#fff', border:'none' },
  aiPanel: { width:320, flexShrink:0, background:'#fff', border:'1px solid #e2e6ec', borderRadius:12, display:'flex', flexDirection:'column', position:'sticky', top:20, height:'calc(100vh - 40px)', overflow:'hidden' },
}
