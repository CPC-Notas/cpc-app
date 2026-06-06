import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function NotesList({ nav, session }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClinician, setFilterClinician] = useState('')

  useEffect(() => { fetchNotes() }, [])

  const fetchNotes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('progress_notes')
      .select('id, patient_name, clinician, enc_date, session_type, diagnosis, status, signed_at')
      .order('enc_date', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  const deleteNote = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('¿Eliminar esta nota?')) return
    await supabase.from('progress_notes').delete().eq('id', id)
    await fetchNotes()
  }

  const clinicians = [...new Set(notes.map(n => n.clinician).filter(Boolean))]

  const filtered = notes.filter(n => {
    const q = search.toLowerCase()
    const matchSearch = !q || (n.patient_name || '').toLowerCase().includes(q) || (n.diagnosis || '').toLowerCase().includes(q)
    const matchClinician = !filterClinician || n.clinician === filterClinician
    return matchSearch && matchClinician
  })

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Notas de Progreso</h1>
          <p style={s.sub}>{notes.length} nota{notes.length !== 1 ? 's' : ''} guardadas</p>
        </div>
        <button style={s.btnPrimary} onClick={() => nav('new-note')}>+ Nueva nota</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input style={{ ...s.inp, paddingLeft: 34 }} placeholder="Buscar por paciente o diagnóstico..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9aa3b2' }}>🔍</span>
        </div>
        <select style={{ ...s.inp, width: 200 }} value={filterClinician} onChange={e => setFilterClinician(e.target.value)}>
          <option value="">Todos los clínicos</option>
          {clinicians.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <div style={s.empty}>Cargando notas...</div>
        : filtered.length === 0 ? <div style={s.empty}>No hay notas que coincidan.</div>
        : (
          <div style={s.tableCard}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f8fa' }}>
                  {['Paciente','Fecha','Clínico','Diagnóstico','Estado',''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id} style={{ cursor: 'pointer' }} onClick={() => nav('edit-note', { note: n })}
                    onMouseEnter={e => e.currentTarget.style.background = '#f7f8fa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={s.td}><strong>{n.patient_name || '—'}</strong></td>
                    <td style={s.td}>{n.enc_date || '—'}</td>
                    <td style={{ ...s.td, fontSize: 12, color: '#9aa3b2' }}>{(n.clinician || '—').split('—')[0].trim()}</td>
                    <td style={{ ...s.td, fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.diagnosis || '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...(n.status === 'signed' ? s.badgeSigned : s.badgeDraft) }}>
                        {n.status === 'signed' ? '✓ Firmada' : 'Borrador'}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <button style={s.deleteBtn} onClick={e => deleteNote(n.id, e)} title="Eliminar">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}

const s = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: 12 },
  h1: { margin: 0, fontSize: 22, fontWeight: 600, color: '#1a2c4e' },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#9aa3b2' },
  btnPrimary: { padding: '9px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  inp: { width: '100%', padding: '9px 10px', border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  tableCard: { background: '#fff', border: '1px solid #e2e6ec', borderRadius: 12, overflow: 'hidden' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9aa3b2', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e2e6ec' },
  td: { padding: '12px 14px', fontSize: 13.5, color: '#1a2c4e', borderBottom: '1px solid #f0f2f5' },
  badge: { display: 'inline-block', padding: '3px 8px', borderRadius: 5, fontSize: 11.5, fontWeight: 500 },
  badgeSigned: { background: '#E1F5EE', color: '#0F6E56' },
  badgeDraft: { background: '#FAEEDA', color: '#854F0B' },
  deleteBtn: { background: 'transparent', border: 'none', color: '#9aa3b2', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 4 },
  empty: { textAlign: 'center', padding: '3rem', color: '#9aa3b2', fontSize: 14, background: '#fff', borderRadius: 12, border: '1px solid #e2e6ec' },
}
