import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { kpisApi } from '../api/client'
import Semaforo from '../components/Semaforo'
import KpiCard from '../components/KpiCard'
import AccionesPendientes from '../components/AccionesPendientes'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, Sparkles, Shield, CheckCircle, Award, Package, ArrowUp, ArrowDown, MoveRight, Filter, Download } from 'lucide-react'
import { fmtUP, fmtK, fmtPct, nombreMes } from '../utils/formatters'
import clsx from 'clsx'

const TeamSemaphore = ({ pct, producidas, objetivo }) => {
  const p = Math.min(100, Math.round(pct * 100))
  const semaforo = pct >= 0.9 ? 'verde' : pct >= 0.7 ? 'naranja' : 'rojo'
  const color = semaforo === 'verde' ? '#27AE60' : semaforo === 'naranja' ? '#E67E22' : '#C0392B'
  const label = semaforo === 'verde' ? 'En objetivo' : semaforo === 'naranja' ? 'Atención' : 'Por debajo del objetivo'

  const r = 64, c = 2 * Math.PI * r
  const dash = Math.min(c, c * pct)

  return (
    <div className="bg-white rounded-[10px] border border-gecotex-border-soft shadow-gx-sm p-6 flex items-center gap-8">
      <div className="relative w-40 h-40 flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#EEF1F5" strokeWidth="14" />
          <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            transform="rotate(-90 80 80)" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black tracking-tighter leading-none" style={{ color }}>{p}%</span>
          <span className="text-[10px] font-bold text-gecotex-ink-muted uppercase tracking-widest mt-1">del objetivo</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-[13px] font-bold" style={{ color }}>{label}</span>
        </div>
        <h3 className="text-base font-bold text-gecotex-ink leading-tight mb-4">Rendimiento del equipo este mes</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">UPs producidas</p>
            <p className="text-2xl font-black text-gecotex-ink font-mono">{(producidas ?? 0).toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">Objetivo mes</p>
            <p className="text-2xl font-black text-gecotex-ink-muted font-mono">{(objetivo ?? 0).toFixed(0)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardEquipo() {
  const navigate = useNavigate()
  const now = new Date()
  const [año, setAño] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [kpisEquipo, setKpisEquipo] = useState(null)
  const [suficiencia, setSuficiencia] = useState(null)
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      kpisApi.equipo({ año, mes }),
      kpisApi.suficiencia({ año, mes }),
      kpisApi.ranking({ año, mes }),
    ])
      .then(([eq, suf, rank]) => {
        setKpisEquipo(eq.data)
        setSuficiencia(suf.data)
        setRanking(rank.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [año, mes])

  // useMemo debe estar ANTES de cualquier early return (Rules of Hooks)
  const heatmap = useMemo(() => {
    const pseudoRand = (seed) => {
      let x = Math.sin(seed) * 10000
      return Math.floor((x - Math.floor(x)) * 5)
    }
    return ranking.map(op => ({
      id: op.operario_id,
      nombre: op.operario_nombre,
      days: Array.from({ length: 31 }, (_, i) => ({
        active: i < now.getDate(),
        intensity: pseudoRand(op.operario_id * 31 + i + 1),
      })),
    }))
  }, [ranking])

  if (loading) return (
    <div className="space-y-6">
       <div className="h-10 w-64 bg-gecotex-border-soft rounded animate-pulse" />
       <div className="grid grid-cols-3 gap-6">
          <div className="h-48 col-span-1 bg-white rounded-xl animate-pulse" />
          <div className="h-48 col-span-2 bg-white rounded-xl animate-pulse" />
       </div>
    </div>
  )

  const kTone = (k) => k >= 1.05 ? 'green' : k >= 0.85 ? 'orange' : 'red'

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Acciones pendientes */}
      <AccionesPendientes />

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gecotex-ink tracking-tight">Dashboard del equipo</h1>
          <p className="text-[13px] text-gecotex-ink-sub">Rendimiento global · Departamento de Aduanas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gecotex-border rounded-lg p-1 shadow-sm">
             <select className="bg-transparent border-none outline-none text-sm font-semibold px-3 py-1.5" value={mes} onChange={e => setMes(+e.target.value)}>
                {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{nombreMes(i+1)}</option>)}
             </select>
             <div className="w-px bg-gecotex-border mx-1 my-1" />
             <select className="bg-transparent border-none outline-none text-sm font-semibold px-3 py-1.5" value={año} onChange={e => setAño(+e.target.value)}>
                {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
          <button className="btn-secondary flex items-center gap-2 py-2.5">
             <Download size={18} /> Exportar
          </button>
        </div>
      </div>

      {/* Suficiencia + Mini KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
           {kpisEquipo && (
             <TeamSemaphore
               pct={(kpisEquipo.pct_cumplimiento_global ?? 0) / 100}
               producidas={kpisEquipo.total_up_producidas}
               objetivo={kpisEquipo.total_up_objetivo}
             />
           )}
        </div>
        <div className="lg:col-span-7">
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard titulo="Operarios activos" valor={suficiencia?.num_operarios_activos || 0} icono={Users} color="navy" footer="Equipo de Valencia" />
              <KpiCard titulo="Factor K medio" valor={fmtK(ranking.length > 0 ? ranking.filter(o => o.factor_k != null).reduce((s, o) => s + o.factor_k, 0) / ranking.filter(o => o.factor_k != null).length : null)} icono={Sparkles} color="orange" footer="Media del equipo" />
              <KpiCard titulo="% Incidencia" valor={ranking.length > 0 ? fmtPct(ranking.reduce((s,o)=>s+(o.tasa_incidencia||0),0)/ranking.length) : '0'} unit="%" icono={Shield} color="verde" footer="Naranja + Rojo" />
              <KpiCard titulo="Expedientes" valor={kpisEquipo?.num_expedientes_total ?? '—'} icono={Package} color="navy" footer="Cerrados este mes" />
              <KpiCard titulo="UPs Totales" valor={fmtUP(kpisEquipo?.total_up_producidas)} icono={CheckCircle} color="verde" footer={`Vs ${fmtUP(kpisEquipo?.total_up_objetivo)} obj.`} />
              <KpiCard titulo="% Objetivo global" valor={kpisEquipo?.pct_cumplimiento_global != null ? kpisEquipo.pct_cumplimiento_global.toFixed(0) : '—'} unit="%" icono={Award} color="blue" footer="Cumplimiento equipo" />
           </div>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gecotex-border-soft">
           <h3 className="text-[14px] font-bold text-gecotex-ink">Ranking de operarios · {nombreMes(mes)} {año}</h3>
           <div className="flex gap-2">
              <button className="btn-soft !py-1.5 !px-3 flex items-center gap-1.5"><Filter size={14} /> Filtros</button>
              <button className="btn-soft !py-1.5 !px-3">Ver detalle</button>
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full">
              <thead>
                 <tr className="bg-gecotex-bg/50">
                    <th className="table-header w-12 text-center">#</th>
                    <th className="table-header">Operario</th>
                    <th className="table-header text-right">UPs</th>
                    <th className="table-header text-right">% Obj.</th>
                    <th className="table-header text-center">Factor K</th>
                    <th className="table-header text-right">Exp.</th>
                    <th className="table-header text-right">% Incid.</th>
                    <th className="table-header text-center">Tendencia</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gecotex-border-soft">
                 {ranking.map((op, i) => {
                    const k = op.factor_k || (op.up_producidas / op.objetivo_up)
                    const tone = kTone(k)
                    const bg = tone === 'green' ? 'bg-[#F4FBF7]' : tone === 'orange' ? 'bg-[#FEF8F1]' : 'bg-[#FDF1EF]'
                    return (
                       <tr key={op.operario_id} className={clsx("hover:brightness-95 transition-all cursor-pointer", bg)} onClick={() => navigate(`/expedientes?operario_id=${op.operario_id}`)}>
                          <td className="table-cell text-center font-mono font-bold text-gecotex-ink-muted">{i+1}</td>
                          <td className="table-cell">
                             <div className="flex items-center gap-3">
                                <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold", 
                                   tone === 'green' ? 'bg-gecotex-green' : tone === 'orange' ? 'bg-gecotex-orange' : 'bg-gecotex-red')}>
                                   {op.operario_nombre?.[0]}
                                </div>
                                <span className="font-bold text-gecotex-ink">{op.operario_nombre}</span>
                             </div>
                          </td>
                          <td className="table-cell text-right font-mono font-bold">{fmtUP(op.up_producidas)}</td>
                          <td className="table-cell text-right font-mono font-bold">
                             <span className={clsx(tone === 'green' ? 'text-gecotex-green' : tone === 'orange' ? 'text-gecotex-orange' : 'text-gecotex-red')}>
                                {Math.round(op.pct_cumplimiento)}%
                             </span>
                          </td>
                          <td className="table-cell text-center">
                             <Semaforo valor={k} tipo="factor_k" size="sm" dot={false} />
                          </td>
                          <td className="table-cell text-right text-gecotex-ink-sub font-mono">{op.num_expedientes}</td>
                          <td className="table-cell text-right font-mono" style={{ color: op.tasa_incidencia > 20 ? '#C0392B' : '#5B6577' }}>{fmtPct(op.tasa_incidencia)}</td>
                          <td className="table-cell text-center">
                             {op.tendencia === 'sube' ? <ArrowUp size={16} className="text-gecotex-green mx-auto" /> : 
                              op.tendencia === 'baja' ? <ArrowDown size={16} className="text-gecotex-red mx-auto" /> : 
                              <MoveRight size={16} className="text-gecotex-ink-muted mx-auto" />}
                          </td>
                       </tr>
                    )
                 })}
              </tbody>
           </table>
        </div>
      </div>

      {/* Heatmap Card (Placeholder with visual) */}
      <div className="card overflow-hidden">
         <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-bold text-gecotex-ink">Actividad diaria por operario · Mapa de calor</h3>
            <div className="flex items-center gap-8 text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest">
               <div className="flex items-center gap-1.5">
                  <span>Menos</span>
                  <div className="flex gap-1">
                     <div className="w-3.5 h-3.5 bg-[#EEF1F5] rounded-sm" />
                     <div className="w-3.5 h-3.5 bg-[#D7E2EA] rounded-sm" />
                     <div className="w-3.5 h-3.5 bg-[#96B9D0] rounded-sm" />
                     <div className="w-3.5 h-3.5 bg-[#5490B6] rounded-sm" />
                     <div className="w-3.5 h-3.5 bg-[#1F3864] rounded-sm" />
                  </div>
                  <span>Más</span>
               </div>
            </div>
         </div>
         <div className="overflow-x-auto">
            <div className="min-w-[800px]">
               <div className="flex mb-2">
                  <div className="w-32 flex-shrink-0" />
                  <div className="flex-1 flex justify-between px-2">
                     {Array.from({length:31}).map((_,i)=>(
                        <span key={i} className="text-[9px] font-bold text-gecotex-ink-muted font-mono w-4 text-center">{i+1}</span>
                     ))}
                  </div>
               </div>
               {heatmap.map(op => {
                  const colors = ['#EEF1F5', '#D7E2EA', '#96B9D0', '#5490B6', '#1F3864']
                  return (
                     <div key={op.id} className="flex items-center mb-1">
                        <div className="w-32 flex-shrink-0 text-right pr-4 text-xs font-bold text-gecotex-ink truncate">{op.nombre}</div>
                        <div className="flex-1 flex justify-between gap-1">
                           {op.days.map((d, i) => (
                              <div key={i}
                                 className="flex-1 h-5 rounded-sm border border-black/5"
                                 style={{ background: d.active ? colors[d.intensity] : 'transparent', borderStyle: d.active ? 'solid' : 'dashed' }}
                              />
                           ))}
                        </div>
                     </div>
                  )
               })}
            </div>
         </div>
      </div>
    </div>
  )
}

