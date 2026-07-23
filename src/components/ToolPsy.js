import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// ── Instrumentos de cernimiento estandarizados (versiones en español de uso libre)
const INSTRUMENTS = [
  {
    id: 'phq9',
    name: 'PHQ-9',
    fullName: 'Cuestionario de Salud del Paciente — Depresión',
    domain: 'Depresión',
    time: '2-3 min',
    intro: 'Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?',
    options: [
      { label: 'Para nada', value: 0 },
      { label: 'Varios días', value: 1 },
      { label: 'Más de la mitad de los días', value: 2 },
      { label: 'Casi todos los días', value: 3 },
    ],
    items: [
      'Poco interés o placer en hacer las cosas',
      'Se ha sentido decaído(a), deprimido(a) o sin esperanzas',
      'Dificultad para quedarse o permanecer dormido(a), o ha dormido demasiado',
      'Se ha sentido cansado(a) o con poca energía',
      'Poco apetito o ha comido en exceso',
      'Se ha sentido mal con usted mismo(a) — o que es un fracaso o que ha quedado mal con usted mismo(a) o con su familia',
      'Dificultad para concentrarse en cosas tales como leer el periódico o ver televisión',
      'Se ha movido o hablado tan lento que otras personas podrían haberlo notado, o lo contrario: tan inquieto(a) o agitado(a) que se ha estado moviendo mucho más de lo normal',
      'Pensamientos de que estaría mejor muerto(a) o de lastimarse de alguna manera',
    ],
    interpret: t =>
      t <= 4 ? { label: 'Depresión mínima o ausente', level: 0 }
      : t <= 9 ? { label: 'Depresión leve', level: 1 }
      : t <= 14 ? { label: 'Depresión moderada', level: 2 }
      : t <= 19 ? { label: 'Depresión moderadamente severa', level: 3 }
      : { label: 'Depresión severa', level: 3 },
    riskItem: { index: 8, warning: 'Ítem 9 positivo (ideación de muerte/autolesión) — evaluar riesgo suicida y documentar plan de seguridad.' },
  },
  {
    id: 'gad7',
    name: 'GAD-7',
    fullName: 'Escala de Ansiedad Generalizada',
    domain: 'Ansiedad',
    time: '1-2 min',
    intro: 'Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?',
    options: [
      { label: 'Para nada', value: 0 },
      { label: 'Varios días', value: 1 },
      { label: 'Más de la mitad de los días', value: 2 },
      { label: 'Casi todos los días', value: 3 },
    ],
    items: [
      'Se ha sentido nervioso(a), ansioso(a) o con los nervios de punta',
      'No ha sido capaz de parar o controlar su preocupación',
      'Se ha preocupado demasiado por motivos diferentes',
      'Ha tenido dificultad para relajarse',
      'Se ha sentido tan inquieto(a) que no ha podido quedarse quieto(a)',
      'Se ha molestado o irritado fácilmente',
      'Ha tenido miedo de que algo terrible fuera a pasar',
    ],
    interpret: t =>
      t <= 4 ? { label: 'Ansiedad mínima o ausente', level: 0 }
      : t <= 9 ? { label: 'Ansiedad leve', level: 1 }
      : t <= 14 ? { label: 'Ansiedad moderada', level: 2 }
      : { label: 'Ansiedad severa', level: 3 },
  },
  {
    id: 'auditc',
    name: 'AUDIT-C',
    fullName: 'Cernimiento de Consumo de Alcohol (versión breve)',
    domain: 'Alcohol',
    time: '1 min',
    intro: 'Conteste según su consumo de bebidas alcohólicas durante el último año.',
    perItemOptions: [
      [
        { label: 'Nunca', value: 0 },
        { label: 'Una o menos veces al mes', value: 1 },
        { label: '2 a 4 veces al mes', value: 2 },
        { label: '2 a 3 veces a la semana', value: 3 },
        { label: '4 o más veces a la semana', value: 4 },
      ],
      [
        { label: '1 o 2', value: 0 },
        { label: '3 o 4', value: 1 },
        { label: '5 o 6', value: 2 },
        { label: '7 a 9', value: 3 },
        { label: '10 o más', value: 4 },
      ],
      [
        { label: 'Nunca', value: 0 },
        { label: 'Menos de una vez al mes', value: 1 },
        { label: 'Mensualmente', value: 2 },
        { label: 'Semanalmente', value: 3 },
        { label: 'A diario o casi a diario', value: 4 },
      ],
    ],
    items: [
      '¿Con qué frecuencia consume alguna bebida alcohólica?',
      '¿Cuántas bebidas alcohólicas consume en un día típico cuando bebe?',
      '¿Con qué frecuencia toma 6 o más bebidas alcohólicas en una sola ocasión?',
    ],
    interpret: t =>
      t === 0 ? { label: 'Sin consumo reportado', level: 0 }
      : t <= 2 ? { label: 'Cernimiento negativo', level: 0 }
      : t === 3 ? { label: 'Positivo en mujeres (≥3); negativo en hombres (<4)', level: 1 }
      : { label: 'Cernimiento positivo — considerar evaluación completa (AUDIT)', level: 2 },
  },
  {
    id: 'pss10',
    name: 'PSS-10',
    fullName: 'Escala de Estrés Percibido',
    domain: 'Estrés',
    time: '3-4 min',
    intro: 'Las siguientes preguntas se refieren a sus sentimientos y pensamientos durante el último mes.',
    options: [
      { label: 'Nunca', value: 0 },
      { label: 'Casi nunca', value: 1 },
      { label: 'De vez en cuando', value: 2 },
      { label: 'A menudo', value: 3 },
      { label: 'Muy a menudo', value: 4 },
    ],
    items: [
      '¿Con qué frecuencia se ha sentido afectado(a) por algo que ocurrió inesperadamente?',
      '¿Con qué frecuencia se ha sentido incapaz de controlar las cosas importantes de su vida?',
      '¿Con qué frecuencia se ha sentido nervioso(a) o estresado(a)?',
      '¿Con qué frecuencia se ha sentido seguro(a) de su capacidad para manejar sus problemas personales?',
      '¿Con qué frecuencia ha sentido que las cosas le van bien?',
      '¿Con qué frecuencia ha sentido que no podía afrontar todas las cosas que tenía que hacer?',
      '¿Con qué frecuencia ha podido controlar las dificultades de su vida?',
      '¿Con qué frecuencia ha sentido que tenía todo bajo control?',
      '¿Con qué frecuencia se ha enfadado porque las cosas que le ocurrieron estaban fuera de su control?',
      '¿Con qué frecuencia ha sentido que las dificultades se acumulaban tanto que no podía superarlas?',
    ],
    reverseItems: [3, 4, 6, 7],
    interpret: t =>
      t <= 13 ? { label: 'Estrés percibido bajo', level: 0 }
      : t <= 26 ? { label: 'Estrés percibido moderado', level: 1 }
      : { label: 'Estrés percibido alto', level: 2 },
  },
]

