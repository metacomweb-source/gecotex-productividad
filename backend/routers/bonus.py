from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List
from database import get_db
from auth import get_current_user, require_min_role
from models.usuario import RolEnum, Usuario
from models.evaluaciones_bonus import EvaluacionBonus, EstadoEvaluacionEnum
from models.respuestas_factores import RespuestaFactor
from models.factores_evaluacion import FactorEvaluacion
from models.config_bonus_global import ConfigBonusGlobal, DEFAULT_TRAMOS, DEFAULT_CONFIG_AREA1
from models.notificacion import Notificacion, TipoNotificacionEnum
from schemas.otros import (
    ConfigBonusCreate, ConfigBonusUpdate, ConfigBonusResponse,
    FactorEvaluacionCreate, FactorEvaluacionUpdate, FactorEvaluacionResponse,
    EvaluacionBonusResponse, AutoEvaluacionRequest, EvalDireccionRequest,
    FactorEquipoResponse, IniciarPeriodoRequest, RespuestaFactorResponse,
)
from services.calculo_bonus import (
    calcular_evaluacion_completa, calcular_factor_equipo,
    calcular_puntuacion_area1, calcular_antiguedad_meses,
)
from services.generador_informes import generar_informe_bonus_semestral

router = APIRouter(prefix="/bonus", tags=["bonus"])


def _ev_to_response(ev: EvaluacionBonus) -> dict:
    d = {c.name: getattr(ev, c.name) for c in ev.__table__.columns}
    d["empleado_nombre"] = f"{ev.empleado.nombre} {ev.empleado.apellidos}" if ev.empleado else None
    d["fecha_inicio"] = str(d.get("fecha_inicio", "")) if d.get("fecha_inicio") else None
    d["fecha_fin"] = str(d.get("fecha_fin", "")) if d.get("fecha_fin") else None
    d["respuestas"] = [
        {c.name: getattr(r, c.name) for c in r.__table__.columns}
        for r in (ev.respuestas or [])
    ]
    return d


# ─── CONFIG ──────────────────────────────────────────────────────────────────

