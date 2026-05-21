from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from database import get_db
from auth import require_min_role
from models.usuario import RolEnum, Usuario
from models.parametros_bonus import ParametrosBonus, DEFAULT_TABLA_FACTOR_K
from schemas.otros import ParametrosBonusCreate, ParametrosBonusUpdate, ParametrosBonusResponse, BonusOperarioResponse
from services.calculo_bonus import calcular_bonus_operario

router = APIRouter(prefix="/bonus", tags=["bonus"])


@router.get("/config/{año}", response_model=ParametrosBonusResponse)
def obtener_config(
    año: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    params = db.query(ParametrosBonus).filter(ParametrosBonus.año == año).first()
    if not params:
        # Fallback: usar el año anterior como base y crear una copia para este año
        params_prev = db.query(ParametrosBonus).filter(ParametrosBonus.año == año - 1).first()
        if params_prev:
            params = ParametrosBonus(
                año=año,
                objetivo_crecimiento_facturacion=params_prev.objetivo_crecimiento_facturacion,
                factor_disponibilidad=params_prev.factor_disponibilidad,
                antiguedad_minima_meses=params_prev.antiguedad_minima_meses,
                peso_productividad_individual=params_prev.peso_productividad_individual,
                peso_resultado_global=params_prev.peso_resultado_global,
                tabla_factor_k=params_prev.tabla_factor_k,
            )
            db.add(params)
            db.commit()
            db.refresh(params)
        else:
            raise HTTPException(status_code=404, detail="Parámetros no configurados para este año")
    return params


@router.put("/config", response_model=ParametrosBonusResponse)
def upsert_config(
    data: ParametrosBonusCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    existente = db.query(ParametrosBonus).filter(ParametrosBonus.año == data.año).first()
    if existente:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(existente, key, value)
        db.commit()
        db.refresh(existente)
        return existente
    params = ParametrosBonus(**data.model_dump())
    db.add(params)
    db.commit()
    db.refresh(params)
    return params


@router.get("/{año}")
def tabla_bonus_año(
    año: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    params = db.query(ParametrosBonus).filter(ParametrosBonus.año == año).first()
    if not params:
        raise HTTPException(status_code=404, detail="Parámetros de bonus no configurados para este año")
    operarios = db.query(Usuario).filter(Usuario.activo == True, Usuario.rol == RolEnum.operario).all()
    result = []
    for mes in range(1, 13):
        mes_data = []
        for op in operarios:
            bonus = calcular_bonus_operario(db, op.id, año, mes, params)
            mes_data.append(bonus)
        result.append({"mes": mes, "operarios": mes_data})
    return {"año": año, "meses": result}


@router.get("/operario/{operario_id}")
def bonus_operario(
    operario_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.director)),
):
    año = datetime.now().year
    params = db.query(ParametrosBonus).filter(ParametrosBonus.año == año).first()
    if not params:
        raise HTTPException(status_code=404, detail="Parámetros no configurados")
    result = []
    for mes in range(1, 13):
        bonus = calcular_bonus_operario(db, operario_id, año, mes, params)
        result.append({"mes": mes, **bonus})
    return {"operario_id": operario_id, "año": año, "historico": result}
