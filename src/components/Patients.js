import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const GENDERS = ['','Masculino','Femenino','No binario','Transgénero (FTM)','Transgénero (MTF)','Género fluido','Prefiere no indicar']
const PRONOUNS = ['','él/le','ella/le','elle/le','they/them','Prefiere no indicar']
const INSURE = ['','MCS','Triple S','Privado / Pago directo','Psicología Para Todos','Otro']
const CLINICIANS = ['','Dr. José Antonio García, PsyD — Lic. 7159','Dra. Adrianna Ortiz Morales, PhD — Lic. 7403','Otro']
const DIAGS = ['F32.1 – Ep. depresivo mayor, moderado','F32.9 – Ep. depresivo mayor, no especificado','F33.1 – T. depresivo mayor recurrente','F41.0 – T. de pánico','F41.1 – T. ansiedad generalizada','F41.9 – T. ansiedad no especificado','F43.10 – TEPT','F43.23 – T. adaptativo mixto','F90.0 – TDAH inatento','F90.2 – TDAH combinado','F31.9 – T. bipolar','F60.3 – T. limítrofe personalidad']

const empty = { name:'', gender:'', pronouns:'', dob:'', record_num:'', insurance:'', clinician:'', diagnosis:'', phone:'', email:'', notes:'' }

function age(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000*60*60*24*365.25))
}

