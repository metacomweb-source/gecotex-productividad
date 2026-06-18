import { useEffect, useState, useCallback, Fragment } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  ChevronDown, ChevronRight, User, Clock, TrendingUp, Package,
  AlertTriangle, CheckCircle, Activity, ArrowUp, ArrowDown,
  MoveRight, RefreshCw, Search, ChevronLeft,
} from 'lucide-react'
import { empleadosDashboardApi } from '../api/client'
import { fmtUP, fmtK, nombreMes } from '../utils/formatters'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// ── micro-helpers ─────────────────────────────────────────────────────────────

const Skeleton = ({ h = 'h-32', cls = '' }) => (
  <div className={clsx('bg-gecotex-bg rounded-xl border border-gecotex-border-soft animate-pulse', h, cls)} />
)

const CANAL_COLOR = { verde: '#27AE60', naranja: '#E67E22', rojo: '#C0392B' }
const CANAL_BG    = { verde: 'bg-[#F4FBF7] text-[#196B4A]', naranja: 'bg-[#FEF8F1] text-[#7D4A00]', rojo: 'bg-[#FDF1EF] text-[#7D1F1F]' }

const CanalBadge = ({ canal }) => canal
  ? <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full uppercase', CANAL_BG[canal] ?? 'bg-gray-100 text-gray-500')}>{canal}</span>
  : null

const FaseBadge = ({ fase }) => {
  const MAP = {
    recibido:       'bg-blue-50 text-blue-700',
    en_tramitacion: 'bg-yellow-50 text-yellow-700',
    en_aduana:      'bg-orange-50 text-orange-700',
    levante:        'bg-green-50 text-green-700',
    cerrado:        'bg-gray-100 text-gray-500',
  }
  const LABEL = {
    recibido: 'Recibido', en_tramitacion: 'Tramitación',
    en_aduana: 'En aduana', levante: 'Levante', cerrado: 'Cerrado',
  }
  return (
    <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded-full', MAP[fase] ?? 'bg-gray-100')}>
      {LABEL[fase] ?? fase}
    </span>
  )
}

const Delta = ({ val, invert = false }) => {
  if (val == null) return <span className="text-gray-400 text-xs">—</span>
  const pos = invert ? val < 0 : val > 0
  const neg = invert ? val > 0 : val < 0
  return (
    <span className={clsx('text-xs font-semibold flex items-center gap-0.5',
      pos ? 'text-gecotex-green' : neg ? 'text-gecotex-red' : 'text-gray-400')}>
      {pos ? <ArrowUp size={11} /> : neg ? <ArrowDown size={11} /> : <MoveRight size={11} />}
      {Math.abs(val).toFixed(2)}
    </span>
  )
}

