from datetime import date
from sqlalchemy.orm import Session
from models.expediente import Expediente
from models.objetivo_mes import ObjetivoMes
from models.usuario import Usuario, RolEnum
from models.evaluaciones_bonus import EvaluacionBonus, EstadoEvaluacionEnum
from models.respuestas_factores import RespuestaFactor
from models.factores_evaluacion import FactorEvaluacion
from models.config_bonus_global import ConfigBonusGlobal


def _semestre_a_meses(semestre: int) -> list:
    return [1, 2, 3, 4, 5, 6] if semestre == 1 else [7, 8, 9, 10, 11, 12]


def _convertir_k_a_puntuacion(k: float, tabla: list) -> float:
    if k >= 1.0:
        return min(10.0, 9.0 + (k - 1.0) * 10)
    for tramo in sorted(tabla, key=lambda t: t["k_min"]):
        k_min = float(tramo["k_min"])
        k_max = tramo.get("k_max")
        if k_max is not None:
            k_max = float(k_max)
            if k >= k_min and k < k_max:
                return float(tramo["puntuacion"])
    return 3.0


def _convertir_pct_a_puntuacion(pct: float, tabla: list) -> float:
    for tramo in sorted(tabla, key=lambda t: t["pct_min"]):
        if pct >= tramo["pct_min"] and pct < tramo["pct_max"]:
            return float(tramo["puntuacion"])
    return 10.0


def calcular_puntuacion_area1(db: Session, empleado_id: int, año: int, semestre: int, config: ConfigBonusGlobal) -> dict:
    meses = _semestre_a_meses(semestre)
    cfg1 = config.config_area1

    expedientes = (
        db.query(Expediente)
        .filter(Expediente.operario_id == empleado_id)
        .all()
    )
    exps_periodo = [
        e for e in expedientes
        if e.fecha_apertura_dossier
        and e.fecha_apertura_dossier.year == año
        and e.fecha_apertura_dossier.month in meses
    ]

    # Factor K
    total_ups = sum(e.up_calculadas or 0.0 for e in exps_periodo)
    objetivos = db.query(ObjetivoMes).filter(
        ObjetivoMes.operario_id == empleado_id,
        ObjetivoMes.año == año,
        ObjetivoMes.mes.in_(meses),
    ).all()
    total_objetivo = sum(o.objetivo_up for o in objetivos)
    factor_k = round(total_ups / total_objetivo, 3) if total_objetivo > 0 else 0.0

    # % SLA
    sla_horas = float(cfg1.get("sla_horas", 2.0))
    exps_con_envio = [e for e in exps_periodo if e.fecha_envio_aduana and e.fecha_apertura_dossier]
    if exps_con_envio:
        dentro_sla = sum(
            1 for e in exps_con_envio
            if (e.fecha_envio_aduana - e.fecha_apertura_dossier).total_seconds() / 3600 <= sla_horas
        )
        pct_sla = round(dentro_sla / len(exps_con_envio) * 100, 1)
    else:
        pct_sla = 0.0

    # % registro completo
    total = len(exps_periodo)
    pct_registro = round(
        sum(1 for e in exps_periodo if e.fecha_envio_aduana is not None) / total * 100, 1
    ) if total > 0 else 0.0

    p_k = _convertir_k_a_puntuacion(factor_k, cfg1["tabla_conversion_k"])
    p_sla = _convertir_pct_a_puntuacion(pct_sla, cfg1["tabla_conversion_pct"])
    p_reg = _convertir_pct_a_puntuacion(pct_registro, cfg1["tabla_conversion_pct"])

    puntuacion = round(
        p_k * cfg1["peso_factor_k"] + p_sla * cfg1["peso_sla"] + p_reg * cfg1["peso_registro"],
        2,
    )
    return {"factor_k_promedio": factor_k, "pct_sla": pct_sla, "pct_registro": pct_registro, "puntuacion_area1": puntuacion}


def calcular_puntuacion_area(respuestas: list, peso_auto: float, peso_dir: float, factores: list = None) -> float:
    peso_map = {f.id: (f.peso if f.peso is not None else 1.0) for f in factores} if factores else {}
    notas_pesos = []
    for r in respuestas:
        if r.nota_auto is not None and r.nota_dir is not None:
            nota = r.nota_auto * peso_auto + r.nota_dir * peso_dir
        elif r.nota_dir is not None:
            nota = r.nota_dir
        elif r.nota_auto is not None:
            nota = r.nota_auto
        else:
            continue
        p = peso_map.get(r.factor_id, 1.0)
        notas_pesos.append((nota, p))
    if not notas_pesos:
        return 0.0
    total_peso = sum(p for _, p in notas_pesos)
    if total_peso == 0:
        return 0.0
    return round(sum(n * p for n, p in notas_pesos) / total_peso, 2)


def calcular_puntuacion_total(p1: float, p2: float, p3: float, p4: float, config: ConfigBonusGlobal) -> float:
    return round(
        p1 * config.peso_area1 + p2 * config.peso_area2
        + p3 * config.peso_area3 + p4 * config.peso_area4,
        2,
    )


