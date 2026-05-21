from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user, require_min_role
from models.incrementador import Incrementador
from models.usuario import RolEnum
from schemas.otros import IncrementadorCreate, IncrementadorUpdate, IncrementadorResponse

router = APIRouter(prefix="/incrementadores", tags=["incrementadores"])


@router.get("", response_model=List[IncrementadorResponse])
def listar(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Incrementador).filter(Incrementador.activo == True).all()


@router.post("", response_model=IncrementadorResponse, status_code=status.HTTP_201_CREATED)
def crear(
    data: IncrementadorCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.coordinador)),
):
    if db.query(Incrementador).filter(Incrementador.codigo == data.codigo).first():
        raise HTTPException(status_code=400, detail="Código ya existe")
    inc = Incrementador(**data.model_dump())
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc


@router.put("/{inc_id}", response_model=IncrementadorResponse)
def actualizar(
    inc_id: int,
    data: IncrementadorUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_min_role(RolEnum.coordinador)),
):
    inc = db.query(Incrementador).filter(Incrementador.id == inc_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incrementador no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(inc, key, value)
    db.commit()
    db.refresh(inc)
    return inc
