from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user, require_min_role
from models.tipo_dua import TipoDua
from models.usuario import RolEnum
from schemas.otros import TipoDuaCreate, TipoDuaUpdate, TipoDuaResponse

router = APIRouter(prefix="/tipos-dua", tags=["tipos_dua"])


@router.get("", response_model=List[TipoDuaResponse])
def listar_tipos_dua(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(TipoDua).filter(TipoDua.activo == True).all()


@router.post("", response_model=TipoDuaResponse, status_code=status.HTTP_201_CREATED)
def crear_tipo_dua(
    data: TipoDuaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.coordinador)),
):
    if db.query(TipoDua).filter(TipoDua.codigo == data.codigo).first():
        raise HTTPException(status_code=400, detail="Código ya existe")
    tipo = TipoDua(**data.model_dump())
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return tipo


@router.put("/{tipo_id}", response_model=TipoDuaResponse)
def actualizar_tipo_dua(
    tipo_id: int,
    data: TipoDuaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.coordinador)),
):
    tipo = db.query(TipoDua).filter(TipoDua.id == tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo DUA no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tipo, key, value)
    db.commit()
    db.refresh(tipo)
    return tipo


@router.delete("/{tipo_id}")
def desactivar_tipo_dua(
    tipo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.coordinador)),
):
    tipo = db.query(TipoDua).filter(TipoDua.id == tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo DUA no encontrado")
    tipo.activo = False
    db.commit()
    return {"message": "Tipo de DUA desactivado"}
