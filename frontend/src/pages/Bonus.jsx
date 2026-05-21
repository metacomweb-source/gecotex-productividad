import { useEffect, useState } from 'react'
import { bonusApi, informesApi } from '../api/client'
import { Download, Settings, Flag, Search, Filter, Info, Users, Package, Award, Eye, MoreHorizontal, Plus, Trash2, X, Save } from 'lucide-react'
import { fmtUP, nombreMes, descargarBlob } from '../utils/formatters'
import KpiCard from '../components/KpiCard'
import Semaforo from '../components/Semaforo'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const DYNAMIC_K_THRESHOLD = 1.20

const tramoColor = (pct) => {
  if (pct === 0) return 'red'
  if (pct >= 1.0) return 'green'
  return 'orange'
}

const colorMap = { green: 'bg-gecotex-green', orange: 'bg-gecotex-orange', red: 'bg-gecotex-red' }

const Tramo = ({ color, label, desc }) => (
  <div className="flex items-center gap-2.5">
    <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', colorMap[color])} />
    <div>
      <p className="text-[12px] font-bold text-gecotex-ink font-mono leading-none">{label}</p>
      <p className="text-[11px] text-gecotex-ink-sub mt-0.5">{desc}</p>
    </div>
  </div>
)

const DEFAULT_TABLA = [
  { k_min: 0, k_max: 0.70, porcentaje_bonus: 0 },
  { k_min: 0.70, k_max: 0.85, porcentaje_bonus: 0.50 },
  { k_min: 0.85, k_max: 1.00, porcentaje_bonus: 0.75 },
  { k_min: 1.00, k_max: 1.20, porcentaje_bonus: 1.00 },
]

