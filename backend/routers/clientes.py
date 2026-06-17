from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from auth import get_current_user, require_min_role
from models.cliente import Cliente
from models.usuario import Usuario, RolEnum

router = APIRouter(prefix="/clientes", tags=["clientes"])


# ── Schemas inline ────────────────────────────────────────────────────────────

class ClienteCreate(BaseModel):
    nombre: str
    nif: Optional[str] = None


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    nif: Optional[str] = None
    activo: Optional[bool] = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    nif: Optional[str] = None
    activo: bool

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ClienteResponse])
def listar_clientes(
    solo_activos: bool = True,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = db.query(Cliente)
    if solo_activos:
        q = q.filter(Cliente.activo == True)
    return q.order_by(Cliente.nombre).all()


@router.post("", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def crear_cliente(
    data: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    nombre = data.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
    if db.query(Cliente).filter(Cliente.nombre.ilike(nombre)).first():
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese nombre")
    cli = Cliente(nombre=nombre, nif=data.nif)
    db.add(cli)
    db.commit()
    db.refresh(cli)
    return cli


@router.put("/{cliente_id}", response_model=ClienteResponse)
def actualizar_cliente(
    cliente_id: int,
    data: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    cli = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if data.nombre is not None:
        nombre = data.nombre.strip()
        dup = db.query(Cliente).filter(Cliente.nombre.ilike(nombre), Cliente.id != cliente_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Ya existe un cliente con ese nombre")
        cli.nombre = nombre
    if data.nif is not None:
        cli.nif = data.nif
    if data.activo is not None:
        cli.activo = data.activo
    db.commit()
    db.refresh(cli)
    return cli


@router.delete("/{cliente_id}")
def desactivar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_min_role(RolEnum.coordinador)),
):
    cli = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cli:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cli.activo = False
    db.commit()
    return {"ok": True}
