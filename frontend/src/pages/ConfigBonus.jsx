import { useState, useEffect } from 'react'
import { Loader2, Save, Plus, Trash2, ToggleLeft, ToggleRight, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const AREAS = { 2: 'Calidad Operativa', 3: 'Gecotex Corporate', 4: 'Digitalización y Adaptación' }

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_SEM = new Date().getMonth() < 6 ? 1 : 2

function SectionTitle({ children }) {
  return <h3 className="text-[11px] font-semibold text-gecotex-ink-sub uppercase tracking-widest mb-4">{children}</h3>
}

export default function ConfigBonus() {
  const [año, setAño] = useState(CURRENT_YEAR)
  const [semestre, setSemestre] = useState(CURRENT_SEM)
  const [config, setConfig] = useState(null)
  const [factores, setFactores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingFactor, setSavingFactor] = useState(null)
  const [form, setForm] = useState(null)
  const [nuevoFactor, setNuevoFactor] = useState({ area: 2, nombre: '', descripcion: '', nota_contexto: '' })
  const [showNuevoFactor, setShowNuevoFactor] = useState(false)

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
      if (cfg) {
        setForm({
          fecha_inicio: cfg.fecha_inicio?.slice(0, 10) || '',
          fecha_fin: cfg.fecha_fin?.slice(0, 10) || '',
          antiguedad_minima_meses: cfg.antiguedad_minima_meses ?? 12,
          peso_area1: cfg.peso_area1 ?? 0.40,
          peso_area2: cfg.peso_area2 ?? 0.30,
          peso_area3: cfg.peso_area3 ?? 0.20,
          peso_area4: cfg.peso_area4 ?? 0.10,
          peso_auto_evaluacion: cfg.peso_auto_evaluacion ?? 0.30,
          peso_dir_evaluacion: cfg.peso_dir_evaluacion ?? 0.70,
          factor_equipo_activo: cfg.factor_equipo_activo ?? true,
          factor_equipo_porcentaje: cfg.factor_equipo_porcentaje ?? 0.05,
          factor_equipo_meses_minimos: cfg.factor_equipo_meses_minimos ?? 4,
          tabla_tramos: cfg.tabla_tramos_escalonados ? [...cfg.tabla_tramos_escalonados] : [
            { p_min: 0.0, p_max: 5.0, porcentaje: 0.00 },
            { p_min: 5.0, p_max: 7.0, porcentaje: 0.25 },
            { p_min: 7.0, p_max: 8.5, porcentaje: 0.60 },
            { p_min: 8.5, p_max: 10.1, porcentaje: 1.00 },
          ],
        })
      } else {
        setForm({
          fecha_inicio: `${año}-01-01`,
          fecha_fin: semestre === 1 ? `${año}-06-30` : `${año}-12-31`,
          antiguedad_minima_meses: 12,
          peso_area1: 0.40, peso_area2: 0.30, peso_area3: 0.20, peso_area4: 0.10,
          peso_auto_evaluacion: 0.30, peso_dir_evaluacion: 0.70,
          factor_equipo_activo: true, factor_equipo_porcentaje: 0.05, factor_equipo_meses_minimos: 4,
          tabla_tramos: [
            { p_min: 0.0, p_max: 5.0, porcentaje: 0.00 },
            { p_min: 5.0, p_max: 7.0, porcentaje: 0.25 },
            { p_min: 7.0, p_max: 8.5, porcentaje: 0.60 },
            { p_min: 8.5, p_max: 10.1, porcentaje: 1.00 },
          ],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [año, semestre])

  const pesosSuman = form
    ? Math.abs((form.peso_area1 + form.peso_area2 + form.peso_area3 + form.peso_area4) - 1.0) < 0.01
    : false

  const handleSave = async () => {
    if (!pesosSuman) { toast.error('Los pesos de las áreas deben sumar 100%'); return }
    setSaving(true)
    try {
      const payload = {
        año, semestre,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        antiguedad_minima_meses: parseInt(form.antiguedad_minima_meses),
        peso_area1: parseFloat(form.peso_area1),
        peso_area2: parseFloat(form.peso_area2),
        peso_area3: parseFloat(form.peso_area3),
        peso_area4: parseFloat(form.peso_area4),
        peso_auto_evaluacion: parseFloat(form.peso_auto_evaluacion),
        peso_dir_evaluacion: 1 - parseFloat(form.peso_auto_evaluacion),
        factor_equipo_activo: form.factor_equipo_activo,
        factor_equipo_porcentaje: parseFloat(form.factor_equipo_porcentaje),
        factor_equipo_meses_minimos: parseInt(form.factor_equipo_meses_minimos),
        tabla_tramos_escalonados: form.tabla_tramos,
      }
      if (config) {
        await api.put(`/bonus/config/${config.id}`, payload)
      } else {
        await api.post('/bonus/config', payload)
      }
      toast.success('Configuración guardada')
      cargar()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFactor = async (factor) => {
    setSavingFactor(factor.id)
    try {
      if (factor.activo) {
        await api.delete(`/bonus/factores/${factor.id}`)
      } else {
        await api.put(`/bonus/factores/${factor.id}`, { activo: true })
      }
      setFactores(fs => fs.map(f => f.id === factor.id ? { ...f, activo: !f.activo } : f))
    } catch {
      toast.error('Error al actualizar factor')
    } finally {
      setSavingFactor(null)
    }
  }

  const handleCrearFactor = async () => {
    if (!nuevoFactor.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    try {
      const r = await api.post('/bonus/factores', nuevoFactor)
      setFactores(fs => [...fs, r.data])
      setNuevoFactor({ area: 2, nombre: '', descripcion: '', nota_contexto: '' })
      setShowNuevoFactor(false)
      toast.success('Factor creado')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al crear factor')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <Loader2 size={28} className="animate-spin text-gecotex-primary" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in pb-12">
      {/* Selector período */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input-field w-28" value={año} onChange={e => setAño(+e.target.value)}>
          {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <select className="input-field w-40" value={semestre} onChange={e => setSemestre(+e.target.value)}>
          <option value={1}>Semestre 1 (Ene–Jun)</option>
          <option value={2}>Semestre 2 (Jul–Dic)</option>
        </select>
        {!config && (
          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">Sin configurar — se creará al guardar</span>
        )}
      </div>

      {form && (
        <>
          {/* Período */}
          <div className="card space-y-4">
            <SectionTitle>Período y elegibilidad</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" className="input-field" value={form.fecha_inicio}
                  onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="label">Fecha fin</label>
                <input type="date" className="input-field" value={form.fecha_fin}
                  onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
              </div>
              <div>
                <label className="label">Antigüedad mínima (meses)</label>
                <input type="number" min={0} className="input-field" value={form.antiguedad_minima_meses}
                  onChange={e => setForm(f => ({ ...f, antiguedad_minima_meses: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Pesos áreas */}
          <div className="card space-y-4">
            <SectionTitle>Pesos por área</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(a => (
                <div key={a}>
                  <label className="label">Área {a} (%)</label>
                  <div className="relative">
                    <input type="number" min={0} max={100} step={5} className="input-field pr-8"
                      value={Math.round(form[`peso_area${a}`] * 100)}
                      onChange={e => setForm(f => ({ ...f, [`peso_area${a}`]: parseFloat(e.target.value) / 100 || 0 }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={`text-xs font-semibold rounded-lg px-3 py-2 text-center ${pesosSuman ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              Suma: {Math.round((form.peso_area1 + form.peso_area2 + form.peso_area3 + form.peso_area4) * 100)}%
              {pesosSuman ? ' ✓' : ' — debe ser 100%'}
            </div>
          </div>

          {/* Evaluación auto/dir */}
          <div className="card space-y-4">
            <SectionTitle>Ponderación autoevaluación vs dirección (áreas 2/3/4)</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Autoevaluación (%)</label>
                <div className="relative">
                  <input type="number" min={0} max={100} step={5} className="input-field pr-8"
                    value={Math.round(form.peso_auto_evaluacion * 100)}
                    onChange={e => {
                      const v = parseFloat(e.target.value) / 100 || 0
                      setForm(f => ({ ...f, peso_auto_evaluacion: v, peso_dir_evaluacion: Math.round((1 - v) * 100) / 100 }))
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
              <div>
                <label className="label">Dirección (%)</label>
                <div className="relative">
                  <input type="number" className="input-field pr-8 bg-gray-50"
                    value={Math.round((1 - form.peso_auto_evaluacion) * 100)} readOnly />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Factor Equipo */}
          <div className="card space-y-4">
            <SectionTitle>Factor Equipo colectivo</SectionTitle>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setForm(f => ({ ...f, factor_equipo_activo: !f.factor_equipo_activo }))}
                className="flex items-center gap-2 text-sm font-medium">
                {form.factor_equipo_activo
                  ? <ToggleRight size={24} className="text-gecotex-primary" />
                  : <ToggleLeft size={24} className="text-gray-400" />}
                {form.factor_equipo_activo ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            {form.factor_equipo_activo && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bonus adicional (%)</label>
                  <div className="relative">
                    <input type="number" min={0} max={20} step={1} className="input-field pr-8"
                      value={Math.round(form.factor_equipo_porcentaje * 100)}
                      onChange={e => setForm(f => ({ ...f, factor_equipo_porcentaje: parseFloat(e.target.value) / 100 || 0 }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="label">Meses mínimos de cumplimiento</label>
                  <input type="number" min={1} max={6} className="input-field"
                    value={form.factor_equipo_meses_minimos}
                    onChange={e => setForm(f => ({ ...f, factor_equipo_meses_minimos: parseInt(e.target.value) || 4 }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tramos escalonados */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>Tramos escalonados de bonus</SectionTitle>
              <button
                onClick={() => setForm(f => ({ ...f, tabla_tramos: [...f.tabla_tramos, { p_min: 8.5, p_max: 10.1, porcentaje: 1.00 }] }))}
                className="text-xs flex items-center gap-1 text-gecotex-primary hover:underline"
              >
                <Plus size={13} /> Añadir tramo
              </button>
            </div>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2 text-left font-medium">Punt. mínima</th>
                    <th className="px-4 py-2 text-left font-medium">Punt. máxima</th>
                    <th className="px-4 py-2 text-left font-medium">% Bonus</th>
                    <th className="px-4 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {form.tabla_tramos.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input type="number" min={0} max={10} step={0.5} className="input-field w-20 text-xs"
                          value={t.p_min}
                          onChange={e => setForm(f => {
                            const tt = [...f.tabla_tramos]
                            tt[i] = { ...tt[i], p_min: parseFloat(e.target.value) || 0 }
                            return { ...f, tabla_tramos: tt }
                          })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} max={10.1} step={0.5} className="input-field w-20 text-xs"
                          value={t.p_max}
                          onChange={e => setForm(f => {
                            const tt = [...f.tabla_tramos]
                            tt[i] = { ...tt[i], p_max: parseFloat(e.target.value) || 0 }
                            return { ...f, tabla_tramos: tt }
                          })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="relative w-24">
                          <input type="number" min={0} max={100} step={5} className="input-field text-xs pr-6"
                            value={Math.round(t.porcentaje * 100)}
                            onChange={e => setForm(f => {
                              const tt = [...f.tabla_tramos]
                              tt[i] = { ...tt[i], porcentaje: parseFloat(e.target.value) / 100 || 0 }
                              return { ...f, tabla_tramos: tt }
                            })}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setForm(f => ({ ...f, tabla_tramos: f.tabla_tramos.filter((_, j) => j !== i) }))}
                          className="p-1 text-red-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !pesosSuman}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Guardando...' : config ? 'Guardar cambios' : 'Crear configuración'}
          </button>
        </>
      )}

      {/* Factores de evaluación */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <SectionTitle>Factores de evaluación (Áreas 2/3/4)</SectionTitle>
          </div>
          <button onClick={() => setShowNuevoFactor(v => !v)}
            className="text-xs flex items-center gap-1 text-gecotex-primary hover:underline">
            <Plus size={13} /> Nuevo factor
          </button>
        </div>

        {showNuevoFactor && (
          <div className="border rounded-xl p-4 space-y-3 bg-blue-50/40">
            <p className="text-xs font-semibold text-gecotex-primary">Nuevo factor</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Área</label>
                <select className="input-field" value={nuevoFactor.area}
                  onChange={e => setNuevoFactor(f => ({ ...f, area: +e.target.value }))}>
                  {Object.entries(AREAS).map(([k, v]) => <option key={k} value={+k}>Área {k} — {v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Nombre *</label>
                <input className="input-field" value={nuevoFactor.nombre}
                  onChange={e => setNuevoFactor(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Precisión documental" />
              </div>
              <div className="col-span-2">
                <label className="label">Descripción</label>
                <input className="input-field" value={nuevoFactor.descripcion}
                  onChange={e => setNuevoFactor(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción breve para el evaluador" />
              </div>
              <div className="col-span-2">
                <label className="label">Nota de contexto (visible en el formulario)</label>
                <input className="input-field" value={nuevoFactor.nota_contexto}
                  onChange={e => setNuevoFactor(f => ({ ...f, nota_contexto: e.target.value }))}
                  placeholder="Criterios de puntuación, ejemplos..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNuevoFactor(false)} className="btn-secondary text-xs">Cancelar</button>
              <button onClick={handleCrearFactor} className="btn-primary text-xs flex items-center gap-1">
                <Plus size={12} /> Crear
              </button>
            </div>
          </div>
        )}

        {[2, 3, 4].map(area => {
          const fs = factores.filter(f => f.area === area)
          return (
            <div key={area}>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Área {area} — {AREAS[area]}
              </p>
              {fs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Sin factores configurados</p>
              ) : (
                <div className="space-y-1">
                  {fs.map(f => (
                    <div key={f.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${f.activo ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{f.nombre}</p>
                        {f.nota_contexto && <p className="text-xs text-gray-500 truncate">{f.nota_contexto}</p>}
                      </div>
                      <button
                        onClick={() => handleToggleFactor(f)}
                        disabled={savingFactor === f.id}
                        className="flex-shrink-0 p-1"
                        title={f.activo ? 'Desactivar' : 'Activar'}
                      >
                        {savingFactor === f.id
                          ? <Loader2 size={18} className="animate-spin text-gray-400" />
                          : f.activo
                            ? <ToggleRight size={20} className="text-gecotex-primary" />
                            : <ToggleLeft size={20} className="text-gray-400" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
