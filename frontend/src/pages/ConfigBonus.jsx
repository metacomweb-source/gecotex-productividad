import { useState, useEffect, useMemo } from 'react'
import {
  Loader2, Save, Plus, Trash2, ChevronDown, ChevronUp,
  Info, ToggleLeft, ToggleRight, AlertTriangle, Check, X, Pencil
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import api from '../api/client'

// ── Constants ─────────────────────────────────────────────────────────────────

const CY = new Date().getFullYear()
const CS = new Date().getMonth() < 6 ? 1 : 2

const DEFAULT_TRAMOS = [
  { p_min: 0.0, p_max: 5.0, porcentaje: 0.00 },
  { p_min: 5.0, p_max: 7.0, porcentaje: 0.25 },
  { p_min: 7.0, p_max: 8.5, porcentaje: 0.60 },
  { p_min: 8.5, p_max: 10.1, porcentaje: 1.00 },
]

const DEFAULT_AREA1 = {
  peso_factor_k: 0.50, peso_sla: 0.30, peso_registro: 0.20, sla_horas: 2.0,
  tabla_conversion_k: [
    { k_min: 0.00, k_max: 0.70, puntuacion: 3.0 },
    { k_min: 0.70, k_max: 0.85, puntuacion: 5.0 },
    { k_min: 0.85, k_max: 1.00, puntuacion: 7.5 },
    { k_min: 1.00, k_max: 1.00, puntuacion: 9.0 },
  ],
  tabla_conversion_pct: [
    { pct_min: 0,  pct_max: 60,  puntuacion: 3.0 },
    { pct_min: 60, pct_max: 75,  puntuacion: 5.0 },
    { pct_min: 75, pct_max: 85,  puntuacion: 7.0 },
    { pct_min: 85, pct_max: 95,  puntuacion: 8.5 },
    { pct_min: 95, pct_max: 101, puntuacion: 10.0 },
  ],
}

const AREA_META = {
  1: { label: 'Productividad DUAs', icon: '📊', bg: '#D6E4F0', fg: '#1F5C99' },
  2: { label: 'Calidad Operativa',  icon: '✅', bg: '#D5F5E3', fg: '#196B4A' },
  3: { label: 'Gecotex Corporate',  icon: '🤝', bg: '#FEF0E6', fg: '#7B3F00' },
  4: { label: 'Digitalización',     icon: '💡', bg: '#F3E5F5', fg: '#5B2C6F' },
}

const TRAMO_CLR = [
  { bg: '#FADBD8', fg: '#C0392B' },
  { bg: '#FAE5D3', fg: '#E67E22' },
  { bg: '#FEF9E7', fg: '#F39C12' },
  { bg: '#D5F5E3', fg: '#27AE60' },
]

const TRAMO_EMOJI = ['🔴', '🟠', '🟡', '🟢']

// ── Utilities ─────────────────────────────────────────────────────────────────

function buildForm(cfg, año, semestre) {
  const a1 = cfg?.config_area1
  return {
    fecha_inicio: cfg?.fecha_inicio?.slice(0, 10) || `${año}-01-01`,
    fecha_fin: cfg?.fecha_fin?.slice(0, 10) || (semestre === 1 ? `${año}-06-30` : `${año}-12-31`),
    antiguedad_minima_meses: cfg?.antiguedad_minima_meses ?? 12,
    peso_area1: cfg?.peso_area1 ?? 0.40,
    peso_area2: cfg?.peso_area2 ?? 0.30,
    peso_area3: cfg?.peso_area3 ?? 0.20,
    peso_area4: cfg?.peso_area4 ?? 0.10,
    peso_auto_evaluacion: cfg?.peso_auto_evaluacion ?? 0.30,
    factor_equipo_activo: cfg?.factor_equipo_activo ?? true,
    factor_equipo_porcentaje: cfg?.factor_equipo_porcentaje ?? 0.05,
    factor_equipo_meses_minimos: cfg?.factor_equipo_meses_minimos ?? 4,
    tabla_tramos: cfg?.tabla_tramos_escalonados
      ? JSON.parse(JSON.stringify(cfg.tabla_tramos_escalonados))
      : JSON.parse(JSON.stringify(DEFAULT_TRAMOS)),
    config_area1: {
      peso_factor_k:   a1?.peso_factor_k   ?? 0.50,
      peso_sla:        a1?.peso_sla        ?? 0.30,
      peso_registro:   a1?.peso_registro   ?? 0.20,
      sla_horas:       a1?.sla_horas       ?? 2.0,
      tabla_conversion_k:  a1?.tabla_conversion_k
        ? JSON.parse(JSON.stringify(a1.tabla_conversion_k))
        : JSON.parse(JSON.stringify(DEFAULT_AREA1.tabla_conversion_k)),
      tabla_conversion_pct: a1?.tabla_conversion_pct
        ? JSON.parse(JSON.stringify(a1.tabla_conversion_pct))
        : JSON.parse(JSON.stringify(DEFAULT_AREA1.tabla_conversion_pct)),
    },
  }
}

function simCalc(form, sim) {
  if (!form) return null
  const k   = parseFloat(sim.k)   || 0
  const sla = parseFloat(sim.sla) || 0
  const reg = parseFloat(sim.reg) || 0
  const a2  = Math.min(10, Math.max(0, parseFloat(sim.a2) || 0))
  const a3  = Math.min(10, Math.max(0, parseFloat(sim.a3) || 0))
  const a4  = Math.min(10, Math.max(0, parseFloat(sim.a4) || 0))
  const salario = parseFloat(sim.salario) || 24000
  const pctMax  = (parseFloat(sim.pctMax) || 5) / 100
  const cfg1    = form.config_area1

  let scoreK = 3.0
  if (k >= 1.0) {
    scoreK = Math.min(10.0, 9.0 + (k - 1.0) * 10)
  } else {
    for (const t of [...cfg1.tabla_conversion_k].sort((a, b) => a.k_min - b.k_min)) {
      if (k >= Number(t.k_min) && k < Number(t.k_max)) { scoreK = Number(t.puntuacion); break }
    }
  }
  let scoreSla = 10.0
  const sortedPct = [...cfg1.tabla_conversion_pct].sort((a, b) => a.pct_min - b.pct_min)
  for (const t of sortedPct) {
    if (sla >= Number(t.pct_min) && sla < Number(t.pct_max)) { scoreSla = Number(t.puntuacion); break }
  }
  let scoreReg = 10.0
  for (const t of sortedPct) {
    if (reg >= Number(t.pct_min) && reg < Number(t.pct_max)) { scoreReg = Number(t.puntuacion); break }
  }

  const a1Score = Number(cfg1.peso_factor_k) * scoreK
                + Number(cfg1.peso_sla)       * scoreSla
                + Number(cfg1.peso_registro)  * scoreReg

  const total = form.peso_area1 * a1Score
              + form.peso_area2 * a2
              + form.peso_area3 * a3
              + form.peso_area4 * a4

  let pctTramo = 0, tramoIdx = 0
  const sorted = [...form.tabla_tramos].sort((a, b) => a.p_min - b.p_min)
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]
    if (total >= t.p_min && (total < t.p_max || i === sorted.length - 1)) {
      pctTramo = t.porcentaje
      tramoIdx = Math.min(i, TRAMO_CLR.length - 1)
      break
    }
  }

  const factorEq = form.factor_equipo_activo ? Number(form.factor_equipo_porcentaje) : 0
  const bonus    = salario * pctMax * pctTramo * (1 + factorEq) / 2

  return {
    a1: a1Score.toFixed(2), a2: a2.toFixed(2), a3: a3.toFixed(2), a4: a4.toFixed(2),
    total: total.toFixed(2), pctTramo, tramoIdx, factorEq, bonus, salario, pctMax,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Tip({ children }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={12} className="text-gecotex-ink-muted cursor-help ml-1 flex-shrink-0" />
      {show && (
        <span className="absolute z-50 bottom-5 left-0 w-60 bg-gecotex-ink text-white text-[11px] leading-snug rounded-xl px-3 py-2 shadow-gx-lg pointer-events-none">
          {children}
        </span>
      )}
    </span>
  )
}

