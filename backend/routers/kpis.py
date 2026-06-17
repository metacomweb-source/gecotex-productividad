from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from database import get_db
from auth import get_current_user, require_min_role
from models.usuario import RolEnum, Usuario
from models.expediente import Expediente, CanalEnum
from models.parametros_bonus import ParametrosBonus
from models.tipo_dua import TipoDua
from models.objetivo_mes import ObjetivoMes
from services.calculo_kpis import calcular_kpis_operario, calcular_kpis_equipo, capacidad_teorica_mes, dias_laborables_mes

router = APIRouter(prefix="/kpis", tags=["kpis"])


def _get_params(db: Session):
    año = datetime.now().year
    params = db.query(ParametrosBonus).filter(ParametrosBonus.año == año).first()
    factor_disp = params.factor_disponibilidad if params else 0.70
    tipo_base = db.query(TipoDua).filter(TipoDua.codigo == "EXP-B").first()
    tiempo_base = tipo_base.tiempo_estimado_min if tipo_base else 25
    return factor_disp, tiempo_base


@router.get("/operario/{operario_id}")
def kpis_operario(
    operario_id: int,
    año: int = Query(default=None),
    mes: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.rol == RolEnum.operario and current_user.id != operario_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Sin permisos")
    now = datetime.now()
    año = año or now.year
    mes = mes or now.month
    factor_disp, tiempo_base = _get_params(db)
    return calcular_kpis_operario(db, operario_id, año, mes, factor_disp, tiempo_base)


@router.get("/equipo")
def kpis_equipo(
    año: int = Query(default=None),
    mes: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    now = datetime.now()
    año = año or now.year
    mes = mes or now.month
    factor_disp, tiempo_base = _get_params(db)
    return calcular_kpis_equipo(db, año, mes, factor_disp, tiempo_base)


@router.get("/suficiencia")
def suficiencia(
    año: int = Query(default=None),
    mes: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    now = datetime.now()
    año = año or now.year
    mes = mes or now.month
    factor_disp, tiempo_base = _get_params(db)

    from datetime import datetime as dt
    inicio = dt(año, mes, 1)
    fin = dt(año + 1, 1, 1) if mes == 12 else dt(año, mes + 1, 1)
    up_demanda = sum(
        e.up_calculadas or 0
        for e in db.query(Expediente).filter(Expediente.created_at >= inicio, Expediente.created_at < fin).all()
    )

    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    up_oferta = sum(capacidad_teorica_mes(op, año, mes, factor_disp, tiempo_base) for op in operarios)

    ratio = round(up_oferta / up_demanda, 3) if up_demanda > 0 else 999.0
    if ratio < 0.90:
        semaforo = "rojo"
    elif ratio < 1.10:
        semaforo = "naranja"
    else:
        semaforo = "verde"

    return {
        "año": año,
        "mes": mes,
        "up_demanda": up_demanda,
        "up_oferta": up_oferta,
        "ratio": ratio,
        "semaforo": semaforo,
        "num_operarios_activos": len(operarios),
    }


@router.get("/operario/{operario_id}/hoy")
def kpis_hoy(
    operario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.rol == RolEnum.operario and current_user.id != operario_id:
        raise HTTPException(status_code=403, detail="Sin permisos")
    hoy = date.today()
    inicio_dia = datetime(hoy.year, hoy.month, hoy.day)
    fin_dia = datetime(hoy.year, hoy.month, hoy.day, 23, 59, 59)
    exps_hoy = db.query(Expediente).filter(
        Expediente.operario_id == operario_id,
        Expediente.created_at >= inicio_dia,
        Expediente.created_at <= fin_dia,
    ).all()
    ups_hoy = sum(e.up_calculadas or 0 for e in exps_hoy)
    obj_mes = db.query(ObjetivoMes).filter_by(
        operario_id=operario_id, año=hoy.year, mes=hoy.month
    ).first()
    objetivo_mensual = obj_mes.objetivo_up if obj_mes else None
    total_lab = dias_laborables_mes(hoy.year, hoy.month)
    dias_pasados = sum(1 for d in range(1, hoy.day) if date(hoy.year, hoy.month, d).weekday() < 5)
    dias_restantes = max(1, total_lab - dias_pasados)
    inicio_mes = datetime(hoy.year, hoy.month, 1)
    ups_mes = sum(
        e.up_calculadas or 0
        for e in db.query(Expediente).filter(
            Expediente.operario_id == operario_id,
            Expediente.created_at >= inicio_mes,
            Expediente.created_at <= fin_dia,
        ).all()
    )
    objetivo_diario = None
    if objetivo_mensual:
        ups_restantes = max(0.0, objetivo_mensual - ups_mes)
        objetivo_diario = round(ups_restantes / dias_restantes, 2)
    return {
        "ups_hoy": round(ups_hoy, 2),
        "expedientes_hoy": len(exps_hoy),
        "objetivo_diario": objetivo_diario,
        "objetivo_mensual": objetivo_mensual,
        "ups_mes": round(ups_mes, 2),
    }


@router.get("/acciones-pendientes")
def acciones_pendientes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    acciones = []
    sin_asignar = db.query(Expediente).filter(Expediente.operario_id == None).count()
    if sin_asignar > 0:
        acciones.append({
            "tipo": "sin_asignar",
            "severidad": "alta",
            "descripcion": f"{sin_asignar} expediente{'s' if sin_asignar > 1 else ''} sin operario asignado",
            "link": "/expedientes",
        })
    hoy = date.today()
    dias_atras, dias_hab = 0, 0
    while dias_hab < 2:
        dias_atras += 1
        d = hoy - timedelta(days=dias_atras)
        if d.weekday() < 5:
            dias_hab += 1
    fecha_umbral = datetime(d.year, d.month, d.day)
    operarios_activos = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    for op in operarios_activos:
        count = db.query(Expediente).filter(
            Expediente.operario_id == op.id,
            Expediente.created_at >= fecha_umbral,
        ).count()
        if count == 0:
            acciones.append({
                "tipo": "sin_actividad",
                "severidad": "media",
                "descripcion": f"{op.nombre} {op.apellidos} sin actividad en los últimos 2 días hábiles",
                "link": f"/expedientes?operario_id={op.id}",
            })
    try:
        from models.evaluaciones_bonus import EvaluacionBonus
        eval_dir_count = db.query(EvaluacionBonus).filter(EvaluacionBonus.estado == "evaluacion_dir").count()
        if eval_dir_count > 0:
            acciones.append({
                "tipo": "evaluaciones",
                "severidad": "media",
                "descripcion": f"{eval_dir_count} evaluación{'es' if eval_dir_count > 1 else ''} pendiente{'s' if eval_dir_count > 1 else ''} de revisión",
                "link": "/evaluaciones-bonus",
            })
    except Exception:
        pass
    return acciones


@router.get("/ranking")
def ranking(
    año: int = Query(default=None),
    mes: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    now = datetime.now()
    año = año or now.year
    mes = mes or now.month
    factor_disp, tiempo_base = _get_params(db)

    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    kpis = [calcular_kpis_operario(db, op.id, año, mes, factor_disp, tiempo_base) for op in operarios]
    kpis_sorted = sorted(kpis, key=lambda x: x.get("up_producidas", 0), reverse=True)

    result = []
    for pos, kpi in enumerate(kpis_sorted, 1):
        kpi_prev = calcular_kpis_operario(db, kpi["operario_id"], año if mes > 1 else año - 1, mes - 1 if mes > 1 else 12, factor_disp, tiempo_base)
        up_prev = kpi_prev.get("up_producidas", 0)
        up_actual = kpi.get("up_producidas", 0)
        tendencia = "sube" if up_actual > up_prev else ("baja" if up_actual < up_prev else "igual")
        result.append({
            "posicion": pos,
            **kpi,
            "tendencia": tendencia,
        })
    return result
