import { useEffect, useState } from 'react'
import { kpisApi } from '../api/client'
import { useCronometro } from '../context/CronometroContext'
import { Sun, TrendingUp, FileText, Clock } from 'lucide-react'
import clsx from 'clsx'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function TarjetaHoy({ usuarioId, nombreUsuario }) {
  const [data, setData] = useState(null)
  const { sesionActiva } = useCronometro()

  useEffect(() => {
    if (!usuarioId) return
    kpisApi.hoy(usuarioId).then(r => setData(r.data)).catch(() => {})
  }, [usuarioId])

  const now = new Date()
  const hora = now.getHours()
  const pctDia = data?.objetivo_diario > 0
    ? Math.min(100, Math.round((data.ups_hoy / data.objetivo_diario) * 100))
    : 0

  const alerta = hora >= 13 && pctDia < 40 && data?.objetivo_diario > 0
  const cumplido = pctDia >= 100

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
                ? '¡Objetivo diario superado! Excelente ritmo.'
                : alerta
                  ? 'Pasadas las 13h y por debajo del 40%. Aprieta el ritmo.'
                  : 'Progreso del día en curso'}
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
          <p className="text-[10.5px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">UPs hoy</p>
          <p className="text-2xl font-black text-gecotex-ink font-mono">
            {data ? data.ups_hoy.toFixed(1) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">Expedientes</p>
          <div className="flex items-center gap-1.5">
            <FileText size={16} className="text-gecotex-ink-muted" />
            <p className="text-2xl font-black text-gecotex-ink font-mono">
              {data ? data.expedientes_hoy : '—'}
            </p>
          </div>
        </div>
        {data?.objetivo_diario != null && (
          <div>
            <p className="text-[10.5px] font-bold text-gecotex-ink-muted uppercase tracking-widest mb-1">Obj. diario</p>
            <p className="text-2xl font-black text-gecotex-ink-sub font-mono">
              {data.objetivo_diario.toFixed(1)} <span className="text-sm font-normal">UP</span>
            </p>
          </div>
        )}
      </div>

      {data?.objetivo_diario != null && (
        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-semibold text-gecotex-ink-muted mb-1.5">
            <span>{pctDia}% del objetivo diario</span>
            <span>{data.ups_hoy.toFixed(1)} / {data.objetivo_diario.toFixed(1)} UP</span>
          </div>
          <div className="w-full bg-gecotex-bg rounded-full h-2">
            <div
              className={clsx('h-2 rounded-full transition-all duration-700', barColor)}
              style={{ width: `${pctDia}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
