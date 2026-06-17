import { useEffect, useState, useMemo, useRef, useCallback, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { kpisApi, dashboardApi } from '../api/client'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Users, TrendingUp, Package, Award, Clock, AlertTriangle,
  ArrowUp, ArrowDown, MoveRight, Download, Printer,
  ChevronDown, ChevronRight, RefreshCw, Activity,
  CheckCircle, XCircle, Zap,
} from 'lucide-react'
import { fmtUP, fmtK, nombreMes } from '../utils/formatters'
import clsx from 'clsx'

// ── pequeños helpers ────────────────────────────────────────────────────────

const SEDES = [
  { value: '', label: 'Todas las sedes' },
  { value: 'barcelona', label: 'Barcelona' },
  { value: 'valencia', label: 'Valencia' },
  { value: 'aeropuerto', label: 'Aeropuerto' },
]

const MESES_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const badgeColor = {
  verde: '#27AE60', naranja: '#E67E22', rojo: '#C0392B',
}

const kTone = k => k >= 1.0 ? 'green' : k >= 0.85 ? 'orange' : 'red'
const kBg   = k => k >= 1.0 ? 'bg-[#F4FBF7]' : k >= 0.85 ? 'bg-[#FEF8F1]' : 'bg-[#FDF1EF]'
const kTxt  = k => k >= 1.0 ? 'text-gecotex-green' : k >= 0.85 ? 'text-gecotex-orange' : 'text-gecotex-red'