@router.get("/config/{anio}/{semestre}", response_model=ConfigBonusResponse)
def obtener_config(
    anio: int,
    semestre: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    cfg = db.query(ConfigBonusGlobal).filter(
        ConfigBonusGlobal.año == anio, ConfigBonusGlobal.semestre == semestre
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    # Serializar fechas como string
    return _config_to_response(cfg)


@router.put("/config/{anio}/{semestre}", response_model=ConfigBonusResponse)
def upsert_config(
    anio: int,
    semestre: int,
    data: ConfigBonusCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    from sqlalchemy.orm.attributes import flag_modified
    cfg = db.query(ConfigBonusGlobal).filter(
        ConfigBonusGlobal.año == anio, ConfigBonusGlobal.semestre == semestre
    ).first()
    if cfg:
        update_fields = data.model_dump(exclude={"año", "semestre"})
        for key, value in update_fields.items():
            if key in ("fecha_inicio", "fecha_fin") and value:
                setattr(cfg, key, date.fromisoformat(value))
            else:
                setattr(cfg, key, value)
        flag_modified(cfg, "tabla_tramos_escalonados")
        flag_modified(cfg, "config_area1")
    else:
        cfg = ConfigBonusGlobal(
            año=anio,
            semestre=semestre,
            fecha_inicio=date.fromisoformat(data.fecha_inicio),
            fecha_fin=date.fromisoformat(data.fecha_fin),
            antiguedad_minima_meses=data.antiguedad_minima_meses,
            factor_equipo_activo=data.factor_equipo_activo,
            factor_equipo_porcentaje=data.factor_equipo_porcentaje,
            factor_equipo_meses_minimos=data.factor_equipo_meses_minimos,
            peso_area1=data.peso_area1,
            peso_area2=data.peso_area2,
            peso_area3=data.peso_area3,
            peso_area4=data.peso_area4,
            peso_auto_evaluacion=data.peso_auto_evaluacion,
            peso_dir_evaluacion=data.peso_dir_evaluacion,
            tabla_tramos_escalonados=data.tabla_tramos_escalonados or DEFAULT_TRAMOS,
            config_area1=data.config_area1 or DEFAULT_CONFIG_AREA1,
        )
        db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return _config_to_response(cfg)


@router.post("/config", response_model=ConfigBonusResponse, status_code=status.HTTP_201_CREATED)
def crear_config(
    data: ConfigBonusCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    existente = db.query(ConfigBonusGlobal).filter(
        ConfigBonusGlobal.año == data.año, ConfigBonusGlobal.semestre == data.semestre
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe configuración para este período")
    cfg = ConfigBonusGlobal(
        año=data.año,
        semestre=data.semestre,
        fecha_inicio=date.fromisoformat(data.fecha_inicio),
        fecha_fin=date.fromisoformat(data.fecha_fin),
        antiguedad_minima_meses=data.antiguedad_minima_meses,
        factor_equipo_activo=data.factor_equipo_activo,
        factor_equipo_porcentaje=data.factor_equipo_porcentaje,
        factor_equipo_meses_minimos=data.factor_equipo_meses_minimos,
        peso_area1=data.peso_area1,
        peso_area2=data.peso_area2,
        peso_area3=data.peso_area3,
        peso_area4=data.peso_area4,
        peso_auto_evaluacion=data.peso_auto_evaluacion,
        peso_dir_evaluacion=data.peso_dir_evaluacion,
        tabla_tramos_escalonados=data.tabla_tramos_escalonados or DEFAULT_TRAMOS,
        config_area1=data.config_area1 or DEFAULT_CONFIG_AREA1,
    )
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return _config_to_response(cfg)


@router.put("/config/{config_id}", response_model=ConfigBonusResponse)
def actualizar_config(
    config_id: int,
    data: ConfigBonusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    cfg = db.query(ConfigBonusGlobal).filter(ConfigBonusGlobal.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    for key, value in data.model_dump(exclude_unset=True).items():
        if key in ("fecha_inicio", "fecha_fin") and value:
            setattr(cfg, key, date.fromisoformat(value))
        else:
            setattr(cfg, key, value)
    db.commit()
    db.refresh(cfg)
    return _config_to_response(cfg)


def _config_to_response(cfg: ConfigBonusGlobal) -> dict:
    return {
        "id": cfg.id,
        "año": cfg.año,
        "semestre": cfg.semestre,
        "fecha_inicio": str(cfg.fecha_inicio),
        "fecha_fin": str(cfg.fecha_fin),
        "antiguedad_minima_meses": cfg.antiguedad_minima_meses,
        "factor_equipo_activo": cfg.factor_equipo_activo,
        "factor_equipo_porcentaje": cfg.factor_equipo_porcentaje,
        "factor_equipo_meses_minimos": cfg.factor_equipo_meses_minimos,
        "peso_area1": cfg.peso_area1,
        "peso_area2": cfg.peso_area2,
        "peso_area3": cfg.peso_area3,
        "peso_area4": cfg.peso_area4,
        "peso_auto_evaluacion": cfg.peso_auto_evaluacion,
        "peso_dir_evaluacion": cfg.peso_dir_evaluacion,
        "tabla_tramos_escalonados": cfg.tabla_tramos_escalonados,
        "config_area1": cfg.config_area1,
    }


# ─── FACTORES ────────────────────────────────────────────────────────────────

@router.get("/factores", response_model=List[FactorEvaluacionResponse])
def listar_factores(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(FactorEvaluacion).filter(FactorEvaluacion.activo == True).order_by(
        FactorEvaluacion.area, FactorEvaluacion.orden
    ).all()


@router.post("/factores", response_model=FactorEvaluacionResponse, status_code=status.HTTP_201_CREATED)
def crear_factor(
    data: FactorEvaluacionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.admin)),
):
    f = FactorEvaluacion(**data.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


@router.put("/factores/{factor_id}", response_model=FactorEvaluacionResponse)
def actualizar_factor(
    factor_id: int,
    data: FactorEvaluacionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.admin)),
):
    f = db.query(FactorEvaluacion).filter(FactorEvaluacion.id == factor_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Factor no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(f, key, value)
    db.commit()
    db.refresh(f)
    return f


@router.delete("/factores/{factor_id}")
def desactivar_factor(
    factor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.admin)),
):
    f = db.query(FactorEvaluacion).filter(FactorEvaluacion.id == factor_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Factor no encontrado")
    f.activo = False
    db.commit()
    return {"message": "Factor desactivado"}


# ─── EVALUACIONES ────────────────────────────────────────────────────────────

@router.post("/evaluaciones/iniciar")
def iniciar_periodo(
    data: IniciarPeriodoRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    cfg = db.query(ConfigBonusGlobal).filter(
        ConfigBonusGlobal.año == data.año, ConfigBonusGlobal.semestre == data.semestre
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configura primero el período antes de iniciarlo")

    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    creadas = 0
    for op in operarios:
        antiguedad = calcular_antiguedad_meses(op.fecha_incorporacion)
        if antiguedad < cfg.antiguedad_minima_meses:
            continue
        existente = db.query(EvaluacionBonus).filter(
            EvaluacionBonus.empleado_id == op.id,
            EvaluacionBonus.año == data.año,
            EvaluacionBonus.semestre == data.semestre,
        ).first()
        if existente:
            continue
        area1 = calcular_puntuacion_area1(db, op.id, data.año, data.semestre, cfg)
        ev = EvaluacionBonus(
            empleado_id=op.id,
            config_id=cfg.id,
            año=data.año,
            semestre=data.semestre,
            estado=EstadoEvaluacionEnum.borrador,
            salario_bruto_anual=op.salario_bruto_anual,
            pct_maximo_bonus=op.pct_maximo_bonus or 0.05,
            factor_k_promedio=area1["factor_k_promedio"],
            pct_sla=area1["pct_sla"],
            pct_registro=area1["pct_registro"],
            puntuacion_area1=area1["puntuacion_area1"],
        )
        db.add(ev)
        # Crear registros vacíos de respuestas para cada factor
        factores = db.query(FactorEvaluacion).filter(FactorEvaluacion.activo == True).all()
        db.flush()
        for f in factores:
            r = RespuestaFactor(evaluacion_id=ev.id, factor_id=f.id)
            db.add(r)
        # Notificación al empleado
        notif = Notificacion(
            usuario_id=op.id,
            titulo="Nueva evaluación de bonus disponible",
            mensaje=f"Se ha iniciado tu evaluación de bonus para el semestre {data.semestre}/{data.año}. Por favor, completa tu autoevaluación.",
            tipo=TipoNotificacionEnum.info,
        )
        db.add(notif)
        creadas += 1
    db.commit()
    return {"evaluaciones_creadas": creadas, "año": data.año, "semestre": data.semestre}


@router.get("/evaluaciones/{anio}/{semestre}")
def listar_evaluaciones(
    anio: int,
    semestre: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    evs = db.query(EvaluacionBonus).filter(
        EvaluacionBonus.año == anio, EvaluacionBonus.semestre == semestre
    ).all()
    return [_ev_to_response(ev) for ev in evs]


@router.get("/evaluaciones/mia")
def mi_evaluacion(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ahora = datetime.now()
    semestre = 1 if ahora.month <= 6 else 2
    ev = db.query(EvaluacionBonus).filter(
        EvaluacionBonus.empleado_id == current_user.id,
        EvaluacionBonus.año == ahora.year,
        EvaluacionBonus.semestre == semestre,
    ).first()
    if not ev:
        # Buscar evaluación pendiente en años/semestres anteriores
        ev = db.query(EvaluacionBonus).filter(
            EvaluacionBonus.empleado_id == current_user.id,
            EvaluacionBonus.estado.in_([EstadoEvaluacionEnum.borrador, EstadoEvaluacionEnum.auto_evaluacion]),
        ).order_by(EvaluacionBonus.año.desc(), EvaluacionBonus.semestre.desc()).first()
    if not ev:
        return None
    return _ev_to_response(ev)


@router.get("/evaluaciones/{evaluacion_id}")
def obtener_evaluacion(
    evaluacion_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ev = db.query(EvaluacionBonus).filter(EvaluacionBonus.id == evaluacion_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    # Empleado solo puede ver la suya
    from auth import ROLES_JERARQUIA
    if ROLES_JERARQUIA.get(current_user.rol, 0) < ROLES_JERARQUIA.get(RolEnum.director, 0):
        if ev.empleado_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tienes permiso para ver esta evaluación")
    return _ev_to_response(ev)


@router.put("/evaluaciones/{evaluacion_id}/auto")
def guardar_auto_evaluacion(
    evaluacion_id: int,
    data: AutoEvaluacionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ev = db.query(EvaluacionBonus).filter(EvaluacionBonus.id == evaluacion_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if ev.empleado_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes editar tu propia evaluación")
    if ev.estado not in (EstadoEvaluacionEnum.borrador, EstadoEvaluacionEnum.auto_evaluacion):
        raise HTTPException(status_code=400, detail="La evaluación no está en estado editable")

    for item in data.respuestas:
        resp = db.query(RespuestaFactor).filter(
            RespuestaFactor.evaluacion_id == evaluacion_id,
            RespuestaFactor.factor_id == item.factor_id,
        ).first()
        if not resp:
            resp = RespuestaFactor(evaluacion_id=evaluacion_id, factor_id=item.factor_id)
            db.add(resp)
        resp.nota_auto = item.nota_auto
        resp.comentario_auto = item.comentario_auto

    if data.notas_area2 is not None:
        ev.notas_empleado_area2 = data.notas_area2
    if data.notas_area3 is not None:
        ev.notas_empleado_area3 = data.notas_area3
    if data.notas_area4 is not None:
        ev.notas_empleado_area4 = data.notas_area4

    ev.estado = EstadoEvaluacionEnum.evaluacion_dir
    ev.fecha_inicio_auto_eval = ev.fecha_inicio_auto_eval or datetime.now()
    ev.fecha_fin_auto_eval = datetime.now()
    db.commit()
    db.refresh(ev)

    # Notificar al director
    director = db.query(Usuario).filter(
        Usuario.activo == True, Usuario.rol == RolEnum.director
    ).first()
    if director:
        notif = Notificacion(
            usuario_id=director.id,
            titulo="Autoevaluación completada",
            mensaje=f"{ev.empleado.nombre} {ev.empleado.apellidos} ha completado su autoevaluación del semestre {ev.semestre}/{ev.año}.",
            tipo=TipoNotificacionEnum.info,
        )
        db.add(notif)
        db.commit()

    return _ev_to_response(ev)


@router.put("/evaluaciones/{evaluacion_id}/dir")
def guardar_eval_direccion(
    evaluacion_id: int,
    data: EvalDireccionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    ev = db.query(EvaluacionBonus).filter(EvaluacionBonus.id == evaluacion_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if ev.estado == EstadoEvaluacionEnum.cerrada:
        raise HTTPException(status_code=400, detail="La evaluación está cerrada y no puede editarse")

    for item in data.respuestas:
        resp = db.query(RespuestaFactor).filter(
            RespuestaFactor.evaluacion_id == evaluacion_id,
            RespuestaFactor.factor_id == item.factor_id,
        ).first()
        if not resp:
            resp = RespuestaFactor(evaluacion_id=evaluacion_id, factor_id=item.factor_id)
            db.add(resp)
        resp.nota_dir = item.nota_dir
        resp.comentario_dir = item.comentario_dir

    if data.notas_area2 is not None:
        ev.notas_director_area2 = data.notas_area2
    if data.notas_area3 is not None:
        ev.notas_director_area3 = data.notas_area3
    if data.notas_area4 is not None:
        ev.notas_director_area4 = data.notas_area4

    ev.estado = EstadoEvaluacionEnum.completada
    ev.fecha_inicio_eval_dir = ev.fecha_inicio_eval_dir or datetime.now()
    db.commit()

    # Calcular todo
    calcular_evaluacion_completa(db, evaluacion_id)
    ev = db.query(EvaluacionBonus).filter(EvaluacionBonus.id == evaluacion_id).first()
    return _ev_to_response(ev)


@router.post("/evaluaciones/{evaluacion_id}/cerrar")
def cerrar_evaluacion(
    evaluacion_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    ev = db.query(EvaluacionBonus).filter(EvaluacionBonus.id == evaluacion_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if ev.estado != EstadoEvaluacionEnum.completada:
        raise HTTPException(status_code=400, detail="Solo se pueden cerrar evaluaciones completadas")
    ev.estado = EstadoEvaluacionEnum.cerrada
    ev.fecha_cierre = datetime.now()
    db.commit()
    # Notificar al empleado
    notif = Notificacion(
        usuario_id=ev.empleado_id,
        titulo="Evaluación de bonus finalizada",
        mensaje=f"Tu evaluación de bonus del semestre {ev.semestre}/{ev.año} ha sido aprobada. Bonus confirmado: {ev.bonus_semestral_euros or 0:.2f} €",
        tipo=TipoNotificacionEnum.logro,
    )
    db.add(notif)
    db.commit()
    db.refresh(ev)
    return _ev_to_response(ev)


# ─── FACTOR EQUIPO ───────────────────────────────────────────────────────────

@router.get("/factor-equipo/{anio}/{semestre}")
def factor_equipo(
    anio: int,
    semestre: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    cfg = db.query(ConfigBonusGlobal).filter(
        ConfigBonusGlobal.año == anio, ConfigBonusGlobal.semestre == semestre
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return calcular_factor_equipo(db, anio, semestre, cfg)


# ─── HISTÓRICO Y RESUMEN ─────────────────────────────────────────────────────

@router.get("/historial/{empleado_id}")
def historial_empleado(
    empleado_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from auth import ROLES_JERARQUIA
    if ROLES_JERARQUIA.get(current_user.rol, 0) < ROLES_JERARQUIA.get(RolEnum.director, 0):
        if empleado_id != current_user.id:
            raise HTTPException(status_code=403, detail="Sin permiso")
    evs = db.query(EvaluacionBonus).filter(
        EvaluacionBonus.empleado_id == empleado_id
    ).order_by(EvaluacionBonus.año.desc(), EvaluacionBonus.semestre.desc()).all()
    return [_ev_to_response(ev) for ev in evs]


@router.get("/resumen/{anio}/{semestre}")
def resumen_periodo(
    anio: int,
    semestre: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    evs = db.query(EvaluacionBonus).filter(
        EvaluacionBonus.año == anio, EvaluacionBonus.semestre == semestre
    ).all()
    total_bonus = sum(ev.bonus_semestral_euros or 0 for ev in evs)
    fe = None
    cfg = db.query(ConfigBonusGlobal).filter(
        ConfigBonusGlobal.año == anio, ConfigBonusGlobal.semestre == semestre
    ).first()
    if cfg:
        fe = calcular_factor_equipo(db, anio, semestre, cfg)
    return {
        "año": anio,
        "semestre": semestre,
        "total_evaluaciones": len(evs),
        "total_bonus_euros": round(total_bonus, 2),
        "factor_equipo": fe,
        "evaluaciones": [_ev_to_response(ev) for ev in evs],
    }


# ─── EXPORTAR ────────────────────────────────────────────────────────────────

@router.get("/exportar/{anio}/{semestre}")
def exportar_bonus(
    anio: int,
    semestre: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    evs = db.query(EvaluacionBonus).filter(
        EvaluacionBonus.año == anio, EvaluacionBonus.semestre == semestre
    ).all()
    cfg = db.query(ConfigBonusGlobal).filter(
        ConfigBonusGlobal.año == anio, ConfigBonusGlobal.semestre == semestre
    ).first()
    factores = db.query(FactorEvaluacion).filter(FactorEvaluacion.activo == True).order_by(
        FactorEvaluacion.area, FactorEvaluacion.orden
    ).all()
    fe = calcular_factor_equipo(db, anio, semestre, cfg) if cfg else None
    buf = generar_informe_bonus_semestral(evs, factores, cfg, fe, anio, semestre)
    filename = f"GECOTEX_Bonus_{anio}_S{semestre}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