const LEVEL_STYLE = [
  { background: '#E1F5EE', color: '#0F6E56' },
  { background: '#FAEEDA', color: '#854F0B' },
  { background: '#FCE8D9', color: '#9A4B12' },
  { background: '#FBE3E3', color: '#A02525' },
]

export default function ToolPsy({ session }) {
  const [tool, setTool] = useState(null)
  const [answers, setAnswers] = useState([])
  const [patients, setPatients] = useState([])
  const [patientName, setPatientName] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.from('patients').select('id, name').order('name')
      .then(({ data }) => setPatients(data || []))
  }, [])

  const openTool = t => {
    setTool(t)
    setAnswers(Array(t.items.length).fill(null))
    setCopied(false)
  }

  const setAnswer = (i, v) => {
    const next = [...answers]
    next[i] = v
    setAnswers(next)
    setCopied(false)
  }

  if (!tool) {
    return (
      <div>
        <div style={s.header}>
          <div>
            <h1 style={s.h1}>ToolPsy</h1>
            <p style={s.sub}>Instrumentos de cernimiento con puntuación automática</p>
          </div>
        </div>
        <div style={s.grid}>
          {INSTRUMENTS.map(t => (
            <button key={t.id} style={s.card} onClick={() => openTool(t)}>
              <div style={s.cardTop}>
                <span style={s.cardName}>{t.name}</span>
                <span style={s.cardDomain}>{t.domain}</span>
              </div>
              <div style={s.cardFull}>{t.fullName}</div>
              <div style={s.cardMeta}>{t.items.length} ítems · {t.time}</div>
            </button>
          ))}
        </div>
        <p style={s.disclaimer}>
          Los resultados de cernimiento no constituyen un diagnóstico por sí solos; deben interpretarse
          dentro de la evaluación clínica completa del profesional.
        </p>
      </div>
    )
  }

  const optionsFor = i => tool.perItemOptions ? tool.perItemOptions[i] : tool.options
  const maxPerItem = i => Math.max(...optionsFor(i).map(o => o.value))
  const scoreFor = i => answers[i] == null ? null
    : (tool.reverseItems || []).includes(i) ? maxPerItem(i) - answers[i] : answers[i]

  const answered = answers.filter(a => a != null).length
  const complete = answered === tool.items.length
  const total = complete ? answers.reduce((sum, _, i) => sum + scoreFor(i), 0) : null
  const maxTotal = tool.items.map((_, i) => maxPerItem(i)).reduce((a, b) => a + b, 0)
  const result = complete ? tool.interpret(total) : null
  const riskFlag = complete && tool.riskItem && answers[tool.riskItem.index] > 0

  const buildSummary = () => {
    const lines = [
      `${tool.name} — ${tool.fullName}`,
      `Paciente: ${patientName || '—'} · Fecha: ${new Date().toLocaleDateString('es-PR')}`,
      `Puntuación total: ${total}/${maxTotal} — ${result.label}`,
      `Respuestas por ítem: ${answers.map((_, i) => scoreFor(i)).join(', ')}`,
    ]
    if (riskFlag) lines.push(`⚠ ${tool.riskItem.warning}`)
    if (session?.user?.email) lines.push(`Administrado por: ${session.user.email}`)
    return lines.join('\n')
  }

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummary())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copie el resumen manualmente:', buildSummary())
    }
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <button style={s.backBtn} onClick={() => setTool(null)}>← Instrumentos</button>
          <h1 style={s.h1}>{tool.name}</h1>
          <p style={s.sub}>{tool.fullName}</p>
        </div>
        <span style={s.progress}>{answered}/{tool.items.length} contestados</span>
      </div>

      <div style={s.panel}>
        <label style={s.label}>Paciente</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <select style={{ ...s.inp, width: 250 }} value={patients.some(p => p.name === patientName) ? patientName : ''}
            onChange={e => setPatientName(e.target.value)}>
            <option value="">Seleccionar de la lista...</option>
            {patients.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <input style={{ ...s.inp, flex: 1 }} placeholder="o escriba el nombre..."
            value={patientName} onChange={e => setPatientName(e.target.value)} />
        </div>
      </div>

      <p style={s.intro}>{tool.intro}</p>

      {tool.items.map((item, i) => (
        <div key={i} style={s.itemCard}>
          <div style={s.itemText}><span style={s.itemNum}>{i + 1}</span>{item}</div>
          <div style={s.optRow}>
            {optionsFor(i).map(o => (
              <button key={o.value} onClick={() => setAnswer(i, o.value)}
                style={{ ...s.opt, ...(answers[i] === o.value ? s.optActive : {}) }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={s.resultPanel}>
        {!complete ? (
          <div style={s.resultPending}>Conteste los {tool.items.length - answered} ítems restantes para ver la puntuación.</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={s.score}>{total}<span style={s.scoreMax}>/{maxTotal}</span></div>
              <span style={{ ...s.resultBadge, ...LEVEL_STYLE[result.level] }}>{result.label}</span>
            </div>
            {riskFlag && <div style={s.riskAlert}>⚠ {tool.riskItem.warning}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button style={s.btnPrimary} onClick={copySummary}>
                {copied ? '✓ Copiado' : 'Copiar resumen para la nota'}
              </button>
              <button style={s.btnGhost} onClick={() => openTool(tool)}>Reiniciar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.25rem', gap: 12 },
  h1: { margin: 0, fontSize: 22, fontWeight: 600, color: '#1a2c4e' },
  sub: { margin: '4px 0 0', fontSize: 13, color: '#9aa3b2' },
  backBtn: { background: 'transparent', border: 'none', color: '#1D9E75', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 8, fontFamily: 'inherit' },
  progress: { fontSize: 12.5, color: '#9aa3b2', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 },
  card: { background: '#fff', border: '1px solid #e2e6ec', borderRadius: 12, padding: '1.1rem 1.2rem', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardName: { fontSize: 16, fontWeight: 700, color: '#1a2c4e' },
  cardDomain: { fontSize: 11, fontWeight: 600, color: '#0F6E56', background: '#E1F5EE', padding: '3px 8px', borderRadius: 5 },
  cardFull: { fontSize: 13, color: '#1a2c4e', marginBottom: 8 },
  cardMeta: { fontSize: 12, color: '#9aa3b2' },
  disclaimer: { fontSize: 12, color: '#9aa3b2', marginTop: 18, lineHeight: 1.5 },
  panel: { background: '#fff', border: '1px solid #e2e6ec', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#9aa3b2', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 },
  inp: { padding: '9px 10px', border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  intro: { fontSize: 13.5, color: '#1a2c4e', fontStyle: 'italic', margin: '0 0 12px' },
  itemCard: { background: '#fff', border: '1px solid #e2e6ec', borderRadius: 12, padding: '0.9rem 1.2rem', marginBottom: 10 },
  itemText: { fontSize: 13.5, color: '#1a2c4e', marginBottom: 10, lineHeight: 1.45 },
  itemNum: { display: 'inline-block', minWidth: 22, fontWeight: 700, color: '#1D9E75' },
  optRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  opt: { padding: '7px 12px', border: '1px solid #e2e6ec', borderRadius: 8, background: '#f7f8fa', color: '#1a2c4e', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' },
  optActive: { background: '#1D9E75', borderColor: '#1D9E75', color: '#fff', fontWeight: 600 },
  resultPanel: { background: '#fff', border: '1px solid #e2e6ec', borderRadius: 12, padding: '1.2rem', marginTop: 16 },
  resultPending: { fontSize: 13, color: '#9aa3b2', textAlign: 'center' },
  score: { fontSize: 34, fontWeight: 700, color: '#1a2c4e' },
  scoreMax: { fontSize: 16, fontWeight: 400, color: '#9aa3b2' },
  resultBadge: { padding: '6px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 },
  riskAlert: { marginTop: 12, padding: '10px 14px', background: '#FBE3E3', color: '#A02525', borderRadius: 8, fontSize: 13, fontWeight: 600, lineHeight: 1.45 },
  btnPrimary: { padding: '9px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { padding: '9px 18px', background: 'transparent', color: '#1a2c4e', border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}
