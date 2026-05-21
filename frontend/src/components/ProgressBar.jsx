import clsx from 'clsx'

export default function ProgressBar({ 
  valor, 
  maximo = 100, 
  showLabel = false, 
  height = 'h-1.5', 
  animated = true,
  color 
}) {
  const pct = Math.min((valor / maximo) * 100, 150)
  
  const defaultColor = pct >= 100 ? 'bg-gecotex-green' : pct >= 85 ? 'bg-gecotex-blue' : pct >= 60 ? 'bg-gecotex-orange' : 'bg-gecotex-red'
  
  const colorMap = {
    verde: 'bg-gecotex-green',
    naranja: 'bg-gecotex-orange',
    rojo: 'bg-gecotex-red',
    blue: 'bg-gecotex-blue',
    navy: 'bg-gecotex-navy',
  }

  const bgColor = color ? (colorMap[color] || color) : defaultColor

  return (
    <div className="w-full">
      <div className={clsx('w-full bg-gecotex-border-soft rounded-full overflow-hidden', height)}>
        <div
          className={clsx('h-full rounded-full transition-all duration-1000', bgColor, animated && 'ease-out')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] font-bold mt-1 block text-gecotex-ink-muted uppercase tracking-wider">
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  )
}

