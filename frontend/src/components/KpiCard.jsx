import clsx from 'clsx'
import ProgressBar from './ProgressBar'
import Tooltip from './Tooltip'

export default function KpiCard({
  titulo,
  valor,
  unit,
  subtitulo,
  icono: Icon,
  color = 'navy',
  progreso,
  footer,
  ayuda,
  children
}) {
  const accents = {
    verde: 'text-gecotex-green bg-gecotex-green-soft border-gecotex-green/10',
    naranja: 'text-gecotex-orange bg-gecotex-orange-soft border-gecotex-orange/10',
    rojo: 'text-gecotex-red bg-gecotex-red-soft border-gecotex-red/10',
    navy: 'text-gecotex-navy bg-gecotex-bg border-gecotex-border',
    blue: 'text-gecotex-blue bg-gecotex-blue-light border-gecotex-blue/10',
  }

  const iconColor = {
    verde: 'text-gecotex-green bg-gecotex-green/10',
    naranja: 'text-gecotex-orange bg-gecotex-orange/10',
    rojo: 'text-gecotex-red bg-gecotex-red/10',
    navy: 'text-gecotex-navy bg-gecotex-bg',
    blue: 'text-gecotex-blue bg-gecotex-blue/10',
  }

  const textColor = {
    verde: 'text-gecotex-green',
    naranja: 'text-gecotex-orange',
    rojo: 'text-gecotex-red',
    navy: 'text-gecotex-navy',
    blue: 'text-gecotex-blue',
  }

  return (
    <div className="bg-white rounded-[10px] border border-gecotex-border-soft shadow-gx-sm p-[18px] flex flex-col gap-3 min-h-[140px] animate-fade-in transition-all hover:shadow-gx-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <div className="text-[12px] font-semibold text-gecotex-ink-sub tracking-[.04em] uppercase">{titulo}</div>
          {ayuda && <Tooltip text={ayuda} />}
        </div>
        {Icon && (
          <div className={clsx('w-[30px] h-[30px] rounded-lg flex items-center justify-center', iconColor[color] || iconColor.navy)}>
            <Icon size={16} />
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-1.5">
        <span className={clsx('text-[36px] font-bold tracking-[-.02em] leading-none', textColor[color] || 'text-gecotex-ink')}>
          {valor ?? '—'}
        </span>
        {unit && <span className="text-[14px] font-medium text-gecotex-ink-muted">{unit}</span>}
        {subtitulo && <span className="text-[13px] text-gecotex-ink-sub ml-auto font-medium">{subtitulo}</span>}
      </div>

      {progreso !== undefined && (
        <div className="mt-1">
          <ProgressBar valor={progreso} maximo={100} height="h-1.5" color={color === 'navy' ? 'blue' : color} />
        </div>
      )}

      {footer && <div className="text-[12px] text-gecotex-ink-sub mt-auto font-medium">{footer}</div>}
      {children}
    </div>
  )
}

