import { useState } from 'react'
import { Settings, Bell, Calendar, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Configuracion() {
  const [config, setConfig] = useState({
    nombre_empresa: 'GECOTEX INTERNACIONAL, S.L.',
    zona_horaria: 'Europe/Madrid',
    notif_dias_sin_expedientes: true,
    notif_sobrecarga: true,
    notif_tiempo_respuesta: true,
    notif_objetivo_bajo: true,
    dias_umbral_sin_expedientes: 3,
    umbral_ocupacion: 110,
  })

  const handleSave = () => toast.success('Configuración guardada (demo)')

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold text-gecotex-primary">Configuración general</h1>

      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings size={16} className="text-gecotex-primary" />
          <h2 className="text-sm font-semibold text-gray-700">Empresa</h2>
        </div>
        <div>
          <label className="label">Nombre de la empresa</label>
          <input className="input-field" value={config.nombre_empresa} onChange={e => setConfig(c => ({...c, nombre_empresa: e.target.value}))} />
        </div>
        <div>
          <label className="label">Zona horaria</label>
          <select className="input-field" value={config.zona_horaria} onChange={e => setConfig(c => ({...c, zona_horaria: e.target.value}))}>
            <option value="Europe/Madrid">Europe/Madrid (UTC+1/+2)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={16} className="text-gecotex-primary" />
          <h2 className="text-sm font-semibold text-gray-700">Notificaciones automáticas</h2>
        </div>
        {[
          { key: 'notif_dias_sin_expedientes', label: 'Aviso cuando un operario lleva N días sin registrar expedientes' },
          { key: 'notif_sobrecarga', label: 'Aviso cuando la tasa de ocupación supera el umbral durante X días' },
          { key: 'notif_tiempo_respuesta', label: 'Aviso cuando el tiempo de respuesta supera el objetivo' },
          { key: 'notif_objetivo_bajo', label: 'Aviso a fin de mes si el operario está por debajo del 70% de su objetivo UP' },
        ].map(n => (
          <label key={n.key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="accent-gecotex-primary w-4 h-4" checked={config[n.key]} onChange={e => setConfig(c => ({...c, [n.key]: e.target.checked}))} />
            <span className="text-sm text-gray-700">{n.label}</span>
          </label>
        ))}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="label">Días sin expedientes para alerta</label>
            <input type="number" min="1" className="input-field" value={config.dias_umbral_sin_expedientes} onChange={e => setConfig(c => ({...c, dias_umbral_sin_expedientes: +e.target.value}))} />
          </div>
          <div>
            <label className="label">Umbral ocupación (%)</label>
            <input type="number" min="100" max="200" className="input-field" value={config.umbral_ocupacion} onChange={e => setConfig(c => ({...c, umbral_ocupacion: +e.target.value}))} />
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-gecotex-primary" />
          <h2 className="text-sm font-semibold text-gray-700">Seguridad</h2>
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
          <p>· JWT con expiración de 8 horas</p>
          <p>· Contraseñas hasheadas con bcrypt</p>
          <p>· Control de acceso basado en roles (RBAC)</p>
        </div>
      </div>

      <button onClick={handleSave} className="btn-primary">Guardar configuración</button>
    </div>
  )
}
