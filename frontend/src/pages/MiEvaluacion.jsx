import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Loader2, CheckCircle, BarChart2, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useCelebraciones } from '../hooks/useCelebraciones'
import clsx from 'clsx'

const AREAS_NOMBRES = { 2: 'Calidad Operativa', 3: 'Gecotex Corporate', 4: 'Digitalización' }
const ESTADO_LABELS = {
  borrador: { label: 'Pendiente de autoevaluación', color: 'bg-gray-100 text-gray-700' },
  auto_evaluacion: { label: 'En proceso', color: 'bg-blue-100 text-blue-700' },
  evaluacion_dir: { label: 'Enviada — pendiente de dirección', color: 'bg-orange-100 text-orange-700' },
  completada: { label: 'Evaluación completada', color: 'bg-green-100 text-green-700' },
  cerrada: { label: 'Cerrada — bonus confirmado', color: 'bg-gecotex-primary/10 text-gecotex-primary' },
}

function Nota10({ valor, onChange, disabled }) {
  return (
    <div className="grid grid-cols-5 gap-2 mt-4">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(n)}
          className={clsx(
            'h-12 rounded-xl border-2 text-[15px] font-bold transition-all',
            valor === n
              ? 'border-gecotex-blue bg-gecotex-blue text-white shadow-sm'
              : 'border-gecotex-border bg-white text-gecotex-ink hover:border-gecotex-blue/50 disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function DescripcionNivel({ niveles, valor }) {
  if (!niveles || valor == null) return null
  const entrada = Object.entries(niveles).find(([rango]) => {
    const [min, max] = rango.split('-').map(Number)
    return valor >= min && valor <= (max || min)
  })
  if (!entrada) return null
  return (
    <div className="mt-3 bg-gecotex-blue/5 border border-gecotex-blue/20 rounded-xl px-4 py-3">
      <p className="text-[12.5px] text-gecotex-ink leading-relaxed">{entrada[1]}</p>
    </div>
  )
}

export default function MiEvaluacion() {
  const navigate = useNavigate()
  const { celebrar } = useCelebraciones()
  const [evaluacion, setEvaluacion] = useState(null)
  const [factores, setFactores] = useState([])
  const [notas, setNotas] = useState({})
  const [comentarios, setComentarios] = useState({})
  const [preguntaActual, setPreguntaActual] = useState(-1) // -1 = intro, length = resumen
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/bonus/evaluaciones/mia'),
      api.get('/bonus/factores'),
    ]).then(([evR, facR]) => {
      setEvaluacion(evR.data)
      setFactores(facR.data.filter(f => f.area >= 2 && f.activo))
      if (evR.data?.respuestas) {
        const m = {}, c = {}
        evR.data.respuestas.forEach(r => {
          if (r.nota_auto != null) m[r.factor_id] = r.nota_auto
          if (r.comentario_auto) c[r.factor_id] = r.comentario_auto
        })
        setNotas(m)
        setComentarios(c)
      }
    }).catch(() => toast.error('Error al cargar la evaluación'))
      .finally(() => setLoading(false))
  }, [])

  const editable = evaluacion && ['borrador', 'auto_evaluacion'].includes(evaluacion.estado)
  const totalPreguntas = factores.length
  const enResumen = preguntaActual === totalPreguntas
  const factor = factores[preguntaActual]

  const pctProgreso = totalPreguntas > 0 ? Math.round(((preguntaActual + 1) / totalPreguntas) * 100) : 0
  const todosRellenados = factores.every(f => notas[f.id] != null)

  const handleEnviar = async () => {
    if (!todosRellenados) return
    setEnviando(true)
    try {
      const respuestas = factores.map(f => ({
        factor_id: f.id,
        nota_auto: notas[f.id] ?? null,
        comentario_auto: comentarios[f.id] || null,
      }))
      const notasArea = {}
      ;[2, 3, 4].forEach(area => {
        const fs = factores.filter(f => f.area === area)
        const textos = fs.map(f => comentarios[f.id]).filter(Boolean)
        if (textos.length) notasArea[area] = textos.join('\n')
      })
      const r = await api.put(`/bonus/evaluaciones/${evaluacion.id}/auto`, {
        respuestas,
        notas_area2: notasArea[2] || '',
        notas_area3: notasArea[3] || '',
        notas_area4: notasArea[4] || '',
      })
      setEvaluacion(r.data)
      if (r.data?.bonus_semestral_euros > 0 && r.data?.estado === 'completada') {
        await celebrar('bonus_cerrado', { bonus: r.data.bonus_semestral_euros })
      }
      toast.success('Autoevaluación enviada correctamente')
    } catch {
      toast.error('Error al enviar la autoevaluación')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <Loader2 size={28} className="animate-spin text-gecotex-primary" />
    </div>
  )

  if (!evaluacion) return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-4">
      <ClipboardCheck size={48} className="mx-auto text-gray-300" />
      <h2 className="text-xl font-semibold text-gray-600">No hay evaluación activa</h2>
      <p className="text-gray-500">No tienes ninguna evaluación de bonus pendiente.</p>
    </div>
  )

  const estadoInfo = ESTADO_LABELS[evaluacion.estado] || {}

  // Vista de solo lectura (ya enviada)
  if (!editable) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gecotex-primary">Mi Evaluación Semestral</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${estadoInfo.color}`}>{estadoInfo.label}</span>
        </div>
        <div className="card flex items-center gap-6 flex-wrap">
          <div className="text-center"><p className="text-xs text-gray-500 mb-1">Semestre</p><p className="text-2xl font-bold text-gecotex-primary">{evaluacion.semestre}/{evaluacion.año}</p></div>
          {evaluacion.puntuacion_total != null && (
            <div className="text-center"><p className="text-xs text-gray-500 mb-1">Puntuación total</p><p className="text-3xl font-bold text-gecotex-green">{evaluacion.puntuacion_total.toFixed(1)}</p></div>
          )}
          {evaluacion.estado === 'cerrada' && evaluacion.bonus_semestral_euros != null && (
            <div className="text-center"><p className="text-xs text-gray-500 mb-1">Bonus confirmado</p>
              <p className="text-2xl font-bold text-green-600">{evaluacion.bonus_semestral_euros.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
            </div>
          )}
        </div>
        <div className="card space-y-4">
          <div className="flex items-center gap-2"><BarChart2 size={18} className="text-gecotex-primary" /><h2 className="font-semibold">Área 1 — Productividad DUAs (automática)</h2></div>
          <div className="grid grid-cols-3 gap-3">
            {[{ l: 'Factor K', v: evaluacion.factor_k_promedio, d: 3 }, { l: '% SLA', v: evaluacion.pct_sla, s: '%' }, { l: '% Registro', v: evaluacion.pct_registro, s: '%' }].map(m => (
              <div key={m.l} className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500 mb-1">{m.l}</p><p className="text-xl font-bold text-gecotex-primary">{m.v != null ? `${m.v.toFixed(m.d || 1)}${m.s || ''}` : '—'}</p></div>
            ))}
          </div>
        </div>
        {factores.map(f => {
          const resp = evaluacion.respuestas?.find(r => r.factor_id === f.id)
          return (
            <div key={f.id} className="card">
              <p className="text-xs font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">Área {f.area} — {AREAS_NOMBRES[f.area]}</p>
              <p className="text-[14px] font-semibold text-gecotex-ink mb-3">{f.nombre}</p>
              <div className="flex gap-4 text-sm">
                {resp?.nota_auto != null && <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold">Tu nota: {resp.nota_auto.toFixed(1)}</span>}
                {resp?.nota_dir != null && <span className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg font-bold">Dirección: {resp.nota_dir.toFixed(1)}</span>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // INTRO
  if (preguntaActual === -1) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gecotex-primary">Mi Evaluación Semestral</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${estadoInfo.color}`}>{estadoInfo.label}</span>
        </div>
        <div className="card space-y-5 text-center">
          <div className="w-16 h-16 bg-gecotex-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <ClipboardCheck size={32} className="text-gecotex-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gecotex-ink mb-2">Semestre {evaluacion.semestre}/{evaluacion.año}</h2>
            <p className="text-[13.5px] text-gecotex-ink-sub leading-relaxed">
              A continuación responderás <strong>{totalPreguntas} preguntas</strong> sobre tu desempeño en calidad operativa, actitud corporativa y digitalización. Suele tardar unos <strong>5-10 minutos</strong>.
            </p>
          </div>
          <div className="bg-gecotex-bg rounded-xl p-4 text-left space-y-2">
            <p className="text-[12px] font-bold text-gecotex-ink-muted uppercase tracking-widest">Área 1 (automática) — Productividad</p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[{ l: 'Factor K', v: evaluacion.factor_k_promedio, d: 3 }, { l: '% SLA', v: evaluacion.pct_sla, s: '%' }, { l: '% Registro', v: evaluacion.pct_registro, s: '%' }].map(m => (
                <div key={m.l} className="bg-white rounded-xl p-2.5 text-center border border-gecotex-border-soft">
                  <p className="text-[10.5px] text-gecotex-ink-muted mb-0.5">{m.l}</p>
                  <p className="text-base font-bold text-gecotex-primary">{m.v != null ? `${m.v.toFixed(m.d || 1)}${m.s || ''}` : '—'}</p>
                </div>
              ))}
            </div>
            {evaluacion.puntuacion_area1 != null && (
              <p className="text-center text-[12px] text-gecotex-ink-muted mt-2">Puntuación Área 1: <strong>{evaluacion.puntuacion_area1.toFixed(1)}/10</strong></p>
            )}
          </div>
          <button onClick={() => setPreguntaActual(0)} className="btn-primary w-full py-3 text-[14px]">
            Empezar autoevaluación →
          </button>
        </div>
      </div>
    )
  }

  // RESUMEN FINAL
  if (enResumen) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in space-y-5">
        <h1 className="text-xl font-bold text-gecotex-ink">Resumen de tu autoevaluación</h1>
        <div className="space-y-3">
          {factores.map((f, i) => (
            <div key={f.id} className="bg-white rounded-xl border border-gecotex-border-soft p-4 flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-gecotex-blue/10 text-gecotex-blue text-[11px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] font-bold text-gecotex-ink-muted uppercase tracking-widest">{AREAS_NOMBRES[f.area]}</p>
                <p className="text-[12.5px] font-semibold text-gecotex-ink leading-snug truncate">{f.nombre}</p>
              </div>
              {notas[f.id] != null ? (
                <span className="text-2xl font-black text-gecotex-blue font-mono flex-shrink-0">{notas[f.id]}</span>
              ) : (
                <button onClick={() => setPreguntaActual(i)} className="text-xs font-bold text-red-500 flex-shrink-0">Falta</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setPreguntaActual(totalPreguntas - 1)} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={16} /> Revisar
          </button>
          <button
            onClick={handleEnviar}
            disabled={!todosRellenados || enviando}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {enviando ? 'Enviando...' : 'Enviar autoevaluación'}
          </button>
        </div>
      </div>
    )
  }

  // PREGUNTA POR PREGUNTA
  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      {/* Barra de progreso */}
      <div className="mb-6">
        <div className="flex justify-between text-[11px] font-semibold text-gecotex-ink-muted mb-2">
          <span>Pregunta {preguntaActual + 1} de {totalPreguntas}</span>
          <span>{pctProgreso}% completado</span>
        </div>
        <div className="w-full bg-gecotex-bg rounded-full h-2">
          <div className="bg-gecotex-blue h-2 rounded-full transition-all duration-500" style={{ width: `${pctProgreso}%` }} />
        </div>
      </div>

      <div className="card space-y-5">
        {/* Área badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-gecotex-blue/10 text-gecotex-blue text-[11px] font-bold rounded-full">
            Área {factor.area} — {AREAS_NOMBRES[factor.area]}
          </span>
        </div>

        {/* Pregunta */}
        <div>
          <h2 className="text-[16px] font-bold text-gecotex-ink leading-snug">{factor.nombre}</h2>
          {factor.nota_contexto && (
            <p className="text-[12px] text-gecotex-ink-muted mt-1.5 bg-gecotex-bg rounded-lg px-3 py-2">{factor.nota_contexto}</p>
          )}
        </div>

        {/* Escala */}
        <div>
          <p className="text-[12px] font-semibold text-gecotex-ink-muted mb-1">Puntúa del 1 al 10:</p>
          <div className="flex justify-between text-[10px] text-gecotex-ink-muted mb-1">
            <span>1 — Insuficiente</span>
            <span>5 — En desarrollo</span>
            <span>10 — Excelente</span>
          </div>
          <Nota10
            valor={notas[factor.id]}
            onChange={(v) => setNotas(n => ({ ...n, [factor.id]: v }))}
          />
          <DescripcionNivel niveles={factor.descripciones_niveles} valor={notas[factor.id]} />
        </div>

        {/* Comentario */}
        <div>
          <label className="text-[12px] font-semibold text-gecotex-ink-muted">Comentario (opcional)</label>
          <textarea
            className="input-field h-16 resize-none mt-1 text-sm"
            placeholder="¿Quieres añadir algo sobre este punto?"
            value={comentarios[factor.id] || ''}
            onChange={e => setComentarios(c => ({ ...c, [factor.id]: e.target.value }))}
          />
        </div>
      </div>

      {/* Navegación */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={() => setPreguntaActual(p => p > 0 ? p - 1 : -1)}
          className="btn-secondary flex items-center gap-1.5 px-4"
        >
          <ChevronLeft size={16} /> Atrás
        </button>
        <div className="flex-1" />
        {preguntaActual < totalPreguntas - 1 ? (
          <button
            onClick={() => setPreguntaActual(p => p + 1)}
            className="btn-primary flex items-center gap-1.5 px-5"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => setPreguntaActual(totalPreguntas)}
            className="btn-primary flex items-center gap-1.5 px-5"
          >
            Ver resumen <CheckCircle size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
