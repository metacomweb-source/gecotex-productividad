from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from auth import get_current_user, require_min_role
from models.objetivo_mes import ObjetivoMes
from models.usuario import RolEnum, Usuario
from schemas.otros import ObjetivoMesCreate, ObjetivoMesUpdate, ObjetivoMesResponse

router = APIRouter(prefix="/objetivos", tags=["objetivos"])


@router.get("", response_model=List[ObjetivoMesResponse])
def listar(
    operario_id: Optional[int] = Query(None),
    año: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(ObjetivoMes)
    if current_user.rol == RolEnum.operario:
        q = q.filter(ObjetivoMes.operario_id == current_user.id)
    elif operario_id:
        q = q.filter(ObjetivoMes.operario_id == operario_id)
    if año:
        q = q.filter(ObjetivoMes.año == año)
    if mes:
        q = q.filter(ObjetivoMes.mes == mes)
    return q.all()


@router.post("", response_model=ObjetivoMesResponse)
def crear_o_actualizar(
    data: ObjetivoMesCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.coordinador)),
):
    existente = db.query(ObjetivoMes).filter(
        ObjetivoMes.operario_id == data.operario_id,
        ObjetivoMes.año == data.año,
        ObjetivoMes.mes == data.mes,
    ).first()
    if existente:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(existente, key, value)
        db.commit()
        db.refresh(existente)
        return existente
    obj = ObjetivoMes(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{objetivo_id}", response_model=ObjetivoMesResponse)
def actualizar(
    objetivo_id: int,
    data: ObjetivoMesUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.coordinador)),
):
    obj = db.query(ObjetivoMes).filter(ObjetivoMes.id == objetivo_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj
