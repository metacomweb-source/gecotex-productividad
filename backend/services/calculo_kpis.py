from typing import List, Optional
from datetime import date
import calendar
from sqlalchemy.orm import Session
from models.expediente import Expediente, CanalEnum
from models.usuario import Usuario, RolEnum
from models.objetivo_mes import ObjetivoMes
from models.parametros_bonus import ParametrosBonus


def dias_laborables_mes(año: int, mes: int) -> int:
    _, num_dias = calendar.monthrange(año, mes)
    count = 0
    for dia in range(1, num_dias + 1):
        weekday = date(año, mes, dia).weekday()
        if weekday < 5:
            count += 1
    return count


def capacidad_teorica_mes(usuario: Usuario, año: int, mes: int, factor_disponibilidad: float, tiempo_up_base_min: int) -> float:
    dias = dias_laborables_mes(año, mes)
    minutos_disponibles = usuario.jornada_horas_dia * dias * 60 * factor_disponibilidad
    if tiempo_up_base_min == 0:
        return 0.0
    return round(minutos_disponibles / tiempo_up_base_min, 2)


def calcular_kpis_operario(
    db: Session,
    operario_id: int,
    año: int,
    mes: int,
    factor_disponibilidad: float = 0.70,
    tiempo_up_base_min: int = 25,
) -> dict:
    operario = db.query(Usuario).filter(Usuario.id == operario_id).first()
    if not operario:
        return {}

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
    num_expedientes = len(expedientes)

    objetivo = db.query(ObjetivoMes).filter(
        ObjetivoMes.operario_id == operario_id,
        ObjetivoMes.año == año,
        ObjetivoMes.mes == mes,
    ).first()
    objetivo_up = objetivo.objetivo_up if objetivo else None

    ct = capacidad_teorica_mes(operario, año, mes, factor_disponibilidad, tiempo_up_base_min)
    tasa_ocupacion = round((up_producidas / ct * 100), 2) if ct > 0 else None

    exp_incidencia = sum(1 for e in expedientes if e.canal_respuesta in [CanalEnum.naranja, CanalEnum.rojo])
    tasa_incidencia = round((exp_incidencia / num_expedientes * 100), 2) if num_expedientes > 0 else 0.0

    tiempos_tramitacion = []
    tiempos_respuesta = []
    tiempos_facturacion = []

    for e in expedientes:
        if e.fecha_apertura_dossier and e.fecha_envio_facturacion:
            delta = (e.fecha_envio_facturacion - e.fecha_apertura_dossier).total_seconds() / 60
            tiempos_tramitacion.append(delta)
        if e.fecha_recepcion_correo and e.fecha_apertura_dossier:
            delta = (e.fecha_apertura_dossier - e.fecha_recepcion_correo).total_seconds() / 60
            tiempos_respuesta.append(delta)
        if e.fecha_levante and e.fecha_envio_facturacion:
            delta = (e.fecha_envio_facturacion - e.fecha_levante).total_seconds() / 3600
            tiempos_facturacion.append(delta)

    tmt = round(sum(tiempos_tramitacion) / len(tiempos_tramitacion), 2) if tiempos_tramitacion else None
    tmr = round(sum(tiempos_respuesta) / len(tiempos_respuesta), 2) if tiempos_respuesta else None
    tmf = round(sum(tiempos_facturacion) / len(tiempos_facturacion), 2) if tiempos_facturacion else None

    pct_cumplimiento = round((up_producidas / objetivo_up * 100), 2) if objetivo_up else None

    return {
        "operario_id": operario_id,
        "operario_nombre": f"{operario.nombre} {operario.apellidos}",
        "año": año,
        "mes": mes,
        "up_producidas": up_producidas,
        "objetivo_up": objetivo_up,
        "pct_cumplimiento": pct_cumplimiento,
        "factor_k": round(up_producidas / objetivo_up, 3) if objetivo_up else None,
        "num_expedientes": num_expedientes,
        "tasa_ocupacion": tasa_ocupacion,
        "tasa_incidencia": tasa_incidencia,
        "tiempo_medio_tramitacion_min": tmt,
        "tiempo_medio_respuesta_min": tmr,
        "tiempo_medio_facturacion_horas": tmf,
    }


def calcular_kpis_equipo(db: Session, año: int, mes: int, factor_disponibilidad: float = 0.70, tiempo_up_base_min: int = 25) -> dict:
    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()

    kpis_lista = []
    total_up_producidas = 0.0
    total_up_objetivo = 0.0

    media_up = None

    for op in operarios:
        kpi = calcular_kpis_operario(db, op.id, año, mes, factor_disponibilidad, tiempo_up_base_min)
        if kpi:
            kpis_lista.append(kpi)
            total_up_producidas += kpi["up_producidas"]
            if kpi["objetivo_up"]:
                total_up_objetivo += kpi["objetivo_up"]

    if kpis_lista:
        media_up = total_up_producidas / len(kpis_lista)

    for kpi in kpis_lista:
        kpi["irr"] = round((kpi["up_producidas"] / media_up * 100), 2) if media_up and media_up > 0 else None

    pct_global = round((total_up_producidas / total_up_objetivo * 100), 2) if total_up_objetivo > 0 else 0.0

    fin_str = f"{año}-{mes+1:02d}-01" if mes < 12 else f"{año+1}-01-01"
    num_exp_total = (
        db.query(Expediente)
        .filter(
            Expediente.created_at >= f"{año}-{mes:02d}-01",
            Expediente.created_at < fin_str,
        )
        .count()
    )

    return {
        "año": año,
        "mes": mes,
        "total_up_producidas": total_up_producidas,
        "total_up_objetivo": total_up_objetivo,
        "pct_cumplimiento_global": pct_global,
        "num_expedientes_total": num_exp_total,
        "operarios": kpis_lista,
    }
