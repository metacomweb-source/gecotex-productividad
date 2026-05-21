import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function fmtFecha(fecha, fmt = 'dd/MM/yyyy') {
  if (!fecha) return '—'
  try { return format(parseISO(typeof fecha === 'string' ? fecha : fecha.toISOString()), fmt, { locale: es }) }
  catch { return '—' }
}

export function fmtFechaHora(fecha) {
  return fmtFecha(fecha, "dd/MM/yyyy HH:mm")
}

export function fmtRelativo(fecha) {
  if (!fecha) return '—'
  try { return formatDistanceToNow(parseISO(fecha), { addSuffix: true, locale: es }) }
  catch { return '—' }
}

export function fmtMinutos(minutos) {
  if (minutos == null) return '—'
  const h = Math.floor(minutos / 60)
  const m = Math.round(minutos % 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function fmtHoras(horas) {
  if (horas == null) return '—'
  if (horas < 1) return `${Math.round(horas * 60)}min`
  return `${horas.toFixed(1)}h`
}

export function fmtPct(valor) {
  if (valor == null) return '—'
  return `${valor.toFixed(1)}%`
}

export function fmtUP(valor) {
  if (valor == null) return '—'
  return valor.toFixed(2)
}

export function fmtK(valor) {
  if (valor == null) return '—'
  return valor.toFixed(3)
}

export function nombreMes(mes) {
  const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return nombres[(mes - 1) % 12] || ''
}

export function descargarBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
