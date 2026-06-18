"""
Dashboard por-empleado: 7 endpoints bajo /api/v1/empleados/{id}/
Requiere rol coordinador, director o admin.
"""
import calendar
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models.usuario import Usuario, RolEnum
from models.expediente import Expediente, CanalEnum
from models.sesion_trabajo import SesionTrabajo, EstadoSesionEnum
from models.objetivo_mes import ObjetivoMes
from services.calculo_kpis import calcular_kpis_operario, dias_laborables_mes

router = APIRouter(prefix="/empleados", tags=["empleados-dashboard"])

_ROLES_PERMITIDOS = {RolEnum.coordinador, RolEnum.director, RolEnum.admin}

# ── helpers ─────────────────────────────────────────────────────────────────

def _check_perm(current_user: Usuario):
    if current_user.rol not in _ROLES_PERMITIDOS:
        raise HTTPException(status_code=403, detail="Sin permisos")


def _get_emp(db: Session, emp_id: int, current_user: Usuario) -> Usuario:
    emp = db.query(Usuario).filter(Usuario.id == emp_id, Usuario.activo == True).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if current_user.rol == RolEnum.coordinador and current_user.sede and emp.sede != current_user.sede:
        raise HTTPException(status_code=403, detail="Sin permisos para este empleado")
    return emp


def _fase(e: Expediente) -> str:
    if e.fecha_envio_facturacion:
        return "cerrado"
    if e.fecha_levante:
        return "levante"
    if e.fecha_envio_aduana:
        return "en_aduana"
    if e.fecha_apertura_dossier:
        return "en_tramitacion"
    return "recibido"


def _origen_fase(e: Expediente) -> Optional[datetime]:
    f = _fase(e)
    return {
        "recibido":      e.fecha_recepcion_correo or e.created_at,
        "en_tramitacion": e.fecha_apertura_dossier,
        "en_aduana":     e.fecha_envio_aduana,
        "levante":       e.fecha_levante,
        "cerrado":       e.fecha_envio_facturacion,
    }.get(f)


def _tiempo_fase_min(e: Expediente) -> Optional[float]:
    origen = _origen_fase(e)
    if not origen:
        return None
    return (datetime.utcnow() - origen).total_seconds() / 60


def _periodo(año: int, mes: int):
    inicio = datetime(año, mes, 1)
    fin = datetime(año + 1, 1, 1) if mes == 12 else datetime(año, mes + 1, 1)
    return inicio, fin


# ── 1. Pipeline resumen ──────────────────────────────────────────────────────

