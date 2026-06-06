import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Patients from './components/Patients'
import NoteForm from './components/NoteForm'
import NotesList from './components/NotesList'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')   // dashboard | patients | new-note | notes | edit-note
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [editNote, setEditNote] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={styles.loader}>
      <div style={styles.loaderInner}>
        <div style={styles.loaderDot} />
        <span style={{ color: '#9aa3b2', fontSize: 14 }}>Cargando...</span>
      </div>
    </div>
  )

  if (!session) return <Login />

  const nav = (p, extra = {}) => {
    setPage(p)
    if (extra.patient) setSelectedPatient(extra.patient)
    if (extra.note) setEditNote(extra.note)
    if (p === 'new-note' && !extra.patient) setSelectedPatient(null)
  }

  return (
    <div style={styles.root}>
      <Sidebar page={page} nav={nav} session={session} />
      <main style={styles.main}>
        {page === 'dashboard' && <Dashboard nav={nav} session={session} />}
        {page === 'patients' && <Patients nav={nav} session={session} />}
        {page === 'notes' && <NotesList nav={nav} session={session} />}
        {(page === 'new-note' || page === 'edit-note') && (
          <NoteForm
            nav={nav}
            session={session}
            patient={selectedPatient}
            note={editNote}
            key={editNote?.id || 'new'}
          />
        )}
      </main>
    </div>
  )
}

function Sidebar({ page, nav, session }) {
  const email = session?.user?.email || ''
  const name = email.split('@')[0]

  const items = [
    { id: 'dashboard', icon: '⊞', label: 'Inicio' },
    { id: 'new-note',  icon: '✚', label: 'Nueva nota' },
    { id: 'notes',     icon: '📋', label: 'Notas guardadas' },
    { id: 'patients',  icon: '👤', label: 'Pacientes' },
  ]

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarLogo}>
        <div style={styles.logoText}>CPC</div>
        <div style={styles.logoSub}>Caribbean Psychology</div>
      </div>
      <nav style={{ flex: 1 }}>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => nav(item.id)}
            style={{ ...styles.navItem, ...(page === item.id || (page === 'edit-note' && item.id === 'new-note') ? styles.navActive : {}) }}
          >
            <span style={{ fontSize: 18, width: 24 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div style={styles.sidebarFooter}>
        <div style={{ fontSize: 12, color: '#7a99bb', marginBottom: 6 }}>
          {name}
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={styles.signOutBtn}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

const styles = {
  root: { display: 'flex', minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, -apple-system, sans-serif' },
  main: { flex: 1, overflowY: 'auto', padding: '2rem', maxWidth: 900, margin: '0 auto', width: '100%' },
  sidebar: { width: 220, background: '#1a2c4e', display: 'flex', flexDirection: 'column', padding: '0 0 1rem', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' },
  sidebarLogo: { padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: '0.5rem' },
  logoText: { fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '.04em' },
  logoSub: { fontSize: 10, color: '#7a99bb', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 2 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 20px', background: 'transparent', border: 'none', color: '#9ab0cc', fontSize: 13.5, fontWeight: 400, cursor: 'pointer', textAlign: 'left', borderLeft: '3px solid transparent', fontFamily: 'inherit' },
  navActive: { background: 'rgba(29,158,117,.15)', color: '#fff', borderLeftColor: '#1D9E75' },
  sidebarFooter: { padding: '1rem 1.25rem 0', borderTop: '1px solid rgba(255,255,255,.08)', marginTop: '1rem' },
  signOutBtn: { fontSize: 12, color: '#7a99bb', background: 'transparent', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' },
  loader: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f2f5' },
  loaderInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  loaderDot: { width: 32, height: 32, border: '3px solid #1D9E75', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
}