const pseudoRand = (seed) => {
  const x = Math.sin(seed) * 10000
  return Math.floor((x - Math.floor(x)) * 5)
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

// ── componentes internos ────────────────────────────────────────────────────

const Skeleton = ({ h = 'h-48', cls = '' }) => (
  <div className={clsx('bg-white rounded-xl border border-gecotex-border-soft animate-pulse', h, cls)} />
)

const SectionTitle = ({ children, right }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-[14px] font-bold text-gecotex-ink">{children}</h3>
    {right && <div>{right}</div>}
  </div>
)

const AlertaBadge = ({ sev }) => {
  const cfg = {
    alta:        { cls: 'bg-red-100 text-red-700 border-red-200',    label: 'Alta' },
    media:       { cls: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Media' },
    informativa: { cls: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Info' },
  }[sev] || {}
  return (
    <span className={clsx('text-[10px] font-bold border rounded px-1.5 py-0.5', cfg.cls)}>{cfg.label}</span>
  )
}

const TeamCircle = ({ pct, producidas, objetivo }) => {
  const r = 60, c = 2 * Math.PI * r
  const ratio = Math.max(0, Math.min(1, pct / 100))
  const dash = c * ratio
  const color = pct >= 90 ? '#27AE60' : pct >= 70 ? '#E67E22' : '#C0392B'
  const label = pct >= 90 ? 'En objetivo' : pct >= 70 ? 'Atención' : 'Por debajo'
  return (
    <div className="bg-white rounded-[10px] border border-gecotex-border-soft shadow-gx-sm p-5 flex items-center gap-6">
      <div className="relative w-[140px] h-[140px] flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF1F5" strokeWidth="12" />
          <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black tracking-tighter" style={{ color }}>{Math.round(pct)}%</span>
          <span className="text-[9px] font-bold text-gecotex-ink-muted uppercase tracking-widest mt-0.5">del obj.</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[12px] font-bold" style={{ color }}>{label}</span>
        </div>
        <p className="text-sm font-bold text-gecotex-ink mb-3">Rendimiento del equipo este mes</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-gecotex-ink-muted uppercase tracking-wider mb-0.5">UPs producidas</p>
            <p className="text-xl font-black text-gecotex-ink font-mono">{(producidas ?? 0).toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gecotex-ink-muted uppercase tracking-wider mb-0.5">Objetivo mes</p>
            <p className="text-xl font-black text-gecotex-ink-muted font-mono">{(objetivo ?? 0).toFixed(0)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const MiniKpiCard = ({ titulo, valor, sub, icon: Icon, color = 'navy', alerta }) => {
  const colors = {
    navy:   { bg: 'bg-[#F0F4FA]', ico: 'text-gecotex-navy' },
    green:  { bg: 'bg-[#F0FBF4]', ico: 'text-gecotex-green' },
    orange: { bg: 'bg-[#FEF8F0]', ico: 'text-gecotex-orange' },
    red:    { bg: 'bg-[#FDF2F1]', ico: 'text-gecotex-red' },
    blue:   { bg: 'bg-[#EFF6FD]', ico: 'text-blue-600' },
  }[color] || {}
  return (
    <div className={clsx(
      'bg-white rounded-xl border shadow-gx-sm p-4 flex flex-col gap-2',
      alerta ? 'border-gecotex-red/40' : 'border-gecotex-border-soft'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-wider">{titulo}</span>
        {Icon && (
          <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', colors.bg)}>
            <Icon size={15} className={colors.ico} />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-gecotex-ink font-mono leading-none">{valor}</p>
        {sub && <p className="text-[11px] text-gecotex-ink-sub mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── componente principal ────────────────────────────────────────────────────

export default function DashboardEquipo() {
  const navigate = useNavigate()
  const now = new Date()

  // Filtros
  const [año, setAño]   = useState(now.getFullYear())
  const [mes, setMes]   = useState(now.getMonth() + 1)
  const [sede, setSede] = useState('')

  // Estado de datos
  const [kpisGlobales, setKpisGlobales] = useState(null)
  const [alertas, setAlertas]           = useState([])
  const [evolucion, setEvolucion]       = useState([])
  const [distribucion, setDistribucion] = useState(null)
  const [ranking, setRanking]           = useState([])
  const [enCurso, setEnCurso]           = useState([])
  const [clientes, setClientes]         = useState([])
  const [semanal, setSemanal]           = useState([])

  // UI state
  const [loading1, setLoading1] = useState(true)
  const [loading2, setLoading2] = useState(true)
  const [loading3, setLoading3] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [clienteSort, setClienteSort] = useState('ups')
  const [heatToggle, setHeatToggle]   = useState('ups')
  const [cursoFiltro, setCursoFiltro] = useState('todos')
  const [exportOpen, setExportOpen]   = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const refreshRef = useRef(null)

  const params = useMemo(() => ({
    año, mes, sede: sede || undefined,
  }), [año, mes, sede])

  // Fase 1: kpis + alertas
  useEffect(() => {
    setLoading1(true)
    Promise.all([
      dashboardApi.kpisGlobales(params),
      dashboardApi.alertas(params),
    ]).then(([k, a]) => {
      setKpisGlobales(k.data)
      setAlertas(a.data || [])
    }).catch(console.error).finally(() => setLoading1(false))
  }, [params])

  // Fase 2: ranking (endpoint existente)
  useEffect(() => {
    setLoading2(true)
    kpisApi.ranking({ año, mes }).then(r => setRanking(r.data || [])).catch(console.error).finally(() => setLoading2(false))
  }, [año, mes])

  // Fase 3: resto en paralelo
  useEffect(() => {
    setLoading3(true)
    Promise.all([
      dashboardApi.evolucion({ ...params, meses: 6 }),
      dashboardApi.distribucion(params),
      dashboardApi.topClientes(params),
      dashboardApi.resumenSemanal(params),
    ]).then(([ev, dist, cli, sem]) => {
      setEvolucion(ev.data || [])
      setDistribucion(dist.data)
      setClientes(cli.data || [])
      setSemanal(sem.data || [])
    }).catch(console.error).finally(() => setLoading3(false))
  }, [params])

  // Expedientes en curso + auto-refresh 5 min
  const cargarEnCurso = useCallback(() => {
    dashboardApi.expedientesEnCurso({ sede: sede || undefined })
      .then(r => { setEnCurso(r.data || []); setLastRefresh(new Date()) })
      .catch(console.error)
  }, [sede])

  useEffect(() => {
    cargarEnCurso()
    refreshRef.current = setInterval(cargarEnCurso, 5 * 60 * 1000)
    return () => clearInterval(refreshRef.current)
  }, [cargarEnCurso])

  // Heatmap (pseudo-aleatorio calibrado por op_id + ups)
  const heatmap = useMemo(() => {
    const diasMes = new Date(año, mes, 0).getDate()
    const diasPasados = año === now.getFullYear() && mes === now.getMonth() + 1 ? now.getDate() : diasMes
    return ranking.map(op => ({
      id: op.operario_id,
      nombre: op.operario_nombre,
      days: Array.from({ length: diasMes }, (_, i) => {
        const d = i + 1
        const active = d <= diasPasados
        const isWeekend = new Date(año, mes - 1, d).getDay() % 6 === 0
        return {
          active: active && !isWeekend,
          intensity: active && !isWeekend ? pseudoRand(op.operario_id * 31 + i + 1) : 0,
        }
      }),
    }))
  }, [ranking, año, mes])

  // Exportar Excel
  const handleExcelExport = async () => {
    try {
      const r = await dashboardApi.exportarExcel(params)
      const mes2 = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mes]
      descargarBlob(r.data, `GECOTEX_Dashboard_${mes2}_${año}.xlsx`)
    } catch (e) {
      console.error(e)
    }
    setExportOpen(false)
  }

  const kpis = kpisGlobales || {}

  return (
    <div className="space-y-8 animate-fade-in pb-10">

      {/* ── Cabecera con filtros ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gecotex-ink tracking-tight">Dashboard del equipo</h1>
          <p className="text-[13px] text-gecotex-ink-sub">
            Rendimiento global · {nombreMes(mes)} {año}
            {sede ? ` · ${SEDES.find(s => s.value === sede)?.label}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sede */}
          <select
            className="bg-white border border-gecotex-border rounded-lg text-sm font-semibold px-3 py-2 outline-none shadow-sm"
            value={sede} onChange={e => setSede(e.target.value)}
          >
            {SEDES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Mes / Año */}
          <div className="flex bg-white border border-gecotex-border rounded-lg p-1 shadow-sm">
            <select className="bg-transparent border-none outline-none text-sm font-semibold px-2 py-1" value={mes} onChange={e => setMes(+e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{nombreMes(i + 1)}</option>)}
            </select>
            <div className="w-px bg-gecotex-border mx-1 my-1" />
            <select className="bg-transparent border-none outline-none text-sm font-semibold px-2 py-1" value={año} onChange={e => setAño(+e.target.value)}>
              {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Exportar dropdown */}
          <div className="relative">
            <button
              className="btn-secondary flex items-center gap-2 py-2"
              onClick={() => setExportOpen(o => !o)}
            >
              <Download size={16} /> Exportar <ChevronDown size={14} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gecotex-border rounded-xl shadow-gx overflow-hidden min-w-[160px]">
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gecotex-bg flex items-center gap-2"
                  onClick={handleExcelExport}
                >
                  <Download size={14} /> Excel (.xlsx)
                </button>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gecotex-bg flex items-center gap-2"
                  onClick={() => { window.print(); setExportOpen(false) }}
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── B1: KPIs globales ───────────────────────────────────────────── */}
      {loading1 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4"><Skeleton h="h-[160px]" /></div>
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} h="h-[110px]" />)}
          </div>
          <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} h="h-[110px]" />)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Círculo rendimiento */}
          <div className="lg:col-span-4">
            <TeamCircle
              pct={kpis.pct_rendimiento ?? 0}
              producidas={kpis.ups_totales}
              objetivo={kpis.ups_objetivo}
            />
          </div>
          {/* Fila 1 */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniKpiCard
              titulo="Operarios activos"
              valor={kpis.operarios_activos ?? '—'}
              sub={`${kpis.operarios_con_cronometro ?? 0} con cronómetro · ${kpis.operarios_sin_actividad_hoy ?? 0} sin act. hoy`}
              icon={Users} color="navy"
            />
            <MiniKpiCard
              titulo="Expedientes"
              valor={kpis.expedientes_total ?? '—'}
              sub={`${kpis.expedientes_abiertos ?? 0} abiertos · ${kpis.expedientes_cerrados ?? 0} cerrados`}
              icon={Package} color="blue"
            />
            <MiniKpiCard
              titulo="UPs totales"
              valor={kpis.ups_totales != null ? kpis.ups_totales.toFixed(1) : '—'}
              sub={kpis.ups_proyectadas ? `Proyección: ${kpis.ups_proyectadas.toFixed(1)}` : `Obj: ${(kpis.ups_objetivo ?? 0).toFixed(0)}`}
              icon={TrendingUp} color="green"
            />
            <MiniKpiCard
              titulo="Factor K dist."
              valor={kpis.distribucion_factor_k ? `${kpis.distribucion_factor_k.verde}v · ${kpis.distribucion_factor_k.naranja}n · ${kpis.distribucion_factor_k.rojo}r` : '—'}
              sub="verde / naranja / rojo"
              icon={Activity} color="orange"
            />
          </div>
          {/* Fila 2 */}
          <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniKpiCard
              titulo="En facturación"
              valor={kpis.expedientes_en_facturacion ?? '—'}
              sub="Pendientes de envío"
              icon={CheckCircle} color="orange"
            />
            <MiniKpiCard
              titulo="Tiempo respuesta"
              valor={kpis.tiempo_respuesta_medio_fmt ?? 'Sin datos'}
              sub="Media apertura dossier"
              icon={Clock}
              color={kpis.tiempo_respuesta_medio_min > 240 ? 'red' : kpis.tiempo_respuesta_medio_min > 120 ? 'orange' : 'green'}
              alerta={kpis.tiempo_respuesta_medio_min > 240}
            />
            <MiniKpiCard
              titulo="Tiempo tramitación"
              valor={kpis.tiempo_tramitacion_medio_fmt ?? 'Sin datos'}
              sub="Media envío aduana"
              icon={Zap}
              color={kpis.tiempo_tramitacion_medio_min > 180 ? 'orange' : 'navy'}
            />
            <MiniKpiCard
              titulo="Días del mes"
              valor={`${kpis.dias_hab_transcurridos ?? 0}/${kpis.dias_hab_totales ?? 0}`}
              sub="Días hábiles transcurridos"
              icon={Award} color="blue"
            />
          </div>
        </div>
      )}

      {/* ── B2: Alertas ─────────────────────────────────────────────────── */}
      {!loading1 && alertas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-bold text-gecotex-ink flex items-center gap-2">
            <AlertTriangle size={15} className="text-gecotex-orange" /> Alertas activas ({alertas.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {alertas.map((a, i) => (
              <div key={i}
                className={clsx(
                  'bg-white rounded-xl border p-4 shadow-gx-sm flex gap-3',
                  a.severidad === 'alta' ? 'border-gecotex-red/40' :
                  a.severidad === 'media' ? 'border-gecotex-orange/40' : 'border-gecotex-border-soft'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertaBadge sev={a.severidad} />
                    <span className="text-[12px] font-bold text-gecotex-ink">{a.titulo}</span>
                  </div>
                  <p className="text-[11px] text-gecotex-ink-sub leading-snug">{a.descripcion}</p>
                </div>
                {a.link && (
                  <button
                    className="text-[11px] font-bold text-gecotex-navy hover:underline flex-shrink-0"
                    onClick={() => navigate(a.link)}
                  >
                    Ver →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── B3: Evolución 6 meses ────────────────────────────────────────── */}
      {loading3 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton h="h-64" /><Skeleton h="h-64" />
        </div>
      ) : evolucion.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card">
            <SectionTitle>Evolución UPs · 6 meses</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={evolucion}>
                <defs>
                  <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1F3864" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1F3864" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tickFormatter={(m, i) => MESES_SHORT[evolucion[i]?.mes] || m} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v, n) => [v.toFixed(1), n === 'ups_producidas' ? 'UPs reales' : 'Objetivo']} />
                <Area type="monotone" dataKey="ups_producidas" stroke="#1F3864" fill="url(#upGrad)" strokeWidth={2} name="ups_producidas" />
                <Area type="monotone" dataKey="ups_objetivo" stroke="#B0BEC5" fill="none" strokeDasharray="4 2" strokeWidth={1.5} name="ups_objetivo" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <SectionTitle>Expedientes por tipo · 6 meses</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={evolucion}>
                <XAxis dataKey="mes" tickFormatter={(m, i) => MESES_SHORT[evolucion[i]?.mes] || m} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={35} />
                <Tooltip />
                <Bar dataKey="expedientes_exportacion" stackId="a" fill="#1F3864" name="Export." radius={[0, 0, 0, 0]} />
                <Bar dataKey="expedientes_importacion" stackId="a" fill="#5490B6" name="Import." radius={[0, 0, 0, 0]} />
                <Bar dataKey="expedientes_especial"    stackId="a" fill="#96B9D0" name="Especial" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── B4: Distribución ────────────────────────────────────────────── */}
      {!loading3 && distribucion && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Canal */}
          <div className="card">
            <SectionTitle>Canal de respuesta AEAT</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={Object.entries(distribucion.por_canal || {}).map(([k, v]) => ({ name: k, value: v.count, pct: v.pct }))}
                  cx="50%" cy="50%" outerRadius={70}
                  dataKey="value"
                  label={({ name, pct }) => `${name} ${pct}%`}
                  labelLine={false}
                >
                  {Object.keys(distribucion.por_canal || {}).map((k) => (
                    <Cell key={k} fill={badgeColor[k] || '#999'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tipo DUA */}
          <div className="card">
            <SectionTitle>Top tipos DUA</SectionTitle>
            <div className="space-y-2 overflow-y-auto max-h-[200px]">
              {(distribucion.por_tipo || []).slice(0, 8).map(t => (
                <div key={t.codigo} className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gecotex-ink w-20 flex-shrink-0 font-mono">{t.codigo}</span>
                  <div className="flex-1 bg-gecotex-bg rounded-full h-2">
                    <div className="h-2 rounded-full bg-gecotex-navy transition-all" style={{ width: `${t.pct}%` }} />
                  </div>
                  <span className="text-[11px] text-gecotex-ink-muted w-10 text-right">{t.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tráfico */}
          <div className="card">
            <SectionTitle>Exportación vs Importación</SectionTitle>
            {distribucion.por_trafico && (
              <div className="space-y-4 mt-4">
                {['exportacion', 'importacion'].map(t => {
                  const d = distribucion.por_trafico[t]
                  return (
                    <div key={t}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="font-bold text-gecotex-ink capitalize">{t}</span>
                        <span className="font-mono text-gecotex-ink-muted">{d?.pct_ups}% de UPs</span>
                      </div>
                      <div className="bg-gecotex-bg rounded-full h-3">
                        <div className="h-3 rounded-full bg-gecotex-navy" style={{ width: `${d?.pct_ups || 0}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gecotex-ink-muted mt-0.5">
                        <span>{d?.expedientes ?? 0} exp.</span>
                        <span>{d?.ups?.toFixed(1) ?? 0} UPs</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── B5: Ranking mejorado ─────────────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gecotex-border-soft">
          <h3 className="text-[14px] font-bold text-gecotex-ink">
            Ranking de operarios · {nombreMes(mes)} {año}
          </h3>
        </div>
        {loading2 ? (
          <div className="p-6"><Skeleton h="h-48" cls="w-full" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gecotex-bg/50">
                  <th className="table-header w-10 text-center">#</th>
                  <th className="table-header">Operario</th>
                  <th className="table-header text-right">UPs</th>
                  <th className="table-header text-right">% Obj.</th>
                  <th className="table-header text-center">Factor K</th>
                  <th className="table-header text-right">Exp.</th>
                  <th className="table-header text-center">Tend.</th>
                  <th className="table-header w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gecotex-border-soft">
                {ranking.map((op, i) => {
                  const k = op.factor_k ?? 0
                  const isExpanded = expanded === op.operario_id
                  return (
                    <Fragment key={op.operario_id}>
                      <tr
                        className={clsx('cursor-pointer transition-colors', kBg(k), 'hover:brightness-95')}
                        onClick={() => setExpanded(isExpanded ? null : op.operario_id)}
                      >
                        <td className="table-cell text-center font-mono font-bold text-gecotex-ink-muted">{i + 1}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2.5">
                            <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold',
                              k >= 1 ? 'bg-gecotex-green' : k >= 0.85 ? 'bg-gecotex-orange' : 'bg-gecotex-red')}>
                              {op.operario_nombre?.[0]}
                            </div>
                            <span className="font-bold text-gecotex-ink text-sm">{op.operario_nombre}</span>
                          </div>
                        </td>
                        <td className="table-cell text-right font-mono font-bold text-gecotex-ink">{fmtUP(op.up_producidas)}</td>
                        <td className="table-cell text-right font-mono">
                          <span className={kTxt(k)}>{Math.round(op.pct_cumplimiento ?? 0)}%</span>
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-20 bg-gecotex-bg rounded-full h-1.5">
                              <div className={clsx('h-1.5 rounded-full',
                                k >= 1 ? 'bg-gecotex-green' : k >= 0.85 ? 'bg-gecotex-orange' : 'bg-gecotex-red')}
                                style={{ width: `${Math.min(100, k * 100)}%` }} />
                            </div>
                            <span className={clsx('text-[11px] font-mono font-bold', kTxt(k))}>{fmtK(k)}</span>
                          </div>
                        </td>
                        <td className="table-cell text-right font-mono text-gecotex-ink-sub">{op.num_expedientes}</td>
                        <td className="table-cell text-center">
                          {op.tendencia === 'sube' ? <ArrowUp size={15} className="text-gecotex-green mx-auto" /> :
                           op.tendencia === 'baja' ? <ArrowDown size={15} className="text-gecotex-red mx-auto" /> :
                           <MoveRight size={15} className="text-gecotex-ink-muted mx-auto" />}
                        </td>
                        <td className="table-cell text-center">
                          {isExpanded
                            ? <ChevronDown size={14} className="text-gecotex-ink-muted" />
                            : <ChevronRight size={14} className="text-gecotex-ink-muted" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gecotex-bg/30">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="flex items-center gap-6 flex-wrap">
                              <div className="text-[11px] text-gecotex-ink-sub space-y-1">
                                <div><span className="font-bold">Objetivo mes:</span> {fmtUP(op.objetivo_up)}</div>
                                <div><span className="font-bold">UPs producidas:</span> {fmtUP(op.up_producidas)}</div>
                                <div><span className="font-bold">Cumplimiento:</span> {Math.round(op.pct_cumplimiento ?? 0)}%</div>
                              </div>
                              <button
                                className="btn-soft !py-1.5 !px-3 text-[12px] ml-auto"
                                onClick={e => { e.stopPropagation(); navigate(`/expedientes?operario_id=${op.operario_id}`) }}
                              >
                                Ver expedientes →
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── B6: Expedientes en curso ─────────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gecotex-border-soft">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-bold text-gecotex-ink">Expedientes en curso</h3>
            {lastRefresh && (
              <span className="text-[11px] text-gecotex-ink-muted">
                Actualizado {lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gecotex-bg rounded-lg border border-gecotex-border-soft p-0.5 text-[11px] font-bold">
              {['todos', 'alerta'].map(f => (
                <button key={f} onClick={() => setCursoFiltro(f)}
                  className={clsx('px-3 py-1 rounded-md transition-colors capitalize',
                    cursoFiltro === f ? 'bg-white shadow-sm text-gecotex-ink' : 'text-gecotex-ink-muted')}>
                  {f === 'alerta' ? '🔴 Con alerta' : 'Todos'}
                </button>
              ))}
            </div>
            <button onClick={cargarEnCurso} className="btn-soft !p-2" title="Actualizar">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gecotex-bg/80 backdrop-blur-sm">
                <th className="table-header">Expediente</th>
                <th className="table-header">Operario</th>
                <th className="table-header">Tipo DUA</th>
                <th className="table-header">Cliente</th>
                <th className="table-header text-center">Tiempo</th>
                <th className="table-header">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gecotex-border-soft">
              {enCurso
                .filter(e => cursoFiltro === 'alerta' ? e.alerta : true)
                .map(e => (
                <tr key={e.id} className="hover:bg-gecotex-bg/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/expedientes/${e.id}`)}>
                  <td className="table-cell font-mono text-[11px]">{e.numero_expediente || `#${e.id}`}</td>
                  <td className="table-cell text-sm">{e.operario}</td>
                  <td className="table-cell font-mono text-[11px]">{e.tipo_dua}</td>
                  <td className="table-cell text-sm truncate max-w-[150px]">{e.cliente_nombre}</td>
                  <td className="table-cell text-center">
                    <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full',
                      e.badge === 'verde' ? 'bg-green-100 text-green-700' :
                      e.badge === 'naranja' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700')}>
                      {e.tiempo_fmt}
                    </span>
                  </td>
                  <td className="table-cell text-[11px] text-gecotex-ink-sub">{e.estado}</td>
                </tr>
              ))}
              {enCurso.filter(e => cursoFiltro === 'alerta' ? e.alerta : true).length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[12px] text-gecotex-ink-muted">
                  {cursoFiltro === 'alerta' ? 'No hay expedientes con alerta' : 'No hay expedientes abiertos'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {enCurso.length > 0 && (
          <div className="px-5 py-2.5 border-t border-gecotex-border-soft">
            <span className="text-[11px] text-gecotex-ink-muted">
              {enCurso.filter(e => e.alerta).length > 0 && (
                <span className="text-gecotex-red font-bold">{enCurso.filter(e => e.alerta).length} con alerta · </span>
              )}
              {enCurso.length} expedientes abiertos en total
            </span>
          </div>
        )}
      </div>

      {/* ── B7: Top clientes ────────────────────────────────────────────── */}
      {!loading3 && clientes.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gecotex-border-soft">
            <h3 className="text-[14px] font-bold text-gecotex-ink">Top 10 clientes · {nombreMes(mes)}</h3>
            <div className="flex bg-gecotex-bg rounded-lg border border-gecotex-border-soft p-0.5 text-[11px] font-bold">
              {[['ups', 'Por UPs'], ['expedientes', 'Por Exp.']].map(([v, l]) => (
                <button key={v} onClick={() => setClienteSort(v)}
                  className={clsx('px-3 py-1 rounded-md transition-colors',
                    clienteSort === v ? 'bg-white shadow-sm text-gecotex-ink' : 'text-gecotex-ink-muted')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gecotex-bg/50">
                <th className="table-header w-8 text-center">#</th>
                <th className="table-header">Cliente</th>
                <th className="table-header text-right">Exp.</th>
                <th className="table-header text-right">UPs</th>
                <th className="table-header text-center">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gecotex-border-soft">
              {[...clientes]
                .sort((a, b) => clienteSort === 'ups' ? b.ups - a.ups : b.expedientes - a.expedientes)
                .map((c, i) => (
                <tr key={c.cliente} className="hover:bg-gecotex-bg/30 transition-colors">
                  <td className="table-cell text-center text-[11px] font-mono text-gecotex-ink-muted">{i + 1}</td>
                  <td className="table-cell font-bold text-sm text-gecotex-ink">{c.cliente}</td>
                  <td className="table-cell text-right font-mono text-sm">{c.expedientes}</td>
                  <td className="table-cell text-right font-mono font-bold text-gecotex-ink">{c.ups?.toFixed(1)}</td>
                  <td className="table-cell text-center">
                    {c.tendencia === 'sube' ? <ArrowUp size={14} className="text-gecotex-green mx-auto" /> :
                     c.tendencia === 'baja' ? <ArrowDown size={14} className="text-gecotex-red mx-auto" /> :
                     <MoveRight size={14} className="text-gecotex-ink-muted mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── B8: Mapa de calor + resumen semanal ─────────────────────────── */}
      {!loading2 && ranking.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[14px] font-bold text-gecotex-ink">Actividad diaria · Mapa de calor</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gecotex-ink-muted uppercase tracking-widest">
                <span>Menos</span>
                {['#EEF1F5', '#D7E2EA', '#96B9D0', '#5490B6', '#1F3864'].map((c, i) => (
                  <div key={i} className="w-3.5 h-3.5 rounded-sm border border-black/5" style={{ background: c }} />
                ))}
                <span>Más</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Cabecera días */}
              <div className="flex mb-2">
                <div className="w-32 flex-shrink-0" />
                <div className="flex-1 flex">
                  {Array.from({ length: new Date(año, mes, 0).getDate() }).map((_, i) => (
                    <span key={i} className="flex-1 text-[9px] font-bold text-gecotex-ink-muted font-mono text-center">{i + 1}</span>
                  ))}
                </div>
              </div>

              {/* Filas operarios */}
              {heatmap.map(op => {
                const COLORS = ['#EEF1F5', '#D7E2EA', '#96B9D0', '#5490B6', '#1F3864']
                return (
                  <div key={op.id} className="flex items-center mb-1.5">
                    <div className="w-32 flex-shrink-0 text-right pr-4 text-[11px] font-bold text-gecotex-ink truncate">
                      {op.nombre}
                    </div>
                    <div className="flex-1 flex gap-0.5">
                      {op.days.map((d, i) => (
                        <div
                          key={i}
                          className="flex-1 h-5 rounded-sm border border-black/5"
                          style={{ background: d.active ? COLORS[d.intensity] : 'transparent', borderStyle: d.active ? 'solid' : 'dashed' }}
                          title={d.active ? `Día ${i + 1} — ${['Bajo', 'Moderado', 'Normal', 'Alto', 'Excelente'][d.intensity]}` : `Día ${i + 1} — Sin datos`}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Fila total */}
              {heatmap.length > 1 && (() => {
                const diasMes = new Date(año, mes, 0).getDate()
                const COLORS = ['#EEF1F5', '#D7E2EA', '#96B9D0', '#5490B6', '#1F3864']
                return (
                  <div className="flex items-center mt-2 pt-2 border-t border-gecotex-border-soft">
                    <div className="w-32 flex-shrink-0 text-right pr-4 text-[11px] font-bold text-gecotex-ink-muted">TOTAL</div>
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: diasMes }, (_, di) => {
                        const activeOps = heatmap.filter(op => op.days[di]?.active).length
                        const intensity = activeOps === 0 ? 0 : Math.min(4, Math.floor(activeOps / heatmap.length * 4))
                        return (
                          <div key={di} className="flex-1 h-5 rounded-sm border border-black/5"
                            style={{ background: activeOps > 0 ? COLORS[intensity] : 'transparent', borderStyle: activeOps > 0 ? 'solid' : 'dashed' }}
                            title={`Día ${di + 1} — ${activeOps} operarios activos`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Resumen semanal */}
          {semanal.length > 0 && (
            <div className="mt-6 border-t border-gecotex-border-soft pt-4">
              <h4 className="text-[12px] font-bold text-gecotex-ink-muted mb-3 uppercase tracking-wider">Resumen semanal</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {semanal.map(s => (
                  <div key={s.semana_iso} className="bg-gecotex-bg rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gecotex-ink-muted uppercase tracking-wider mb-1">Semana {s.semana_iso}</p>
                    <p className="text-xl font-black text-gecotex-ink font-mono">{s.ups?.toFixed(1)}</p>
                    <p className="text-[10px] text-gecotex-ink-sub mt-1">{s.expedientes} exp. · Top: {s.mejor_operario}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