def calcular_tramo_escalonado(puntuacion_total: float, tabla_tramos: list) -> float:
    for tramo in sorted(tabla_tramos, key=lambda t: t["p_min"]):
        if puntuacion_total >= tramo["p_min"] and puntuacion_total < tramo["p_max"]:
            return float(tramo["porcentaje"])
    return 0.0


def calcular_factor_equipo(db: Session, año: int, semestre: int, config: ConfigBonusGlobal) -> dict:
    meses = _semestre_a_meses(semestre)
    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    detalle = []
    meses_cumplidos = 0
    for mes in meses:
        total_ups = 0.0
        total_obj = 0.0
        for op in operarios:
            exps = db.query(Expediente).filter(Expediente.operario_id == op.id).all()
            ups_mes = sum(
                e.up_calculadas or 0.0 for e in exps
                if e.fecha_apertura_dossier
                and e.fecha_apertura_dossier.year == año
                and e.fecha_apertura_dossier.month == mes
            )
            obj = db.query(ObjetivoMes).filter(
                ObjetivoMes.operario_id == op.id, ObjetivoMes.año == año, ObjetivoMes.mes == mes
            ).first()
            total_ups += ups_mes
            total_obj += obj.objetivo_up if obj else 0.0
        cumplido = total_obj > 0 and total_ups >= total_obj
        if cumplido:
            meses_cumplidos += 1
        detalle.append({"mes": mes, "ups": round(total_ups, 2), "objetivo": round(total_obj, 2), "cumplido": cumplido})

    activado = config.factor_equipo_activo and meses_cumplidos >= config.factor_equipo_meses_minimos
    return {
        "meses_cumplidos": meses_cumplidos,
        "meses_totales": len(meses),
        "activado": activado,
        "factor_multiplicador": 1.0 + config.factor_equipo_porcentaje if activado else 1.0,
        "detalle_meses": detalle,
    }


def calcular_bonus_euros(salario: float, pct_maximo: float, pct_tramo: float, factor_equipo: float) -> float:
    return round((salario * pct_maximo * pct_tramo * factor_equipo) / 2, 2)


def calcular_evaluacion_completa(db: Session, evaluacion_id: int):
    ev = db.query(EvaluacionBonus).filter(EvaluacionBonus.id == evaluacion_id).first()
    if not ev:
        return None
    config = db.query(ConfigBonusGlobal).filter(ConfigBonusGlobal.id == ev.config_id).first()
    factores = db.query(FactorEvaluacion).filter(FactorEvaluacion.activo == True).all()

    # Área 1
    area1 = calcular_puntuacion_area1(db, ev.empleado_id, ev.año, ev.semestre, config)
    ev.factor_k_promedio = area1["factor_k_promedio"]
    ev.pct_sla = area1["pct_sla"]
    ev.pct_registro = area1["pct_registro"]
    ev.puntuacion_area1 = area1["puntuacion_area1"]

    # Áreas 2, 3, 4
    for area_num in (2, 3, 4):
        factores_area = [f for f in factores if f.area == area_num]
        ids_area = [f.id for f in factores_area]
        resp = db.query(RespuestaFactor).filter(
            RespuestaFactor.evaluacion_id == evaluacion_id,
            RespuestaFactor.factor_id.in_(ids_area),
        ).all()
        for r in resp:
            if r.nota_auto is not None and r.nota_dir is not None:
                r.nota_final = round(r.nota_auto * config.peso_auto_evaluacion + r.nota_dir * config.peso_dir_evaluacion, 2)
            elif r.nota_dir is not None:
                r.nota_final = r.nota_dir
            elif r.nota_auto is not None:
                r.nota_final = r.nota_auto
        puntuacion = calcular_puntuacion_area(resp, config.peso_auto_evaluacion, config.peso_dir_evaluacion, factores_area)
        setattr(ev, f"puntuacion_area{area_num}", puntuacion)

    # Puntuación total
    p1 = ev.puntuacion_area1 or 0.0
    ev.puntuacion_total = calcular_puntuacion_total(
        p1, ev.puntuacion_area2 or 0.0, ev.puntuacion_area3 or 0.0, ev.puntuacion_area4 or 0.0, config
    )

    # Factor equipo
    fe = calcular_factor_equipo(db, ev.año, ev.semestre, config)
    ev.factor_equipo_aplicado = fe["activado"]
    ev.porcentaje_tramo = calcular_tramo_escalonado(ev.puntuacion_total, config.tabla_tramos_escalonados)

    if ev.salario_bruto_anual and ev.porcentaje_tramo is not None:
        ev.bonus_semestral_euros = calcular_bonus_euros(
            ev.salario_bruto_anual, ev.pct_maximo_bonus, ev.porcentaje_tramo, fe["factor_multiplicador"]
        )

    db.commit()
    db.refresh(ev)
    return ev


def calcular_antiguedad_meses(fecha_incorporacion) -> int:
    if not fecha_incorporacion:
        return 0
    hoy = date.today()
    return max(0, (hoy.year - fecha_incorporacion.year) * 12 + (hoy.month - fecha_incorporacion.month))
