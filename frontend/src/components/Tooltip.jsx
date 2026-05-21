import { useState } from 'react'

export default function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children ?? (
        <button
          type="button"
          className="w-4 h-4 rounded-full bg-gecotex-ink-muted/25 text-gecotex-ink-muted text-[9px] font-bold inline-flex items-center justify-center hover:bg-gecotex-blue/20 hover:text-gecotex-blue transition-colors leading-none cursor-help"
        >
          ?
        </button>
      )}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-gecotex-navy text-white text-[11.5px] font-medium p-3 rounded-xl shadow-xl leading-relaxed pointer-events-none whitespace-normal block">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gecotex-navy block" />
        </span>
      )}
    </span>
  )
}
