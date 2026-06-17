import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Pencil, ToggleLeft, ToggleRight, Search, X } from 'lucide-react'
import { clientesApi } from '../api/client'

const FORM_VACIO = { nombre: '', nif: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [soloActivos, setSoloActivos] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null) // null | { modo: 'crear'|'editar', cliente?: obj }
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await clientesApi.listar(soloActivos)
      setClientes(data)
    } catch {
      // silencioso
    } finally {
      setCargando(false)
    }
  }, [soloActivos])

  useEffect(() => { cargar() }, [cargar])

  function abrirCrear() {
    setForm(FORM_VACIO)
    setError('')
    setModal({ modo: 'crear' })
  }

  function abrirEditar(cli) {
    setForm({ nombre: cli.nombre, nif: cli.nif || '' })
    setError('')
    setModal({ modo: 'editar', cliente: cli })
  }

  function cerrarModal() {
    setModal(null)
    setError('')
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true)
    setError('')
    try {
      if (modal.modo === 'crear') {
        await clientesApi.crear({ nombre: form.nombre.trim(), nif: form.nif.trim() || null })
      } else {
        await clientesApi.actualizar(modal.cliente.id, { nombre: form.nombre.trim(), nif: form.nif.trim() || null })
      }
      cerrarModal()
      cargar()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(cli) {
    try {
      if (cli.activo) {
        await clientesApi.desactivar(cli.id)
      } else {
        await clientesApi.actualizar(cli.id, { activo: true })
      }
      cargar()
    } catch {
      // silencioso
    }
  }

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.nif && c.nif.toLowerCase().includes(busqueda.toLowerCase()))
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gecotex-blue/10 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-gecotex-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500">{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 bg-gecotex-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o NIF..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gecotex-blue/30"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={e => setSoloActivos(e.target.checked)}
            className="rounded"
          />
          Solo activos
        </label>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay clientes{busqueda ? ' que coincidan' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(cli => (
            <div
              key={cli.id}
              className={`bg-white border rounded-2xl p-4 flex flex-col gap-2 shadow-sm transition-opacity ${!cli.activo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{cli.nombre}</p>
                  {cli.nif && <p className="text-xs text-gray-400 mt-0.5">{cli.nif}</p>}
                </div>
                <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cli.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {cli.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
                <button
                  onClick={() => abrirEditar(cli)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gecotex-blue transition-colors"
                >
                  <Pencil size={13} /> Editar
                </button>
                <button
                  onClick={() => toggleActivo(cli)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 transition-colors ml-auto"
                >
                  {cli.activo ? <ToggleLeft size={14} /> : <ToggleRight size={14} className="text-green-600" />}
                  {cli.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={cerrarModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {modal.modo === 'crear' ? 'Nuevo cliente' : 'Editar cliente'}
            </h2>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Empresa S.L."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gecotex-blue/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIF / CIF <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  value={form.nif}
                  onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                  placeholder="B12345678"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gecotex-blue/30"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-gecotex-blue text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
