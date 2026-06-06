import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login') // login | register | reset

  const handleLogin = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleRegister = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setError('Revisa tu email para confirmar tu cuenta.')
    setLoading(false)
  }

  const handleReset = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setError(error.message)
    else setError('Revisa tu email para restablecer tu contraseña.')
    setLoading(false)
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.logoCircle}>CPC</div>
          <div style={s.clinicName}>Caribbean Psychology Wellness Center</div>
          <div style={s.clinicSub}>Sistema de Notas de Progreso Clínico</div>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset}>
          <div style={s.field}>
            <label style={s.lbl}>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="clinico@caribbeanpsychology.com" required style={s.input} />
          </div>
          {mode !== 'reset' && (
            <div style={s.field}>
              <label style={s.lbl}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={s.input} />
            </div>
          )}
          {error && (
            <div style={{ ...s.msg, background: error.includes('email') || error.includes('cuenta') ? '#E1F5EE' : '#FCEBEB', color: error.includes('email') || error.includes('cuenta') ? '#0F6E56' : '#A32D2D' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Registrar cuenta' : 'Enviar enlace'}
          </button>
        </form>

        <div style={s.links}>
          {mode !== 'login' && <button style={s.link} onClick={() => { setMode('login'); setError('') }}>← Iniciar sesión</button>}
          {mode === 'login' && <button style={s.link} onClick={() => { setMode('reset'); setError('') }}>¿Olvidaste tu contraseña?</button>}
          {mode === 'login' && <button style={s.link} onClick={() => { setMode('register'); setError('') }}>Crear cuenta nueva</button>}
        </div>

        <div style={s.footer}>Confidencial · HIPAA · Ley 408 Puerto Rico</div>
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: 'linear-gradient(135deg,#1a2c4e 0%,#243857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif' },
  card: { background: '#fff', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,.25)' },
  logoWrap: { textAlign: 'center', marginBottom: '2rem' },
  logoCircle: { width: 64, height: 64, background: '#1a2c4e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 auto 12px', letterSpacing: '.04em' },
  clinicName: { fontSize: 15, fontWeight: 600, color: '#1a2c4e', marginBottom: 4 },
  clinicSub: { fontSize: 12, color: '#9aa3b2' },
  field: { marginBottom: 14 },
  lbl: { fontSize: 11, fontWeight: 600, color: '#9aa3b2', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 5 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '11px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 },
  msg: { padding: '8px 12px', borderRadius: 7, fontSize: 12.5, marginBottom: 12 },
  links: { display: 'flex', justifyContent: 'space-between', marginTop: 14 },
  link: { background: 'none', border: 'none', color: '#1D9E75', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' },
  footer: { textAlign: 'center', fontSize: 11, color: '#c8cdd6', marginTop: '1.5rem' },
}