@router.get("/{emp_id}/pipeline")
def pipeline_resumen(
    emp_id: int,
    mes: int = Query(...),
    año: int = Query(...),
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    _check_perm(cu)
    _get_emp(db, emp_id, cu)

    activos = db.query(Expediente).filter(
        Expediente.operario_id == emp_id,
        Expediente.fecha_envio_facturacion == None,
    ).all()

    inicio, fin = _periodo(año, mes)
    cerrados = db.query(Expediente).filter(
        Expediente.operario_id == emp_id,
        Expediente.fecha_envio_facturacion >= inicio,
        Expediente.fecha_envio_facturacion < fin,
    ).all()

    def _bloque(exps, fase_key, umbral_min):
        if not exps:
            return {"count": 0, "tiempo_medio_min": None, "con_alerta": False}
        tiempos = [t for t in (_tiempo_fase_min(e) for e in exps) if t is not None]
        if fase_key == "levante":
            con_alerta = any(
                _tiempo_fase_min(e) is not None
                and _tiempo_fase_min(e) > umbral_min
                and e.canal_respuesta == CanalEnum.rojo
                for e in exps
            )
        else:
            con_alerta = any(t > umbral_min for t in tiempos)
        return {
            "count": len(exps),
            "tiempo_medio_min": round(sum(tiempos) / len(tiempos), 1) if tiempos else None,
            "con_alerta": con_alerta,
        }

    recibidos     = [e for e in activos if _fase(e) == "recibido"]
    en_tramitacion = [e for e in activos if _fase(e) == "en_tramitacion"]
    en_aduana     = [e for e in activos if _fase(e) == "en_aduana"]
    levante_exps  = [e for e in activos if _fase(e) == "levante"]

    levante_data = _bloque(levante_exps, "levante", 240)
    levante_data["por_canal"] = {
        "verde":   sum(1 for e in levante_exps if e.canal_respuesta == CanalEnum.verde),
        "naranja": sum(1 for e in levante_exps if e.canal_respuesta == CanalEnum.naranja),
        "rojo":    sum(1 for e in levante_exps if e.canal_respuesta == CanalEnum.rojo),
    }

    return {
        "recibido":       _bloque(recibidos,      "recibido",      120),
        "en_tramitacion": _bloque(en_tramitacion, "en_tramitacion", 480),
        "en_aduana":      _bloque(en_aduana,      "en_aduana",     1440),
        "levante":        levante_data,
        "cerrado":        {"count": len(cerrados), "tiempo_medio_min": None, "con_alerta": False},
    }


# ── 2. Pipeline detalle de fase ──────────────────────────────────────────────

@router.get("/{emp_id}/pipeline/{fase}")
def pipeline_fase(
    emp_id: int,
    fase: str,
    mes: int = Query(...),
    año: int = Query(...),
    page: int = Query(1),
    limit: int = Query(10),
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    _check_perm(cu)
    _get_emp(db, emp_id, cu)

    if fase == "cerrado":
        inicio, fin = _periodo(año, mes)
        exps = db.query(Expediente).filter(
            Expediente.operario_id == emp_id,
            Expediente.fecha_envio_facturacion >= inicio,
            Expediente.fecha_envio_facturacion < fin,
        ).all()
    else:
        activos = db.query(Expediente).filter(
            Expediente.operario_id == emp_id,
            Expediente.fecha_envio_facturacion == None,
        ).all()
        exps = [e for e in activos if _fase(e) == fase]

    UMBRALES = {"recibido": 120, "en_tramitacion": 480, "en_aduana": 1440, "levante": 240}
    umbral = UMBRALES.get(fase, 99999)

    exps_sorted = sorted(exps, key=lambda e: _tiempo_fase_min(e) or 0, reverse=True)
    total = len(exps_sorted)
    page_exps = exps_sorted[(page - 1) * limit: page * limit]

    items = []
    for e in page_exps:
        t = _tiempo_fase_min(e)
        canal_val = e.canal_respuesta.value if e.canal_respuesta else None
        if fase == "levante":
            alerta = t is not None and t > umbral and e.canal_respuesta == CanalEnum.rojo
        else:
            alerta = t is not None and t > umbral
        items.append({
            "id": e.id,
            "numero_expediente": e.numero_expediente,
            "cliente_nombre": e.cliente_nombre,
            "tipo_dua": e.tipo_dua.nombre if e.tipo_dua else None,
            "tipo_trafico": e.tipo_trafico.value if e.tipo_trafico else None,
            "up_calculadas": e.up_calculadas,
            "canal_respuesta": canal_val,
            "tiempo_fase_min": round(t, 1) if t is not None else None,
            "con_alerta": alerta,
        })

    return {"total": total, "page": page, "limit": limit, "items": items}


# ── 3. KPIs del mes ──────────────────────────────────────────────────────────

@router.get("/{emp_id}/kpis-mes")
def kpis_mes(
    emp_id: int,
    mes: int = Query(...),
    año: int = Query(...),
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    _check_perm(cu)
    _get_emp(db, emp_id, cu)

    k = calcular_kpis_operario(db, emp_id, año, mes)
    mes_ant = mes - 1 if mes > 1 else 12
    año_ant = año if mes > 1 else año - 1
    k_ant = calcular_kpis_operario(db, emp_id, año_ant, mes_ant)

    inicio, fin = _periodo(año, mes)
    exps = db.query(Expediente).filter(
        Expediente.operario_id == emp_id,
        Expediente.created_at >= inicio,
        Expediente.created_at < fin,
    ).all()

    canales = {"verde": 0, "naranja": 0, "rojo": 0, "pendiente": 0}
    por_tipo = {}
    for e in exps:
        c = e.canal_respuesta.value if e.canal_respuesta else "pendiente"
        canales[c] = canales.get(c, 0) + 1
        t = e.tipo_trafico.value if e.tipo_trafico else "otro"
        por_tipo[t] = por_tipo.get(t, 0) + 1

    total = len(exps)
    pct_incidencia = round((canales["naranja"] + canales["rojo"]) / total * 100, 1) if total > 0 else 0

    # Tiempo medio del equipo para comparar
    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    tiempos_eq = [
        calcular_kpis_operario(db, op.id, año, mes).get("tiempo_medio_tramitacion_min")
        for op in operarios
    ]
    tiempos_eq = [t for t in tiempos_eq if t is not None]
    tmt_equipo = round(sum(tiempos_eq) / len(tiempos_eq), 1) if tiempos_eq else None

    return {
        "ups_producidas": k.get("up_producidas"),
        "ups_objetivo": k.get("objetivo_up"),
        "pct_objetivo": k.get("pct_cumplimiento"),
        "ups_mes_anterior": k_ant.get("up_producidas"),
        "diferencia_ups": round((k.get("up_producidas") or 0) - (k_ant.get("up_producidas") or 0), 2),
        "factor_k": k.get("factor_k"),
        "factor_k_anterior": k_ant.get("factor_k"),
        "expedientes_total": total,
        "por_tipo": por_tipo,
        "canales": canales,
        "tasa_ocupacion": k.get("tasa_ocupacion"),
        "pct_incidencia": pct_incidencia,
        "tiempo_medio_tramitacion_min": k.get("tiempo_medio_tramitacion_min"),
        "tiempo_medio_tramitacion_equipo_min": tmt_equipo,
    }


# ── 4. UPs diarias ───────────────────────────────────────────────────────────

@router.get("/{emp_id}/ups-diarias")
def ups_diarias(
    emp_id: int,
    mes: int = Query(...),
    año: int = Query(...),
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    _check_perm(cu)
    _get_emp(db, emp_id, cu)

    _, num_dias = calendar.monthrange(año, mes)
    hoy = date.today()
    inicio, fin = _periodo(año, mes)

    exps = db.query(Expediente).filter(
        Expediente.operario_id == emp_id,
        Expediente.created_at >= inicio,
        Expediente.created_at < fin,
    ).all()

    objetivo = db.query(ObjetivoMes).filter(
        ObjetivoMes.operario_id == emp_id,
        ObjetivoMes.año == año,
        ObjetivoMes.mes == mes,
    ).first()
    dias_lab = dias_laborables_mes(año, mes)
    obj_diario = round(objetivo.objetivo_up / dias_lab, 2) if objetivo and dias_lab > 0 else None

    result = []
    for dia in range(1, num_dias + 1):
        d = date(año, mes, dia)
        es_futuro = d > hoy
        es_finde = d.weekday() >= 5
        ups = 0.0
        n_exps = 0
        if not es_futuro:
            for e in exps:
                if e.created_at and e.created_at.day == dia:
                    ups += e.up_calculadas or 0
                    n_exps += 1
        result.append({
            "dia": dia,
            "ups": None if es_futuro else round(ups, 2),
            "expedientes": None if es_futuro else n_exps,
            "laborable": not es_finde,
            "futuro": es_futuro,
            "objetivo_diario": obj_diario,
        })

    return result


# ── 5. Comparativa de equipo ─────────────────────────────────────────────────

@router.get("/{emp_id}/comparativa-equipo")
def comparativa_equipo(
    emp_id: int,
    mes: int = Query(...),
    año: int = Query(...),
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    _check_perm(cu)
    _get_emp(db, emp_id, cu)

    k_emp = calcular_kpis_operario(db, emp_id, año, mes)
    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    kpis_todos = [(op, calcular_kpis_operario(db, op.id, año, mes)) for op in operarios]
    show_names = cu.rol in {RolEnum.director, RolEnum.admin}

    def _stat(kpi_key, higher_better=True):
        pairs = [(op, k[kpi_key]) for op, k in kpis_todos if k.get(kpi_key) is not None]
        if not pairs:
            return None, None, None, None, 0
        pairs_s = sorted(pairs, key=lambda x: x[1], reverse=higher_better)
        mejor_op, mejor_val = pairs_s[0]
        media = round(sum(v for _, v in pairs) / len(pairs), 2)
        pos = next((i + 1 for i, (op, _) in enumerate(pairs_s) if op.id == emp_id), None)
        nombre_mejor = f"{mejor_op.nombre} {mejor_op.apellidos}" if show_names else "—"
        return mejor_val, nombre_mejor, pos, media, len(pairs)

    rows = []
    for label, key, hb in [
        ("UPs del mes",              "up_producidas",                True),
        ("Factor K",                 "factor_k",                     True),
        ("Tiempo tramitación (min)", "tiempo_medio_tramitacion_min", False),
        ("Expedientes cerrados",     "num_expedientes",              True),
    ]:
        mejor_val, mejor_nombre, pos, media, total = _stat(key, hb)
        rows.append({
            "kpi": label,
            "valor_empleado": k_emp.get(key),
            "media_equipo": media,
            "mejor_valor": mejor_val,
            "mejor_nombre": mejor_nombre,
            "posicion": pos,
            "total": total,
            "higher_better": hb,
        })

    return rows


# ── 6. Expedientes del período con filtros ───────────────────────────────────

@router.get("/{emp_id}/expedientes")
def expedientes(
    emp_id: int,
    mes: int = Query(...),
    año: int = Query(...),
    estado: Optional[str] = Query(None),
    canal: Optional[str] = Query(None),
    tipo_trafico: Optional[str] = Query(None),
    buscar: Optional[str] = Query(None),
    page: int = Query(1),
    limit: int = Query(15),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    _check_perm(cu)
    _get_emp(db, emp_id, cu)

    inicio, fin = _periodo(año, mes)
    q = db.query(Expediente).filter(
        Expediente.operario_id == emp_id,
        Expediente.created_at >= inicio,
        Expediente.created_at < fin,
    )
    if canal:
        q = q.filter(Expediente.canal_respuesta == canal)
    if tipo_trafico:
        q = q.filter(Expediente.tipo_trafico == tipo_trafico)
    if buscar:
        like = f"%{buscar}%"
        q = q.filter(
            Expediente.numero_expediente.ilike(like) |
            Expediente.cliente_nombre.ilike(like)
        )

    all_exps = q.all()
    if estado == "abiertos":
        all_exps = [e for e in all_exps if e.fecha_envio_facturacion is None]
    elif estado == "cerrados":
        all_exps = [e for e in all_exps if e.fecha_envio_facturacion is not None]

    SORT_ALLOWED = {"created_at", "up_calculadas", "num_partidas"}
    sort_field = sort if sort in SORT_ALLOWED else "created_at"

    def _sk(e):
        v = getattr(e, sort_field, None)
        if v is None:
            return datetime.min if sort_field == "created_at" else 0
        return v

    all_exps = sorted(all_exps, key=_sk, reverse=(order == "desc"))
    total = len(all_exps)
    page_exps = all_exps[(page - 1) * limit: page * limit]

    def _tmt(e):
        if e.fecha_apertura_dossier and e.fecha_envio_facturacion:
            return round((e.fecha_envio_facturacion - e.fecha_apertura_dossier).total_seconds() / 60, 1)
        return None

    items = []
    for e in page_exps:
        items.append({
            "id": e.id,
            "numero_expediente": e.numero_expediente,
            "cliente_nombre": e.cliente_nombre,
            "tipo_dua": e.tipo_dua.nombre if e.tipo_dua else None,
            "tipo_trafico": e.tipo_trafico.value if e.tipo_trafico else None,
            "num_partidas": e.num_partidas,
            "up_calculadas": e.up_calculadas,
            "canal_respuesta": e.canal_respuesta.value if e.canal_respuesta else None,
            "fase": _fase(e),
            "fecha_apertura": e.fecha_apertura_dossier.strftime("%d/%m/%Y") if e.fecha_apertura_dossier else None,
            "tiempo_tramitacion_min": _tmt(e),
        })

    return {"total": total, "page": page, "limit": limit, "items": items}


# ── 7. Cronómetro activo ─────────────────────────────────────────────────────

@router.get("/{emp_id}/cronometro-activo")
def cronometro_activo(
    emp_id: int,
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    _check_perm(cu)
    _get_emp(db, emp_id, cu)

    sesion = (
        db.query(SesionTrabajo)
        .filter(
            SesionTrabajo.operario_id == emp_id,
            SesionTrabajo.estado == EstadoSesionEnum.activa,
        )
        .order_by(SesionTrabajo.inicio.desc())
        .first()
    )
    if not sesion:
        return None

    exp = db.query(Expediente).filter(Expediente.id == sesion.expediente_id).first()
    elapsed = int((datetime.utcnow() - sesion.inicio).total_seconds())

    return {
        "sesion_id": sesion.id,
        "expediente_id": sesion.expediente_id,
        "numero_expediente": exp.numero_expediente if exp else None,
        "inicio_iso": sesion.inicio.isoformat(),
        "elapsed_seg": elapsed,
    }


# ── 8. Lista de operarios disponibles ────────────────────────────────────────

@router.get("/lista-operarios")
def lista_operarios(
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    _check_perm(cu)
    q = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario)
    if cu.rol == RolEnum.coordinador and cu.sede:
        q = q.filter(Usuario.sede == cu.sede)
    ops = q.order_by(Usuario.nombre).all()
    return [
        {
            "id": op.id,
            "nombre": op.nombre,
            "apellidos": op.apellidos,
            "sede": op.sede.value if op.sede else None,
            "fecha_incorporacion": op.fecha_incorporacion.isoformat() if op.fecha_incorporacion else None,
        }
        for op in ops
    ]
