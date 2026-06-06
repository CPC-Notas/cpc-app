import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard({ nav, session }) {
  const [stats, setStats] = useState({ notes: 0, patients: 0, today: 0, week: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  const clinicianName = session?.user?.email?.split('@')[0] || 'Clínico'

  useEffect(() => {
    Promise.all([
      supabase.from('progress_notes').select('id, enc_date, patient_name, clinician, status', { count: 'exact' }).order('enc_date', { ascending: false }).limit(5),
      supabase.from('patients').select('id', { count: 'exact' }),
      supabase.from('progress_notes').select('id', { count: 'exact' }).eq('enc_date', new Date().toISOString().split('T')[0]),
    ]).then(([notes, patients, today]) => {
      setRecent(notes.data || [])
      setStats({
        notes: notes.count || 0,
        patients: patients.count || 0,
        today: today.count || 0,
      })
      setLoading(false)
    })
  }, [])

  const cards = [
    { label: 'Notas totales', value: stats.notes, icon: '📋', color: '#1a2c4e' },
    { label: 'Pacientes registrados', value: stats.patients, icon: '👤', color: '#1D9E75' },
    { label: 'Notas hoy', value: stats.today, icon: '📅', color: '#BA7517' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={t.h1}>Bienvenido, {clinicianName}</h1>
        <p style={t.sub}>Caribbean Psychology Wellness Center · {new Date().toLocaleDateString('es-PR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {cards.map(c => (
          <div key={c.label} style={{ ...t.card, borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: c.color }}>{loading ? '—' : c.value}</div>
            <div style={{ fontSize: 12, color: '#9aa3b2', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={t.card}>
          <div style={t.cardTitle}>Acciones rápidas</div>
          {[
            { label: '✚  Nueva nota de progreso', page: 'new-note', color: '#1D9E75' },
            { label: '👤  Gestionar pacientes', page: 'patients', color: '#1a2c4e' },
            { label: '📋  Ver todas las notas', page: 'notes', color: '#1a2c4e' },
          ].map(a => (
            <button key={a.page} onClick={() => nav(a.page)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 8, background: '#f7f8fa', border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', color: a.color, fontWeight: 500 }}>
              {a.label}
            </button>
          ))}
        </div>

        <div style={t.card}>
          <div style={t.cardTitle}>Notas recientes</div>
          {loading ? <div style={{ color: '#9aa3b2', fontSize: 13 }}>Cargando...</div>
            : recent.length === 0 ? <div style={{ color: '#9aa3b2', fontSize: 13 }}>No hay notas aún.</div>
            : recent.map(n => (
              <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5', cursor: 'pointer' }}
                onClick={() => nav('edit-note', { note: n })}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2c4e' }}>{n.patient_name || '—'}</div>
                <div style={{ fontSize: 11.5, color: '#9aa3b2', marginTop: 2 }}>
                  {n.enc_date} · {n.clinician} · <span style={{ color: n.status === 'signed' ? '#1D9E75' : '#BA7517' }}>{n.status === 'signed' ? '✓ Firmada' : 'Borrador'}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

const t = {
  h1: { margin: 0, fontSize: 22, fontWeight: 600, color: '#1a2c4e' },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#9aa3b2' },
  card: { background: '#fff', border: '1px solid #e2e6ec', borderRadius: 12, padding: '1.25rem' },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#1a2c4e', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 },
}
