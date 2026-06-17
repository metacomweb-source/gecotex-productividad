import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Loader2, AlertCircle, CheckCircle, BarChart2, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const AREAS = [
  { num: 1, nombre: 'Productividad DUAs', peso: '40%', auto: false },
  { num: 2, nombre: 'Calidad Operativa', peso: '30%', auto: true },
  { num: 3, nombre: 'Gecotex Corporate', peso: '20%', auto: true },
  { num: 4, nombre: 'Digitalización y Adaptación', peso: '10%', auto: true },
]

const ESTADO_LABELS = {
  borrador: { label: 'Pendiente de autoevaluación', color: 'bg-gray-100 text-gray-700' },
  auto_evaluacion: { label: 'En proceso', color: 'bg-blue-100 text-blue-700' },
  evaluacion_dir: { label: 'Enviada — pendiente de dirección', color: 'bg-orange-100 text-orange-700' },
  completada: { label: 'Evaluación completada', color: 'bg-green-100 text-green-700' },
  cerrada: { label: 'Cerrada — bonus confirmado', color: 'bg-gecotex-primary/10 text-gecotex-primary' },
}

function PuntuacionBadge({ valor, grande = false }) {
  if (valor == null) return <span className="text-gray-400">—</span>
  const color = valor >= 8.5 ? 'text-green-600' : valor >= 7 ? 'text-orange-500' : valor >= 5 ? 'text-yellow-600' : 'text-red-500'
  return <span className={`font-bold ${grande ? 'text-4xl' : 'text-lg'} ${color}`}>{valor.toFixed(1)}</span>
}

function FactorInput({ factor, nota, onNota, nota_dir, readonly }) {
  return (
    <div className="border rounded-xl p-4 space-y-2 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{factor.nombre}</p>
          {factor.nota_contexto && (
            <p className="text-xs text-gray-500 mt-0.5">{factor.nota_contexto}</p>
          )}
        </div>
        {!readonly && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1} max={10} step={0.5}
              value={nota ?? ''}
              onChange={e => onNota(factor.id, e.target.value === '' ? null : parseFloat(e.target.value))}
              className="w-16 text-center input-field text-base font-semibold"
              placeholder="—"
            />
            <span className="text-xs text-gray-400">/10</span>
          </div>
        )}
        {readonly && (
          <div className="flex gap-4 text-sm">
            {nota != null && <span className="text-blue-600 font-medium">Auto: {nota.toFixed(1)}</span>}
            {nota_dir != null && <span className="text-orange-600 font-medium">Dir: {nota_dir.toFixed(1)}</span>}
          </div>
        )}
      </div>
      {!readonly && nota != null && (
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-gecotex-primary h-1.5 rounded-full transition-all" style={{ width: `${(nota / 10) * 100}%` }} />
        </div>
      )}
    </div>
  )
}