function Block({ title, icon, accentColor, open, onToggle, summary, children }) {
  return (
    <div className="bg-white rounded-xl border border-gecotex-border shadow-gx-sm overflow-hidden"
      style={{ borderLeft: `4px solid ${accentColor}` }}>
      <button onClick={onToggle} type="button"
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors text-left gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="font-semibold text-gecotex-ink text-[13.5px]">{title}</p>
            {!open && summary && <p className="text-xs text-gecotex-ink-sub mt-0.5 truncate">{summary}</p>}
          </div>
        </div>
        {open
          ? <ChevronUp size={16} className="text-gecotex-ink-muted flex-shrink-0" />
          : <ChevronDown size={16} className="text-gecotex-ink-muted flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-4 border-t border-gecotex-border-soft space-y-5">
          {children}
        </div>
      )}
    </div>
  )
}

function OkBadge({ ok, okText, errText }) {
  return (
    <div className={clsx('flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 font-medium',
      ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
      {ok ? <Check size={12} /> : <AlertTriangle size={12} />}
      {ok ? okText : errText}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ConfigBonus() {
  const [año, setAño]               = useState(CY)
  const [semestre, setSemestre]     = useState(CS)
  const [config, setConfig]         = useState(null)
  const [factores, setFactores]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [savingFactor, setSavingFactor] = useState(null)
  const [form, setForm]             = useState(null)
  const [savedForm, setSavedForm]   = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [openBlocks, setOpenBlocks] = useState({ b1: true, b2: true, b3: true, b4: false, b5: true })
  const [tabArea, setTabArea]       = useState(2)
  const [editFactor, setEditFactor] = useState(null)
  const [newFactor, setNewFactor]   = useState({ area: 2, nombre: '', descripcion: '', nota_contexto: '' })
  const [showNewFactor, setShowNewFactor] = useState(false)
  const [sim, setSim] = useState({ k: '1.0', sla: '90', reg: '95', a2: '7', a3: '7', a4: '7', salario: '24000', pctMax: '5' })

  const cargar = async () => {
    setLoading(true)
    try {
      const [cfgR, facR] = await Promise.allSettled([
        api.get(`/bonus/config/${año}/${semestre}`),
        api.get('/bonus/factores'),
      ])
      const cfg = cfgR.status === 'fulfilled' ? cfgR.value.data : null
      setConfig(cfg)
      setFactores(facR.status === 'fulfilled' ? facR.value.data : [])
      const f = buildForm(cfg, año, semestre)
      setForm(f)
      setSavedForm(JSON.parse(JSON.stringify(f)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [año, semestre]) // eslint-disable-line react-hooks/exhaustive-deps

  // Validations (all depend on form, computed after the hooks above)
  const pesosSuman    = form ? Math.abs((form.peso_area1 + form.peso_area2 + form.peso_area3 + form.peso_area4) - 1.0) < 0.01 : false
  const pesosCfg1Ok   = form ? Math.abs((form.config_area1.peso_factor_k + form.config_area1.peso_sla + form.config_area1.peso_registro) - 1.0) < 0.01 : false
  const tramosOk      = form ? form.tabla_tramos.length > 0 && form.tabla_tramos.every((t, i, a) => i === 0 || Math.abs(t.p_min - a[i - 1].p_max) < 0.015) : false

  const hasChanges = useMemo(() => {
    if (!form || !savedForm) return false
    return JSON.stringify(form) !== JSON.stringify(savedForm)
  }, [form, savedForm])

  const simResult = useMemo(() => simCalc(form, sim), [form, sim])

  const toggleBlock = (b) => setOpenBlocks(o => ({ ...o, [b]: !o[b] }))

  // Form updaters
  const setF     = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setTramo = (i, key, val) => setForm(f => {
    const t = [...f.tabla_tramos]; t[i] = { ...t[i], [key]: val }; return { ...f, tabla_tramos: t }
  })
  const setCfg1    = (key, val) => setForm(f => ({ ...f, config_area1: { ...f.config_area1, [key]: val } }))
  const setCfg1K   = (i, key, val) => setForm(f => {
    const t = [...f.config_area1.tabla_conversion_k]; t[i] = { ...t[i], [key]: val }
    return { ...f, config_area1: { ...f.config_area1, tabla_conversion_k: t } }
  })
  const setCfg1Pct = (i, key, val) => setForm(f => {
    const t = [...f.config_area1.tabla_conversion_pct]; t[i] = { ...t[i], [key]: val }
    return { ...f, config_area1: { ...f.config_area1, tabla_conversion_pct: t } }
  })

  const handleSave = async () => {
    if (!pesosSuman) { toast.error('Los pesos de las 4 áreas deben sumar 100%'); return }
    setSaving(true); setShowModal(false)
    try {
      const payload = {
        año, semestre,
        fecha_inicio: form.fecha_inicio, fecha_fin: form.fecha_fin,
        antiguedad_minima_meses: parseInt(form.antiguedad_minima_meses),
        peso_area1: form.peso_area1, peso_area2: form.peso_area2,
        peso_area3: form.peso_area3, peso_area4: form.peso_area4,
        peso_auto_evaluacion: form.peso_auto_evaluacion,
        peso_dir_evaluacion: Math.round((1 - form.peso_auto_evaluacion) * 100) / 100,
        factor_equipo_activo: form.factor_equipo_activo,
        factor_equipo_porcentaje: form.factor_equipo_porcentaje,
        factor_equipo_meses_minimos: parseInt(form.factor_equipo_meses_minimos),
        tabla_tramos_escalonados: form.tabla_tramos,
        config_area1: form.config_area1,
      }
      if (config) await api.put(`/bonus/config/${config.id}`, payload)
      else         await api.post('/bonus/config', payload)
      toast.success('Configuración guardada')
      await cargar()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const handleToggleFactor = async (f) => {
    setSavingFactor(f.id)
    try {
      if (f.activo) await api.delete(`/bonus/factores/${f.id}`)
      else           await api.put(`/bonus/factores/${f.id}`, { activo: true })
      setFactores(fs => fs.map(x => x.id === f.id ? { ...x, activo: !x.activo } : x))
    } catch { toast.error('Error al actualizar factor') }
    finally  { setSavingFactor(null) }
  }

  const handleUpdateFactor = async () => {
    if (!editFactor) return
    try {
      await api.put(`/bonus/factores/${editFactor.id}`, editFactor.data)
      setFactores(fs => fs.map(x => x.id === editFactor.id ? { ...x, ...editFactor.data } : x))
      setEditFactor(null)
      toast.success('Factor actualizado')
    } catch { toast.error('Error al actualizar') }
  }

  const handleCrearFactor = async () => {
    if (!newFactor.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    try {
      const r = await api.post('/bonus/factores', { ...newFactor, area: tabArea })
      setFactores(fs => [...fs, r.data])
      setNewFactor({ area: tabArea, nombre: '', descripcion: '', nota_contexto: '' })
      setShowNewFactor(false)
      toast.success('Factor creado')
    } catch (e) { toast.error(e.response?.data?.detail || 'Error al crear factor') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <Loader2 size={28} className="animate-spin text-gecotex-primary" />
    </div>
  )
  if (!form) return null

  const pctTotal  = Math.round((form.peso_area1 + form.peso_area2 + form.peso_area3 + form.peso_area4) * 100)
  const cfg1Total = Math.round((form.config_area1.peso_factor_k + form.config_area1.peso_sla + form.config_area1.peso_registro) * 100)
  const factoresTab = factores.filter(f => f.area === tabArea)

  return (
    <div className="animate-fade-in">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-gecotex-bg pb-4 pt-1 mb-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <select className="input-field w-28" value={año} onChange={e => setAño(+e.target.value)}>
              {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
            </select>
            <select className="input-field w-44" value={semestre} onChange={e => setSemestre(+e.target.value)}>
              <option value={1}>Semestre 1 (Ene–Jun)</option>
              <option value={2}>Semestre 2 (Jul–Dic)</option>
            </select>
            {!config && (
              <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full">
                Sin configurar — se creará al guardar
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full font-medium">
                ● Cambios sin guardar
              </span>
            )}
            <button
              onClick={() => setShowModal(true)}
              disabled={saving || !pesosSuman}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-gx-sm',
                pesosSuman
                  ? 'bg-gecotex-primary text-white hover:bg-gecotex-navy-dark'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {config ? 'Guardar cambios' : 'Crear configuración'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-panel layout ───────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* LEFT PANEL — 65% */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── BLOCK 1: Parámetros generales ─────────────────────────────── */}
          <Block title="Parámetros generales" icon="⚙️" accentColor="#1F3864"
            open={openBlocks.b1} onToggle={() => toggleBlock('b1')}
            summary={`${form.fecha_inicio} → ${form.fecha_fin} · Antigüedad mín: ${form.antiguedad_minima_meses} meses`}>

            <div>
              <p className="text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-widest mb-3">
                Período de evaluación
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fecha inicio</label>
                  <input type="date" className="input-field" value={form.fecha_inicio}
                    onChange={e => setF('fecha_inicio', e.target.value)} />
                </div>
                <div>
                  <label className="label">Fecha fin</label>
                  <input type="date" className="input-field" value={form.fecha_fin}
                    onChange={e => setF('fecha_fin', e.target.value)} />
                </div>
              </div>
              {form.fecha_inicio && form.fecha_fin && (() => {
                const meses = Math.round((new Date(form.fecha_fin) - new Date(form.fecha_inicio)) / (1000 * 60 * 60 * 24 * 30.5))
                return <p className="text-xs text-gecotex-ink-sub mt-2">Duración calculada: <strong>{meses} meses</strong></p>
              })()}
            </div>

            <div>
              <label className="label flex items-center">
                Antigüedad mínima para acceder al bonus
                <Tip>Solo empleados con más de este número de meses en la empresa son elegibles para recibir bonus semestral.</Tip>
              </label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={36} className="input-field w-24"
                  value={form.antiguedad_minima_meses}
                  onChange={e => setF('antiguedad_minima_meses', parseInt(e.target.value) || 0)} />
                <span className="text-sm text-gecotex-ink-sub">meses</span>
              </div>
            </div>

            {/* Factor Equipo */}
            <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-yellow-800">⭐ Factor Equipo colectivo</p>
                <button type="button"
                  onClick={() => setF('factor_equipo_activo', !form.factor_equipo_activo)}
                  className="flex items-center gap-2">
                  {form.factor_equipo_activo
                    ? <ToggleRight size={22} className="text-yellow-600" />
                    : <ToggleLeft  size={22} className="text-gray-400" />}
                  <span className={clsx('text-xs font-semibold',
                    form.factor_equipo_activo ? 'text-yellow-800' : 'text-gray-500')}>
                    {form.factor_equipo_activo ? 'Activado' : 'Desactivado'}
                  </span>
                </button>
              </div>

              {form.factor_equipo_activo && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label text-yellow-800 flex items-center">
                      Bonus adicional
                      <Tip>Si el equipo cumple el objetivo en los meses requeridos, todos los empleados elegibles reciben este % adicional sobre su bonus individual.</Tip>
                    </label>
                    <div className="relative">
                      <input type="number" min={0} max={20} step={1} className="input-field pr-8"
                        value={Math.round(form.factor_equipo_porcentaje * 100)}
                        onChange={e => setF('factor_equipo_porcentaje', (parseInt(e.target.value) || 0) / 100)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="label text-yellow-800 flex items-center">
                      Meses mínimos de cumplimiento
                      <Tip>El equipo debe superar el objetivo de UPs en al menos este número de meses del período semestral.</Tip>
                    </label>
                    <input type="range" min={1} max={6} step={1} className="w-full mt-2 accent-yellow-500"
                      value={form.factor_equipo_meses_minimos}
                      onChange={e => setF('factor_equipo_meses_minimos', parseInt(e.target.value))} />
                    <div className="flex justify-between text-[10px] text-yellow-700 mt-1">
                      {[1,2,3,4,5,6].map(m => (
                        <span key={m} className={m === form.factor_equipo_meses_minimos ? 'font-bold' : 'opacity-50'}>{m}</span>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-700 font-semibold text-center mt-1">
                      {form.factor_equipo_meses_minimos} de 6 meses
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Block>

          {/* ── BLOCK 2: Pesos de las 4 áreas ─────────────────────────────── */}
          <Block title="Pesos de las 4 áreas de evaluación" icon="⚖️" accentColor="#2E75B6"
            open={openBlocks.b2} onToggle={() => toggleBlock('b2')}
            summary={[1,2,3,4].map(a => `A${a}:${Math.round(form[`peso_area${a}`]*100)}%`).join(' · ')}>

            <p className="text-xs text-gecotex-ink-sub">Los 4 pesos deben sumar exactamente 100%.</p>

            {/* Stacked bar */}
            <div>
              <div className="flex rounded-xl overflow-hidden h-7 w-full border border-gecotex-border">
                {[1,2,3,4].map(a => {
                  const pct = form[`peso_area${a}`] * 100
                  const m   = AREA_META[a]
                  return (
                    <div key={a} title={`${m.label}: ${Math.round(pct)}%`}
                      className="flex items-center justify-center text-white text-[11px] font-bold transition-all duration-300"
                      style={{ width: `${pct}%`, background: m.fg, minWidth: pct > 0 ? 4 : 0 }}>
                      {pct >= 12 && `${Math.round(pct)}%`}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-2">
                {[1,2,3,4].map(a => (
                  <span key={a} className="flex items-center gap-1.5 text-[11px] text-gecotex-ink-sub">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: AREA_META[a].fg }} />
                    {AREA_META[a].icon} Área {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              {[1,2,3,4].map(a => {
                const m   = AREA_META[a]
                const pct = Math.round(form[`peso_area${a}`] * 100)
                return (
                  <div key={a} className="rounded-xl p-3 space-y-2" style={{ background: m.bg }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-semibold" style={{ color: m.fg }}>
                        {m.icon} Área {a} — {m.label}
                        {a === 1 && <span className="ml-2 text-[10px] opacity-60">(calculada automáticamente)</span>}
                      </span>
                      <span className="text-sm font-bold font-mono" style={{ color: m.fg }}>{pct}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={5}
                      style={{ accentColor: m.fg }}
                      className="w-full"
                      value={pct}
                      onChange={e => setF(`peso_area${a}`, parseInt(e.target.value) / 100)} />
                  </div>
                )
              })}
            </div>

            <OkBadge ok={pesosSuman}
              okText={`Total: ${pctTotal}% ✓`}
              errText={`Total: ${pctTotal}% — Los pesos deben sumar exactamente 100%`} />

            {/* Auto/Dir split */}
            <div className="pt-3 border-t border-gecotex-border-soft space-y-3">
              <p className="text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-widest">
                Ponderación autoevaluación / dirección (Áreas 2, 3, 4)
                <Tip>La nota final de cada factor = (nota del empleado × peso auto) + (nota de la dirección × peso dirección).</Tip>
              </p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gecotex-ink-sub w-20">Empleado</span>
                <input type="range" min={10} max={50} step={5} className="flex-1 accent-gecotex-blue"
                  value={Math.round(form.peso_auto_evaluacion * 100)}
                  onChange={e => setF('peso_auto_evaluacion', parseInt(e.target.value) / 100)} />
                <span className="text-sm font-bold text-gecotex-blue w-10 text-right">
                  {Math.round(form.peso_auto_evaluacion * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gecotex-ink-muted w-20">Dirección</span>
                <div className="flex-1 h-2 bg-gecotex-bg rounded-full border border-gecotex-border" />
                <span className="text-sm font-bold text-gecotex-ink-sub w-10 text-right italic">
                  {Math.round((1 - form.peso_auto_evaluacion) * 100)}%
                </span>
              </div>
            </div>
          </Block>

          {/* ── BLOCK 3: Tramos escalonados ───────────────────────────────── */}
          <Block title="Sistema escalonado de bonus" icon="📈" accentColor="#196B4A"
            open={openBlocks.b3} onToggle={() => toggleBlock('b3')}
            summary={`${form.tabla_tramos.length} tramos · ${tramosOk ? 'Contiguos ✓' : '⚠️ Error en tramos'}`}>

            <p className="text-xs text-gecotex-ink-sub">
              Define qué porcentaje del bonus máximo se aplica según la puntuación total obtenida (escala 0–10).
            </p>

            {/* Visual scale */}
            <div>
              <div className="flex rounded-xl overflow-hidden h-8 border border-gecotex-border">
                {form.tabla_tramos.map((t, i) => {
                  const w   = Math.max(0, (t.p_max - t.p_min) / 10 * 100)
                  const clr = TRAMO_CLR[Math.min(i, TRAMO_CLR.length - 1)]
                  return (
                    <div key={i}
                      className="flex items-center justify-center text-[10.5px] font-bold transition-all duration-300"
                      style={{
                        width: `${w}%`, background: clr.bg, color: clr.fg,
                        borderRight: i < form.tabla_tramos.length - 1 ? '1px solid rgba(0,0,0,.08)' : 'none',
                      }}>
                      {w >= 8 && `${Math.round(t.porcentaje * 100)}%`}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gecotex-ink-muted mt-1 px-0.5">
                <span>0</span><span>2.5</span><span>5</span><span>7.5</span><span>10</span>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gecotex-border overflow-hidden">
              <div className="grid grid-cols-[28px_1fr_1fr_1fr_28px] text-[11px] font-semibold text-gecotex-ink-muted bg-gecotex-bg px-3 py-2 gap-2">
                <span />
                <span>Punt. mínima</span>
                <span>Punt. máxima</span>
                <span>% del bonus máx.</span>
                <span />
              </div>
              {form.tabla_tramos.map((t, i) => {
                const clr = TRAMO_CLR[Math.min(i, TRAMO_CLR.length - 1)]
                return (
                  <div key={i}
                    className="grid grid-cols-[28px_1fr_1fr_1fr_28px] items-center px-3 py-2 border-t border-gecotex-border-soft gap-2">
                    <span className="text-base text-center">{TRAMO_EMOJI[Math.min(i, 3)]}</span>
                    <input type="number" min={0} max={10} step={0.5} className="input-field text-xs py-1.5"
                      value={t.p_min}
                      onChange={e => setTramo(i, 'p_min', parseFloat(e.target.value) || 0)} />
                    <input type="number" min={0} max={10.1} step={0.5} className="input-field text-xs py-1.5"
                      value={t.p_max}
                      onChange={e => setTramo(i, 'p_max', parseFloat(e.target.value) || 0)} />
                    <div className="relative">
                      <input type="number" min={0} max={100} step={5} className="input-field text-xs py-1.5 pr-6"
                        value={Math.round(t.porcentaje * 100)}
                        onChange={e => setTramo(i, 'porcentaje', (parseInt(e.target.value) || 0) / 100)} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, tabla_tramos: f.tabla_tramos.filter((_, j) => j !== i) }))}
                      className="p-1 text-red-300 hover:text-red-600 transition-colors flex items-center justify-center">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <button type="button"
                onClick={() => setForm(f => ({ ...f, tabla_tramos: [...f.tabla_tramos, { p_min: 8.5, p_max: 10.1, porcentaje: 1.00 }] }))}
                className="text-xs flex items-center gap-1.5 text-gecotex-primary hover:underline">
                <Plus size={13} /> Añadir tramo
              </button>
              <OkBadge ok={tramosOk}
                okText="Tramos contiguos ✓"
                errText="Los tramos tienen huecos o solapas" />
            </div>
          </Block>

          {/* ── BLOCK 4: Config Área 1 ────────────────────────────────────── */}
          <Block title="Configuración del Área 1 — Productividad DUAs" icon="📊" accentColor="#1F5C99"
            open={openBlocks.b4} onToggle={() => toggleBlock('b4')}
            summary={`K:${Math.round(form.config_area1.peso_factor_k*100)}% · SLA:${Math.round(form.config_area1.peso_sla*100)}% · Reg:${Math.round(form.config_area1.peso_registro*100)}% · SLA=${form.config_area1.sla_horas}h`}>

            <p className="text-xs text-gecotex-ink-sub">
              El Área 1 se calcula automáticamente a partir de las UPs. Aquí defines cómo se ponderan las 3 métricas y cómo se convierten a puntuación.
            </p>

            {/* Sub A: pesos 3 métricas */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-widest">
                A — Pesos de las 3 métricas
              </p>
              {[
                { key: 'peso_factor_k', label: 'Factor K (productividad UPs)' },
                { key: 'peso_sla',      label: '% Expedientes en SLA' },
                { key: 'peso_registro', label: '% Registro completo' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gecotex-ink-sub w-48 flex-shrink-0">{label}</span>
                  <input type="range" min={0} max={100} step={5}
                    style={{ accentColor: '#1F5C99' }}
                    className="flex-1"
                    value={Math.round(form.config_area1[key] * 100)}
                    onChange={e => setCfg1(key, parseInt(e.target.value) / 100)} />
                  <span className="font-mono font-bold text-[#1F5C99] w-10 text-right text-sm">
                    {Math.round(form.config_area1[key] * 100)}%
                  </span>
                </div>
              ))}
              <OkBadge ok={pesosCfg1Ok}
                okText={`Total: ${cfg1Total}% ✓`}
                errText={`Total: ${cfg1Total}% — Debe ser 100%`} />
              <div className="flex items-center gap-3 pt-1">
                <label className="label flex items-center w-48 flex-shrink-0">
                  Objetivo SLA (horas)
                  <Tip>Tiempo máximo desde apertura del expediente hasta envío a aduana para contar como "dentro de SLA".</Tip>
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0.5} max={24} step={0.5} className="input-field w-24"
                    value={form.config_area1.sla_horas}
                    onChange={e => setCfg1('sla_horas', parseFloat(e.target.value) || 2)} />
                  <span className="text-xs text-gecotex-ink-sub">horas</span>
                </div>
              </div>
            </div>

            {/* Sub B: tabla K */}
            <div>
              <p className="text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-widest mb-3">
                B — Conversión Factor K → Puntuación
              </p>
              <div className="rounded-xl border border-gecotex-border overflow-hidden">
                <div className="grid grid-cols-[28px_1fr_1fr_1fr] text-[11px] font-semibold text-gecotex-ink-muted bg-gecotex-bg px-3 py-2 gap-2">
                  <span/><span>K mínimo</span><span>K máximo</span><span>Puntuación</span>
                </div>
                {form.config_area1.tabla_conversion_k.map((row, i) => {
                  const isLast = i === form.config_area1.tabla_conversion_k.length - 1
                  return (
                    <div key={i}
                      className="grid grid-cols-[28px_1fr_1fr_1fr] items-center px-3 py-2 border-t border-gecotex-border-soft gap-2">
                      <span className="text-center text-sm">{['🔴','🟠','🟡','🟢','⭐'][Math.min(i,4)]}</span>
                      <input type="number" min={0} max={2} step={0.05}
                        className={clsx('input-field text-xs py-1.5', isLast && 'bg-gecotex-bg text-gecotex-ink-muted')}
                        readOnly={isLast}
                        value={Number(row.k_min).toFixed(2)}
                        onChange={e => setCfg1K(i, 'k_min', parseFloat(e.target.value))} />
                      {isLast
                        ? <span className="input-field text-xs py-1.5 bg-gecotex-bg text-gecotex-ink-muted italic">≥ 1.00</span>
                        : <input type="number" min={0} max={2} step={0.05} className="input-field text-xs py-1.5"
                            value={Number(row.k_max).toFixed(2)}
                            onChange={e => setCfg1K(i, 'k_max', parseFloat(e.target.value))} />}
                      {isLast
                        ? <span className="input-field text-xs py-1.5 bg-gecotex-bg text-gecotex-ink-muted italic">9 + (K−1)×10</span>
                        : <input type="number" min={0} max={10} step={0.5} className="input-field text-xs py-1.5"
                            value={Number(row.puntuacion).toFixed(1)}
                            onChange={e => setCfg1K(i, 'puntuacion', parseFloat(e.target.value))} />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sub C: tabla % */}
            <div>
              <p className="text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-widest mb-3">
                C — Conversión % (SLA y Registro) → Puntuación
              </p>
              <div className="rounded-xl border border-gecotex-border overflow-hidden">
                <div className="grid grid-cols-[28px_1fr_1fr_1fr] text-[11px] font-semibold text-gecotex-ink-muted bg-gecotex-bg px-3 py-2 gap-2">
                  <span/><span>% mínimo</span><span>% máximo</span><span>Puntuación</span>
                </div>
                {form.config_area1.tabla_conversion_pct.map((row, i) => (
                  <div key={i}
                    className="grid grid-cols-[28px_1fr_1fr_1fr] items-center px-3 py-2 border-t border-gecotex-border-soft gap-2">
                    <span className="text-center text-sm">{['🔴','🟠','🟡','🟢','⭐'][Math.min(i,4)]}</span>
                    <input type="number" min={0} max={100} step={5} className="input-field text-xs py-1.5"
                      value={row.pct_min}
                      onChange={e => setCfg1Pct(i, 'pct_min', parseInt(e.target.value) || 0)} />
                    <input type="number" min={0} max={101} step={5} className="input-field text-xs py-1.5"
                      value={row.pct_max}
                      onChange={e => setCfg1Pct(i, 'pct_max', parseInt(e.target.value) || 0)} />
                    <input type="number" min={0} max={10} step={0.5} className="input-field text-xs py-1.5"
                      value={Number(row.puntuacion).toFixed(1)}
                      onChange={e => setCfg1Pct(i, 'puntuacion', parseFloat(e.target.value))} />
                  </div>
                ))}
              </div>
            </div>
          </Block>

          {/* ── BLOCK 5: Factores evaluación ──────────────────────────────── */}
          <Block title="Factores de evaluación (Áreas 2, 3 y 4)" icon="📋" accentColor="#5D6D7E"
            open={openBlocks.b5} onToggle={() => toggleBlock('b5')}
            summary={`${factores.filter(f => f.activo).length} activos de ${factores.length} totales`}>

            <p className="text-xs text-gecotex-ink-sub">
              Criterios que evalúan tanto el empleado como la dirección. Puedes editar, añadir y activar/desactivar cada uno.
            </p>

            {/* Area tabs */}
            <div className="flex gap-1 p-1 bg-gecotex-bg rounded-xl border border-gecotex-border">
              {[2,3,4].map(a => {
                const m   = AREA_META[a]
                const cnt = factores.filter(f => f.area === a && f.activo).length
                return (
                  <button key={a} type="button"
                    onClick={() => { setTabArea(a); setEditFactor(null); setShowNewFactor(false) }}
                    className={clsx(
                      'flex-1 py-2 px-2 rounded-lg text-[11.5px] font-medium transition-colors',
                      tabArea === a
                        ? 'bg-white shadow-gx-sm text-gecotex-ink font-semibold'
                        : 'text-gecotex-ink-sub hover:text-gecotex-ink'
                    )}>
                    {m.icon} Área {a}
                    <span className={clsx('ml-1 text-[10px]',
                      tabArea === a ? 'text-gecotex-primary font-bold' : 'text-gecotex-ink-muted')}>
                      ({cnt})
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Factor list */}
            <div className="space-y-2">
              {factoresTab.length === 0 && (
                <p className="text-xs text-gecotex-ink-muted italic text-center py-6">
                  Sin factores configurados para esta área
                </p>
              )}
              {factoresTab.map(f => (
                <div key={f.id}
                  className={clsx('rounded-xl border transition-all',
                    f.activo ? 'bg-white border-gecotex-border' : 'bg-gecotex-bg border-gecotex-border-soft opacity-60')}>
                  {editFactor?.id === f.id ? (
                    <div className="p-4 space-y-3">
                      <input className="input-field text-sm font-medium"
                        value={editFactor.data.nombre || ''}
                        onChange={e => setEditFactor(ef => ({ ...ef, data: { ...ef.data, nombre: e.target.value } }))}
                        placeholder="Nombre del factor" />
                      <input className="input-field text-xs"
                        value={editFactor.data.descripcion || ''}
                        onChange={e => setEditFactor(ef => ({ ...ef, data: { ...ef.data, descripcion: e.target.value } }))}
                        placeholder="Descripción breve" />
                      <input className="input-field text-xs"
                        value={editFactor.data.nota_contexto || ''}
                        onChange={e => setEditFactor(ef => ({ ...ef, data: { ...ef.data, nota_contexto: e.target.value } }))}
                        placeholder="Nota de contexto / criterios de puntuación" />
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setEditFactor(null)} className="btn-secondary text-xs">Cancelar</button>
                        <button type="button" onClick={handleUpdateFactor} className="btn-primary text-xs flex items-center gap-1">
                          <Check size={12} /> Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-[13px] font-medium text-gecotex-ink',
                          !f.activo && 'line-through text-gecotex-ink-muted')}>
                          {f.nombre}
                        </p>
                        {f.nota_contexto && (
                          <p className="text-[11px] text-gecotex-ink-sub mt-0.5 line-clamp-2">{f.nota_contexto}</p>
                        )}
                        {!f.activo && <span className="text-[10px] text-gray-400 italic">Inactivo</span>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button"
                          onClick={() => setEditFactor({ id: f.id, data: { nombre: f.nombre, descripcion: f.descripcion || '', nota_contexto: f.nota_contexto || '' } })}
                          className="p-1.5 rounded-lg hover:bg-gecotex-bg text-gecotex-ink-muted hover:text-gecotex-ink transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button type="button"
                          onClick={() => handleToggleFactor(f)}
                          disabled={savingFactor === f.id}
                          className="p-1.5 rounded-lg hover:bg-gecotex-bg transition-colors">
                          {savingFactor === f.id
                            ? <Loader2 size={16} className="animate-spin text-gray-400" />
                            : f.activo
                              ? <ToggleRight size={18} className="text-gecotex-primary" />
                              : <ToggleLeft  size={18} className="text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* New factor */}
            {showNewFactor ? (
              <div className="rounded-xl border-2 border-dashed border-gecotex-blue bg-gecotex-blue-light/30 p-4 space-y-3">
                <p className="text-xs font-semibold text-gecotex-blue">Nuevo factor — Área {tabArea}</p>
                <input className="input-field text-sm"
                  value={newFactor.nombre}
                  onChange={e => setNewFactor(nf => ({ ...nf, nombre: e.target.value }))}
                  placeholder="Nombre del factor *" />
                <input className="input-field text-xs"
                  value={newFactor.descripcion}
                  onChange={e => setNewFactor(nf => ({ ...nf, descripcion: e.target.value }))}
                  placeholder="Descripción breve" />
                <input className="input-field text-xs"
                  value={newFactor.nota_contexto}
                  onChange={e => setNewFactor(nf => ({ ...nf, nota_contexto: e.target.value }))}
                  placeholder="Nota de contexto / criterios de puntuación" />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowNewFactor(false)} className="btn-secondary text-xs">Cancelar</button>
                  <button type="button" onClick={handleCrearFactor} className="btn-primary text-xs flex items-center gap-1">
                    <Plus size={12} /> Crear factor
                  </button>
                </div>
              </div>
            ) : (
              <button type="button"
                onClick={() => { setNewFactor({ area: tabArea, nombre: '', descripcion: '', nota_contexto: '' }); setShowNewFactor(true) }}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-gecotex-border text-xs text-gecotex-ink-muted hover:border-gecotex-blue hover:text-gecotex-blue transition-colors flex items-center justify-center gap-1.5">
                <Plus size={13} /> Añadir factor al Área {tabArea}
              </button>
            )}
          </Block>
        </div>

        {/* RIGHT PANEL — Simulator (sticky) */}
        <div className="w-[300px] flex-shrink-0">
          <div className="sticky top-14 space-y-0">
            <div className="bg-white rounded-xl border border-gecotex-border shadow-gx-lg overflow-hidden">
              <div className="px-5 py-4 bg-gecotex-navy">
                <p className="text-white font-bold text-[14px]">🧮 Simulador en vivo</p>
                <p className="text-white/50 text-xs mt-0.5">Resultado con la configuración actual</p>
              </div>
              <div className="px-4 py-4 space-y-4">

                {/* Employee params */}
                <div>
                  <p className="text-[10px] font-semibold text-gecotex-ink-sub uppercase tracking-widest mb-2">Empleado de ejemplo</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gecotex-ink-muted block mb-1">Salario anual (€)</label>
                      <input type="number" className="input-field text-xs py-1.5"
                        value={sim.salario} onChange={e => setSim(s => ({ ...s, salario: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-gecotex-ink-muted block mb-1">Máx. bonus (%)</label>
                      <div className="relative">
                        <input type="number" min={0} max={20} step={1} className="input-field text-xs py-1.5 pr-6"
                          value={sim.pctMax} onChange={e => setSim(s => ({ ...s, pctMax: e.target.value }))} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Area 1 inputs */}
                <div>
                  <p className="text-[10px] font-semibold text-gecotex-ink-sub uppercase tracking-widest mb-2">📊 Área 1 — métricas</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { k: 'k',   l: 'Factor K' },
                      { k: 'sla', l: 'SLA %' },
                      { k: 'reg', l: 'Regist. %' },
                    ].map(({ k, l }) => (
                      <div key={k}>
                        <label className="text-[9px] text-gecotex-ink-muted block mb-1">{l}</label>
                        <input type="number" min={0} step={0.1} className="input-field text-xs py-1.5 w-full"
                          value={sim[k]} onChange={e => setSim(s => ({ ...s, [k]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Areas 2/3/4 inputs */}
                <div>
                  <p className="text-[10px] font-semibold text-gecotex-ink-sub uppercase tracking-widest mb-2">Áreas 2, 3, 4 — punt. (0–10)</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[2,3,4].map(a => (
                      <div key={a}>
                        <label className="text-[9px] text-gecotex-ink-muted block mb-1">{AREA_META[a].icon} Área {a}</label>
                        <input type="number" min={0} max={10} step={0.5} className="input-field text-xs py-1.5 w-full"
                          value={sim[`a${a}`]} onChange={e => setSim(s => ({ ...s, [`a${a}`]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Result */}
                {simResult && (
                  <>
                    <div className="border-t border-gecotex-border-soft pt-3 space-y-1.5">
                      {[1,2,3,4].map(a => {
                        const score = parseFloat(simResult[`a${a}`])
                        const peso  = form[`peso_area${a}`]
                        const m     = AREA_META[a]
                        return (
                          <div key={a} className="flex items-center gap-1.5 text-[11px]">
                            <span>{m.icon}</span>
                            <span className="flex-1 text-gecotex-ink-sub">Área {a}</span>
                            <span className="font-mono text-gecotex-ink">{score.toFixed(1)}/10</span>
                            <span className="text-gecotex-ink-muted text-[9px]">×{Math.round(peso*100)}%</span>
                            <span className="font-mono font-bold text-gecotex-primary w-10 text-right">
                              {(score * peso).toFixed(2)}
                            </span>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between pt-2 border-t border-gecotex-border-soft">
                        <span className="text-xs font-bold text-gecotex-ink">TOTAL</span>
                        <span className="font-mono font-bold text-gecotex-ink text-lg">{simResult.total}/10</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gecotex-ink-sub">Tramo</span>
                        <span className="font-semibold" style={{ color: TRAMO_CLR[simResult.tramoIdx]?.fg }}>
                          {TRAMO_EMOJI[simResult.tramoIdx]} {Math.round(simResult.pctTramo * 100)}% del máx.
                        </span>
                      </div>
                      {form.factor_equipo_activo && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gecotex-ink-sub">Factor Equipo</span>
                          <span className="font-semibold text-yellow-700">
                            ⭐ +{Math.round(simResult.factorEq * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className={clsx('rounded-xl p-4 text-center',
                      simResult.bonus > 0 ? 'bg-green-50' : 'bg-gecotex-bg')}>
                      <p className="text-[10px] text-gecotex-ink-sub font-semibold uppercase tracking-widest mb-1">
                        💰 Bonus semestral estimado
                      </p>
                      <p className={clsx('text-2xl font-bold font-mono',
                        simResult.bonus > 0 ? 'text-green-700' : 'text-gecotex-ink-muted')}>
                        {simResult.bonus.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-gecotex-ink-muted mt-2 leading-relaxed">
                        {Number(simResult.salario).toLocaleString('es-ES')}€
                        {' × '}{Math.round(simResult.pctMax * 100)}%
                        {' × '}{Math.round(simResult.pctTramo * 100)}%
                        {form.factor_equipo_activo && simResult.pctTramo > 0 && ` × ${(1 + simResult.factorEq).toFixed(2)}`}
                        {' ÷ 2'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save modal ─────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-gx-lg w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gecotex-ink text-lg">
                  {config ? 'Guardar configuración' : 'Crear configuración'}
                </h3>
                <p className="text-sm text-gecotex-ink-sub mt-0.5">
                  Período {año} — Semestre {semestre}
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gecotex-bg">
                <X size={18} className="text-gecotex-ink-muted" />
              </button>
            </div>

            {!pesosSuman && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                <AlertTriangle size={16} />
                Los pesos de las 4 áreas deben sumar exactamente 100%
              </div>
            )}

            <div className="bg-gecotex-bg rounded-xl px-4 py-3 space-y-1.5 text-sm">
              <p className="text-[10px] font-semibold text-gecotex-ink-muted uppercase tracking-widest mb-2">Resumen de la configuración</p>
              <p><span className="text-gecotex-ink-sub">Período:</span> <strong>{form.fecha_inicio}</strong> → <strong>{form.fecha_fin}</strong></p>
              <p><span className="text-gecotex-ink-sub">Pesos:</span> A1:{Math.round(form.peso_area1*100)}% · A2:{Math.round(form.peso_area2*100)}% · A3:{Math.round(form.peso_area3*100)}% · A4:{Math.round(form.peso_area4*100)}%</p>
              <p><span className="text-gecotex-ink-sub">Tramos:</span> {form.tabla_tramos.length} configurados</p>
              <p><span className="text-gecotex-ink-sub">Factor Equipo:</span> {form.factor_equipo_activo ? `Activo — +${Math.round(form.factor_equipo_porcentaje*100)}% si equipo cumple ${form.factor_equipo_meses_minimos}/6 meses` : 'Inactivo'}</p>
              <p><span className="text-gecotex-ink-sub">Antigüedad mín.:</span> {form.antiguedad_minima_meses} meses</p>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={handleSave} disabled={!pesosSuman || saving}
                className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {config ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
