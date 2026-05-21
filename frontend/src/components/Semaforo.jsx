import clsx from 'clsx'

export default function Semaforo({ valor, tipo = 'canal', size = 'sm', showLabel = true, dot = true }) {
  let color = 'neutral'
  let label = valor || 'Pendiente'

  if (tipo === 'canal') {
    if (valor === 'verde') { color = 'green'; label = 'Canal Verde' }
    else if (valor === 'naranja') { color = 'orange'; label = 'Canal Naranja' }
    else if (valor === 'rojo') { color = 'red'; label = 'Canal Rojo' }
    else { color = 'neutral'; label = 'Pendiente' }
  } else if (tipo === 'ratio') {
    if (valor >= 1.10) { color = 'green'; label = 'Suficiente' }
    else if (valor >= 0.90) { color = 'orange'; label = 'Ajustado' }
    else { color = 'red'; label = 'Insuficiente' }
  } else if (tipo === 'factor_k') {
    if (valor >= 1.00) { color = 'green'; label = `K=${valor?.toFixed(2)}` }
    else if (valor >= 0.85) { color = 'orange'; label = `K=${valor?.toFixed(2)}` }
    else { color = 'red'; label = `K=${valor?.toFixed(2)}` }
  } else if (tipo === 'manual') {
    color = valor
    label = valor
  }

  const tones = {
    green:   'bg-gecotex-green-soft text-[#1f7a44] border-gecotex-green/10',
    orange:  'bg-gecotex-orange-soft text-[#a85614] border-gecotex-orange/10',
    red:     'bg-gecotex-red-soft text-[#8e261a] border-gecotex-red/10',
    blue:    'bg-gecotex-blue-light text-gecotex-navy border-gecotex-blue/10',
    neutral: 'bg-gecotex-bg text-gecotex-ink-sub border-gecotex-border',
    navy:    'bg-gecotex-navy/10 text-gecotex-navy border-gecotex-navy/10',
  }

  const dotColors = {
    green:   'bg-gecotex-green',
    orange:  'bg-gecotex-orange',
    red:     'bg-gecotex-red',
    blue:    'bg-gecotex-blue',
    neutral: 'bg-gecotex-ink-muted',
    navy:    'bg-gecotex-navy',
  }

  const pad = size === 'lg' ? 'px-3 py-1.5 text-[13px]' : 'px-2.5 py-1 text-[11.5px]'

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full font-bold border transition-all',
      pad,
      tones[color] || tones.neutral
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[color] || dotColors.neutral)} />}
      {showLabel && label}
    </span>
  )
}

