from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from models.usuario import Usuario
from models.parametros_bonus import ParametrosBonus
from models.objetivo_mes import ObjetivoMes
from models.expediente import Expediente


def calcular_factor_k(up_producidas: float, objetivo_up: float) -> float:
    if objetivo_up == 0:
        return 0.0
    return round(up_producidas / objetivo_up, 3)


def buscar_porcentaje_bonus(factor_k: float, tabla_factor_k: list) -> float:
    if factor_k > 1.20:
        return round(1.00 + (factor_k - 1.00), 4)
    for tramo in tabla_factor_k:
        k_min = tramo["k_min"]
        k_max = tramo.get("k_max")
        if k_max is None:
            if factor_k >= k_min:
                return tramo["porcentaje_bonus"] if isinstance(tramo["porcentaje_bonus"], (int, float)) else round(1.00 + (factor_k - 1.00), 4)
        else:
            if k_min <= factor_k < k_max:
                return tramo["porcentaje_bonus"]
    return 0.0


def calcular_antiguedad_meses(fecha_incorporacion: date) -> int:
    hoy = date.today()
    meses = (hoy.year - fecha_incorporacion.year) * 12 + (hoy.month - fecha_incorporacion.month)
    return max(0, meses)


def calcular_bonus_operario(
    db: Session,
    operario_id: int,
    año: int,
    mes: int,
    params: ParametrosBonus,
) -> dict:
    operario = db.query(Usuario).filter(Usuario.id == operario_id).first()
    if not operario:
        return {}

    antiguedad = calcular_antiguedad_meses(operario.fecha_incorporacion) if operario.fecha_incorporacion else 0
    elegible = antiguedad >= params.antiguedad_minima_meses

    expedientes = (
        db.query(Expediente)
        .filter(
            Expediente.operario_id == operario_id,
            Expediente.created_at >= f"{año}-{mes:02d}-01",
            Expediente.created_at < f"{año}-{mes+1:02d}-01" if mes < 12 else f"{año+1}-01-01",
        )
        .all()
    )
    up_producidas = sum(e.up_calculadas or 0 for e in expedientes)

    objetivo = db.query(ObjetivoMes).filter(
        ObjetivoMes.operario_id == operario_id,
        ObjetivoMes.año == año,
        ObjetivoMes.mes == mes,
    ).first()
    objetivo_up = objetivo.objetivo_up if objetivo else 0.0

    factor_k = calcular_factor_k(up_producidas, objetivo_up) if objetivo_up > 0 else 0.0
    pct_bonus = buscar_porcentaje_bonus(factor_k, params.tabla_factor_k) if elegible else 0.0
    bonus_individual_pct = round(pct_bonus * params.peso_productividad_individual, 4)

    return {
        "operario_id": operario_id,
        "operario_nombre": f"{operario.nombre} {operario.apellidos}",
        "antiguedad_meses": antiguedad,
        "elegible": elegible,
        "up_producidas": up_producidas,
        "objetivo_up": objetivo_up,
        "factor_k": factor_k,
        "porcentaje_bonus_productividad": pct_bonus,
        "bonus_individual_pct": bonus_individual_pct,
    }
