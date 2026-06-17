import { useEffect, useState } from 'react'
import { usuariosApi } from '../api/client'
import { Plus, Edit2, UserX } from 'lucide-react'
import ModalConfirm from '../components/ModalConfirm'
import toast from 'react-hot-toast'
import clsx from 'clsx'

function AvatarLetras({ nombre, apellidos, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-base' : 'w-8 h-8 text-sm'
  return (
    <div className={`${sizeClass} bg-gecotex-primary rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {nombre?.[0]}{apellidos?.[0]}
    </div>
  )
}

const ROLES_ES = { admin: 'Admin', director: 'Director', coordinador: 'Coordinador', operario: 'Operario' }
const ROL_COLORS = { admin: 'badge-rojo', director: 'badge-naranja', coordinador: 'badge-verde', operario: 'badge-gris' }

const FORM_VACIO = {
  nombre: '', apellidos: '', email: '', password: '',
  rol: 'operario', departamento: 'operaciones',
  jornada_horas_dia: 8,
  fecha_incorporacion: '',
  salario_bruto_anual: '',
  pct_maximo_bonus: 5,
}

function antiguedad(fecha) {
  if (!fecha) return '—'
  const meses = Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (meses < 1) return 'Reciente'
  if (meses < 12) return `${meses} mes${meses > 1 ? 'es' : ''}`
  const a = Math.floor(meses / 12), m = meses % 12
  return m > 0 ? `${a}a ${m}m` : `${a} año${a > 1 ? 's' : ''}`
}

function fmtSalario(v) {
  if (v == null || v === '') return '—'
  return Number(v).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export default function Empleados() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { modo: 'crear' | 'editar', usuario?: {} }
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  const load = () => {
    setLoading(true)
    usuariosApi.listar().then(r => setUsuarios(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const abrirCrear = () => {
    setForm(FORM_VACIO)
    setModal({ modo: 'crear' })
  }

  const abrirEditar = (u) => {
    setForm({
      nombre: u.nombre,
      apellidos: u.apellidos,
      email: u.email,
      password: '',
      rol: u.rol,
      departamento: u.departamento || 'operaciones',
      jornada_horas_dia: u.jornada_horas_dia,
      fecha_incorporacion: u.fecha_incorporacion?.slice(0, 10) || '',
      salario_bruto_anual: u.salario_bruto_anual ?? '',
      pct_maximo_bonus: u.pct_maximo_bonus != null ? u.pct_maximo_bonus * 100 : 5,
    })
    setModal({ modo: 'editar', usuario: u })
  }

  const cerrarModal = () => { setModal(null); setForm(FORM_VACIO) }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const payload = {
        ...form,
        jornada_horas_dia: +form.jornada_horas_dia,
        salario_bruto_anual: form.salario_bruto_anual !== '' ? +form.salario_bruto_anual : null,
        pct_maximo_bonus: +form.pct_maximo_bonus / 100,
        fecha_incorporacion: form.fecha_incorporacion || null,
      }
      if (modal.modo === 'crear') {
        await usuariosApi.crear(payload)
        toast.success('Empleado creado')
      } else {
        if (!payload.password) delete payload.password
        await usuariosApi.actualizar(modal.usuario.id, payload)
        toast.success('Empleado actualizado')
      }
      cerrarModal()
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleDesactivar = async () => {
    try {
      await usuariosApi.desactivar(confirmDesactivar.id)
      toast.success('Empleado desactivado')
      setConfirmDesactivar(null)
      load()
    } catch { toast.error('Error') }
  }

  const esCrear = modal?.modo === 'crear'

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gecotex-primary">Empleados</h1>
        <button onClick={abrirCrear} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Nuevo empleado
        </button>
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="sticky top-0 bg-white px-6 pt-6 pb-3 border-b border-gecotex-border-soft">
              <h2 className="text-lg font-bold text-gecotex-primary">
                {esCrear ? 'Nuevo empleado' : `Editar — ${modal.usuario.nombre} ${modal.usuario.apellidos}`}
              </h2>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-5">

              {/* Identificación */}
              <div>
                <p className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-3">Identificación</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nombre *</label>
                    <input className="input-field" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} required />
                  </div>
                  <div>
                    <label className="label">Apellidos *</label>
                    <input className="input-field" value={form.apellidos} onChange={e => setForm(f => ({...f, apellidos: e.target.value}))} required />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="label">Email *</label>
                  <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
                </div>
                <div className="mt-3">
                  <label className="label">{esCrear ? 'Contraseña inicial *' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
                  <input
                    type="password"
                    className="input-field"
                    value={form.password}
                    onChange={e => setForm(f => ({...f, password: e.target.value}))}
                    required={esCrear}
                    placeholder={esCrear ? '' : 'Sin cambios'}
                  />
                </div>
              </div>

              {/* Rol y jornada */}
              <div>
                <p className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-3">Rol y jornada</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Rol</label>
                    <select className="input-field" value={form.rol} onChange={e => setForm(f => ({...f, rol: e.target.value}))}>
                      <option value="operario">Operario</option>
                      <option value="coordinador">Coordinador</option>
                      <option value="director">Director</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Departamento</label>
                    <select className="input-field" value={form.departamento} onChange={e => setForm(f => ({...f, departamento: e.target.value}))}>
                      <option value="operaciones">Operaciones</option>
                      <option value="tecnica">Técnica</option>
                      <option value="comercial">Comercial</option>
                      <option value="administracion">Administración</option>
                      <option value="it">IT</option>
                      <option value="rrhh">RRHH</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="label">Horas por día</label>
                  <input type="number" step="0.5" min="1" max="12" className="input-field" value={form.jornada_horas_dia} onChange={e => setForm(f => ({...f, jornada_horas_dia: e.target.value}))} />
                </div>
              </div>

              {/* Antigüedad y datos salariales */}
              <div>
                <p className="text-[11px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-3">Antigüedad y salario</p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Fecha de incorporación</label>
                    <input
                      type="date"
                      className="input-field"
                      value={form.fecha_incorporacion}
                      onChange={e => setForm(f => ({...f, fecha_incorporacion: e.target.value}))}
                    />
                    <p className="text-[11px] text-gecotex-ink-muted mt-1">Se usa para calcular la antigüedad y la elegibilidad al bonus semestral.</p>
                  </div>
                  <div>
                    <label className="label">Salario bruto anual (€)</label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      className="input-field"
                      value={form.salario_bruto_anual}
                      onChange={e => setForm(f => ({...f, salario_bruto_anual: e.target.value}))}
                      placeholder="p. ej. 28000"
                    />
                    <p className="text-[11px] text-gecotex-ink-muted mt-1">Base para calcular el importe del bonus semestral en euros.</p>
                  </div>
                  <div>
                    <label className="label">Bonus máximo (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        className="input-field pr-8"
                        value={form.pct_maximo_bonus}
                        onChange={e => setForm(f => ({...f, pct_maximo_bonus: e.target.value}))}
                        placeholder="5"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gecotex-ink-muted text-sm font-semibold">%</span>
                    </div>
                    <p className="text-[11px] text-gecotex-ink-muted mt-1">
                      % del salario anual que puede recibir como bonus máximo (semestral × 2).
                      {form.salario_bruto_anual && form.pct_maximo_bonus
                        ? ` Máximo semestral: ${(+form.salario_bruto_anual * +form.pct_maximo_bonus / 100 / 2).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={cerrarModal} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={guardando} className="btn-primary flex-1">
                  {guardando ? 'Guardando...' : esCrear ? 'Crear empleado' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({length: 6}).map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)
        ) : usuarios.map(u => (
          <div key={u.id} className="card flex items-start gap-3">
            <AvatarLetras nombre={u.nombre} apellidos={u.apellidos} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 truncate">{u.nombre} {u.apellidos}</p>
                <span className={ROL_COLORS[u.rol] || 'badge-gris'}>{ROLES_ES[u.rol]}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">{u.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                Antigüedad: <span className="font-medium text-gray-600">{antiguedad(u.fecha_incorporacion)}</span>
                {' · '}
                {u.jornada_horas_dia}h/día
              </p>
              {(u.salario_bruto_anual || u.pct_maximo_bonus) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Salario: <span className="font-medium text-gray-600">{fmtSalario(u.salario_bruto_anual)}</span>
                  {u.pct_maximo_bonus != null && (
                    <> · Bonus máx: <span className="font-medium text-gray-600">{(u.pct_maximo_bonus * 100).toFixed(1)}%</span></>
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => abrirEditar(u)}
                className="p-1.5 hover:bg-gecotex-bg rounded-lg transition-colors text-gray-400 hover:text-gecotex-blue"
                title="Editar"
              >
                <Edit2 size={15} />
              </button>
              <button
                onClick={() => setConfirmDesactivar(u)}
                className="p-1.5 hover:bg-semaforo-rojo-light rounded-lg transition-colors text-gray-400 hover:text-semaforo-rojo"
                title="Desactivar"
              >
                <UserX size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModalConfirm
        isOpen={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        onConfirm={handleDesactivar}
        titulo={`Desactivar ${confirmDesactivar?.nombre}?`}
        mensaje="El empleado no podrá acceder al sistema. Sus expedientes y datos históricos se conservan."
        btnLabel="Desactivar"
      />
    </div>
  )
}