export default function MiEvaluacion() {
  const navigate = useNavigate()
  const [evaluacion, setEvaluacion] = useState(null)
  const [factores, setFactores] = useState([])
  const [notas, setNotas] = useState({})
  const [notasTexto, setNotasTexto] = useState({ 2: '', 3: '', 4: '' })
  const [tabActivo, setTabActivo] = useState(1)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/bonus/evaluaciones/mia'),
      api.get('/bonus/factores'),
    ]).then(([evR, facR]) => {
      setEvaluacion(evR.data)
      setFactores(facR.data)
      if (evR.data?.respuestas) {
        const m = {}
        evR.data.respuestas.forEach(r => { if (r.nota_auto != null) m[r.factor_id] = r.nota_auto })
        setNotas(m)
        setNotasTexto({
          2: evR.data.notas_empleado_area2 || '',
          3: evR.data.notas_empleado_area3 || '',
          4: evR.data.notas_empleado_area4 || '',
        })
      }
    }).catch(() => toast.error('Error al cargar la evaluación'))
      .finally(() => setLoading(false))
  }, [])

  const factoresPorArea = area => factores.filter(f => f.area === area && f.activo)
  const respuestaPorFactor = fid => evaluacion?.respuestas?.find(r => r.factor_id === fid)

  const puntuacionPreview = () => {
    if (!evaluacion) return null
    const factoresArea = (area) => factoresPorArea(area).filter(f => notas[f.id] != null)
    const media = (area) => {
      const fs = factoresArea(area)
      if (!fs.length) return null
      return fs.reduce((s, f) => s + notas[f.id], 0) / fs.length
    }
    const p1 = evaluacion.puntuacion_area1 || 0
    const p2 = media(2) ?? 0
    const p3 = media(3) ?? 0
    const p4 = media(4) ?? 0
    return (p1 * 0.4 + p2 * 0.3 + p3 * 0.2 + p4 * 0.1).toFixed(1)
  }

  const todosRellenados = () => {
    return [2, 3, 4].every(area =>
      factoresPorArea(area).every(f => notas[f.id] != null)
    )
  }

  const handleEnviar = async () => {
    if (!todosRellenados()) return
    setEnviando(true)
    try {
      const respuestas = factores.map(f => ({
        factor_id: f.id,
        nota_auto: notas[f.id] ?? null,
        comentario_auto: null,
      }))
      const r = await api.put(`/bonus/evaluaciones/${evaluacion.id}/auto`, {
        respuestas,
        notas_area2: notasTexto[2],
        notas_area3: notasTexto[3],
        notas_area4: notasTexto[4],
      })
      setEvaluacion(r.data)
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
      <p className="text-gray-500">No tienes ninguna evaluación de bonus pendiente en este momento.</p>
    </div>
  )

  const editable = ['borrador', 'auto_evaluacion'].includes(evaluacion.estado)
  const estadoInfo = ESTADO_LABELS[evaluacion.estado] || {}

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gecotex-primary">Mi Evaluación Semestral</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${estadoInfo.color}`}>
          {estadoInfo.label}
        </span>
      </div>

      <div className="card flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Semestre</p>
          <p className="text-2xl font-bold text-gecotex-primary">{evaluacion.semestre}/{evaluacion.año}</p>
        </div>
        {evaluacion.puntuacion_total != null && (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Puntuación total</p>
            <PuntuacionBadge valor={evaluacion.puntuacion_total} grande />
          </div>
        )}
        {evaluacion.estado === 'cerrada' && evaluacion.bonus_semestral_euros != null && (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Bonus confirmado</p>
            <p className="text-2xl font-bold text-green-600">
              {evaluacion.bonus_semestral_euros.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
        )}
        {editable && (
          <div className="text-center ml-auto">
            <p className="text-xs text-gray-500 mb-1">Estimación parcial</p>
            <p className="text-xl font-bold text-orange-500">{puntuacionPreview()} <span className="text-sm font-normal text-gray-400">/ 10</span></p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {AREAS.map(area => (
          <button
            key={area.num}
            onClick={() => setTabActivo(area.num)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              tabActivo === area.num ? 'bg-white shadow text-gecotex-primary' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="hidden sm:inline">Área {area.num} — </span>{area.nombre}
            <span className="ml-1 text-gray-400">({area.peso})</span>
          </button>
        ))}
      </div>

      {/* Área 1 — Automática */}
      {tabActivo === 1 && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-gecotex-primary" />
            <h2 className="font-semibold text-gray-800">Productividad DUAs — calculada automáticamente</h2>
          </div>
          <p className="text-sm text-gray-500">Esta área se calcula a partir de tu actividad registrada en el sistema durante el semestre.</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Factor K promedio', valor: evaluacion.factor_k_promedio, decimales: 3 },
              { label: '% en SLA', valor: evaluacion.pct_sla, sufijo: '%' },
              { label: '% Registro completo', valor: evaluacion.pct_registro, sufijo: '%' },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className="text-2xl font-bold text-gecotex-primary">
                  {m.valor != null ? `${m.valor.toFixed(m.decimales || 1)}${m.sufijo || ''}` : '—'}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-gecotex-primary/5 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Puntuación Área 1</p>
            <PuntuacionBadge valor={evaluacion.puntuacion_area1} grande />
            <p className="text-xs text-gray-400 mt-1">de 10</p>
          </div>
        </div>
      )}

      {/* Áreas 2, 3, 4 */}
      {[2, 3, 4].map(area => tabActivo === area && (
        <div key={area} className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-gecotex-primary" />
              <h2 className="font-semibold text-gray-800">{AREAS[area - 1].nombre}</h2>
            </div>
            {!editable && evaluacion[`puntuacion_area${area}`] != null && (
              <PuntuacionBadge valor={evaluacion[`puntuacion_area${area}`]} />
            )}
          </div>

          {editable && (
            <div className="text-xs text-gray-500 bg-blue-50 rounded-lg p-3">
              Escala: <strong>1-3</strong> Insuficiente · <strong>4-6</strong> En desarrollo · <strong>7-8</strong> Cumple · <strong>9-10</strong> Supera expectativas
            </div>
          )}

          <div className="space-y-3">
            {factoresPorArea(area).map(f => {
              const resp = respuestaPorFactor(f.id)
              return (
                <FactorInput
                  key={f.id}
                  factor={f}
                  nota={editable ? notas[f.id] : resp?.nota_auto}
                  nota_dir={resp?.nota_dir}
                  onNota={(fid, v) => setNotas(n => ({ ...n, [fid]: v }))}
                  readonly={!editable}
                />
              )
            })}
          </div>

          {editable && (
            <div>
              <label className="label">Comentario libre (opcional)</label>
              <textarea
                className="input-field h-20 resize-none"
                placeholder="¿Hay algo que quieras añadir sobre esta área?"
                value={notasTexto[area]}
                onChange={e => setNotasTexto(n => ({ ...n, [area]: e.target.value }))}
              />
            </div>
          )}
          {!editable && evaluacion[`notas_empleado_area${area}`] && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Tu comentario</p>
              <p className="text-sm text-gray-700">{evaluacion[`notas_empleado_area${area}`]}</p>
            </div>
          )}
          {!editable && evaluacion[`notas_director_area${area}`] && (
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-xs font-medium text-orange-700 mb-1">Comentario de dirección</p>
              <p className="text-sm text-gray-700">{evaluacion[`notas_director_area${area}`]}</p>
            </div>
          )}
        </div>
      ))}

      {editable && tabActivo === 4 && (
        <button
          onClick={handleEnviar}
          disabled={!todosRellenados() || enviando}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          {enviando ? 'Enviando...' : 'Enviar autoevaluación'}
        </button>
      )}

      {editable && tabActivo < 4 && (
        <button onClick={() => setTabActivo(t => t + 1)} className="btn-primary w-full">
          Siguiente área →
        </button>
      )}
    </div>
  )
}