export default function Bonus() {
  const now = new Date()
  const [año, setAño] = useState(now.getFullYear())
  const [tablaBonus, setTablaBonus] = useState(null)
  const [params, setParams] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [editParams, setEditParams] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = (y) => {
    setLoading(true)
    Promise.all([
      bonusApi.tabla(y).catch(() => null),
      bonusApi.config(y).catch(() => null),
    ]).then(([tabla, cfg]) => {
      setTablaBonus(tabla?.data)
      setParams(cfg?.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData(año) }, [año])

  // --- Config handlers ---

  const handleOpenConfig = () => {
    if (showConfig) { setShowConfig(false); return }
    const base = params ?? {}
    const tablaEditable = (base.tabla_factor_k ?? DEFAULT_TABLA)
      .filter(t => typeof t.porcentaje_bonus === 'number')
      .map(t => ({ ...t }))
    setEditParams({
      objetivo_crecimiento_facturacion: base.objetivo_crecimiento_facturacion ?? 0.15,
      factor_disponibilidad: base.factor_disponibilidad ?? 0.70,
      antiguedad_minima_meses: base.antiguedad_minima_meses ?? 12,
      peso_productividad_individual: base.peso_productividad_individual ?? 0.40,
      peso_resultado_global: base.peso_resultado_global ?? 0.60,
      tabla_factor_k: tablaEditable,
    })
    setShowConfig(true)
  }

  const addTramo = () => {
    const tabla = editParams.tabla_factor_k
    const lastMax = tabla.length > 0 ? (tabla[tabla.length - 1].k_max ?? DYNAMIC_K_THRESHOLD) : 0
    setEditParams(p => ({
      ...p,
      tabla_factor_k: [...p.tabla_factor_k, { k_min: lastMax, k_max: parseFloat((lastMax + 0.20).toFixed(2)), porcentaje_bonus: 0 }],
    }))
  }

  const removeTramo = (idx) => {
    setEditParams(p => ({ ...p, tabla_factor_k: p.tabla_factor_k.filter((_, i) => i !== idx) }))
  }

  const updateTramo = (idx, field, raw) => {
    setEditParams(p => ({
      ...p,
      tabla_factor_k: p.tabla_factor_k.map((t, i) => {
        if (i !== idx) return t
        if (field === 'k_max') return { ...t, k_max: raw === '' ? null : parseFloat(raw) }
        return { ...t, [field]: parseFloat(raw) || 0 }
      }),
    }))
  }

  const handleSaveConfig = async () => {
    const sumaP = editParams.peso_productividad_individual + editParams.peso_resultado_global
    if (Math.abs(sumaP - 1.0) > 0.01) {
      toast.error(`Los pesos deben sumar 100% (actualmente ${(sumaP * 100).toFixed(0)}%)`)
      return
    }
    setSaving(true)
    try {
      const lastKmax = editParams.tabla_factor_k.length > 0
        ? (editParams.tabla_factor_k[editParams.tabla_factor_k.length - 1].k_max ?? DYNAMIC_K_THRESHOLD)
        : DYNAMIC_K_THRESHOLD
      const tablaFinal = [
        ...editParams.tabla_factor_k,
        { k_min: lastKmax, k_max: null, porcentaje_bonus: '1.00 + (K-1)' },
      ]
      const payload = {
        año,
        objetivo_crecimiento_facturacion: parseFloat(editParams.objetivo_crecimiento_facturacion) || 0,
        factor_disponibilidad: parseFloat(editParams.factor_disponibilidad) || 0,
        antiguedad_minima_meses: parseInt(editParams.antiguedad_minima_meses) || 0,
        peso_productividad_individual: parseFloat(editParams.peso_productividad_individual) || 0,
        peso_resultado_global: parseFloat(editParams.peso_resultado_global) || 0,
        tabla_factor_k: tablaFinal,
      }
      const res = await bonusApi.upsertConfig(payload)
      setParams(res.data)
      const tablaRes = await bonusApi.tabla(año).catch(() => null)
      if (tablaRes) setTablaBonus(tablaRes.data)
      setShowConfig(false)
      toast.success('Configuración guardada correctamente')
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  // --- Derived data ---

  const mesActual = tablaBonus?.meses?.find(m => m.mes === now.getMonth() + 1)
  const operariosBonus = mesActual?.operarios || []
  const totalUPs = operariosBonus.reduce((s, op) => s + op.up_producidas, 0)
  const totalObj = operariosBonus.reduce((s, op) => s + op.objetivo_up, 0)
  const totalEuros = operariosBonus.reduce((s, op) => s + (op.importe_estimado || 0), 0)
  const elegibles = operariosBonus.filter(op => op.elegible).length

  const tramosVisibles = (params?.tabla_factor_k ?? DEFAULT_TABLA)
    .filter(t => typeof t.porcentaje_bonus === 'number')

  const handleExport = async () => {
    try {
      const r = await informesApi.bonus({ año })
      descargarBlob(r.data, `bonus_${año}.xlsx`)
      toast.success('Excel descargado')
    } catch { toast.error('Error al exportar') }
  }

  if (loading) return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-gecotex-border-soft rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gecotex-ink tracking-tight">Bonus de productividad</h1>
          <p className="text-[13px] text-gecotex-ink-sub">Cálculo mensual basado en Factor K y elegibilidad</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gecotex-border rounded-lg p-1 shadow-sm">
            <select
              className="bg-transparent border-none outline-none text-sm font-semibold px-3 py-1.5"
              value={año}
              onChange={e => setAño(+e.target.value)}
            >
              {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn-secondary flex items-center gap-2 py-2.5">
            <Eye size={18} /> Vista previa
          </button>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2 py-2.5">
            <Download size={18} /> Exportar a Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="UPs totales equipo"
          valor={totalUPs.toFixed(0)}
          unit={`/ ${totalObj.toFixed(0)}`}
          icono={Package}
          color="navy"
          footer={`${operariosBonus.length} operarios este mes`}
        />
        <KpiCard
          label="Operarios elegibles"
          valor={`${elegibles}/${operariosBonus.length}`}
          icono={Users}
          color="verde"
          footer="Factor K ≥ 0.85"
        />
        <KpiCard
          label="Bonus a repartir"
          valor={(totalEuros / 1000).toFixed(2)}
          unit="K€"
          icono={Award}
          color="blue"
          footer="Estimación bruta acumulada"
        />
        <KpiCard
          label="Estado del cálculo"
          valor="Borrador"
          icono={Info}
          color="orange"
          footer="Aprobación pendiente RR.HH."
        />
      </div>

      {/* Policy strip */}
      <div className="bg-white border border-gecotex-border-soft rounded-[10px] shadow-gx-sm p-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2.5 pr-6 border-r border-gecotex-border-soft">
          <Flag size={18} className="text-gecotex-navy" />
          <span className="text-[13px] font-bold text-gecotex-ink">Política activa</span>
        </div>
        {tramosVisibles.map((t, i) => {
          const label = t.k_max != null
            ? `${t.k_min.toFixed(2)} – ${t.k_max.toFixed(2)}`
            : `≥ ${t.k_min.toFixed(2)}`
          const pct = t.porcentaje_bonus * 100
          const desc = pct === 0 ? 'No elegible · 0%' : `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(0)}% bonus`
          return <Tramo key={i} color={tramoColor(t.porcentaje_bonus)} label={label} desc={desc} />
        })}
        <Tramo color="green" label={`≥ ${DYNAMIC_K_THRESHOLD.toFixed(2)}`} desc="Dinámico · 100% + exceso" />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11.5px] text-gecotex-ink-muted">
            {params ? `Config. ${año}` : 'Sin configurar'}
          </span>
          <button
            onClick={handleOpenConfig}
            className={clsx(
              'p-1.5 rounded-md transition-colors',
              showConfig
                ? 'bg-gecotex-navy text-white'
                : 'hover:bg-gecotex-bg text-gecotex-ink-sub'
            )}
            title="Configurar parámetros de bonus"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && editParams && (
        <div className="card border border-gecotex-navy/20 bg-white space-y-6">
          <div className="flex items-center justify-between pb-5 border-b border-gecotex-border-soft">
            <div>
              <h3 className="font-bold text-gecotex-ink">Configuración de parámetros · {año}</h3>
              <p className="text-[12px] text-gecotex-ink-sub mt-0.5">Los cambios afectan al cálculo de bonus de todo el año seleccionado</p>
            </div>
            <button
              onClick={() => setShowConfig(false)}
              className="p-1.5 hover:bg-gecotex-bg rounded-lg text-gecotex-ink-sub"
            >
              <X size={16} />
            </button>
          </div>

          {/* Parámetros generales */}
          <div>
            <h4 className="text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-3">Parámetros generales</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                  Crecimiento objetivo facturación
                </label>
                <div className="relative">
                  <input
                    type="number" step="1" min="0" max="100"
                    className="input-field pr-8"
                    value={Math.round(editParams.objetivo_crecimiento_facturacion * 100)}
                    onChange={e => setEditParams(p => ({ ...p, objetivo_crecimiento_facturacion: parseFloat(e.target.value) / 100 || 0 }))}
                    placeholder="15"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                  Factor disponibilidad
                </label>
                <div className="relative">
                  <input
                    type="number" step="1" min="0" max="100"
                    className="input-field pr-8"
                    value={Math.round(editParams.factor_disponibilidad * 100)}
                    onChange={e => setEditParams(p => ({ ...p, factor_disponibilidad: parseFloat(e.target.value) / 100 || 0 }))}
                    placeholder="70"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                  Antigüedad mínima
                </label>
                <div className="relative">
                  <input
                    type="number" step="1" min="0"
                    className="input-field pr-12"
                    value={editParams.antiguedad_minima_meses}
                    onChange={e => setEditParams(p => ({ ...p, antiguedad_minima_meses: parseInt(e.target.value) || 0 }))}
                    placeholder="12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">mes</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                  Peso productividad individual
                </label>
                <div className="relative">
                  <input
                    type="number" step="5" min="0" max="100"
                    className="input-field pr-8"
                    value={Math.round(editParams.peso_productividad_individual * 100)}
                    onChange={e => setEditParams(p => ({ ...p, peso_productividad_individual: parseFloat(e.target.value) / 100 || 0 }))}
                    placeholder="40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-wide mb-1.5">
                  Peso resultado global
                </label>
                <div className="relative">
                  <input
                    type="number" step="5" min="0" max="100"
                    className="input-field pr-8"
                    value={Math.round(editParams.peso_resultado_global * 100)}
                    onChange={e => setEditParams(p => ({ ...p, peso_resultado_global: parseFloat(e.target.value) / 100 || 0 }))}
                    placeholder="60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div className="flex items-end pb-0.5">
                {(() => {
                  const suma = Math.round((editParams.peso_productividad_individual + editParams.peso_resultado_global) * 100)
                  const ok = suma === 100
                  return (
                    <div className={clsx(
                      'text-[11px] rounded-lg px-3 py-2.5 w-full text-center font-semibold',
                      ok ? 'bg-gecotex-green/10 text-gecotex-green' : 'bg-red-50 text-red-500'
                    )}>
                      Suma pesos: {suma}% {ok ? '✓' : '≠ 100%'}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Tabla Factor K */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-wide">Tabla Factor K</h4>
                <p className="text-[11px] text-gecotex-ink-muted mt-0.5">Define los tramos de K y el porcentaje de bonus correspondiente</p>
              </div>
              <button onClick={addTramo} className="btn-soft !py-1.5 !px-3 flex items-center gap-1.5 text-[12px]">
                <Plus size={13} /> Añadir tramo
              </button>
            </div>
            <div className="border border-gecotex-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gecotex-bg/60">
                    <th className="table-header text-left py-2.5 px-4 font-semibold text-[11px]">K mínimo</th>
                    <th className="table-header text-left py-2.5 px-4 font-semibold text-[11px]">K máximo</th>
                    <th className="table-header text-left py-2.5 px-4 font-semibold text-[11px]">% Bonus</th>
                    <th className="table-header w-12 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gecotex-border-soft">
                  {editParams.tabla_factor_k.map((tramo, idx) => (
                    <tr key={idx} className="hover:bg-gecotex-bg/20">
                      <td className="px-4 py-2">
                        <input
                          type="number" step="0.01" min="0"
                          className="input-field !py-1.5 text-xs w-24 font-mono"
                          value={tramo.k_min}
                          onChange={e => updateTramo(idx, 'k_min', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" step="0.01" min="0"
                          className="input-field !py-1.5 text-xs w-24 font-mono"
                          value={tramo.k_max ?? ''}
                          onChange={e => updateTramo(idx, 'k_max', e.target.value)}
                          placeholder="∞"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="relative w-28">
                          <input
                            type="number" step="5" min="0" max="200"
                            className="input-field !py-1.5 text-xs pr-8 font-mono"
                            value={Math.round(tramo.porcentaje_bonus * 100)}
                            onChange={e => updateTramo(idx, 'porcentaje_bonus', parseFloat(e.target.value) / 100 || 0)}
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeTramo(idx)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar tramo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Fila dinámica fija */}
                  <tr className="bg-gecotex-bg/50 text-gecotex-ink-muted">
                    <td className="px-4 py-2.5 text-xs font-mono font-semibold">
                      ≥ {DYNAMIC_K_THRESHOLD.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gecotex-ink-muted">—</td>
                    <td className="px-4 py-2.5 text-xs italic text-gecotex-ink-muted">
                      Dinámico · 100% + (K − 1) × 100%
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-[10px] bg-gecotex-bg text-gecotex-ink-muted px-1.5 py-0.5 rounded">fijo</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gecotex-ink-muted mt-2">
              Para K &gt; {DYNAMIC_K_THRESHOLD.toFixed(2)} se aplica siempre la fórmula dinámica, independientemente de la tabla.
            </p>
          </div>

          {/* Footer config */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gecotex-border-soft">
            <button onClick={() => setShowConfig(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveConfig} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Guardar configuración
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gecotex-border-soft">
          <h3 className="text-[14px] font-bold text-gecotex-ink">
            Cálculo de Bonus · {nombreMes(now.getMonth() + 1)} {año}
          </h3>
          <div className="flex gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gecotex-bg border border-gecotex-border rounded-lg">
              <Search size={14} className="text-gecotex-ink-muted" />
              <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-xs w-32" />
            </div>
            <button className="btn-soft !py-1.5 !px-3 flex items-center gap-1.5"><Filter size={14} /> Filtros</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gecotex-bg/50">
                <th className="table-header">Operario</th>
                <th className="table-header text-right">UPs</th>
                <th className="table-header text-right">Objetivo</th>
                <th className="table-header text-right">% Obj.</th>
                <th className="table-header text-center">Factor K</th>
                <th className="table-header text-right">% Bonus</th>
                <th className="table-header text-right">Importe</th>
                <th className="table-header text-center">Elegible</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gecotex-border-soft">
              {operariosBonus.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gecotex-ink-muted text-sm italic">
                    Sin datos de bonus para este mes
                  </td>
                </tr>
              ) : operariosBonus.map(op => {
                const pctObj = op.objetivo_up > 0 ? (op.up_producidas / op.objetivo_up) * 100 : 0
                return (
                  <tr key={op.operario_id} className={clsx('hover:bg-gecotex-bg/30 transition-colors', !op.elegible && 'opacity-60')}>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold',
                          op.elegible ? 'bg-gecotex-navy' : 'bg-gecotex-ink-muted'
                        )}>
                          {op.operario_nombre?.[0]}
                        </div>
                        <div>
                          <p className="text-[13.5px] font-bold text-gecotex-ink leading-tight">{op.operario_nombre}</p>
                          <p className="text-[11px] text-gecotex-ink-muted mt-0.5">Antigüedad: {op.antiguedad_meses}m</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-right font-mono font-bold">{fmtUP(op.up_producidas)}</td>
                    <td className="table-cell text-right font-mono text-gecotex-ink-sub">{fmtUP(op.objetivo_up)}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-gecotex-border-soft rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full', pctObj >= 100 ? 'bg-gecotex-green' : pctObj >= 85 ? 'bg-gecotex-blue' : 'bg-gecotex-red')}
                            style={{ width: `${Math.min(100, pctObj)}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-bold font-mono min-w-[32px]">{Math.round(pctObj)}%</span>
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <Semaforo valor={op.factor_k} tipo="factor_k" size="sm" dot={false} />
                    </td>
                    <td className="table-cell text-right font-mono font-bold text-gecotex-ink">
                      {Math.round(op.porcentaje_bonus_productividad * 100)}%
                    </td>
                    <td className="table-cell text-right font-mono font-black text-[15px] text-gecotex-navy">
                      {op.importe_estimado ? `${op.importe_estimado.toLocaleString('es-ES')} €` : '—'}
                    </td>
                    <td className="table-cell text-center">
                      <Semaforo valor={op.elegible ? 'green' : 'red'} tipo="manual" size="sm" />
                    </td>
                    <td className="table-cell text-right text-gecotex-ink-muted">
                      <MoreHorizontal size={16} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-[#FBFCFE] border-t-2 border-gecotex-navy">
              <tr className="font-bold">
                <td className="px-5 py-5 text-[13px] text-gecotex-ink">TOTAL EQUIPO</td>
                <td className="table-cell text-right font-mono text-gecotex-ink">{totalUPs.toFixed(1)}</td>
                <td className="table-cell text-right font-mono text-gecotex-ink-sub">{totalObj.toFixed(0)}</td>
                <td className="table-cell text-right font-mono text-gecotex-blue">
                  {totalObj > 0 ? Math.round((totalUPs / totalObj) * 100) : 0}%
                </td>
                <td colSpan={2} />
                <td className="table-cell text-right font-mono text-[17px] text-gecotex-navy">
                  {totalEuros.toLocaleString('es-ES')} €
                </td>
                <td className="table-cell text-center">
                  <span className="bg-gecotex-navy text-white px-2 py-0.5 rounded text-[10px]">
                    {elegibles}/{operariosBonus.length}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
