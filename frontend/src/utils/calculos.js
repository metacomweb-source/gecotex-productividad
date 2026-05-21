export function calcularUP(tipoDua, numPartidas, incrementadoresSeleccionados) {
  if (!tipoDua) return 0
  const upBase = tipoDua.up_base || 0
  const partidasAdicionales = Math.max(0, numPartidas - tipoDua.tramo_partidas_min)
  const upPartidas = partidasAdicionales * 0.10
  const upIncrementadores = incrementadoresSeleccionados.reduce((sum, inc) => sum + (inc.up_adicional || 0), 0)
  return Math.round((upBase + upPartidas + upIncrementadores) * 100) / 100
}

export function calcularValorFacturacion(tipoDua, numPartidas, incrementadoresSeleccionados) {
  if (!tipoDua) return 0
  const precioBase = tipoDua.precio_unitario || 0
  const partidasAdicionales = Math.max(0, numPartidas - (tipoDua.tramo_partidas_min || 0))
  const precioPartidas = partidasAdicionales * (tipoDua.precio_partida_adicional || 0)
  const precioIncrementadores = incrementadoresSeleccionados.reduce((sum, inc) => sum + (inc.precio_unitario || 0), 0)
  return Math.round((precioBase + precioPartidas + precioIncrementadores) * 100) / 100
}

export function calcularFactorK(upProducidas, objetivoUP) {
  if (!objetivoUP || objetivoUP === 0) return 0
  return Math.round((upProducidas / objetivoUP) * 1000) / 1000
}

export function colorFactorK(k) {
  if (k >= 1.20) return 'text-gecotex-primary font-bold'
  if (k >= 1.00) return 'text-semaforo-verde font-bold'
  if (k >= 0.85) return 'text-semaforo-naranja font-semibold'
  return 'text-semaforo-rojo font-semibold'
}

export function bgColorFactorK(k) {
  if (k >= 1.00) return 'bg-semaforo-verde-light text-semaforo-verde'
  if (k >= 0.85) return 'bg-semaforo-naranja-light text-semaforo-naranja'
  return 'bg-semaforo-rojo-light text-semaforo-rojo'
}

export function colorSemaforo(valor, umbralRojo, umbralNaranja) {
  if (valor < umbralRojo) return 'rojo'
  if (valor < umbralNaranja) return 'naranja'
  return 'verde'
}

export function colorRatioSuficiencia(ratio) {
  if (ratio < 0.90) return 'rojo'
  if (ratio < 1.10) return 'naranja'
  return 'verde'
}
