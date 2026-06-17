import { useEffect, useState } from 'react'
import { kpisApi } from '../api/client'
import { useCronometro } from '../context/CronometroContext'
import { Sun, FileText } from 'lucide-react'
import clsx from 'clsx'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function TarjetaHoy({ usuarioId }) {
  const [data, setData] = useState(null)
  const { sesionActiva } = useCronometro()

  useEffect(() => {
    if (!usuarioId) return
    kpisApi.hoy(usuarioId).then(r => setData(r.data)).catch(() => {})
  }, [usuarioId])

  const now = new Date()
  const pctMes = data?.objetivo_mensual > 0
    ? Math.min(100, Math.round((data.ups_mes / data.objetivo_mensual) * 100))
    : 0

  // Alerta si estamos en la segunda mitad del mes y por debajo del 40%
  const mitadMes = now.getDate() > 15
  const alerta = mitadMes && pctMes < 40 && data?.objetivo_mensual > 0
  const cumplido = pctMes >= 100

  const bgCard = cumplido
    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
    : alerta
      ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
      : 'bg-white border-gecotex-border-soft'

  const barColor = cumplido ? 'bg-gecotex-green' : alerta ? 'bg-orange-400' : 'bg-gecotex-blue'

  return (
    <div className={clsx('rounded-[10px] border shadow-gx-sm p-5 transition-all', bgCard)}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
            cumplido ? 'bg-gecotex-green/10' : alerta ? 'bg-orange-100' : 'bg-gecotex-blue/10')}>
            <Sun size={20} className={cumplido ? 'text-gecotex-green' : alerta ? 'text-orange-500' : 'text-gecotex-blue'} />
          </div>
          <div>
            <p className="text-[13px] font-bold text-gecotex-ink">
              {DIAS[now.getDay()]}, {now.getDate()} de {MESES[now.getMonth()]}
            </p>
            <p className="text-[11.5px] text-gecotex-ink-sub">
              {cumplido
                ? '¡Objetivo mensual superado! Excelente trabajo.'
                : alerta
                  ? 'Segunda mitad del mes y por debajo del 40%. Aprieta el ritmo.'
                  : 'Progreso mensual en curso'}
            </p>
          </div>
        </div>

        {sesionActiva && (
          <div className="flex items-center gap-1.5 bg-gecotex-navy/5 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gecotex-green animate-pulse" />
            <span className="text-[11.5px] font-bold text-gecotex-navy">Sesión activa</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[10.5px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">UPs este mes</p>
          <p className="text-2xl font-black text-gecotex-ink font-mono">
            {data ? data.ups_mes.toFixed(1) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">UPs hoy</p>
          <p className="text-2xl font-black text-gecotex-ink font-mono">
            {data ? data.ups_hoy.toFixed(1) : '—'}
          </p>
        </div>
        {data?.objetivo_mensual != null && (
          <div>
            <p className="text-[10.5px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">Objetivo mes</p>
            <p className="text-2xl font-black text-gecotex-ink-sub font-mono">
              {data.objetivo_mensual.toFixed(1)} <span className="text-sm font-normal">UP</span>
            </p>
          </div>
        )}
      </div>

      {data?.objetivo_mensual != null && (
        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-semibold text-gecotex-ink-muted mb-1.5">
            <span>{pctMes}% del objetivo mensual</span>
            <span>{data.ups_mes.toFixed(1)} / {data.objetivo_mensual.toFixed(1)} UP</span>
          </div>
          <div className="w-full bg-gecotex-bg rounded-full h-2">
            <div
              className={clsx('h-2 rounded-full transition-all duration-700', barColor)}
              style={{ width: `${pctMes}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