const fmtMin = (min) => {
  if (min == null) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${m}min`
}

// ── KPI card ──────────────────────────────────────────────────────────────────

const KpiCard = ({ titulo, valor, sub, icon: Icon, color, delta, deltaInvert }) => {
  const COLORS = {
    navy:   'bg-gecotex-navy text-white',
    green:  'bg-gecotex-green text-white',
    orange: 'bg-[#E67E22] text-white',
    blue:   'bg-[#2980B9] text-white',
    red:    'bg-gecotex-red text-white',
    gray:   'bg-gray-500 text-white',
  }
  return (
    <div className="bg-white border border-gecotex-border rounded-xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-semibold text-gecotex-ink-sub leading-tight">{titulo}</span>
        {Icon && <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', COLORS[color] ?? COLORS.navy)}>
          <Icon size={15} />
        </div>}
      </div>
      <div className="text-2xl font-bold text-gecotex-ink">{valor ?? '—'}</div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-gecotex-ink-sub">{sub}</span>
        {delta != null && <Delta val={delta} invert={deltaInvert} />}
      </div>
    </div>
  )
}

// ── Pipeline column ───────────────────────────────────────────────────────────

const FASE_LABEL = {
  recibido:       '📧 RECIBIDO',
  en_tramitacion: '📂 TRAMITACIÓN',
  en_aduana:      '📤 EN ADUANA',
  levante:        '✅ LEVANTE',
  cerrado:        '🔒 CERRADO',
}
const FASE_ORDER = ['recibido', 'en_tramitacion', 'en_aduana', 'levante', 'cerrado']

const PipelineColumn = ({ fase, data, faseExpandida, onToggle, faseDetalle, loadingDetalle, mes, año, emp_id, onPageChange }) => {
  const isOpen = faseExpandida === fase
  const alerta = data?.con_alerta

  return (
    <div className={clsx(
      'flex-1 min-w-[130px] border rounded-xl overflow-hidden transition-all',
      alerta ? 'border-gecotex-red' : 'border-gecotex-border'
    )}>
      {/* Header */}
      <button
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
          alerta ? 'bg-[#FDF1EF]' : 'bg-gecotex-bg',
          isOpen && 'border-b border-gecotex-border'
        )}
        onClick={() => onToggle(fase)}
      >
        <div>
          <div className="text-[11px] font-bold text-gecotex-ink leading-tight">{FASE_LABEL[fase]}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-gecotex-ink">{data?.count ?? 0}</span>
            {alerta && <AlertTriangle size={13} className="text-gecotex-red" />}
          </div>
          {data?.tiempo_medio_min != null && (
            <div className="text-[10px] text-gecotex-ink-sub mt-0.5">⌀ {fmtMin(data.tiempo_medio_min)}</div>
          )}
          {fase === 'levante' && data?.por_canal && (
            <div className="flex gap-1 mt-1">
              {['verde', 'naranja', 'rojo'].map(c => data.por_canal[c] > 0 && (
                <span key={c} style={{ background: CANAL_COLOR[c] }}
                  className="text-[9px] text-white font-bold px-1.5 py-0.5 rounded-full">
                  {data.por_canal[c]}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown size={14} className={clsx('text-gecotex-ink-sub transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Expanded list */}
      {isOpen && (
        <div className="bg-white p-2 space-y-1.5">
          {loadingDetalle ? (
            <div className="space-y-1.5">{Array(3).fill(0).map((_, i) => <Skeleton key={i} h="h-10" />)}</div>
          ) : !faseDetalle?.items?.length ? (
            <p className="text-[11px] text-gecotex-ink-sub text-center py-3">Sin expedientes</p>
          ) : (
            <>
              {faseDetalle.items.map(e => (
                <div key={e.id} className={clsx(
                  'rounded-lg p-2 border text-[11px]',
                  e.con_alerta ? 'border-gecotex-red bg-[#FDF1EF]' : 'border-gecotex-border-soft bg-gecotex-bg'
                )}>
                  <div className="font-semibold text-gecotex-ink flex items-center justify-between">
                    <span>{e.numero_expediente}</span>
                    {e.con_alerta && <AlertTriangle size={10} className="text-gecotex-red" />}
                  </div>
                  <div className="text-gecotex-ink-sub truncate">{e.cliente_nombre}</div>
                  <div className="flex items-center justify-between mt-1">
                    <CanalBadge canal={e.canal_respuesta} />
                    {e.tiempo_fase_min != null && (
                      <span className="text-gecotex-ink-sub">{fmtMin(e.tiempo_fase_min)}</span>
                    )}
                  </div>
                </div>
              ))}
              {/* Pagination */}
              {faseDetalle.total > faseDetalle.limit && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    disabled={faseDetalle.page <= 1}
                    onClick={() => onPageChange(faseDetalle.page - 1)}
                    className="disabled:opacity-30 text-gecotex-ink-sub hover:text-gecotex-navy"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] text-gecotex-ink-sub">
                    {faseDetalle.page}/{Math.ceil(faseDetalle.total / faseDetalle.limit)}
                  </span>
                  <button
                    disabled={faseDetalle.page >= Math.ceil(faseDetalle.total / faseDetalle.limit)}
                    onClick={() => onPageChange(faseDetalle.page + 1)}
                    className="disabled:opacity-30 text-gecotex-ink-sub hover:text-gecotex-navy"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardEmpleado({ año, mes }) {
  const [operarios, setOperarios]         = useState([])
  const [empId, setEmpId]                 = useState(null)
  const [kpis, setKpis]                   = useState(null)
  const [pipeline, setPipeline]           = useState(null)
  const [faseExpandida, setFaseExpandida] = useState(null)
  const [faseDetalle, setFaseDetalle]     = useState(null)
  const [upsDiarias, setUpsDiarias]       = useState([])
  const [comparativa, setComparativa]     = useState([])
  const [expedientes, setExpedientes]     = useState(null)
  const [cronometro, setCronometro]       = useState(null)

  const [loadingKpis, setLoadingKpis]         = useState(false)
  const [loadingPipeline, setLoadingPipeline] = useState(false)
  const [loadingDetalle, setLoadingDetalle]   = useState(false)
  const [loadingUps, setLoadingUps]           = useState(false)
  const [loadingComp, setLoadingComp]         = useState(false)
  const [loadingExps, setLoadingExps]         = useState(false)

  // Expedientes table filters
  const [filtroEstado, setFiltroEstado]   = useState('')
  const [filtroCanal, setFiltroCanal]     = useState('')
  const [filtroBuscar, setFiltroBuscar]   = useState('')
  const [expPage, setExpPage]             = useState(1)
  const [faseDetallePage, setFaseDetallePage] = useState(1)

  const p = { mes, año }

  // ── Load operarios list ──────────────────────────────────────────────────

  useEffect(() => {
    empleadosDashboardApi.listaOperarios()
      .then(r => {
        setOperarios(r.data)
        if (r.data.length > 0 && !empId) setEmpId(r.data[0].id)
      })
      .catch(() => toast.error('Error cargando empleados'))
  }, [])

  // ── Load all sections when empId or period changes ───────────────────────

  const cargarKpis = useCallback(async () => {
    if (!empId) return
    setLoadingKpis(true)
    try {
      const [kpisR, cronR] = await Promise.all([
        empleadosDashboardApi.kpisMes(empId, p),
        empleadosDashboardApi.cronometro(empId),
      ])
      setKpis(kpisR.data)
      setCronometro(cronR.data)
    } catch { toast.error('Error cargando KPIs') }
    finally { setLoadingKpis(false) }
  }, [empId, mes, año])

  const cargarPipeline = useCallback(async () => {
    if (!empId) return
    setLoadingPipeline(true)
    setFaseExpandida(null)
    setFaseDetalle(null)
    try {
      const r = await empleadosDashboardApi.pipeline(empId, p)
      setPipeline(r.data)
    } catch { toast.error('Error cargando pipeline') }
    finally { setLoadingPipeline(false) }
  }, [empId, mes, año])

  const cargarUps = useCallback(async () => {
    if (!empId) return
    setLoadingUps(true)
    try {
      const [upsR, compR] = await Promise.all([
        empleadosDashboardApi.upsDiarias(empId, p),
        empleadosDashboardApi.comparativa(empId, p),
      ])
      setUpsDiarias(upsR.data)
      setComparativa(compR.data)
    } catch { toast.error('Error cargando actividad') }
    finally { setLoadingUps(false) }
  }, [empId, mes, año])

  const cargarExpedientes = useCallback(async () => {
    if (!empId) return
    setLoadingExps(true)
    try {
      const r = await empleadosDashboardApi.expedientes(empId, {
        ...p, estado: filtroEstado || undefined, canal: filtroCanal || undefined,
        buscar: filtroBuscar || undefined, page: expPage, limit: 15,
      })
      setExpedientes(r.data)
    } catch { toast.error('Error cargando expedientes') }
    finally { setLoadingExps(false) }
  }, [empId, mes, año, filtroEstado, filtroCanal, filtroBuscar, expPage])

  useEffect(() => { cargarKpis() }, [cargarKpis])
  useEffect(() => { cargarPipeline() }, [cargarPipeline])
  useEffect(() => { cargarUps() }, [cargarUps])
  useEffect(() => { cargarExpedientes() }, [cargarExpedientes])

  // ── Load fase detalle when fase expanded ─────────────────────────────────

  useEffect(() => {
    if (!faseExpandida || !empId) { setFaseDetalle(null); return }
    setLoadingDetalle(true)
    setFaseDetallePage(1)
    empleadosDashboardApi.pipelineFase(empId, faseExpandida, { ...p, page: 1, limit: 5 })
      .then(r => setFaseDetalle(r.data))
      .catch(() => toast.error('Error cargando detalle'))
      .finally(() => setLoadingDetalle(false))
  }, [faseExpandida, empId, mes, año])

  const handleFasePageChange = async (newPage) => {
    setLoadingDetalle(true)
    try {
      const r = await empleadosDashboardApi.pipelineFase(empId, faseExpandida, { ...p, page: newPage, limit: 5 })
      setFaseDetalle(r.data)
      setFaseDetallePage(newPage)
    } catch { toast.error('Error') }
    finally { setLoadingDetalle(false) }
  }

  const handleToggleFase = (fase) => setFaseExpandida(prev => prev === fase ? null : fase)

  // ── Derived data ─────────────────────────────────────────────────────────

  const empleadoActual = operarios.find(o => o.id === empId)
  const idxActual = operarios.findIndex(o => o.id === empId)

  const donutData = kpis?.canales
    ? Object.entries(kpis.canales).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }))
    : []
  const donutColors = { verde: '#27AE60', naranja: '#E67E22', rojo: '#C0392B', pendiente: '#BDC3C7' }

  const barData = upsDiarias.filter(d => !d.futuro && d.laborable).map(d => ({
    dia: `${d.dia}`,
    ups: d.ups ?? 0,
    obj: d.objetivo_diario,
  }))

  // ── Render ───────────────────────────────────────────────────────────────

  if (!operarios.length) {
    return (
      <div className="py-20 text-center text-gecotex-ink-sub">
        <User size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No hay operarios disponibles.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Selector de empleado ────────────────────────────────────────── */}
      <div className="bg-white border border-gecotex-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <button
            disabled={idxActual <= 0}
            onClick={() => setEmpId(operarios[idxActual - 1].id)}
            className="disabled:opacity-30 text-gecotex-ink-sub hover:text-gecotex-navy transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <select
            className="flex-1 bg-gecotex-bg border border-gecotex-border rounded-lg text-sm font-semibold px-3 py-2 outline-none"
            value={empId ?? ''}
            onChange={e => setEmpId(+e.target.value)}
          >
            {operarios.map(op => (
              <option key={op.id} value={op.id}>{op.nombre} {op.apellidos} {op.sede ? `· ${op.sede}` : ''}</option>
            ))}
          </select>
          <button
            disabled={idxActual >= operarios.length - 1}
            onClick={() => setEmpId(operarios[idxActual + 1].id)}
            className="disabled:opacity-30 text-gecotex-ink-sub hover:text-gecotex-navy transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Identity mini-card */}
        {empleadoActual && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gecotex-navy text-white flex items-center justify-center font-bold text-sm shrink-0">
              {empleadoActual.nombre[0]}{empleadoActual.apellidos?.[0] ?? ''}
            </div>
            <div>
              <div className="font-semibold text-sm text-gecotex-ink">{empleadoActual.nombre} {empleadoActual.apellidos}</div>
              <div className="text-[11px] text-gecotex-ink-sub">
                {empleadoActual.sede ?? '—'}
                {empleadoActual.fecha_incorporacion && ` · desde ${empleadoActual.fecha_incorporacion.slice(0, 7)}`}
              </div>
            </div>
            {cronometro && (
              <div className="ml-2 bg-[#F4FBF7] border border-[#27AE60]/30 text-[#196B4A] rounded-lg px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5">
                <Activity size={12} className="animate-pulse" />
                Activo · {cronometro.numero_expediente}
              </div>
            )}
          </div>
        )}

        <button onClick={() => { cargarKpis(); cargarPipeline(); cargarUps(); cargarExpedientes() }}
          className="text-gecotex-ink-sub hover:text-gecotex-navy transition-colors shrink-0" title="Refrescar">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      {loadingKpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} h="h-28" />)}
        </div>
      ) : kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            titulo="UPs del mes"
            valor={kpis.ups_producidas != null ? fmtUP(kpis.ups_producidas) : '—'}
            sub={kpis.ups_objetivo ? `Obj: ${fmtUP(kpis.ups_objetivo)}` : 'Sin objetivo'}
            icon={TrendingUp} color="navy"
            delta={kpis.diferencia_ups}
          />
          <KpiCard
            titulo="% Objetivo"
            valor={kpis.pct_objetivo != null ? `${kpis.pct_objetivo.toFixed(1)}%` : '—'}
            sub="Cumplimiento mensual"
            icon={CheckCircle}
            color={kpis.pct_objetivo >= 100 ? 'green' : kpis.pct_objetivo >= 85 ? 'orange' : 'red'}
          />
          <KpiCard
            titulo="Factor K"
            valor={kpis.factor_k != null ? fmtK(kpis.factor_k) : '—'}
            sub="Productividad relativa"
            icon={Activity} color="blue"
            delta={kpis.factor_k != null && kpis.factor_k_anterior != null
              ? +(kpis.factor_k - kpis.factor_k_anterior).toFixed(3) : null}
          />
          <KpiCard
            titulo="Expedientes"
            valor={kpis.expedientes_total ?? '—'}
            sub="Este mes"
            icon={Package} color="navy"
          />
          <KpiCard
            titulo="% Incidencias"
            valor={kpis.pct_incidencia != null ? `${kpis.pct_incidencia}%` : '—'}
            sub={`Nar: ${kpis.canales?.naranja ?? 0} · Roj: ${kpis.canales?.rojo ?? 0}`}
            icon={AlertTriangle}
            color={kpis.pct_incidencia > 15 ? 'red' : kpis.pct_incidencia > 5 ? 'orange' : 'green'}
          />
          <KpiCard
            titulo="Tiempo tram."
            valor={fmtMin(kpis.tiempo_medio_tramitacion_min)}
            sub={kpis.tiempo_medio_tramitacion_equipo_min
              ? `Equipo: ${fmtMin(kpis.tiempo_medio_tramitacion_equipo_min)}`
              : 'Media equipo —'}
            icon={Clock} color="gray"
            delta={kpis.tiempo_medio_tramitacion_min != null && kpis.tiempo_medio_tramitacion_equipo_min != null
              ? +(kpis.tiempo_medio_tramitacion_min - kpis.tiempo_medio_tramitacion_equipo_min).toFixed(1)
              : null}
            deltaInvert
          />
        </div>
      )}

      {/* ── Pipeline kanban ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gecotex-border rounded-xl p-4">
        <h3 className="text-[13px] font-bold text-gecotex-ink mb-3">Pipeline de expedientes activos</h3>
        {loadingPipeline ? (
          <div className="flex gap-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} h="h-28" cls="flex-1" />)}</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FASE_ORDER.map(fase => (
              <PipelineColumn
                key={fase}
                fase={fase}
                data={pipeline?.[fase]}
                faseExpandida={faseExpandida}
                onToggle={handleToggleFase}
                faseDetalle={faseExpandida === fase ? faseDetalle : null}
                loadingDetalle={loadingDetalle && faseExpandida === fase}
                mes={mes} año={año} emp_id={empId}
                onPageChange={handleFasePageChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Gráficas ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart UPs diarias */}
        <div className="lg:col-span-2 bg-white border border-gecotex-border rounded-xl p-4">
          <h3 className="text-[13px] font-bold text-gecotex-ink mb-3">
            UPs diarias — {nombreMes(mes)} {año}
          </h3>
          {loadingUps ? <Skeleton h="h-52" /> : barData.length === 0 ? (
            <p className="text-sm text-gecotex-ink-sub text-center py-10">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v, n) => [v?.toFixed(2), n === 'ups' ? 'UPs' : 'Objetivo']}
                />
                {barData[0]?.obj != null && (
                  <Bar dataKey="obj" fill="#E2E8F0" radius={[3, 3, 0, 0]} name="Objetivo" />
                )}
                <Bar dataKey="ups" fill="#1F5C99" radius={[3, 3, 0, 0]} name="UPs" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut canales */}
        <div className="bg-white border border-gecotex-border rounded-xl p-4">
          <h3 className="text-[13px] font-bold text-gecotex-ink mb-3">Canal AEAT</h3>
          {loadingKpis ? <Skeleton h="h-52" /> : donutData.length === 0 ? (
            <p className="text-sm text-gecotex-ink-sub text-center py-10">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={donutData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={donutColors[entry.name] ?? '#BDC3C7'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Expedientes tabla ────────────────────────────────────────────── */}
      <div className="bg-white border border-gecotex-border rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gecotex-border-soft">
          <h3 className="text-[13px] font-bold text-gecotex-ink">Expedientes del período</h3>
          <div className="flex flex-wrap items-center gap-2">
            {/* Buscar */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gecotex-ink-sub" />
              <input
                className="bg-gecotex-bg border border-gecotex-border rounded-lg text-sm pl-7 pr-3 py-1.5 outline-none w-44"
                placeholder="Expediente / cliente"
                value={filtroBuscar}
                onChange={e => { setFiltroBuscar(e.target.value); setExpPage(1) }}
              />
            </div>
            {/* Estado */}
            <select
              className="bg-gecotex-bg border border-gecotex-border rounded-lg text-sm px-2 py-1.5 outline-none"
              value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setExpPage(1) }}
            >
              <option value="">Todos</option>
              <option value="abiertos">Abiertos</option>
              <option value="cerrados">Cerrados</option>
            </select>
            {/* Canal */}
            <select
              className="bg-gecotex-bg border border-gecotex-border rounded-lg text-sm px-2 py-1.5 outline-none"
              value={filtroCanal} onChange={e => { setFiltroCanal(e.target.value); setExpPage(1) }}
            >
              <option value="">Canal (todos)</option>
              <option value="verde">Verde</option>
              <option value="naranja">Naranja</option>
              <option value="rojo">Rojo</option>
            </select>
          </div>
        </div>

        {loadingExps ? (
          <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} h="h-8" />)}</div>
        ) : !expedientes?.items?.length ? (
          <p className="text-sm text-gecotex-ink-sub text-center py-10">Sin expedientes</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gecotex-bg border-b border-gecotex-border-soft">
                    {['Expediente', 'Cliente', 'Tipo DUA', 'Tráfico', 'UPs', 'Canal', 'Fase', 'T. tramit.'].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-gecotex-ink-sub px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expedientes.items.map((e, i) => (
                    <tr key={e.id} className={clsx('border-b border-gecotex-border-soft hover:bg-gecotex-bg transition-colors',
                      i % 2 === 0 ? '' : 'bg-[#FAFAFA]')}>
                      <td className="px-3 py-2 font-semibold text-gecotex-navy text-[12px] whitespace-nowrap">{e.numero_expediente}</td>
                      <td className="px-3 py-2 text-[12px] text-gecotex-ink max-w-[140px] truncate">{e.cliente_nombre}</td>
                      <td className="px-3 py-2 text-[12px] text-gecotex-ink-sub whitespace-nowrap">{e.tipo_dua ?? '—'}</td>
                      <td className="px-3 py-2 text-[12px] text-gecotex-ink-sub">{e.tipo_trafico ?? '—'}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-gecotex-ink">{e.up_calculadas?.toFixed(2) ?? '—'}</td>
                      <td className="px-3 py-2"><CanalBadge canal={e.canal_respuesta} /></td>
                      <td className="px-3 py-2"><FaseBadge fase={e.fase} /></td>
                      <td className="px-3 py-2 text-[12px] text-gecotex-ink-sub whitespace-nowrap">{fmtMin(e.tiempo_tramitacion_min)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Paginación */}
            {expedientes.total > 15 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gecotex-border-soft">
                <span className="text-[11px] text-gecotex-ink-sub">
                  {expedientes.total} expedientes · pág. {expPage}/{Math.ceil(expedientes.total / 15)}
                </span>
                <div className="flex gap-1">
                  <button disabled={expPage <= 1} onClick={() => setExpPage(p => p - 1)}
                    className="disabled:opacity-30 border border-gecotex-border rounded-lg px-2.5 py-1 text-xs hover:bg-gecotex-bg">
                    ← Ant.
                  </button>
                  <button disabled={expPage >= Math.ceil(expedientes.total / 15)} onClick={() => setExpPage(p => p + 1)}
                    className="disabled:opacity-30 border border-gecotex-border rounded-lg px-2.5 py-1 text-xs hover:bg-gecotex-bg">
                    Sig. →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Comparativa equipo ───────────────────────────────────────────── */}
      {comparativa.length > 0 && (
        <div className="bg-white border border-gecotex-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gecotex-border-soft">
            <h3 className="text-[13px] font-bold text-gecotex-ink">Comparativa con el equipo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gecotex-bg border-b border-gecotex-border-soft">
                  {['KPI', 'Este empleado', 'Media equipo', 'Mejor', 'Posición'].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-gecotex-ink-sub px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparativa.map((row, i) => {
                  const emp = row.valor_empleado
                  const med = row.media_equipo
                  const pos = row.posicion
                  const tot = row.total
                  const hb = row.higher_better
                  const isGood = emp != null && med != null && (hb ? emp >= med : emp <= med)
                  return (
                    <tr key={i} className="border-b border-gecotex-border-soft hover:bg-gecotex-bg">
                      <td className="px-4 py-2.5 font-semibold text-[12px] text-gecotex-ink">{row.kpi}</td>
                      <td className="px-4 py-2.5 text-[12px]">
                        <span className={clsx('font-semibold', isGood ? 'text-gecotex-green' : 'text-gecotex-red')}>
                          {emp != null ? (typeof emp === 'number' ? emp.toFixed(emp < 10 ? 2 : 0) : emp) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-gecotex-ink-sub">
                        {med != null ? (typeof med === 'number' ? med.toFixed(med < 10 ? 2 : 0) : med) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-gecotex-ink-sub">
                        {row.mejor_valor != null ? (typeof row.mejor_valor === 'number' ? row.mejor_valor.toFixed(row.mejor_valor < 10 ? 2 : 0) : row.mejor_valor) : '—'}
                        {row.mejor_nombre && row.mejor_nombre !== '—' && (
                          <span className="text-[10px] ml-1 text-gecotex-ink-sub">({row.mejor_nombre})</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {pos != null ? (
                          <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full',
                            pos === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-gecotex-bg text-gecotex-ink-sub')}>
                            #{pos} / {tot}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
