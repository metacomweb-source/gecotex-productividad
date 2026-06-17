from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from auth import require_min_role
from models.usuario import RolEnum, Usuario
from models.expediente import Expediente
from models.parametros_bonus import ParametrosBonus
from services.calculo_kpis import calcular_kpis_operario, calcular_kpis_equipo
from services.generador_informes import (
    generar_informe_productividad,
    generar_informe_expedientes,
    generar_informe_bonus,
)

router = APIRouter(prefix="/informes", tags=["informes"])


@router.get("/productividad-mensual")
def informe_productividad(
    año: int = Query(default=None),
    mes: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    now = datetime.now()
    año = año or now.year
    mes = mes or now.month
    params = db.query(ParametrosBonus).filter(ParametrosBonus.año == año).first()
    factor_disp = params.factor_disponibilidad if params else 0.70
    from models.tipo_dua import TipoDua
    tipo_base = db.query(TipoDua).filter(TipoDua.codigo == "EXP-B").first()
    tiempo_base = tipo_base.tiempo_estimado_min if tipo_base else 25

    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    datos = []
    for op in operarios:
        kpi = calcular_kpis_operario(db, op.id, año, mes, factor_disp, tiempo_base)
        datos.append(kpi)

    buf = generar_informe_productividad(datos, año, mes)
    filename = f"productividad_{año}_{mes:02d}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/expedientes")
def informe_expedientes(
    año: int = Query(default=None),
    mes: int = Query(default=None),
    operario_id: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    now = datetime.now()
    año = año or now.year
    mes = mes or now.month

    q = db.query(Expediente)
    if año and mes:
        inicio = datetime(año, mes, 1)
        fin = datetime(año + 1, 1, 1) if mes == 12 else datetime(año, mes + 1, 1)
        q = q.filter(Expediente.created_at >= inicio, Expediente.created_at < fin)
    if operario_id:
        q = q.filter(Expediente.operario_id == operario_id)

    expedientes = q.all()
    datos = []
    for e in expedientes:
        d = {c.name: getattr(e, c.name) for c in e.__table__.columns}
        d["operario_nombre"] = f"{e.operario.nombre} {e.operario.apellidos}" if e.operario else ""
        d["tipo_dua_nombre"] = e.tipo_dua.nombre if e.tipo_dua else ""
        datos.append(d)

    buf = generar_informe_expedientes(datos)
    filename = f"expedientes_{año}_{mes:02d}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/bonus-anual")
def informe_bonus(
    año: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.director)),
):
    from fastapi import HTTPException
    raise HTTPException(
        status_code=410,
        detail="El informe de bonus anual ha sido reemplazado por el sistema semestral. Usa GET /bonus/exportar/{año}/{semestre}",
    )
