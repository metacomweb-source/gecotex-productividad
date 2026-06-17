import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ChevronLeft, Save, Star, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const AREAS_META = {
  1: { nombre: 'Productividad DUAs', peso: 0.40 },
  2: { nombre: 'Calidad Operativa', peso: 0.30 },
  3: { nombre: 'Gecotex Corporate', peso: 0.20 },
  4: { nombre: 'Digitalización y Adaptación', peso: 0.10 },
}

function NoteInput({ valor, onChange, placeholder = '—' }) {
  return (
    <input
      type="number"
      min={1} max={10} step={0.5}
      value={valor ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
      className="w-16 text-center input-field text-base font-semibold border-orange-300 focus:border-orange-500"
      placeholder={placeholder}
    />
  )
}

function FactorRow({ factor, respuesta, notaDir, onNotaDir }) {
  const notaFinal = respuesta?.nota_auto != null && notaDir != null
    ? (respuesta.nota_auto * 0.30 + notaDir * 0.70).toFixed(1)
    : null

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2">
        <p className="text-sm font-medium text-gray-800">{factor.nombre}</p>
        {factor.nota_contexto && <p className="text-xs text-gray-500 mt-0.5">{factor.nota_contexto}</p>}
      </div>
      <div className="grid grid-cols-2 divide-x">
        {/* Izquierda: autoevaluación */}
        <div className="p-4 bg-blue-50/50 space-y-2">
          <p className="text-xs font-medium text-blue-700">Autoevaluación del empleado</p>
          <p className="text-2xl font-bold text-blue-600">
            {respuesta?.nota_auto != null ? respuesta.nota_auto.toFixed(1) : <span className="text-gray-300 text-base">Sin nota</span>}
          </p>
          {respuesta?.comentario_auto && (
            <p className="text-xs text-gray-600 italic">"{respuesta.comentario_auto}"</p>
          )}
        </div>
        {/* Derecha: evaluación dirección */}
        <div className="p-4 bg-orange-50/50 space-y-2">
          <p className="text-xs font-medium text-orange-700">Evaluación dirección</p>
          <div className="flex items-center gap-2">
            <NoteInput valor={notaDir} onChange={onNotaDir} />
            <span className="text-xs text-gray-400">/10</span>
            {notaFinal && (
              <span className="ml-auto text-sm font-bold text-gecotex-primary">
                Final: {notaFinal}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FormularioEvalDir() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evaluacion, setEvaluacion] = useState(null)
  const [factores, setFactores] = useState([])
  const [notasDir, setNotasDir] = useState({})
  const [notasTexto, setNotasTexto] = useState({ 2: '', 3: '', 4: '' })
  const [tabActivo, setTabActivo] = useState(2)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/bonus/evaluaciones/${id}`),
      api.get('/bonus/factores'),
    ]).then(([evR, facR]) => {
      const ev = evR.data
      setEvaluacion(ev)
      setFactores(facR.data)
      const m = {}
      ev.respuestas?.forEach(r => { if (r.nota_dir != null) m[r.factor_id] = r.nota_dir })
      setNotasDir(m)
      setNotasTexto({
        2: ev.notas_director_area2 || '',
        3: ev.notas_director_area3 || '',
        4: ev.notas_director_area4 || '',
      })
    }).catch(() => toast.error('Error al cargar la evaluación'))
      .finally(() => setLoading(false))
  }, [id])

  const factoresPorArea = area => factores.filter(f => f.area === area && f.activo)
  const respPorFactor = fid => evaluacion?.respuestas?.find(r => r.factor_id === fid)

  const calcPuntuacionArea = (area) => {
    const fs = factoresPorArea(area)
    if (!fs.length) return null
    const notas = fs.map(f => {
      const resp = respPorFactor(f.id)
      const auto = resp?.nota_auto
      const dir = notasDir[f.id]
      if (auto != null && dir != null) return auto * 0.30 + dir * 0.70
      if (dir != null) return dir
      if (auto != null) return auto
      return null
    }).filter(n => n != null)
    return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null
  }

  const calcPuntuacionTotal = () => {
    const p1 = evaluacion?.puntuacion_area1 || 0
    const p2 = calcPuntuacionArea(2) || 0
    const p3 = calcPuntuacionArea(3) || 0
    const p4 = calcPuntuacionArea(4) || 0
    return p1 * 0.40 + p2 * 0.30 + p3 * 0.20 + p4 * 0.10
  }

  const calcBonusEstimado = () => {
    if (!evaluacion?.salario_bruto_anual) return null
    const total = calcPuntuacionTotal()
    let pct = 0
    if (total >= 8.5) pct = 1.0
    else if (total >= 7.0) pct = 0.60
    else if (total >= 5.0) pct = 0.25
    return (evaluacion.salario_bruto_anual * evaluacion.pct_maximo_bonus * pct) / 2
  }

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const respuestas = factores.map(f => ({
        factor_id: f.id,
        nota_dir: notasDir[f.id] ?? null,
        comentario_dir: null,
      }))
      const r = await api.put(`/bonus/evaluaciones/${id}/dir`, {
        respuestas,
        notas_area2: notasTexto[2],
        notas_area3: notasTexto[3],
        notas_area4: notasTexto[4],
      })
      setEvaluacion(r.data)
      toast.success('Evaluación guardada y cálculo completado')
      navigate('/evaluaciones-bonus')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <Loader2 size={28} className="animate-spin text-gecotex-primary" />
    </div>
  )

  if (!evaluacion) return <p className="text-gray-500">Evaluación no encontrada.</p>

  const readonly = evaluacion.estado === 'cerrada'
  const punTotal = calcPuntuacionTotal()
  const bonusEst = calcBonusEstimado()

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/evaluaciones-bonus')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gecotex-primary">
            Evaluación — {evaluacion.empleado_nombre}
          </h1>
          <p className="text-sm text-gray-500">Semestre {evaluacion.semestre}/{evaluacion.año}</p>
        </div>
      </div>

      {/* Footer sticky con cálculo en tiempo real */}
      <div className="sticky top-0 z-10 card bg-white border shadow-sm">
        <div className="flex items-center gap-6 flex-wrap">
          {[2, 3, 4].map(a => {
            const p = calcPuntuacionArea(a)
            return (
              <div key={a} className="text-center">
                <p className="text-xs text-gray-500">Área {a}</p>
                <p className={`text-lg font-bold ${p == null ? 'text-gray-300' : p >= 7 ? 'text-green-600' : p >= 5 ? 'text-orange-500' : 'text-red-500'}`}>
                  {p != null ? p.toFixed(1) : '—'}
                </p>
              </div>
            )
          })}
          <div className="text-center border-l pl-6">
            <p className="text-xs text-gray-500">Puntuación Total</p>
            <p className={`text-2xl font-bold ${punTotal >= 8.5 ? 'text-green-600' : punTotal >= 7 ? 'text-orange-500' : 'text-red-500'}`}>
              {punTotal.toFixed(1)}
            </p>
          </div>
          {bonusEst != null && (
            <div className="text-center border-l pl-6">
              <p className="text-xs text-gray-500">Bonus estimado</p>
              <p className="text-xl font-bold text-gecotex-primary">
                {bonusEst.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Área 1 resumen */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-gecotex-primary" />
          <h2 className="font-semibold text-gray-800">Área 1 — Productividad DUAs (calculada automáticamente)</h2>
          <span className={`ml-auto text-lg font-bold ${evaluacion.puntuacion_area1 >= 7 ? 'text-green-600' : 'text-orange-500'}`}>
            {evaluacion.puntuacion_area1?.toFixed(1) || '—'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Factor K</p>
            <p className="font-bold text-gecotex-primary">{evaluacion.factor_k_promedio?.toFixed(3) || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">% SLA</p>
            <p className="font-bold text-gecotex-primary">{evaluacion.pct_sla?.toFixed(1) || '—'}%</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">% Registro</p>
            <p className="font-bold text-gecotex-primary">{evaluacion.pct_registro?.toFixed(1) || '—'}%</p>
          </div>
        </div>
      </div>

      {/* Tabs áreas 2-4 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[2, 3, 4].map(a => (
          <button
            key={a}
            onClick={() => setTabActivo(a)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tabActivo === a ? 'bg-white shadow text-gecotex-primary' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Área {a} — {AREAS_META[a].nombre}
          </button>
        ))}
      </div>

      {[2, 3, 4].map(area => tabActivo === area && (
        <div key={area} className="space-y-4">
          {factoresPorArea(area).map(f => (
            <FactorRow
              key={f.id}
              factor={f}
              respuesta={respPorFactor(f.id)}
              notaDir={notasDir[f.id]}
              onNotaDir={v => setNotasDir(n => ({ ...n, [f.id]: v }))}
            />
          ))}
          {!readonly && (
            <div>
              <label className="label">Comentario de dirección — Área {area} (opcional)</label>
              <textarea
                className="input-field h-20 resize-none"
                value={notasTexto[area]}
                onChange={e => setNotasTexto(n => ({ ...n, [area]: e.target.value }))}
                placeholder="Observaciones generales sobre esta área..."
              />
            </div>
          )}
          {evaluacion[`notas_empleado_area${area}`] && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Comentario del empleado</p>
              <p className="text-sm text-gray-700">{evaluacion[`notas_empleado_area${area}`]}</p>
            </div>
          )}
        </div>
      ))}

      {!readonly && tabActivo === 4 && (
        <button onClick={handleGuardar} disabled={guardando} className="btn-primary w-full flex items-center justify-center gap-2">
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {guardando ? 'Guardando...' : 'Guardar evaluación y calcular bonus'}
        </button>
      )}

      {!readonly && tabActivo < 4 && (
        <button onClick={() => setTabActivo(t => t + 1)} className="btn-primary w-full">
          Siguiente área →
        </button>
      )}
    </div>
  )
}
