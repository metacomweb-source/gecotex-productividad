import { useEffect, useState } from 'react'
import { usuariosApi } from '../api/client'
import { Plus, Edit2, UserX, UserCheck } from 'lucide-react'
import ModalConfirm from '../components/ModalConfirm'
import { fmtFecha } from '../utils/formatters'
import toast from 'react-hot-toast'

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

export default function Empleados() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', password: '', rol: 'operario', departamento: 'operaciones', jornada_horas_dia: 8 })

  const load = () => {
    setLoading(true)
    usuariosApi.listar().then(r => setUsuarios(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCrear = async (e) => {
    e.preventDefault()
    try {
      await usuariosApi.crear(form)
      toast.success('Empleado creado')
      setShowForm(false)
      setForm({ nombre: '', apellidos: '', email: '', password: '', rol: 'operario', departamento: 'operaciones', jornada_horas_dia: 8 })
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al crear') }
  }

  const handleDesactivar = async () => {
    try {
      await usuariosApi.desactivar(confirmDesactivar.id)
      toast.success('Empleado desactivado')
      setConfirmDesactivar(null)
      load()
    } catch { toast.error('Error') }
  }

  const antiguedad = (fecha) => {
    if (!fecha) return '—'
    const meses = Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    if (meses < 12) return `${meses}m`
    return `${Math.floor(meses / 12)}a ${meses % 12}m`
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gecotex-primary">Empleados</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Nuevo empleado
        </button>
      </div>

      {/* Modal crear */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-gecotex-primary mb-4">Nuevo empleado</h2>
            <form onSubmit={handleCrear} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Nombre *</label><input className="input-field" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} required /></div>
                <div><label className="label">Apellidos *</label><input className="input-field" value={form.apellidos} onChange={e => setForm(f => ({...f, apellidos: e.target.value}))} required /></div>
              </div>
              <div><label className="label">Email *</label><input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required /></div>
              <div><label className="label">Contraseña inicial *</label><input type="password" className="input-field" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required /></div>
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
              <div><label className="label">Horas/día</label><input type="number" step="0.5" className="input-field" value={form.jornada_horas_dia} onChange={e => setForm(f => ({...f, jornada_horas_dia: +e.target.value}))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Crear</button>
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
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 truncate">{u.nombre} {u.apellidos}</p>
                <span className={ROL_COLORS[u.rol] || 'badge-gris'}>{ROLES_ES[u.rol]}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">{u.email}</p>
              <p className="text-xs text-gray-400 mt-1">Antigüedad: {antiguedad(u.fecha_incorporacion)} · {u.jornada_horas_dia}h/día</p>
            </div>
            <button
              onClick={() => setConfirmDesactivar(u)}
              className="p-1.5 hover:bg-semaforo-rojo-light rounded-lg transition-colors text-gray-400 hover:text-semaforo-rojo"
              title="Desactivar"
            >
              <UserX size={15} />
            </button>
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
