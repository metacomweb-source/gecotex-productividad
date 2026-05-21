from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from auth import get_current_user, require_min_role
from models.usuario import RolEnum, Usuario
from models.expediente import Expediente, CanalEnum
from models.parametros_bonus import ParametrosBonus
from models.tipo_dua import TipoDua
from services.calculo_kpis import calcular_kpis_operario, calcular_kpis_equipo, capacidad_teorica_mes

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
