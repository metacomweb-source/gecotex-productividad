from typing import List
from models.tipo_dua import TipoDua
from models.incrementador import Incrementador


def calcular_up(tipo_dua: TipoDua, num_partidas: int, incrementadores: List[Incrementador]) -> float:
    up_base = tipo_dua.up_base
    partidas_adicionales = max(0, num_partidas - tipo_dua.tramo_partidas_min)
    up_partidas = partidas_adicionales * 0.10
    up_incrementadores = sum(inc.up_adicional for inc in incrementadores)
    return round(up_base + up_partidas + up_incrementadores, 2)


def calcular_valor_facturacion(tipo_dua: TipoDua, num_partidas: int, incrementadores: List[Incrementador]) -> float:
    precio_base = tipo_dua.precio_unitario
    partidas_adicionales = max(0, num_partidas - tipo_dua.tramo_partidas_min)
    precio_partidas = partidas_adicionales * tipo_dua.precio_partida_adicional
    precio_incrementadores = sum(inc.precio_unitario for inc in incrementadores)
    return round(precio_base + precio_partidas + precio_incrementadores, 2)


def calcular_partidas_adicionales(tipo_dua: TipoDua, num_partidas: int) -> int:
    return max(0, num_partidas - tipo_dua.tramo_partidas_min)