export default function Patients({ nav, session }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list') // list | form | detail
  const [form, setForm] = useState({ ...empty })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchPatients() }, [])

  const fetchPatients = async () => {
    setLoading(true)
    const { data } = await supabase.from('patients').select('*').order('name')
    setPatients(data || [])
    setLoading(false)
  }

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const openNew = () => { setForm({ ...empty }); setView('form') }
  const openEdit = p => { setForm({ ...p }); setView('form') }

  const savePatient = async () => {
    if (!form.name.trim()) { showToast('El nombre es requerido', 'err'); return }
    setSaving(true)
    const payload = { ...form, updated_at: new Date().toISOString() }
    let error
    if (form.id) {
      ({ error } = await supabase.from('patients').update(payload).eq('id', form.id))
    } else {
      delete payload.id
      payload.created_by = session.user.id;
      ({ error } = await supabase.from('patients').insert(payload))
    }
    setSaving(false)
    if (error) { showToast('Error: ' + error.message, 'err'); return }
    showToast(form.id ? 'Paciente actualizado.' : 'Paciente guardado.')
    await fetchPatients()
    setView('list')
  }

  const deletePatient = async id => {
    if (!window.confirm('¿Eliminar este paciente? Esta acción no se puede deshacer.')) return
    await supabase.from('patients').delete().eq('id', id)
    showToast('Paciente eliminado.')
    await fetchPatients()
    setView('list')
  }

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.record_num || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.diagnosis || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── FORM VIEW
  if (view === 'form') {
    const isEdit = !!form.id
    const dobParts = (form.dob || '').split('-')
    const [dobY, dobM, dobD] = dobParts.length === 3 ? dobParts : ['', '', '']

    return (
      <div>
        <div style={s.pageHeader}>
          <button style={s.backBtn} onClick={() => setView('list')}>← Volver</button>
          <h1 style={s.h1}>{isEdit ? 'Editar paciente' : 'Nuevo paciente'}</h1>
        </div>
        <div style={s.formCard}>
          <div style={s.fg2}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={s.lbl}>Nombre completo *</label>
              <input style={s.inp} value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Apellido, Nombre" />
            </div>
            <div>
              <label style={s.lbl}>Género</label>
              <select style={s.inp} value={form.gender || ''} onChange={e => sf('gender', e.target.value)}>
                {GENDERS.map(g => <option key={g} value={g}>{g || '— Seleccionar —'}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Pronombres</label>
              <select style={s.inp} value={form.pronouns || ''} onChange={e => sf('pronouns', e.target.value)}>
                {PRONOUNS.map(p => <option key={p} value={p}>{p || '— Seleccionar —'}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Fecha de nacimiento</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select style={{ ...s.inp, flex: 1 }} value={dobD}
                  onChange={e => sf('dob', `${dobY || '2000'}-${dobM || '01'}-${e.target.value}`)}>
                  <option value="">Día</option>
                  {Array.from({length:31},(_,i)=>{const v=String(i+1).padStart(2,'0'); return <option key={v} value={v}>{i+1}</option>})}
                </select>
                <select style={{ ...s.inp, flex: 1.3 }} value={dobM}
                  onChange={e => sf('dob', `${dobY || '2000'}-${e.target.value}-${dobD || '01'}`)}>
                  <option value="">Mes</option>
                  {MONTHS.map((m,i)=>{const v=String(i+1).padStart(2,'0'); return <option key={v} value={v}>{m}</option>})}
                </select>
                <select style={{ ...s.inp, flex: 1.6 }} value={dobY}
                  onChange={e => sf('dob', `${e.target.value}-${dobM || '01'}-${dobD || '01'}`)}>
                  <option value="">Año</option>
                  {Array.from({length:105},(_,i)=>new Date().getFullYear()-i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={s.lbl}>Núm. expediente</label>
              <input style={s.inp} value={form.record_num || ''} onChange={e => sf('record_num', e.target.value)} placeholder="EXP-0000" />
            </div>
            <div>
              <label style={s.lbl}>Seguro / Plan</label>
              <select style={s.inp} value={form.insurance || ''} onChange={e => sf('insurance', e.target.value)}>
                {INSURE.map(i => <option key={i} value={i}>{i || '— Seleccionar —'}</option>)}
              </select>
            </div>
            <div>
              <label style={s.lbl}>Clínico asignado</label>
              <select style={s.inp} value={form.clinician || ''} onChange={e => sf('clinician', e.target.value)}>
                {CLINICIANS.map(c => <option key={c} value={c}>{c || '— Seleccionar —'}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={s.lbl}>Diagnóstico DSM-5 principal</label>
              <input style={s.inp} value={form.diagnosis || ''} onChange={e => sf('diagnosis', e.target.value)}
                placeholder="Ej. F41.1 – T. ansiedad generalizada" list="diag-list" />
              <datalist id="diag-list">{DIAGS.map(d => <option key={d} value={d} />)}</datalist>
            </div>
            <div>
              <label style={s.lbl}>Teléfono</label>
              <input style={s.inp} value={form.phone || ''} onChange={e => sf('phone', e.target.value)} placeholder="(787) 000-0000" />
            </div>
            <div>
              <label style={s.lbl}>Email</label>
              <input style={s.inp} value={form.email || ''} onChange={e => sf('email', e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={s.lbl}>Notas adicionales</label>
              <textarea style={{ ...s.inp, minHeight: 70, resize: 'vertical' }} value={form.notes || ''}
                onChange={e => sf('notes', e.target.value)} placeholder="Alergias, consideraciones especiales, emergencias..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #e2e6ec', paddingTop: 14, marginTop: 4 }}>
            {isEdit && <button style={{ ...s.btn, background: '#FCEBEB', color: '#A32D2D', borderColor: '#f0b0b0' }} onClick={() => deletePatient(form.id)}>Eliminar</button>}
            <button style={s.btn} onClick={() => setView('list')}>Cancelar</button>
            <button style={{ ...s.btn, background: '#1D9E75', color: '#fff', border: 'none' }} onClick={savePatient} disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar paciente'}
            </button>
          </div>
        </div>
        {toast && <div style={{ ...s.toast, background: toast.type === 'err' ? '#E24B4A' : '#1D9E75' }}>{toast.msg}</div>}
      </div>
    )
  }

  // ── LIST VIEW
  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.h1}>Pacientes</h1>
          <p style={s.sub}>{patients.length} paciente{patients.length !== 1 ? 's' : ''} registrados</p>
        </div>
        <button style={{ ...s.btn, background: '#1D9E75', color: '#fff', border: 'none' }} onClick={openNew}>+ Nuevo paciente</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input style={{ ...s.inp, paddingLeft: 36 }} placeholder="Buscar por nombre, expediente, diagnóstico..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9aa3b2' }}>🔍</span>
      </div>

      {loading ? <div style={s.empty}>Cargando pacientes...</div>
        : filtered.length === 0 ? <div style={s.empty}>{search ? 'Sin resultados.' : 'No hay pacientes. Crea el primero.'}</div>
        : (
          <div style={s.listCard}>
            {filtered.map(p => {
              const a = age(p.dob)
              const ini = p.name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase() || '').join('')
              return (
                <div key={p.id} style={s.ptRow} onClick={() => openEdit(p)}>
                  <div style={s.avatar}>{ini}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#1a2c4e', marginBottom: 3 }}>
                      {p.name}
                      {p.gender && <span style={s.genderBadge}>{p.gender}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#9aa3b2', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {p.record_num && <span>📁 {p.record_num}</span>}
                      {a !== null && <span>🎂 {a} años</span>}
                      {p.insurance && <span>🏥 {p.insurance}</span>}
                      {p.diagnosis && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>🩺 {p.diagnosis}</span>}
                    </div>
                  </div>
                  <button style={s.editBtn} onClick={e => { e.stopPropagation(); openEdit(p) }}>✏ Editar</button>
                </div>
              )
            })}
          </div>
        )
      }
      {toast && <div style={{ ...s.toast, background: toast.type === 'err' ? '#E24B4A' : '#1D9E75' }}>{toast.msg}</div>}
    </div>
  )
}

const s = {
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: 12 },
  h1: { margin: 0, fontSize: 22, fontWeight: 600, color: '#1a2c4e' },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#9aa3b2' },
  backBtn: { background: 'transparent', border: '1px solid #e2e6ec', borderRadius: 7, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginRight: 12 },
  formCard: { background: '#fff', border: '1px solid #e2e6ec', borderRadius: 12, padding: '1.5rem' },
  fg2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 4 },
  lbl: { fontSize: 11, fontWeight: 600, color: '#9aa3b2', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 },
  inp: { width: '100%', padding: '8px 10px', border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btn: { padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e6ec', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  listCard: { background: '#fff', border: '1px solid #e2e6ec', borderRadius: 12, overflow: 'hidden' },
  ptRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 1.25rem', borderBottom: '1px solid #f0f2f5', cursor: 'pointer' },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#185FA5', flexShrink: 0 },
  genderBadge: { marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#EEEDFE', color: '#3C3489' },
  editBtn: { background: 'transparent', border: '1px solid #e2e6ec', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  empty: { textAlign: 'center', padding: '3rem', color: '#9aa3b2', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #e2e6ec' },
  toast: { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 999 },
}
